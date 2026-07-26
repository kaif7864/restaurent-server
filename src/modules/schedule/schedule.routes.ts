import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as scheduleController from './schedule.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/schedule:
 *   get:
 *     tags:
 *       - Schedule
 *     summary: Get all staff schedules
 *     responses:
 *       200:
 *         description: List of schedules
 */
router.get('/', scheduleController.getSchedules);

/**
 * @openapi
 * /api/v1/schedule:
 *   post:
 *     tags:
 *       - Schedule
 *     summary: Create staff shift schedule
 *     responses:
 *       201:
 *         description: Schedule created
 */
router.post('/', scheduleController.createSchedule);

/**
 * @openapi
 * /api/v1/schedule/{id}:
 *   delete:
 *     tags:
 *       - Schedule
 *     summary: Delete staff shift schedule
 *     responses:
 *       200:
 *         description: Schedule deleted
 */
router.delete('/:id', scheduleController.deleteSchedule);

export default router;
