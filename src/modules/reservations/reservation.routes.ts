import { Router } from 'express';
import { getReservations, createReservation, updateReservation, deleteReservation } from './reservation.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Only authenticated users can access reservations
router.use(requireAuth);

router.get('/', getReservations);
router.post('/', createReservation);
router.patch('/:id', updateReservation);
router.delete('/:id', deleteReservation);

export default router;
