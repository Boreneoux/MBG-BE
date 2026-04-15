import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { catchAsync } from '../utils/catch-async';

export const categoryController = {
    getCategories: catchAsync(async (req: Request, res: Response) => {
        const search = req.query.search as string;
        const categories = await categoryService.getCategories(search);

        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: categories
        });
    }),

    getCategoryById: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const category = await categoryService.getCategoryById(id);

        res.status(200).json({
            success: true,
            message: 'Category retrieved successfully',
            data: category
        });
    }),

    createCategory: catchAsync(async (req: Request, res: Response) => {
        const { name } = req.body;
        const file = req.file;
        const category = await categoryService.createCategory(name, file);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    }),

    updateCategory: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { name } = req.body;
        const file = req.file;
        const category = await categoryService.updateCategory(id, name, file);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    }),

    deleteCategory: catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        await categoryService.deleteCategory(id);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: null
        });
    })
};
