package repository

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func getI18nString(data []byte, locale string, fallback string) string {
	if len(data) == 0 || string(data) == "{}" {
		return fallback
	}
	var m map[string]string
	if err := json.Unmarshal(data, &m); err == nil {
		if val, ok := m[locale]; ok && val != "" {
			return val
		}
		if val, ok := m["id"]; ok && val != "" {
			return val
		}
		if val, ok := m["en"]; ok && val != "" {
			return val
		}
	}
	return fallback
}

type Order struct {
	ID              string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID          string `gorm:"column:user_id;type:uuid"`
	Status          string
	Subtotal        int
	ShippingZone    string `gorm:"column:shipping_zone"`
	ShippingCost    int    `gorm:"column:shipping_cost"`
	Total           int
	ShippingAddress []byte `gorm:"column:shipping_address;type:jsonb"`
	RemindedAt      *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID   string `gorm:"column:order_id;type:uuid"`
	VariantID string `gorm:"column:variant_id;type:uuid"`
	Name      string
	Color     string
	Size      *string
	Qty       int
	Price     int
	Subtotal  int
}

func (OrderItem) TableName() string { return "order_items" }

type Payment struct {
	ID                string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID           string `gorm:"column:order_id;type:uuid"`
	MidtransOrderID   string `gorm:"column:midtrans_order_id"`
	TransactionStatus string `gorm:"column:transaction_status"`
	Raw               []byte `gorm:"type:jsonb"`
}

func (Payment) TableName() string { return "payments" }

// OrderItemInput adalah item dari request POST /orders (belum divalidasi harga/stok).
type OrderItemInput struct {
	VariantID string
	Qty       int
}

type InsufficientStockError struct {
	VariantID string
	Available int
	Requested int
}

func (e *InsufficientStockError) Error() string { return "stok tidak cukup" }

type VariantNotFoundError struct {
	VariantID string
}

func (e *VariantNotFoundError) Error() string { return "variant_id tidak ditemukan: " + e.VariantID }

var ErrPaymentNotFound = errors.New("payment tidak ditemukan")

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

type variantLockRow struct {
	ID          string
	Price       int
	Stock       int
	Color       string
	ColorI18n   []byte `gorm:"column:color_i18n;type:jsonb"`
	Size        *string
	SizeI18n    []byte `gorm:"column:size_i18n;type:jsonb"`
	ProductName string
	NameI18n    []byte `gorm:"column:name_i18n;type:jsonb"`
}

// CreateOrder mengunci baris varian, cek+kurangi stok, buat order+items+payment,
// dan mengosongkan cart — semua dalam satu transaksi DB.
func (r *OrderRepository) CreateOrder(
	userID string,
	items []OrderItemInput,
	shippingZone string,
	shippingCost int,
	shippingAddressJSON []byte,
	midtransOrderID string,
	locale string,
) (*Order, []OrderItem, error) {
	var order Order
	var orderItems []OrderItem

	err := r.db.Transaction(func(tx *gorm.DB) error {
		subtotal := 0
		orderItems = nil

		for _, item := range items {
			var v variantLockRow
			err := tx.Clauses(clause.Locking{Strength: "UPDATE", Table: clause.Table{Name: "pv"}}).
				Table("product_variants AS pv").
				Select("pv.id, pv.price, pv.stock, pv.color, pv.color_i18n, pv.size, pv.size_i18n, p.name AS product_name, p.name_i18n").
				Joins("JOIN products p ON p.id = pv.product_id").
				Where("pv.id = ?", item.VariantID).
				Scan(&v).Error
			if err != nil {
				return err
			}
			if v.ID == "" {
				return &VariantNotFoundError{VariantID: item.VariantID}
			}
			if v.Stock < item.Qty {
				return &InsufficientStockError{VariantID: item.VariantID, Available: v.Stock, Requested: item.Qty}
			}

			if err := tx.Table("product_variants").Where("id = ?", v.ID).
				Update("stock", gorm.Expr("stock - ?", item.Qty)).Error; err != nil {
				return err
			}

			lineSubtotal := v.Price * item.Qty
			subtotal += lineSubtotal

			var size *string
			if v.Size != nil {
				s := getI18nString(v.SizeI18n, locale, *v.Size)
				size = &s
			}

			orderItems = append(orderItems, OrderItem{
				VariantID: v.ID,
				Name:      getI18nString(v.NameI18n, locale, v.ProductName),
				Color:     getI18nString(v.ColorI18n, locale, v.Color),
				Size:      size,
				Qty:       item.Qty,
				Price:     v.Price,
				Subtotal:  lineSubtotal,
			})
		}

		order = Order{
			UserID:          userID,
			Status:          "pending_payment",
			Subtotal:        subtotal,
			ShippingZone:    shippingZone,
			ShippingCost:    shippingCost,
			Total:           subtotal + shippingCost,
			ShippingAddress: shippingAddressJSON,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}

		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if len(orderItems) > 0 {
			if err := tx.Create(&orderItems).Error; err != nil {
				return err
			}
		}

		payment := Payment{
			OrderID:           order.ID,
			MidtransOrderID:   midtransOrderID,
			TransactionStatus: "pending",
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		if err := tx.Model(&Cart{}).Where("user_id = ?", userID).
			Update("items", []byte("[]")).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, nil, err
	}
	return &order, orderItems, nil
}

func (r *OrderRepository) ListByUser(userID string) ([]Order, error) {
	var orders []Order
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&orders).Error
	return orders, err
}

func (r *OrderRepository) GetByIDForUser(id, userID string) (*Order, error) {
	var order Order
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&order).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) GetItemsByOrderID(orderID string) ([]OrderItem, error) {
	var items []OrderItem
	err := r.db.Where("order_id = ?", orderID).Order("name").Find(&items).Error
	return items, err
}

