package customer

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type WishlistItem struct {
	UserID    string    `gorm:"column:user_id;primaryKey"`
	ProductID string    `gorm:"column:product_id;primaryKey"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (WishlistItem) TableName() string { return "wishlist_items" }

type WishlistRepository struct {
	db *gorm.DB
}

func NewWishlistRepository(db *gorm.DB) *WishlistRepository {
	return &WishlistRepository{db: db}
}

func (r *WishlistRepository) GetWishlist(userID string) ([]ProductListResponse, error) {
	var items []ProductListResponse

	// Join with products, categories, variants, and product_images
	err := r.db.Table("wishlist_items w").
		Select(`
			p.id, 
			p.slug, 
			p.name, 
			c.slug as category_slug, 
			COALESCE(MIN(v.price), 0) as price_min,
			COALESCE((SELECT storage_path FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1), '') as thumbnail_url
		`).
		Joins("JOIN products p ON w.product_id = p.id").
		Joins("JOIN categories c ON p.category_id = c.id").
		Joins("LEFT JOIN product_variants v ON p.id = v.product_id").
		Where("w.user_id = ?", userID).
		Group("p.id, p.slug, p.name, c.slug, w.created_at").
		Order("w.created_at DESC").
		Scan(&items).Error

	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []ProductListResponse{}
	}
	return items, nil
}

func (r *WishlistRepository) AddItem(userID, productID string) error {
	item := WishlistItem{
		UserID:    userID,
		ProductID: productID,
	}
	// ON CONFLICT DO NOTHING
	return r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&item).Error
}

func (r *WishlistRepository) RemoveItem(userID, productID string) error {
	return r.db.Where("user_id = ? AND product_id = ?", userID, productID).Delete(&WishlistItem{}).Error
}
