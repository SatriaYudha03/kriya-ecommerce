package customer

import (
	"time"
)

type AdminCustomerListItem struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	FullName     *string    `json:"full_name"`
	Phone        *string    `json:"phone"`
	Role         string     `json:"role"`
	OrdersCount  int        `json:"orders_count"`
	TotalSpent   int        `json:"total_spent"`
	LastOrderAt  *time.Time `json:"last_order_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

type AdminCustomerListResponse struct {
	Customers []AdminCustomerListItem `json:"customers"`
	Total     int64                   `json:"total"`
}

type AdminCustomerDetailItem struct {
	ID           string                    `json:"id"`
	Email        string                    `json:"email"`
	FullName     *string                   `json:"full_name"`
	Phone        *string                   `json:"phone"`
	Role         string                    `json:"role"`
	OrdersCount  int                       `json:"orders_count"`
	TotalSpent   int                       `json:"total_spent"`
	LastOrderAt  *time.Time                `json:"last_order_at"`
	CreatedAt    time.Time                 `json:"created_at"`
	Addresses    []AddressResponse         `json:"addresses"`
	RecentOrders []AdminRecentOrderResponse `json:"recent_orders"`
}

type AdminRecentOrderResponse struct {
	ID          string    `json:"id"`
	OrderNumber string    `json:"order_number"`
	Status      string    `json:"status"`
	Total       int       `json:"total"`
	CreatedAt   time.Time `json:"created_at"`
}
