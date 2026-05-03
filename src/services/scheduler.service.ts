// node-cron is used for local development. On Vercel, use the Vercel Cron job
// in vercel.json which calls GET /api/internal/scheduler/tick instead.
import * as cron from 'node-cron';
import logger from '../config/logger.config';
import { runSchedulerTick } from '../jobs/scheduler.job';

export const schedulerService = {
  start() {
    cron.schedule('*/5 * * * *', async () => {
      try {
        await runSchedulerTick();
      } catch (error) {
        logger.error('Scheduler error:', error);
      }
    });

    logger.info('Scheduler started - running every 5 minutes');
  }
};