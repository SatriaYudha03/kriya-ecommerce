import type { Order, Review, ReviewSummary } from "./types";

export const orders: Order[] = [
  {
    id: "o1000000-0000-0000-0000-000000000001",
    order_number: "INV/2026/07/0001",
    status: "paid",
    items: [
      {
        id: "oi100000-0000-0000-0000-000000000001",
        variant_id: "v1000000-0000-0000-0000-000000000001",
        product_slug: "taru-work-desk",
        thumbnail_url: "",
        name: "TARU work desk",
        sku: null,
        color: "natural",
        size: null,
        qty: 1,
        price: 1800000,
        regular_price: 1800000,
        discount_amount: 0,
        subtotal: 1800000,
        refunded_qty: 0,
        can_review: true,
        review_id: null,
      },
    ],
    subtotal: 1800000,
    discount_total: 0,
    shipping_cost: 150000,
    shipping_discount: 0,
    tax_amount: 0,
    total: 1950000,
    coupon_code: null,
    shipping_method: null,
    shipping_address: {
      recipient: "Satria",
      phone: "081200000000",
      address_line: "Jl. Melati No. 10",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40123",
    },
    customer_note: null,
    courier: null,
    tracking_number: null,
    created_at: "2026-07-06T14:00:00Z",
    payment: { status: "paid", can_continue: false, expires_at: null },
    can_cancel: false,
    can_return: false,
    paid_at: "2026-07-06T14:05:00Z",
    shipped_at: null,
    completed_at: null,
    cancelled_at: null,
    timeline: [
      { status: "paid", created_at: "2026-07-06T14:05:00Z", note: null },
    ],
    notes: [
      { id: "n1", body: "Tolong kirim sebelum jam 3", is_customer_visible: true, created_at: "2026-07-06T14:02:00Z", author_name: "Satria" }
    ],
  },
];

export const reviews: Review[] = [
  {
    id: "rev10000-0000-0000-0000-000000000001",
    product_id: "p1000000-0000-0000-0000-000000000001",
    user_id: "u1000000-0000-0000-0000-000000000001",
    order_item_id: "oi100000-0000-0000-0000-000000000001",
    rating: 5,
    title: "Sangat bagus",
    body: "Meja kerja TARU sangat nyaman.",
    status: "approved",
    admin_reply: null,
    replied_at: null,
    created_at: "2026-07-10T14:00:00Z",
    updated_at: "2026-07-10T14:00:00Z",
    user_name: "Satria",
    product_name: "TARU work desk",
    product_slug: "taru-work-desk",
    variant_name: "natural",
  }
];

export const reviewSummary: ReviewSummary = {
  average_rating: 5,
  total_reviews: 1,
  rating_counts: { "5": 1 }
};

export const fixtures = {
  orders,
  reviews,
  reviewSummary
};
