// Fixtures FE — WAJIB mengikuti kontrak KRIYA-MASTER.md Bagian 6 byte-per-byte.
// Dipakai saat NEXT_PUBLIC_USE_FIXTURES=true agar FE maju tanpa backend.
// Semua data sintetis; nama produk pola "kata Nusantara + fungsi" (bukan brand nyata).
//
// Objek final (ProductListItem/ProductDetail) dibentuk lewat factory dari seed
// ringkas agar konsisten: id deterministik, price_min = harga varian termurah,
// thumbnail_url = gambar pertama. Bentuk output tetap 1:1 dengan kontrak.

import type {
  Cart,
  Category,
  ListMeta,
  Order,
  ProductDetail,
  ProductImage,
  ProductListItem,
  ProductVariant,
} from "../types";

export const categories: Category[] = [
  { id: "c1000000-0000-0000-0000-000000000001", slug: "living-room", name: "Living room" },
  { id: "c1000000-0000-0000-0000-000000000002", slug: "bedroom", name: "Bedroom" },
  { id: "c1000000-0000-0000-0000-000000000003", slug: "workspace", name: "Workspace" },
  { id: "c1000000-0000-0000-0000-000000000004", slug: "dining-room", name: "Dining room" },
  { id: "c1000000-0000-0000-0000-000000000005", slug: "storage", name: "Storage" },
  { id: "c1000000-0000-0000-0000-000000000006", slug: "lighting", name: "Lighting" },
];

const categoryName: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.slug, c.name]),
);

interface VariantSeed {
  sku: string;
  color: string;
  size: string | null;
  price: number;
  stock: number;
}

interface Seed {
  slug: string;
  name: string;
  category_slug: string;
  description: string;
  materials: string[];
  dimensions: { width_cm: number; depth_cm: number; height_cm: number };
  weight_kg: number;
  has_assembly_guide: boolean;
  image_count: number;
  variants: VariantSeed[];
}

