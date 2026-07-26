import { Router } from 'express';
import { getReservations, createReservation, updateReservation, deleteReservation } from './reservation.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/reservations:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get all table reservations
 *     responses:
 *       200:
 *         description: List of reservations
 */
router.get('/', getReservations);

/**
 * @openapi
 * /api/v1/reservations:
 *   post:
 *     tags:
 *       - Reservations
 *     summary: Create table reservation
 *     responses:
 *       201:
 *         description: Reservation created
 */
router.post('/', createReservation);

/**
 * @openapi
 * /api/v1/reservations/{id}:
 *   patch:
 *     tags:
 *       - Reservations
 *     summary: Update reservation status/details
 *     responses:
 *       200:
 *         description: Reservation updated
 */
router.patch('/:id', updateReservation);

/**
 * @openapi
 * /api/v1/reservations/{id}:
 *   delete:
 *     tags:
 *       - Reservations
 *     summary: Delete reservation
 *     responses:
 *       200:
 *         description: Reservation deleted
 */
router.delete('/:id', deleteReservation);

export default router;
