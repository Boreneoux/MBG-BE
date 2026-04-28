import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createCategorySchema, updateCategorySchema, getCategoriesQuerySchema } from '../validators/category.validator';
import { user_role } from '../../generated/prisma/client';
import { multerUpload } from '../helpers/multer.helper';

const router = Router();
const uploadImage = multerUpload('categories', 'CAT', ['jpg', 'jpeg', 'png', 'gif'], 'memory').single('image');

// Public read endpoints
router.get('/', validate(getCategoriesQuerySchema), categoryController.getCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

// Protected mutation endpoints
router.use(authenticate);

// ONLY Super Admins can do these mutations
router.post(
    '/',
    authorize(user_role.super_admin),
    uploadImage,
    validate(createCategorySchema),
    categoryController.createCategory
);

router.put(
    '/:slug',
    authorize(user_role.super_admin),
    uploadImage,
    validate(updateCategorySchema),
    categoryController.updateCategory
);

router.delete(
    '/:slug',
    authorize(user_role.super_admin),
    categoryController.deleteCategory
);

export default router;
