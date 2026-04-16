import { stock_journal_type } from '../../generated/prisma/client';

export interface CreateInventoryInput {
    store_id?: number; // required for super_admin; auto-resolved for store_admin
    product_id: number;
    initial_stock: number; // must be >= 0
    description?: string;
}

export interface AdjustStockInput {
    store_id?: number; // required for super_admin; auto-resolved for store_admin
    product_id: number;
    quantity: number; // always positive; type determines direction
    type: 'addition' | 'reduction';
    description?: string;
}

export interface JournalQueryInput {
    store_id?: number; // super_admin only
    product_id?: number;
    type?: stock_journal_type;
    from?: string; // ISO date string
    to?: string; // ISO date string
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
}

export interface InventoryQueryInput {
    store_id?: number; // super_admin only
    product_id?: number;
}
