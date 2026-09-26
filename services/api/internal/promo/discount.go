package promo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kriya-commerce/api/internal/checkout"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type discountApplier struct{}

func NewDiscountApplier() checkout.DiscountApplier {
	return &discountApplier{}
}

func (d *discountApplier) Evaluate(ctx context.Context, tx *gorm.DB, userID, code string, lines []checkout.PricedLine, locale string, lock bool) (checkout.DiscountResult, error) {
	var c Coupon
	query := tx.WithContext(ctx).Table("coupons").Where("code = ?", code)
	if lock {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}

	if err := query.First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponNotFound}
		}
		return checkout.DiscountResult{}, err
	}

	var globalRedemptions int64
	if c.UsageLimit != nil {
		if err := tx.WithContext(ctx).Table("coupon_redemptions").
			Where("coupon_id = ? AND status IN ('reserved', 'applied')", c.ID).Count(&globalRedemptions).Error; err != nil {
			return checkout.DiscountResult{}, err
		}
	}

	var userRedemptions int64
	if c.UsageLimitPerUser != nil && userID != "" {
		if err := tx.WithContext(ctx).Table("coupon_redemptions").
			Where("coupon_id = ? AND user_id = ? AND status IN ('reserved', 'applied')", c.ID, userID).Count(&userRedemptions).Error; err != nil {
			return checkout.DiscountResult{}, err
		}
	}

	var productIDs []string
	var categoryIDs []string

	if c.AppliesTo == "products" {
		if err := tx.WithContext(ctx).Table("coupon_products").Select("product_id").Where("coupon_id = ?", c.ID).Pluck("product_id", &productIDs).Error; err != nil {
			return checkout.DiscountResult{}, err
		}
	} else if c.AppliesTo == "categories" {
		if err := tx.WithContext(ctx).Table("coupon_categories").Select("category_id").Where("coupon_id = ?", c.ID).Pluck("category_id", &categoryIDs).Error; err != nil {
			return checkout.DiscountResult{}, err
		}
	}

	return evaluateCouponCore(c, lines, locale, globalRedemptions, userRedemptions, productIDs, categoryIDs, time.Now())
}

func evaluateCouponCore(c Coupon, lines []checkout.PricedLine, locale string, globalRedemptions, userRedemptions int64, productIDs, categoryIDs []string, now time.Time) (checkout.DiscountResult, error) {
	if !c.IsActive {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponInactive}
	}
	if c.StartsAt != nil && c.StartsAt.After(now) {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponNotStarted}
	}
	if c.EndsAt != nil && c.EndsAt.Before(now) {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponExpired}
	}
	if c.UsageLimit != nil && globalRedemptions >= int64(*c.UsageLimit) {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponUsageLimitReached}
	}
	if c.UsageLimitPerUser != nil && userRedemptions >= int64(*c.UsageLimitPerUser) {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponUserLimitReached}
	}

	productMap := make(map[string]bool)
	for _, id := range productIDs {
		productMap[id] = true
	}
	categoryMap := make(map[string]bool)
	for _, id := range categoryIDs {
		categoryMap[id] = true
	}

	var eligibleSubtotal int
	var eligibleIndices []int

	for i, line := range lines {
		if c.ExcludeSaleItems && line.OnSale {
			continue
		}
		isEligible := false
		if c.AppliesTo == "all" || c.AppliesTo == "" {
			isEligible = true
		} else if c.AppliesTo == "products" {
			isEligible = productMap[line.ProductID]
		} else if c.AppliesTo == "categories" {
			isEligible = categoryMap[line.CategoryID]
		}

		if isEligible {
			eligibleSubtotal += line.Subtotal
			eligibleIndices = append(eligibleIndices, i)
		}
	}

	if len(eligibleIndices) == 0 {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponNotApplicable}
	}

	if eligibleSubtotal < c.MinSubtotal {
		return checkout.DiscountResult{}, &checkout.CouponRejectedError{Reason: checkout.CouponMinSubtotalNotMet}
	}

	var totalDiscount int
	freeShipping := false

	switch c.DiscountType {
	case "percent":
		totalDiscount = (eligibleSubtotal * c.Amount) / 100
		if c.MaxDiscount != nil && totalDiscount > *c.MaxDiscount {
			totalDiscount = *c.MaxDiscount
		}
	case "fixed_cart":
		totalDiscount = c.Amount
		if totalDiscount > eligibleSubtotal {
			totalDiscount = eligibleSubtotal
		}
	case "free_shipping":
		freeShipping = true
		totalDiscount = 0
	}

	var desc map[string]string
	if err := json.Unmarshal(c.DescriptionI18n, &desc); err != nil {
		desc = map[string]string{"id": "Diskon", "en": "Discount"}
	}
	description := desc[locale]
	if description == "" {
		description = desc["id"]
	}
	if description == "" {
		description = "Discount"
	}

	res := checkout.DiscountResult{
		CouponID:      c.ID,
		Code:          c.Code,
		DiscountType:  c.DiscountType,
		Description:   description,
		ItemsDiscount: totalDiscount,
		FreeShipping:  freeShipping,
		MinSubtotal:   c.MinSubtotal,
		Lines:         []checkout.LineDiscount{},
	}

	if totalDiscount > 0 {
		var allocated int
		for _, idx := range eligibleIndices {
			line := lines[idx]
			lineDisc := (totalDiscount * line.Subtotal) / eligibleSubtotal
			res.Lines = append(res.Lines, checkout.LineDiscount{
				VariantID: line.VariantID,
				Amount:    lineDisc,
			})
			allocated += lineDisc
		}

		rem := totalDiscount - allocated
		for i := 0; i < rem && i < len(res.Lines); i++ {
			res.Lines[i].Amount++
		}
	}

	return res, nil
}

func (d *discountApplier) Reserve(ctx context.Context, tx *gorm.DB, orderID, userID string, r checkout.DiscountResult, shippingDiscount int) error {
	query := `
		INSERT INTO coupon_redemptions (
			coupon_id, order_id, user_id, items_discount, shipping_discount, status, created_at, updated_at
		) VALUES (
			?, ?, ?, ?, ?, 'reserved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
		)
	`
	return tx.WithContext(ctx).Exec(query, r.CouponID, orderID, userID, r.ItemsDiscount, shippingDiscount).Error
}

func (d *discountApplier) Confirm(ctx context.Context, tx *gorm.DB, orderID string) error {
	return tx.WithContext(ctx).Exec("UPDATE coupon_redemptions SET status = 'applied', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", orderID).Error
}

func (d *discountApplier) Release(ctx context.Context, tx *gorm.DB, orderID string) error {
	return tx.WithContext(ctx).Exec("UPDATE coupon_redemptions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", orderID).Error
}
