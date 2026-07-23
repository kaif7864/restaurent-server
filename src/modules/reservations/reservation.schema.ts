import { z } from 'zod';

export const createReservationSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerPhone: z.string().min(10, 'Valid phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  date: z.string().datetime().or(z.string()), // Accept ISO string
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  guestCount: z.number().int().min(1, 'At least 1 guest is required'),
  tableId: z.string().uuid().optional().or(z.literal('')),
  specialRequests: z.string().optional(),
});

export const updateReservationSchema = createReservationSchema.partial().extend({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
});
