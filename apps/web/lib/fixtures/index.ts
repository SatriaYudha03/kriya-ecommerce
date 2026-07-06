// Fixtures FE — WAJIB mengikuti kontrak KRIYA-MASTER.md Bagian 6 byte-per-byte.
// Dipakai saat NEXT_PUBLIC_USE_FIXTURES=true agar FE maju tanpa backend.
// Semua data sintetis; nama produk pola "NUSANTARA + function" (bukan brand nyata).

import type {
  Cart,
  Category,
  ListMeta,
  Order,
  ProductDetail,
  ProductListItem,
} from "../types";

export const categories: Category[] = [
  { id: "c1000000-0000-0000-0000-000000000001", slug: "living-room", name: "Living room" },
  { id: "c1000000-0000-0000-0000-000000000002", slug: "bedroom", name: "Bedroom" },
  { id: "c1000000-0000-0000-0000-000000000003", slug: "workspace", name: "Workspace" },
  { id: "c1000000-0000-0000-0000-000000000004", slug: "dining-room", name: "Dining room" },
  { id: "c1000000-0000-0000-0000-000000000005", slug: "storage", name: "Storage" },
  { id: "c1000000-0000-0000-0000-000000000006", slug: "lighting", name: "Lighting" },
];

export const productList: ProductListItem[] = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    slug: "taru-work-desk",
    name: "TARU work desk",
    category_slug: "workspace",
    price_min: 1250000,
    thumbnail_url: "/img/taru-work-desk-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    slug: "raka-wall-shelf",
    name: "RAKA wall shelf",
    category_slug: "storage",
    price_min: 450000,
    thumbnail_url: "/img/raka-wall-shelf-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    slug: "tamu-sofa",
    name: "TAMU sofa",
    category_slug: "living-room",
    price_min: 2800000,
    thumbnail_url: "/img/tamu-sofa-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000004",
    slug: "nira-bed-frame",
    name: "NIRA bed frame",
    category_slug: "bedroom",
    price_min: 4500000,
    thumbnail_url: "/img/nira-bed-frame-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000005",
    slug: "meja-dining-table",
    name: "MEJA dining table",
    category_slug: "dining-room",
    price_min: 4500000,
    thumbnail_url: "/img/meja-dining-table-1.jpg",
  },
  {
    id: "a1000000-0000-0000-0000-000000000006",
    slug: "obor-floor-lamp",
    name: "OBOR floor lamp",
    category_slug: "lighting",
    price_min: 1200000,
    thumbnail_url: "/img/obor-floor-lamp-1.jpg",
  },
];

export const productDetails: Record<string, ProductDetail> = {
  "taru-work-desk": {
    id: "a1000000-0000-0000-0000-000000000001",
    slug: "taru-work-desk",
    name: "TARU work desk",
    description:
      "Spacious work desk with a pine wood top and sturdy steel legs. Built-in cable tray keeps your workspace clutter-free.",
    category: { slug: "workspace", name: "Workspace" },
    materials: ["pine wood", "steel"],
    dimensions: { width_cm: 120, depth_cm: 60, height_cm: 75 },
    weight_kg: 18.5,
    images: [
      { url: "/img/taru-work-desk-1.jpg", alt: "TARU work desk front view" },
      { url: "/img/taru-work-desk-2.jpg", alt: "TARU work desk side view" },
    ],
    variants: [
      {
        id: "v1000000-0000-0000-0000-000000000001",
        sku: "TARU-WD-NAT",
        color: "natural",
        size: null,
        price: 1800000,
        stock: 12,
      },
      {
        id: "v1000000-0000-0000-0000-000000000002",
        sku: "TARU-WD-BLK",
        color: "black",
        size: null,
        price: 1950000,
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
      price: 1800000,
      subtotal: 1800000,
      product: {
        slug: "taru-work-desk",
        name: "TARU work desk",
        thumbnail_url: "/img/taru-work-desk-1.jpg",
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
