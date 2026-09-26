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

type CartItem struct {
	CartID    string    `gorm:"column:cart_id;type:uuid;primaryKey"`
	VariantID string    `gorm:"column:variant_id;type:uuid;primaryKey"`
	Qty       int       `gorm:"column:qty"`
	AddedAt   time.Time `gorm:"column:added_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (CartItem) TableName() string { return "cart_items" }

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

func (r *CartRepository) getOrCreateCart(tx *gorm.DB, userID string) (*Cart, error) {
	var cart Cart
	err := tx.Where("user_id = ?", userID).First(&cart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			cart = Cart{UserID: userID, Items: []byte("[]")}
			if err := tx.Create(&cart).Error; err != nil {
				return nil, err
			}
			return &cart, nil
		}
		return nil, err
	}
	return &cart, nil
}

// GetCartItems mengembalikan daftar item di dalam cart_items untuk user terkait.
func (r *CartRepository) GetCartItems(userID string) ([]CartItem, error) {
	var cart Cart
	err := r.db.Where("user_id = ?", userID).First(&cart).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []CartItem{}, nil
		}
		return nil, err
	}

	var items []CartItem
	err = r.db.Where("cart_id = ?", cart.ID).Order("added_at ASC").Find(&items).Error
	return items, err
}

// ReplaceItems mengganti seluruh items cart milik user (sesuai kontrak PUT).
func (r *CartRepository) ReplaceItems(userID string, items []CartItemRequest) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		cart, err := r.getOrCreateCart(tx, userID)
		if err != nil {
			return err
		}

		if err := tx.Where("cart_id = ?", cart.ID).Delete(&CartItem{}).Error; err != nil {
			return err
		}

		if len(items) > 0 {
			cartItems := make([]CartItem, 0, len(items))
			for _, it := range items {
				cartItems = append(cartItems, CartItem{
					CartID:    cart.ID,
					VariantID: it.VariantID,
					Qty:       it.Qty,
				})
			}
			if err := tx.Create(&cartItems).Error; err != nil {
				return err
			}
		}

		return tx.Model(cart).Update("updated_at", time.Now()).Error
	})
}

// MergeItems melakukan upsert items ke cart (sesuai kontrak POST merge). Qty terbaru menang.
func (r *CartRepository) MergeItems(userID string, items []CartItemRequest) error {
	if len(items) == 0 {
		return nil
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		cart, err := r.getOrCreateCart(tx, userID)
		if err != nil {
			return err
		}

		cartItems := make([]CartItem, 0, len(items))
		for _, it := range items {
			cartItems = append(cartItems, CartItem{
				CartID:    cart.ID,
				VariantID: it.VariantID,
				Qty:       it.Qty,
			})
		}

		err = tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "cart_id"}, {Name: "variant_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"qty", "updated_at"}),
		}).Create(&cartItems).Error
		if err != nil {
			return err
		}

		return tx.Model(cart).Update("updated_at", time.Now()).Error
	})
}

// ClearItems mengosongkan cart (dipanggil setelah order berhasil dibuat).
func (r *CartRepository) ClearItems(userID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var cart Cart
		if err := tx.Where("user_id = ?", userID).First(&cart).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		return tx.Where("cart_id = ?", cart.ID).Delete(&CartItem{}).Error
	})
}

// GetVariantsByIDs mengambil harga, stok, dan info produk terbaru untuk sekumpulan variant_id.
// Ini satu-satunya sumber kebenaran harga - client tidak pernah dipercaya.
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
