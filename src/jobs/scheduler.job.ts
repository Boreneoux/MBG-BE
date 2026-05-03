// node-cron is used for local development. On Vercel, use the Vercel Cron job
// in vercel.json which calls GET /api/internal/scheduler/tick instead.
import * as cron from 'node-cron';
import { orderService } from '../services/order.service';
import logger from '../config/logger.config';

export async function runSchedulerTick() {
  const cancelledCount = await orderService.cancelExpiredOrders();
  if (cancelledCount > 0) {
    logger.info(`Scheduler: Cancelled ${cancelledCount} expired orders`);
  }

  const autoApprovedCount = await orderService.autoApprovePendingConfirmations();
  if (autoApprovedCount > 0) {
    logger.info(`Scheduler: Auto-approved ${autoApprovedCount} pending confirmations`);
  }

  const autoShippedCount = await orderService.autoShipProcessingOrders();
  if (autoShippedCount > 0) {
    logger.info(`Scheduler: Auto-shipped ${autoShippedCount} processing orders`);
  }

  const autoConfirmedCount = await orderService.autoConfirmShippedOrders();
  if (autoConfirmedCount > 0) {
    logger.info(`Scheduler: Auto-confirmed ${autoConfirmedCount} shipped orders`);
  }
}

export function startSchedulerJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runSchedulerTick();
    } catch (error) {
      logger.error('Scheduler error:', error);
    }
  });

  logger.info('Scheduler started - running every 5 minutes');
}
