import { Router } from 'express';
import { processPayment, getBillPayments } from './payment.controller';
import { getActiveSessions, generateBill } from './bill.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.post('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), processPayment);
router.get('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getBillPayments);

// Session / Bill Generation routes
router.get('/sessions/active', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getActiveSessions);
router.post('/sessions/:sessionId/bill', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), generateBill);

export default router;
