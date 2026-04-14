import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createUserSchema, updateUserSchema, getUsersQuerySchema, changeRoleSchema } from '../validators/user.validator';
import { user_role } from '../../generated/prisma/client';

const router = Router();

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
router.patch('/:id/role', validate(changeRoleSchema), userController.changeRole);

// DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

export default router;
