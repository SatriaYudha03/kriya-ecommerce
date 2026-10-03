package promo

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/httpx"
)

type AdminHandler struct {
	repo *AdminRepository
}

func NewAdminHandler(repo *AdminRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

// Stats mengembalikan metrik ringkas untuk dashboard admin.
func (h *AdminHandler) Stats(c *gin.Context) {
	stats, err := h.repo.Stats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil statistik"},
		})
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: stats})
}

func (h *AdminHandler) ReportSummary(c *gin.Context) {
	from := c.DefaultQuery("from", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))

	res, err := h.repo.ReportSummary(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil summary: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *AdminHandler) ReportSales(c *gin.Context) {
	from := c.DefaultQuery("from", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))
	interval := c.DefaultQuery("interval", "day")
	format := c.DefaultQuery("format", "json")

	res, err := h.repo.ReportSales(from, to, interval)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil sales report: " + err.Error()},
		})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", fmt.Sprintf("attachment;filename=sales_report_%s_to_%s.csv", from, to))
		writer := csv.NewWriter(c.Writer)
		writer.Write([]string{"period", "orders_count", "gross_sales", "discount_total", "refunded_total", "net_sales", "shipping_total"})
		for _, item := range res {
			writer.Write([]string{
				item.Period,
				strconv.Itoa(item.OrdersCount),
				strconv.FormatInt(item.GrossSales, 10),
				strconv.FormatInt(item.DiscountTotal, 10),
				strconv.FormatInt(item.RefundedTotal, 10),
				strconv.FormatInt(item.NetSales, 10),
				strconv.FormatInt(item.ShippingTotal, 10),
			})
		}
		writer.Flush()
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

// ReportBreakdown mengembalikan jumlah pesanan per status dan penjualan per
// kategori induk untuk periode from–to (default 30 hari terakhir).
func (h *AdminHandler) ReportBreakdown(c *gin.Context) {
	from := c.DefaultQuery("from", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))

	res, err := h.repo.ReportBreakdown(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil breakdown: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}

func (h *AdminHandler) ReportTopProducts(c *gin.Context) {
	from := c.DefaultQuery("from", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	to := c.DefaultQuery("to", time.Now().Format("2006-01-02"))
	limitStr := c.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 {
		limit = 10
	}

	res, err := h.repo.ReportTopProducts(from, to, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil top products: " + err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: res})
}
