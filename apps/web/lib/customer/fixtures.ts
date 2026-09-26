import type { Cart, Profile } from "./types";
import { productDetails } from "../catalog/fixtures";

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

export const profile: Profile = {
  full_name: "Satria Yudha",
  phone: "081200000000",
  address_line: "Jl. Melati No. 10",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40123",
};

export const fixtures = {
  cart,
  profile,
};
