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

type NotificationRow struct {
	UserID    string `gorm:"column:user_id"`
	Type      string `gorm:"column:type"`
	TitleI18n []byte `gorm:"column:title_i18n;type:jsonb"`
	BodyI18n  []byte `gorm:"column:body_i18n;type:jsonb"`
	Link      string `gorm:"column:link"`
}

func (NotificationRow) TableName() string { return "notifications" }

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

		titleI18n, _ := json.Marshal(map[string]string{
			"id": "Status pesanan diperbarui",
			"en": "Order status updated",
		})

		bodyI18n, _ := json.Marshal(map[string]string{
			"id": "Pesanan Anda sekarang: " + e.ToStatus,
			"en": "Your order is now: " + e.ToStatus,
		})

		notif := NotificationRow{
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
