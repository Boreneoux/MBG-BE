import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { mutationService } from '../services/mutation.service';

export const mutationController = {
    createMutation: catchAsync(async (req: Request, res: Response) => {
        const result = await mutationService.createMutation(req.body);
        res.status(201).json({ success: true, message: 'Stock mutation created successfully', data: result });
    }),

    getMutations: catchAsync(async (req: Request, res: Response) => {
        const result = await mutationService.getMutations(req.query as any);
        res.status(200).json({ success: true, message: 'Mutations retrieved successfully', data: result });
    }),
};
