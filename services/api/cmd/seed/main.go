package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

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
	ID               string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Slug             string `gorm:"uniqueIndex"`
	Name             string
	NameI18n         []byte `gorm:"column:name_i18n;type:jsonb"`
	CategorySlug     string
	Description      string
	DescriptionI18n  []byte `gorm:"column:description_i18n;type:jsonb"`
	Materials        []byte `gorm:"type:jsonb"` // Store as JSONB []string
	MaterialsI18n    []byte `gorm:"column:materials_i18n;type:jsonb"`
	Dimensions       []byte `gorm:"type:jsonb"` // Store as JSONB Dimensions
	WeightKg         float64
	HasAssemblyGuide bool
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
	for _, catSeed := range seed.Categories {
		nameI18n := i18nJSON(catSeed.Name, trOr(tr.Categories, catSeed.Slug))
		cat := Category{
			Slug:     catSeed.Slug,
			Name:     catSeed.Name,
			NameI18n: nameI18n,
		}
		// Upsert based on slug
		err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "name_i18n"}),
		}).Create(&cat).Error
		if err != nil {
			log.Printf("Error seeding category %s: %v", cat.Slug, err)
		}
	}

	// Insert Products
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

		prod := Product{
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
		}

		err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "slug"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "name_i18n", "category_slug", "description", "description_i18n", "materials", "materials_i18n",
				"dimensions", "weight_kg", "has_assembly_guide",
			}),
		}).Create(&prod).Error
		if err != nil {
			log.Printf("Error seeding product %s: %v", prod.Slug, err)
			continue
		}

		// Fetch the inserted/updated product to get its ID
		var dbProd Product
		db.Where("slug = ?", prod.Slug).First(&dbProd)

		// Insert Variants
		for _, varSeed := range prodSeed.Variants {
			colorI18n := i18nJSON(varSeed.Color, trOr(tr.Colors, varSeed.Color))
			var sizeI18n []byte
			if varSeed.Size != nil {
				sizeI18n = i18nJSON(*varSeed.Size, "") // tak ada glosarium size; fallback ke EN
			}
			variant := ProductVariant{
				ProductID: dbProd.ID,
				Sku:       varSeed.Sku,
				Color:     varSeed.Color,
				ColorI18n: colorI18n,
				Size:      varSeed.Size,
				SizeI18n:  sizeI18n,
				Price:     varSeed.Price,
				Stock:     varSeed.Stock,
			}
			err := db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "sku"}},
				DoUpdates: clause.AssignmentColumns([]string{"color", "color_i18n", "size", "size_i18n", "price", "stock"}),
			}).Create(&variant).Error
			if err != nil {
				log.Printf("Error seeding variant %s: %v", variant.Sku, err)
			}
		}

		// Delete existing images for product and re-insert to keep simple
		db.Where("product_id = ?", dbProd.ID).Delete(&ProductImage{})

		// Insert Images
		for i, imgSeed := range prodSeed.Images {
			var altI18n []byte
			if imgSeed.Alt != "" {
				altID := imgSeed.Alt
				if pt.Name != "" {
					altID = fmt.Sprintf("%s — tampilan %d", pt.Name, i+1)
				}
				altI18n = i18nJSON(imgSeed.Alt, altID)
			}
			img := ProductImage{
				ProductID:   dbProd.ID,
				StoragePath: imgSeed.StoragePath,
				Alt:         imgSeed.Alt,
				AltI18n:     altI18n,
				IsPrimary:   i == 0,
			}
			db.Create(&img)
		}
	}

	fmt.Println("Seed loaded successfully!")
}
