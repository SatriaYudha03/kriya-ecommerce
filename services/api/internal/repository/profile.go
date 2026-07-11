package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Profile memetakan tabel profiles. Data diri + alamat default dipakai untuk
// prefill checkout supaya user tidak mengetik ulang alamat (migrasi 005).
// Kolom nullable dipetakan ke *string agar bisa dibedakan dari string kosong.
type Profile struct {
	ID          string  `gorm:"type:uuid;primaryKey"`
	Role        string  `gorm:"column:role"`
	FullName    *string `gorm:"column:full_name"`
	Phone       *string `gorm:"column:phone"`
	AddressLine *string `gorm:"column:address_line"`
	City        *string `gorm:"column:city"`
	Province    *string `gorm:"column:province"`
	PostalCode  *string `gorm:"column:postal_code"`
	UpdatedAt   time.Time
}

func (Profile) TableName() string { return "profiles" }

// ProfileFields adalah nilai data diri + alamat yang di-set lewat PUT /profile.
type ProfileFields struct {
	FullName    string
	Phone       string
	AddressLine string
	City        string
	Province    string
	PostalCode  string
}

type ProfileRepository struct {
	db *gorm.DB
}

func NewProfileRepository(db *gorm.DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

// GetByUserID mengembalikan profil. Baris profil selalu dibuat oleh trigger saat
// signup; bila (secara defensif) tidak ada, kembalikan profil kosong tanpa error
// agar GET tetap mengembalikan bentuk kontrak yang sama.
func (r *ProfileRepository) GetByUserID(userID string) (*Profile, error) {
	var p Profile
	err := r.db.Where("id = ?", userID).First(&p).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &Profile{ID: userID}, nil
		}
		return nil, err
	}
	return &p, nil
}

// Update menimpa seluruh kolom data diri + alamat (replace penuh, seperti PUT cart).
// Memakai map agar nilai kosong ("") tetap tersimpan (Updates dengan struct
// melewatkan zero value). Kolom role & id tidak pernah disentuh di sini.
func (r *ProfileRepository) Update(userID string, f ProfileFields) error {
	return r.db.Model(&Profile{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"full_name":    f.FullName,
		"phone":        f.Phone,
		"address_line": f.AddressLine,
		"city":         f.City,
		"province":     f.Province,
		"postal_code":  f.PostalCode,
		"updated_at":   time.Now(),
	}).Error
}
