package customer

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type Province struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	ZoneCode string `json:"zone_code"`
}

type Address struct {
	ID           string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       string  `gorm:"column:user_id;type:uuid"`
	Label        string  `gorm:"column:label"`
	Recipient    string  `gorm:"column:recipient"`
	Phone        string  `gorm:"column:phone"`
	AddressLine  string  `gorm:"column:address_line"`
	District     *string `gorm:"column:district"`
	City         string  `gorm:"column:city"`
	ProvinceCode string  `gorm:"column:province_code"`
	PostalCode   string  `gorm:"column:postal_code"`
	Notes        *string `gorm:"column:notes"`
	IsDefault    bool    `gorm:"column:is_default"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type AddressWithProvince struct {
	Address
	ProvinceName string `gorm:"column:province_name"`
}

type AddressRepository struct {
	db *gorm.DB
}

func NewAddressRepository(db *gorm.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

func (r *AddressRepository) GetProvinces() ([]Province, error) {
	var rows []Province
	err := r.db.Table("provinces p").
		Select("p.code, p.name, sz.code as zone_code").
		Joins("LEFT JOIN shipping_zone_provinces szp ON szp.province_code = p.code").
		Joins("LEFT JOIN shipping_zones sz ON sz.id = szp.zone_id").
		Order("p.name ASC").
		Scan(&rows).Error
	return rows, err
}

func (r *AddressRepository) GetAddresses(userID string) ([]AddressWithProvince, error) {
	var rows []AddressWithProvince
	err := r.db.Table("addresses a").
		Select("a.*, p.name as province_name").
		Joins("JOIN provinces p ON p.code = a.province_code").
		Where("a.user_id = ?", userID).
		Order("a.is_default DESC, a.created_at DESC").
		Limit(20).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []AddressWithProvince{} // Pastikan array kosong, bukan null
	}
	return rows, nil
}

func (r *AddressRepository) GetAddress(userID, addressID string) (*Address, error) {
	var addr Address
	err := r.db.Where("user_id = ? AND id = ?", userID, addressID).First(&addr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &addr, nil
}

func (r *AddressRepository) CountAddresses(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&Address{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *AddressRepository) CreateAddress(addr *Address) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if addr.IsDefault {
			if err := tx.Model(&Address{}).Where("user_id = ?", addr.UserID).Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(addr).Error
	})
}

func (r *AddressRepository) UpdateAddress(addr *Address) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if addr.IsDefault {
			if err := tx.Model(&Address{}).Where("user_id = ?", addr.UserID).Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Save(addr).Error
	})
}

func (r *AddressRepository) DeleteAddress(userID, addressID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var addr Address
		if err := tx.Where("user_id = ? AND id = ?", userID, addressID).First(&addr).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ? AND id = ?", userID, addressID).Delete(&Address{}).Error; err != nil {
			return err
		}

		if addr.IsDefault {
			var newest Address
			if err := tx.Where("user_id = ?", userID).Order("created_at DESC").First(&newest).Error; err == nil {
				tx.Model(&Address{}).Where("id = ?", newest.ID).Update("is_default", true)
			}
		}

		return nil
	})
}

func (r *AddressRepository) SetDefaultAddress(userID, addressID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var addr Address
		if err := tx.Where("user_id = ? AND id = ?", userID, addressID).First(&addr).Error; err != nil {
			return err
		}

		if err := tx.Model(&Address{}).Where("user_id = ?", userID).Update("is_default", false).Error; err != nil {
			return err
		}

		return tx.Model(&Address{}).Where("id = ?", addressID).Update("is_default", true).Error
	})
}
