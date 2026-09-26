package catalog

import (
	"strings"
	"time"

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
	ID              string
	Slug            string
	Name            string
	NameI18n        []byte `gorm:"type:jsonb"`
	ParentID        *string
	Parent          *Category `gorm:"foreignKey:ParentID"`
	DescriptionI18n []byte `gorm:"type:jsonb"`
	ImagePath       *string
	Position        int
	IsActive        bool
}

type Product struct {
	ID                   string
	Slug                 string
	Name                 string
	NameI18n             []byte `gorm:"type:jsonb"`
	CategorySlug         string
	Description          string
	DescriptionI18n      []byte `gorm:"type:jsonb"`
	Materials            []byte
	MaterialsI18n        []byte `gorm:"type:jsonb"`
	Dimensions           []byte
	WeightKg             float64
	HasAssemblyGuide     bool
	Status               string
	ShortDescriptionI18n []byte `gorm:"type:jsonb"`
	IsFeatured           bool
	MetaTitleI18n        []byte `gorm:"type:jsonb"`
	MetaDescriptionI18n  []byte `gorm:"type:jsonb"`
	Category             Category         `gorm:"foreignKey:CategorySlug;references:Slug"`
	Variants             []ProductVariant `gorm:"foreignKey:ProductID"`
	Images               []ProductImage   `gorm:"foreignKey:ProductID"`
	Tags                 []Tag            `gorm:"many2many:product_tags;"`
	AttributeTerms       []AttributeTerm  `gorm:"many2many:product_attribute_terms;joinForeignKey:ProductID;joinReferences:TermID"`
	UpsellRelations      []ProductRelation `gorm:"foreignKey:ProductID;references:ID"` // we will filter by type later
	CrossSellRelations   []ProductRelation `gorm:"foreignKey:ProductID;references:ID"` // or we can use Preload with condition
	RatingAvg            float64
	RatingCount          int
	TotalSales           int
}

type ProductVariant struct {
	ID           string
	ProductID    string
	Sku          string
	Color        string
	ColorI18n    []byte `gorm:"type:jsonb"`
	Size         *string
	SizeI18n     []byte `gorm:"type:jsonb"`
	Price        int
	SalePrice    *int
	SaleStartsAt *time.Time
	SaleEndsAt   *time.Time
	Stock        int
	IsActive     bool
}

type ProductImage struct {
	ID          string
	ProductID   string
	StoragePath string
	Alt         string
	AltI18n     []byte `gorm:"type:jsonb"`
	IsPrimary   bool
}

func (r *CatalogRepository) GetCategories() ([]Category, error) {
	var categories []Category
	err := r.db.Where("is_active = ?", true).Order("position ASC").Find(&categories).Error
	return categories, err
}

func (r *CatalogRepository) GetProducts(categorySlug, q, tags, attrs, sort string, minPrice, maxPrice int, onSale, inStock, featured bool, page, limit int) ([]Product, int64, error) {
	var products []Product
	var total int64

	query := r.db.Model(&Product{}).
		Preload("Variants", "is_active = ?", true).
		Preload("Images", "is_primary = ?", true).
		Where("products.status = ?", "published")

	if categorySlug != "" {
		query = query.Where("category_slug IN (WITH RECURSIVE cat_tree AS (SELECT slug, id FROM categories WHERE slug = ? UNION ALL SELECT c.slug, c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id) SELECT slug FROM cat_tree)", categorySlug)
	}
	if q != "" {
		query = query.Where("name ILIKE ?", "%"+q+"%")
	}
	if featured {
		query = query.Where("is_featured = ?", true)
	}
	if tags != "" {
		// tags string e.g. "meja,jati" -> split by comma in DB or code. Let's do it simple: string_to_array(?, ',')
		query = query.Where("EXISTS (SELECT 1 FROM product_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.product_id = products.id AND t.slug = ANY(string_to_array(?, ',')))", tags)
	}
	if attrs != "" {
		// attrs format: "attr1.term1,attr1.term2,attr2.term3"
		// Group by attr. For each attr group, must exist a term in product_attribute_terms
		// I will parse this in Go
		query = applyAttrsFilter(query, attrs)
	}

	// Filter by price or on_sale (requires joining variants)
	if minPrice > 0 || maxPrice > 0 || onSale || inStock {
		query = query.Joins("JOIN product_variants ON product_variants.product_id = products.id")
		query = query.Where("product_variants.is_active = ?", true)
		
		effPriceExpr := "kriya_effective_price(product_variants.price, product_variants.sale_price, product_variants.sale_starts_at, product_variants.sale_ends_at)"
		
		if onSale {
			query = query.Where(effPriceExpr + " < product_variants.price")
		}
		if minPrice > 0 {
			query = query.Where(effPriceExpr + " >= ?", minPrice)
		}
		if maxPrice > 0 {
			query = query.Where(effPriceExpr + " <= ?", maxPrice)
		}
		if inStock {
			// To check in_stock at product level, we can group by product_id and check SUM(stock) > 0.
			// However, since we join variants, we can just filter variants with stock > 0.
			// But wait! If we do `product_variants.stock > 0`, it means "has at least one variant in stock".
			// Which is correct for "in_stock" product filtering.
			query = query.Where("product_variants.stock > 0")
		}
		query = query.Group("products.id") // Avoid duplicates if multiple variants match
	}

	query.Count(&total)

	offset := (page - 1) * limit
	query = query.Offset(offset).Limit(limit)

	// Sorting
	switch sort {
	case "price_asc":
		query = query.Order("(SELECT MIN(kriya_effective_price(price, sale_price, sale_starts_at, sale_ends_at)) FROM product_variants WHERE product_id = products.id) ASC")
	case "price_desc":
		query = query.Order("(SELECT MAX(kriya_effective_price(price, sale_price, sale_starts_at, sale_ends_at)) FROM product_variants WHERE product_id = products.id) DESC")
	case "best_selling":
		query = query.Order("products.total_sales DESC, products.created_at DESC")
	case "rating":
		query = query.Order("products.rating_avg DESC, products.rating_count DESC, products.created_at DESC")
	default:
		query = query.Order("products.created_at DESC")
	}

	err := query.Find(&products).Error
	return products, total, err
}

