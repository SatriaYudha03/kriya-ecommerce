package customer

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"sort"

	"github.com/kriya-commerce/api/internal/checkout"
	"gorm.io/gorm"
)

type shippingQuoter struct{}

func NewShippingQuoter() checkout.ShippingQuoter {
	return &shippingQuoter{}
}

type method struct {
	ID                      string
	Code                    string
	NameI18n                json.RawMessage
	RateType                string
	BaseCost                int
	PerKgCost               int
	MaxWeightKg             *float64
	FreeShippingMinSubtotal *int
	EtaMinDays              int
	EtaMaxDays              int
}

func (q *shippingQuoter) Options(ctx context.Context, db *gorm.DB, dest checkout.Destination, lines []checkout.PricedLine, subtotal int, locale string) ([]checkout.ShippingOption, error) {
	if dest.ProvinceCode == "" {
		return nil, errors.New("province code is required")
	}

	var zone struct {
		ID       string
		ZoneCode string
	}
	err := db.WithContext(ctx).Raw(`
		SELECT z.id, z.code as zone_code
		FROM shipping_zones z
		JOIN shipping_zone_provinces zp ON z.id = zp.zone_id
		WHERE zp.province_code = ? AND z.is_active = true
	`, dest.ProvinceCode).Scan(&zone).Error
	if err != nil {
		return nil, err
	}
	if zone.ID == "" {
		return []checkout.ShippingOption{}, nil
	}

	var methods []method
	err = db.WithContext(ctx).Raw(`
		SELECT id, code, name_i18n, rate_type, base_cost, per_kg_cost, max_weight_kg, free_shipping_min_subtotal, eta_min_days, eta_max_days
		FROM shipping_methods
		WHERE zone_id = ? AND is_active = true
		ORDER BY position ASC
	`, zone.ID).Scan(&methods).Error
	if err != nil {
		return nil, err
	}

	return calculateShippingOptions(methods, zone.ZoneCode, lines, subtotal, locale), nil
}

func calculateShippingOptions(methods []method, zoneCode string, lines []checkout.PricedLine, subtotal int, locale string) []checkout.ShippingOption {
	var totalWeightKg float64
	for _, line := range lines {
		totalWeightKg += line.WeightKg * float64(line.Qty)
	}

	var options []checkout.ShippingOption
	for _, m := range methods {
		if m.MaxWeightKg != nil && totalWeightKg > *m.MaxWeightKg {
			continue
		}

		cost := m.BaseCost
		if m.RateType == "per_kg" && m.PerKgCost > 0 {
			cost += m.PerKgCost * int(math.Ceil(totalWeightKg))
		}

		isFree := false
		if m.FreeShippingMinSubtotal != nil && subtotal >= *m.FreeShippingMinSubtotal {
			cost = 0
			isFree = true
		}

		var nameMap map[string]string
		name := m.Code
		if err := json.Unmarshal(m.NameI18n, &nameMap); err == nil {
			if n, ok := nameMap[locale]; ok && n != "" {
				name = n
			} else if n, ok := nameMap["id"]; ok && n != "" {
				name = n
			}
		}

		options = append(options, checkout.ShippingOption{
			MethodID:   m.ID,
			ZoneCode:   zoneCode,
			Code:       m.Code,
			Name:       name,
			Cost:       cost,
			IsFree:     isFree,
			EtaMinDays: m.EtaMinDays,
			EtaMaxDays: m.EtaMaxDays,
		})
	}

	sort.Slice(options, func(i, j int) bool {
		return options[i].Cost < options[j].Cost
	})

	return options
}
