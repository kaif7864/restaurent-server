import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as sessionController from './session.controller';

const router = Router();

router.use(requireAuth);

router.get('/active', sessionController.getActiveSessions);
router.post('/', sessionController.createSession);
router.post('/:sessionId/bill', sessionController.generateBill);
router.post('/:sessionId/transfer', sessionController.transferTable);

export default router;
