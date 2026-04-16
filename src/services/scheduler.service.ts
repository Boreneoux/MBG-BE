import * as cron from 'node-cron';
import logger from '../config/logger.config';
import { orderService } from './order.service';

/**
 * Scheduler service for handling periodic tasks
 */
export const schedulerService = {
  start() {
    // Run every 5 minutes to check for order lifecycle transitions
    cron.schedule('*/5 * * * *', async () => {
      try {
        const cancelledCount = await orderService.cancelExpiredOrders();
        if (cancelledCount > 0) {
          logger.info(`Scheduler: Cancelled ${cancelledCount} expired orders`);
        }

        const autoApprovedCount = await orderService.autoApprovePendingConfirmations();
        if (autoApprovedCount > 0) {
          logger.info(`Scheduler: Auto-approved ${autoApprovedCount} pending confirmations`);
        }

        const autoConfirmedCount = await orderService.autoConfirmShippedOrders();
        if (autoConfirmedCount > 0) {
          logger.info(`Scheduler: Auto-confirmed ${autoConfirmedCount} shipped orders`);
        }
      } catch (error) {
        logger.error('Scheduler error:', error);
      }
    });

    logger.info('Scheduler started - checking for expired orders every 5 minutes');
  }
};