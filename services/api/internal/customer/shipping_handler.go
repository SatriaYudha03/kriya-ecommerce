package customer

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"gorm.io/gorm"
)

type ShippingHandler struct {
	db *gorm.DB
}

func NewShippingHandler(db *gorm.DB) *ShippingHandler {
	return &ShippingHandler{db: db}
}

type AdminShippingZone struct {
	ID        string                `json:"id"`
	Code      string                `json:"code"`
	NameI18n  map[string]string     `json:"name_i18n"`
	IsActive  bool                  `json:"is_active"`
	Provinces []string              `json:"provinces"`
	Methods   []AdminShippingMethod `json:"methods"`
}

type AdminShippingMethod struct {
	ID                      string            `json:"id"`
	Code                    string            `json:"code"`
	NameI18n                map[string]string `json:"name_i18n"`
	RateType                string            `json:"rate_type"`
	BaseCost                int               `json:"base_cost"`
	PerKgCost               int               `json:"per_kg_cost"`
	MaxWeightKg             *float64          `json:"max_weight_kg"`
	FreeShippingMinSubtotal *int              `json:"free_shipping_min_subtotal"`
	EtaMinDays              int               `json:"eta_min_days"`
	EtaMaxDays              int               `json:"eta_max_days"`
	IsActive                bool              `json:"is_active"`
}

func (h *ShippingHandler) GetAdminZones(c *gin.Context) {
	var dbZones []struct {
		ID       string `gorm:"primaryKey"`
		Code     string
		NameI18n []byte
		IsActive bool
	}

	if err := h.db.Table("shipping_zones").Order("position ASC").Find(&dbZones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil zona"},
		})
		return
	}

	var dbProvinces []struct {
		ZoneID       string
		ProvinceCode string
	}
	h.db.Table("shipping_zone_provinces").Find(&dbProvinces)

	provMap := make(map[string][]string)
	for _, p := range dbProvinces {
		provMap[p.ZoneID] = append(provMap[p.ZoneID], p.ProvinceCode)
	}

	var dbMethods []struct {
		ID                      string
		ZoneID                  string
		Code                    string
		NameI18n                []byte
		RateType                string
		BaseCost                int
		PerKgCost               int
		MaxWeightKg             *float64
		FreeShippingMinSubtotal *int
		EtaMinDays              int
		EtaMaxDays              int
		IsActive                bool
	}
	h.db.Table("shipping_methods").Order("position ASC").Find(&dbMethods)

	methMap := make(map[string][]AdminShippingMethod)
	for _, m := range dbMethods {
		var n map[string]string
		json.Unmarshal(m.NameI18n, &n)
		methMap[m.ZoneID] = append(methMap[m.ZoneID], AdminShippingMethod{
			ID:                      m.ID,
			Code:                    m.Code,
			NameI18n:                n,
			RateType:                m.RateType,
			BaseCost:                m.BaseCost,
			PerKgCost:               m.PerKgCost,
			MaxWeightKg:             m.MaxWeightKg,
			FreeShippingMinSubtotal: m.FreeShippingMinSubtotal,
			EtaMinDays:              m.EtaMinDays,
			EtaMaxDays:              m.EtaMaxDays,
			IsActive:                m.IsActive,
		})
	}

	res := make([]AdminShippingZone, 0, len(dbZones))
	for _, z := range dbZones {
		var n map[string]string
		json.Unmarshal(z.NameI18n, &n)
		procs := provMap[z.ID]
		if procs == nil {
			procs = []string{}
		}
		meths := methMap[z.ID]
		if meths == nil {
			meths = []AdminShippingMethod{}
		}
		res = append(res, AdminShippingZone{
			ID:        z.ID,
			Code:      z.Code,
			NameI18n:  n,
			IsActive:  z.IsActive,
			Provinces: procs,
			Methods:   meths,
		})
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

type UpdateMethodRequest struct {
	RateType                string   `json:"rate_type"`
	BaseCost                *int     `json:"base_cost"`
	PerKgCost               *int     `json:"per_kg_cost"`
	MaxWeightKg             *float64 `json:"max_weight_kg"`
	FreeShippingMinSubtotal *int     `json:"free_shipping_min_subtotal"`
	EtaMinDays              *int     `json:"eta_min_days"`
	EtaMaxDays              *int     `json:"eta_max_days"`
	IsActive                *bool    `json:"is_active"`
}

func (h *ShippingHandler) UpdateMethod(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMethodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "bad_request", Message: "Payload tidak valid"},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.RateType != "" {
		updates["rate_type"] = req.RateType
	}
	if req.BaseCost != nil {
		updates["base_cost"] = *req.BaseCost
	}
	if req.PerKgCost != nil {
		updates["per_kg_cost"] = *req.PerKgCost
	}
	if req.MaxWeightKg != nil {
		if *req.MaxWeightKg < 0 {
			updates["max_weight_kg"] = gorm.Expr("NULL")
		} else {
			updates["max_weight_kg"] = *req.MaxWeightKg
		}
	}
	if req.FreeShippingMinSubtotal != nil {
		if *req.FreeShippingMinSubtotal <= 0 {
			updates["free_shipping_min_subtotal"] = gorm.Expr("NULL")
		} else {
			updates["free_shipping_min_subtotal"] = *req.FreeShippingMinSubtotal
		}
	}
	if req.EtaMinDays != nil {
		updates["eta_min_days"] = *req.EtaMinDays
	}
	if req.EtaMaxDays != nil {
		updates["eta_max_days"] = *req.EtaMaxDays
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		c.JSON(http.StatusOK, httpx.Response{Data: "ok"})
		return
	}

	res := h.db.Table("shipping_methods").Where("id = ?", id).Updates(updates)
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menyimpan metode pengiriman"},
		})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Metode tidak ditemukan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: "ok"})
}
