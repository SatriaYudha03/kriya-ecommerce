package aftersales

import (
	"context"

	"gorm.io/gorm"
)

type ReviewRepository struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

func (r *ReviewRepository) GetReviewsByProductSlug(ctx context.Context, slug string, status string, page, limit int) ([]ProductReview, int64, error) {
	var reviews []ProductReview
	var total int64

	query := r.db.WithContext(ctx).Model(&ProductReview{}).
		Select("product_reviews.*, prof.full_name as user_name").
		Joins("JOIN products p ON p.id = product_reviews.product_id").
		Joins("JOIN profiles prof ON prof.id = product_reviews.user_id").
		Where("p.slug = ?", slug)

	if status != "" {
		query = query.Where("product_reviews.status = ?", status)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.Order("product_reviews.created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&reviews).Error

	return reviews, total, err
}

func (r *ReviewRepository) GetReviewSummary(ctx context.Context, slug string) (float64, int, map[string]int, error) {
	var result struct {
		Avg float64
		Cnt int
	}

	err := r.db.WithContext(ctx).Table("products").
		Select("rating_avg as avg, rating_count as cnt").
		Where("slug = ?", slug).
		Scan(&result).Error
	if err != nil {
		return 0, 0, nil, err
	}

	type ratingCount struct {
		Rating int
		Count  int
	}
	var counts []ratingCount
	err = r.db.WithContext(ctx).Table("product_reviews").
		Select("rating, count(*) as count").
		Joins("JOIN products p ON p.id = product_reviews.product_id").
		Where("p.slug = ? AND product_reviews.status = 'approved'", slug).
		Group("rating").
		Scan(&counts).Error

	if err != nil {
		return 0, 0, nil, err
	}

	ratingMap := map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
	for _, c := range counts {
		if c.Rating >= 1 && c.Rating <= 5 {
			// Convert int rating to string key
			key := string(rune('0' + c.Rating))
			ratingMap[key] = c.Count
		}
	}

	return result.Avg, result.Cnt, ratingMap, nil
}

func (r *ReviewRepository) GetReviewsByUser(ctx context.Context, userID string, page, limit int) ([]ProductReview, int64, error) {
	var reviews []ProductReview
	var total int64

	query := r.db.WithContext(ctx).Model(&ProductReview{}).
		Select("product_reviews.*, p.name as product_name, p.slug as product_slug, pv.color as variant_name").
		Joins("JOIN products p ON p.id = product_reviews.product_id").
		Joins("JOIN order_items oi ON oi.id = product_reviews.order_item_id").
		Joins("JOIN product_variants pv ON pv.id = oi.variant_id").
		Where("product_reviews.user_id = ?", userID)

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.Order("product_reviews.created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&reviews).Error

	return reviews, total, err
}

func (r *ReviewRepository) GetReviewablesByUser(ctx context.Context, userID string, page, limit int) ([]OrderItem, int64, error) {
	var items []OrderItem
	var total int64

	query := r.db.WithContext(ctx).Model(&OrderItem{}).
		Select("order_items.*, p.slug as product_slug, img.storage_path as thumbnail_url, pr.id as review_id").
		Joins("JOIN orders o ON o.id = order_items.order_id").
		Joins("JOIN products p ON p.id = order_items.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Joins("LEFT JOIN product_reviews pr ON pr.order_item_id = order_items.id").
		Where("o.user_id = ? AND o.status = 'completed'", userID).
		Where("pr.id IS NULL")

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.Order("o.created_at DESC, order_items.id ASC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error

	return items, total, err
}

func (r *ReviewRepository) CreateReview(ctx context.Context, review *ProductReview) error {
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *ReviewRepository) UpdateReview(ctx context.Context, review *ProductReview) error {
	return r.db.WithContext(ctx).Save(review).Error
}

func (r *ReviewRepository) GetReviewByIDAndUser(ctx context.Context, id, userID string) (*ProductReview, error) {
	var review ProductReview
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&review).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *ReviewRepository) GetReviewByID(ctx context.Context, id string) (*ProductReview, error) {
	var review ProductReview
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&review).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

func (r *ReviewRepository) GetAdminReviews(ctx context.Context, status string, page, limit int) ([]ProductReview, int64, error) {
	var reviews []ProductReview
	var total int64

	query := r.db.WithContext(ctx).Model(&ProductReview{}).
		Select("product_reviews.*, prof.full_name as user_name, p.name as product_name, p.slug as product_slug").
		Joins("LEFT JOIN products p ON p.id = product_reviews.product_id").
		Joins("JOIN profiles prof ON prof.id = product_reviews.user_id")

	if status != "" {
		query = query.Where("product_reviews.status = ?", status)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.Order("product_reviews.created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&reviews).Error

	return reviews, total, err
}

func (r *ReviewRepository) GetOrderItemByIDAndUser(ctx context.Context, orderItemID, userID string) (*OrderItem, error) {
	var item OrderItem
	err := r.db.WithContext(ctx).
		Select("order_items.*").
		Joins("JOIN orders o ON o.id = order_items.order_id").
		Where("order_items.id = ? AND o.user_id = ? AND o.status = 'completed'", orderItemID, userID).
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}
