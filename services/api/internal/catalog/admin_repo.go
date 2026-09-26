package catalog

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
