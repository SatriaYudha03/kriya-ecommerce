package promo

type ReportSummaryResponse struct {
	GrossSales      int64   `json:"gross_sales"`
	DiscountTotal   int64   `json:"discount_total"`
	RefundedTotal   int64   `json:"refunded_total"`
	NetSales        int64   `json:"net_sales"`
	ShippingTotal   int64   `json:"shipping_total"`
	OrdersCount     int     `json:"orders_count"`
	ItemsSold       int     `json:"items_sold"`
	AvgOrderValue   float64 `json:"avg_order_value"`
	NewCustomers    int     `json:"new_customers"`
}

type ReportSalesItem struct {
	Period         string `json:"period"`
	OrdersCount    int    `json:"orders_count"`
	GrossSales     int64  `json:"gross_sales"`
	DiscountTotal  int64  `json:"discount_total"`
	RefundedTotal  int64  `json:"refunded_total"`
	NetSales       int64  `json:"net_sales"`
	ShippingTotal  int64  `json:"shipping_total"`
}

type ReportTopProduct struct {
	ProductID string `json:"product_id"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	ItemsSold int    `json:"items_sold"`
	Revenue   int64  `json:"revenue"`
}
