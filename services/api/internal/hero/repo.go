package hero

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) List(onlyActive bool) ([]Slide, error) {
	var slides []Slide
	q := r.db.Order("position ASC, created_at ASC")
	if onlyActive {
		q = q.Where("is_active = ?", true)
	}
	if err := q.Find(&slides).Error; err != nil {
		return nil, err
	}
	return slides, nil
}

// Replace mengganti seluruh daftar slide secara atomik (hapus lalu isi ulang
// sesuai urutan input) — editor admin selalu mengirim daftar lengkap.
func (r *Repository) Replace(in []SlideInput) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("true").Delete(&Slide{}).Error; err != nil {
			return err
		}
		for i, s := range in {
			active := true
			if s.IsActive != nil {
				active = *s.IsActive
			}
			row := Slide{
				Position: i, EyebrowID: s.EyebrowID, EyebrowEN: s.EyebrowEN,
				TitleID: s.TitleID, TitleEN: s.TitleEN,
				SubtitleID: s.SubtitleID, SubtitleEN: s.SubtitleEN,
				Href: s.Href, ImagePath: s.ImagePath, Alt: s.Alt, IsActive: active,
			}
			// id dibiarkan kosong → DB mengisi gen_random_uuid().
			if err := tx.Omit("id", "updated_at").Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
