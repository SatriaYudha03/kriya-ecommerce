package model

import "time"

type Meta struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type Response struct {
	Data interface{} `json:"data,omitempty"`
	Meta *Meta       `json:"meta,omitempty"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type CategoryResponse struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type ProductListResponse struct {
	ID           string `json:"id"`
	Slug         string `json:"slug"`
	Name         string `json:"name"`
	CategorySlug string `json:"category_slug"`
	PriceMin     int    `json:"price_min"`
	ThumbnailURL string `json:"thumbnail_url"`
}

type ProductDetailResponse struct {
	ID               string           `json:"id"`
	Slug             string           `json:"slug"`
	Name             string           `json:"name"`
	Description      string           `json:"description"`
	Category         CategoryRef      `json:"category"`
	Materials        []string         `json:"materials"`
	Dimensions       Dimensions       `json:"dimensions"`
	WeightKg         float64          `json:"weight_kg"`
	Images           []ImageResponse  `json:"images"`
	Variants         []VariantResponse `json:"variants"`
	HasAssemblyGuide bool             `json:"has_assembly_guide"`
}

type CategoryRef struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type Dimensions struct {
	WidthCm  float64 `json:"width_cm"`
	DepthCm  float64 `json:"depth_cm"`
	HeightCm float64 `json:"height_cm"`
}

type ImageResponse struct {
	URL string `json:"url"` // Public Supabase Storage URL, dibangun dari storage_path
	Alt string `json:"alt"`
}

type VariantResponse struct {
	ID    string  `json:"id"`
	Sku   string  `json:"sku"`
	Color string  `json:"color"`
	Size  *string `json:"size"`
	Price int     `json:"price"`
	Stock int     `json:"stock"`
}

// ===== Cart =====

type CartItemRequest struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Qty       int    `json:"qty" binding:"required,min=1"`
}

type PutCartRequest struct {
	Items []CartItemRequest `json:"items" binding:"dive"`
}

type CartProductResponse struct {
	Slug         string  `json:"slug"`
	Name         string  `json:"name"`
	ThumbnailURL string  `json:"thumbnail_url"`
	Color        string  `json:"color"`
	Size         *string `json:"size"`
}

type CartItemResponse struct {
	VariantID string               `json:"variant_id"`
	Qty       int                  `json:"qty"`
	Price     int                  `json:"price"`
	Subtotal  int                  `json:"subtotal"`
	Product   CartProductResponse  `json:"product"`
}

type CartResponse struct {
	Items []CartItemResponse `json:"items"`
	Total int                `json:"total"`
}

// ===== Orders =====

type OrderItemRequest struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Qty       int    `json:"qty" binding:"required,min=1"`
}

type ShippingAddressRequest struct {
	Recipient   string `json:"recipient" binding:"required"`
	Phone       string `json:"phone" binding:"required"`
	AddressLine string `json:"address_line" binding:"required"`
	City        string `json:"city" binding:"required"`
	Province    string `json:"province" binding:"required"`
	PostalCode  string `json:"postal_code" binding:"required"`
}

type CreateOrderRequest struct {
	Items           []OrderItemRequest     `json:"items" binding:"required,min=1,dive"`
	ShippingZone    string                 `json:"shipping_zone" binding:"required,oneof=jawa_bali luar"`
	ShippingAddress ShippingAddressRequest `json:"shipping_address" binding:"required"`
}

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

type CreateOrderResponse struct {
	Order             OrderResponse `json:"order"`
	SnapToken         string        `json:"snap_token"`
	MidtransClientKey string        `json:"midtrans_client_key"`
}

// ===== Profile (data diri + alamat default) =====

// ProfileResponse: data diri + alamat default user, dipakai FE untuk prefill checkout.
type ProfileResponse struct {
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	AddressLine string `json:"address_line"`
	City        string `json:"city"`
	Province    string `json:"province"`
	PostalCode  string `json:"postal_code"`
}

// UpdateProfileRequest: semua field opsional (profil boleh diisi bertahap).
type UpdateProfileRequest struct {
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	AddressLine string `json:"address_line"`
	City        string `json:"city"`
	Province    string `json:"province"`
	PostalCode  string `json:"postal_code"`
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

type AdminCreateProductRequest struct {
	Slug             string                `json:"slug" binding:"required"`
	Name             string                `json:"name" binding:"required"`
	CategorySlug     string                `json:"category_slug" binding:"required"`
	Description      string                `json:"description"`
	Materials        []string              `json:"materials"`
	Dimensions       Dimensions            `json:"dimensions"`
	WeightKg         float64               `json:"weight_kg"`
	HasAssemblyGuide bool                  `json:"has_assembly_guide"`
	Variants         []AdminVariantRequest `json:"variants" binding:"dive"`
	Images           []AdminImageRequest   `json:"images" binding:"dive"`
}

type AdminUpdateProductRequest struct {
	Slug             string     `json:"slug"`
	Name             string     `json:"name"`
	CategorySlug     string     `json:"category_slug"`
	Description      string     `json:"description"`
	Materials        []string   `json:"materials"`
	Dimensions       Dimensions `json:"dimensions"`
	WeightKg         float64    `json:"weight_kg"`
	HasAssemblyGuide bool       `json:"has_assembly_guide"`
}

type AdminVariantRequest struct {
	Sku   string  `json:"sku" binding:"required"`
	Color string  `json:"color"`
	Size  *string `json:"size"`
	Price int     `json:"price" binding:"required,min=1"`
	// Stock TIDAK pakai `required`: validator Go menganggap 0 sebagai "kosong",
	// padahal stok 0 (habis) valid. Cukup min=0.
	Stock int `json:"stock" binding:"min=0"`
}

type AdminImageRequest struct {
	StoragePath string `json:"storage_path" binding:"required"`
	Alt         string `json:"alt"`
	IsPrimary   bool   `json:"is_primary"`
}

type AdminImageUpdateRequest struct {
	Alt       string `json:"alt"`
	IsPrimary bool   `json:"is_primary"`
}

type AdminStatsResponse struct {
	TotalOrders    int64 `json:"total_orders"`
	Revenue        int64 `json:"revenue"`
	ActiveProducts int64 `json:"active_products"`
}

// AdminImageResponse memuat id + storage_path (bentuk internal, dipakai form edit).
type AdminImageResponse struct {
	ID          string `json:"id"`
	StoragePath string `json:"storage_path"`
	URL         string `json:"url"`
	Alt         string `json:"alt"`
	IsPrimary   bool   `json:"is_primary"`
}

// AdminProductDetailResponse = bentuk internal produk untuk panel admin:
// menyertakan id varian & gambar, is_primary, dan storage_path (beda dari
// kontrak publik yang hanya {url, alt}).
type AdminProductDetailResponse struct {
	ID               string               `json:"id"`
	Slug             string               `json:"slug"`
	Name             string               `json:"name"`
	Description      string               `json:"description"`
	CategorySlug     string               `json:"category_slug"`
	Materials        []string             `json:"materials"`
	Dimensions       Dimensions           `json:"dimensions"`
	WeightKg         float64              `json:"weight_kg"`
	HasAssemblyGuide bool                 `json:"has_assembly_guide"`
	Variants         []VariantResponse    `json:"variants"`
	Images           []AdminImageResponse `json:"images"`
}
