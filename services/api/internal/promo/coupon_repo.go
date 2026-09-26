package promo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

type CouponRepository struct {
	db *gorm.DB
}

func NewCouponRepository(db *gorm.DB) *CouponRepository {
	return &CouponRepository{db: db}
}

func (r *CouponRepository) List(ctx context.Context, filter CouponFilter, page, limit int) ([]Coupon, int64, error) {
	var rows []Coupon
	var total int64

	query := r.db.WithContext(ctx).Table("coupons")

	if filter.Search != "" {
		query = query.Where("code ILIKE ?", "%"+filter.Search+"%")
	}

	if filter.Status != "" {
		now := time.Now()
		switch filter.Status {
		case "inactive":
			query = query.Where("is_active = ?", false)
		case "scheduled":
			query = query.Where("is_active = ? AND starts_at > ?", true, now)
		case "expired":
			query = query.Where("is_active = ? AND ends_at < ?", true, now)
		case "active":
			query = query.Where("is_active = ? AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?)", true, now, now)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Select("coupons.*, (SELECT count(*) FROM coupon_redemptions WHERE coupon_id = coupons.id) as total_redemptions").
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	for i := range rows {
		rows[i].Status = deriveCouponStatus(&rows[i])
	}

	return rows, total, nil
}

func (r *CouponRepository) GetByID(ctx context.Context, id string) (*Coupon, error) {
	var c Coupon
	if err := r.db.WithContext(ctx).Table("coupons").
		Select("coupons.*, (SELECT count(*) FROM coupon_redemptions WHERE coupon_id = coupons.id) as total_redemptions").
		Where("id = ?", id).
		First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	c.Status = deriveCouponStatus(&c)

	if c.AppliesTo == "products" {
		if err := r.db.WithContext(ctx).Table("coupon_products").Select("product_id").Where("coupon_id = ?", id).Pluck("product_id", &c.Products).Error; err != nil {
			return nil, err
		}
	} else if c.AppliesTo == "categories" {
		if err := r.db.WithContext(ctx).Table("coupon_categories").Select("category_id").Where("coupon_id = ?", id).Pluck("category_id", &c.Categories).Error; err != nil {
			return nil, err
		}
	}
	
	if c.Products == nil {
		c.Products = []string{}
	}
	if c.Categories == nil {
		c.Categories = []string{}
	}

	return &c, nil
}

func (r *CouponRepository) Create(ctx context.Context, req *CouponRequest, createdBy string) (*Coupon, error) {
	var id string
	descJSON, _ := json.Marshal(req.DescriptionI18n)

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := `
			INSERT INTO coupons (
				code, description_i18n, discount_type, amount, max_discount, min_subtotal,
				starts_at, ends_at, usage_limit, usage_limit_per_user, applies_to,
				exclude_sale_items, is_public, is_active, created_by
			) VALUES (
				?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
			) RETURNING id
		`
		
		if err := tx.Raw(query,
			req.Code, string(descJSON), req.DiscountType, req.Amount, req.MaxDiscount, req.MinSubtotal,
			req.StartsAt, req.EndsAt, req.UsageLimit, req.UsageLimitPerUser, req.AppliesTo,
			req.ExcludeSaleItems, req.IsPublic, req.IsActive, createdBy,
		).Scan(&id).Error; err != nil {
			return err
		}

		if req.AppliesTo == "products" {
			for _, pid := range req.Products {
				if err := tx.Exec("INSERT INTO coupon_products (coupon_id, product_id) VALUES (?, ?)", id, pid).Error; err != nil {
					return err
				}
			}
		} else if req.AppliesTo == "categories" {
			for _, cid := range req.Categories {
				if err := tx.Exec("INSERT INTO coupon_categories (coupon_id, category_id) VALUES (?, ?)", id, cid).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

func (r *CouponRepository) Update(ctx context.Context, id string, req *CouponRequest) (*Coupon, error) {
	descJSON, _ := json.Marshal(req.DescriptionI18n)

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := `
			UPDATE coupons SET
				code = ?, description_i18n = ?, discount_type = ?, amount = ?,
				max_discount = ?, min_subtotal = ?, starts_at = ?, ends_at = ?,
				usage_limit = ?, usage_limit_per_user = ?, applies_to = ?,
				exclude_sale_items = ?, is_public = ?, is_active = ?,
				updated_at = now()
			WHERE id = ?
		`
		
		res := tx.Exec(query,
			req.Code, string(descJSON), req.DiscountType, req.Amount, req.MaxDiscount, req.MinSubtotal,
			req.StartsAt, req.EndsAt, req.UsageLimit, req.UsageLimitPerUser, req.AppliesTo,
			req.ExcludeSaleItems, req.IsPublic, req.IsActive, id,
		)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("coupon not found")
		}

		if err := tx.Exec("DELETE FROM coupon_products WHERE coupon_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM coupon_categories WHERE coupon_id = ?", id).Error; err != nil {
			return err
		}

		if req.AppliesTo == "products" {
			for _, pid := range req.Products {
				if err := tx.Exec("INSERT INTO coupon_products (coupon_id, product_id) VALUES (?, ?)", id, pid).Error; err != nil {
					return err
				}
			}
		} else if req.AppliesTo == "categories" {
			for _, cid := range req.Categories {
				if err := tx.Exec("INSERT INTO coupon_categories (coupon_id, category_id) VALUES (?, ?)", id, cid).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

func (r *CouponRepository) Delete(ctx context.Context, id string) error {
	var count int64
	if err := r.db.WithContext(ctx).Table("coupon_redemptions").Where("coupon_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return errors.New("coupon_in_use")
	}

	res := r.db.WithContext(ctx).Exec("DELETE FROM coupons WHERE id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("not_found")
	}
	return nil
}

func (r *CouponRepository) ListRedemptions(ctx context.Context, couponID string, page, limit int) ([]CouponRedemption, int64, error) {
	var total int64
	if err := r.db.WithContext(ctx).Table("coupon_redemptions").Where("coupon_id = ?", couponID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []CouponRedemption
	if err := r.db.WithContext(ctx).Table("coupon_redemptions").
		Where("coupon_id = ?", couponID).
		Order("created_at DESC").
		Limit(limit).
		Offset((page - 1) * limit).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	if rows == nil {
		rows = []CouponRedemption{}
	}

	return rows, total, nil
}

func deriveCouponStatus(c *Coupon) string {
	if !c.IsActive {
		return "inactive"
	}
	now := time.Now()
	if c.StartsAt != nil && c.StartsAt.After(now) {
		return "scheduled"
	}
	if c.EndsAt != nil && c.EndsAt.Before(now) {
		return "expired"
	}
	return "active"
}
