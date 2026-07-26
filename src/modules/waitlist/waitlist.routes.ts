import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as waitlistController from './waitlist.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/waitlist:
 *   get:
 *     tags:
 *       - Waitlist
 *     summary: Get waitlist entries
 *     responses:
 *       200:
 *         description: Waitlist entries
 */
router.get('/', requireRole(['host', 'manager', 'owner']), waitlistController.getWaitlist);

/**
 * @openapi
 * /api/v1/waitlist:
 *   post:
 *     tags:
 *       - Waitlist
 *     summary: Add party to waitlist
 *     responses:
 *       201:
 *         description: Party added
 */
router.post('/', requireRole(['host', 'manager', 'owner']), waitlistController.addToWaitlist);

/**
 * @openapi
 * /api/v1/waitlist/{id}:
 *   put:
 *     tags:
 *       - Waitlist
 *     summary: Update waitlist entry status
 *     responses:
 *       200:
 *         description: Entry updated
 */
router.put('/:id', requireRole(['host', 'manager', 'owner']), waitlistController.updateWaitlistEntry);

/**
 * @openapi
 * /api/v1/waitlist/{id}:
 *   delete:
 *     tags:
 *       - Waitlist
 *     summary: Remove party from waitlist
 *     responses:
 *       200:
 *         description: Entry removed
 */
router.delete('/:id', requireRole(['host', 'manager', 'owner']), waitlistController.removeFromWaitlist);

export default router;
