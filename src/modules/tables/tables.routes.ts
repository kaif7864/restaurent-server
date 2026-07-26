import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as tableController from './tables.controller';

const router = Router();

// Public route for Customer QR App to call waiter
router.post('/:id/call-waiter', tableController.callWaiter);

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/tables:
 *   get:
 *     tags:
 *       - Tables
 *     summary: Get all tables for restaurant
 *     responses:
 *       200:
 *         description: List of tables
 */
router.get('/', tableController.getTables);

/**
 * @openapi
 * /api/v1/tables:
 *   post:
 *     tags:
 *       - Tables
 *     summary: Create new table
 *     responses:
 *       201:
 *         description: Table created
 */
router.post('/', requireRole(['owner', 'manager']), tableController.createTable);

/**
 * @openapi
 * /api/v1/tables/{id}:
 *   put:
 *     tags:
 *       - Tables
 *     summary: Update table status/details
 *     responses:
 *       200:
 *         description: Table updated
 */
router.put('/:id', requireRole(['owner', 'manager', 'host', 'waiter']), tableController.updateTable);

/**
 * @openapi
 * /api/v1/tables/{id}:
 *   delete:
 *     tags:
 *       - Tables
 *     summary: Delete table
 *     responses:
 *       200:
 *         description: Table deleted
 */
router.delete('/:id', requireRole(['owner', 'manager']), tableController.deleteTable);
router.post('/:id/call-waiter', tableController.callWaiter);

export default router;
