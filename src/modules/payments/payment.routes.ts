import { Router } from 'express';
import { processPayment, getBillPayments, createCashfreeLink, checkCashfreeStatus, initiateCashfreeRefund, handleCashfreeWebhook, syncCashfreePayment, resolveDoublePayment, closeTableForBill } from './payment.controller';
import { getActiveSessions, generateBill, getAllBills } from './bill.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Public webhook route (Cashfree server-to-server) — BUG 5: signature verified inside handler
router.post('/payments/cashfree-webhook', handleCashfreeWebhook);

router.post('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), processPayment);
router.get('/bills/:id/payments', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getBillPayments);

// BUG 1: Separate close-table endpoint (replaces ₹0 payment hack)
router.post('/bills/:id/close-table', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), closeTableForBill);

router.post('/payments/cashfree-link', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), createCashfreeLink);
router.post('/cashfree-link', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), createCashfreeLink);

router.get('/payments/cashfree-status/:linkId', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), checkCashfreeStatus);
router.get('/cashfree-status/:linkId', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), checkCashfreeStatus);

router.post('/payments/sync-cashfree', requireAuth, requireRole(['owner', 'manager', 'cashier']), syncCashfreePayment);
router.post('/sync-cashfree', requireAuth, requireRole(['owner', 'manager', 'cashier']), syncCashfreePayment);

router.post('/payments/resolve-double-payment', requireAuth, requireRole(['owner', 'manager', 'cashier']), resolveDoublePayment);
router.post('/resolve-double-payment', requireAuth, requireRole(['owner', 'manager', 'cashier']), resolveDoublePayment);

router.post('/payments/:paymentId/refund', requireAuth, requireRole(['owner', 'manager']), initiateCashfreeRefund);
router.post('/:paymentId/refund', requireAuth, requireRole(['owner', 'manager']), initiateCashfreeRefund);

// Session / Bill Generation routes
router.get('/sessions/active', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getActiveSessions);
router.post('/sessions/:sessionId/bill', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), generateBill);
router.get('/bills', requireAuth, requireRole(['owner', 'manager', 'cashier', 'waiter']), getAllBills);

export default router;
