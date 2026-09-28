package catalog

import (
	"encoding/json"
	"fmt"
	"time"
)

// Agregat JSON untuk relasi produk. Tiap endpoint katalog dulu memakai rantai
// GORM Preload = satu query berurutan per relasi, dan setiap query adalah satu
// round-trip ke Supabase. Relasi kini diambil sebagai subquery json_agg di
// SELECT yang sama, sehingga satu endpoint = satu query.
//
// Teks SQL sengaja konstan (tanpa daftar IN yang panjangnya berubah-ubah)
// agar cache prepared statement pgx per koneksi terpakai ulang.
// Lihat docs/rencana/RENCANA-PERFORMA-LATENSI.md Fase 2.
//
// Urutan elemen kini eksplisit. Preload lama tanpa ORDER BY mengikuti urutan
// fisik baris, yang bergeser tiap kali baris di-UPDATE (mis. stok varian).
// Gambar: created_at, storage_path (seed menyisipkan banyak gambar dengan
// created_at kembar; storage_path -1/-2/-3 = urutan tampilan). Varian:
// created_at, id = urutan pembuatan.
const (
	selectActiveVariantsJSON = `(SELECT COALESCE(json_agg(v ORDER BY v.created_at, v.id), '[]') FROM product_variants v WHERE v.product_id = products.id AND v.is_active = true) AS variants_json`
	selectPrimaryImagesJSON  = `(SELECT COALESCE(json_agg(i ORDER BY i.created_at, i.storage_path), '[]') FROM product_images i WHERE i.product_id = products.id AND i.is_primary = true) AS images_json`
	selectAllImagesJSON      = `(SELECT COALESCE(json_agg(i ORDER BY i.created_at, i.storage_path), '[]') FROM product_images i WHERE i.product_id = products.id) AS images_json`
	selectTagsJSON           = `(SELECT COALESCE(json_agg(t ORDER BY t.slug), '[]') FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id = products.id) AS tags_json`
	selectTermsJSON          = `(SELECT COALESCE(json_agg(json_build_object('term', at, 'attribute', a) ORDER BY a.position, a.slug, at.position, at.slug), '[]') FROM product_attribute_terms pat JOIN attribute_terms at ON at.id = pat.term_id JOIN attributes a ON a.id = at.attribute_id WHERE pat.product_id = products.id) AS terms_json`
	selectCategoryJSON       = `(SELECT json_build_object('category', c, 'parent', pc) FROM categories c LEFT JOIN categories pc ON pc.id = c.parent_id WHERE c.slug = products.category_slug) AS category_json`
)

// productAggRow = satu baris products.* + kolom agregat. Kolom yang tidak
// dipilih query tertentu tetap kosong (nil).
type productAggRow struct {
	Product
	TotalCount   int64  `gorm:"column:total_count"`
	VariantsJSON []byte `gorm:"column:variants_json"`
	ImagesJSON   []byte `gorm:"column:images_json"`
	TagsJSON     []byte `gorm:"column:tags_json"`
	TermsJSON    []byte `gorm:"column:terms_json"`
	CategoryJSON []byte `gorm:"column:category_json"`
}

// Bentuk JSON baris tabel (row_to_json memakai nama kolom snake_case).
type variantJSON struct {
	ID           string          `json:"id"`
	ProductID    string          `json:"product_id"`
	Sku          string          `json:"sku"`
	Color        string          `json:"color"`
	ColorI18n    json.RawMessage `json:"color_i18n"`
	Size         *string         `json:"size"`
	SizeI18n     json.RawMessage `json:"size_i18n"`
	Price        int             `json:"price"`
	SalePrice    *int            `json:"sale_price"`
	SaleStartsAt *time.Time      `json:"sale_starts_at"`
	SaleEndsAt   *time.Time      `json:"sale_ends_at"`
	Stock        int             `json:"stock"`
	IsActive     bool            `json:"is_active"`
}

type imageJSON struct {
	ID          string          `json:"id"`
	ProductID   string          `json:"product_id"`
	StoragePath string          `json:"storage_path"`
	Alt         string          `json:"alt"`
	AltI18n     json.RawMessage `json:"alt_i18n"`
	IsPrimary   bool            `json:"is_primary"`
}

type tagJSON struct {
	ID        string          `json:"id"`
	Slug      string          `json:"slug"`
	NameI18n  json.RawMessage `json:"name_i18n"`
	CreatedAt time.Time       `json:"created_at"`
}

type attributeJSON struct {
	ID           string          `json:"id"`
	Slug         string          `json:"slug"`
	NameI18n     json.RawMessage `json:"name_i18n"`
	IsFilterable bool            `json:"is_filterable"`
	Position     int             `json:"position"`
	CreatedAt    time.Time       `json:"created_at"`
}

type attributeTermJSON struct {
	ID          string          `json:"id"`
	AttributeID string          `json:"attribute_id"`
	Slug        string          `json:"slug"`
	NameI18n    json.RawMessage `json:"name_i18n"`
	Position    int             `json:"position"`
}

type productTermJSON struct {
	Term      attributeTermJSON `json:"term"`
	Attribute attributeJSON     `json:"attribute"`
}

type categoryJSON struct {
	ID              string          `json:"id"`
	Slug            string          `json:"slug"`
	Name            string          `json:"name"`
	NameI18n        json.RawMessage `json:"name_i18n"`
	ParentID        *string         `json:"parent_id"`
	DescriptionI18n json.RawMessage `json:"description_i18n"`
	ImagePath       *string         `json:"image_path"`
	Position        int             `json:"position"`
	IsActive        bool            `json:"is_active"`
}

