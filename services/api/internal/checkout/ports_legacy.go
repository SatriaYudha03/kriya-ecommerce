package checkout

import (
	"context"
	"gorm.io/gorm"
)

// LegacyShippingQuoter: ongkir = 2 zona
type LegacyShippingQuoter struct{}

func (q *LegacyShippingQuoter) Options(ctx context.Context, db *gorm.DB, dest Destination, lines []PricedLine, subtotal int, locale string) ([]ShippingOption, error) {
	// 2 zone logic
	return []ShippingOption{}, nil // Will implement the actual logic below from the existing handler
}

// LegacyDiscountApplier: kupon = not_found
type LegacyDiscountApplier struct{}

func (d *LegacyDiscountApplier) Evaluate(ctx context.Context, tx *gorm.DB, userID, code string, lines []PricedLine, locale string, lock bool) (DiscountResult, error) {
	return DiscountResult{}, &CouponRejectedError{Reason: CouponNotFound}
}
func (d *LegacyDiscountApplier) Reserve(ctx context.Context, tx *gorm.DB, orderID, userID string, r DiscountResult, shippingDiscount int) error {
	return nil
}
func (d *LegacyDiscountApplier) Confirm(ctx context.Context, tx *gorm.DB, orderID string) error {
	return nil
}
func (d *LegacyDiscountApplier) Release(ctx context.Context, tx *gorm.DB, orderID string) error {
	return nil
}

// LegacyInventoryLedger: stok = update langsung
type LegacyInventoryLedger struct{}

func (l *LegacyInventoryLedger) Reserve(ctx context.Context, tx *gorm.DB, orderID string, lines []LineInput, actorID *string) error {
	for _, line := range lines {
		res := tx.Exec("UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?", line.Qty, line.VariantID, line.Qty)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return &InsufficientStockError{VariantID: line.VariantID, Requested: line.Qty}
		}
	}
	return nil
}

func (l *LegacyInventoryLedger) Release(ctx context.Context, tx *gorm.DB, orderID string, actorID *string) error {
	// Restore stock. This logic was probably in webhook compensation.
	return nil // To be filled based on existing code
}

func (l *LegacyInventoryLedger) Restock(ctx context.Context, tx *gorm.DB, orderID string, items []RestockItem, actorID *string, note string) error {
	return nil
}

// LegacyOrderEventRecorder: event = no-op
type LegacyOrderEventRecorder struct{}

func (r *LegacyOrderEventRecorder) Record(ctx context.Context, tx *gorm.DB, e OrderEvent) error {
	return nil
}
