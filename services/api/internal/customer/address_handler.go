package customer

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type AddressHandler struct {
	repo *AddressRepository
}

func NewAddressHandler(repo *AddressRepository) *AddressHandler {
	return &AddressHandler{repo: repo}
}

type AddressRequest struct {
	Label        string  `json:"label" binding:"required,min=1,max=40"`
	Recipient    string  `json:"recipient" binding:"required,min=1,max=100"`
	Phone        string  `json:"phone" binding:"required"`
	AddressLine  string  `json:"address_line" binding:"required,min=5,max=300"`
	District     *string `json:"district"`
	City         string  `json:"city" binding:"required"`
	ProvinceCode string  `json:"province_code" binding:"required,len=2"`
	PostalCode   string  `json:"postal_code" binding:"required,len=5"`
	Notes        *string `json:"notes" binding:"omitempty,max=200"`
	IsDefault    bool    `json:"is_default"`
}

type AddressResponse struct {
	ID           string  `json:"id"`
	Label        string  `json:"label"`
	Recipient    string  `json:"recipient"`
	Phone        string  `json:"phone"`
	AddressLine  string  `json:"address_line"`
	District     *string `json:"district"`
	City         string  `json:"city"`
	ProvinceCode string  `json:"province_code"`
	Province     string  `json:"province"`
	PostalCode   string  `json:"postal_code"`
	Notes        *string `json:"notes"`
	IsDefault    bool    `json:"is_default"`
	CreatedAt    string  `json:"created_at"`
}

func toAddressResponse(a AddressWithProvince) AddressResponse {
	return AddressResponse{
		ID:           a.ID,
		Label:        a.Label,
		Recipient:    a.Recipient,
		Phone:        a.Phone,
		AddressLine:  a.AddressLine,
		District:     a.District,
		City:         a.City,
		ProvinceCode: a.ProvinceCode,
		Province:     a.ProvinceName,
		PostalCode:   a.PostalCode,
		Notes:        a.Notes,
		IsDefault:    a.IsDefault,
		CreatedAt:    a.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *AddressHandler) GetProvinces(c *gin.Context) {
	provinces, err := h.repo.GetProvinces()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil provinsi"},
		})
		return
	}
	if provinces == nil {
		provinces = []Province{}
	}
	c.JSON(http.StatusOK, httpx.Response{Data: provinces})
}

func (h *AddressHandler) GetAddresses(c *gin.Context) {
	userID := c.GetString("user_id")

	addresses, err := h.repo.GetAddresses(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil alamat"},
		})
		return
	}

	var res []AddressResponse
	for _, a := range addresses {
		res = append(res, toAddressResponse(a))
	}
	if res == nil {
		res = []AddressResponse{}
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *AddressHandler) CreateAddress(c *gin.Context) {
	userID := c.GetString("user_id")

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Data tidak valid"},
		})
		return
	}

	count, err := h.repo.CountAddresses(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal validasi"},
		})
		return
	}
	if count >= 20 {
		c.JSON(http.StatusConflict, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "conflict", Message: "Maksimal 20 alamat"},
		})
		return
	}

	isDefault := req.IsDefault
	if count == 0 {
		isDefault = true
	}

	addr := &Address{
		UserID:       userID,
		Label:        strings.TrimSpace(req.Label),
		Recipient:    strings.TrimSpace(req.Recipient),
		Phone:        strings.TrimSpace(req.Phone),
		AddressLine:  strings.TrimSpace(req.AddressLine),
		District:     req.District,
		City:         strings.TrimSpace(req.City),
		ProvinceCode: req.ProvinceCode,
		PostalCode:   req.PostalCode,
		Notes:        req.Notes,
		IsDefault:    isDefault,
	}

	if err := h.repo.CreateAddress(addr); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menyimpan alamat"},
		})
		return
	}

	// Refetch to get province_name
	addrs, _ := h.repo.GetAddresses(userID)
	var created AddressWithProvince
	for _, a := range addrs {
		if a.ID == addr.ID {
			created = a
			break
		}
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: toAddressResponse(created)})
}

func (h *AddressHandler) UpdateAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	addressID := c.Param("id")

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Data tidak valid"},
		})
		return
	}

	existing, err := h.repo.GetAddress(userID, addressID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal"},
		})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Alamat tidak ditemukan"},
		})
		return
	}

	existing.Label = strings.TrimSpace(req.Label)
	existing.Recipient = strings.TrimSpace(req.Recipient)
	existing.Phone = strings.TrimSpace(req.Phone)
	existing.AddressLine = strings.TrimSpace(req.AddressLine)
	existing.District = req.District
	existing.City = strings.TrimSpace(req.City)
	existing.ProvinceCode = req.ProvinceCode
	existing.PostalCode = req.PostalCode
	existing.Notes = req.Notes
	existing.IsDefault = req.IsDefault

	if err := h.repo.UpdateAddress(existing); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menyimpan alamat"},
		})
		return
	}

	addrs, _ := h.repo.GetAddresses(userID)
	var updated AddressWithProvince
	for _, a := range addrs {
		if a.ID == addressID {
			updated = a
			break
		}
	}

	c.JSON(http.StatusOK, httpx.Response{Data: toAddressResponse(updated)})
}

func (h *AddressHandler) DeleteAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	addressID := c.Param("id")

	existing, err := h.repo.GetAddress(userID, addressID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal"},
		})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Alamat tidak ditemukan"},
		})
		return
	}

	if err := h.repo.DeleteAddress(userID, addressID); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menghapus alamat"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"id": addressID}})
}

func (h *AddressHandler) SetDefaultAddress(c *gin.Context) {
	userID := c.GetString("user_id")
	addressID := c.Param("id")

	existing, err := h.repo.GetAddress(userID, addressID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal"},
		})
		return
	}
	if existing == nil {
		c.JSON(http.StatusNotFound, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "not_found", Message: "Alamat tidak ditemukan"},
		})
		return
	}

	if err := h.repo.SetDefaultAddress(userID, addressID); err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengubah alamat default"},
		})
		return
	}

	addrs, _ := h.repo.GetAddresses(userID)
	var updated AddressWithProvince
	for _, a := range addrs {
		if a.ID == addressID {
			updated = a
			break
		}
	}

	c.JSON(http.StatusOK, httpx.Response{Data: toAddressResponse(updated)})
}
