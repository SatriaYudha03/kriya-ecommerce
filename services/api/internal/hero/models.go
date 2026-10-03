package hero

import "time"

// Slide = satu baris hero_slides. Teks dwibahasa disimpan berdampingan agar
// satu respons publik cukup untuk kedua locale (cache server FE tidak per-locale).
type Slide struct {
	ID         string    `gorm:"column:id;primaryKey" json:"id"`
	Position   int       `gorm:"column:position" json:"position"`
	EyebrowID  string    `gorm:"column:eyebrow_id" json:"eyebrow_id"`
	EyebrowEN  string    `gorm:"column:eyebrow_en" json:"eyebrow_en"`
	TitleID    string    `gorm:"column:title_id" json:"title_id"`
	TitleEN    string    `gorm:"column:title_en" json:"title_en"`
	SubtitleID string    `gorm:"column:subtitle_id" json:"subtitle_id"`
	SubtitleEN string    `gorm:"column:subtitle_en" json:"subtitle_en"`
	Href       string    `gorm:"column:href" json:"href"`
	ImagePath  string    `gorm:"column:image_path" json:"image_path"`
	Alt        string    `gorm:"column:alt" json:"alt"`
	IsActive   bool      `gorm:"column:is_active" json:"is_active"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"-"`
}

func (Slide) TableName() string { return "hero_slides" }

// SlideResponse = bentuk JSON (admin & publik). ImageURL sudah di-resolve.
type SlideResponse struct {
	ID         string `json:"id"`
	EyebrowID  string `json:"eyebrow_id"`
	EyebrowEN  string `json:"eyebrow_en"`
	TitleID    string `json:"title_id"`
	TitleEN    string `json:"title_en"`
	SubtitleID string `json:"subtitle_id"`
	SubtitleEN string `json:"subtitle_en"`
	Href       string `json:"href"`
	ImagePath  string `json:"image_path"`
	ImageURL   string `json:"image_url"`
	Alt        string `json:"alt"`
	IsActive   bool   `json:"is_active"`
}

type SlideInput struct {
	EyebrowID  string `json:"eyebrow_id" binding:"max=80"`
	EyebrowEN  string `json:"eyebrow_en" binding:"max=80"`
	TitleID    string `json:"title_id" binding:"required,max=160"`
	TitleEN    string `json:"title_en" binding:"required,max=160"`
	SubtitleID string `json:"subtitle_id" binding:"max=300"`
	SubtitleEN string `json:"subtitle_en" binding:"max=300"`
	Href       string `json:"href" binding:"required,max=300"`
	ImagePath  string `json:"image_path" binding:"required,max=500"`
	Alt        string `json:"alt" binding:"max=200"`
	IsActive   *bool  `json:"is_active"`
}

// ReplaceSlidesRequest: urutan array = urutan tampil.
type ReplaceSlidesRequest struct {
	Slides []SlideInput `json:"slides" binding:"required,min=1,max=8,dive"`
}
