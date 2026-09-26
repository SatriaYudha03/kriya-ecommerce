package promo

import (
	"gorm.io/gorm"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Stats() (int64, int64, int64, error) {
	var totalOrders int64
	var revenue int64
	var activeProducts int64

	if err := r.db.Table("orders").Count(&totalOrders).Error; err != nil {
		return 0, 0, 0, err
	}

	if err := r.db.Table("orders").
		Where("status IN ?", []string{"paid", "processing", "shipped", "completed"}).
		Select("COALESCE(SUM(total), 0)").Scan(&revenue).Error; err != nil {
		return 0, 0, 0, err
	}

	if err := r.db.Table("products").Count(&activeProducts).Error; err != nil {
		return 0, 0, 0, err
	}

	return totalOrders, revenue, activeProducts, nil
}

func (r *AdminRepository) ReportSummary(from, to string) (*ReportSummaryResponse, error) {
	var summary ReportSummaryResponse
	
	// Query to get summary
	// from and to are "YYYY-MM-DD"
	// WIB timezone handling
	query := `
		SELECT 
			COALESCE(SUM(o.subtotal), 0) as gross_sales,
			COALESCE(SUM(o.discount_total), 0) as discount_total,
			COALESCE(SUM(o.shipping_cost), 0) as shipping_total,
			COUNT(o.id) as orders_count,
			COALESCE((SELECT SUM(oi.qty) FROM order_items oi JOIN orders o2 ON oi.order_id = o2.id WHERE o2.status IN ('paid','processing','shipped','completed','refunded') AND o2.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o2.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')), 0) as items_sold
		FROM orders o
		WHERE o.status IN ('paid','processing','shipped','completed','refunded')
		  AND o.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
	`
	
	err := r.db.Raw(query, from, to, from, to).Scan(&summary).Error
	if err != nil {
		return nil, err
	}
	
	refundQuery := `
		SELECT COALESCE(SUM(amount), 0) as refunded_total 
		FROM refunds r JOIN orders o ON r.order_id = o.id 
		WHERE o.status IN ('paid','processing','shipped','completed','refunded')
		AND o.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
	`
	err = r.db.Raw(refundQuery, from, to).Scan(&summary.RefundedTotal).Error
	if err != nil {
		return nil, err
	}
	
	summary.NetSales = summary.GrossSales - summary.DiscountTotal - summary.RefundedTotal
	if summary.OrdersCount > 0 {
		summary.AvgOrderValue = float64(summary.NetSales) / float64(summary.OrdersCount)
	}
	
	newCustQuery := `
		SELECT COUNT(DISTINCT user_id) 
		FROM orders 
		WHERE status IN ('paid','processing','shipped','completed','refunded')
		AND paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		AND user_id NOT IN (
			SELECT user_id FROM orders 
			WHERE status IN ('paid','processing','shipped','completed','refunded')
			AND paid_at < ?::timestamptz AT TIME ZONE 'Asia/Jakarta'
		)
	`
	err = r.db.Raw(newCustQuery, from, to, from).Scan(&summary.NewCustomers).Error
	
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
				date_trunc(?, o.paid_at AT TIME ZONE 'Asia/Jakarta')::date as period,
				COUNT(o.id) as orders_count,
				COALESCE(SUM(o.subtotal), 0) as gross_sales,
				COALESCE(SUM(o.discount_total), 0) as discount_total,
				COALESCE(SUM(o.shipping_cost), 0) as shipping_total
			FROM orders o
			WHERE o.status IN ('paid','processing','shipped','completed','refunded')
			  AND o.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
			GROUP BY period
		),
		period_refunds AS (
			SELECT 
				date_trunc(?, o.paid_at AT TIME ZONE 'Asia/Jakarta')::date as period,
				COALESCE(SUM(r.amount), 0) as refunded_total
			FROM refunds r JOIN orders o ON r.order_id = o.id
			WHERE o.status IN ('paid','processing','shipped','completed','refunded')
			  AND o.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
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
			oi.product_id,
			p.slug,
			p.name,
			SUM(oi.qty) as items_sold,
			SUM(oi.subtotal - oi.discount_amount) as revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		JOIN products p ON oi.product_id = p.id
		WHERE o.status IN ('paid','processing','shipped','completed','refunded')
		  AND o.paid_at >= ?::timestamptz AT TIME ZONE 'Asia/Jakarta' AND o.paid_at < (?::timestamptz AT TIME ZONE 'Asia/Jakarta' + interval '1 day')
		GROUP BY oi.product_id, p.slug, p.name
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

