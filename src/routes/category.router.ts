import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createCategorySchema, updateCategorySchema, getCategoriesQuerySchema } from '../validators/category.validator';
import { user_role } from '../../generated/prisma/client';
import { multerUpload } from '../helpers/multer.helper';

const router = Router();
const uploadImage = multerUpload('categories', 'CAT', ['jpg', 'jpeg', 'png', 'gif'], 'memory').single('image');

// Store Admins and Super Admins can only view the categories
// We combine both in one array inside authorize
router.use(authenticate);

// GET /api/categories (Accessible by both super_admin and store_admin)
router.get(
    '/',
    authorize(user_role.super_admin, user_role.store_admin),
    validate(getCategoriesQuerySchema),
    categoryController.getCategories
);

// GET /api/categories/:id
router.get(
    '/:id',
    authorize(user_role.super_admin, user_role.store_admin),
    categoryController.getCategoryById
);

// ONLY Super Admins can do these mutations
router.post(
    '/',
    authorize(user_role.super_admin),
    uploadImage,
    validate(createCategorySchema),
    categoryController.createCategory
);

router.put(
    '/:id',
    authorize(user_role.super_admin),
    uploadImage,
    validate(updateCategorySchema),
    categoryController.updateCategory
);

router.delete(
    '/:id',
    authorize(user_role.super_admin),
    categoryController.deleteCategory
);

export default router;