// Urutan array = "newest first" (dipakai sort default katalog).
const seeds: Seed[] = [
  {
    slug: "tamu-sofa",
    name: "TAMU sofa",
    category_slug: "living-room",
    description:
      "Sofa modular dengan sarung kain linen yang bisa dilepas dan busa padat yang tetap nyaman untuk keseharian.",
    materials: ["kain linen", "busa", "kayu pinus"],
    dimensions: { width_cm: 210, depth_cm: 88, height_cm: 85 },
    weight_kg: 32,
    has_assembly_guide: true,
    image_count: 3,
    variants: [
      { sku: "TAMU-SF-ABU2", color: "abu-abu", size: "2-dudukan", price: 3200000, stock: 6 },
      { sku: "TAMU-SF-KRM3", color: "krem", size: "3-dudukan", price: 4200000, stock: 4 },
    ],
  },
  {
    slug: "nira-bed-frame",
    name: "NIRA bed frame",
    category_slug: "bedroom",
    description:
      "Rangka tempat tidur kayu jati dengan sandaran ramping dan bilah penyangga yang kokoh tanpa perlu spring bed tambahan.",
    materials: ["kayu jati", "plywood"],
    dimensions: { width_cm: 165, depth_cm: 210, height_cm: 100 },
    weight_kg: 45,
    has_assembly_guide: true,
    image_count: 3,
    variants: [
      { sku: "NIRA-BF-NAT160", color: "natural", size: "160×200", price: 4500000, stock: 5 },
      { sku: "NIRA-BF-WAL180", color: "walnut", size: "180×200", price: 5200000, stock: 3 },
    ],
  },
  {
    slug: "taru-work-desk",
    name: "TARU work desk",
    category_slug: "workspace",
    description:
      "Meja kerja lapang dengan permukaan kayu pinus dan kaki baja kokoh. Baki kabel tersembunyi menjaga meja tetap rapi.",
    materials: ["kayu pinus", "baja"],
    dimensions: { width_cm: 120, depth_cm: 60, height_cm: 75 },
    weight_kg: 18.5,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "TARU-WD-NAT", color: "natural", size: null, price: 1800000, stock: 12 },
      { sku: "TARU-WD-BLK", color: "hitam", size: null, price: 1950000, stock: 7 },
    ],
  },
  {
    slug: "meja-dining-table",
    name: "MEJA dining table",
    category_slug: "dining-room",
    description:
      "Meja makan kayu jati solid untuk enam orang dengan sudut membulat yang aman dan permukaan tahan gores.",
    materials: ["kayu jati"],
    dimensions: { width_cm: 160, depth_cm: 90, height_cm: 76 },
    weight_kg: 38,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "MEJA-DT-NAT", color: "natural", size: null, price: 4500000, stock: 4 },
      { sku: "MEJA-DT-WAL", color: "walnut", size: null, price: 4900000, stock: 2 },
    ],
  },
  {
    slug: "obor-floor-lamp",
    name: "OBOR floor lamp",
    category_slug: "lighting",
    description:
      "Lampu lantai ramping dengan kepala yang bisa diarahkan, cocok untuk sudut baca maupun pencahayaan ambient.",
    materials: ["baja", "kain"],
    dimensions: { width_cm: 35, depth_cm: 35, height_cm: 150 },
    weight_kg: 6,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "OBOR-FL-BLK", color: "hitam", size: null, price: 1200000, stock: 10 },
      { sku: "OBOR-FL-BRS", color: "kuningan", size: null, price: 1450000, stock: 6 },
    ],
  },
  {
    slug: "raka-wall-shelf",
    name: "RAKA wall shelf",
    category_slug: "storage",
    description:
      "Rak dinding minimalis dengan braket tersembunyi. Tersedia dudukan yang kuat untuk buku maupun tanaman kecil.",
    materials: ["kayu pinus"],
    dimensions: { width_cm: 80, depth_cm: 22, height_cm: 18 },
    weight_kg: 4,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "RAKA-WS-NAT", color: "natural", size: null, price: 450000, stock: 20 },
      { sku: "RAKA-WS-WHT", color: "putih", size: null, price: 480000, stock: 15 },
    ],
  },
  {
    slug: "santai-lounge-chair",
    name: "SANTAI lounge chair",
    category_slug: "living-room",
    description:
      "Kursi santai anyaman rotan dengan bantalan busa empuk, ringan dipindah namun stabil saat diduduki.",
    materials: ["rotan", "busa"],
    dimensions: { width_cm: 70, depth_cm: 75, height_cm: 95 },
    weight_kg: 12,
    has_assembly_guide: false,
    image_count: 2,
    variants: [{ sku: "SANTAI-LC-NAT", color: "natural", size: null, price: 1650000, stock: 8 }],
  },
  {
    slug: "lesehan-coffee-table",
    name: "LESEHAN coffee table",
    category_slug: "living-room",
    description:
      "Meja kopi rendah dari kayu mangga dengan rak bawah untuk majalah, cocok untuk ruang keluarga yang santai.",
    materials: ["kayu mangga"],
    dimensions: { width_cm: 100, depth_cm: 50, height_cm: 40 },
    weight_kg: 15,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "LESEHAN-CT-NAT", color: "natural", size: null, price: 1250000, stock: 9 },
      { sku: "LESEHAN-CT-BLK", color: "hitam", size: null, price: 1350000, stock: 5 },
    ],
  },
  {
    slug: "rangka-tv-console",
    name: "RANGKA tv console",
    category_slug: "living-room",
    description:
      "Konsol TV panjang dengan dua laci dan celah kabel di belakang, muat untuk TV hingga 55 inci.",
    materials: ["MDF", "kayu pinus"],
    dimensions: { width_cm: 140, depth_cm: 40, height_cm: 45 },
    weight_kg: 22,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "RANGKA-TV-WHT", color: "putih", size: null, price: 1900000, stock: 6 },
      { sku: "RANGKA-TV-WAL", color: "walnut", size: null, price: 2100000, stock: 4 },
    ],
  },
  {
    slug: "bale-sectional-sofa",
    name: "BALE sectional sofa",
    category_slug: "living-room",
    description:
      "Sofa sudut besar berbentuk L dengan chaise yang bisa dipasang di kiri atau kanan, muat untuk keluarga.",
    materials: ["kain", "busa", "kayu"],
    dimensions: { width_cm: 260, depth_cm: 160, height_cm: 84 },
    weight_kg: 55,
    has_assembly_guide: true,
    image_count: 3,
    variants: [
      { sku: "BALE-SC-ABU", color: "abu-abu", size: null, price: 7200000, stock: 3 },
      { sku: "BALE-SC-OLV", color: "hijau olive", size: null, price: 7600000, stock: 2 },
    ],
  },
  {
    slug: "teduh-armchair",
    name: "TEDUH armchair",
    category_slug: "living-room",
    description:
      "Kursi berlengan berbahan bouclé lembut dengan rangka kayu, nyaman untuk sudut baca favorit.",
    materials: ["kain bouclé", "kayu"],
    dimensions: { width_cm: 78, depth_cm: 80, height_cm: 88 },
    weight_kg: 16,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "TEDUH-AC-KRM", color: "krem", size: null, price: 2400000, stock: 7 },
      { sku: "TEDUH-AC-ARG", color: "arang", size: null, price: 2500000, stock: 5 },
    ],
  },
  {
    slug: "lipat-folding-stool",
    name: "LIPAT folding stool",
    category_slug: "living-room",
    description:
      "Bangku lipat ringkas dari kayu dan baja, mudah disimpan dan jadi kursi cadangan saat tamu datang.",
    materials: ["kayu", "baja"],
    dimensions: { width_cm: 34, depth_cm: 34, height_cm: 45 },
    weight_kg: 3,
    has_assembly_guide: false,
    image_count: 2,
    variants: [{ sku: "LIPAT-FS-NAT", color: "natural", size: null, price: 320000, stock: 30 }],
  },
  {
    slug: "lelap-nightstand",
    name: "LELAP nightstand",
    category_slug: "bedroom",
    description:
      "Meja samping ranjang mungil dengan satu laci dan rak terbuka, pas untuk lampu tidur dan buku.",
    materials: ["kayu pinus"],
    dimensions: { width_cm: 45, depth_cm: 40, height_cm: 50 },
    weight_kg: 9,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "LELAP-NS-NAT", color: "natural", size: null, price: 780000, stock: 12 },
      { sku: "LELAP-NS-WHT", color: "putih", size: null, price: 820000, stock: 10 },
    ],
  },
  {
    slug: "simpul-wardrobe",
    name: "SIMPUL wardrobe",
    category_slug: "bedroom",
    description:
      "Lemari pakaian dua pintu dengan gantungan dan rak bertingkat, permukaan matte yang tahan sidik jari.",
    materials: ["MDF", "kayu"],
    dimensions: { width_cm: 120, depth_cm: 58, height_cm: 200 },
    weight_kg: 68,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "SIMPUL-WR-WHT", color: "putih", size: null, price: 3900000, stock: 4 },
      { sku: "SIMPUL-WR-WAL", color: "walnut", size: null, price: 4300000, stock: 2 },
    ],
  },
  {
    slug: "karya-office-chair",
    name: "KARYA office chair",
    category_slug: "workspace",
    description:
      "Kursi kerja dengan sandaran mesh berventilasi, tinggi yang bisa diatur, dan roda senyap untuk lantai kayu.",
    materials: ["mesh", "baja", "plastik"],
    dimensions: { width_cm: 66, depth_cm: 66, height_cm: 120 },
    weight_kg: 14,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "KARYA-OC-BLK", color: "hitam", size: null, price: 1600000, stock: 11 },
      { sku: "KARYA-OC-ABU", color: "abu-abu", size: null, price: 1650000, stock: 6 },
    ],
  },
  {
    slug: "susun-standing-desk",
    name: "SUSUN standing desk",
    category_slug: "workspace",
    description:
      "Meja berdiri dengan permukaan bambu dan rangka baja yang bisa dinaik-turunkan secara manual untuk postur lebih sehat.",
    materials: ["bambu", "baja"],
    dimensions: { width_cm: 140, depth_cm: 70, height_cm: 120 },
    weight_kg: 28,
    has_assembly_guide: true,
    image_count: 2,
    variants: [{ sku: "SUSUN-SD-NAT", color: "natural", size: null, price: 3400000, stock: 5 }],
  },
  {
    slug: "laci-drawer-unit",
    name: "LACI drawer unit",
    category_slug: "workspace",
    description:
      "Unit tiga laci baja beroda yang muat di bawah meja, dilengkapi kunci untuk dokumen penting.",
    materials: ["baja"],
    dimensions: { width_cm: 40, depth_cm: 50, height_cm: 60 },
    weight_kg: 12,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "LACI-DU-WHT", color: "putih", size: null, price: 950000, stock: 9 },
      { sku: "LACI-DU-BLK", color: "hitam", size: null, price: 980000, stock: 7 },
    ],
  },
  {
    slug: "kursi-dining-chair",
    name: "KURSI dining chair",
    category_slug: "dining-room",
    description:
      "Kursi makan kayu jati dengan dudukan berlapis kain, ditumpuk rapi saat tidak dipakai. Dijual per satu.",
    materials: ["kayu jati", "kain"],
    dimensions: { width_cm: 46, depth_cm: 52, height_cm: 82 },
    weight_kg: 6,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "KURSI-DC-NAT", color: "natural", size: null, price: 680000, stock: 24 },
      { sku: "KURSI-DC-WAL", color: "walnut", size: null, price: 720000, stock: 16 },
    ],
  },
  {
    slug: "saji-sideboard",
    name: "SAJI sideboard",
    category_slug: "dining-room",
    description:
      "Bufet ruang makan dari kayu mangga dengan dua pintu dan satu laci, permukaan atas lapang untuk menyaji.",
    materials: ["kayu mangga"],
    dimensions: { width_cm: 150, depth_cm: 42, height_cm: 80 },
    weight_kg: 34,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "SAJI-SB-NAT", color: "natural", size: null, price: 3200000, stock: 4 },
      { sku: "SAJI-SB-ARG", color: "arang", size: null, price: 3400000, stock: 3 },
    ],
  },
  {
    slug: "simpan-storage-cabinet",
    name: "SIMPAN storage cabinet",
    category_slug: "storage",
    description:
      "Lemari serbaguna tinggi dengan rak yang bisa diatur, cocok untuk gudang kecil, dapur, maupun ruang cuci.",
    materials: ["MDF"],
    dimensions: { width_cm: 80, depth_cm: 40, height_cm: 180 },
    weight_kg: 40,
    has_assembly_guide: true,
    image_count: 2,
    variants: [{ sku: "SIMPAN-SC-WHT", color: "putih", size: null, price: 2200000, stock: 6 }],
  },
  {
    slug: "kotak-storage-box-set",
    name: "KOTAK storage box set",
    category_slug: "storage",
    description:
      "Set tiga kotak penyimpanan kain lipat dengan pegangan, pas untuk rak terbuka maupun kolong ranjang.",
    materials: ["kain", "karton"],
    dimensions: { width_cm: 33, depth_cm: 33, height_cm: 33 },
    weight_kg: 2,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "KOTAK-BX-ABU", color: "abu-abu", size: null, price: 240000, stock: 40 },
      { sku: "KOTAK-BX-KRM", color: "krem", size: null, price: 240000, stock: 35 },
    ],
  },
  {
    slug: "rawat-bookshelf",
    name: "RAWAT bookshelf",
    category_slug: "storage",
    description:
      "Rak buku lima tingkat dari kayu pinus dengan tinggi yang lega, stabil disandarkan ke dinding.",
    materials: ["kayu pinus"],
    dimensions: { width_cm: 80, depth_cm: 30, height_cm: 180 },
    weight_kg: 26,
    has_assembly_guide: true,
    image_count: 2,
    variants: [
      { sku: "RAWAT-BS-NAT", color: "natural", size: null, price: 1450000, stock: 7 },
      { sku: "RAWAT-BS-WHT", color: "putih", size: null, price: 1500000, stock: 6 },
    ],
  },
  {
    slug: "pijar-pendant-lamp",
    name: "PIJAR pendant lamp",
    category_slug: "lighting",
    description:
      "Lampu gantung kubah aluminium dengan kabel panjang yang bisa dipotong, indah di atas meja makan.",
    materials: ["aluminium"],
    dimensions: { width_cm: 30, depth_cm: 30, height_cm: 40 },
    weight_kg: 3,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "PIJAR-PL-BLK", color: "hitam", size: null, price: 680000, stock: 14 },
      { sku: "PIJAR-PL-BRS", color: "kuningan", size: null, price: 760000, stock: 9 },
    ],
  },
  {
    slug: "terang-table-lamp",
    name: "TERANG table lamp",
    category_slug: "lighting",
    description:
      "Lampu meja dengan dasar keramik dan kap kain hangat, cahaya lembut untuk meja samping atau meja kerja.",
    materials: ["keramik", "kain"],
    dimensions: { width_cm: 25, depth_cm: 25, height_cm: 45 },
    weight_kg: 2.5,
    has_assembly_guide: false,
    image_count: 2,
    variants: [
      { sku: "TERANG-TL-PSR", color: "pasir", size: null, price: 420000, stock: 18 },
      { sku: "TERANG-TL-WHT", color: "putih", size: null, price: 440000, stock: 15 },
    ],
  },
];

