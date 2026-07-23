import { z } from 'zod';

export const processPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'card', 'upi']),
  transactionId: z.string().optional(),
});
