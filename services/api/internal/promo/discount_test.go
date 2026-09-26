package promo

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/kriya-commerce/api/internal/checkout"
)

func intPtr(i int) *int {
	return &i
}

func parseTime(s string) *time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return &t
}

func TestEvaluateCouponCore(t *testing.T) {
	now := time.Now()
	past := now.Add(-24 * time.Hour)
	future := now.Add(24 * time.Hour)

	tests := []struct {
		name              string
		c                 Coupon
		lines             []checkout.PricedLine
		locale            string
		globalRedemptions int64
		userRedemptions   int64
		productIDs        []string
		categoryIDs       []string
		wantErr           string
		wantResult        checkout.DiscountResult
	}{
		{
			name:    "inactive",
			c:       Coupon{Code: "C", IsActive: false},
			wantErr: "kupon ditolak: inactive",
		},
		{
			name:    "not_started",
			c:       Coupon{Code: "C", IsActive: true, StartsAt: &future},
			wantErr: "kupon ditolak: not_started",
		},
		{
			name:    "expired",
			c:       Coupon{Code: "C", IsActive: true, EndsAt: &past},
			wantErr: "kupon ditolak: expired",
		},
		{
			name:              "usage_limit_reached",
			c:                 Coupon{Code: "C", IsActive: true, UsageLimit: intPtr(2)},
			globalRedemptions: 2,
			wantErr:           "kupon ditolak: usage_limit_reached",
		},
		{
			name:            "user_limit_reached",
			c:               Coupon{Code: "C", IsActive: true, UsageLimitPerUser: intPtr(1)},
			userRedemptions: 1,
			wantErr:         "kupon ditolak: user_limit_reached",
		},
		{
			name: "not_applicable_product",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "products"},
			lines: []checkout.PricedLine{
				{ProductID: "p2", Subtotal: 10000},
			},
			productIDs: []string{"p1"},
			wantErr:    "kupon ditolak: not_applicable",
		},
		{
			name: "applicable_product",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "products", DiscountType: "percent", Amount: 10},
			lines: []checkout.PricedLine{
				{ProductID: "p1", Subtotal: 10000},
			},
			productIDs: []string{"p1"},
			wantResult: checkout.DiscountResult{DiscountType: "percent", ItemsDiscount: 1000},
		},
		{
			name: "not_applicable_category",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "categories"},
			lines: []checkout.PricedLine{
				{CategoryID: "cat2", Subtotal: 10000},
			},
			categoryIDs: []string{"cat1"},
			wantErr:     "kupon ditolak: not_applicable",
		},
		{
			name: "applicable_category",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "categories", DiscountType: "percent", Amount: 10},
			lines: []checkout.PricedLine{
				{CategoryID: "cat1", Subtotal: 10000},
			},
			categoryIDs: []string{"cat1"},
			wantResult:  checkout.DiscountResult{DiscountType: "percent", ItemsDiscount: 1000},
		},
		{
			name: "exclude_sale_not_applicable",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", ExcludeSaleItems: true},
			lines: []checkout.PricedLine{
				{OnSale: true, Subtotal: 10000},
			},
			wantErr: "kupon ditolak: not_applicable",
		},
		{
			name: "exclude_sale_applicable_mixed",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", ExcludeSaleItems: true, DiscountType: "percent", Amount: 10},
			lines: []checkout.PricedLine{
				{VariantID: "v1", OnSale: true, Subtotal: 20000},
				{VariantID: "v2", OnSale: false, Subtotal: 30000},
			},
			wantResult: checkout.DiscountResult{
				DiscountType:  "percent",
				ItemsDiscount: 3000,
				Lines: []checkout.LineDiscount{
					{VariantID: "v2", Amount: 3000},
				},
			},
		},
		{
			name: "min_subtotal_not_met",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", MinSubtotal: 100000},
			lines: []checkout.PricedLine{
				{Subtotal: 99999},
			},
			wantErr: "kupon ditolak: min_subtotal_not_met",
		},
		{
			name: "min_subtotal_met",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", MinSubtotal: 100000, DiscountType: "percent", Amount: 10},
			lines: []checkout.PricedLine{
				{Subtotal: 100000},
			},
			wantResult: checkout.DiscountResult{DiscountType: "percent", ItemsDiscount: 10000},
		},
		{
			name: "percent_rounding_alloc",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "percent", Amount: 15},
			lines: []checkout.PricedLine{
				{VariantID: "v1", Subtotal: 33333},
				{VariantID: "v2", Subtotal: 33333},
				{VariantID: "v3", Subtotal: 33334},
			},
			wantResult: checkout.DiscountResult{
				DiscountType:  "percent",
				ItemsDiscount: 15000,
				Lines: []checkout.LineDiscount{
					{VariantID: "v1", Amount: 5000},
					{VariantID: "v2", Amount: 5000},
					{VariantID: "v3", Amount: 5000},
				},
			},
		},
		{
			name: "percent_cap",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "percent", Amount: 20, MaxDiscount: intPtr(50000)},
			lines: []checkout.PricedLine{
				{Subtotal: 500000}, // 20% of 500k = 100k, capped to 50k
			},
			wantResult: checkout.DiscountResult{DiscountType: "percent", ItemsDiscount: 50000},
		},
		{
			name: "fixed_cart_over_subtotal",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "fixed_cart", Amount: 75000},
			lines: []checkout.PricedLine{
				{Subtotal: 50000}, // capped to subtotal
			},
			wantResult: checkout.DiscountResult{DiscountType: "fixed_cart", ItemsDiscount: 50000},
		},
		{
			name: "fixed_cart_normal",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "fixed_cart", Amount: 75000},
			lines: []checkout.PricedLine{
				{Subtotal: 150000},
			},
			wantResult: checkout.DiscountResult{DiscountType: "fixed_cart", ItemsDiscount: 75000},
		},
		{
			name: "free_shipping",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "free_shipping"},
			lines: []checkout.PricedLine{
				{Subtotal: 100000},
			},
			wantResult: checkout.DiscountResult{DiscountType: "free_shipping", FreeShipping: true, ItemsDiscount: 0},
		},
		{
			name: "alloc_remainder",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "percent", Amount: 15},
			lines: []checkout.PricedLine{
				{VariantID: "v1", Subtotal: 10000},
				{VariantID: "v2", Subtotal: 10000},
				{VariantID: "v3", Subtotal: 10000},
			},
			wantResult: checkout.DiscountResult{
				DiscountType:  "percent",
				ItemsDiscount: 4500,
				Lines: []checkout.LineDiscount{
					{VariantID: "v1", Amount: 1500},
					{VariantID: "v2", Amount: 1500},
					{VariantID: "v3", Amount: 1500},
				},
			},
		},
		{
			name: "alloc_remainder_hard",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "percent", Amount: 15},
			lines: []checkout.PricedLine{
				{VariantID: "v1", Subtotal: 33},
				{VariantID: "v2", Subtotal: 33},
				{VariantID: "v3", Subtotal: 34},
			},
			// eligible = 100. 15% = 15.
			// alloc = 4, 4, 5 = 13. rem = 2.
			// v1+1=5, v2+1=5, v3=5.
			wantResult: checkout.DiscountResult{
				DiscountType:  "percent",
				ItemsDiscount: 15,
				Lines: []checkout.LineDiscount{
					{VariantID: "v1", Amount: 5},
					{VariantID: "v2", Amount: 5},
					{VariantID: "v3", Amount: 5},
				},
			},
		},
		{
			name: "desc_i18n_fallback",
			c:    Coupon{Code: "C", IsActive: true, AppliesTo: "all", DiscountType: "percent", Amount: 10, DescriptionI18n: json.RawMessage(`{"en":"Disc", "id":"Diskon"}`)},
			lines: []checkout.PricedLine{
				{Subtotal: 10000},
			},
			locale: "en",
			wantResult: checkout.DiscountResult{
				DiscountType:  "percent",
				ItemsDiscount: 1000,
				Description:   "Disc",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := evaluateCouponCore(tt.c, tt.lines, tt.locale, tt.globalRedemptions, tt.userRedemptions, tt.productIDs, tt.categoryIDs, now)
			if tt.wantErr != "" {
				if err == nil || err.Error() != tt.wantErr {
					t.Errorf("evaluateCouponCore() error = %v, wantErr %v", err, tt.wantErr)
				}
			} else {
				if err != nil {
					t.Errorf("evaluateCouponCore() error = %v, want nil", err)
				}
				if res.DiscountType != tt.wantResult.DiscountType {
					t.Errorf("DiscountType = %v, want %v", res.DiscountType, tt.wantResult.DiscountType)
				}
				if res.ItemsDiscount != tt.wantResult.ItemsDiscount {
					t.Errorf("ItemsDiscount = %v, want %v", res.ItemsDiscount, tt.wantResult.ItemsDiscount)
				}
				if res.FreeShipping != tt.wantResult.FreeShipping {
					t.Errorf("FreeShipping = %v, want %v", res.FreeShipping, tt.wantResult.FreeShipping)
				}
				if tt.wantResult.Description != "" && res.Description != tt.wantResult.Description {
					t.Errorf("Description = %v, want %v", res.Description, tt.wantResult.Description)
				}
				if tt.wantResult.Lines != nil {
					if len(res.Lines) != len(tt.wantResult.Lines) {
						t.Errorf("len(Lines) = %v, want %v", len(res.Lines), len(tt.wantResult.Lines))
					} else {
						for i, l := range tt.wantResult.Lines {
							if res.Lines[i].VariantID != l.VariantID || res.Lines[i].Amount != l.Amount {
								t.Errorf("Line[%d] = %v, want %v", i, res.Lines[i], l)
							}
						}
					}
				}
			}
		})
	}
}
