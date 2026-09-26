package aftersales

import "time"

type ShippingMethodResponse struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	EtaMinDays int    `json:"eta_min_days"`
	EtaMaxDays int    `json:"eta_max_days"`
}

type ShippingAddressResponse struct {
	Recipient    string  `json:"recipient"`
	Phone        string  `json:"phone"`
	AddressLine  string  `json:"address_line"`
	City         string  `json:"city"`
	Province     string  `json:"province"`
	PostalCode   string  `json:"postal_code"`
	ProvinceCode *string `json:"province_code,omitempty"`
	District     *string `json:"district,omitempty"`
}

type OrderItemResponse struct {
	ID             string  `json:"id"`
	VariantID      string  `json:"variant_id"`
	ProductSlug    string  `json:"product_slug"`
	ThumbnailURL   string  `json:"thumbnail_url"`
	Name           string  `json:"name"`
	SKU            *string `json:"sku"`
	Color          string  `json:"color"`
	Size           *string `json:"size"`
	Qty            int     `json:"qty"`
	Price          int     `json:"price"`
	RegularPrice   int     `json:"regular_price"`
	DiscountAmount int     `json:"discount_amount"`
	Subtotal       int     `json:"subtotal"`
	RefundedQty    int     `json:"refunded_qty"`
	CanReview      bool    `json:"can_review"`
	ReviewID       *string `json:"review_id"`
}

type PaymentResponse struct {
	Status      string     `json:"status"`
	CanContinue bool       `json:"can_continue"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

type TimelineEvent struct {
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	Note      *string   `json:"note"`
}

type OrderResponse struct {
	ID               string                   `json:"id"`
	OrderNumber      string                   `json:"order_number"`
	Status           string                   `json:"status"`
	Items            []OrderItemResponse      `json:"items"`
	Subtotal         int                      `json:"subtotal"`
	DiscountTotal    int                      `json:"discount_total"`
	ShippingCost     int                      `json:"shipping_cost"`
	ShippingDiscount int                      `json:"shipping_discount"`
	TaxAmount        int                      `json:"tax_amount"`
	Total            int                      `json:"total"`
	CouponCode       *string                  `json:"coupon_code"`
	ShippingMethod   *ShippingMethodResponse  `json:"shipping_method"`
	ShippingAddress  ShippingAddressResponse  `json:"shipping_address"`
	CustomerNote     *string                  `json:"customer_note"`
	Courier          *string                  `json:"courier"`
	TrackingNumber   *string                  `json:"tracking_number"`
	Payment          PaymentResponse          `json:"payment"`
	CanCancel        bool                     `json:"can_cancel"`
	CanReturn        bool                     `json:"can_return"`
	PaidAt           *time.Time               `json:"paid_at"`
	ShippedAt        *time.Time               `json:"shipped_at"`
	CompletedAt      *time.Time               `json:"completed_at"`
	CancelledAt      *time.Time               `json:"cancelled_at"`
	CreatedAt        time.Time                `json:"created_at"`
	Timeline         []TimelineEvent          `json:"timeline"`
}

// ===== Internal =====

type InternalOrderStatusResponse struct {
	OrderID   string    `json:"order_id"`
	Status    string    `json:"status"`
	Total     int       `json:"total"`
	CreatedAt time.Time `json:"created_at"`
}

// ===== Admin =====

type AdminUpdateOrderStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending_payment paid processing shipped completed cancelled expired"`
}
