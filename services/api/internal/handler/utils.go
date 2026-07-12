package handler

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
)

func resolveLocale(c *gin.Context) string {
	lang := c.Query("lang")
	if lang == "" {
		lang = c.GetHeader("Accept-Language")
	}
	if lang == "en" {
		return "en"
	}
	return "id"
}

func getI18nString(data []byte, locale string, fallback string) string {
	if len(data) == 0 || string(data) == "{}" {
		return fallback
	}
	var m map[string]string
	if err := json.Unmarshal(data, &m); err == nil {
		if val, ok := m[locale]; ok && val != "" {
			return val
		}
		if val, ok := m["id"]; ok && val != "" {
			return val
		}
		if val, ok := m["en"]; ok && val != "" {
			return val
		}
	}
	return fallback
}
