import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as sessionController from './session.controller';

const router = Router();

router.use(requireAuth);

router.get('/active', sessionController.getActiveSessions);
router.post('/', sessionController.createSession);

export default router;
