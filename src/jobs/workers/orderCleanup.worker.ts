import { PrismaClient } from '@prisma/client';
import { getIO } from '../../socket';

const prisma = new PrismaClient();

/**
 * Worker: Expired Unapproved Pending Orders Cleanup
 * Schedule: Every 15 minutes (every 15 mins)
 * Purpose: Automatically voids pending QR orders older than 30 minutes that were never approved or rejected by staff.
 */
export const runOrderCleanupWorker = async (): Promise<{ voidedCount: number }> => {
  try {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'pending_approval',
        createdAt: { lte: cutoffTime }
      },
      include: {
        items: true
      }
    });

    let voidedCount = 0;

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // Void all pending items
        await tx.orderItem.updateMany({
          where: { orderId: order.id, status: 'pending_approval' },
          data: {
            status: 'voided',
            metadata: {
              rejectionReason: 'Auto-expired due to pending approval timeout (30m)'
            }
          }
        });

        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'voided',
            metadata: {
              ...(order.metadata as object || {}),
              autoVoidReason: 'Expired pending approval (30m)'
            }
          }
        });
      });

      voidedCount++;

      const io = getIO();
      if (io) {
        io.emit('order:updated', {
          orderId: order.id,
          status: 'voided',
          tableId: order.tableId
        });
      }
    }

    if (voidedCount > 0) {
      console.log(`[Cron:OrderCleanup] Auto-voided ${voidedCount} expired unapproved pending orders.`);
    }

    return { voidedCount };
  } catch (error) {
    console.error('[Cron:OrderCleanup] Error running order cleanup worker:', error);
    return { voidedCount: 0 };
  }
};
