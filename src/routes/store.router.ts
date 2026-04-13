import { Router } from 'express';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { nearestStoreQuerySchema } from '../validators/store.validator';
import { getNearest } from '../controllers/store.controller';

const storeRouter = Router();

storeRouter.get('/', validate(nearestStoreQuerySchema), getNearest);

export default storeRouter;
