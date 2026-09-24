export interface ShippingAddress {
  recipient: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export interface Profile {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
}

export type UpdateProfilePayload = Profile;

export interface CartItem {
  variant_id: string;
  qty: number;
  price: number;
  subtotal: number;
  product: {
    slug: string;
    name: string;
    thumbnail_url: string;
    color: string;
    size: string | null;
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface PutCartPayloadItem {
  variant_id: string;
  qty: number;
}
