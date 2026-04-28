import { stock_journal_type } from '../../generated/prisma/client';

export interface CreateInventoryInput {
    store_id?: string; // required for super_admin; auto-resolved for store_admin
    product_id: string;
    initial_stock: number; // must be >= 0
    description?: string;
}

export interface AdjustStockInput {
    store_id?: string; // required for super_admin; auto-resolved for store_admin
    product_id: string;
    quantity: number; // always positive; type determines direction
    type: 'addition' | 'reduction';
    description?: string;
}

export interface JournalQueryInput {
    store_id?: string; // super_admin only
    product_id?: string;
    type?: stock_journal_type;
    from?: string; // ISO date string
    to?: string; // ISO date string
    page?: number;
    limit?: number;
    sort?: 'asc' | 'desc';
}

export interface InventoryQueryInput {
    store_id?: string; // super_admin only
    product_id?: string;
}
