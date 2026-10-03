package promo

import (
	"sync"

	"gorm.io/gorm"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Stats() (*AdminStatsResponse, error) {
	stats := &AdminStatsResponse{
		RecentOrders: []RecentOrder{},
	}

	const aggregateSQL = `
		SELECT
			(SELECT COUNT(*) FROM orders) AS total_orders,
			(SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('paid','processing','shipped','completed')) AS revenue,
			(SELECT COUNT(*) FROM products) AS active_products,
			(SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('paid','processing','shipped','completed') AND created_at >= CURRENT_DATE) AS today_revenue,
			(SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) AS today_orders,
			(SELECT COUNT(*) FROM orders WHERE status = 'pending_payment') AS pending_payment_count,
			(SELECT COUNT(*) FROM orders WHERE status = 'processing') AS to_ship_count
	`

	// Scan ke struct agregat terpisah: GORM menolak Scan ke struct yang punya
	// field slice-of-struct (RecentOrders) karena dianggap relasi.
	var agg struct {
		TotalOrders         int64
		Revenue             int64
		ActiveProducts      int64
		TodayRevenue        int64
		TodayOrders         int64
		PendingPaymentCount int64
		ToShipCount         int64
	}
	// Query independen dijalankan paralel: tiap query = 1 round-trip ke DB
	// (Sydney), jadi total latensi ~1 RTT, bukan jumlah semuanya.
	var (
		wg        sync.WaitGroup
		aggErr    error
		recentErr error
	)
	wg.Add(5)
	go func() {
		defer wg.Done()
		aggErr = r.db.Raw(aggregateSQL).Scan(&agg).Error
	}()
	go func() {
		defer wg.Done()
		if err := r.db.Table("product_variants").Where("stock <= ?", 5).Count(&stats.LowStockCount).Error; err != nil {
			stats.LowStockCount = 0
		}
	}()
	go func() {
		defer wg.Done()
		if err := r.db.Table("product_reviews").Where("status = ?", "pending").Count(&stats.PendingReviewsCount).Error; err != nil {
			stats.PendingReviewsCount = 0
		}
	}()
	go func() {
		defer wg.Done()
		if err := r.db.Table("return_requests").Where("status IN ?", []string{"requested", "approved", "received"}).Count(&stats.OpenReturnsCount).Error; err != nil {
			stats.OpenReturnsCount = 0
		}
	}()
	go func() {
		defer wg.Done()
		recentErr = r.db.Table("orders o").
			Select("o.id, o.order_number, o.status, o.total, o.created_at, COALESCE(u.email, '') AS customer_email").
			Joins("LEFT JOIN auth.users u ON u.id = o.user_id").
			Order("o.created_at DESC").Limit(6).
			Scan(&stats.RecentOrders).Error
	}()
	wg.Wait()

	if aggErr != nil {
		return nil, aggErr
	}
	if recentErr != nil {
		return nil, recentErr
	}
	stats.TotalOrders = agg.TotalOrders
	stats.Revenue = agg.Revenue
	stats.ActiveProducts = agg.ActiveProducts
	stats.TodayRevenue = agg.TodayRevenue
	stats.TodayOrders = agg.TodayOrders
	stats.PendingPaymentCount = agg.PendingPaymentCount
	stats.ToShipCount = agg.ToShipCount

	return stats, nil
}

func (r *AdminRepository) ReportSummary(from, to string) (*ReportSummaryResponse, error) {
	var summary ReportSummaryResponse

	query := `
		WITH filtered_orders AS (
			SELECT id, user_id, subtotal, discount_total, shipping_cost
			FROM orders
			WHERE status IN ('paid','processing','shipped','completed','refunded')
			  AND COALESCE(paid_at, created_at) >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' 
			  AND COALESCE(paid_at, created_at) < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		)
		SELECT 
			COALESCE(SUM(subtotal), 0) as gross_sales,
			COALESCE(SUM(discount_total), 0) as discount_total,
			COALESCE(SUM(shipping_cost), 0) as shipping_total,
			COUNT(id) as orders_count,
			COALESCE((SELECT SUM(qty) FROM order_items WHERE order_id IN (SELECT id FROM filtered_orders)), 0) as items_sold,
			COALESCE((SELECT SUM(amount) FROM refunds WHERE order_id IN (SELECT id FROM filtered_orders)), 0) as refunded_total,
			COALESCE((
				SELECT COUNT(DISTINCT fo.user_id) 
				FROM filtered_orders fo
				WHERE NOT EXISTS (
					SELECT 1 FROM orders o2 
					WHERE o2.user_id = fo.user_id 
					  AND o2.status IN ('paid','processing','shipped','completed','refunded')
					  AND COALESCE(o2.paid_at, o2.created_at) < ?::timestamptz AT TIME ZONE 'Asia/Jakarta'
				)
			), 0) as new_customers
		FROM filtered_orders
	`

	err := r.db.Raw(query, from, to, from).Scan(&summary).Error
	if err != nil {
		return nil, err
	}

	summary.NetSales = summary.GrossSales - summary.DiscountTotal - summary.RefundedTotal
	if summary.OrdersCount > 0 {
		summary.AvgOrderValue = float64(summary.NetSales) / float64(summary.OrdersCount)
	}

	return &summary, err
}

func (r *AdminRepository) ReportSales(from, to, interval string) ([]ReportSalesItem, error) {
	// interval: day, week, month
	var trunc string
	switch interval {
	case "week":
		trunc = "week"
	case "month":
		trunc = "month"
	default:
		trunc = "day"
	}

	query := `
		WITH period_sales AS (
			SELECT 
				date_trunc(?, COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta')::date as period,
				COUNT(o.id) as orders_count,
				COALESCE(SUM(o.subtotal), 0) as gross_sales,
				COALESCE(SUM(o.discount_total), 0) as discount_total,
				COALESCE(SUM(o.shipping_cost), 0) as shipping_total
			FROM orders o
			WHERE o.status IN ('paid','processing','shipped','completed','refunded')
			  AND COALESCE(o.paid_at, o.created_at) >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND COALESCE(o.paid_at, o.created_at) < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
			GROUP BY period
		),
		period_refunds AS (
			SELECT 
				date_trunc(?, COALESCE(o.paid_at, o.created_at) AT TIME ZONE 'Asia/Jakarta')::date as period,
				COALESCE(SUM(r.amount), 0) as refunded_total
			FROM refunds r JOIN orders o ON r.order_id = o.id
			WHERE o.status IN ('paid','processing','shipped','completed','refunded')
			  AND COALESCE(o.paid_at, o.created_at) >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND COALESCE(o.paid_at, o.created_at) < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
			GROUP BY period
		)
		SELECT 
			to_char(ps.period, 'YYYY-MM-DD') as period,
			ps.orders_count,
			ps.gross_sales,
			ps.discount_total,
			COALESCE(pr.refunded_total, 0) as refunded_total,
			(ps.gross_sales - ps.discount_total - COALESCE(pr.refunded_total, 0)) as net_sales,
			ps.shipping_total
		FROM period_sales ps
		LEFT JOIN period_refunds pr ON ps.period = pr.period
		ORDER BY ps.period ASC
	`

	var items []ReportSalesItem
	err := r.db.Raw(query, trunc, from, to, trunc, from, to).Scan(&items).Error
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []ReportSalesItem{}
	}
	return items, nil
}