const pad = (n: number) => String(n).padStart(12, "0");
const productId = (n: number) => `a1000000-0000-0000-0000-${pad(n)}`;
const variantId = (n: number) => `v1000000-0000-0000-0000-${pad(n)}`;

let variantCounter = 0;

function buildImages(seed: Seed): ProductImage[] {
  return Array.from({ length: seed.image_count }, (_, i) => ({
    url: `https://nmlhpeqpahihfwzbqmzp.supabase.co/storage/v1/object/public/products/${seed.slug}-${i + 1}.jpg`,
    alt: `${seed.name} tampak ${i + 1}`,
  }));
}

function buildVariants(seed: Seed): ProductVariant[] {
  return seed.variants.map((v) => ({
    id: variantId(++variantCounter),
    sku: v.sku,
    color: v.color,
    size: v.size,
    price: v.price,
    stock: v.stock,
  }));
}

const details = seeds.map((seed, idx): ProductDetail => {
  const variants = buildVariants(seed);
  return {
    id: productId(idx + 1),
    slug: seed.slug,
    name: seed.name,
    description: seed.description,
    category: { slug: seed.category_slug, name: categoryName[seed.category_slug] },
    materials: seed.materials,
    dimensions: seed.dimensions,
    weight_kg: seed.weight_kg,
    images: buildImages(seed),
    variants,
    has_assembly_guide: seed.has_assembly_guide,
  };
});

