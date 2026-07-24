import { Router } from 'express';
import { getSettings, updateSettings } from './restaurants.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/settings', requireRole(['owner', 'manager']), getSettings);
router.put('/settings', requireRole(['owner', 'manager']), updateSettings);

export default router;
