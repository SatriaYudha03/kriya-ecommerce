package catalog

import (
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

// ListAllOrders mengambil semua pesanan dari DB.

// UpdateOrderStatus memperbarui status pesanan secara admin, dan
// mengembalikan stok jika dibatalkan/expired.

// CreateProduct membuat produk beserta variant dan image di DB.
func (r *AdminRepository) CreateProduct(p *Product) error {
	return r.db.Create(p).Error
}

// UpdateProduct memperbarui kolom produk.
func (r *AdminRepository) UpdateProduct(id string, updates map[string]interface{}) error {
	return r.db.Model(&Product{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteProduct menghapus produk dari DB. Jika gagal karena terpakai (dipesan), set ke archived.
func (r *AdminRepository) DeleteProduct(id string) error {
	err := r.db.Where("id = ?", id).Delete(&Product{}).Error
	if err != nil {
		// Kalau gagal, asumsikan karena constraint di order_items, jadi arsipkan
		return r.db.Model(&Product{}).Where("id = ?", id).Update("status", "archived").Error
	}
	return nil
}

// CreateVariant membuat varian produk baru.
func (r *AdminRepository) CreateVariant(v *ProductVariant) error {
	return r.db.Create(v).Error
}

// UpdateVariant memperbarui kolom varian.
func (r *AdminRepository) UpdateVariant(id string, updates map[string]interface{}) error {
	return r.db.Model(&ProductVariant{}).Where("id = ?", id).Updates(updates).Error
}

func (r *AdminRepository) UpdateVariantWithLedger(id string, updates map[string]interface{}, newStock int, actorID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var oldVariant ProductVariant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(&oldVariant).Error; err != nil {
			return err
		}

		if err := tx.Model(&ProductVariant{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}

		if oldVariant.Stock != newStock {
			delta := newStock - oldVariant.Stock
			var actorPtr *string
			if actorID != "" {
				actorPtr = &actorID
			}
			movement := StockMovement{
				VariantID:  id,
				Delta:      delta,
				StockAfter: newStock,
				Reason:     "adjustment",
				ActorID:    actorPtr,
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// DeleteVariant menghapus varian dari DB.
func (r *AdminRepository) DeleteVariant(id string) error {
	var count int64
	// Cek product_id dari varian yang dihapus
	var v ProductVariant
	if err := r.db.Where("id = ?", id).First(&v).Error; err != nil {
		return err
	}

	// Hitung jumlah varian produk tersebut
	if err := r.db.Model(&ProductVariant{}).Where("product_id = ?", v.ProductID).Count(&count).Error; err != nil {
		return err
	}

	if count <= 1 {
		return errors.New("tidak dapat menghapus varian terakhir produk")
	}

	return r.db.Where("id = ?", id).Delete(&ProductVariant{}).Error
}

// Stats menghitung metrik ringkas untuk dashboard admin.
// revenue = total dari order yang sudah/menuju terpenuhi (bukan pending/cancel/expired).

// GetProductByID mengambil satu produk lengkap dengan varian & gambar (bentuk internal admin).
func (r *AdminRepository) GetProductByID(id string) (*Product, error) {
	var p Product
	err := r.db.Preload("Variants").Preload("Images").
		Preload("Tags").Preload("AttributeTerms").
		Preload("UpsellRelations", "relation_type = ?", "upsell").
		Preload("CrossSellRelations", "relation_type = ?", "cross_sell").
		Where("id = ?", id).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *AdminRepository) GetAdminProducts(q string, status string, page, limit int) ([]Product, int64, error) {
	var products []Product
	var total int64

	query := r.db.Model(&Product{}).Preload("Variants").Preload("Images", "is_primary = ?", true)

	if q != "" {
		query = query.Where("name ILIKE ? OR slug ILIKE ?", "%"+q+"%", "%"+q+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	offset := (page - 1) * limit
	query = query.Offset(offset).Limit(limit).Order("created_at DESC")

	err := query.Find(&products).Error
	return products, total, err
}

// CreateImage menambah baris gambar produk. Bila is_primary, gambar lain produk
// yang sama di-set non-primary dalam satu transaksi.
func (r *AdminRepository) CreateImage(img *ProductImage) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if img.IsPrimary {
			if err := tx.Model(&ProductImage{}).Where("product_id = ?", img.ProductID).
				Update("is_primary", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(img).Error
	})
}

// UpdateImage memperbarui alt & is_primary satu gambar. Bila jadi primary,
// gambar lain produk yang sama di-set non-primary dalam satu transaksi.
func (r *AdminRepository) UpdateImage(id, alt string, isPrimary bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var img ProductImage
		if err := tx.Where("id = ?", id).First(&img).Error; err != nil {
			return err
		}
		if isPrimary {
			if err := tx.Model(&ProductImage{}).Where("product_id = ?", img.ProductID).
				Update("is_primary", false).Error; err != nil {
				return err
			}
		}
		return tx.Model(&ProductImage{}).Where("id = ?", id).
			Updates(map[string]interface{}{"alt": alt, "is_primary": isPrimary}).Error
	})
}

// DeleteImage menghapus satu baris gambar produk.
func (r *AdminRepository) DeleteImage(id string) error {
	return r.db.Where("id = ?", id).Delete(&ProductImage{}).Error
}

func (r *AdminRepository) GetCategories() ([]Category, error) {
	var categories []Category
	err := r.db.Order("position ASC").Find(&categories).Error
	return categories, err
}

func (r *AdminRepository) GetCategory(id string) (*Category, error) {
	var category Category
	err := r.db.Where("id = ?", id).First(&category).Error
	return &category, err
}

func (r *AdminRepository) CreateCategory(c *Category) error {
	return r.db.Create(c).Error
}

func (r *AdminRepository) UpdateCategory(id string, updates map[string]interface{}) error {
	return r.db.Model(&Category{}).Where("id = ?", id).Updates(updates).Error
}

func (r *AdminRepository) DeleteCategory(id string) error {
	return r.db.Where("id = ?", id).Delete(&Category{}).Error
}
func (r *AdminRepository) UpdateProductTags(productID string, tagSlugs []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", productID).Delete(&ProductTag{}).Error; err != nil {
			return err
		}
		if len(tagSlugs) > 0 {
			var tagIDs []string
			if err := tx.Model(&Tag{}).Where("slug IN ?", tagSlugs).Pluck("id", &tagIDs).Error; err != nil {
				return err
			}
			for _, tid := range tagIDs {
				if err := tx.Create(&ProductTag{ProductID: productID, TagID: tid}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (r *AdminRepository) UpdateProductAttributeTerms(productID string, termIDs []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ?", productID).Delete(&ProductAttributeTerm{}).Error; err != nil {
			return err
		}
		for _, tid := range termIDs {
			if err := tx.Create(&ProductAttributeTerm{ProductID: productID, TermID: tid}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

type ProductRelation struct {
	ProductID        string
	RelatedProductID string
	RelationType     string
	Position         int
}

func (r *AdminRepository) UpdateProductRelations(productID string, relatedIDs []string, relType string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_id = ? AND relation_type = ?", productID, relType).Delete(&ProductRelation{}).Error; err != nil {
			return err
		}
		for i, rid := range relatedIDs {
			if err := tx.Create(&ProductRelation{
				ProductID: productID, RelatedProductID: rid, RelationType: relType, Position: i,
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
func (r *AdminRepository) ListTags() ([]Tag, error) {
	var list []Tag
	err := r.db.Order("slug ASC").Find(&list).Error
	return list, err
}

func (r *AdminRepository) CreateTag(tag *Tag) error {
	return r.db.Create(tag).Error
}

func (r *AdminRepository) UpdateTag(id string, updates map[string]interface{}) error {
	return r.db.Model(&Tag{}).Where("id = ?", id).Updates(updates).Error
}

func (r *AdminRepository) DeleteTag(id string) error {
	return r.db.Where("id = ?", id).Delete(&Tag{}).Error
}

func (r *AdminRepository) ListAttributes() ([]Attribute, error) {
	var list []Attribute
	err := r.db.Preload("Terms", func(db *gorm.DB) *gorm.DB {
		return db.Order("position ASC")
	}).Order("position ASC").Find(&list).Error
	return list, err
}

func (r *AdminRepository) CreateAttribute(attr *Attribute) error {
	return r.db.Create(attr).Error
}

func (r *AdminRepository) UpdateAttribute(id string, updates map[string]interface{}) error {
	return r.db.Model(&Attribute{}).Where("id = ?", id).Updates(updates).Error
}

func (r *AdminRepository) DeleteAttribute(id string) error {
	return r.db.Where("id = ?", id).Delete(&Attribute{}).Error
}

func (r *AdminRepository) CreateAttributeTerm(term *AttributeTerm) error {
	return r.db.Create(term).Error
}

func (r *AdminRepository) UpdateAttributeTerm(id string, updates map[string]interface{}) error {
	return r.db.Model(&AttributeTerm{}).Where("id = ?", id).Updates(updates).Error
}

func (r *AdminRepository) DeleteAttributeTerm(id string) error {
	return r.db.Where("id = ?", id).Delete(&AttributeTerm{}).Error
}

func (r *AdminRepository) GetInventory(q string, lowStock bool, page, limit int) ([]AdminInventoryItemResponse, int64, error) {
	var items []AdminInventoryItemResponse
	var total int64

	query := r.db.Table("product_variants pv").
		Select(`
			pv.id as variant_id,
			p.id as product_id,
			p.name as product_name,
			p.slug as product_slug,
			pv.sku,
			pv.color,
			pv.size,
			pv.stock,
			pv.stock <= COALESCE(pv.low_stock_threshold, 5) as low_stock
		`).
		Joins("JOIN products p ON p.id = pv.product_id")

	if q != "" {
		query = query.Where("p.name ILIKE ? OR pv.sku ILIKE ?", "%"+q+"%", "%"+q+"%")
	}
	if lowStock {
		query = query.Where("pv.stock <= COALESCE(pv.low_stock_threshold, 5)")
	}

	query.Count(&total)
	offset := (page - 1) * limit
	query = query.Order("p.name ASC, pv.sku ASC").Offset(offset).Limit(limit)
	err := query.Scan(&items).Error
	return items, total, err
}

func (r *AdminRepository) GetStockMovements(variantID string, page, limit int) ([]StockMovement, int64, error) {
	var movements []StockMovement
	var total int64

	query := r.db.Model(&StockMovement{})
	if variantID != "" {
		query = query.Where("variant_id = ?", variantID)
	}
	query.Count(&total)

	offset := (page - 1) * limit
	query = query.Order("created_at DESC").Offset(offset).Limit(limit)
	err := query.Find(&movements).Error
	return movements, total, err
}

func (r *AdminRepository) AdjustStock(variantID string, qty int, note string, actorID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var pv ProductVariant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", variantID).First(&pv).Error; err != nil {
			return err
		}

		delta := qty - pv.Stock
		if delta == 0 {
			return nil
		}

		if err := tx.Model(&ProductVariant{}).Where("id = ?", variantID).Update("stock", qty).Error; err != nil {
			return err
		}

		var notePtr *string
		if note != "" {
			notePtr = &note
		}
		var actorPtr *string
		if actorID != "" {
			actorPtr = &actorID
		}

		movement := StockMovement{
			VariantID:  variantID,
			Delta:      delta,
			StockAfter: qty,
			Reason:     "adjustment",
			ActorID:    actorPtr,
			Note:       notePtr,
		}
		return tx.Create(&movement).Error
	})
}
