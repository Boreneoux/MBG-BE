import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { inventoryService } from '../services/inventory.service';
import { JwtPayload } from '../middlewares/auth.middleware';

export const inventoryController = {
    // POST /inventory
    createInventory: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        const result = await inventoryService.createInventory(req.body, user);
        res.status(201).json({ success: true, message: 'Inventory created successfully', data: result });
    }),

    // DELETE /inventory/:id
    deleteInventory: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        await inventoryService.deleteInventory(req.params.id as string, user);
        res.status(204).send();
    }),

    // POST /inventory/adjust
    adjustStock: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        const result = await inventoryService.adjustStock(req.body, user);
        res.status(200).json({ success: true, message: 'Stock adjusted successfully', data: result });
    }),

    // POST /inventory/journal
    createJournal: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        const result = await inventoryService.createJournal(req.body, user);
        res.status(201).json({ success: true, message: 'Journal entry created successfully', data: result });
    }),

    // GET /inventory/journal
    getJournals: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        const result = await inventoryService.getJournals(req.query as any, user);
        res.json({ success: true, message: 'Journals retrieved', data: result });
    }),

    // GET /inventory
    getInventories: catchAsync(async (req: Request, res: Response) => {
        const user = req.user as JwtPayload;
        const result = await inventoryService.getInventories(req.query as any, user);
        res.json({ success: true, message: 'Inventories retrieved', data: result });
    }),
};
