package promo

import (
	"gorm.io/gorm"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Stats() (int64, int64, int64, error) {
	var totalOrders int64
	var revenue int64
	var activeProducts int64

	if err := r.db.Table("orders").Count(&totalOrders).Error; err != nil {
		return 0, 0, 0, err
	}

	if err := r.db.Table("orders").
		Where("status IN ?", []string{"paid", "processing", "shipped", "completed"}).
		Select("COALESCE(SUM(total), 0)").Scan(&revenue).Error; err != nil {
		return 0, 0, 0, err
	}

	if err := r.db.Table("products").Count(&activeProducts).Error; err != nil {
		return 0, 0, 0, err
	}

	return totalOrders, revenue, activeProducts, nil
}
