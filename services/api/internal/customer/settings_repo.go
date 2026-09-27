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
	return r.db.Model(&StoreSettings{}).Where("id = ?", true).Updates(map[string]interface{}{
		"store_name":                  req.StoreName,
		"support_email":               req.SupportEmail,
		"support_phone":               req.SupportPhone,
		"tax_rate_bp":                 req.TaxRateBP,
		"prices_include_tax":          req.PricesIncludeTax,
		"pending_payment_ttl_minutes": req.PendingPaymentTTLMinutes,
		"return_window_days":          req.ReturnWindowDays,
		"low_stock_threshold_default": req.LowStockThresholdDefault,
	}).Error
}
