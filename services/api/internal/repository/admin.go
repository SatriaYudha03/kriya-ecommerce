package repository

import (
	"errors"

	"gorm.io/gorm"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

// ListAllOrders mengambil semua pesanan dari DB.
func (r *AdminRepository) ListAllOrders(page, limit int, status string) ([]Order, int64, error) {
	var orders []Order
	var total int64

	query := r.db.Model(&Order{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&orders).Error
	return orders, total, err
}

// UpdateOrderStatus memperbarui status pesanan secara admin, dan
// mengembalikan stok jika dibatalkan/expired.
func (r *AdminRepository) UpdateOrderStatus(id string, status string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var order Order
		if err := tx.Where("id = ?", id).First(&order).Error; err != nil {
			return err
		}

		oldStatus := order.Status
		if (status == "cancelled" || status == "expired") && (oldStatus != "cancelled" && oldStatus != "expired") {
			var items []OrderItem
			if err := tx.Where("order_id = ?", id).Find(&items).Error; err != nil {
				return err
			}
			for _, it := range items {
				if err := tx.Table("product_variants").Where("id = ?", it.VariantID).
					Update("stock", gorm.Expr("stock + ?", it.Qty)).Error; err != nil {
					return err
				}
			}
		}

		return tx.Model(&Order{}).Where("id = ?", id).Update("status", status).Error
	})
}

// CreateProduct membuat produk beserta variant dan image di DB.
func (r *AdminRepository) CreateProduct(p *Product) error {
	return r.db.Create(p).Error
}

// UpdateProduct memperbarui kolom produk.
func (r *AdminRepository) UpdateProduct(id string, updates map[string]interface{}) error {
	return r.db.Model(&Product{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteProduct menghapus produk dari DB.
func (r *AdminRepository) DeleteProduct(id string) error {
	return r.db.Where("id = ?", id).Delete(&Product{}).Error
}

// CreateVariant membuat varian produk baru.
func (r *AdminRepository) CreateVariant(v *ProductVariant) error {
	return r.db.Create(v).Error
}

// UpdateVariant memperbarui kolom varian.
func (r *AdminRepository) UpdateVariant(id string, updates map[string]interface{}) error {
	return r.db.Model(&ProductVariant{}).Where("id = ?", id).Updates(updates).Error
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
func (r *AdminRepository) Stats() (totalOrders, revenue, activeProducts int64, err error) {
	if err = r.db.Model(&Order{}).Count(&totalOrders).Error; err != nil {
		return
	}
	if err = r.db.Model(&Order{}).
		Where("status IN ?", []string{"paid", "processing", "shipped", "completed"}).
		Select("COALESCE(SUM(total), 0)").Scan(&revenue).Error; err != nil {
		return
	}
	if err = r.db.Model(&Product{}).Count(&activeProducts).Error; err != nil {
		return
	}
	return
}

// GetProductByID mengambil satu produk lengkap dengan varian & gambar (bentuk internal admin).
func (r *AdminRepository) GetProductByID(id string) (*Product, error) {
	var p Product
	err := r.db.Preload("Variants").Preload("Images").Where("id = ?", id).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
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

// DeleteImage menghapus satu baris gambar produk.
func (r *AdminRepository) DeleteImage(id string) error {
	return r.db.Where("id = ?", id).Delete(&ProductImage{}).Error
}
