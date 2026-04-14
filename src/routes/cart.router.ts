import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  deleteCartItemSchema
} from '../validators/cart.validator';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', validate(addToCartSchema), cartController.addItem);
router.put('/:id', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/:id', validate(deleteCartItemSchema), cartController.deleteItem);

export default router;
