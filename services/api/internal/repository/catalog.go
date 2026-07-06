package repository

import (
	"gorm.io/gorm"
)

type CatalogRepository struct {
	db *gorm.DB
}

func NewCatalogRepository(db *gorm.DB) *CatalogRepository {
	return &CatalogRepository{db: db}
}

// Reuse models from seed/main.go for db structures
type Category struct {
	ID   string
	Slug string
	Name string
}

type Product struct {
	ID               string
	Slug             string
	Name             string
	CategorySlug     string
	Description      string
	Materials        []byte
	Dimensions       []byte
	WeightKg         float64
	HasAssemblyGuide bool
	Category         Category       `gorm:"foreignKey:CategorySlug;references:Slug"`
	Variants         []ProductVariant `gorm:"foreignKey:ProductID"`
	Images           []ProductImage   `gorm:"foreignKey:ProductID"`
}

type ProductVariant struct {
	ID        string
	ProductID string
	Sku       string
	Color     string
	Size      *string
	Price     int
	Stock     int
}

type ProductImage struct {
	ID          string
	ProductID   string
	StoragePath string
	Alt         string
	IsPrimary   bool
}

func (r *CatalogRepository) GetCategories() ([]Category, error) {
	var categories []Category
	err := r.db.Find(&categories).Error
	return categories, err
}

func (r *CatalogRepository) GetProducts(categorySlug, q, sort string, minPrice, maxPrice int, page, limit int) ([]Product, int64, error) {
	var products []Product
	var total int64

	query := r.db.Model(&Product{}).Preload("Variants").Preload("Images", "is_primary = ?", true)

	if categorySlug != "" {
		query = query.Where("category_slug = ?", categorySlug)
	}
	if q != "" {
		query = query.Where("name ILIKE ?", "%"+q+"%")
	}

	// Filter by price (requires joining variants)
	if minPrice > 0 || maxPrice > 0 {
		query = query.Joins("JOIN product_variants ON product_variants.product_id = products.id")
		if minPrice > 0 {
			query = query.Where("product_variants.price >= ?", minPrice)
		}
		if maxPrice > 0 {
			query = query.Where("product_variants.price <= ?", maxPrice)
		}
		query = query.Group("products.id") // Avoid duplicates if multiple variants match
	}

	query.Count(&total)

	offset := (page - 1) * limit
	query = query.Offset(offset).Limit(limit)

	// Sorting
	switch sort {
	case "price_asc":
		// Simplified sort, ideally needs subquery for min price
		query = query.Order("(SELECT MIN(price) FROM product_variants WHERE product_id = products.id) ASC")
	case "price_desc":
		query = query.Order("(SELECT MAX(price) FROM product_variants WHERE product_id = products.id) DESC")
	default:
		query = query.Order("products.created_at DESC")
	}

	err := query.Find(&products).Error
	return products, total, err
}

func (r *CatalogRepository) GetProductBySlug(slug string) (*Product, error) {
	var product Product
	err := r.db.Preload("Category").Preload("Variants").Preload("Images").Where("slug = ?", slug).First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}
