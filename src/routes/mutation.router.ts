import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createMutationSchema, getMutationsQuerySchema } from '../validators/mutation.validator';
import { mutationController } from '../controllers/mutation.controller';

const mutationRouter = Router();

// Only Super Admin can access mutations
mutationRouter.use(authenticate, authorize('super_admin'));

mutationRouter.post(
    '/',
    validate(createMutationSchema),
    mutationController.createMutation
);

mutationRouter.get(
    '/',
    validate(getMutationsQuerySchema),
    mutationController.getMutations
);

export default mutationRouter;
