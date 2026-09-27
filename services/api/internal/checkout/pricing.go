package checkout

import (
	"context"
	"sort"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func PriceLines(ctx context.Context, tx *gorm.DB, lines []LineInput, locale string, lock bool) ([]PricedLine, []Problem, error) {
	if len(lines) == 0 {
		return nil, nil, nil
	}

	var variantIDs []string
	qtyMap := make(map[string]int)
	for _, l := range lines {
		variantIDs = append(variantIDs, l.VariantID)
		qtyMap[l.VariantID] = l.Qty
	}

	// Sort variantIDs to avoid deadlocks when lock=true
	sort.Strings(variantIDs)

	query := tx.WithContext(ctx).
		Table("product_variants pv").
		Select(`
			pv.id as variant_id,
			pv.product_id,
			COALESCE(c.id::text, '') as category_id,
			p.slug as product_slug,
			pv.sku,
			p.name,
			pv.color,
			pv.size,
			COALESCE((SELECT storage_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC, created_at ASC LIMIT 1), '') as thumbnail_url,
			pv.price as regular_price,
			kriya_effective_price(pv.price, pv.sale_price, pv.sale_starts_at, pv.sale_ends_at) as unit_price,
			CASE WHEN pv.sale_price IS NOT NULL AND (pv.sale_starts_at IS NULL OR pv.sale_starts_at <= now()) AND (pv.sale_ends_at IS NULL OR pv.sale_ends_at > now()) THEN true ELSE false END as on_sale,
			COALESCE(pv.weight_kg, p.weight_kg, 0) as weight_kg,
			COALESCE(pv.stock, 0) as available
		`).
		Joins("JOIN products p ON p.id = pv.product_id").
		Joins("LEFT JOIN categories c ON c.slug = p.category_slug").
		Where("pv.id IN ?", variantIDs).
		Where("p.status = 'published' AND pv.is_active = true")

	if lock {
		// "FOR UPDATE OF pv": query punya LEFT JOIN ke categories, dan Postgres menolak
		// FOR UPDATE polos di query dengan outer join ("cannot be applied to the
		// nullable side of an outer join") — kunci eksplisit hanya baris product_variants.
		query = query.Clauses(clause.Locking{Strength: "UPDATE", Table: clause.Table{Name: "pv"}})
	}

	type Result struct {
		VariantID    string
		ProductID    string
		CategoryID   string
		ProductSlug  string
		SKU          string
		Name         string
		Color        string
		Size         *string
		ThumbnailURL string
		RegularPrice int
		UnitPrice    int
		OnSale       bool
		WeightKg     *float64
		Available    int
	}

	var results []Result
	if err := query.Find(&results).Error; err != nil {
		return nil, nil, err
	}

	resultMap := make(map[string]Result)
	for _, r := range results {
		resultMap[r.VariantID] = r
	}

	var pricedLines []PricedLine
	var problems []Problem

	for _, l := range lines {
		r, ok := resultMap[l.VariantID]
		if !ok {
			problems = append(problems, Problem{VariantID: l.VariantID, Code: "unavailable", Available: 0})
			continue
		}
		if r.Available < l.Qty {
			problems = append(problems, Problem{VariantID: l.VariantID, Code: "insufficient_stock", Available: r.Available})
		}

		var weight float64
		if r.WeightKg != nil {
			weight = *r.WeightKg
		}

		pricedLines = append(pricedLines, PricedLine{
			VariantID:    r.VariantID,
			ProductID:    r.ProductID,
			CategoryID:   r.CategoryID,
			ProductSlug:  r.ProductSlug,
			SKU:          r.SKU,
			Name:         r.Name,
			Color:        r.Color,
			Size:         r.Size,
			ThumbnailURL: r.ThumbnailURL,
			Qty:          l.Qty,
			UnitPrice:    r.UnitPrice,
			RegularPrice: r.RegularPrice,
			OnSale:       r.OnSale,
			WeightKg:     weight,
			Subtotal:     r.UnitPrice * l.Qty,
		})
	}

	return pricedLines, problems, nil
}