func (r *CatalogRepository) GetProductBySlug(slug string) (*Product, error) {
	var product Product
	err := r.db.Preload("Category.Parent").
		Preload("Variants", "is_active = ?", true).
		Preload("Images").
		Preload("Tags").
		Preload("AttributeTerms").
		Preload("AttributeTerms.Attribute").
		Where("slug = ? AND status = ?", slug, "published").
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}
type Tag struct {
	ID        string
	Slug      string
	NameI18n  []byte `gorm:"type:jsonb"`
	CreatedAt time.Time
}

type Attribute struct {
	ID           string
	Slug         string
	NameI18n     []byte `gorm:"type:jsonb"`
	IsFilterable bool
	Position     int
	CreatedAt    time.Time
	Terms        []AttributeTerm `gorm:"foreignKey:AttributeID"`
}

type AttributeTerm struct {
	ID          string
	AttributeID string
	Slug        string
	NameI18n    []byte `gorm:"type:jsonb"`
	Position    int
	Attribute   Attribute `gorm:"foreignKey:AttributeID"`
}

type ProductTag struct {
	ProductID string
	TagID     string
}

type ProductAttributeTerm struct {
	ProductID string
	TermID    string
}

func applyAttrsFilter(query *gorm.DB, attrs string) *gorm.DB {
	// attrs format: "material.jati,material.mahoni,style.minimalis"
	parts := strings.Split(attrs, ",")
	attrMap := make(map[string][]string)
	for _, p := range parts {
		kv := strings.SplitN(p, ".", 2)
		if len(kv) == 2 {
			attrMap[kv[0]] = append(attrMap[kv[0]], kv[1])
		}
	}
	
	for attrSlug, terms := range attrMap {
		query = query.Where("EXISTS (SELECT 1 FROM product_attribute_terms pat JOIN attribute_terms at ON pat.term_id = at.id JOIN attributes a ON at.attribute_id = a.id WHERE pat.product_id = products.id AND a.slug = ? AND at.slug IN ?)", attrSlug, terms)
	}
	return query
}
func (r *CatalogRepository) GetTags() ([]Tag, error) {
	var tags []Tag
	err := r.db.Order("slug ASC").Find(&tags).Error
	return tags, err
}

func (r *CatalogRepository) GetAttributes(categorySlug string) ([]Attribute, error) {
	var attrs []Attribute
	query := r.db.Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("position ASC")
	}).Where("is_filterable = ?", true)

	// In a real scenario we could filter terms by product_count > 0 in this category.
	// For now let's just get them and we'll calculate counts if needed, 
	// or we can do a more complex query.
	err := query.Order("position ASC").Find(&attrs).Error
	
	// Wait, we need product_count per term in the category. 
	// To do this properly without N+1, we might need a custom query or post-processing.
	return attrs, err
}

func (r *CatalogRepository) GetProductCountsForTerms(categorySlug string) (map[string]int, error) {
	counts := make(map[string]int)
	query := r.db.Table("product_attribute_terms").
		Select("term_id, count(DISTINCT products.id) as count").
		Joins("JOIN products ON products.id = product_attribute_terms.product_id").
		Where("products.status = ?", "published")
	
	if categorySlug != "" {
		query = query.Where("products.category_slug IN (WITH RECURSIVE cat_tree AS (SELECT slug, id FROM categories WHERE slug = ? UNION ALL SELECT c.slug, c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id) SELECT slug FROM cat_tree)", categorySlug)
	}

	rows, err := query.Group("term_id").Rows()
	if err != nil {
		return counts, err
	}
	defer rows.Close()

	for rows.Next() {
		var termID string
		var count int
		if err := rows.Scan(&termID, &count); err == nil {
			counts[termID] = count
		}
	}
	return counts, nil
}
