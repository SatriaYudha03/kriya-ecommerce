package aftersales

import "time"

type ProductReview struct {
	ID          string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProductID   string     `gorm:"column:product_id;type:uuid;not null"`
	UserID      string     `gorm:"column:user_id;type:uuid;not null"`
	OrderItemID string     `gorm:"column:order_item_id;type:uuid;not null;unique"`
	Rating      int        `gorm:"column:rating;not null"`
	Title       *string    `gorm:"column:title"`
	Body        *string    `gorm:"column:body"`
	Status      string     `gorm:"column:status;not null;default:'pending'"`
	AdminReply  *string    `gorm:"column:admin_reply"`
	RepliedAt   *time.Time `gorm:"column:replied_at"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null;default:now()"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;not null;default:now()"`

	// Joins
	UserName    *string `gorm:"->;column:user_name"`
	ProductName *string `gorm:"->;column:product_name"`
	ProductSlug *string `gorm:"->;column:product_slug"`
	VariantName *string `gorm:"->;column:variant_name"`
}

func (ProductReview) TableName() string { return "product_reviews" }

// API Responses

type ReviewResponse struct {
	ID          string     `json:"id"`
	ProductID   string     `json:"product_id"`
	UserID      string     `json:"user_id"`
	OrderItemID string     `json:"order_item_id"`
	Rating      int        `json:"rating"`
	Title       *string    `json:"title"`
	Body        *string    `json:"body"`
	Status      string     `json:"status"`
	AdminReply  *string    `json:"admin_reply"`
	RepliedAt   *time.Time `json:"replied_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Joined details
	UserName    *string `json:"user_name,omitempty"`
	ProductName *string `json:"product_name,omitempty"`
	ProductSlug *string `json:"product_slug,omitempty"`
	VariantName *string `json:"variant_name,omitempty"`
}

type ReviewSummaryResponse struct {
	AverageRating float64        `json:"average_rating"`
	TotalReviews  int            `json:"total_reviews"`
	RatingCounts  map[string]int `json:"rating_counts"`
}

// API Requests

type CreateReviewRequest struct {
	OrderItemID string  `json:"order_item_id" binding:"required,uuid"`
	Rating      int     `json:"rating" binding:"required,min=1,max=5"`
	Title       *string `json:"title" binding:"omitempty,max=120"`
	Body        *string `json:"body" binding:"omitempty,max=2000"`
}

type UpdateReviewRequest struct {
	Rating int     `json:"rating" binding:"required,min=1,max=5"`
	Title  *string `json:"title" binding:"omitempty,max=120"`
	Body   *string `json:"body" binding:"omitempty,max=2000"`
}

type AdminUpdateReviewRequest struct {
	Status     string  `json:"status" binding:"omitempty,oneof=pending approved rejected"`
	AdminReply *string `json:"admin_reply" binding:"omitempty,max=2000"`
}
