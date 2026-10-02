package aftersales

import "github.com/kriya-commerce/api/internal/storage"

// supabaseURL diset sekali oleh RegisterRoutes. Query aftersales mengembalikan
// product_images.storage_path mentah (mis. "products/x.jpg") sebagai thumbnail_url;
// tanpa konversi, browser memuatnya relatif ke halaman (/orders/products/x.jpg) -> rusak.
var supabaseURL string

func thumbnailURL(storagePath *string) string {
	return storage.PublicImageURL(supabaseURL, ptrStr(storagePath))
}
