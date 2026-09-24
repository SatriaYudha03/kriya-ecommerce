package aftersales

import (
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
