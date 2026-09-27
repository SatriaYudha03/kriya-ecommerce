package customer

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type PaymentAttempt struct {
	ID              string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID         string     `gorm:"column:order_id;type:uuid"`
	MidtransOrderID string     `gorm:"column:midtrans_order_id"`
	SnapToken       string     `gorm:"column:snap_token"`
	Status          string     `gorm:"column:status"`
	ExpiresAt       time.Time  `gorm:"column:expires_at"`
	CreatedAt       time.Time  `gorm:"column:created_at;autoCreateTime"`
}

func (PaymentAttempt) TableName() string { return "payment_attempts" }

type Order struct {
	ID     string `gorm:"type:uuid;primaryKey"`
	UserID string `gorm:"column:user_id;type:uuid"`
	Status string `gorm:"column:status"`
	Total  int    `gorm:"column:total"`
}

func (Order) TableName() string { return "orders" }

type PaymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) GetOrder(orderID string) (*Order, error) {
	var order Order
	err := r.db.First(&order, "id = ?", orderID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}

func (r *PaymentRepository) GetActiveAttempt(orderID string) (*PaymentAttempt, error) {
	var attempt PaymentAttempt
	err := r.db.Where("order_id = ? AND status = 'active'", orderID).Order("created_at DESC").First(&attempt).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &attempt, nil
}

func (r *PaymentRepository) SupersedeAttempt(id string) error {
	return r.db.Model(&PaymentAttempt{}).Where("id = ?", id).Update("status", "superseded").Error
}

func (r *PaymentRepository) CreateAttempt(attempt *PaymentAttempt) error {
	return r.db.Create(attempt).Error
}

func (r *PaymentRepository) GetPendingPaymentTTL() (int, error) {
	var ttlMinutes int
	err := r.db.Table("store_settings").Select("pending_payment_ttl_minutes").Limit(1).Scan(&ttlMinutes).Error
	if err != nil || ttlMinutes <= 0 {
		return 1440, nil
	}
	return ttlMinutes, nil
}
