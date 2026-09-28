package catalog

import (
	"testing"
	"time"
)

// JSON di bawah meniru keluaran Postgres untuk json_agg(row) / json_build_object:
// timestamptz ber-offset +00:00, jsonb bersarang sebagai objek, NULL sebagai null.
func TestProductAggRowToProduct(t *testing.T) {
	row := productAggRow{
		Product: Product{ID: "p1", Slug: "meja", CategorySlug: "anak"},
		VariantsJSON: []byte(`[
			{"id":"v1","product_id":"p1","sku":"S-1","color":"Brown","color_i18n":{"en": "Brown", "id": "Cokelat"},
			 "size":"L","size_i18n":{},"price":2000000,"sale_price":1500000,
			 "sale_starts_at":"2020-01-01T00:00:00.123456+00:00","sale_ends_at":"2099-12-31T23:59:59.654321+00:00",
			 "stock":3,"is_active":true,"weight_kg":null,"low_stock_threshold":null},
			{"id":"v2","product_id":"p1","sku":"S-2","color":null,"color_i18n":null,"size":null,"size_i18n":null,
			 "price":1800000,"sale_price":null,"sale_starts_at":null,"sale_ends_at":null,"stock":0,"is_active":true}]`),
		ImagesJSON: []byte(`[{"id":"i1","product_id":"p1","storage_path":"x/1.jpg","alt":null,"alt_i18n":{"id": "gambar"},"is_primary":true}]`),
		TagsJSON:   []byte(`[{"id":"t1","slug":"tag","name_i18n":{"en": "Tag"},"created_at":"2026-01-01T00:00:00+00:00"}]`),
		TermsJSON: []byte(`[{"term":{"id":"at1","attribute_id":"a1","slug":"jati","name_i18n":{"id": "jati"},"position":1},
			"attribute":{"id":"a1","slug":"material","name_i18n":{"en": "Material"},"is_filterable":true,"position":0,"created_at":"2026-01-01T00:00:00+00:00"}}]`),
		CategoryJSON: []byte(`{"category":{"id":"c2","slug":"anak","name":"Anak","name_i18n":{"id": "Anak"},"parent_id":"c1",
			"description_i18n":{},"image_path":null,"position":1,"is_active":true,"created_at":"2026-01-01T00:00:00+00:00"},
			"parent":{"id":"c1","slug":"induk","name":"Induk","name_i18n":{},"parent_id":null,"description_i18n":{},"image_path":null,"position":0,"is_active":true}}`),
	}

	p, err := row.toProduct()
	if err != nil {
		t.Fatalf("toProduct: %v", err)
	}

	if len(p.Variants) != 2 || p.Variants[0].Sku != "S-1" || p.Variants[1].Sku != "S-2" {
		t.Fatalf("variants tidak sesuai urutan/isi: %+v", p.Variants)
	}
	v := p.Variants[0]
	if v.SalePrice == nil || *v.SalePrice != 1500000 || v.Size == nil || *v.Size != "L" {
		t.Errorf("field varian salah: %+v", v)
	}
	if got := getI18nString(v.ColorI18n, "id", v.Color); got != "Cokelat" {
		t.Errorf("color_i18n: got %q", got)
	}
	wantEnd := time.Date(2099, 12, 31, 23, 59, 59, 654321000, time.UTC)
	if v.SaleEndsAt == nil || !v.SaleEndsAt.Equal(wantEnd) || v.SaleEndsAt.Location() != time.Local {
		t.Errorf("sale_ends_at harus instan sama dalam zona time.Local, got %v", v.SaleEndsAt)
	}
	if !isVariantOnSale(v) {
		t.Errorf("varian v1 seharusnya sedang sale")
	}

	v2 := p.Variants[1]
	if v2.Color != "" || v2.ColorI18n != nil || v2.Size != nil || v2.SalePrice != nil || v2.SaleEndsAt != nil {
		t.Errorf("NULL harus jadi nilai kosong seperti scan GORM lama: %+v", v2)
	}

	if len(p.Images) != 1 || p.Images[0].StoragePath != "x/1.jpg" || !p.Images[0].IsPrimary || p.Images[0].Alt != "" {
		t.Errorf("images salah: %+v", p.Images)
	}
	if len(p.Tags) != 1 || p.Tags[0].Slug != "tag" {
		t.Errorf("tags salah: %+v", p.Tags)
	}
	if len(p.AttributeTerms) != 1 || p.AttributeTerms[0].Attribute.Slug != "material" || p.AttributeTerms[0].Slug != "jati" {
		t.Errorf("attribute terms salah: %+v", p.AttributeTerms)
	}
	if p.Category.Slug != "anak" || p.Category.Parent == nil || p.Category.Parent.Slug != "induk" {
		t.Errorf("kategori/induk salah: %+v", p.Category)
	}
}

// Agregat kosong ('[]') dan kolom yang tidak dipilih (nil) sama-sama
// menghasilkan relasi nil — handler lalu menulis null/[] seperti sebelumnya.
func TestProductAggRowEmptyAggregates(t *testing.T) {
	cases := map[string]productAggRow{
		"kosong":        {VariantsJSON: []byte(`[]`), ImagesJSON: []byte(`[]`), TagsJSON: []byte(`[]`), TermsJSON: []byte(`[]`), CategoryJSON: []byte(`null`)},
		"tidak dipilih": {},
	}
	for name, row := range cases {
		p, err := row.toProduct()
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if p.Variants != nil || p.Images != nil || p.Tags != nil || p.AttributeTerms != nil || p.Category.Parent != nil {
			t.Errorf("%s: relasi harus nil, got %+v", name, p)
		}
	}
}

func TestProductAggRowInvalidJSON(t *testing.T) {
	row := productAggRow{VariantsJSON: []byte(`{bukan json`)}
	if _, err := row.toProduct(); err == nil {
		t.Fatal("JSON rusak harus menghasilkan error, bukan data kosong diam-diam")
	}
}
