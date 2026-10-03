package checkout

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

type Order struct {
	ID                 string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderNumber        string     `gorm:"column:order_number;default:(-)"` // DEFAULT kriya_next_order_number() di DB; jangan kirim '' saat INSERT
	UserID             string     `gorm:"column:user_id;type:uuid"`
	Status             string     `gorm:"column:status"`
	ShippingZone       string     `gorm:"column:shipping_zone"` // kolom M2, NOT NULL — belum di-drop; diisi ZoneCode metode v2
	Subtotal           int        `gorm:"column:subtotal"`
	DiscountTotal      int        `gorm:"column:discount_total"`
	ShippingCost       int        `gorm:"column:shipping_cost"`
	ShippingDiscount   int        `gorm:"column:shipping_discount"`
	TaxAmount          int        `gorm:"column:tax_amount"`
	Total              int        `gorm:"column:total"`
	ShippingMethodID   *string    `gorm:"column:shipping_method_id;type:uuid"`
	ShippingMethodCode *string    `gorm:"column:shipping_method_code"`
	ShippingMethodName *string    `gorm:"column:shipping_method_name"`
	ShippingEtaMinDays *int       `gorm:"column:shipping_eta_min_days"`
	ShippingEtaMaxDays *int       `gorm:"column:shipping_eta_max_days"`
	TotalWeightKg      *float64   `gorm:"column:total_weight_kg"`
	ShippingAddress    []byte     `gorm:"column:shipping_address;type:jsonb"`
	CustomerNote       *string    `gorm:"column:customer_note"`
	Courier            *string    `gorm:"column:courier"`
	TrackingNumber     *string    `gorm:"column:tracking_number"`
	PaidAt             *time.Time `gorm:"column:paid_at"`
	ShippedAt          *time.Time `gorm:"column:shipped_at"`
	CompletedAt        *time.Time `gorm:"column:completed_at"`
	CancelledAt        *time.Time `gorm:"column:cancelled_at"`
	PaymentDueAt       *time.Time `gorm:"column:payment_due_at"` // tenggat bayar, tidak pernah diperpanjang (migrasi 017)
	CreatedAt          time.Time  `gorm:"column:created_at"`
	UpdatedAt          time.Time  `gorm:"column:updated_at"`
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	ID             string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID        string  `gorm:"column:order_id;type:uuid"`
	VariantID      string  `gorm:"column:variant_id;type:uuid"`
	ProductID      *string `gorm:"column:product_id;type:uuid"`
	Name           string  `gorm:"column:name"`
	SKU            *string `gorm:"column:sku"`
	Color          string  `gorm:"column:color"`
	Size           *string `gorm:"column:size"`
	Qty            int     `gorm:"column:qty"`
	Price          int     `gorm:"column:price"`
	RegularPrice   *int    `gorm:"column:regular_price"`
	DiscountAmount int     `gorm:"column:discount_amount"`
	Subtotal       int     `gorm:"column:subtotal"`
}

func (OrderItem) TableName() string { return "order_items" }

