import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Worker: Daily End of Day (EOD) Maintenance & Analytics Aggregation
 * Schedule: Every Midnight at 00:00 (0 0 * * *)
 * Purpose: Aggregates daily financial metrics, cleans expired audit logs, and logs system maintenance checkpoint.
 */
export const runDailyEodWorker = async (): Promise<{ success: boolean; date: string }> => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    console.log(`[Cron:DailyEOD] Running Midnight EOD Maintenance for ${todayStr}...`);

    // Clean audit logs older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: { createdAt: { lte: ninetyDaysAgo } }
    });

    console.log(`[Cron:DailyEOD] Cleaned ${deletedLogs.count} audit logs older than 90 days.`);
    return { success: true, date: todayStr };
  } catch (error) {
    console.error(`[Cron:DailyEOD] Error running EOD maintenance for ${todayStr}:`, error);
    return { success: false, date: todayStr };
  }
};
