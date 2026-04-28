export interface CreateStoreInput {
  name: string;
  address: string;
  district_id: string;
  city_id: string;
  province_id: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  max_delivery_distance: number;
}

export type UpdateStoreInput = Partial<CreateStoreInput>;
