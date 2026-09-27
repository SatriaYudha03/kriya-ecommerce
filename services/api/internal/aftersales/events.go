package aftersales

import (
	"context"
	"encoding/json"

	"github.com/kriya-commerce/api/internal/checkout"
	"gorm.io/gorm"
)

type OrderEventRecorderImpl struct{}

func NewOrderEventRecorder() *OrderEventRecorderImpl {
	return &OrderEventRecorderImpl{}
}

type OrderEventRow struct {
	OrderID    string  `gorm:"column:order_id"`
	FromStatus *string `gorm:"column:from_status"`
	ToStatus   string  `gorm:"column:to_status"`
	ActorType  string  `gorm:"column:actor_type"`
	ActorID    *string `gorm:"column:actor_id"`
	Note       string  `gorm:"column:note"`
}

func (OrderEventRow) TableName() string { return "order_events" }

func (r *OrderEventRecorderImpl) Record(ctx context.Context, tx *gorm.DB, e checkout.OrderEvent) error {
	row := OrderEventRow{
		OrderID:    e.OrderID,
		FromStatus: e.FromStatus,
		ToStatus:   e.ToStatus,
		ActorType:  string(e.ActorType),
		ActorID:    e.ActorID,
		Note:       e.Note,
	}

	if err := tx.Create(&row).Error; err != nil {
		return err
	}

	if e.NotifyCustomer {
		var order struct {
			UserID string
		}
		if err := tx.Table("orders").Select("user_id").Where("id = ?", e.OrderID).First(&order).Error; err != nil {
			return err
		}

		titleID := "Status pesanan diperbarui"
		titleEN := "Order status updated"
		bodyID := "Pesanan Anda sekarang: " + e.ToStatus
		bodyEN := "Your order is now: " + e.ToStatus

		switch e.ToStatus {
		case "paid":
			titleID = "Pembayaran diterima"
			titleEN = "Payment received"
			bodyID = "Pembayaran untuk pesanan Anda telah diterima."
			bodyEN = "Payment for your order has been received."
		case "processing":
			titleID = "Pesanan diproses"
			titleEN = "Order is being processed"
			bodyID = "Pesanan Anda sedang diproses oleh penjual."
			bodyEN = "Your order is being processed by the seller."
		case "shipped":
			titleID = "Pesanan dikirim"
			titleEN = "Order shipped"
			bodyID = "Pesanan Anda telah dikirim."
			bodyEN = "Your order has been shipped."
			if e.Note != "" {
				bodyID += " Resi: " + e.Note
				bodyEN += " Tracking: " + e.Note
			}
		case "completed":
			titleID = "Pesanan selesai"
			titleEN = "Order completed"
			bodyID = "Pesanan Anda telah selesai."
			bodyEN = "Your order has been completed."
		case "cancelled":
			titleID = "Pesanan dibatalkan"
			titleEN = "Order cancelled"
			bodyID = "Pesanan Anda telah dibatalkan."
			bodyEN = "Your order has been cancelled."
		case "refunded":
			titleID = "Pengembalian dana"
			titleEN = "Refund processed"
			bodyID = "Pengembalian dana untuk pesanan Anda telah diproses."
			bodyEN = "Refund for your order has been processed."
		}

		titleI18n, _ := json.Marshal(map[string]string{"id": titleID, "en": titleEN})
		bodyI18n, _ := json.Marshal(map[string]string{"id": bodyID, "en": bodyEN})

		notif := Notification{
			UserID:    order.UserID,
			Type:      "order_status",
			TitleI18n: titleI18n,
			BodyI18n:  bodyI18n,
			Link:      "/orders/" + e.OrderID,
		}

		if err := tx.Create(&notif).Error; err != nil {
			return err
		}
	}

	return nil
}
