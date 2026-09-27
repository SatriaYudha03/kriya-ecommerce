package aftersales

import (
	"encoding/json"

	"gorm.io/gorm"
)

// AdminRepository menangani query khusus admin untuk pesanan.
type AdminRepository struct {
	DB *gorm.DB
}

func NewAdminRepository(db *gorm.DB) *AdminRepository {
	return &AdminRepository{DB: db}
}


// ListAllOrders mengambil semua pesanan dari DB beserta relasinya.
func (r *AdminRepository) ListAllOrders(page, limit int, status string) ([]Order, int64, error) {
	var orders []Order

	// Query 1: Orders
	q := r.DB.Model(&Order{}).
		Select("orders.*, COUNT(*) OVER() as total_count, pa.status as pa_status, pa.expires_at as pa_expires_at").
		Joins("LEFT JOIN payment_attempts pa ON pa.order_id = orders.id AND pa.status = 'active'")

	if status != "" {
		q = q.Where("orders.status = ?", status)
	}

	offset := (page - 1) * limit
	err := q.Order("orders.created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&orders).Error

	if err != nil {
		return nil, 0, err
	}

	if len(orders) == 0 {
		return nil, 0, nil
	}

	total := int64(0)
	if len(orders) > 0 {
		total = orders[0].TotalCount
	}

	orderIDs := make([]string, len(orders))
	for i, o := range orders {
		orderIDs[i] = o.ID
	}

	// Query 2: Items
	var items []OrderItem
	err = r.DB.Model(&OrderItem{}).
		Select("order_items.*, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN products p ON p.id = order_items.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("order_items.order_id IN ?", orderIDs).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	// Query 3: Events
	var events []OrderEvent
	err = r.DB.Model(&OrderEvent{}).
		Where("order_id IN ?", orderIDs).
		Order("created_at ASC").
		Find(&events).Error
	if err != nil {
		return nil, 0, err
	}

	itemsByOrderID := make(map[string][]OrderItem)
	for _, it := range items {
		itemsByOrderID[it.OrderID] = append(itemsByOrderID[it.OrderID], it)
	}
	eventsByOrderID := make(map[string][]OrderEvent)
	for _, ev := range events {
		eventsByOrderID[ev.OrderID] = append(eventsByOrderID[ev.OrderID], ev)
	}

	for i := range orders {
		orders[i].Items = itemsByOrderID[orders[i].ID]
		orders[i].Events = eventsByOrderID[orders[i].ID]
	}

	return orders, total, nil
}

// UpdateOrderStatus memperbarui status pesanan secara admin, dan
// mengembalikan stok jika dibatalkan/expired.
func (r *AdminRepository) UpdateOrderStatus(id string, status string, courier, tracking *string, cancelReason *string) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		var order Order
		if err := tx.Where("id = ?", id).First(&order).Error; err != nil {
			return err
		}

		oldStatus := order.Status
		if (status == "cancelled" || status == "expired") && (oldStatus != "cancelled" && oldStatus != "expired") {
			var items []OrderItem
			if err := tx.Where("order_id = ?", id).Find(&items).Error; err != nil {
				return err
			}
			for _, it := range items {
				if err := tx.Table("product_variants").Where("id = ?", it.VariantID).
					Update("stock", gorm.Expr("stock + ?", it.Qty)).Error; err != nil {
					return err
				}
			}
		}

		updates := map[string]interface{}{
			"status": status,
		}
		if courier != nil {
			updates["courier"] = *courier
		}
		if tracking != nil {
			updates["tracking_number"] = *tracking
		}
		if cancelReason != nil {
			updates["customer_note"] = *cancelReason // or somewhere else
		}

		return tx.Model(&Order{}).Where("id = ?", id).Updates(updates).Error
	})
}

// GetOrder mengambil satu pesanan berdasarkan ID untuk admin.
func (r *AdminRepository) GetOrder(id string) (*Order, error) {
	var order Order
	err := r.DB.Model(&Order{}).
		Select("orders.*, pa.status as pa_status, pa.expires_at as pa_expires_at, (orders.total - COALESCE((SELECT SUM(amount) FROM refunds WHERE order_id = orders.id), 0)) as refundable_amount").
		Joins("LEFT JOIN payment_attempts pa ON pa.order_id = orders.id AND pa.status = 'active'").
		Where("orders.id = ?", id).
		First(&order).Error
	if err != nil {
		return nil, err
	}

	var items []OrderItem
	err = r.DB.Model(&OrderItem{}).
		Select("order_items.*, p.slug as product_slug, img.storage_path as thumbnail_url").
		Joins("LEFT JOIN products p ON p.id = order_items.product_id").
		Joins("LEFT JOIN product_images img ON img.product_id = p.id AND img.is_primary = true").
		Where("order_items.order_id = ?", id).
		Find(&items).Error
	if err != nil {
		return nil, err
	}
	order.Items = items

	var events []OrderEvent
	err = r.DB.Model(&OrderEvent{}).
		Where("order_id = ?", id).
		Order("created_at ASC").
		Find(&events).Error
	if err != nil {
		return nil, err
	}
	order.Events = events

	var notes []OrderNote
	err = r.DB.Model(&OrderNote{}).
		Select("order_notes.*, p.name as author_name").
		Joins("LEFT JOIN profiles p ON p.id = order_notes.author_id").
		Where("order_notes.order_id = ?", id).
		Order("order_notes.created_at ASC").
		Find(&notes).Error
	if err != nil {
		return nil, err
	}
	order.Notes = notes

	return &order, nil
}

// dihapus karena pindah ke order_repo.go

// AddOrderNote menambahkan catatan pada pesanan.
func (r *AdminRepository) AddOrderNote(orderID, adminID, body string, isCustomerVisible bool) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		note := OrderNote{
			OrderID:           orderID,
			AuthorID:          &adminID,
			Body:              body,
			IsCustomerVisible: isCustomerVisible,
		}
		if err := tx.Create(&note).Error; err != nil {
			return err
		}

		if isCustomerVisible {
			var order struct {
				UserID string
			}
			if err := tx.Table("orders").Select("user_id").Where("id = ?", orderID).First(&order).Error; err == nil {
				titleI18n, _ := json.Marshal(map[string]string{"id": "Catatan pesanan baru", "en": "New order note"})
				bodyI18n, _ := json.Marshal(map[string]string{"id": body, "en": body})
				notif := Notification{
					UserID:    order.UserID,
					Type:      "order_note",
					TitleI18n: titleI18n,
					BodyI18n:  bodyI18n,
					Link:      "/orders/" + orderID,
				}
				tx.Create(&notif)
			}
		}
		return nil
	})
}

