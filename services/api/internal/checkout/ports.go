package checkout

import (
	"context"
	"gorm.io/gorm"
)

type ActorType string

const (
	ActorCustomer       ActorType = "customer"
	ActorAdmin          ActorType = "admin"
	ActorSystem         ActorType = "system"
	ActorPaymentGateway ActorType = "payment_gateway"
)

type LineInput struct {
	VariantID string
	Qty       int
}

type PricedLine struct {
	VariantID, ProductID, CategoryID, ProductSlug, SKU string
	Name, Color                                        string
	Size                                               *string
	ThumbnailURL                                       string
	Qty                                                int
	UnitPrice                                          int
	RegularPrice                                       int
	OnSale                                             bool
	WeightKg                                           float64
	Subtotal                                           int
}

type Problem struct {
	VariantID string
	Code      string
	Available int
}

type Destination struct{ ProvinceCode string }

type ShippingOption struct {
	MethodID, ZoneCode, Code, Name string
	Cost                           int
	IsFree                         bool
	EtaMinDays, EtaMaxDays         int
}

type ShippingQuoter interface {
	Options(ctx context.Context, db *gorm.DB, dest Destination, lines []PricedLine, subtotal int, locale string) ([]ShippingOption, error)
}

type CouponReason string

const (
	CouponNotFound          CouponReason = "not_found"
	CouponInactive          CouponReason = "inactive"
	CouponNotStarted        CouponReason = "not_started"
	CouponExpired           CouponReason = "expired"
	CouponUsageLimitReached CouponReason = "usage_limit_reached"
	CouponUserLimitReached  CouponReason = "user_limit_reached"
	CouponNotApplicable     CouponReason = "not_applicable"
	CouponMinSubtotalNotMet CouponReason = "min_subtotal_not_met"
)

type CouponRejectedError struct{ Reason CouponReason }

func (e *CouponRejectedError) Error() string { return "kupon ditolak: " + string(e.Reason) }

type LineDiscount struct {
	VariantID string
	Amount    int
}

type DiscountResult struct {
	CouponID, Code, DiscountType string
	Description                  string
	ItemsDiscount                int
	FreeShipping                 bool
	MinSubtotal                  int
	Lines                        []LineDiscount
}

type DiscountApplier interface {
	Evaluate(ctx context.Context, tx *gorm.DB, userID, code string, lines []PricedLine, locale string, lock bool) (DiscountResult, error)
	Reserve(ctx context.Context, tx *gorm.DB, orderID, userID string, r DiscountResult, shippingDiscount int) error
	Confirm(ctx context.Context, tx *gorm.DB, orderID string) error
	Release(ctx context.Context, tx *gorm.DB, orderID string) error
}

type InsufficientStockError struct {
	VariantID            string
	Available, Requested int
}

func (e *InsufficientStockError) Error() string { return "stok tidak cukup" }

type RestockItem struct {
	VariantID string
	Qty       int
}

type InventoryLedger interface {
	Reserve(ctx context.Context, tx *gorm.DB, orderID string, lines []LineInput, actorID *string) error
	Release(ctx context.Context, tx *gorm.DB, orderID string, actorID *string) error
	Restock(ctx context.Context, tx *gorm.DB, orderID string, items []RestockItem, actorID *string, note string) error
}

type OrderEvent struct {
	OrderID        string
	FromStatus     *string
	ToStatus       string
	ActorType      ActorType
	ActorID        *string
	Note           string
	NotifyCustomer bool
}

type OrderEventRecorder interface {
	Record(ctx context.Context, tx *gorm.DB, e OrderEvent) error
}

type Ports struct {
	Shipping  ShippingQuoter
	Discounts DiscountApplier
	Inventory InventoryLedger
	Events    OrderEventRecorder
}
