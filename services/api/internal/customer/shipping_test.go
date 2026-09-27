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

func TestShippingQuoter_Validation(t *testing.T) {
	quoter := NewShippingQuoter()
	_, err := quoter.Options(nil, nil, checkout.Destination{ProvinceCode: ""}, nil, 0, "id")
	if err == nil {
		t.Fatal("expected error for empty province code, got nil")
	}
	if err.Error() != "province code is required" {
		t.Fatalf("expected 'province code is required', got '%s'", err.Error())
	}
}

func TestCalculateShippingOptions_ProvinceScenarios(t *testing.T) {
	jawaMethods := []method{
		{
			ID:          "m-jawa-reg",
			Code:        "reguler",
			NameI18n:    []byte(`{"id":"Reguler Jawa","en":"Java Regular"}`),
			RateType:    "flat",
			BaseCost:    150000,
			EtaMinDays:  2,
			EtaMaxDays:  4,
		},
		{
			ID:                      "m-jawa-exp",
			Code:                    "express",
			NameI18n:                []byte(`{"id":"Kilat Jawa","en":"Java Express"}`),
			RateType:                "flat",
			BaseCost:                250000,
			MaxWeightKg:             floatPtr(10.0),
			FreeShippingMinSubtotal: intPtr(1000000),
			EtaMinDays:              1,
			EtaMaxDays:              2,
		},
	}

	luarJawaMethods := []method{
		{
			ID:          "m-luar-kargo",
			Code:        "kargo",
			NameI18n:    []byte(`{"id":"Kargo Luar Jawa","en":"Outer Island Cargo"}`),
			RateType:    "per_kg",
			BaseCost:    100000,
			PerKgCost:   25000,
			EtaMinDays:  5,
			EtaMaxDays:  10,
		},
	}

	t.Run("jawa_bali_dki_jakarta_en_locale", func(t *testing.T) {
		lines := []checkout.PricedLine{{WeightKg: 2.5, Qty: 2}} // 5.0kg
		opts := calculateShippingOptions(jawaMethods, "jawa_bali", lines, 500000, "en")
		if len(opts) != 2 {
			t.Fatalf("expected 2 options, got %d", len(opts))
		}
		// Sorted by cost: reguler (150000) < express (250000)
		if opts[0].Code != "reguler" || opts[0].Name != "Java Regular" || opts[0].Cost != 150000 {
			t.Errorf("unexpected option 0: %+v", opts[0])
		}
		if opts[1].Code != "express" || opts[1].Name != "Java Express" || opts[1].Cost != 250000 {
			t.Errorf("unexpected option 1: %+v", opts[1])
		}
	})

	t.Run("jawa_bali_free_shipping_threshold", func(t *testing.T) {
		lines := []checkout.PricedLine{{WeightKg: 1.0, Qty: 1}}
		opts := calculateShippingOptions(jawaMethods, "jawa_bali", lines, 1500000, "id")
		if len(opts) != 2 {
			t.Fatalf("expected 2 options, got %d", len(opts))
		}
		// express has free shipping min 1.000.000 -> Cost 0, isFree true -> sorted first!
		if opts[0].Code != "express" || opts[0].Cost != 0 || !opts[0].IsFree {
			t.Errorf("expected express free shipping first, got %+v", opts[0])
		}
		if opts[1].Code != "reguler" || opts[1].Cost != 150000 {
			t.Errorf("expected reguler second, got %+v", opts[1])
		}
	})

	t.Run("jawa_bali_weight_exceeds_express", func(t *testing.T) {
		lines := []checkout.PricedLine{{WeightKg: 12.0, Qty: 1}} // 12kg > max 10kg
		opts := calculateShippingOptions(jawaMethods, "jawa_bali", lines, 500000, "id")
		if len(opts) != 1 {
			t.Fatalf("expected 1 option (express dropped due to weight limit), got %d", len(opts))
		}
		if opts[0].Code != "reguler" {
			t.Errorf("expected reguler, got %s", opts[0].Code)
		}
	})

	t.Run("luar_jawa_papua_per_kg_calc", func(t *testing.T) {
		lines := []checkout.PricedLine{{WeightKg: 1.2, Qty: 2}} // 2.4kg -> ceil 3kg
		opts := calculateShippingOptions(luarJawaMethods, "luar_jawa", lines, 200000, "id")
		if len(opts) != 1 {
			t.Fatalf("expected 1 option, got %d", len(opts))
		}
		expectedCost := 100000 + (25000 * 3) // 175000
		if opts[0].Cost != expectedCost {
			t.Errorf("expected cost %d, got %d", expectedCost, opts[0].Cost)
		}
		if opts[0].Name != "Kargo Luar Jawa" {
			t.Errorf("expected name 'Kargo Luar Jawa', got '%s'", opts[0].Name)
		}
	})

	t.Run("province_with_no_active_methods", func(t *testing.T) {
		opts := calculateShippingOptions([]method{}, "no_methods_zone", nil, 100000, "id")
		if len(opts) != 0 {
			t.Fatalf("expected empty options, got %d", len(opts))
		}
	})
}
