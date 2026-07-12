-- Migration 007: i18n content

ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_i18n jsonb DEFAULT '{}'::jsonb;

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS name_i18n jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_i18n jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS materials_i18n jsonb DEFAULT '{}'::jsonb;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS color_i18n jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS size_i18n jsonb DEFAULT '{}'::jsonb;

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS alt_i18n jsonb DEFAULT '{}'::jsonb;

ALTER TABLE assembly_guides
  ADD COLUMN IF NOT EXISTS content_md_i18n jsonb DEFAULT '{}'::jsonb;

-- Backfill old data
UPDATE categories SET name_i18n = jsonb_build_object('en', name, 'id', name);

UPDATE products SET 
  name_i18n = jsonb_build_object('en', name, 'id', name),
  description_i18n = jsonb_build_object('en', description, 'id', description),
  materials_i18n = jsonb_build_object('en', materials, 'id', materials);

UPDATE product_variants SET 
  color_i18n = jsonb_build_object('en', color, 'id', color),
  size_i18n = CASE WHEN size IS NOT NULL THEN jsonb_build_object('en', size, 'id', size) ELSE NULL END;

UPDATE product_images SET 
  alt_i18n = CASE WHEN alt IS NOT NULL THEN jsonb_build_object('en', alt, 'id', alt) ELSE NULL END;

UPDATE assembly_guides SET 
  content_md_i18n = jsonb_build_object('en', content_md, 'id', content_md);
