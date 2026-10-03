package checkout

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/kriya-commerce/api/internal/httpx"
	"gorm.io/gorm"
)

// anomalyRecord — satu baris payment_anomalies (migrasi 017): uang masuk untuk order yang
// sudah tertutup, atau pembayaran kedua untuk order yang sudah lunas.
type anomalyRecord struct {
	OrderID, MidtransOrderID, Kind string
	OrderStatus, TransactionStatus string
	GrossAmount                    string
	Raw                            []byte
}

// insertAnomaly idempoten per (midtrans_order_id, kind): notifikasi ulang Midtrans tidak
// menggandakan anomali. inserted=false bila sudah pernah tercatat.
func insertAnomaly(ctx context.Context, tx *gorm.DB, r anomalyRecord) (bool, error) {
	res := tx.WithContext(ctx).Exec(`
		INSERT INTO payment_anomalies
			(order_id, midtrans_order_id, kind, order_status, transaction_status, gross_amount, raw)
		VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), CAST(NULLIF(?, '') AS jsonb))
		ON CONFLICT (midtrans_order_id, kind) DO NOTHING`,
		r.OrderID, r.MidtransOrderID, r.Kind, r.OrderStatus, r.TransactionStatus, r.GrossAmount, string(r.Raw))
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

type PaymentAnomalyResponse struct {
	ID                string     `json:"id"`
	OrderID           string     `json:"order_id"`
	OrderNumber       string     `json:"order_number"`
	OrderTotal        int        `json:"order_total"`
	MidtransOrderID   string     `json:"midtrans_order_id"`
	Kind              string     `json:"kind"`
	OrderStatus       string     `json:"order_status"`
	TransactionStatus string     `json:"transaction_status"`
	GrossAmount       *string    `json:"gross_amount"`
	Resolution        *string    `json:"resolution"`
	ResolutionNote    *string    `json:"resolution_note"`
	ResolvedBy        *string    `json:"resolved_by"`
	ResolvedAt        *time.Time `json:"resolved_at"`
	CreatedAt         time.Time  `json:"created_at"`
}

type ResolveAnomalyRequest struct {
	Resolution string  `json:"resolution" binding:"required,oneof=refunded ignored"`
	Note       *string `json:"note" binding:"omitempty,max=2000"`
}

type anomalyRow struct {
	ID                string
	OrderID           string
	OrderNumber       string
	OrderTotal        int
	MidtransOrderID   string
	Kind              string
	OrderStatus       string
	TransactionStatus string
	GrossAmount       *string
	Resolution        *string
	ResolutionNote    *string
	ResolvedBy        *string
	ResolvedAt        *time.Time
	CreatedAt         time.Time
}

func (r anomalyRow) toResponse() PaymentAnomalyResponse {
	return PaymentAnomalyResponse{
		ID: r.ID, OrderID: r.OrderID, OrderNumber: r.OrderNumber, OrderTotal: r.OrderTotal,
		MidtransOrderID: r.MidtransOrderID, Kind: r.Kind, OrderStatus: r.OrderStatus,
		TransactionStatus: r.TransactionStatus, GrossAmount: r.GrossAmount,
		Resolution: r.Resolution, ResolutionNote: r.ResolutionNote, ResolvedBy: r.ResolvedBy,
		ResolvedAt: r.ResolvedAt, CreatedAt: r.CreatedAt,
	}
}

type AnomalyHandler struct{ db *gorm.DB }

func NewAnomalyHandler(db *gorm.DB) *AnomalyHandler { return &AnomalyHandler{db: db} }

func (h *AnomalyHandler) baseQuery(ctx context.Context) *gorm.DB {
	return h.db.WithContext(ctx).Table("payment_anomalies a").
		Joins("JOIN orders o ON o.id = a.order_id").
		Select(`a.id, a.order_id, o.order_number, o.total AS order_total, a.midtrans_order_id,
			a.kind, a.order_status, a.transaction_status, a.gross_amount, a.resolution,
			a.resolution_note, a.resolved_by, a.resolved_at, a.created_at`)
}

// List — GET /admin/payment-anomalies?status=open|resolved|all (default open).
func (h *AnomalyHandler) List(c *gin.Context) {
	page, limit := httpx.ParsePagination(c)
	ctx := c.Request.Context()
	q := h.baseQuery(ctx)
	switch c.DefaultQuery("status", "open") {
	case "open":
		q = q.Where("a.resolved_at IS NULL")
	case "resolved":
		q = q.Where("a.resolved_at IS NOT NULL")
	case "all":
	default:
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "status harus open, resolved, atau all")
		return
	}
	var total int64
	if err := q.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil anomali pembayaran")
		return
	}
	var rows []anomalyRow
	if err := q.Order("a.created_at DESC").Limit(limit).Offset((page - 1) * limit).Scan(&rows).Error; err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil anomali pembayaran")
		return
	}
	res := make([]PaymentAnomalyResponse, 0, len(rows))
	for _, r := range rows {
		res = append(res, r.toResponse())
	}
	c.JSON(http.StatusOK, httpx.Response{Data: res, Meta: &httpx.Meta{Page: page, Limit: limit, Total: total}})
}

type anomalyResolveUpdate struct {
	Resolution     string    `gorm:"column:resolution"`
	ResolutionNote *string   `gorm:"column:resolution_note"`
	ResolvedBy     *string   `gorm:"column:resolved_by"`
	ResolvedAt     time.Time `gorm:"column:resolved_at"`
}

// Resolve — POST /admin/payment-anomalies/:id/resolve. Hanya mencatat tindak lanjut admin
// (refund dilakukan manual di dashboard Midtrans); anomali yang sudah selesai -> 409.
func (h *AnomalyHandler) Resolve(c *gin.Context) {
	id := c.Param("id")
	if _, err := uuid.Parse(id); err != nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Anomali tidak ditemukan")
		return
	}
	var req ResolveAnomalyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "resolution harus refunded atau ignored")
		return
	}
	var resolvedBy *string
	if adminID, ok := httpx.UserID(c); ok && adminID != "" {
		resolvedBy = &adminID
	}
	ctx := c.Request.Context()
	res := h.db.WithContext(ctx).Table("payment_anomalies").
		Where("id = ? AND resolved_at IS NULL", id).
		Updates(&anomalyResolveUpdate{
			Resolution: req.Resolution, ResolutionNote: req.Note,
			ResolvedBy: resolvedBy, ResolvedAt: time.Now(),
		})
	if res.Error != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal menyimpan tindak lanjut")
		return
	}
	var row anomalyRow
	err := h.baseQuery(ctx).Where("a.id = ?", id).Take(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Anomali tidak ditemukan")
		return
	}
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil anomali")
		return
	}
	if res.RowsAffected == 0 {
		httpx.RespondError(c, http.StatusConflict, "conflict", "Anomali sudah ditindaklanjuti")
		return
	}
	c.JSON(http.StatusOK, httpx.Response{Data: row.toResponse()})
}
