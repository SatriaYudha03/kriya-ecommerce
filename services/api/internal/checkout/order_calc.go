package checkout

// orderCalc adalah hasil murni (tanpa DB) dari menghitung total order v2 (RENCANA §6.2):
// dipisah dari OrderRepository.CreateOrder supaya bisa diuji tanpa koneksi database,
// mengikuti pola evaluateCouponCore di internal/promo/discount.go.
type orderCalc struct {
	Subtotal         int
	DiscountTotal    int
	ShippingCost     int
	ShippingDiscount int
	TaxAmount        int
	Total            int
	TotalWeightKg    float64
	Chosen           ShippingOption
	LineDiscount     map[string]int
}

// computeOrderTotals — RENCANA §6.2: subtotal -> kupon (baris eligible) -> ongkir
// (free_shipping via kupon ATAU free_shipping_min_subtotal metode, yang terakhir sudah
// membuat Cost=0 di ShippingQuoter) -> total -> pajak (hanya kalau prices_include_tax).
func computeOrderTotals(
	pricedLines []PricedLine,
	shippingOptions []ShippingOption,
	requestedShippingMethodID string,
	discountResult DiscountResult,
	hasCoupon bool,
	settings storeSettingsRow,
) (orderCalc, error) {
	subtotal := 0
	for _, pl := range pricedLines {
		subtotal += pl.Subtotal
	}

	var chosen *ShippingOption
	for i := range shippingOptions {
		if shippingOptions[i].MethodID == requestedShippingMethodID {
			chosen = &shippingOptions[i]
			break
		}
	}
	if chosen == nil {
		return orderCalc{}, ErrShippingMethodUnavailable
	}

	discountTotal := 0
	lineDiscount := make(map[string]int)
	if hasCoupon {
		discountTotal = discountResult.ItemsDiscount
		for _, ld := range discountResult.Lines {
			lineDiscount[ld.VariantID] = ld.Amount
		}
	}

	shippingDiscount := 0
	if hasCoupon && discountResult.FreeShipping {
		shippingDiscount = chosen.Cost
	}

	total := subtotal - discountTotal + chosen.Cost - shippingDiscount

	taxAmount := 0
	if settings.PricesIncludeTax && settings.TaxRateBP > 0 {
		taxAmount = total * settings.TaxRateBP / (10000 + settings.TaxRateBP)
	}

	var totalWeight float64
	for _, pl := range pricedLines {
		totalWeight += pl.WeightKg * float64(pl.Qty)
	}

	return orderCalc{
		Subtotal: subtotal, DiscountTotal: discountTotal,
		ShippingCost: chosen.Cost, ShippingDiscount: shippingDiscount,
		TaxAmount: taxAmount, Total: total, TotalWeightKg: totalWeight,
		Chosen: *chosen, LineDiscount: lineDiscount,
	}, nil
}
