import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as analyticsController from './analytics.controller';

const router = Router();

router.use(requireAuth, requireRole(['owner', 'manager']));

router.get('/dashboard', analyticsController.getDashboardMetrics);
router.get('/z-report', analyticsController.getZReport);

export default router;
