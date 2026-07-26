import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as staffController from './staff.controller';

const router = Router();

router.use(requireAuth, requireRole(['owner', 'manager']));

/**
 * @openapi
 * /api/v1/staff:
 *   get:
 *     tags:
 *       - Staff
 *     summary: Get all staff members
 *     responses:
 *       200:
 *         description: List of staff members
 */
router.get('/', staffController.getStaff);

/**
 * @openapi
 * /api/v1/staff:
 *   post:
 *     tags:
 *       - Staff
 *     summary: Create new staff member
 *     responses:
 *       201:
 *         description: Staff member created
 */
router.post('/', staffController.createStaff);

/**
 * @openapi
 * /api/v1/staff/{id}:
 *   put:
 *     tags:
 *       - Staff
 *     summary: Update staff details
 *     responses:
 *       200:
 *         description: Staff updated
 */
router.put('/:id', staffController.updateStaff);

/**
 * @openapi
 * /api/v1/staff/{id}:
 *   delete:
 *     tags:
 *       - Staff
 *     summary: Delete staff member
 *     responses:
 *       200:
 *         description: Staff deleted
 */
router.delete('/:id', staffController.deleteStaff);

/**
 * @openapi
 * /api/v1/staff/time-logs:
 *   get:
 *     tags:
 *       - Staff
 *     summary: Get staff clock-in/out time logs
 *     responses:
 *       200:
 *         description: Time logs list
 */
router.get('/time-logs', staffController.getTimeLogs);

/**
 * @openapi
 * /api/v1/staff/{id}/clock-in:
 *   post:
 *     tags:
 *       - Staff
 *     summary: Staff clock in
 *     responses:
 *       200:
 *         description: Clocked in
 */
router.post('/:id/clock-in', staffController.clockIn);

/**
 * @openapi
 * /api/v1/staff/{id}/clock-out:
 *   post:
 *     tags:
 *       - Staff
 *     summary: Staff clock out
 *     responses:
 *       200:
 *         description: Clocked out
 */
router.post('/:id/clock-out', staffController.clockOut);

/**
 * @openapi
 * /api/v1/staff/audit-logs:
 *   get:
 *     tags:
 *       - Staff
 *     summary: Get system audit logs
 *     responses:
 *       200:
 *         description: Audit logs list
 */
router.get('/audit-logs', staffController.getAuditLogs);

export default router;
