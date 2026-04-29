import { Router, Request, Response, NextFunction } from 'express';
import { runSchedulerTick } from '../jobs/scheduler.job';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catch-async';
import logger from '../config/logger.config';

const schedulerRouter = Router();

// Vercel Cron sends: GET /api/internal/scheduler/tick
// with Authorization: Bearer <CRON_SECRET> (auto-injected by Vercel)
schedulerRouter.get(
  '/tick',
  (req: Request, _res: Response, next: NextFunction) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return next(new AppError('Unauthorized', 401));
    }

    next();
  },
  catchAsync(async (_req: Request, res: Response) => {
    logger.info('Vercel Cron: scheduler tick triggered');
    await runSchedulerTick();
    res.status(200).json({ ok: true });
  })
);

export default schedulerRouter;
