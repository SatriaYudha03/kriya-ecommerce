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

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address_line: string;
  district: string | null;
  city: string;
  province_code: string;
  province: string;
  postal_code: string;
  notes: string | null;
  is_default: boolean;
  created_at: string;
}

export type AddressInput = Omit<Address, "id" | "province" | "created_at">;

export interface Province {
  code: string;
  name: string;
  zone_code: string;
}
