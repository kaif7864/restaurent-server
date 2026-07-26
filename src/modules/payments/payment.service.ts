import prisma from '../../config/prisma';

export class PaymentService {
  /**
   * Process a payment for a bill.
   * Fixes applied:
   * - BUG 2: Uses SERIALIZABLE isolation to prevent race conditions
   * - BUG 3: Validates amount does not exceed remaining balance
   * - BUG 6: Null-checks sessionId before updating session
   * - BUG 11: Side effects (auto-clean) moved outside transaction
   * - BUG 12: Paid-bill cleanup only runs if session is still open
   * - BUG 15: Idempotency check prevents duplicate payments
   */
  static async processPayment(billId: string, data: { amount: number; method: string; transactionId?: string }) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { session: true, payments: true },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === 'paid') {
      throw new Error('Bill is already fully paid');
    }

    if (bill.status === 'voided') {
      throw new Error('Cannot process payment on a voided bill');
    }

    // BUG 3: Validate amount does not exceed remaining balance
    const existingPaid = bill.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const billTotal = Number(bill.total);
    const remainingBalance = billTotal - existingPaid;

    if (data.amount > remainingBalance + 0.01) { // +0.01 for floating point tolerance
      throw new Error(`Amount ₹${data.amount} exceeds remaining balance of ₹${remainingBalance.toFixed(2)}`);
    }

    // BUG 15: Idempotency — check if a payment with same transactionId already exists
    if (data.transactionId) {
      const duplicatePayment = await prisma.payment.findFirst({
        where: { billId, transactionId: data.transactionId }
      });
      if (duplicatePayment) {
        throw new Error('A payment with this transaction ID already exists for this bill');
      }
    }

    // Track tableId for post-transaction side effects
    let tableIdForCleanup: string | null = null;

    // BUG 2: Use SERIALIZABLE isolation to prevent concurrent double-payments
    const payment = await prisma.$transaction(async (tx) => {
      // 1. Re-read bill inside transaction to get accurate state
      const freshBill = await tx.bill.findUnique({
        where: { id: billId },
        include: { session: true, payments: { where: { status: 'completed' } } },
      });

      if (!freshBill) throw new Error('Bill not found');
      if (freshBill.status === 'paid') throw new Error('Bill is already fully paid');

      // Re-check remaining balance inside transaction
      const txTotalPaid = freshBill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const txBillTotal = Number(freshBill.total);
      const txRemaining = txBillTotal - txTotalPaid;

      if (data.amount > txRemaining + 0.01) {
        throw new Error(`Amount ₹${data.amount} exceeds remaining balance of ₹${txRemaining.toFixed(2)}`);
      }

      // 2. Create payment record
      const newPayment = await tx.payment.create({
        data: {
          billId,
          amount: data.amount,
          method: data.method,
          transactionId: data.transactionId,
          status: 'completed',
        },
      });

      // 3. Check if total payments now cover the bill total
      const newTotalPaid = txTotalPaid + data.amount;

      if (newTotalPaid >= txBillTotal) {
        await tx.bill.update({
          where: { id: billId },
          data: { status: 'paid' },
        });

        // BUG 6: Null-check sessionId before updating session
        if (freshBill.sessionId) {
          await tx.tableSession.update({
            where: { id: freshBill.sessionId },
            data: { status: 'closed', closedAt: new Date() }
          });
        }

        // BUG 6: Null-check tableId
        if (freshBill.session?.tableId) {
          await tx.restaurantTable.update({
            where: { id: freshBill.session.tableId },
            data: { status: 'needs_cleaning' }
          });
          // BUG 11: Store tableId for cleanup AFTER transaction
          tableIdForCleanup = freshBill.session.tableId;
        }
      } else {
        // Still partial payment
        await tx.bill.update({
          where: { id: billId },
          data: { status: 'payment_pending' },
        });
      }

      return newPayment;
    }, {
      // BUG 2: Serializable isolation prevents concurrent reads from both seeing totalPaid=0
      isolationLevel: 'Serializable',
      timeout: 10000,
    });

    // BUG 11: Side effects AFTER transaction completes successfully
    if (tableIdForCleanup) {
      try {
        const { scheduleTableAutoClean } = require('../tables/tables.service');
        scheduleTableAutoClean(tableIdForCleanup);
      } catch (e) {
        console.warn('Auto-clean scheduling failed (non-critical):', e);
      }
    }

    return payment;
  }

  /**
   * Close a fully-paid bill's table session (separate from payment processing).
   * BUG 12: Only acts if the session is still open — no repeated side effects.
   */
  static async closeTableForPaidBill(billId: string) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { session: true },
    });

    if (!bill) throw new Error('Bill not found');
    if (bill.status !== 'paid') throw new Error('Bill is not fully paid yet');

    let tableIdForCleanup: string | null = null;

    // Only close session if it's still active
    if (bill.sessionId) {
      const session = await prisma.tableSession.findUnique({
        where: { id: bill.sessionId }
      });
      if (session && session.status === 'active') {
        await prisma.tableSession.update({
          where: { id: bill.sessionId },
          data: { status: 'closed', closedAt: new Date() }
        });
      }
    }

    if (bill.session?.tableId) {
      const table = await prisma.restaurantTable.findUnique({
        where: { id: bill.session.tableId }
      });
      if (table && table.status === 'occupied') {
        await prisma.restaurantTable.update({
          where: { id: bill.session.tableId },
          data: { status: 'needs_cleaning' }
        });
        tableIdForCleanup = bill.session.tableId;
      }
    }

    if (tableIdForCleanup) {
      try {
        const { scheduleTableAutoClean } = require('../tables/tables.service');
        scheduleTableAutoClean(tableIdForCleanup);
      } catch (e) {
        console.warn('Auto-clean scheduling failed (non-critical):', e);
      }
    }

    return { success: true, message: 'Table session closed successfully' };
  }

  static async getPaymentsByBill(billId: string) {
    return prisma.payment.findMany({
      where: { billId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