export const productList: ProductListItem[] = details.map((d) => ({
  id: d.id,
  slug: d.slug,
  name: d.name,
  category_slug: d.category.slug,
  price_min: Math.min(...d.variants.map((v) => v.price)),
  thumbnail_url: d.images[0].url,
}));

export const productDetails: Record<string, ProductDetail> = Object.fromEntries(
  details.map((d) => [d.slug, d]),
);

export const productListMeta: ListMeta = {
  page: 1,
  limit: 20,
  total: productList.length,
};

export const cart: Cart = {
  items: [
    {
      variant_id: productDetails["taru-work-desk"].variants[0].id,
      qty: 1,
      price: 1800000,
      subtotal: 1800000,
      product: {
        slug: "taru-work-desk",
        name: "TARU work desk",
        thumbnail_url: "https://nmlhpeqpahihfwzbqmzp.supabase.co/storage/v1/object/public/products/taru-work-desk-1.jpg",
        color: "natural",
        size: null,
      },
    },
  ],
  total: 1800000,
};

export const orders: Order[] = [
  {
    id: "o1000000-0000-0000-0000-000000000001",
    status: "paid",
    items: [
      {
        name: "TARU work desk",
        color: "natural",
        size: null,
        qty: 1,
        price: 1800000,
        subtotal: 1800000,
      },
    ],
    subtotal: 1800000,
    shipping_cost: 150000,
    total: 1950000,
    shipping_address: {
      recipient: "Satria",
      phone: "081200000000",
      address_line: "Jl. Melati No. 10",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40123",
    },
    created_at: "2026-07-06T14:00:00Z",
  },
];

export const fixtures = {
  categories,
  productList,
  productListMeta,
  productDetails,
  cart,
  orders,
};
