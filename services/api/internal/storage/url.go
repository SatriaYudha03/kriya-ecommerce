package storage

import "strings"

// PublicImageURL membangun URL publik Supabase Storage dari storage_path.
// storage_path sudah mengandung nama bucket sebagai prefix, mis.
// "products/tamu-sofa-1.jpg" (lihat kontrak seed di KRIYA-MASTER.md Bagian 6),
// jadi tidak perlu menambahkan nama bucket lagi di sini.
func PublicImageURL(supabaseURL, storagePath string) string {
	if supabaseURL == "" || storagePath == "" {
		return ""
	}
	base := strings.TrimRight(supabaseURL, "/")
	path := strings.TrimLeft(storagePath, "/")
	return base + "/storage/v1/object/public/" + path
}