type PaymentAttempt struct {
	ID              string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID         string     `gorm:"column:order_id;type:uuid"`
	MidtransOrderID string     `gorm:"column:midtrans_order_id"`
	SnapToken       *string    `gorm:"column:snap_token"`
	ExpiresAt       *time.Time `gorm:"column:expires_at"`
	Status          string     `gorm:"column:status"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
}

func (PaymentAttempt) TableName() string { return "payment_attempts" }

var (
	ErrAddressNotFound           = errors.New("alamat tidak ditemukan")
	ErrShippingMethodUnavailable = errors.New("metode pengiriman tidak tersedia untuk tujuan ini")
)

// StockProblemError dikembalikan CreateOrder ketika PriceLines melaporkan problems
// (stok kurang / produk tidak tersedia) — handler memetakannya ke 409.
type StockProblemError struct{ Problems []Problem }

func (e *StockProblemError) Error() string { return "stok atau ketersediaan produk bermasalah" }

// CouponInvalidError dikembalikan CreateOrder ketika kupon yang lolos di quote
// ternyata sudah tidak valid saat order dibuat (RENCANA §7.6: "kupon jadi tidak valid").
type CouponInvalidError struct{ Reason CouponReason }

func (e *CouponInvalidError) Error() string { return "kupon ditolak: " + string(e.Reason) }

type OrderRepository struct{ db *gorm.DB }

func NewOrderRepository(db *gorm.DB) *OrderRepository { return &OrderRepository{db: db} }

type CreatedOrder struct {
	Order   Order
	Items   []OrderItem
	Attempt PaymentAttempt
}

// CreateOrder — POST /orders v2 (RENCANA §7.6, §8.1 butir 2): satu transaksi —
// PriceLines(lock) -> Evaluate(lock) -> validasi alamat & metode -> insert order
// (snapshot alamat+metode+locale) -> items dengan discount_amount -> Inventory.Reserve
// -> Discounts.Reserve -> Events.Record(created) -> payment_attempts aktif.
// Snap TIDAK dipanggil di sini (harus di luar transaksi — lihat OrderHandler.CreateOrder).
func (r *OrderRepository) CreateOrder(ctx context.Context, userID string, req CreateOrderRequest, locale string, ports Ports) (*CreatedOrder, error) {
	var result CreatedOrder

	err := r.db.Transaction(func(tx *gorm.DB) error {
		lines := make([]LineInput, 0, len(req.Items))
		for _, it := range req.Items {
			lines = append(lines, LineInput{VariantID: it.VariantID, Qty: it.Qty})
		}

		pricedLines, problems, err := PriceLines(ctx, tx, lines, locale, true)
		if err != nil {
			return err
		}
		if len(problems) > 0 {
			return &StockProblemError{Problems: problems}
		}

		addr, err := getAddressForUser(ctx, tx, req.AddressID, userID)
		if err != nil {
			return err
		}
		if addr == nil {
			return ErrAddressNotFound
		}

		subtotal := 0
		for _, pl := range pricedLines {
			subtotal += pl.Subtotal
		}

		var discountResult DiscountResult
		hasCoupon := req.CouponCode != nil && *req.CouponCode != ""
		if hasCoupon {
			if ports.Discounts == nil {
				return &CouponInvalidError{Reason: CouponNotFound}
			}
			discountResult, err = ports.Discounts.Evaluate(ctx, tx, userID, *req.CouponCode, pricedLines, locale, true)
			if err != nil {
				var ce *CouponRejectedError
				if errors.As(err, &ce) {
					return &CouponInvalidError{Reason: ce.Reason}
				}
				return err
			}
		}

		if ports.Shipping == nil {
			return ErrShippingMethodUnavailable
		}
		shippingOptions, err := ports.Shipping.Options(ctx, tx, Destination{ProvinceCode: addr.ProvinceCode}, pricedLines, subtotal, locale)
		if err != nil {
			return err
		}

		settings := getStoreSettings(ctx, tx)
		calc, err := computeOrderTotals(pricedLines, shippingOptions, req.ShippingMethodID, discountResult, hasCoupon, settings)
		if err != nil {
			return err
		}
		chosen := &calc.Chosen
		discountTotal, shippingDiscount, taxAmount, total, totalWeight := calc.DiscountTotal, calc.ShippingDiscount, calc.TaxAmount, calc.Total, calc.TotalWeightKg
		lineDiscount := calc.LineDiscount

		addrSnapshot := ShippingAddressResponse{
			Recipient: addr.Recipient, Phone: addr.Phone, AddressLine: addr.AddressLine,
			City: addr.City, Province: addr.ProvinceName, PostalCode: addr.PostalCode,
			ProvinceCode: &addr.ProvinceCode, District: addr.District,
		}
		addrJSON, err := json.Marshal(addrSnapshot)
		if err != nil {
			return err
		}

		// Tenggat bayar order = expiry attempt pertama = expiry Snap (RENCANA-PAYMENT-LIFECYCLE
		// Fase 2). /orders/:id/pay tidak pernah memperpanjangnya.
		paymentDueAt := time.Now().Add(time.Duration(settings.PendingPaymentTTLMinutes) * time.Minute)
		methodID, methodCode, methodName := chosen.MethodID, chosen.Code, chosen.Name
		etaMin, etaMax := chosen.EtaMinDays, chosen.EtaMaxDays

		order := Order{
			UserID: userID, Status: "pending_payment", ShippingZone: chosen.ZoneCode,
			Subtotal: subtotal, DiscountTotal: discountTotal,
			ShippingCost: chosen.Cost, ShippingDiscount: shippingDiscount, TaxAmount: taxAmount, Total: total,
			ShippingMethodID: &methodID, ShippingMethodCode: &methodCode, ShippingMethodName: &methodName,
			ShippingEtaMinDays: &etaMin, ShippingEtaMaxDays: &etaMax,
			TotalWeightKg: &totalWeight, ShippingAddress: addrJSON, CustomerNote: req.CustomerNote,
			PaymentDueAt: &paymentDueAt,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		items := make([]OrderItem, 0, len(pricedLines))
		for _, pl := range pricedLines {
			regularPrice, sku, productID := pl.RegularPrice, pl.SKU, pl.ProductID
			items = append(items, OrderItem{
				OrderID: order.ID, VariantID: pl.VariantID, ProductID: &productID,
				Name: pl.Name, SKU: &sku, Color: pl.Color, Size: pl.Size, Qty: pl.Qty,
				Price: pl.UnitPrice, RegularPrice: &regularPrice,
				DiscountAmount: lineDiscount[pl.VariantID], Subtotal: pl.Subtotal,
			})
		}
		if err := tx.Create(&items).Error; err != nil {
			return err
		}

		if ports.Inventory == nil {
			return errors.New("inventory port belum terpasang")
		}
		if err := ports.Inventory.Reserve(ctx, tx, order.ID, lines, &userID); err != nil {
			return err
		}

		if hasCoupon {
			if err := ports.Discounts.Reserve(ctx, tx, order.ID, userID, discountResult, shippingDiscount); err != nil {
				return err
			}
		}

		if ports.Events != nil {
			if err := ports.Events.Record(ctx, tx, OrderEvent{
				OrderID: order.ID, FromStatus: nil, ToStatus: "pending_payment",
				ActorType: ActorCustomer, ActorID: &userID, NotifyCustomer: false,
			}); err != nil {
				return err
			}
		}

		midtransOrderID, err := service.GenerateOrderID()
		if err != nil {
			return err
		}
		attempt := PaymentAttempt{OrderID: order.ID, MidtransOrderID: midtransOrderID, Status: "active", ExpiresAt: &paymentDueAt}
		if err := tx.Create(&attempt).Error; err != nil {
			return err
		}

		// Reload supaya order_number/created_at/updated_at hasil DEFAULT DB terbaca.
		if err := tx.First(&order, "id = ?", order.ID).Error; err != nil {
			return err
		}

		result = CreatedOrder{Order: order, Items: items, Attempt: attempt}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// CompensateFailedOrder dipanggil ketika Snap gagal DI LUAR transaksi order (RENCANA
// §7.6): lepas reservasi stok+kupon lewat port, lalu hapus order (item & attempt ikut
// lewat ON DELETE CASCADE).
func (r *OrderRepository) CompensateFailedOrder(ctx context.Context, orderID string, ports Ports) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if ports.Inventory != nil {
			if err := ports.Inventory.Release(ctx, tx, orderID, nil); err != nil {
				return err
			}
		}
		if ports.Discounts != nil {
			if err := ports.Discounts.Release(ctx, tx, orderID); err != nil {
				return err
			}
		}
		return tx.Where("id = ?", orderID).Delete(&Order{}).Error
	})
}

func (r *OrderRepository) UpdateAttemptSnapToken(attemptID, snapToken string) error {
	return r.db.Table("payment_attempts").Where("id = ?", attemptID).Update("snap_token", snapToken).Error
}
