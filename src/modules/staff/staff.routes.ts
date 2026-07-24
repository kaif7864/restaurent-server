import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as staffController from './staff.controller';

const router = Router();

// All staff routes require manager or owner
router.use(requireAuth, requireRole(['owner', 'manager']));

router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

// Time clock routes
router.get('/time-logs', staffController.getTimeLogs);
router.post('/:id/clock-in', staffController.clockIn);
router.post('/:id/clock-out', staffController.clockOut);

// Audit logs
router.get('/audit-logs', staffController.getAuditLogs);

export default router;
