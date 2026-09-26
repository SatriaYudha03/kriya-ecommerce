package promo

type AdminStatsResponse struct {
	TotalOrders    int64 `json:"total_orders"`
	Revenue        int64 `json:"revenue"`
	ActiveProducts int64 `json:"active_products"`
}
