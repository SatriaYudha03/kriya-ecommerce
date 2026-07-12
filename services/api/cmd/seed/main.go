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

	// Insert Categories
	for _, catSeed := range seed.Categories {
		nameI18n, _ := json.Marshal(map[string]string{"en": catSeed.Name, "id": catSeed.Name + " (ID)"})
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
		nameI18n, _ := json.Marshal(map[string]string{"en": prodSeed.Name, "id": prodSeed.Name + " (ID)"})
		descI18n, _ := json.Marshal(map[string]string{"en": prodSeed.Description, "id": prodSeed.Description + " (ID)"})
		
		materialsId := make([]string, len(prodSeed.Materials))
		for i, m := range prodSeed.Materials {
			materialsId[i] = m + " (ID)"
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
			colorI18n, _ := json.Marshal(map[string]string{"en": varSeed.Color, "id": varSeed.Color + " (ID)"})
			var sizeI18n []byte
			if varSeed.Size != nil {
				sizeI18n, _ = json.Marshal(map[string]string{"en": *varSeed.Size, "id": *varSeed.Size + " (ID)"})
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
				altI18n, _ = json.Marshal(map[string]string{"en": imgSeed.Alt, "id": imgSeed.Alt + " (ID)"})
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
