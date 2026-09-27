package checkout

import "testing"

func TestComputeOrderTotals_ShippingMethodNotFound(t *testing.T) {
	_, err := computeOrderTotals(
		[]PricedLine{{VariantID: "v1", Qty: 1, Subtotal: 100000}},
		[]ShippingOption{{MethodID: "m-other", Cost: 20000}},
		"m-chosen",
		DiscountResult{}, false, storeSettingsRow{},
	)
	if err != ErrShippingMethodUnavailable {
		t.Fatalf("expected ErrShippingMethodUnavailable, got %v", err)
	}
}

func TestComputeOrderTotals_NoCoupon(t *testing.T) {
	calc, err := computeOrderTotals(
		[]PricedLine{{VariantID: "v1", Qty: 2, Subtotal: 200000, WeightKg: 1.5}},
		[]ShippingOption{{MethodID: "m1", Cost: 30000}},
		"m1", DiscountResult{}, false, storeSettingsRow{},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calc.Subtotal != 200000 || calc.ShippingCost != 30000 || calc.DiscountTotal != 0 || calc.ShippingDiscount != 0 {
		t.Fatalf("unexpected calc: %+v", calc)
	}
	if calc.Total != 230000 {
		t.Fatalf("total salah: got %d, want 230000", calc.Total)
	}
	if calc.TotalWeightKg != 3 {
		t.Fatalf("total_weight_kg salah: got %v, want 3 (1.5kg x qty 2)", calc.TotalWeightKg)
	}
	if calc.TaxAmount != 0 {
		t.Fatal("tax_amount harus 0 kalau prices_include_tax=false")
	}
}

func TestComputeOrderTotals_ItemsDiscount(t *testing.T) {
	calc, err := computeOrderTotals(
		[]PricedLine{
			{VariantID: "v1", Qty: 1, Subtotal: 700000},
			{VariantID: "v2", Qty: 1, Subtotal: 300000},
		},
		[]ShippingOption{{MethodID: "m1", Cost: 50000}},
		"m1",
		DiscountResult{
			ItemsDiscount: 100000,
			Lines: []LineDiscount{
				{VariantID: "v1", Amount: 70000},
				{VariantID: "v2", Amount: 30000},
			},
		},
		true, storeSettingsRow{},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calc.DiscountTotal != 100000 {
		t.Fatalf("discount_total salah: %d", calc.DiscountTotal)
	}
	if calc.LineDiscount["v1"] != 70000 || calc.LineDiscount["v2"] != 30000 {
		t.Fatalf("alokasi diskon per baris salah: %+v", calc.LineDiscount)
	}
	// total = subtotal(1000000) - discount(100000) + shipping(50000) - shipping_discount(0)
	if calc.Total != 950000 {
		t.Fatalf("total salah: got %d, want 950000", calc.Total)
	}
}

func TestComputeOrderTotals_FreeShippingCoupon(t *testing.T) {
	calc, err := computeOrderTotals(
		[]PricedLine{{VariantID: "v1", Qty: 1, Subtotal: 500000}},
		[]ShippingOption{{MethodID: "m1", Cost: 40000}},
		"m1",
		DiscountResult{FreeShipping: true},
		true, storeSettingsRow{},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calc.ShippingDiscount != 40000 {
		t.Fatalf("shipping_discount harus sama dengan shipping_cost (§6.2 butir 4), got %d", calc.ShippingDiscount)
	}
	// total = 500000 - 0 + 40000 - 40000 = 500000
	if calc.Total != 500000 {
		t.Fatalf("total salah: got %d, want 500000", calc.Total)
	}
}

func TestComputeOrderTotals_TaxIncluded(t *testing.T) {
	// tax_rate_bp 1100 (11%) -> tax_amount = round(total * 1100/11100)
	calc, err := computeOrderTotals(
		[]PricedLine{{VariantID: "v1", Qty: 1, Subtotal: 1110000}},
		[]ShippingOption{{MethodID: "m1", Cost: 0}},
		"m1", DiscountResult{}, false,
		storeSettingsRow{PricesIncludeTax: true, TaxRateBP: 1100},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// total = 1110000; tax = 1110000*1100/11100 = 110000
	if calc.Total != 1110000 {
		t.Fatalf("total salah: %d", calc.Total)
	}
	if calc.TaxAmount != 110000 {
		t.Fatalf("tax_amount salah: got %d, want 110000", calc.TaxAmount)
	}
}
