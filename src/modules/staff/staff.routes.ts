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

export default router;
