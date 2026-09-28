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
	var total int64

	query := r.db.Model(&Product{}).
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
	countQuery := query.Session(&gorm.Session{})
	query = query.Session(&gorm.Session{})

	offset := (page - 1) * limit

	// Satu query: baris produk + total (window function, dihitung setelah GROUP BY)
	// + varian aktif & gambar utama sebagai json_agg. Dulu 4 query berurutan.
	query = query.Select("products.*, COUNT(*) OVER() AS total_count, " +
		selectActiveVariantsJSON + ", " + selectPrimaryImagesJSON).
		Offset(offset).Limit(limit)

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

	var rows []productAggRow
	if err := query.Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	if len(rows) > 0 {
		total = rows[0].TotalCount
	} else if offset > 0 {
		// Halaman di luar jangkauan: tidak ada baris untuk membawa total_count.
		if err := countQuery.Count(&total).Error; err != nil {
			return nil, 0, err
		}
	}
	products, err := rowsToProducts(rows)
	return products, total, err
}

func (r *CatalogRepository) GetProductBySlug(slug string) (*Product, error) {
	// Satu query: produk + kategori (& induk), varian aktif, semua gambar, tag,
	// dan term atribut (& atributnya). Dulu 1 query + 7 Preload berurutan.
	var row productAggRow
	res := r.db.Model(&Product{}).
		Select("products.*, " + selectCategoryJSON + ", " + selectActiveVariantsJSON + ", " +
			selectAllImagesJSON + ", " + selectTagsJSON + ", " + selectTermsJSON).
		Where("products.slug = ? AND products.status = ?", slug, "published").
		Limit(1).
		Scan(&row)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	product, err := row.toProduct()
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

// GetAttributesWithCounts mengembalikan atribut filterable beserta term-nya dan
// jumlah produk published per term (dibatasi pohon kategori bila categorySlug
// diisi). Satu query; dulu 3 query berurutan (atribut, Preload term, hitungan).
func (r *CatalogRepository) GetAttributesWithCounts(categorySlug string) ([]Attribute, map[string]int, error) {
	catFilter := ""
	if categorySlug != "" {
		catFilter = " AND p.category_slug IN (WITH RECURSIVE cat_tree AS (SELECT slug, id FROM categories WHERE slug = ? UNION ALL SELECT c.slug, c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id) SELECT slug FROM cat_tree)"
	}
	query := `WITH term_counts AS (
		SELECT pat.term_id, count(DISTINCT p.id) AS n
		FROM product_attribute_terms pat JOIN products p ON p.id = pat.product_id
		WHERE p.status = 'published'` + catFilter + `
		GROUP BY pat.term_id)
	SELECT a.id, a.slug, a.name_i18n,
		(SELECT COALESCE(json_agg(json_build_object('term', t, 'count', COALESCE(tc.n, 0)) ORDER BY t.position, t.slug), '[]')
		 FROM attribute_terms t LEFT JOIN term_counts tc ON tc.term_id = t.id
		 WHERE t.attribute_id = a.id) AS terms_json
	FROM attributes a
	WHERE a.is_filterable = true
	ORDER BY a.position, a.slug`

	var rows []attributeWithTermsRow
	var err error
	if categorySlug != "" {
		err = r.db.Raw(query, categorySlug).Scan(&rows).Error
	} else {
		err = r.db.Raw(query).Scan(&rows).Error
	}
	if err != nil {
		return nil, nil, err
	}

	attrs := make([]Attribute, 0, len(rows))
	counts := make(map[string]int)
	for _, row := range rows {
		var terms []termCountJSON
		if err := decodeAgg(row.TermsJSON, &terms, "attribute terms"); err != nil {
			return nil, nil, err
		}
		a := Attribute{ID: row.ID, Slug: row.Slug, NameI18n: row.NameI18n, IsFilterable: true}
		for _, t := range terms {
			a.Terms = append(a.Terms, AttributeTerm{
				ID:          t.Term.ID,
				AttributeID: t.Term.AttributeID,
				Slug:        t.Term.Slug,
				NameI18n:    rawBytes(t.Term.NameI18n),
				Position:    t.Term.Position,
			})
			if t.Count > 0 {
				counts[t.Term.ID] = t.Count
			}
		}
		attrs = append(attrs, a)
	}
	return attrs, counts, nil
}

func (r *CatalogRepository) GetRelatedProducts(slug string, relType string, limit int) ([]Product, error) {
	// Satu query: produk terkait + varian aktif & gambar utama (dulu 3 query).
	var rows []productAggRow
	err := r.db.Model(&Product{}).
		Select("products.*, "+selectActiveVariantsJSON+", "+selectPrimaryImagesJSON).
		Joins("JOIN product_relations ON products.id = product_relations.related_product_id").
		Joins("JOIN products p2 ON p2.id = product_relations.product_id").
		Where("p2.slug = ? AND product_relations.relation_type = ? AND products.status = ?", slug, relType, "published").
		Order("product_relations.position ASC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rowsToProducts(rows)
}
