package model

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
	URL string `json:"url"` // Maps to storage_path
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
