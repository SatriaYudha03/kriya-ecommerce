package aftersales

import "time"

type ShippingAddressResponse struct {
	Recipient   string `json:"recipient"`
	Phone       string `json:"phone"`
	AddressLine string `json:"address_line"`
	City        string `json:"city"`
	Province    string `json:"province"`
	PostalCode  string `json:"postal_code"`
}

type OrderItemResponse struct {
	Name     string  `json:"name"`
	Color    string  `json:"color"`
	Size     *string `json:"size"`
	Qty      int     `json:"qty"`
	Price    int     `json:"price"`
	Subtotal int     `json:"subtotal"`
}

type OrderResponse struct {
	ID              string                  `json:"id"`
	Status          string                  `json:"status"`
	Items           []OrderItemResponse     `json:"items"`
	Subtotal        int                     `json:"subtotal"`
	ShippingCost    int                     `json:"shipping_cost"`
	Total           int                     `json:"total"`
	ShippingAddress ShippingAddressResponse `json:"shipping_address"`
	CreatedAt       time.Time               `json:"created_at"`
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
