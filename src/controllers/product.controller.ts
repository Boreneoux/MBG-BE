import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { catchAsync } from '../utils/catch-async';

export const productController = {
  getProducts: catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const categoryId = req.query.category as string | undefined;
    const sort = req.query.sort as string | undefined;

    const result = await productService.getProducts({
      page,
      limit,
      search,
      categoryId,
      sort
    });

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result.data,
      meta: result.meta
    });
  }),

  getProductBySlug: catchAsync(async (req: Request, res: Response) => {
    const product = await productService.getProductBySlug(
      req.params.slug as string
    );

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
    const files = req.files as Express.Multer.File[];
    const product = await productService.updateProduct(
      req.params.slug as string,
      req.body,
      files
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  }),

  deleteProduct: catchAsync(async (req: Request, res: Response) => {
    await productService.deleteProduct(req.params.slug as string);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: null
    });
  })
};
