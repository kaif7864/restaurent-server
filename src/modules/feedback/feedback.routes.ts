import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as feedbackController from './feedback.controller';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/feedback:
 *   get:
 *     tags:
 *       - Feedback
 *     summary: Get all customer feedback
 *     responses:
 *       200:
 *         description: List of feedbacks
 */
router.get('/', feedbackController.getFeedbacks);

/**
 * @openapi
 * /api/v1/feedback:
 *   post:
 *     tags:
 *       - Feedback
 *     summary: Submit customer feedback
 *     responses:
 *       201:
 *         description: Feedback created
 */
router.post('/', feedbackController.createFeedback);

export default router;
