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

type OrderNote struct {
	ID                string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID           string    `gorm:"column:order_id;type:uuid"`
	AuthorID          *string   `gorm:"column:author_id;type:uuid"`
	Body              string    `gorm:"column:body"`
	IsCustomerVisible bool      `gorm:"column:is_customer_visible"`
	CreatedAt         time.Time `gorm:"column:created_at"`
	AuthorName        *string   `gorm:"->;column:author_name"`
}

func (OrderNote) TableName() string { return "order_notes" }

type OrderEvent struct {

	ID        string    `gorm:"type:uuid;primaryKey"`
	OrderID   string    `gorm:"column:order_id;type:uuid"`
	FromStatus *string   `gorm:"column:from_status"`
	ToStatus  string    `gorm:"column:to_status"`
	ActorType string    `gorm:"column:actor_type"`
	Note      *string   `gorm:"column:note"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (OrderEvent) TableName() string { return "order_events" }

type PaymentAttempt struct {
	ID              string     `gorm:"type:uuid;primaryKey"`
	OrderID         string     `gorm:"column:order_id;type:uuid"`
	MidtransOrderID string     `gorm:"column:midtrans_order_id"`
	SnapToken       *string    `gorm:"column:snap_token"`
	ExpiresAt       *time.Time `gorm:"column:expires_at"`
	Status          string     `gorm:"column:status"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
}

func (PaymentAttempt) TableName() string { return "payment_attempts" }

type Order struct {
	ID                 string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderNumber        string    `gorm:"column:order_number"`
	UserID             string    `gorm:"column:user_id;type:uuid"`
	Status             string    `gorm:"column:status"`
	Subtotal           int       `gorm:"column:subtotal"`
	DiscountTotal      int       `gorm:"column:discount_total"`
	ShippingCost       int       `gorm:"column:shipping_cost"`
	ShippingDiscount   int       `gorm:"column:shipping_discount"`
	TaxAmount          int       `gorm:"column:tax_amount"`
	Total              int       `gorm:"column:total"`
	ShippingMethodCode *string   `gorm:"column:shipping_method_code"`
	ShippingMethodName *string   `gorm:"column:shipping_method_name"`
	ShippingEtaMinDays *int      `gorm:"column:shipping_eta_min_days"`
	ShippingEtaMaxDays *int      `gorm:"column:shipping_eta_max_days"`
	ShippingAddress    []byte    `gorm:"column:shipping_address;type:jsonb"`
	CustomerNote       *string   `gorm:"column:customer_note"`
	Courier            *string   `gorm:"column:courier"`
	TrackingNumber     *string   `gorm:"column:tracking_number"`
	PaidAt             *time.Time `gorm:"column:paid_at"`
	ShippedAt          *time.Time `gorm:"column:shipped_at"`
	CompletedAt        *time.Time `gorm:"column:completed_at"`
	CancelledAt        *time.Time `gorm:"column:cancelled_at"`
	CreatedAt          time.Time  `gorm:"column:created_at"`
	UpdatedAt          time.Time  `gorm:"column:updated_at"`

	Items           []OrderItem      `gorm:"foreignKey:OrderID"`
	Events          []OrderEvent     `gorm:"foreignKey:OrderID"`
	Notes           []OrderNote      `gorm:"foreignKey:OrderID"`
	PaymentAttempts []PaymentAttempt `gorm:"foreignKey:OrderID"`
	
	TotalCount      int64      `gorm:"->;column:total_count"`
	PaStatus        *string    `gorm:"->;column:pa_status"`
	PaExpiresAt     *time.Time `gorm:"->;column:pa_expires_at"`
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
	RefundedQty    int     `gorm:"column:refunded_qty"`

	ProductSlug    *string `gorm:"->;column:product_slug"`
	ThumbnailURL   *string `gorm:"->;column:thumbnail_url"`
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

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// ListByUser paginates orders, fetches items, events, and payment attempts (max 3 queries, no N+1).
func (r *OrderRepository) ListByUser(userID string, page, limit int, status string) ([]Order, int64, error) {
	var orders []Order

	// Query 1: Orders (with total_count and payment attempt)
	q := r.db.Model(&Order{}).
		Select("orders.*, COUNT(*) OVER() as total_count, pa.status as pa_status, pa.expires_at as pa_expires_at").
		Joins("LEFT JOIN payment_attempts pa ON pa.order_id = orders.id AND pa.status = 'active'").
		Where("orders.user_id = ?", userID)

	if status != "" {
		q = q.Where("orders.status = ?", status)
	}

	offset := (page - 1) * limit
	err := q.Order("orders.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&orders).Error

	if err != nil {
		return nil, 0, err
	}

	if len(orders) == 0 {
		return nil, 0, nil
	}

	total := int64(0)
	if len(orders) > 0 {
		total = orders[0].TotalCount
	}

	orderIDs := make([]string, len(orders))
	for i, o := range orders {
		orderIDs[i] = o.ID
	}

	// Query 2: Items (with products and images joined)
	var items []OrderItem
	err = r.db.Model(&OrderItem{}).
		Select("order_items.*, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN products p ON p.id = order_items.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("order_items.order_id IN ?", orderIDs).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	// Query 3: Events
	var events []OrderEvent
	err = r.db.Model(&OrderEvent{}).
		Where("order_id IN ?", orderIDs).
		Order("created_at ASC").
		Find(&events).Error
	if err != nil {
		return nil, 0, err
	}

	// Manual stitch (to avoid N+1 and keep it exactly 3 queries)
	itemsByOrderID := make(map[string][]OrderItem)
	for _, it := range items {
		itemsByOrderID[it.OrderID] = append(itemsByOrderID[it.OrderID], it)
	}
	eventsByOrderID := make(map[string][]OrderEvent)
	for _, ev := range events {
		eventsByOrderID[ev.OrderID] = append(eventsByOrderID[ev.OrderID], ev)
	}

	for i := range orders {
		orders[i].Items = itemsByOrderID[orders[i].ID]
		orders[i].Events = eventsByOrderID[orders[i].ID]
	}

	return orders, total, nil
}

func (r *OrderRepository) GetByIDForUser(id, userID string) (*Order, error) {
	var order Order
	err := r.db.Model(&Order{}).
		Select("orders.*, pa.status as pa_status, pa.expires_at as pa_expires_at").
		Joins("LEFT JOIN payment_attempts pa ON pa.order_id = orders.id AND pa.status = 'active'").
		Where("orders.id = ? AND orders.user_id = ?", id, userID).
		First(&order).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	// Items
	err = r.db.Model(&OrderItem{}).
		Select("order_items.*, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN products p ON p.id = order_items.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("order_items.order_id = ?", id).
		Find(&order.Items).Error
	if err != nil {
		return nil, err
	}

	// Events
	err = r.db.Model(&OrderEvent{}).
		Where("order_id = ?", id).
		Order("created_at ASC").
		Find(&order.Events).Error
	if err != nil {
		return nil, err
	}

	// Notes
	err = r.db.Model(&OrderNote{}).
		Select("order_notes.*, p.name as author_name").
		Joins("LEFT JOIN profiles p ON p.id = order_notes.author_id").
		Where("order_notes.order_id = ? AND order_notes.is_customer_visible = true", id).
		Order("order_notes.created_at ASC").
		Find(&order.Notes).Error
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *OrderRepository) GetItemsByOrderID(orderID string) ([]OrderItem, error) {
	var items []OrderItem
	err := r.db.Where("order_id = ?", orderID).Order("name").Find(&items).Error
	return items, err
}

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
