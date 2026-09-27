package aftersales

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type Notification struct {
	ID        string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID    string     `json:"-" gorm:"column:user_id"`
	Type      string     `json:"type" gorm:"column:type"`
	TitleI18n []byte     `json:"-" gorm:"column:title_i18n;type:jsonb"`
	BodyI18n  []byte     `json:"-" gorm:"column:body_i18n;type:jsonb"`
	Link      string     `json:"link" gorm:"column:link"`
	ReadAt    *time.Time `json:"read_at" gorm:"column:read_at"`
	CreatedAt time.Time  `json:"created_at" gorm:"column:created_at"`
}

func (Notification) TableName() string { return "notifications" }

type NotificationsRepository struct {
	db *gorm.DB
}

func NewNotificationsRepository(db *gorm.DB) *NotificationsRepository {
	return &NotificationsRepository{db: db}
}

func (r *NotificationsRepository) ListUserNotifications(userID string, page int, unreadOnly bool) ([]Notification, int64, error) {
	var notifs []Notification
	var total int64

	q := r.db.Model(&Notification{}).Where("user_id = ?", userID)
	if unreadOnly {
		q = q.Where("read_at IS NULL")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := 10
	offset := (page - 1) * limit

	if err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&notifs).Error; err != nil {
		return nil, 0, err
	}

	return notifs, total, nil
}

func (r *NotificationsRepository) GetUnreadCount(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Count(&count).Error
	return count, err
}

func (r *NotificationsRepository) MarkAsRead(userID string, ids []string, all bool) (int64, error) {
	q := r.db.Model(&Notification{}).Where("user_id = ? AND read_at IS NULL", userID)
	
	if !all {
		if len(ids) == 0 {
			return 0, nil
		}
		q = q.Where("id IN ?", ids)
	}

	now := time.Now()
	res := q.Update("read_at", now)
	return res.RowsAffected, res.Error
}

func (r *NotificationsRepository) CreateNotification(ctx context.Context, tx *gorm.DB, notif *Notification) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Create(notif).Error
}
