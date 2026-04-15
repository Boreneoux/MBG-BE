import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { calculateShippingSchema } from '../validators/shipping.validator';
import { calculateShippingCost } from '../controllers/shipping.controller';

const shippingRouter = Router();

shippingRouter.post(
  '/costs',
  authenticate,
  validate(calculateShippingSchema),
  calculateShippingCost
);

export default shippingRouter;
