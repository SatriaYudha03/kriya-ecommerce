package checkout

import (
	"context"

	"gorm.io/gorm"
)

// addressRow adalah baca-saja lintas domain ke tabel `addresses`/`provinces` milik B
// (RENCANA §5.6: baca lintas domain selalu boleh, tulis tidak). Dipakai untuk validasi
// kepemilikan alamat + snapshot alamat saat checkout.
type addressRow struct {
	ID           string
	UserID       string
	Recipient    string
	Phone        string
	AddressLine  string
	District     *string
	City         string
	ProvinceCode string
	ProvinceName string
	PostalCode   string
}

func getAddressForUser(ctx context.Context, db *gorm.DB, addressID, userID string) (*addressRow, error) {
	var row addressRow
	err := db.WithContext(ctx).Table("addresses a").
		Select("a.id, a.user_id, a.recipient, a.phone, a.address_line, a.district, a.city, a.province_code, p.name as province_name, a.postal_code").
		Joins("JOIN provinces p ON p.code = a.province_code").
		Where("a.id = ? AND a.user_id = ?", addressID, userID).
		Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

// storeSettingsRow adalah baca-saja ke `store_settings` milik B (RENCANA §5.6).
type storeSettingsRow struct {
	TaxRateBP                int
	PricesIncludeTax         bool
	PendingPaymentTTLMinutes int
}

const defaultPendingPaymentTTLMinutes = 1440

func getStoreSettings(ctx context.Context, db *gorm.DB) storeSettingsRow {
	var row storeSettingsRow
	err := db.WithContext(ctx).Table("store_settings").
		Select("tax_rate_bp, prices_include_tax, pending_payment_ttl_minutes").
		Limit(1).Scan(&row).Error
	if err != nil || row.PendingPaymentTTLMinutes <= 0 {
		row.PendingPaymentTTLMinutes = defaultPendingPaymentTTLMinutes
	}
	return row
}
