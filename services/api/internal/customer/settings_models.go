package customer

type AdminUpdateSettingsRequest struct {
	StoreName                  string  `json:"store_name" binding:"required"`
	SupportEmail               *string `json:"support_email"`
	SupportPhone               *string `json:"support_phone"`
	TaxRateBP                  int     `json:"tax_rate_bp" binding:"min=0,max=5000"`
	PricesIncludeTax           *bool   `json:"prices_include_tax" binding:"required"`
	PendingPaymentTTLMinutes   int     `json:"pending_payment_ttl_minutes" binding:"required,min=15,max=10080"`
	ReturnWindowDays           int     `json:"return_window_days" binding:"min=0,max=60"`
	LowStockThresholdDefault   int     `json:"low_stock_threshold_default" binding:"min=0"`
}

type AdminSettingsResponse struct {
	StoreName                  string  `json:"store_name"`
	SupportEmail               *string `json:"support_email"`
	SupportPhone               *string `json:"support_phone"`
	TaxRateBP                  int     `json:"tax_rate_bp"`
	PricesIncludeTax           bool    `json:"prices_include_tax"`
	PendingPaymentTTLMinutes   int     `json:"pending_payment_ttl_minutes"`
	ReturnWindowDays           int     `json:"return_window_days"`
	LowStockThresholdDefault   int     `json:"low_stock_threshold_default"`
}

type PublicStoreResponse struct {
	StoreName        string  `json:"store_name"`
	SupportEmail     *string `json:"support_email"`
	SupportPhone     *string `json:"support_phone"`
	TaxRateBP        int     `json:"tax_rate_bp"`
	PricesIncludeTax bool    `json:"prices_include_tax"`
	ReturnWindowDays int     `json:"return_window_days"`
}
