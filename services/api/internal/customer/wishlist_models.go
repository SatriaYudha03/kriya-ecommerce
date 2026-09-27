package customer

type WishlistRequest struct {
	ProductID string `json:"product_id" binding:"required,uuid"`
}

type WishlistResponse struct {
	Items []ProductListResponse `json:"items"`
}

type WishlistActionResponse struct {
	Status string `json:"status"`
}
