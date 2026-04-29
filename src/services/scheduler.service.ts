// node-cron is used for local development. On Vercel, use the Vercel Cron job
// in vercel.json which calls GET /api/internal/scheduler/tick instead.
// import * as cron from 'node-cron';
// import logger from '../config/logger.config';
// import { orderService } from './order.service';

// export const schedulerService = {
//   start() {
//     cron.schedule('*/5 * * * *', async () => {
//       try {
//         const cancelledCount = await orderService.cancelExpiredOrders();
//         if (cancelledCount > 0) {
//           logger.info(`Scheduler: Cancelled ${cancelledCount} expired orders`);
//         }
//
//         const autoApprovedCount = await orderService.autoApprovePendingConfirmations();
//         if (autoApprovedCount > 0) {
//           logger.info(`Scheduler: Auto-approved ${autoApprovedCount} pending confirmations`);
//         }
//
//         const autoConfirmedCount = await orderService.autoConfirmShippedOrders();
//         if (autoConfirmedCount > 0) {
//           logger.info(`Scheduler: Auto-confirmed ${autoConfirmedCount} shipped orders`);
//         }
//       } catch (error) {
//         logger.error('Scheduler error:', error);
//       }
//     });
//
//     logger.info('Scheduler started - checking for expired orders every 5 minutes');
//   }
// };