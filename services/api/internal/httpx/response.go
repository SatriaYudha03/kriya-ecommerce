package httpx

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

type Meta struct {
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Total int64 `json:"total"`
}

type Response struct {
	Data interface{} `json:"data,omitempty"`
	Meta *Meta       `json:"meta,omitempty"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

func RespondError(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorResponse{Error: ErrorDetail{Code: code, Message: message}})
	c.Abort()
}

func ParsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 {
		limit = 20
	}
	if limit > 60 {
		limit = 60
	}
	return page, limit
}

func ResolveLocale(c *gin.Context) string {
	lang := c.Query("lang")
	if lang == "en" || lang == "id" {
		return lang
	}
	lang = c.GetHeader("Accept-Language")
	if lang == "en" || lang == "id" {
		return lang
	}
	return "id"
}

func UserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	idStr, ok := userID.(string)
	return idStr, ok
}
