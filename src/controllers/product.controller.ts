import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { catchAsync } from '../utils/catch-async';

export const productController = {
    getProducts: catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
        const sort = req.query.sort as string | undefined;

        const result = await productService.getProducts({ page, limit, search, categoryId, sort });

        res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            data: result.data,
            meta: result.meta
        });
    }),

    getProductById: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const product = await productService.getProductById(id);

        res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: product
        });
    }),

    createProduct: catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];
        const product = await productService.createProduct(req.body, files);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    }),

    updateProduct: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const files = req.files as Express.Multer.File[];
        const product = await productService.updateProduct(id, req.body, files);

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    }),

    deleteProduct: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        await productService.deleteProduct(id);

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
            data: null
        });
    })
};