// CompensateFailedOrder membatalkan order yang gagal dibuat Snap token-nya:
// kembalikan stok lalu hapus order (order_items & payment ikut terhapus via CASCADE).
// Dipanggil saat CreateOrder sukses tapi panggilan Midtrans Snap gagal, supaya
// tidak ada order "pending_payment" nyangkut tanpa snap_token dan stok tidak
// tereservasi permanen.
func (r *OrderRepository) CompensateFailedOrder(orderID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var items []OrderItem
		if err := tx.Where("order_id = ?", orderID).Find(&items).Error; err != nil {
			return err
		}
		for _, it := range items {
			if err := tx.Table("product_variants").Where("id = ?", it.VariantID).
				Update("stock", gorm.Expr("stock + ?", it.Qty)).Error; err != nil {
				return err
			}
		}
		return tx.Where("id = ?", orderID).Delete(&Order{}).Error
	})
}

// GetForInternalStatus mencocokkan order dengan email pemilik akun (auth.users), dipakai chatbot n8n.
func (r *OrderRepository) GetForInternalStatus(orderID, email string) (*Order, error) {
	var order Order
	err := r.db.Raw(`
		SELECT o.id, o.user_id, o.status, o.subtotal, o.shipping_zone, o.shipping_cost, o.total,
		       o.shipping_address, o.reminded_at, o.created_at, o.updated_at
		FROM orders o
		JOIN auth.users u ON u.id = o.user_id
		WHERE o.id = ? AND u.email = ?`, orderID, email).Scan(&order).Error
	if err != nil {
		return nil, err
	}
	if order.ID == "" {
		return nil, nil
	}
	return &order, nil
}

// ApplyPaymentUpdate memproses notifikasi webhook Midtrans secara idempoten:
// no-op bila transaction_status sama dengan yang tersimpan; kembalikan stok bila
// order berakhir cancelled/expired.
func (r *OrderRepository) ApplyPaymentUpdate(midtransOrderID, orderStatus, transactionStatus string, rawJSON []byte) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var payment Payment
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("midtrans_order_id = ?", midtransOrderID).First(&payment).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPaymentNotFound
			}
			return err
		}

		if payment.TransactionStatus == transactionStatus {
			return nil
		}

		if err := tx.Model(&Payment{}).Where("id = ?", payment.ID).
			Updates(map[string]interface{}{
				"transaction_status": transactionStatus,
				"raw":                rawJSON,
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&Order{}).Where("id = ?", payment.OrderID).
			Update("status", orderStatus).Error; err != nil {
			return err
		}

		if orderStatus == "cancelled" || orderStatus == "expired" {
			var items []OrderItem
			if err := tx.Where("order_id = ?", payment.OrderID).Find(&items).Error; err != nil {
				return err
			}
			for _, it := range items {
				if err := tx.Table("product_variants").Where("id = ?", it.VariantID).
					Update("stock", gorm.Expr("stock + ?", it.Qty)).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}