type categoryWithParentJSON struct {
	Category categoryJSON  `json:"category"`
	Parent   *categoryJSON `json:"parent"`
}

// rawBytes menyamakan jsonb NULL dengan hasil scan GORM lama (nil).
func rawBytes(r json.RawMessage) []byte {
	if len(r) == 0 || string(r) == "null" {
		return nil
	}
	return []byte(r)
}

// localTime menyamakan zona waktu dengan hasil scan pgx lama (time.Local);
// to_json(timestamptz) menghasilkan offset sesi DB (UTC).
func localTime(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	l := t.Local()
	return &l
}

func (c categoryJSON) toModel() Category {
	return Category{
		ID:              c.ID,
		Slug:            c.Slug,
		Name:            c.Name,
		NameI18n:        rawBytes(c.NameI18n),
		ParentID:        c.ParentID,
		DescriptionI18n: rawBytes(c.DescriptionI18n),
		ImagePath:       c.ImagePath,
		Position:        c.Position,
		IsActive:        c.IsActive,
	}
}

// aggTarget = daftar tujuan decode yang sah (tanpa `any`, lihat KRIYA-MASTER Bagian 5).
type aggTarget interface {
	[]variantJSON | []imageJSON | []tagJSON | []productTermJSON | categoryWithParentJSON | []termCountJSON
}

func decodeAgg[T aggTarget](data []byte, dst *T, what string) error {
	if len(data) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, dst); err != nil {
		return fmt.Errorf("decode %s: %w", what, err)
	}
	return nil
}

// toProduct membangun Product lengkap dari baris agregat. Relasi yang kolom
// agregatnya tidak dipilih dibiarkan nil — sama seperti tanpa Preload.
func (row *productAggRow) toProduct() (Product, error) {
	p := row.Product

	var variants []variantJSON
	if err := decodeAgg(row.VariantsJSON, &variants, "variants"); err != nil {
		return p, err
	}
	for _, v := range variants {
		p.Variants = append(p.Variants, ProductVariant{
			ID:           v.ID,
			ProductID:    v.ProductID,
			Sku:          v.Sku,
			Color:        v.Color,
			ColorI18n:    rawBytes(v.ColorI18n),
			Size:         v.Size,
			SizeI18n:     rawBytes(v.SizeI18n),
			Price:        v.Price,
			SalePrice:    v.SalePrice,
			SaleStartsAt: localTime(v.SaleStartsAt),
			SaleEndsAt:   localTime(v.SaleEndsAt),
			Stock:        v.Stock,
			IsActive:     v.IsActive,
		})
	}

	var images []imageJSON
	if err := decodeAgg(row.ImagesJSON, &images, "images"); err != nil {
		return p, err
	}
	for _, i := range images {
		p.Images = append(p.Images, ProductImage{
			ID:          i.ID,
			ProductID:   i.ProductID,
			StoragePath: i.StoragePath,
			Alt:         i.Alt,
			AltI18n:     rawBytes(i.AltI18n),
			IsPrimary:   i.IsPrimary,
		})
	}

	var tags []tagJSON
	if err := decodeAgg(row.TagsJSON, &tags, "tags"); err != nil {
		return p, err
	}
	for _, t := range tags {
		p.Tags = append(p.Tags, Tag{
			ID:        t.ID,
			Slug:      t.Slug,
			NameI18n:  rawBytes(t.NameI18n),
			CreatedAt: t.CreatedAt.Local(),
		})
	}

	var terms []productTermJSON
	if err := decodeAgg(row.TermsJSON, &terms, "attribute terms"); err != nil {
		return p, err
	}
	for _, pt := range terms {
		p.AttributeTerms = append(p.AttributeTerms, AttributeTerm{
			ID:          pt.Term.ID,
			AttributeID: pt.Term.AttributeID,
			Slug:        pt.Term.Slug,
			NameI18n:    rawBytes(pt.Term.NameI18n),
			Position:    pt.Term.Position,
			Attribute: Attribute{
				ID:           pt.Attribute.ID,
				Slug:         pt.Attribute.Slug,
				NameI18n:     rawBytes(pt.Attribute.NameI18n),
				IsFilterable: pt.Attribute.IsFilterable,
				Position:     pt.Attribute.Position,
				CreatedAt:    pt.Attribute.CreatedAt.Local(),
			},
		})
	}

	if len(row.CategoryJSON) > 0 && string(row.CategoryJSON) != "null" {
		var cat categoryWithParentJSON
		if err := decodeAgg(row.CategoryJSON, &cat, "category"); err != nil {
			return p, err
		}
		p.Category = cat.Category.toModel()
		if cat.Parent != nil {
			parent := cat.Parent.toModel()
			p.Category.Parent = &parent
		}
	}

	return p, nil
}

func rowsToProducts(rows []productAggRow) ([]Product, error) {
	products := make([]Product, 0, len(rows))
	for i := range rows {
		p, err := rows[i].toProduct()
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

// attributeWithTermsRow = attributes.* + term beserta jumlah produknya.
type attributeWithTermsRow struct {
	ID        string `gorm:"column:id"`
	Slug      string `gorm:"column:slug"`
	NameI18n  []byte `gorm:"column:name_i18n"`
	TermsJSON []byte `gorm:"column:terms_json"`
}

type termCountJSON struct {
	Term  attributeTermJSON `json:"term"`
	Count int               `json:"count"`
}
