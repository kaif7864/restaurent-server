import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as waitlistController from './waitlist.controller';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole(['host', 'manager', 'owner']), waitlistController.getWaitlist);
router.post('/', requireRole(['host', 'manager', 'owner']), waitlistController.addToWaitlist);
router.put('/:id', requireRole(['host', 'manager', 'owner']), waitlistController.updateWaitlistEntry);
router.delete('/:id', requireRole(['host', 'manager', 'owner']), waitlistController.removeFromWaitlist);

export default router;
