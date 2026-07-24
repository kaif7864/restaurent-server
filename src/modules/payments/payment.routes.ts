import { Router } from 'express';
import { processPayment, getBillPayments, createCashfreeLink, checkCashfreeStatus } from './payment.controller';
import { getActiveSessions, generateBill, getAllBills } from './bill.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.post('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), processPayment);
router.get('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getBillPayments);

router.post('/payments/cashfree-link', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), createCashfreeLink);
router.get('/payments/cashfree-status/:linkId', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), checkCashfreeStatus);

// Session / Bill Generation routes
router.get('/sessions/active', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getActiveSessions);
router.post('/sessions/:sessionId/bill', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), generateBill);
router.get('/bills', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getAllBills);

export default router;
