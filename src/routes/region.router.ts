import { Router } from 'express';
import { getProvinces, getCities, getDistricts } from '../controllers/region.controller';

const regionRouter = Router();

regionRouter.get('/provinces', getProvinces);
regionRouter.get('/cities', getCities);
regionRouter.get('/districts', getDistricts);

export default regionRouter;
