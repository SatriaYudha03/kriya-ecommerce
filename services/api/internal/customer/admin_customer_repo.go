package customer

import (
	"strings"

	"gorm.io/gorm"
)

type AdminCustomerRepository struct {
	db *gorm.DB
}

func NewAdminCustomerRepository(db *gorm.DB) *AdminCustomerRepository {
	return &AdminCustomerRepository{db: db}
}

func (r *AdminCustomerRepository) GetCustomers(q, sort string, offset, limit int) ([]AdminCustomerListItem, int64, error) {
	var total int64
	var items []AdminCustomerListItem

	query := r.db.Table("auth.users as u").
		Select(`
			u.id, 
			u.email, 
			p.full_name, 
			p.phone, 
			COALESCE(p.role, 'customer') as role,
			COUNT(o.id) as orders_count,
			COALESCE(SUM(CASE WHEN o.status IN ('paid', 'processing', 'shipped', 'completed') THEN o.total ELSE 0 END), 0) as total_spent,
			MAX(o.created_at) as last_order_at,
			u.created_at
		`).
		Joins("LEFT JOIN profiles p ON p.id = u.id").
		Joins("LEFT JOIN orders o ON o.user_id = u.id")

	if q != "" {
		searchTerm := "%" + strings.ToLower(q) + "%"
		query = query.Where("LOWER(u.email) LIKE ? OR LOWER(p.full_name) LIKE ?", searchTerm, searchTerm)
	}

	query = query.Group("u.id, u.email, p.full_name, p.phone, p.role, u.created_at")

	// Count total
	countQuery := r.db.Table("auth.users as u").Joins("LEFT JOIN profiles p ON p.id = u.id")
	if q != "" {
		searchTerm := "%" + strings.ToLower(q) + "%"
		countQuery = countQuery.Where("LOWER(u.email) LIKE ? OR LOWER(p.full_name) LIKE ?", searchTerm, searchTerm)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	orderStr := "u.created_at DESC"
	if sort == "total_spent" {
		orderStr = "total_spent DESC"
	}
	query = query.Order(orderStr)

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *AdminCustomerRepository) GetCustomerDetail(id string) (*AdminCustomerDetailItem, error) {
	var item AdminCustomerListItem
	query := r.db.Table("auth.users as u").
		Select(`
			u.id, 
			u.email, 
			p.full_name, 
			p.phone, 
			COALESCE(p.role, 'customer') as role,
			COUNT(o.id) as orders_count,
			COALESCE(SUM(CASE WHEN o.status IN ('paid', 'processing', 'shipped', 'completed') THEN o.total ELSE 0 END), 0) as total_spent,
			MAX(o.created_at) as last_order_at,
			u.created_at
		`).
		Joins("LEFT JOIN profiles p ON p.id = u.id").
		Joins("LEFT JOIN orders o ON o.user_id = u.id").
		Where("u.id = ?", id).
		Group("u.id, u.email, p.full_name, p.phone, p.role, u.created_at")

	if err := query.First(&item).Error; err != nil {
		return nil, err
	}

	// Get addresses
	var addrs []AddressWithProvince
	if err := r.db.Table("addresses a").
		Select("a.*, p.name as province_name").
		Joins("JOIN provinces p ON p.code = a.province_code").
		Where("a.user_id = ?", id).
		Order("a.is_default DESC, a.created_at DESC").
		Scan(&addrs).Error; err != nil {
		return nil, err
	}
	
	addrResp := make([]AddressResponse, len(addrs))
	for i, a := range addrs {
		addrResp[i] = AddressResponse{
			ID:           a.ID,
			Label:        a.Label,
			Recipient:    a.Recipient,
			Phone:        a.Phone,
			AddressLine:  a.AddressLine,
			District:     a.District,
			City:         a.City,
			ProvinceCode: a.ProvinceCode,
			Province:     a.ProvinceName,
			PostalCode:   a.PostalCode,
			IsDefault:    a.IsDefault,
		}
	}

	// Get recent orders
	var recentOrders []AdminRecentOrderResponse
	err := r.db.Table("orders").
		Select("id, order_number, status, total, created_at").
		Where("user_id = ?", id).
		Order("created_at DESC").
		Limit(5).
		Find(&recentOrders).Error
	if err != nil {
		return nil, err
	}

	return &AdminCustomerDetailItem{
		ID:           item.ID,
		Email:        item.Email,
		FullName:     item.FullName,
		Phone:        item.Phone,
		Role:         item.Role,
		OrdersCount:  item.OrdersCount,
		TotalSpent:   item.TotalSpent,
		LastOrderAt:  item.LastOrderAt,
		CreatedAt:    item.CreatedAt,
		Addresses:    addrResp,
		RecentOrders: recentOrders,
	}, nil
}
