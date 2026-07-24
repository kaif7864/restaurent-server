import { z } from 'zod';

export const processPaymentSchema = z.object({
  amount: z.number().nonnegative('Amount must be non-negative'),
  method: z.enum(['cash', 'card', 'upi']),
  transactionId: z.string().optional(),
});
