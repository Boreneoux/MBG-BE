import { PrismaClient, order_status } from '../../generated/prisma/client';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface AdminOrderQueryInput {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  warehouse_id?: string;
  order_number?: string;
  status?: order_status;
  from?: string;
  to?: string;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  address_id: string;
  payment_method: 'payment_gateway';
  voucher_code?: string;
  shipping_method?: string;
  shipping_cost?: number;
  cart_item_ids?: string[];
}

// ─── Internal Types ───────────────────────────────────────────────────────────

export interface CartItemWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: import('../../generated/prisma/client').Prisma.Decimal;
    weight: import('../../generated/prisma/client').Prisma.Decimal;
  };
}

export interface NearestStoreResult {
  store_id: string;
  distance_km: number;
}
