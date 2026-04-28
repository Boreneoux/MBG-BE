import { PrismaClient } from '../../generated/prisma/client';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface AddToCartInput {
  product_id: string;
  quantity: number;
  store_id: string;
}

export interface UpdateCartItemInput {
  quantity: number;
}
