package promo

import (
	"encoding/json"
	"time"
)

type RecentOrder struct {
	ID            string    `json:"id"`
	OrderNumber   string    `json:"order_number"`
	Status        string    `json:"status"`
	Total         int64     `json:"total"`
	CreatedAt     time.Time `json:"created_at"`
	CustomerEmail string    `json:"customer_email"`
}

type AdminStatsResponse struct {
	TotalOrders         int64         `json:"total_orders"`
	Revenue             int64         `json:"revenue"`
	ActiveProducts      int64         `json:"active_products"`
	TodayRevenue        int64         `json:"today_revenue"`
	TodayOrders         int64         `json:"today_orders"`
	PendingPaymentCount int64         `json:"pending_payment_count"`
	ToShipCount         int64         `json:"to_ship_count"`
	LowStockCount       int64         `json:"low_stock_count"`
	PendingReviewsCount int64         `json:"pending_reviews_count"`
	OpenReturnsCount    int64         `json:"open_returns_count"`
	RecentOrders        []RecentOrder `json:"recent_orders"`
}

type Coupon struct {
	ID                  string          `json:"id" db:"id"`
	Code                string          `json:"code" db:"code"`
	DescriptionI18n     json.RawMessage `json:"description_i18n" db:"description_i18n"`
	DiscountType        string          `json:"discount_type" db:"discount_type"`
	Amount              int             `json:"amount" db:"amount"`
	MaxDiscount         *int            `json:"max_discount" db:"max_discount"`
	MinSubtotal         int             `json:"min_subtotal" db:"min_subtotal"`
	StartsAt            *time.Time      `json:"starts_at" db:"starts_at"`
	EndsAt              *time.Time      `json:"ends_at" db:"ends_at"`
	UsageLimit          *int            `json:"usage_limit" db:"usage_limit"`
	UsageLimitPerUser   *int            `json:"usage_limit_per_user" db:"usage_limit_per_user"`
	AppliesTo           string          `json:"applies_to" db:"applies_to"` // all, products, categories
	ExcludeSaleItems    bool            `json:"exclude_sale_items" db:"exclude_sale_items"`
	IsPublic            bool            `json:"is_public" db:"is_public"`
	IsActive            bool            `json:"is_active" db:"is_active"`
	CreatedBy           *string         `json:"created_by,omitempty" db:"created_by"`
	CreatedAt           time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at" db:"updated_at"`
	
	// Virtual/Derived
	Status              string          `json:"status"`
	TotalRedemptions    int             `json:"total_redemptions"`
	
	// Relations (fetched on Detail)
	Products            []string        `json:"products,omitempty" gorm:"-"`
	Categories          []string        `json:"categories,omitempty" gorm:"-"`
}

type CouponFilter struct {
	Search string
	Status string // active, scheduled, expired, inactive
}

type CouponRequest struct {
	Code                string            `json:"code" binding:"required"`
	DescriptionI18n     map[string]string `json:"description_i18n" binding:"required"`
	DiscountType        string            `json:"discount_type" binding:"required,oneof=percent fixed_cart free_shipping"`
	Amount              int               `json:"amount"`
	MaxDiscount         *int              `json:"max_discount"`
	MinSubtotal         int               `json:"min_subtotal"`
	StartsAt            *time.Time        `json:"starts_at"`
	EndsAt              *time.Time        `json:"ends_at"`
	UsageLimit          *int              `json:"usage_limit"`
	UsageLimitPerUser   *int              `json:"usage_limit_per_user"`
	AppliesTo           string            `json:"applies_to" binding:"required,oneof=all products categories"`
	ExcludeSaleItems    bool              `json:"exclude_sale_items"`
	IsPublic            bool              `json:"is_public"`
	IsActive            bool              `json:"is_active"`
	
	Products            []string          `json:"products"`
	Categories          []string          `json:"categories"`
}

type CouponRedemption struct {
	ID               string    `json:"id" db:"id"`
	CouponID         string    `json:"coupon_id" db:"coupon_id"`
	OrderID          string    `json:"order_id" db:"order_id"`
	UserID           string    `json:"user_id" db:"user_id"`
	ItemsDiscount    int       `json:"items_discount" db:"items_discount"`
	ShippingDiscount int       `json:"shipping_discount" db:"shipping_discount"`
	Status           string    `json:"status" db:"status"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}
