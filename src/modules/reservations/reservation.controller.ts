import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';
import { createReservationSchema, updateReservationSchema } from './reservation.schema';

export const getReservations = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const reservations = await ReservationService.getReservations(restaurantId);
    res.json({ success: true, data: reservations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const validatedData = createReservationSchema.parse(req.body);
    const reservation = await ReservationService.createReservation(restaurantId, validatedData);
    res.status(201).json({ success: true, data: reservation });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    
    // Verify ownership
    const existing = await ReservationService.getReservationById(id, restaurantId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const validatedData = updateReservationSchema.parse(req.body);
    const reservation = await ReservationService.updateReservation(id, restaurantId, validatedData);
    res.json({ success: true, data: reservation });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;

    // Verify ownership
    const existing = await ReservationService.getReservationById(id, restaurantId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    await ReservationService.deleteReservation(id);
    res.json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
