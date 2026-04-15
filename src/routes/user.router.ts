import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  getUsersQuerySchema,
  changeRoleSchema,
  updateProfileSchema
} from '../validators/user.validator';
import { user_role } from '../../generated/prisma/client';
import { multerUpload } from '../helpers/multer.helper';

const router = Router();

// ── Self-service profile routes (any authenticated user) ──────────────────────
router.get('/me', authenticate, userController.getProfile);

router.put(
  '/me',
  authenticate,
  multerUpload('', 'PROFILE', ['jpg', 'jpeg', 'png', 'gif'], 'memory').single(
    'photo'
  ),
  validate(updateProfileSchema),
  userController.updateProfile
);

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.use(authenticate);
// ONLY SUPER ADMIN CAN ACCESS THESE ROUTES
router.use(authorize(user_role.super_admin));

// GET /api/users
router.get('/', validate(getUsersQuerySchema), userController.getUsers);

// GET /api/users/:id
router.get('/:id', userController.getUserById);

// POST /api/users
router.post('/', validate(createUserSchema), userController.createUser);

// PATCH /api/users/:id
router.patch('/:id', validate(updateUserSchema), userController.updateUser);

// PATCH /api/users/:id/role
router.patch(
  '/:id/role',
  validate(changeRoleSchema),
  userController.changeRole
);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

export default router;
