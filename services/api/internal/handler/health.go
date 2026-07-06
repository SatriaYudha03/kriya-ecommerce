package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Health → {"data":{"status":"ok"}} (KRIYA-MASTER.md M0).
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"status": "ok"}})
}
