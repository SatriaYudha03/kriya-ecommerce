package catalog

import (
	"encoding/json"
	"time"
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

type CategoryResponse struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	ParentID    *string `json:"parent_id,omitempty"`
	Description string  `json:"description,omitempty"`
	ImageURL    string  `json:"image_url,omitempty"`
	Position    int     `json:"position"`
}

type ProductListResponse struct {
	ID              string  `json:"id"`
	Slug            string  `json:"slug"`
	Name            string  `json:"name"`
	CategorySlug    string  `json:"category_slug"`
	PriceMin        int     `json:"price_min"` // Harga efektif
	RegularPriceMin int     `json:"regular_price_min,omitempty"` // Harga asli (jika on_sale)
	OnSale          bool    `json:"on_sale"`
	InStock         bool    `json:"in_stock"`
	IsFeatured      bool    `json:"is_featured"`
	RatingAvg       float64 `json:"rating_avg"`
	RatingCount     int     `json:"rating_count"`
	ThumbnailURL    string  `json:"thumbnail_url"`
	Status          string  `json:"status"`
}

type ProductDetailResponse struct {
	ID               string            `json:"id"`
	Slug             string            `json:"slug"`
	Name             string            `json:"name"`
	Description      string            `json:"description"`
	ShortDescription string            `json:"short_description,omitempty"`
	Category         CategoryRef       `json:"category"`
	Tags             []TagResponse     `json:"tags,omitempty"`
	Attributes       []AttributeResponse `json:"attributes,omitempty"`
	Materials        []string          `json:"materials"`
	Dimensions       Dimensions        `json:"dimensions"`
	WeightKg         float64           `json:"weight_kg"`
	Images           []ImageResponse   `json:"images"`
	Variants         []VariantResponse `json:"variants"`
	HasAssemblyGuide bool              `json:"has_assembly_guide"`
	PriceMin         int               `json:"price_min"`
	RegularPriceMin  int               `json:"regular_price_min,omitempty"`
	OnSale           bool              `json:"on_sale"`
	SaleEndsAt       *time.Time        `json:"sale_ends_at,omitempty"`
	RatingAvg        float64           `json:"rating_avg"`
	RatingCount      int               `json:"rating_count"`
}

type TagResponse struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type AttributeTermResponse struct {
	Slug         string `json:"slug"`
	Name         string `json:"name"`
	ProductCount int    `json:"product_count,omitempty"`
}

type AttributeResponse struct {
	Slug  string                  `json:"slug"`
	Name  string                  `json:"name"`
	Terms []AttributeTermResponse `json:"terms"`
}

type CategoryRef struct {
	Slug   string       `json:"slug"`
	Name   string       `json:"name"`
	Parent *CategoryRef `json:"parent,omitempty"`
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
	ID           string     `json:"id"`
	Sku          string     `json:"sku"`
	Color        string     `json:"color"`
	Size         *string    `json:"size"`
	Price        int        `json:"price"` // Harga efektif
	RegularPrice int        `json:"regular_price,omitempty"`
	Stock        int        `json:"stock"`
	SaleEndsAt   *time.Time `json:"sale_ends_at,omitempty"`
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
	VariantID string              `json:"variant_id"`
	Qty       int                 `json:"qty"`
	Price     int                 `json:"price"`
	Subtotal  int                 `json:"subtotal"`
	Product   CartProductResponse `json:"product"`
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
	Status           string                `json:"status" binding:"omitempty,oneof=draft published archived"`
	Featured         bool                  `json:"featured"`
	Summary          string                `json:"summary"`
	SeoMetadata      json.RawMessage       `json:"seo_metadata"`
	TagSlugs         []string              `json:"tag_slugs"`
	AttributeTermIDs []string              `json:"attribute_term_ids"`
	UpsellIDs        []string              `json:"upsell_ids"`
	CrossSellIDs     []string              `json:"cross_sell_ids"`
	Variants         []AdminVariantRequest `json:"variants" binding:"dive"`
	Images           []AdminImageRequest   `json:"images" binding:"dive"`
}

type AdminUpdateProductRequest struct {
	Slug             string          `json:"slug"`
	Name             string          `json:"name"`
	CategorySlug     string          `json:"category_slug"`
	Description      string          `json:"description"`
	Materials        []string        `json:"materials"`
	Dimensions       Dimensions      `json:"dimensions"`
	WeightKg         float64         `json:"weight_kg"`
	HasAssemblyGuide bool            `json:"has_assembly_guide"`
	Status           string          `json:"status" binding:"omitempty,oneof=draft published archived"`
	Featured         bool            `json:"featured"`
	Summary          string          `json:"summary"`
	SeoMetadata      json.RawMessage `json:"seo_metadata"`
	TagSlugs         *[]string       `json:"tag_slugs,omitempty"`
	AttributeTermIDs *[]string       `json:"attribute_term_ids,omitempty"`
	UpsellIDs        *[]string       `json:"upsell_ids,omitempty"`
	CrossSellIDs     *[]string       `json:"cross_sell_ids,omitempty"`
}

