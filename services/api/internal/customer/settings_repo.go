package customer

import (
	"gorm.io/gorm"
)

type StoreSettings struct {
	ID                         bool    `gorm:"primaryKey"`
	StoreName                  string  `gorm:"column:store_name"`
	SupportEmail               *string `gorm:"column:support_email"`
	SupportPhone               *string `gorm:"column:support_phone"`
	TaxRateBP                  int     `gorm:"column:tax_rate_bp"`
	PricesIncludeTax           bool    `gorm:"column:prices_include_tax"`
	PendingPaymentTTLMinutes   int     `gorm:"column:pending_payment_ttl_minutes"`
	ReturnWindowDays           int     `gorm:"column:return_window_days"`
	LowStockThresholdDefault   int     `gorm:"column:low_stock_threshold_default"`
}

func (StoreSettings) TableName() string { return "store_settings" }

type SettingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) GetSettings() (*StoreSettings, error) {
	var s StoreSettings
	if err := r.db.First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepository) UpdateSettings(req *AdminUpdateSettingsRequest) error {
	var pricesIncludeTax bool
	if req.PricesIncludeTax != nil {
		pricesIncludeTax = *req.PricesIncludeTax
	}
	s := StoreSettings{
		StoreName:                req.StoreName,
		SupportEmail:             req.SupportEmail,
		SupportPhone:             req.SupportPhone,
		TaxRateBP:                req.TaxRateBP,
		PricesIncludeTax:         pricesIncludeTax,
		PendingPaymentTTLMinutes: req.PendingPaymentTTLMinutes,
		ReturnWindowDays:         req.ReturnWindowDays,
		LowStockThresholdDefault: req.LowStockThresholdDefault,
	}
	return r.db.Model(&StoreSettings{}).Where("id = ?", true).
		Select("store_name", "support_email", "support_phone", "tax_rate_bp", "prices_include_tax", "pending_payment_ttl_minutes", "return_window_days", "low_stock_threshold_default").
		Updates(&s).Error
}
