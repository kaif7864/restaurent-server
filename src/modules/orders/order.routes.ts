import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as orderController from './order.controller';

const router = Router();

// All order routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create a new order (POS)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               tableId:
 *                 type: string
 *               orderType:
 *                 type: string
 *                 enum: [dine_in, takeout, delivery]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [itemId, quantity]
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Order successfully created
 */
router.post('/', orderController.createOrder);

/**
 * @openapi
 * /api/v1/orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get all active orders (KDS / Active POS)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active orders
 */
router.get('/', orderController.getActiveOrders);

/**
 * @openapi
 * /api/v1/orders/history:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get all orders history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get('/history', requireRole(['owner', 'manager']), orderController.getAllOrders);

/**
 * @openapi
 * /api/v1/orders/items/{itemId}/status:
 *   patch:
 *     tags:
 *       - Orders (KDS)
 *     summary: Update the preparation status of an order item (KDS)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [sent, preparing, ready, served]
 *     responses:
 *       200:
 *         description: Item status updated
 */
// Only kitchen staff, managers, and owners can update item prep status
router.patch('/items/:itemId/status', requireRole(['cook', 'bartender', 'expo', 'kitchen', 'manager', 'owner', 'waiter']), orderController.updateItemStatus);

router.patch('/:orderId/status', requireRole(['expo', 'manager', 'owner', 'waiter']), orderController.updateOrderStatus);
router.post('/:orderId/pay', requireRole(['manager', 'owner', 'cashier']), orderController.payDirectOrder);

export default router;