type AdminVariantRequest struct {
	Sku          string     `json:"sku" binding:"required"`
	Color        string     `json:"color"`
	Size         *string    `json:"size"`
	Price        int        `json:"price" binding:"required,min=1"`
	SalePrice    *int       `json:"sale_price,omitempty"`
	SaleStartsAt *time.Time `json:"sale_starts_at,omitempty"`
	SaleEndsAt   *time.Time `json:"sale_ends_at,omitempty"`
	Stock        int        `json:"stock" binding:"min=0"`
	IsActive     *bool      `json:"is_active"`
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

type AdminVariantResponse struct {
	ID           string     `json:"id"`
	Sku          string     `json:"sku"`
	Color        string     `json:"color"`
	Size         *string    `json:"size"`
	Price        int        `json:"price"`
	SalePrice    *int       `json:"sale_price,omitempty"`
	SaleStartsAt *time.Time `json:"sale_starts_at,omitempty"`
	SaleEndsAt   *time.Time `json:"sale_ends_at,omitempty"`
	Stock        int        `json:"stock"`
	IsActive     bool       `json:"is_active"`
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
	Status           string               `json:"status"`
	Featured         bool                 `json:"featured"`
	Summary          string               `json:"summary"`
	SeoMetadata      json.RawMessage      `json:"seo_metadata"`
	TagSlugs         []string             `json:"tag_slugs"`
	AttributeTermIDs []string             `json:"attribute_term_ids"`
	UpsellIDs        []string             `json:"upsell_ids"`
	CrossSellIDs     []string             `json:"cross_sell_ids"`
	Variants         []AdminVariantResponse `json:"variants"`
	Images           []AdminImageResponse `json:"images"`
}

type AdminCategoryRequest struct {
	Slug            string          `json:"slug" binding:"required"`
	Name            string          `json:"name" binding:"required"`
	ParentID        *string         `json:"parent_id"`
	DescriptionI18n json.RawMessage `json:"description_i18n"`
	ImagePath       *string         `json:"image_path"`
	Position        int             `json:"position"`
	IsActive        *bool           `json:"is_active"`
}

type AdminCategoryResponse struct {
	ID              string          `json:"id"`
	Slug            string          `json:"slug"`
	Name            string          `json:"name"`
	ParentID        *string         `json:"parent_id"`
	DescriptionI18n json.RawMessage `json:"description_i18n"`
	ImagePath       *string         `json:"image_path"`
	Position        int             `json:"position"`
	IsActive        bool            `json:"is_active"`
}
type AdminTagRequest struct {
	Slug     string          `json:"slug" binding:"required"`
	NameI18n json.RawMessage `json:"name_i18n"`
}

type AdminTagResponse struct {
	ID       string          `json:"id"`
	Slug     string          `json:"slug"`
	NameI18n json.RawMessage `json:"name_i18n"`
}

type AdminAttributeRequest struct {
	Slug          string          `json:"slug" binding:"required"`
	NameI18n      json.RawMessage `json:"name_i18n"`
	IsFilterable  *bool           `json:"is_filterable"`
	Position      int             `json:"position"`
}

type AdminAttributeResponse struct {
	ID           string                   `json:"id"`
	Slug         string                   `json:"slug"`
	NameI18n     json.RawMessage          `json:"name_i18n"`
	IsFilterable bool                     `json:"is_filterable"`
	Position     int                      `json:"position"`
	Terms        []AdminAttributeTermResponse `json:"terms"`
}

type AdminAttributeTermRequest struct {
	Slug     string          `json:"slug" binding:"required"`
	NameI18n json.RawMessage `json:"name_i18n"`
	Position int             `json:"position"`
}

type AdminAttributeTermResponse struct {
	ID       string          `json:"id"`
	Slug     string          `json:"slug"`
	NameI18n json.RawMessage `json:"name_i18n"`
	Position int             `json:"position"`
}

type AdminInventoryItemResponse struct {
	VariantID   string  `json:"variant_id"`
	ProductID   string  `json:"product_id"`
	ProductName string  `json:"product_name"`
	ProductSlug string  `json:"product_slug"`
	SKU         string  `json:"sku"`
	Color       string  `json:"color"`
	Size        *string `json:"size"`
	Stock       int     `json:"stock"`
	LowStock    bool    `json:"low_stock"`
}

type AdminStockAdjustmentRequest struct {
	VariantID string `json:"variant_id" binding:"required,uuid"`
	Qty       int    `json:"qty" binding:"required,min=0"`
	Note      string `json:"note"`
}
