package aftersales

import (
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
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
