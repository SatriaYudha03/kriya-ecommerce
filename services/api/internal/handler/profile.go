package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/model"
	"github.com/kriya-commerce/api/internal/repository"
)

type ProfileHandler struct {
	repo *repository.ProfileRepository
}

func NewProfileHandler(repo *repository.ProfileRepository) *ProfileHandler {
	return &ProfileHandler{repo: repo}
}

// deref mengubah *string nullable dari DB menjadi string biasa untuk respons.
func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GET /api/v1/profile — data diri + alamat default milik user yang login.
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	p, err := h.repo.GetByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil profil"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: toProfileResponse(p)})
}

// PUT /api/v1/profile — simpan/replace data diri + alamat default.
func (h *ProfileHandler) PutProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	var req model.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	fields := repository.ProfileFields{
		FullName:    strings.TrimSpace(req.FullName),
		Phone:       strings.TrimSpace(req.Phone),
		AddressLine: strings.TrimSpace(req.AddressLine),
		City:        strings.TrimSpace(req.City),
		Province:    strings.TrimSpace(req.Province),
		PostalCode:  strings.TrimSpace(req.PostalCode),
	}

	if err := h.repo.Update(userID, fields); err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal menyimpan profil"},
		})
		return
	}

	p, err := h.repo.GetByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Error: model.ErrorDetail{Code: "internal", Message: "Gagal mengambil profil"},
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{Data: toProfileResponse(p)})
}

func toProfileResponse(p *repository.Profile) model.ProfileResponse {
	return model.ProfileResponse{
		FullName:    deref(p.FullName),
		Phone:       deref(p.Phone),
		AddressLine: deref(p.AddressLine),
		City:        deref(p.City),
		Province:    deref(p.Province),
		PostalCode:  deref(p.PostalCode),
	}
}