func (r *AdminRepository) ReportTopProducts(from, to string, limit int) ([]ReportTopProduct, error) {
	query := `
		SELECT 
			p.id AS product_id,
			p.slug,
			p.name,
			SUM(oi.qty) as items_sold,
			SUM(oi.subtotal - oi.discount_amount) as revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		-- Sebagian order_items lama tidak menyimpan product_id; ambil dari varian.
		LEFT JOIN product_variants pv ON pv.id = oi.variant_id
		JOIN products p ON p.id = COALESCE(oi.product_id, pv.product_id)
		WHERE o.status IN ('paid','processing','shipped','completed','refunded')
		  AND COALESCE(o.paid_at, o.created_at) >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND COALESCE(o.paid_at, o.created_at) < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		GROUP BY p.id, p.slug, p.name
		ORDER BY items_sold DESC, revenue DESC
		LIMIT ?
	`
	var items []ReportTopProduct
	err := r.db.Raw(query, from, to, limit).Scan(&items).Error
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []ReportTopProduct{}
	}
	return items, nil
}

func (r *AdminRepository) ReportBreakdown(from, to string) (*ReportBreakdownResponse, error) {
	res := &ReportBreakdownResponse{
		OrderStatus: []ReportStatusCount{},
		Categories:  []ReportCategoryShare{},
	}

	// Status dihitung dari tanggal order dibuat (semua status, termasuk yang
	// belum dibayar) agar admin melihat corong pesanan apa adanya.
	const statusSQL = `
		SELECT status, COUNT(*) AS count
		FROM orders
		WHERE created_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta'
		  AND created_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		GROUP BY status
		ORDER BY count DESC
	`
	// Penjualan digulung ke kategori induk (hierarki maks. 2 tingkat).
	const categorySQL = `
		SELECT
			root.slug,
			root.name_i18n,
			SUM(oi.qty) AS items_sold,
			SUM(oi.subtotal - oi.discount_amount) AS revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		LEFT JOIN product_variants pv ON pv.id = oi.variant_id
		JOIN products p ON p.id = COALESCE(oi.product_id, pv.product_id)
		JOIN categories c ON c.slug = p.category_slug
		JOIN categories root ON root.id = COALESCE(c.parent_id, c.id)
		WHERE o.status IN ('paid','processing','shipped','completed','refunded')
		  AND COALESCE(o.paid_at, o.created_at) >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta'
		  AND COALESCE(o.paid_at, o.created_at) < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		GROUP BY root.slug, root.name_i18n
		ORDER BY revenue DESC
	`

	var (
		wg                sync.WaitGroup
		statusErr, catErr error
	)
	wg.Add(2)
	go func() {
		defer wg.Done()
		statusErr = r.db.Raw(statusSQL, from, to).Scan(&res.OrderStatus).Error
	}()
	go func() {
		defer wg.Done()
		catErr = r.db.Raw(categorySQL, from, to).Scan(&res.Categories).Error
	}()
	wg.Wait()

	if statusErr != nil {
		return nil, statusErr
	}
	if catErr != nil {
		return nil, catErr
	}
	return res, nil
}
