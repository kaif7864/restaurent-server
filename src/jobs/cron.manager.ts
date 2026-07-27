import cron from 'node-cron';
import { runSessionCleanupWorker } from './workers/sessionCleanup.worker';
import { runOrderCleanupWorker } from './workers/orderCleanup.worker';
import { runInventoryAlertWorker } from './workers/inventoryAlert.worker';
import { runDailyEodWorker } from './workers/dailyEod.worker';

/**
 * Central Cron Job Manager
 * Initializes and schedules all background jobs in savory-server.
 */
export class CronManager {
  private static isInitialized = false;

  public static init() {
    if (this.isInitialized) {
      console.log('⚠️ [CronManager] Background cron jobs already initialized.');
      return;
    }

    console.log('🚀 [CronManager] Initializing background cron jobs...');

    // Job 1: Table Session & Auto-Clean Worker (Every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      await runSessionCleanupWorker();
    });

    // Job 2: Expired Pending Order Auto-Void Worker (Every 15 minutes)
    cron.schedule('*/15 * * * *', async () => {
      await runOrderCleanupWorker();
    });

    // Job 3: Low-Stock Inventory Warning Alert Worker (Every 1 hour)
    cron.schedule('0 * * * *', async () => {
      await runInventoryAlertWorker();
    });

    // Job 4: Daily Midnight EOD Maintenance & Cleanup Worker (At 00:00 Daily)
    cron.schedule('0 0 * * *', async () => {
      await runDailyEodWorker();
    });

    this.isInitialized = true;
    console.log('✅ [CronManager] All background cron jobs registered & active.');
  }

  /**
   * Run a specific worker manually (useful for testing or manual triggers)
   */
  public static async runManually(jobName: 'sessionCleanup' | 'orderCleanup' | 'inventoryAlert' | 'dailyEod') {
    switch (jobName) {
      case 'sessionCleanup':
        return await runSessionCleanupWorker();
      case 'orderCleanup':
        return await runOrderCleanupWorker();
      case 'inventoryAlert':
        return await runInventoryAlertWorker();
      case 'dailyEod':
        return await runDailyEodWorker();
    }
  }
}
