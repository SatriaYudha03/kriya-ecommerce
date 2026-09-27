package aftersales

import (
	"context"
	"errors"
	"time"

	"github.com/kriya-commerce/api/internal/checkout"
	"github.com/kriya-commerce/api/internal/orderflow"
	"gorm.io/gorm"
)

type ReturnsRepository struct {
	db *gorm.DB
}

func NewReturnsRepository(db *gorm.DB) *ReturnsRepository {
	return &ReturnsRepository{db: db}
}

func (r *ReturnsRepository) CreateReturnRequest(req *ReturnRequest, items []ReturnRequestItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(req).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].ReturnID = req.ID
		}
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *ReturnsRepository) HasOpenReturnRequest(orderID string) (bool, error) {
	var count int64
	err := r.db.Model(&ReturnRequest{}).
		Where("order_id = ? AND status IN ('requested', 'approved', 'received')", orderID).
		Count(&count).Error
	return count > 0, err
}

func (r *ReturnsRepository) ListReturnRequests(userID string, page, limit int) ([]ReturnRequest, int64, error) {
	var returns []ReturnRequest
	offset := (page - 1) * limit

	q := r.db.Model(&ReturnRequest{}).
		Select("return_requests.*, orders.order_number").
		Joins("LEFT JOIN orders ON orders.id = return_requests.order_id").
		Where("return_requests.user_id = ?", userID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("return_requests.created_at DESC").
		Offset(offset).Limit(limit).Find(&returns).Error
	if err != nil {
		return nil, 0, err
	}

	if len(returns) == 0 {
		return returns, 0, nil
	}

	returnIDs := make([]string, len(returns))
	for i, rr := range returns {
		returnIDs[i] = rr.ID
	}

	var items []ReturnRequestItem
	err = r.db.Model(&ReturnRequestItem{}).
		Select("return_request_items.*, p.name as product_name, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN order_items oi ON oi.id = return_request_items.order_item_id").
		Joins("LEFT JOIN products p ON p.id = oi.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("return_request_items.return_id IN ?", returnIDs).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	itemsMap := make(map[string][]ReturnRequestItem)
	for _, it := range items {
		itemsMap[it.ReturnID] = append(itemsMap[it.ReturnID], it)
	}

	for i := range returns {
		returns[i].Items = itemsMap[returns[i].ID]
	}

	return returns, total, nil
}

func (r *ReturnsRepository) GetReturnRequestByID(id string) (*ReturnRequest, error) {
	var rr ReturnRequest
	err := r.db.Model(&ReturnRequest{}).
		Select("return_requests.*, orders.order_number").
		Joins("LEFT JOIN orders ON orders.id = return_requests.order_id").
		Where("return_requests.id = ?", id).
		First(&rr).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	err = r.db.Model(&ReturnRequestItem{}).
		Select("return_request_items.*, p.name as product_name, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN order_items oi ON oi.id = return_request_items.order_item_id").
		Joins("LEFT JOIN products p ON p.id = oi.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("return_request_items.return_id = ?", id).
		Find(&rr.Items).Error
	if err != nil {
		return nil, err
	}

	return &rr, nil
}

func (r *ReturnsRepository) ListAdminReturnRequests(page, limit int, status string) ([]ReturnRequest, int64, error) {
	var returns []ReturnRequest
	offset := (page - 1) * limit

	q := r.db.Model(&ReturnRequest{}).
		Select("return_requests.*, orders.order_number").
		Joins("LEFT JOIN orders ON orders.id = return_requests.order_id")

	if status != "" {
		q = q.Where("return_requests.status = ?", status)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("return_requests.created_at DESC").
		Offset(offset).Limit(limit).Find(&returns).Error
	if err != nil {
		return nil, 0, err
	}

	if len(returns) == 0 {
		return returns, 0, nil
	}

	returnIDs := make([]string, len(returns))
	for i, rr := range returns {
		returnIDs[i] = rr.ID
	}

	var items []ReturnRequestItem
	err = r.db.Model(&ReturnRequestItem{}).
		Select("return_request_items.*, p.name as product_name, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN order_items oi ON oi.id = return_request_items.order_item_id").
		Joins("LEFT JOIN products p ON p.id = oi.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("return_request_items.return_id IN ?", returnIDs).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	itemsMap := make(map[string][]ReturnRequestItem)
	for _, it := range items {
		itemsMap[it.ReturnID] = append(itemsMap[it.ReturnID], it)
	}

	for i := range returns {
		returns[i].Items = itemsMap[returns[i].ID]
	}

	return returns, total, nil
}

func (r *ReturnsRepository) UpdateReturnStatus(id, newStatus string, adminNote *string) error {
	updates := map[string]interface{}{
		"status":     newStatus,
		"updated_at": time.Now(),
	}
	if adminNote != nil {
		updates["admin_note"] = *adminNote
	}
	if newStatus == "rejected" || newStatus == "refunded" || newStatus == "cancelled" {
		now := time.Now()
		updates["resolved_at"] = &now
	}

	return r.db.Model(&ReturnRequest{}).Where("id = ?", id).Updates(updates).Error
}

func (r *ReturnsRepository) CreateRefund(ctx context.Context, refund *Refund, items []RefundItem, order *Order, adminID string, ports checkout.Ports) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(refund).Error; err != nil {
			return err
		}
		
		for i := range items {
			items[i].RefundID = refund.ID
		}
		if err := tx.Create(&items).Error; err != nil {
			return err
		}

		for _, item := range items {
			if err := tx.Model(&OrderItem{}).
				Where("id = ?", item.OrderItemID).
				UpdateColumn("refunded_qty", gorm.Expr("refunded_qty + ?", item.Qty)).Error; err != nil {
				return err
			}
		}

		if refund.ReturnID != nil {
			now := time.Now()
			if err := tx.Model(&ReturnRequest{}).Where("id = ?", *refund.ReturnID).
				Updates(map[string]interface{}{
					"status":      "refunded",
					"resolved_at": &now,
					"updated_at":  now,
				}).Error; err != nil {
				return err
			}
		}

		if refund.Restock {
			var rItems []checkout.RestockItem
			for _, item := range items {
				var oi OrderItem
				if err := tx.Where("id = ?", item.OrderItemID).First(&oi).Error; err != nil {
					return err
				}
				rItems = append(rItems, checkout.RestockItem{
					VariantID: oi.VariantID,
					Qty:       item.Qty,
				})
			}
			// Port legacy fallback is already handled inside the struct if uninitialized
			if ports.Inventory != nil {
				var reasonStr string
				if refund.Reason != nil {
					reasonStr = *refund.Reason
				}
				if err := ports.Inventory.Restock(ctx, tx, order.ID, rItems, &adminID, reasonStr); err != nil {
					return err
				}
			}
		}

		var totalRefunds int
		if err := tx.Model(&Refund{}).Where("order_id = ?", order.ID).Select("COALESCE(SUM(amount), 0)").Scan(&totalRefunds).Error; err != nil {
			return err
		}

		if totalRefunds >= order.Total && order.Status != string(orderflow.StatusRefunded) {
			reasonStr := ""
			if refund.Reason != nil {
				reasonStr = *refund.Reason
			}
			in := orderflow.TransitionInput{
				OrderID: order.ID,
				To:      orderflow.StatusRefunded,
				Actor:   checkout.ActorAdmin,
				ActorID: &adminID,
				Note:    reasonStr,
			}
			_, err := orderflow.Transition(ctx, tx, ports, in)
			if err != nil {
				return err // Need to return the err, if it's not merged yet, we can fallback, but the task says "Transition sudah diimplementasi D2".
			}
		}
		return nil
	})
}
