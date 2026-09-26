// Removed unused http imports
export interface Category {
  id: string;
  slug: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  position: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  price_min: number;
  regular_price_min?: number;
  on_sale?: boolean;
  in_stock?: boolean;
  is_featured?: boolean;
  rating_avg?: number;
  rating_count?: number;
  thumbnail_url: string;
  status?: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  size: string | null;
  price: number;
  regular_price?: number;
  sale_price?: number;
  sale_starts_at?: string;
  sale_ends_at?: string;
  stock: number;
  is_active?: boolean;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description?: string;
  category: { slug: string; name: string; parent?: { slug: string; name: string } };
  tags?: Tag[];
  attributes?: Attribute[];
  materials: string[];
  dimensions: { width_cm: number; depth_cm: number; height_cm: number };
  weight_kg: number;
  images: ProductImage[];
  variants: ProductVariant[];
  has_assembly_guide: boolean;
  price_min: number;
  regular_price_min?: number;
  on_sale?: boolean;
  sale_ends_at?: string;
  rating_avg?: number;
  rating_count?: number;
}

export interface SearchMeta {
  mode: "semantic" | "keyword_fallback";
}

export interface SearchResponseItem {
  product_id: string;
  slug: string;
  name: string;
  price_min: number;
  thumbnail_url: string;
  score: number;
}

export interface SearchEnvelope {
  data: SearchResponseItem[];
  meta: SearchMeta;
}

export interface SimilarEnvelope {
  data: SearchResponseItem[];
}

export interface Dimensions {
  width_cm: number;
  depth_cm: number;
  height_cm: number;
}

export interface VariantInput {
  sku: string;
  color: string;
  size: string | null;
  price: number;
  sale_price?: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  stock: number;
  is_active?: boolean;
}

export interface ProductImageInput {
  storage_path: string;
  alt: string;
  is_primary: boolean;
}

export interface CreateProductPayload {
  slug: string;
  name: string;
  category_slug: string;
  description: string;
  materials: string[];
  dimensions: Dimensions;
  weight_kg: number;
  has_assembly_guide: boolean;
  status?: string;
  featured?: boolean;
  summary?: string;
  seo_metadata?: Record<string, string>;
  tag_slugs?: string[];
  attribute_term_ids?: string[];
  upsell_ids?: string[];
  cross_sell_ids?: string[];
  variants: VariantInput[];
  images: ProductImageInput[];
}

export type UpdateProductPayload = Omit<CreateProductPayload, "variants" | "images">;

export interface AdminProductImage {
  id: string;
  storage_path: string;
  url: string;
  alt: string;
  is_primary: boolean;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  parent_id?: string | null;
  description_i18n: Record<string, string>;
  image_path?: string | null;
  position: number;
  is_active: boolean;
}

export interface AdminCategoryInput {
  slug: string;
  name: string;
  parent_id?: string | null;
  description_i18n: Record<string, string>;
  image_path?: string | null;
  position: number;
  is_active?: boolean;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_slug: string;
  materials: string[];
  dimensions: Dimensions;
  weight_kg: number;
  has_assembly_guide: boolean;
  status?: string;
  featured?: boolean;
  summary?: string;
  seo_metadata?: Record<string, string>;
  tag_slugs?: string[];
  attribute_term_ids?: string[];
  upsell_ids?: string[];
  cross_sell_ids?: string[];
  variants: ProductVariant[];
  images: AdminProductImage[];
}
export interface Tag {
  slug: string;
  name: string;
}

export interface AttributeTerm {
  slug: string;
  name: string;
  product_count?: number;
}

export interface Attribute {
  slug: string;
  name: string;
  terms: AttributeTerm[];
}

export interface AdminTag {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
}

export interface AdminTagInput {
  slug: string;
  name_i18n: Record<string, string>;
}

export interface AdminAttributeTerm {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  position: number;
}

export interface AdminAttributeTermInput {
  slug: string;
  name_i18n: Record<string, string>;
  position: number;
}

export interface AdminAttribute {
  id: string;
  slug: string;
  name_i18n: Record<string, string>;
  is_filterable: boolean;
  position: number;
  terms: AdminAttributeTerm[];
}

export interface AdminAttributeInput {
  slug: string;
  name_i18n: Record<string, string>;
  is_filterable?: boolean;
  position: number;
}
