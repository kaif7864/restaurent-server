import { z } from 'zod';

const orderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    tableId: z.string().uuid().optional().nullable(),
    orderType: z.enum(['dine_in', 'takeout', 'delivery']).default('dine_in'),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  }),
});
