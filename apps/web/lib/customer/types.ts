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
