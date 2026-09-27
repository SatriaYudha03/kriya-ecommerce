package aftersales

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type NotificationsHandler struct {
	repo *NotificationsRepository
}

func NewNotificationsHandler(repo *NotificationsRepository) *NotificationsHandler {
	return &NotificationsHandler{repo: repo}
}

type NotificationResponse struct {
	ID        string            `json:"id"`
	Type      string            `json:"type"`
	Title     string            `json:"title"`
	Body      string            `json:"body"`
	Link      string            `json:"link"`
	ReadAt    *time.Time        `json:"read_at"`
	CreatedAt time.Time         `json:"created_at"`
}

func (h *NotificationsHandler) ListNotifications(c *gin.Context) {
	userID, ok := httpx.UserID(c)
	if !ok {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Silakan login")
		return
	}
	pageStr := c.Query("page")
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	unreadOnly := c.Query("unread_only") == "true"

	notifs, total, err := h.repo.ListUserNotifications(userID, page, unreadOnly)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil notifikasi")
		return
	}

	lang := c.GetHeader("Accept-Language")
	if lang != "en" {
		lang = "id"
	}

	res := make([]NotificationResponse, len(notifs))
	for i, n := range notifs {
		var titles, bodies map[string]string
		_ = json.Unmarshal(n.TitleI18n, &titles)
		_ = json.Unmarshal(n.BodyI18n, &bodies)

		title := titles[lang]
		if title == "" {
			title = titles["id"]
		}
		body := bodies[lang]
		if body == "" {
			body = bodies["id"]
		}

		res[i] = NotificationResponse{
			ID:        n.ID,
			Type:      n.Type,
			Title:     title,
			Body:      body,
			Link:      n.Link,
			ReadAt:    n.ReadAt,
			CreatedAt: n.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: 10, Total: total},
	})
}

func (h *NotificationsHandler) GetUnreadCount(c *gin.Context) {
	userID, ok := httpx.UserID(c)
	if !ok {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Silakan login")
		return
	}
	count, err := h.repo.GetUnreadCount(userID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil jumlah notifikasi")
		return
	}
	
	type response struct {
		Count int64 `json:"count"`
	}
	c.JSON(http.StatusOK, httpx.Response{Data: response{Count: count}})
}

type MarkReadRequest struct {
	IDs []string `json:"ids"`
	All bool     `json:"all"`
}

func (h *NotificationsHandler) MarkAsRead(c *gin.Context) {
	userID, ok := httpx.UserID(c)
	if !ok {
		httpx.RespondError(c, http.StatusUnauthorized, "unauthorized", "Silakan login")
		return
	}
	var req MarkReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "invalid_request", "Format request tidak valid")
		return
	}

	updated, err := h.repo.MarkAsRead(userID, req.IDs, req.All)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menandai notifikasi")
		return
	}

	type response struct {
		Updated int64 `json:"updated"`
	}
	c.JSON(http.StatusOK, httpx.Response{Data: response{Updated: updated}})
}
