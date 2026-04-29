import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema
} from '../validators/product.validator';
import { user_role } from '../../generated/prisma/client';
import { multerUpload } from '../helpers/multer.helper';

const router = Router();

// Allow maximum 5 images, formats restricted to typical images (no webp per requirements), 1MB limit implied by helper
const uploadImages = multerUpload(
  'products',
  'PRODUCT',
  ['jpg', 'jpeg', 'png', 'gif'],
  'memory'
).array('images', 5);

// Public accessible endpoints (Users & Store Admins)
router.get(
  '/',
  validate(getProductsQuerySchema),
  productController.getProducts
);
router.get('/:slug', productController.getProductBySlug);

// Protected endpoints
router.use(authenticate);

// ONLY SUPER ADMIN CAN MUTATE PRODUCT DATA
router.post(
  '/',
  authorize(user_role.super_admin),
  uploadImages,
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:slug',
  authorize(user_role.super_admin),
  uploadImages,
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:slug',
  authorize(user_role.super_admin),
  productController.deleteProduct
);

export default router;
