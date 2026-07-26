import { z } from 'zod';

export const processPaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.enum(['cash', 'card', 'upi', 'online']),
  transactionId: z.string().optional(),
});

// Schema for close-table-only requests (no payment, just closing the table)
export const closeTableSchema = z.object({
  billId: z.string().uuid('Valid Bill ID is required'),
});
