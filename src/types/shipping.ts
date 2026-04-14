export interface CalculateInput {
  store_id: number;
  address_id: number;
  user_id: number;
  weight: number; // grams
  courier: string; // jne | tiki | pos
}

export interface ShippingOption {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export interface CalculateResult {
  distance_km: number;
  options: ShippingOption[];
}
