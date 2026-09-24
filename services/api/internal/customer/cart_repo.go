package customer

import (
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Cart struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID       string `gorm:"column:user_id;type:uuid;uniqueIndex"`
	Items        []byte `gorm:"column:items;type:jsonb"`
	FollowedUpAt *time.Time
	UpdatedAt    time.Time
}

func (Cart) TableName() string { return "carts" }

// VariantWithProduct adalah hasil join product_variants + products + gambar utama,
// dipakai untuk membangun respons cart dan order (harga selalu dari sini, bukan dari client).
type VariantWithProduct struct {
	VariantID     string
	Price         int
	Stock         int
	Color         string
	ColorI18n     []byte `gorm:"column:color_i18n;type:jsonb"`
	Size          *string
	SizeI18n      []byte `gorm:"column:size_i18n;type:jsonb"`
	ProductID     string
	ProductSlug   string
	ProductName   string
	NameI18n      []byte `gorm:"column:name_i18n;type:jsonb"`
	ThumbnailPath string
}

type CartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{db: db}
}

// GetByUserID mengembalikan nil (tanpa error) bila cart belum ada.
func (r *CartRepository) GetByUserID(userID string) (*Cart, error) {
	var cart Cart
	err := r.db.Where("user_id = ?", userID).First(&cart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &cart, nil
}

// UpsertItems mengganti seluruh items cart milik user (upsert penuh sesuai kontrak PUT).
func (r *CartRepository) UpsertItems(userID string, itemsJSON []byte) error {
	cart := Cart{UserID: userID, Items: itemsJSON}
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"items", "updated_at"}),
	}).Create(&cart).Error
}

// ClearItems mengosongkan cart (dipanggil setelah order berhasil dibuat).
func (r *CartRepository) ClearItems(userID string) error {
	return r.db.Model(&Cart{}).Where("user_id = ?", userID).
		Update("items", []byte("[]")).Error
}

// GetVariantsByIDs mengambil harga, stok, dan info produk terbaru untuk sekumpulan variant_id.
// Ini satu-satunya sumber kebenaran harga — client tidak pernah dipercaya.
func (r *CartRepository) GetVariantsByIDs(ids []string) ([]VariantWithProduct, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []VariantWithProduct
	err := r.db.Table("product_variants AS pv").
		Select(`pv.id AS variant_id, pv.price, pv.stock, pv.color, pv.color_i18n, pv.size, pv.size_i18n,
			p.id AS product_id, p.slug AS product_slug, p.name AS product_name, p.name_i18n,
			(SELECT pi.storage_path FROM product_images pi
			 WHERE pi.product_id = p.id
			 ORDER BY pi.is_primary DESC, pi.created_at ASC LIMIT 1) AS thumbnail_path`).
		Joins("JOIN products p ON p.id = pv.product_id").
		Where("pv.id IN ?", ids).
		Scan(&rows).Error
	return rows, err
}
