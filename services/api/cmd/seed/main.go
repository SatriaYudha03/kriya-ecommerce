package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SeedData struct {
	Categories []CategorySeed `json:"categories"`
	Products   []ProductSeed  `json:"products"`
}

type CategorySeed struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}

type ProductSeed struct {
	Slug             string        `json:"slug"`
	Name             string        `json:"name"`
	CategorySlug     string        `json:"category_slug"`
	Description      string        `json:"description"`
	Materials        []string      `json:"materials"`
	Dimensions       Dimensions    `json:"dimensions"`
	WeightKg         float64       `json:"weight_kg"`
	HasAssemblyGuide bool          `json:"has_assembly_guide"`
	Images           []ImageSeed   `json:"images"`
	Variants         []VariantSeed `json:"variants"`
}

type Dimensions struct {
	WidthCm  float64 `json:"width_cm"`
	DepthCm  float64 `json:"depth_cm"`
	HeightCm float64 `json:"height_cm"`
}

type ImageSeed struct {
	StoragePath string `json:"storage_path"`
	Alt         string `json:"alt"`
}

type VariantSeed struct {
	Sku   string  `json:"sku"`
	Color string  `json:"color"`
	Size  *string `json:"size"`
	Price int     `json:"price"`
	Stock int     `json:"stock"`
}

// DB Models mapped to 001_commerce_core.sql + 007_i18n_content.sql
type Category struct {
	ID       string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Slug     string `gorm:"uniqueIndex"`
	Name     string
	NameI18n []byte `gorm:"column:name_i18n;type:jsonb"`
}

type Product struct {
	ID               string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Slug             string     `gorm:"uniqueIndex"`
	Name             string
	NameI18n         []byte     `gorm:"column:name_i18n;type:jsonb"`
	CategorySlug     string
	Description      string
	DescriptionI18n  []byte     `gorm:"column:description_i18n;type:jsonb"`
	Materials        []byte     `gorm:"type:jsonb"` // Store as JSONB []string
	MaterialsI18n    []byte     `gorm:"column:materials_i18n;type:jsonb"`
	Dimensions       []byte     `gorm:"type:jsonb"` // Store as JSONB Dimensions
	WeightKg         float64
	HasAssemblyGuide bool
	Status           string     `gorm:"column:status;default:'published'"`
	PublishedAt      *time.Time `gorm:"column:published_at"`
}

type Attribute struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Slug         string `gorm:"uniqueIndex"`
	NameI18n     []byte `gorm:"column:name_i18n;type:jsonb"`
	IsFilterable bool   `gorm:"column:is_filterable;default:true"`
	Position     int    `gorm:"column:position;default:0"`
}

type AttributeTerm struct {
	ID          string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	AttributeID string `gorm:"type:uuid"`
	Slug        string
	NameI18n    []byte `gorm:"column:name_i18n;type:jsonb"`
	Position    int    `gorm:"column:position;default:0"`
}

type ProductAttributeTerm struct {
	ProductID string `gorm:"type:uuid;primaryKey"`
	TermID    string `gorm:"type:uuid;primaryKey"`
}

func slugify(s string) string {
	s = strings.ToLower(s)
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	res := b.String()
	for strings.Contains(res, "--") {
		res = strings.ReplaceAll(res, "--", "-")
	}
	return strings.Trim(res, "-")
}

type ProductVariant struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProductID string `gorm:"type:uuid"`
	Sku       string `gorm:"uniqueIndex"`
	Color     string
	ColorI18n []byte `gorm:"column:color_i18n;type:jsonb"`
	Size      *string
	SizeI18n  []byte `gorm:"column:size_i18n;type:jsonb"`
	Price     int
	Stock     int
}

type ProductImage struct {
	ID          string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ProductID   string `gorm:"type:uuid"`
	StoragePath string
	Alt         string
	AltI18n     []byte `gorm:"column:alt_i18n;type:jsonb"`
	IsPrimary   bool
}

// Translations overlay (data/seed/translations-id.json). Field yang tak ada
// otomatis fallback ke teks English base — tidak ada lagi placeholder " (ID)".
type Translations struct {
	Categories map[string]string             `json:"categories"`
	Colors     map[string]string             `json:"colors"`
	Materials  map[string]string             `json:"materials"`
	Products   map[string]ProductTranslation `json:"products"`
}

type ProductTranslation struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// i18nJSON membangun {"en":..,"id":..}; id fallback ke en bila kosong.
func i18nJSON(en, id string) []byte {
	if id == "" {
		id = en
	}
	b, _ := json.Marshal(map[string]string{"en": en, "id": id})
	return b
}

