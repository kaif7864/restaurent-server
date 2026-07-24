import { Router } from 'express';
import { getInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } from './inventory.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole(['owner', 'manager', 'cook', 'expo']), getInventory);
router.post('/', requireRole(['owner', 'manager', 'cook']), addInventoryItem);
router.patch('/:id', requireRole(['owner', 'manager', 'cook']), updateInventoryItem);
router.delete('/:id', requireRole(['owner', 'manager']), deleteInventoryItem);

export default router;
