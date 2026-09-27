package aftersales

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/httpx"
)

type ReturnsHandler struct {
	returnsRepo *ReturnsRepository
	orderRepo   *OrderRepository
	adminRepo   *AdminRepository
	ports       checkout.Ports
}

func NewReturnsHandler(returnsRepo *ReturnsRepository, orderRepo *OrderRepository, adminRepo *AdminRepository, ports checkout.Ports) *ReturnsHandler {
	return &ReturnsHandler{
		returnsRepo: returnsRepo,
		orderRepo:   orderRepo,
		adminRepo:   adminRepo,
		ports:       ports,
	}
}

func (h *ReturnsHandler) CreateReturnRequest(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	orderID := c.Param("id")

	var req CreateReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Data tidak valid")
		return
	}

	order, err := h.orderRepo.GetByIDForUser(orderID, userID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal cek pesanan")
		return
	}
	if order == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	}

	if order.Status != "completed" {
		httpx.RespondError(c, http.StatusConflict, "invalid_status", "Hanya pesanan selesai yang dapat diretur")
		return
	}

	// Cek return window 7 hari (simplifikasi)
	if order.CompletedAt != nil {
		limitDate := order.CompletedAt.Add(7 * 24 * time.Hour)
		if time.Now().After(limitDate) {
			httpx.RespondError(c, http.StatusConflict, "return_window_expired", "Batas waktu retur sudah habis")
			return
		}
	}

	hasOpen, err := h.returnsRepo.HasOpenReturnRequest(orderID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal cek status retur")
		return
	}
	if hasOpen {
		httpx.RespondError(c, http.StatusConflict, "duplicate_return", "Sudah ada pengajuan retur aktif untuk pesanan ini")
		return
	}

	// Validate items
	items := make([]ReturnRequestItem, 0, len(req.Items))
	for _, reqItem := range req.Items {
		var orderItem *OrderItem
		for _, oi := range order.Items {
			if oi.ID == reqItem.OrderItemID {
				orderItem = &oi
				break
			}
		}
		if orderItem == nil {
			httpx.RespondError(c, http.StatusBadRequest, "invalid_item", "Item tidak ditemukan di pesanan ini")
			return
		}

		availableQty := orderItem.Qty - orderItem.RefundedQty
		if reqItem.Qty <= 0 || reqItem.Qty > availableQty {
			httpx.RespondError(c, http.StatusBadRequest, "invalid_qty", "Kuantitas retur tidak valid (melebihi sisa yang bisa diretur)")
			return
		}

		items = append(items, ReturnRequestItem{
			OrderItemID: reqItem.OrderItemID,
			Qty:         reqItem.Qty,
		})
	}

	retReq := &ReturnRequest{
		OrderID:     orderID,
		UserID:      userID,
		ReasonCode:  req.ReasonCode,
		Description: req.Description,
		Status:      "requested",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.returnsRepo.CreateReturnRequest(retReq, items); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal membuat pengajuan retur")
		return
	}

	created, err := h.returnsRepo.GetReturnRequestByID(retReq.ID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal fetch pengajuan")
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: mapReturnRequestResponse(*created)})
}

func (h *ReturnsHandler) ListReturnRequests(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	page, limit := httpx.ParsePagination(c)
	
	returns, total, err := h.returnsRepo.ListReturnRequests(userID, page, limit)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil daftar retur")
		return
	}

	res := make([]ReturnRequestResponse, 0, len(returns))
	for _, rr := range returns {
		res = append(res, mapReturnRequestResponse(rr))
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReturnsHandler) GetReturnRequest(c *gin.Context) {
	userID, _ := httpx.UserID(c)
	id := c.Param("id")

	rr, err := h.returnsRepo.GetReturnRequestByID(id)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil data retur")
		return
	}
	if rr == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Retur tidak ditemukan")
		return
	}
	if rr.UserID != userID {
		httpx.RespondError(c, http.StatusForbidden, "forbidden", "Bukan retur Anda")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: mapReturnRequestResponse(*rr)})
}

func (h *ReturnsHandler) AdminListReturns(c *gin.Context) {
	page, limit := httpx.ParsePagination(c)
	status := c.Query("status")

	returns, total, err := h.returnsRepo.ListAdminReturnRequests(page, limit, status)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil daftar retur")
		return
	}

	res := make([]ReturnRequestResponse, 0, len(returns))
	for _, rr := range returns {
		res = append(res, mapReturnRequestResponse(rr))
	}

	c.JSON(http.StatusOK, httpx.Response{
		Data: res,
		Meta: &httpx.Meta{Page: page, Limit: limit, Total: total},
	})
}

func (h *ReturnsHandler) AdminUpdateReturnStatus(c *gin.Context) {
	id := c.Param("id")

	var req AdminUpdateReturnStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Data tidak valid")
		return
	}

	rr, err := h.returnsRepo.GetReturnRequestByID(id)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengecek retur")
		return
	}
	if rr == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Retur tidak ditemukan")
		return
	}

	// Validate transition
	valid := false
	if rr.Status == "requested" && (req.Status == "approved" || req.Status == "rejected") {
		valid = true
	} else if rr.Status == "approved" && req.Status == "received" {
		valid = true
	}

	if !valid {
		httpx.RespondError(c, http.StatusConflict, "invalid_transition", "Transisi status tidak diizinkan")
		return
	}

	if err := h.returnsRepo.UpdateReturnStatus(id, req.Status, req.AdminNote); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal update status")
		return
	}

	c.JSON(http.StatusOK, httpx.Response{Data: StatusOKResponse{Status: "ok"}})
}

