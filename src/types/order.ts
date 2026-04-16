import { PrismaClient } from '../../generated/prisma/client';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  address_id: number;
  payment_method: 'payment_gateway';
  voucher_code?: string;
  shipping_method?: string;
  shipping_cost?: number;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

export interface CartItemWithProduct {
  id: number;
  product_id: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: import('../../generated/prisma/client').Prisma.Decimal;
    weight: import('../../generated/prisma/client').Prisma.Decimal;
  };
}

export interface NearestStoreResult {
  store_id: number;
  distance_km: number;
}
