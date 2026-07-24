import { Router } from 'express';
import { getNotes, addNote, updateNote, deleteNote } from './kitchen.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/notes', requireRole(['owner', 'manager', 'cook', 'expo']), getNotes);
router.post('/notes', requireRole(['owner', 'manager', 'cook', 'expo']), addNote);
router.patch('/notes/:id', requireRole(['owner', 'manager', 'cook', 'expo']), updateNote);
router.delete('/notes/:id', requireRole(['owner', 'manager', 'cook']), deleteNote);

export default router;
