import * as cron from 'node-cron';
import logger from '../config/logger.config';
import { orderService } from './order.service';

/**
 * Scheduler service for handling periodic tasks
 */
export const schedulerService = {
  start() {
    // Run every 5 minutes to check for expired orders
    cron.schedule('*/5 * * * *', async () => {
      try {
        const cancelledCount = await orderService.cancelExpiredOrders();
        if (cancelledCount && cancelledCount > 0) {
          logger.info(`Scheduler: Cancelled ${cancelledCount} expired orders`);
        }
      } catch (error) {
        logger.error('Scheduler error:', error);
      }
    });

    logger.info('Scheduler started - checking for expired orders every 5 minutes');
  }
};