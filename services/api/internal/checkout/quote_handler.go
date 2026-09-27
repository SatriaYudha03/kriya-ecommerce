package checkout

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"gorm.io/gorm"
)

type QuoteHandler struct {
	db    *gorm.DB
	ports Ports
}

func NewQuoteHandler(db *gorm.DB, ports Ports) *QuoteHandler {
	return &QuoteHandler{db: db, ports: ports}
}

// Quote menghitung POST /checkout/quote (RENCANA §7.6): PriceLines -> Evaluate kupon
// (tanpa lock) -> opsi ongkir -> total/pajak/problems. Tidak pernah 4xx untuk masalah
// bisnis (stok, kupon, metode tidak tersedia) — semua dilaporkan lewat problems/coupon.
func (h *QuoteHandler) Quote(c *gin.Context) {
	locale := httpx.ResolveLocale(c)
	userID, _ := httpx.UserID(c)

	var req QuoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Body tidak valid")
		return
	}

	ctx := c.Request.Context()
	lines := make([]LineInput, 0, len(req.Items))
	for _, it := range req.Items {
		lines = append(lines, LineInput{VariantID: it.VariantID, Qty: it.Qty})
	}

	pricedLines, problems, err := PriceLines(ctx, h.db, lines, locale, false)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menghitung harga barang")
		return
	}

	subtotal := 0
	for _, pl := range pricedLines {
		subtotal += pl.Subtotal
	}

	var couponResp *QuoteCouponResponse
	var discountResult DiscountResult
	couponValid := false
	if req.CouponCode != nil && *req.CouponCode != "" {
		code := *req.CouponCode
		if h.ports.Discounts == nil {
			reason := string(CouponNotFound)
			couponResp = &QuoteCouponResponse{Code: code, Valid: false, Reason: &reason}
		} else {
			res, evalErr := h.ports.Discounts.Evaluate(ctx, h.db, userID, code, pricedLines, locale, false)
			if evalErr != nil {
				reason := string(CouponNotFound)
				var ce *CouponRejectedError
				if errors.As(evalErr, &ce) {
					reason = string(ce.Reason)
				}
				couponResp = &QuoteCouponResponse{Code: code, Valid: false, Reason: &reason}
			} else {
				discountResult = res
				couponValid = true
				dt := res.DiscountType
				couponResp = &QuoteCouponResponse{Code: code, Valid: true, DiscountType: &dt}
			}
		}
	}

	discountTotal := 0
	lineDiscount := make(map[string]int)
	if couponValid {
		discountTotal = discountResult.ItemsDiscount
		for _, ld := range discountResult.Lines {
			lineDiscount[ld.VariantID] = ld.Amount
		}
	}

	var provinceCode string
	if req.AddressID != nil && *req.AddressID != "" && userID != "" {
		addr, _ := getAddressForUser(ctx, h.db, *req.AddressID, userID)
		if addr != nil {
			provinceCode = addr.ProvinceCode
		}
	} else if req.ProvinceCode != nil {
		provinceCode = *req.ProvinceCode
	}

	var shippingOptions []ShippingOption
	if provinceCode != "" && h.ports.Shipping != nil {
		opts, shipErr := h.ports.Shipping.Options(ctx, h.db, Destination{ProvinceCode: provinceCode}, pricedLines, subtotal, locale)
		if shipErr == nil {
			shippingOptions = opts
		}
	}

	var selectedMethodID *string
	shippingCost := 0
	if len(shippingOptions) > 0 {
		chosen := shippingOptions[0]
		if req.ShippingMethodID != nil {
			for _, o := range shippingOptions {
				if o.MethodID == *req.ShippingMethodID {
					chosen = o
					break
				}
			}
		}
		selectedMethodID = &chosen.MethodID
		shippingCost = chosen.Cost
	}

	shippingDiscount := 0
	if couponValid && discountResult.FreeShipping {
		shippingDiscount = shippingCost
	}

	total := subtotal - discountTotal + shippingCost - shippingDiscount

	settings := getStoreSettings(ctx, h.db)
	taxAmount := 0
	if settings.PricesIncludeTax && settings.TaxRateBP > 0 {
		taxAmount = total * settings.TaxRateBP / (10000 + settings.TaxRateBP)
	}

	var totalWeight float64
	for _, pl := range pricedLines {
		totalWeight += pl.WeightKg * float64(pl.Qty)
	}

	respLines := make([]QuoteLineResponse, 0, len(pricedLines))
	for _, pl := range pricedLines {
		respLines = append(respLines, QuoteLineResponse{
			VariantID:      pl.VariantID,
			ProductSlug:    pl.ProductSlug,
			Name:           pl.Name,
			Color:          pl.Color,
			Size:           pl.Size,
			ThumbnailURL:   pl.ThumbnailURL,
			Qty:            pl.Qty,
			UnitPrice:      pl.UnitPrice,
			RegularPrice:   pl.RegularPrice,
			DiscountAmount: lineDiscount[pl.VariantID],
			Subtotal:       pl.Subtotal,
		})
	}
	respOptions := make([]QuoteShippingOption, 0, len(shippingOptions))
	for _, o := range shippingOptions {
		respOptions = append(respOptions, QuoteShippingOption{
			MethodID: o.MethodID, Code: o.Code, Name: o.Name, Cost: o.Cost,
			EtaMinDays: o.EtaMinDays, EtaMaxDays: o.EtaMaxDays, IsFree: o.IsFree,
		})
	}
	respProblems := make([]QuoteProblemResponse, 0, len(problems))
	for _, p := range problems {
		respProblems = append(respProblems, QuoteProblemResponse{VariantID: p.VariantID, Code: p.Code, Available: p.Available})
	}

	c.JSON(http.StatusOK, httpx.Response{Data: QuoteResponse{
		Lines:                    respLines,
		Subtotal:                 subtotal,
		DiscountTotal:            discountTotal,
		ShippingOptions:          respOptions,
		SelectedShippingMethodID: selectedMethodID,
		ShippingCost:             shippingCost,
		ShippingDiscount:         shippingDiscount,
		TaxAmount:                taxAmount,
		Total:                    total,
		TotalWeightKg:            totalWeight,
		Coupon:                   couponResp,
		Problems:                 respProblems,
	}})
}
