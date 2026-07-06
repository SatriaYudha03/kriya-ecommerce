// Fixtures FE — WAJIB mengikuti kontrak KRIYA-MASTER.md Bagian 6 byte-per-byte.
// Dipakai saat NEXT_PUBLIC_USE_FIXTURES=true agar FE maju tanpa backend.
// Semua data sintetis; nama produk pola "NUSANTARA + fungsi" (bukan brand nyata).

import type {
  Cart,
  Category,
  ListMeta,
  Order,
  ProductDetail,
  ProductListItem,
} from "../types";

export const categories: Category[] = [
  { id: "c1000000-0000-0000-0000-000000000001", slug: "ruang-tamu", name: "Ruang tamu" },
  { id: "c1000000-0000-0000-0000-000000000002", slug: "kamar-tidur", name: "Kamar tidur" },
  { id: "c1000000-0000-0000-0000-000000000003", slug: "ruang-kerja", name: "Ruang kerja" },
  { id: "c1000000-0000-0000-0000-000000000004", slug: "ruang-makan", name: "Ruang makan" },
  { id: "c1000000-0000-0000-0000-000000000005", slug: "penyimpanan", name: "Penyimpanan" },
  { id: "c1000000-0000-0000-0000-000000000006", slug: "pencahayaan", name: "Pencahayaan" },
];

export const productList: ProductListItem[] = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    slug: "taru-meja-kerja",
    name: "TARU meja kerja",
    category_slug: "ruang-kerja",
    price_min: 1250000,
    thumbnail_url: "/img/taru-meja-kerja-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    slug: "raka-rak-dinding",
    name: "RAKA rak dinding",
    category_slug: "penyimpanan",
    price_min: 450000,
    thumbnail_url: "/img/raka-rak-dinding-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    slug: "sena-sofa-dua-dudukan",
    name: "SENA sofa dua dudukan",
    category_slug: "ruang-tamu",
    price_min: 3200000,
    thumbnail_url: "/img/sena-sofa-dua-dudukan-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000004",
    slug: "wana-ranjang-kayu",
    name: "WANA ranjang kayu",
    category_slug: "kamar-tidur",
    price_min: 2750000,
    thumbnail_url: "/img/wana-ranjang-kayu-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000005",
    slug: "boga-meja-makan",
    name: "BOGA meja makan",
    category_slug: "ruang-makan",
    price_min: 1900000,
    thumbnail_url: "/img/boga-meja-makan-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000006",
    slug: "cahya-lampu-lantai",
    name: "CAHYA lampu lantai",
    category_slug: "pencahayaan",
    price_min: 620000,
    thumbnail_url: "/img/cahya-lampu-lantai-1.jpg",
  },
];

export const productDetails: Record<string, ProductDetail> = {
  "taru-meja-kerja": {
    id: "a1000000-0000-0000-0000-000000000001",
    slug: "taru-meja-kerja",
    name: "TARU meja kerja",
    description:
      "Meja kerja ringkas untuk ruang sempit. Permukaan kayu pinus dengan rangka baja kokoh, cocok untuk laptop dan catatan harian.",
    category: { slug: "ruang-kerja", name: "Ruang kerja" },
    materials: ["kayu pinus", "baja"],
    dimensions: { width_cm: 120, depth_cm: 60, height_cm: 75 },
    weight_kg: 18.5,
    images: [
      { url: "/img/taru-meja-kerja-1.jpg", alt: "TARU meja kerja tampak depan" },
      { url: "/img/taru-meja-kerja-2.jpg", alt: "TARU meja kerja tampak samping" },
    ],
    variants: [
      {
        id: "v1000000-0000-0000-0000-000000000001",
        sku: "TARU-MK-NAT",
        color: "natural",
        size: null,
        price: 1250000,
        stock: 12,
      },
      {
        id: "v1000000-0000-0000-0000-000000000002",
        sku: "TARU-MK-HTM",
        color: "hitam",
        size: null,
        price: 1350000,
        stock: 7,
      },
    ],
    has_assembly_guide: true,
  },
};

export const productListMeta: ListMeta = {
  page: 1,
  limit: 20,
  total: productList.length,
};

export const cart: Cart = {
  items: [
    {
      variant_id: "v1000000-0000-0000-0000-000000000001",
      qty: 1,
      price: 1250000,
      subtotal: 1250000,
      product: {
        slug: "taru-meja-kerja",
        name: "TARU meja kerja",
        thumbnail_url: "/img/taru-meja-kerja-1.jpg",
        color: "natural",
        size: null,
      },
    },
  ],
  total: 1250000,
};

export const orders: Order[] = [
  {
    id: "o1000000-0000-0000-0000-000000000001",
    status: "paid",
    items: [
      {
        name: "TARU meja kerja",
        color: "natural",
        size: null,
        qty: 1,
        price: 1250000,
        subtotal: 1250000,
      },
    ],
    subtotal: 1250000,
    shipping_cost: 150000,
    total: 1400000,
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
