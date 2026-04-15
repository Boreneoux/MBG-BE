export interface CreateStoreInput {
  name: string;
  address: string;
  district_id: number;
  city_id: number;
  province_id: number;
  postal_code?: string;
  latitude: number;
  longitude: number;
  max_delivery_distance: number;
}

export type UpdateStoreInput = Partial<CreateStoreInput>;
