package hero

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/storage"
)

type Handler struct {
	repo        *Repository
	supabaseURL string
}

func NewHandler(repo *Repository, supabaseURL string) *Handler {
	return &Handler{repo: repo, supabaseURL: supabaseURL}
}

func (h *Handler) toResponse(slides []Slide) []SlideResponse {
	out := make([]SlideResponse, 0, len(slides))
	for _, s := range slides {
		out = append(out, SlideResponse{
			ID: s.ID, EyebrowID: s.EyebrowID, EyebrowEN: s.EyebrowEN,
			TitleID: s.TitleID, TitleEN: s.TitleEN,
			SubtitleID: s.SubtitleID, SubtitleEN: s.SubtitleEN,
			Href: s.Href, ImagePath: s.ImagePath,
			ImageURL: storage.PublicImageURL(h.supabaseURL, s.ImagePath),
			Alt:      s.Alt, IsActive: s.IsActive,
		})
	}
	return out
}

func (h *Handler) list(c *gin.Context, onlyActive bool) {
	slides, err := h.repo.List(onlyActive)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: h.toResponse(slides)})
}

func (h *Handler) GetPublic(c *gin.Context) { h.list(c, true) }
func (h *Handler) GetAdmin(c *gin.Context)  { h.list(c, false) }

// href harus path internal ("/...") atau URL http(s) — tolak skema lain (javascript:, dll).
func validHref(href string) bool {
	return strings.HasPrefix(href, "/") && !strings.HasPrefix(href, "//") ||
		strings.HasPrefix(href, "https://") || strings.HasPrefix(href, "http://")
}

func (h *Handler) PutAdmin(c *gin.Context) {
	var req ReplaceSlidesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", err.Error())
		return
	}
	active := 0
	for _, s := range req.Slides {
		if !validHref(s.Href) {
			httpx.RespondError(c, http.StatusBadRequest, "validation_error", "href harus diawali '/' atau http(s)://")
			return
		}
		if s.IsActive == nil || *s.IsActive {
			active++
		}
	}
	if active == 0 {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "minimal satu slide harus aktif")
		return
	}
	if err := h.repo.Replace(req.Slides); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	h.list(c, false)
}
