package aftersales

import "time"

// Database Models

type ReturnRequest struct {
	ID          string              `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID     string              `gorm:"column:order_id;type:uuid"`
	UserID      string              `gorm:"column:user_id;type:uuid"`
	Status      string              `gorm:"column:status;default:'requested'"`
	ReasonCode  string              `gorm:"column:reason_code"`
	Description *string             `gorm:"column:description"`
	AdminNote   *string             `gorm:"column:admin_note"`
	CreatedAt   time.Time           `gorm:"column:created_at"`
	UpdatedAt   time.Time           `gorm:"column:updated_at"`
	ResolvedAt  *time.Time          `gorm:"column:resolved_at"`
	Items       []ReturnRequestItem `gorm:"foreignKey:ReturnID"`
	
	// Optional joined relation
	OrderNumber *string `gorm:"->;column:order_number"`
}

func (ReturnRequest) TableName() string { return "return_requests" }

type ReturnRequestItem struct {
	ReturnID    string  `gorm:"column:return_id;type:uuid;primaryKey"`
	OrderItemID string  `gorm:"column:order_item_id;type:uuid;primaryKey"`
	Qty         int     `gorm:"column:qty"`
	
	// Join fields
	ProductName *string `gorm:"->;column:product_name"`
	ProductSlug *string `gorm:"->;column:product_slug"`
	ThumbnailURL *string `gorm:"->;column:thumbnail_url"`
}

func (ReturnRequestItem) TableName() string { return "return_request_items" }

type Refund struct {
	ID             string       `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	OrderID        string       `gorm:"column:order_id;type:uuid"`
	ReturnID       *string      `gorm:"column:return_id;type:uuid"`
	Amount         int          `gorm:"column:amount"`
	ShippingAmount int          `gorm:"column:shipping_amount"`
	Reason         *string      `gorm:"column:reason"`
	Restock        bool         `gorm:"column:restock"`
	Method         string       `gorm:"column:method;default:'manual'"`
	CreatedBy      *string      `gorm:"column:created_by;type:uuid"`
	CreatedAt      time.Time    `gorm:"column:created_at"`
	Items          []RefundItem `gorm:"foreignKey:RefundID"`
}

func (Refund) TableName() string { return "refunds" }

type RefundItem struct {
	RefundID    string `gorm:"column:refund_id;type:uuid;primaryKey"`
	OrderItemID string `gorm:"column:order_item_id;type:uuid;primaryKey"`
	Qty         int    `gorm:"column:qty"`
	Amount      int    `gorm:"column:amount"`
}

func (RefundItem) TableName() string { return "refund_items" }

// API Models

type CreateReturnRequestItem struct {
	OrderItemID string `json:"order_item_id" binding:"required"`
	Qty         int    `json:"qty" binding:"required,gt=0"`
}

type CreateReturnRequest struct {
	ReasonCode  string                    `json:"reason_code" binding:"required"`
	Description *string                   `json:"description"`
	Items       []CreateReturnRequestItem `json:"items" binding:"required,min=1"`
}

type ReturnRequestItemResponse struct {
	OrderItemID  string `json:"order_item_id"`
	ProductName  string `json:"product_name"`
	ProductSlug  string `json:"product_slug"`
	ThumbnailURL string `json:"thumbnail_url"`
	Qty          int    `json:"qty"`
}

type ReturnRequestResponse struct {
	ID          string                      `json:"id"`
	OrderID     string                      `json:"order_id"`
	OrderNumber *string                     `json:"order_number,omitempty"`
	Status      string                      `json:"status"`
	ReasonCode  string                      `json:"reason_code"`
	Description *string                     `json:"description"`
	AdminNote   *string                     `json:"admin_note"`
	CreatedAt   time.Time                   `json:"created_at"`
	ResolvedAt  *time.Time                  `json:"resolved_at,omitempty"`
	Items       []ReturnRequestItemResponse `json:"items"`
}

type AdminUpdateReturnStatusRequest struct {
	Status    string  `json:"status" binding:"required"`
	AdminNote *string `json:"admin_note"`
}

type CreateRefundRequestItem struct {
	OrderItemID string `json:"order_item_id" binding:"required"`
	Qty         int    `json:"qty" binding:"required,gt=0"`
}

type CreateRefundRequest struct {
	Items    []CreateRefundRequestItem `json:"items" binding:"required,min=1"`
	Restock  bool                      `json:"restock"`
	ReturnID *string                   `json:"return_id"`
	Reason   *string                   `json:"reason"`
	Note     *string                   `json:"note"`
}

type RefundItemResponse struct {
	OrderItemID string `json:"order_item_id"`
	Qty         int    `json:"qty"`
	Amount      int    `json:"amount"`
}

type RefundResponse struct {
	ID             string               `json:"id"`
	OrderID        string               `json:"order_id"`
	Amount         int                  `json:"amount"`
	ShippingAmount int                  `json:"shipping_amount"`
	Restock        bool                 `json:"restock"`
	CreatedAt      time.Time            `json:"created_at"`
	Items          []RefundItemResponse `json:"items"`
}

type StatusOKResponse struct {
	Status string `json:"status"`
}

type returnStatusUpdate struct {
	Status     string     `gorm:"column:status"`
	AdminNote  *string    `gorm:"column:admin_note"`
	UpdatedAt  time.Time  `gorm:"column:updated_at"`
	ResolvedAt *time.Time `gorm:"column:resolved_at"`
}

type returnRefundedUpdate struct {
	Status     string     `gorm:"column:status"`
	ResolvedAt *time.Time `gorm:"column:resolved_at"`
	UpdatedAt  time.Time  `gorm:"column:updated_at"`
}
