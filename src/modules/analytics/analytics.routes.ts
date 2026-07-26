import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as analyticsController from './analytics.controller';

const router = Router();

router.use(requireAuth, requireRole(['owner', 'manager']));

/**
 * @openapi
 * /api/v1/analytics/dashboard:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Get live dashboard metrics
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/dashboard', analyticsController.getDashboardMetrics);

/**
 * @openapi
 * /api/v1/analytics/z-report:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Generate daily Z-Report
 *     responses:
 *       200:
 *         description: Z-Report data
 */
router.get('/z-report', analyticsController.getZReport);

export default router;
