import type { Order } from "./types";

export const orders: Order[] = [
  {
    id: "o1000000-0000-0000-0000-000000000001",
    order_number: "INV/2026/07/0001",
    status: "paid",
    items: [
      {
        variant_id: "v1000000-0000-0000-0000-000000000001",
        name: "TARU work desk",
        color: "natural",
        size: null,
        qty: 1,
        price: 1800000,
        subtotal: 1800000,
        review_id: null,
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
    payment: { can_continue: false },
    can_cancel: false,
    can_return: false,
    timeline: [
      { status: "paid", created_at: "2026-07-06T14:05:00Z", note: null }
    ]
  },
];

export const fixtures = {
  orders,
};
