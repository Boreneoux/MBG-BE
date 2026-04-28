export interface CalculateInput {
  store_id: string;
  address_id: string;
  user_id: string;
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
