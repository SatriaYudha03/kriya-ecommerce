-- 016_hero_slides.sql — slide hero beranda yang bisa diedit admin (2026-10-03)
-- Teks dwibahasa (id/en); image_path = storage_path ("products/<file>") atau URL penuh.
-- Akses lewat API Go (service role) — RLS aktif tanpa policy agar anon/auth tidak menyentuh langsung.

CREATE TABLE IF NOT EXISTS hero_slides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position    int  NOT NULL DEFAULT 0,
  eyebrow_id  text NOT NULL DEFAULT '',
  eyebrow_en  text NOT NULL DEFAULT '',
  title_id    text NOT NULL,
  title_en    text NOT NULL,
  subtitle_id text NOT NULL DEFAULT '',
  subtitle_en text NOT NULL DEFAULT '',
  href        text NOT NULL DEFAULT '/products',
  image_path  text NOT NULL,
  alt         text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hero_slides_position ON hero_slides(position);
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

INSERT INTO hero_slides (position, eyebrow_id, eyebrow_en, title_id, title_en, subtitle_id, subtitle_en, href, image_path, alt)
SELECT * FROM (VALUES
  (0, 'Koleksi ruang keluarga', 'Living room collection',
      'Ruang yang hangat, dirakit oleh tanganmu.', 'A warm room, assembled by your own hands.',
      'Furniture flat-pack per ruangan dengan harga jujur - tanpa drama.', 'Room-by-room flat-pack furniture at honest prices - no drama.',
      '/categories/living-room', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=2000&q=80&auto=format&fit=crop',
      'Sofa modern di ruang keluarga yang hangat'),
  (1, 'Ruang kerja', 'Workspace',
      'Meja yang menemani kerja dari rumah.', 'Desks that keep you company working from home.',
      'Meja, kursi, dan penyimpanan untuk sudut kerja yang rapi.', 'Desks, chairs and storage for a tidy work corner.',
      '/categories/workspace', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=2000&q=80&auto=format&fit=crop',
      'Meja kerja minimalis dengan pencahayaan alami'),
  (2, 'Pencahayaan', 'Lighting',
      'Cahaya lembut untuk setiap sudut.', 'Soft light for every corner.',
      'Lampu lantai, gantung, dan meja bernuansa hangat.', 'Warm-toned floor, pendant and table lamps.',
      '/categories/lighting', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=2000&q=80&auto=format&fit=crop',
      'Lampu lantai dengan cahaya hangat di sudut ruangan')
) AS v(position, eyebrow_id, eyebrow_en, title_id, title_en, subtitle_id, subtitle_en, href, image_path, alt)
WHERE NOT EXISTS (SELECT 1 FROM hero_slides);
