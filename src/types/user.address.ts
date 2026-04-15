export interface CreateAddressInput {
  label?: string;
  recipient_name: string;
  phone: string;
  address: string;
  district_id: number;
  city_id: number;
  province_id: number;
  postal_code?: string;
  latitude: number;
  longitude: number;
  is_primary?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  recipient_name?: string;
  phone?: string;
  address?: string;
  district_id?: number;
  city_id?: number;
  province_id?: number;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_primary?: boolean;
}
