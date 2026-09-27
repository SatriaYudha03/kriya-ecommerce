package checkout

import "time"

// ===== Request bersama quote & orders v2 (RENCANA §7.6) =====

type OrderItemRequest struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Qty       int    `json:"qty" binding:"required,min=1"`
}

type QuoteRequest struct {
	Items            []OrderItemRequest `json:"items" binding:"required,min=1,dive"`
	AddressID        *string            `json:"address_id" binding:"omitempty,uuid"`
	ProvinceCode     *string            `json:"province_code"`
	ShippingMethodID *string            `json:"shipping_method_id" binding:"omitempty,uuid"`
	CouponCode       *string            `json:"coupon_code"`
}

type CreateOrderRequest struct {
	Items            []OrderItemRequest `json:"items" binding:"required,min=1,dive"`
	AddressID        string             `json:"address_id" binding:"required,uuid"`
	ShippingMethodID string             `json:"shipping_method_id" binding:"required,uuid"`
	CouponCode       *string            `json:"coupon_code"`
	CustomerNote     *string            `json:"customer_note"`
}

// ===== Quote response (POST /checkout/quote) =====

type QuoteLineResponse struct {
	VariantID      string  `json:"variant_id"`
	ProductSlug    string  `json:"product_slug"`
	Name           string  `json:"name"`
	Color          string  `json:"color"`
	Size           *string `json:"size"`
	ThumbnailURL   string  `json:"thumbnail_url"`
	Qty            int     `json:"qty"`
	UnitPrice      int     `json:"unit_price"`
	RegularPrice   int     `json:"regular_price"`
	DiscountAmount int     `json:"discount_amount"`
	Subtotal       int     `json:"subtotal"`
}

type QuoteShippingOption struct {
	MethodID   string `json:"method_id"`
	Code       string `json:"code"`
	Name       string `json:"name"`
	Cost       int    `json:"cost"`
	EtaMinDays int    `json:"eta_min_days"`
	EtaMaxDays int    `json:"eta_max_days"`
	IsFree     bool   `json:"is_free"`
}

type QuoteCouponResponse struct {
	Code         string  `json:"code"`
	Valid        bool    `json:"valid"`
	Reason       *string `json:"reason"`
	DiscountType *string `json:"discount_type"`
}

type QuoteProblemResponse struct {
	VariantID string `json:"variant_id"`
	Code      string `json:"code"`
	Available int    `json:"available"`
}

type QuoteResponse struct {
	Lines                    []QuoteLineResponse    `json:"lines"`
	Subtotal                 int                    `json:"subtotal"`
	DiscountTotal            int                    `json:"discount_total"`
	ShippingOptions          []QuoteShippingOption  `json:"shipping_options"`
	SelectedShippingMethodID *string                `json:"selected_shipping_method_id"`
	ShippingCost             int                    `json:"shipping_cost"`
	ShippingDiscount         int                    `json:"shipping_discount"`
	TaxAmount                int                    `json:"tax_amount"`
	Total                    int                    `json:"total"`
	TotalWeightKg            float64                `json:"total_weight_kg"`
	Coupon                   *QuoteCouponResponse   `json:"coupon"`
	Problems                 []QuoteProblemResponse `json:"problems"`
}

// ===== Order v2 (<order> RENCANA §7.5, dipakai balikan POST /orders) =====

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
	ProductSlug    *string `json:"product_slug"`
	ThumbnailURL   *string `json:"thumbnail_url"`
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
	Note      *string   `json:"note"`
	ActorType string    `json:"actor_type"`
	CreatedAt time.Time `json:"created_at"`
}

type OrderResponse struct {
	ID               string                  `json:"id"`
	OrderNumber      string                  `json:"order_number"`
	Status           string                  `json:"status"`
	Items            []OrderItemResponse     `json:"items"`
	Subtotal         int                     `json:"subtotal"`
	DiscountTotal    int                     `json:"discount_total"`
	ShippingCost     int                     `json:"shipping_cost"`
	ShippingDiscount int                     `json:"shipping_discount"`
	TaxAmount        int                     `json:"tax_amount"`
	Total            int                     `json:"total"`
	CouponCode       *string                 `json:"coupon_code"`
	ShippingMethod   *ShippingMethodResponse `json:"shipping_method"`
	ShippingAddress  ShippingAddressResponse `json:"shipping_address"`
	CustomerNote     *string                 `json:"customer_note"`
	Courier          *string                 `json:"courier"`
	TrackingNumber   *string                 `json:"tracking_number"`
	Payment          PaymentResponse         `json:"payment"`
	CanCancel        bool                    `json:"can_cancel"`
	CanReturn        bool                    `json:"can_return"`
	PaidAt           *time.Time              `json:"paid_at"`
	ShippedAt        *time.Time              `json:"shipped_at"`
	CompletedAt      *time.Time              `json:"completed_at"`
	CancelledAt      *time.Time              `json:"cancelled_at"`
	CreatedAt        time.Time               `json:"created_at"`
	Timeline         []TimelineEvent         `json:"timeline"`
}

type CreateOrderResponse struct {
	Order             OrderResponse `json:"order"`
	SnapToken         string        `json:"snap_token"`
	MidtransClientKey string        `json:"midtrans_client_key"`
}
