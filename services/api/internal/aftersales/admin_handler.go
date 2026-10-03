package aftersales

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/httpx"
	"github.com/kriya-commerce/api/internal/orderflow"
	"github.com/kriya-commerce/api/internal/service"
	"gorm.io/gorm"
)

type AdminHandler struct {
	repo      *AdminRepository
	orderRepo *OrderRepository
	ports     checkout.Ports
	midtrans  *service.MidtransService
	processor *checkout.PaymentProcessor
}

func NewAdminHandler(repo *AdminRepository, orderRepo *OrderRepository, ports checkout.Ports, midtrans *service.MidtransService, processor *checkout.PaymentProcessor) *AdminHandler {
	return &AdminHandler{repo: repo, orderRepo: orderRepo, ports: ports, midtrans: midtrans, processor: processor}
}

// ListOrders mengambil semua pesanan dari DB dengan pagination & filter status.
func (h *AdminHandler) ListOrders(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 60 {
		limit = 60
	}
	if page < 1 {
		page = 1
	}

	orders, total, err := h.repo.ListAllOrders(page, limit, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	res := make([]OrderResponse, 0, len(orders))
	for _, o := range orders {
		res = append(res, ToOrderResponse(o, "id")) // default to id for admin
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{
			Page:  page,
			Limit: limit,
			Total: total,
		},
	})
}

// GetOrder mendapatkan detail pesanan.
func (h *AdminHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")

	order, err := h.repo.GetOrder(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal mengambil pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: ToOrderResponse(*order, "id")})
}

// UpdateOrderStatus memperbarui status pesanan lewat orderflow.Transition.
func (h *AdminHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var req AdminUpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	adminID := c.GetString("user_id")

	// Admin membatalkan order pending: pastikan tidak ada lagi yang bisa dibayar di Midtrans
	// sebelum order ditutup (sama dengan pembatalan oleh pembeli).
	if orderflow.Status(req.Status) == orderflow.StatusCancelled {
		var current string
		if err := h.repo.DB.Table("orders").Select("status").Where("id = ?", id).Scan(&current).Error; err != nil {
			httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
			return
		}
		if orderflow.Status(current) == orderflow.StatusPendingPayment {
			if err := checkout.ClosePayableAttempts(c.Request.Context(), h.repo.DB, h.midtrans, h.processor, id); err != nil {
				respondClosePaymentError(c, id, err)
				return
			}
		}
	}

	var newStatus orderflow.Status
	err := h.repo.DB.Transaction(func(tx *gorm.DB) error {
		in := orderflow.TransitionInput{
			OrderID:        id,
			To:             orderflow.Status(req.Status),
			Actor:          checkout.ActorAdmin,
			ActorID:        &adminID,
			Note:           req.Note,
			Courier:        req.Courier,
			TrackingNumber: req.TrackingNumber,
			CancelReason:   req.CancelReason,
		}

		st, err := orderflow.Transition(c.Request.Context(), tx, h.ports, in)
		if err != nil {
			return err
		}
		newStatus = st
		return nil
	})

	if err != nil {
		var invalidErr *orderflow.InvalidTransitionError
		var missingShipmentErr *orderflow.MissingShipmentInfoError
		if errors.As(err, &missingShipmentErr) {
			c.JSON(http.StatusConflict, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "shipment_info_required", Message: err.Error()},
			})
			return
		}
		if errors.As(err, &invalidErr) {
			c.JSON(http.StatusConflict, httpx.ErrorResponse{
				Error: httpx.ErrorDetail{Code: "invalid_transition", Message: err.Error()},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal memperbarui status pesanan"},
		})
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: map[string]string{"status": string(newStatus)}})
}

// AddOrderNote menambahkan catatan.
func (h *AdminHandler) AddOrderNote(c *gin.Context) {
	id := c.Param("id")
	var req AdminNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "validation_error", Message: "Body tidak valid"},
		})
		return
	}

	adminID := c.GetString("user_id")

	err := h.repo.AddOrderNote(id, adminID, req.Body, req.IsCustomerVisible)
	if err != nil {
		c.JSON(http.StatusInternalServerError, httpx.ErrorResponse{
			Error: httpx.ErrorDetail{Code: "internal", Message: "Gagal menambah catatan"},
		})
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: map[string]string{"status": "ok"}})
}

// CreateProduct membuat produk baru lengkap beserta varian & gambarnya.
