package customer

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type SettingsHandler struct {
	repo *SettingsRepository
}

func NewSettingsHandler(repo *SettingsRepository) *SettingsHandler {
	return &SettingsHandler{repo: repo}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	settings, err := h.repo.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()},
		})
		return
	}

	res := AdminSettingsResponse{
		StoreName:                settings.StoreName,
		SupportEmail:             settings.SupportEmail,
		SupportPhone:             settings.SupportPhone,
		TaxRateBP:                settings.TaxRateBP,
		PricesIncludeTax:         settings.PricesIncludeTax,
		PendingPaymentTTLMinutes: settings.PendingPaymentTTLMinutes,
		ReturnWindowDays:         settings.ReturnWindowDays,
		LowStockThresholdDefault: settings.LowStockThresholdDefault,
	}
	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req AdminUpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: err.Error()},
		})
		return
	}

	if err := h.repo.UpdateSettings(&req); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{})
}

func (h *SettingsHandler) GetPublicStore(c *gin.Context) {
	settings, err := h.repo.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: err.Error()},
		})
		return
	}

	res := PublicStoreResponse{
		StoreName:        settings.StoreName,
		SupportEmail:     settings.SupportEmail,
		SupportPhone:     settings.SupportPhone,
		TaxRateBP:        settings.TaxRateBP,
		PricesIncludeTax: settings.PricesIncludeTax,
		ReturnWindowDays: settings.ReturnWindowDays,
	}
	c.JSON(http.StatusOK, httpx.Response{Data: res})
}
