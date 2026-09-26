package customer

import (
	"testing"

	"github.com/kriya-commerce/api/internal/checkout"
)

func floatPtr(f float64) *float64 { return &f }
func intPtr(i int) *int           { return &i }

func TestCalculateShippingOptions(t *testing.T) {
	tests := []struct {
		name     string
		methods  []method
		lines    []checkout.PricedLine
		subtotal int
		locale   string
		expected []checkout.ShippingOption
	}{
		{
			name: "flat_rate_simple",
			methods: []method{
				{
					Code:     "reguler",
					NameI18n: []byte(`{"id":"Reguler"}`),
					RateType: "flat",
					BaseCost: 10000,
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 0.5, Qty: 1}},
			subtotal: 50000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "reguler", Name: "Reguler", Cost: 10000},
			},
		},
		{
			name: "per_kg_ceil",
			methods: []method{
				{
					Code:      "reguler",
					NameI18n:  []byte(`{"id":"Reguler"}`),
					RateType:  "per_kg",
					BaseCost:  10000,
					PerKgCost: 5000,
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 1.2, Qty: 1}}, // total 1.2 -> ceil 2
			subtotal: 50000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "reguler", Name: "Reguler", Cost: 10000 + 5000*2},
			},
		},
		{
			name: "per_kg_exact",
			methods: []method{
				{
					Code:      "reguler",
					NameI18n:  []byte(`{"id":"Reguler"}`),
					RateType:  "per_kg",
					BaseCost:  10000,
					PerKgCost: 5000,
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 2.0, Qty: 1}}, // ceil 2
			subtotal: 50000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "reguler", Name: "Reguler", Cost: 10000 + 5000*2},
			},
		},
		{
			name: "multiple_items_weight",
			methods: []method{
				{
					Code:      "reguler",
					NameI18n:  []byte(`{"id":"Reguler"}`),
					RateType:  "per_kg",
					BaseCost:  10000,
					PerKgCost: 5000,
				},
			},
			lines: []checkout.PricedLine{
				{WeightKg: 0.6, Qty: 2}, // 1.2
				{WeightKg: 0.4, Qty: 3}, // 1.2, total 2.4 -> ceil 3
			},
			subtotal: 100000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "reguler", Name: "Reguler", Cost: 10000 + 5000*3},
			},
		},
		{
			name: "max_weight_exceeded",
			methods: []method{
				{
					Code:        "express",
					NameI18n:    []byte(`{"id":"Express"}`),
					RateType:    "flat",
					BaseCost:    20000,
					MaxWeightKg: floatPtr(2.0),
				},
				{
					Code:     "kargo",
					NameI18n: []byte(`{"id":"Kargo"}`),
					RateType: "flat",
					BaseCost: 15000,
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 1.5, Qty: 2}}, // total 3.0
			subtotal: 100000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "kargo", Name: "Kargo", Cost: 15000},
			},
		},
		{
			name: "free_shipping_met",
			methods: []method{
				{
					Code:                    "reguler",
					NameI18n:                []byte(`{"id":"Reguler"}`),
					RateType:                "flat",
					BaseCost:                10000,
					FreeShippingMinSubtotal: intPtr(100000),
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 1.0, Qty: 1}},
			subtotal: 100000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "reguler", Name: "Reguler", Cost: 0, IsFree: true},
			},
		},
		{
			name: "sort_cost_asc",
			methods: []method{
				{
					Code:     "express",
					NameI18n: []byte(`{"id":"Express"}`),
					RateType: "flat",
					BaseCost: 20000,
				},
				{
					Code:     "kargo",
					NameI18n: []byte(`{"id":"Kargo"}`),
					RateType: "flat",
					BaseCost: 15000,
				},
			},
			lines:    []checkout.PricedLine{{WeightKg: 1.0, Qty: 1}},
			subtotal: 50000,
			locale:   "id",
			expected: []checkout.ShippingOption{
				{Code: "kargo", Name: "Kargo", Cost: 15000},
				{Code: "express", Name: "Express", Cost: 20000},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateShippingOptions(tt.methods, "jawa_bali", tt.lines, tt.subtotal, tt.locale)
			if len(got) != len(tt.expected) {
				t.Fatalf("expected %d options, got %d", len(tt.expected), len(got))
			}
			for i, exp := range tt.expected {
				if got[i].Code != exp.Code {
					t.Errorf("item %d: expected code %s, got %s", i, exp.Code, got[i].Code)
				}
				if got[i].Cost != exp.Cost {
					t.Errorf("item %d: expected cost %d, got %d", i, exp.Cost, got[i].Cost)
				}
				if got[i].IsFree != exp.IsFree {
					t.Errorf("item %d: expected isFree %v, got %v", i, exp.IsFree, got[i].IsFree)
				}
			}
		})
	}
}
