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

  const autoConfirmedCount = await orderService.autoConfirmShippedOrders();
  if (autoConfirmedCount > 0) {
    logger.info(`Scheduler: Auto-confirmed ${autoConfirmedCount} shipped orders`);
  }
}
