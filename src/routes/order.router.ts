import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createOrderSchema } from '../validators/order.validator';
import { multerUpload } from '../helpers/multer.helper';

const router = Router();

// Webhook route (no authentication required)
router.post('/webhook/payment', orderController.paymentWebhook);

// All order routes require authentication
router.use(authenticate);

// POST /api/orders
router.post('/', validate(createOrderSchema), orderController.createOrder);

// POST /api/orders/:id/payment-proof
router.post('/:id/payment-proof', multerUpload('', 'PAYMENT-PROOF').single('proof'), orderController.uploadPaymentProof);

export default router;