func (h *ReturnsHandler) AdminCreateRefund(c *gin.Context) {
	adminID, _ := httpx.UserID(c)
	orderID := c.Param("id")

	var req CreateRefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.RespondError(c, http.StatusBadRequest, "validation_error", "Data tidak valid")
		return
	}

	order, err := h.adminRepo.GetOrder(orderID)
	if err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal mengambil pesanan")
		return
	}
	if order == nil {
		httpx.RespondError(c, http.StatusNotFound, "not_found", "Pesanan tidak ditemukan")
		return
	}

	var totalRefundAmount int
	var items []RefundItem
	var resItems []RefundItemResponse

	// Kalkulasi amount per item
	for _, reqItem := range req.Items {
		var orderItem *OrderItem
		for _, oi := range order.Items {
			if oi.ID == reqItem.OrderItemID {
				orderItem = &oi
				break
			}
		}
		if orderItem == nil {
			httpx.RespondError(c, http.StatusBadRequest, "invalid_item", "Item tidak ditemukan")
			return
		}

		availableQty := orderItem.Qty - orderItem.RefundedQty
		if reqItem.Qty <= 0 || reqItem.Qty > availableQty {
			httpx.RespondError(c, http.StatusBadRequest, "invalid_qty", "Kuantitas refund melebihi yang tersedia")
			return
		}

		itemDiscountPerQty := orderItem.DiscountAmount / orderItem.Qty
		unitRefundAmount := orderItem.Price - itemDiscountPerQty
		lineAmount := unitRefundAmount * reqItem.Qty

		totalRefundAmount += lineAmount
		items = append(items, RefundItem{
			OrderItemID: reqItem.OrderItemID,
			Qty:         reqItem.Qty,
			Amount:      lineAmount,
		})
		resItems = append(resItems, RefundItemResponse{
			OrderItemID: reqItem.OrderItemID,
			Qty:         reqItem.Qty,
			Amount:      lineAmount,
		})
	}

	// Cek apakah semua item di-refund 
	// (jumlah qty yg direfund + yg sudah direfund = total qty awal)
	allRefunded := true
	for _, oi := range order.Items {
		reqQty := 0
		for _, ri := range req.Items {
			if ri.OrderItemID == oi.ID {
				reqQty = ri.Qty
				break
			}
		}
		if (oi.RefundedQty + reqQty) < oi.Qty {
			allRefunded = false
			break
		}
	}

	shippingAmount := 0
	if allRefunded {
		// Asumsi kita hanya menambahkan biaya ongkir yg belum di-refund
		// Karena tabel refunds mungkin menyimpan ongkir sebelumnya, kita cukup tambahkan sisa ongkir.
		// Sisa ongkir = order.ShippingCost - order.ShippingDiscount. Wait, is that it?
		// "Ongkir: jika semua item di-refund -> tambah shipping_cost."
		shippingAmount = order.ShippingCost - order.ShippingDiscount
		if shippingAmount < 0 {
			shippingAmount = 0
		}
		totalRefundAmount += shippingAmount
	}

	// Validasi refundable amount
	if totalRefundAmount > order.RefundableAmount {
		httpx.RespondError(c, http.StatusConflict, "amount_exceeded", "Total refund melebihi batas maksimal")
		return
	}

	refund := &Refund{
		OrderID:        orderID,
		ReturnID:       req.ReturnID,
		Amount:         totalRefundAmount,
		ShippingAmount: shippingAmount,
		Restock:        req.Restock,
		Reason:         req.Note,
		CreatedBy:      &adminID,
		Method:         "manual",
		CreatedAt:      time.Now(),
	}

	if err := h.returnsRepo.CreateRefund(c, refund, items, order, adminID, h.ports); err != nil {
		httpx.RespondError(c, http.StatusInternalServerError, "internal", "Gagal memproses refund")
		return
	}

	c.JSON(http.StatusCreated, httpx.Response{Data: RefundResponse{
		ID:             refund.ID,
		OrderID:        refund.OrderID,
		Amount:         refund.Amount,
		ShippingAmount: refund.ShippingAmount,
		Restock:        refund.Restock,
		CreatedAt:      refund.CreatedAt,
		Items:          resItems,
	}})
}

func mapReturnRequestResponse(rr ReturnRequest) ReturnRequestResponse {
	items := make([]ReturnRequestItemResponse, 0, len(rr.Items))
	for _, it := range rr.Items {
		var productName, productSlug, thumbnail string
		if it.ProductName != nil { productName = *it.ProductName }
		if it.ProductSlug != nil { productSlug = *it.ProductSlug }
		if it.ThumbnailURL != nil { thumbnail = *it.ThumbnailURL }
		
		items = append(items, ReturnRequestItemResponse{
			OrderItemID:  it.OrderItemID,
			Qty:          it.Qty,
			ProductName:  productName,
			ProductSlug:  productSlug,
			ThumbnailURL: thumbnail,
		})
	}
	return ReturnRequestResponse{
		ID:          rr.ID,
		OrderID:     rr.OrderID,
		OrderNumber: rr.OrderNumber,
		Status:      rr.Status,
		ReasonCode:  rr.ReasonCode,
		Description: rr.Description,
		AdminNote:   rr.AdminNote,
		CreatedAt:   rr.CreatedAt,
		ResolvedAt:  rr.ResolvedAt,
		Items:       items,
	}
}
