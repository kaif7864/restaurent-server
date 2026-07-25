import prisma from '../../config/prisma';

export class PaymentService {
  static async processPayment(billId: string, data: { amount: number; method: string; transactionId?: string }) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { session: true },
    });

    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === 'paid') {
      throw new Error(`Cannot pay a bill with status ${bill.status}`);
    }

    // Process payment inside a transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const payment = await tx.payment.create({
        data: {
          billId,
          amount: data.amount,
          method: data.method,
          transactionId: data.transactionId,
          status: 'completed',
        },
      });

      // 2. Check if total payments cover the bill total
      const allPayments = await tx.payment.findMany({
        where: { billId, status: 'completed' },
      });
      
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const billTotal = Number(bill.total);

      // 3. Update bill status to paid if fully paid
      if (totalPaid >= billTotal) {
        await tx.bill.update({
          where: { id: billId },
          data: { status: 'paid' },
        });

        // Close session
        await tx.tableSession.update({
          where: { id: bill.sessionId },
          data: {
            status: 'closed',
            closedAt: new Date()
          }
        });

        // Update table status to needs_cleaning
        if (bill.session.tableId) {
          await tx.restaurantTable.update({
            where: { id: bill.session.tableId },
            data: { status: 'needs_cleaning' }
          });
          
          // Trigger auto-clean fallback outside transaction
          const { scheduleTableAutoClean } = require('../tables/tables.service');
          scheduleTableAutoClean(bill.session.tableId);
        }
      } else {
         // Still partial payment
         await tx.bill.update({
          where: { id: billId },
          data: { status: 'payment_pending' },
        });
      }

      return payment;
    });
  }

  static async getPaymentsByBill(billId: string) {
    return prisma.payment.findMany({
      where: { billId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