// trOr mengembalikan m[key] bila ada & tak kosong, selain itu "".
func trOr(m map[string]string, key string) string {
	if m != nil {
		if v, ok := m[key]; ok {
			return v
		}
	}
	return ""
}

func main() {
	dbURL := os.Getenv("SUPABASE_DB_URL")
	if dbURL == "" {
		log.Fatal("SUPABASE_DB_URL is required")
	}

	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	seedFile := "../../data/seed/products.json" // relative from api working dir
	data, err := os.ReadFile(seedFile)
	if err != nil {
		log.Fatalf("Failed to read seed file: %v", err)
	}

	var seed SeedData
	if err := json.Unmarshal(data, &seed); err != nil {
		log.Fatalf("Failed to unmarshal seed data: %v", err)
	}

	// Load Indonesian translation overlay (opsional; fallback ke EN bila absen).
	var tr Translations
	trFile := "../../data/seed/translations-id.json"
	if trData, err := os.ReadFile(trFile); err == nil {
		if err := json.Unmarshal(trData, &tr); err != nil {
			log.Printf("Warning: gagal parse %s: %v — ID akan fallback ke EN", trFile, err)
		}
	} else {
		log.Printf("Warning: %s tidak ditemukan — ID akan fallback ke EN", trFile)
	}

	// Insert Categories
	var categories []Category
	for _, catSeed := range seed.Categories {
		nameI18n := i18nJSON(catSeed.Name, trOr(tr.Categories, catSeed.Slug))
		categories = append(categories, Category{
			Slug:     catSeed.Slug,
			Name:     catSeed.Name,
			NameI18n: nameI18n,
		})
	}
	if len(categories) > 0 {
		err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "name_i18n"}),
		}).Create(&categories).Error
		if err != nil {
			log.Printf("Error seeding categories: %v", err)
		}
	}

	// Insert Material Attribute
	materialAttr := Attribute{
		Slug:         "material",
		NameI18n:     i18nJSON("Material", "Material"),
		IsFilterable: true,
		Position:     0,
	}
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "slug"}},
		DoUpdates: clause.AssignmentColumns([]string{"name_i18n", "is_filterable", "position"}),
	}).Create(&materialAttr).Error; err != nil {
		log.Printf("Error seeding attribute material: %v", err)
	}

	var dbMaterialAttr Attribute
	if err := db.Where("slug = ?", "material").First(&dbMaterialAttr).Error; err != nil {
		log.Fatalf("Failed to fetch material attribute: %v", err)
	}

	// Insert Material Attribute Terms
	termMap := make(map[string]string) // materialEN -> termID
	termIdx := 0
	var terms []AttributeTerm
	var termENs []string
	for _, prodSeed := range seed.Products {
		for _, m := range prodSeed.Materials {
			if _, exists := termMap[m]; exists {
				continue
			}
			termMap[m] = ""
			termSlug := slugify(m)
			termNameI18n := i18nJSON(m, trOr(tr.Materials, m))
			terms = append(terms, AttributeTerm{
				AttributeID: dbMaterialAttr.ID,
				Slug:        termSlug,
				NameI18n:    termNameI18n,
				Position:    termIdx,
			})
			termENs = append(termENs, m)
			termIdx++
		}
	}
	if len(terms) > 0 {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "attribute_id"}, {Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name_i18n", "position"}),
		}).Create(&terms).Error; err != nil {
			log.Printf("Error seeding attribute terms: %v", err)
		}
	}

	// Fetch all terms to ensure we have their IDs
	var dbTerms []AttributeTerm
	if err := db.Where("attribute_id = ?", dbMaterialAttr.ID).Find(&dbTerms).Error; err != nil {
		log.Fatalf("Failed to fetch attribute terms: %v", err)
	}
	termSlugToID := make(map[string]string)
	for _, t := range dbTerms {
		termSlugToID[t.Slug] = t.ID
	}
	for _, m := range termENs {
		termMap[m] = termSlugToID[slugify(m)]
	}

	// Prepare Products
	now := time.Now().UTC()
	var products []Product
	for _, prodSeed := range seed.Products {
		materialsJSON, _ := json.Marshal(prodSeed.Materials)
		dimensionsJSON, _ := json.Marshal(prodSeed.Dimensions)

		pt := tr.Products[prodSeed.Slug]
		nameI18n := i18nJSON(prodSeed.Name, pt.Name)
		descI18n := i18nJSON(prodSeed.Description, pt.Description)

		materialsId := make([]string, len(prodSeed.Materials))
		for i, m := range prodSeed.Materials {
			if idm := trOr(tr.Materials, m); idm != "" {
				materialsId[i] = idm
			} else {
				materialsId[i] = m // fallback ke istilah EN
			}
		}
		materialsI18nMap := map[string][]string{
			"en": prodSeed.Materials,
			"id": materialsId,
		}
		materialsI18nJSON, _ := json.Marshal(materialsI18nMap)

		products = append(products, Product{
			Slug:             prodSeed.Slug,
			Name:             prodSeed.Name,
			NameI18n:         nameI18n,
			CategorySlug:     prodSeed.CategorySlug,
			Description:      prodSeed.Description,
			DescriptionI18n:  descI18n,
			Materials:        materialsJSON,
			MaterialsI18n:    materialsI18nJSON,
			Dimensions:       dimensionsJSON,
			WeightKg:         prodSeed.WeightKg,
			HasAssemblyGuide: prodSeed.HasAssemblyGuide,
			Status:           "published",
			PublishedAt:      &now,
		})
	}

	// Upsert Products
	if err := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "slug"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"name", "name_i18n", "category_slug", "description", "description_i18n", "materials", "materials_i18n",
			"dimensions", "weight_kg", "has_assembly_guide", "status", "published_at",
		}),
	}).Create(&products).Error; err != nil {
		log.Fatalf("Error seeding products: %v", err)
	}

	// Fetch product IDs by slug
	var dbProducts []Product
	if err := db.Select("id", "slug").Find(&dbProducts).Error; err != nil {
		log.Fatalf("Failed to fetch products: %v", err)
	}
	prodSlugToID := make(map[string]string)
	var productIDs []string
	for _, p := range dbProducts {
		prodSlugToID[p.Slug] = p.ID
		productIDs = append(productIDs, p.ID)
	}

	// Prepare PATs, Variants, Images
	var allPats []ProductAttributeTerm
	var allVariants []ProductVariant
	var allImages []ProductImage

	for _, prodSeed := range seed.Products {
		prodID := prodSlugToID[prodSeed.Slug]
		if prodID == "" {
			continue
		}
		pt := tr.Products[prodSeed.Slug]

		// PATs
		for _, m := range prodSeed.Materials {
			if termID, ok := termMap[m]; ok && termID != "" {
				allPats = append(allPats, ProductAttributeTerm{
					ProductID: prodID,
					TermID:    termID,
				})
			}
		}

		// Variants
		for _, varSeed := range prodSeed.Variants {
			colorI18n := i18nJSON(varSeed.Color, trOr(tr.Colors, varSeed.Color))
			var sizeI18n []byte
			if varSeed.Size != nil {
				sizeI18n = i18nJSON(*varSeed.Size, "")
			}
			allVariants = append(allVariants, ProductVariant{
				ProductID: prodID,
				Sku:       varSeed.Sku,
				Color:     varSeed.Color,
				ColorI18n: colorI18n,
				Size:      varSeed.Size,
				SizeI18n:  sizeI18n,
				Price:     varSeed.Price,
				Stock:     varSeed.Stock,
			})
		}

		// Images
		for i, imgSeed := range prodSeed.Images {
			var altI18n []byte
			if imgSeed.Alt != "" {
				altID := imgSeed.Alt
				if pt.Name != "" {
					altID = fmt.Sprintf("%s — tampilan %d", pt.Name, i+1)
				}
				altI18n = i18nJSON(imgSeed.Alt, altID)
			}
			allImages = append(allImages, ProductImage{
				ProductID:   prodID,
				StoragePath: imgSeed.StoragePath,
				Alt:         imgSeed.Alt,
				AltI18n:     altI18n,
				IsPrimary:   i == 0,
			})
		}
	}

	// Insert PATs
	if len(allPats) > 0 {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "product_id"}, {Name: "term_id"}},
			DoNothing: true,
		}).Create(&allPats).Error; err != nil {
			log.Printf("Error linking product attribute terms: %v", err)
		}
	}

	// Upsert Variants
	if len(allVariants) > 0 {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "sku"}},
			DoUpdates: clause.AssignmentColumns([]string{"color", "color_i18n", "size", "size_i18n", "price", "stock"}),
		}).Create(&allVariants).Error; err != nil {
			log.Printf("Error seeding variants: %v", err)
		}
	}

	// Delete and Re-insert Images
	if len(productIDs) > 0 {
		db.Where("product_id IN ?", productIDs).Delete(&ProductImage{})
	}
	if len(allImages) > 0 {
		if err := db.CreateInBatches(&allImages, 100).Error; err != nil {
			log.Printf("Error seeding images: %v", err)
		}
	}

	fmt.Println("Seed loaded successfully!")
}
