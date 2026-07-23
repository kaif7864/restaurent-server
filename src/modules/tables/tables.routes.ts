import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as tableController from './tables.controller';

const router = Router();

// All table routes require authentication
router.use(requireAuth);

router.get('/', tableController.getTables);
router.post('/', requireRole(['owner', 'manager']), tableController.createTable);
router.put('/:id', requireRole(['owner', 'manager', 'host', 'waiter']), tableController.updateTable);
router.delete('/:id', requireRole(['owner', 'manager']), tableController.deleteTable);

export default router;
