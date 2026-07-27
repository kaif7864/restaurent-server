import { PrismaClient } from '@prisma/client';
import { TABLE_AUTO_CLEAN_TIMEOUT_MS } from '../../config/business';
import { getIO } from '../../socket';

const prisma = new PrismaClient();

/**
 * Worker: Stale Session & Table Auto-Clean
 * Schedule: Every 5 minutes (every 5 mins)
 * Purpose: Automatically marks tables as available when sessions are closed and auto-clean timeout has elapsed.
 */
export const runSessionCleanupWorker = async (): Promise<{ cleanedCount: number }> => {
  try {
    const cutoffTime = new Date(Date.now() - TABLE_AUTO_CLEAN_TIMEOUT_MS);

    // Find occupied/dirty tables whose session is closed
    const staleTables = await prisma.restaurantTable.findMany({
      where: {
        status: { in: ['occupied', 'dirty', 'payment_pending'] },
        sessions: {
          some: {
            status: 'closed'
          }
        }
      },
      include: {
        sessions: {
          orderBy: { openedAt: 'desc' },
          take: 1
        }
      }
    });

    let cleanedCount = 0;

    for (const table of staleTables) {
      const latestSession = table.sessions[0];
      if (latestSession && latestSession.status === 'closed') {
        const closedTime = latestSession.closedAt || latestSession.openedAt;
        if (closedTime <= cutoffTime) {
          await prisma.restaurantTable.update({
            where: { id: table.id },
            data: { status: 'available' }
          });

          cleanedCount++;

          const io = getIO();
          if (io) {
            io.emit('table:updated', {
              tableId: table.id,
              status: 'available',
              reason: 'auto_clean_timeout'
            });
          }
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Cron:SessionCleanup] Auto-cleaned ${cleanedCount} stale tables.`);
    }

    return { cleanedCount };
  } catch (error) {
    console.error('[Cron:SessionCleanup] Error running session cleanup worker:', error);
    return { cleanedCount: 0 };
  }
};
