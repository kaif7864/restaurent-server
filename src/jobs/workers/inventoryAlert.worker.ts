import { PrismaClient } from '@prisma/client';
import { getIO } from '../../socket';

const prisma = new PrismaClient();

/**
 * Worker: Kitchen Low Stock Inventory Alert Scanner
 * Schedule: Every 1 hour (0 * * * *)
 * Purpose: Scans inventory items below minStock threshold and broadcasts low-stock warnings to KDS & Kitchen Notes.
 */
export const runInventoryAlertWorker = async (): Promise<{ alertCount: number }> => {
  try {
    const allInventory = await prisma.inventoryItem.findMany();
    const lowStockItems = allInventory.filter(item => Number(item.stock) <= Number(item.minStock));

    if (lowStockItems.length > 0) {
      console.warn(`[Cron:InventoryAlert] Found ${lowStockItems.length} low-stock inventory items.`);

      const io = getIO();
      if (io) {
        io.emit('inventory:low_stock_warning', {
          count: lowStockItems.length,
          items: lowStockItems.map((i: any) => ({ id: i.id, name: i.name, stock: i.stock, minStock: i.minStock, unit: i.unit }))
        });
      }
    }

    return { alertCount: lowStockItems.length };
  } catch (error) {
    console.error('[Cron:InventoryAlert] Error scanning inventory stock:', error);
    return { alertCount: 0 };
  }
};
