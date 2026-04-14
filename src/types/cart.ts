import { PrismaClient } from '../../generated/prisma/client';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface AddToCartInput {
  product_id: number;
  quantity: number;
  store_id: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}
