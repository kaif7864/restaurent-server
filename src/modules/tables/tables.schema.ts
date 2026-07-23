import { z } from 'zod';

export const createTableSchema = z.object({
  name: z.string().min(1, 'Table name is required'),
  capacity: z.number().int().positive().default(4),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).default('available'),
  metadata: z.any().optional(),
});

export const updateTableSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
  metadata: z.any().optional(),
});
