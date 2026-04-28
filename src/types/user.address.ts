export interface CreateAddressInput {
  label?: string;
  recipient_name: string;
  phone: string;
  address: string;
  district_id: string;
  city_id: string;
  province_id: string;
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
  district_id?: string;
  city_id?: string;
  province_id?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_primary?: boolean;
}
