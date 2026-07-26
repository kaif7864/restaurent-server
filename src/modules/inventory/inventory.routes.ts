import { Router } from 'express';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } from './inventory.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/inventory:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get all inventory items
 *     responses:
 *       200:
 *         description: Inventory list
 */
router.get('/', requireRole(['owner', 'manager', 'cook', 'expo']), getInventory);

/**
 * @openapi
 * /api/v1/inventory:
 *   post:
 *     tags:
 *       - Inventory
 *     summary: Add inventory item
 *     responses:
 *       201:
 *         description: Inventory item added
 */
router.post('/', requireRole(['owner', 'manager', 'cook']), addInventoryItem);

/**
 * @openapi
 * /api/v1/inventory/{id}:
 *   patch:
 *     tags:
 *       - Inventory
 *     summary: Update stock level or details
 *     responses:
 *       200:
 *         description: Inventory updated
 */
router.patch('/:id', requireRole(['owner', 'manager', 'cook']), updateInventoryItem);

/**
 * @openapi
 * /api/v1/inventory/{id}:
 *   delete:
 *     tags:
 *       - Inventory
 *     summary: Delete inventory item
 *     responses:
 *       200:
 *         description: Inventory item deleted
 */
router.delete('/:id', requireRole(['owner', 'manager']), deleteInventoryItem);

export default router;
