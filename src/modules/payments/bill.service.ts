import prisma from '../../config/prisma';

export class BillService {
  // Get active sessions with their unpaid orders
  static async getActiveSessions(restaurantId: string) {
    return prisma.tableSession.findMany({
      where: {
        table: { restaurantId },
        status: 'active'
      },
      include: {
        table: true,
        orders: {
          where: { status: { notIn: ['paid', 'voided'] } },
          include: {
            items: {
              include: { item: true }
            }
          }
        },
        bills: {
          where: { status: { in: ['open', 'generated', 'unpaid', 'payment_pending'] } },
          include: { payments: true }
        }
      },
      orderBy: { openedAt: 'asc' }
    });
  }

  /**
   * Generate a bill for a session.
   * BUG 8: Now accepts discount and tip, and uses a transaction.
   * BUG 19: Discount and tip are properly applied to the total.
   */
  static async generateBill(sessionId: string, discount: number = 0, tip: number = 0) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findUnique({
        where: { id: sessionId },
        include: {
          table: true,
          orders: {
            where: { status: { notIn: ['paid', 'voided'] } },
            include: { items: true }
          },
          bills: {
            where: { status: { in: ['open', 'generated', 'unpaid', 'payment_pending'] } },
            include: { payments: true }
          }
        }
      });

      if (!session) throw new Error('Session not found');
      if (session.bills.length > 0) return session.bills[0]; // Return existing unpaid bill

      let subtotal = 0;
      let taxTotal = 0;
      const orderIds: string[] = [];

      session.orders.forEach((order) => {
        subtotal += Number(order.subtotal);
        taxTotal += Number(order.taxTotal);
        orderIds.push(order.id);
      });

      // BUG 8/19: Apply discount and tip to calculate the final total
      const discountAmount = Math.max(0, Math.min(Number(discount) || 0, subtotal)); // Cap discount at subtotal
      const tipAmount = Math.max(0, Number(tip) || 0);
      const total = Math.max(0, subtotal + taxTotal - discountAmount + tipAmount);

      // Get restaurantId from session's table or first order
      const restaurantId = session.table?.restaurantId 
        || session.orders[0]?.restaurantId 
        || (await tx.restaurantTable.findUnique({ where: { id: session.tableId } }))?.restaurantId;
      
      if (!restaurantId) throw new Error('Could not determine restaurant for this session');

      // Create the Bill with discount and tip
      const bill = await tx.bill.create({
        data: {
          restaurantId,
          sessionId: session.id,
          status: 'generated',
          subtotal,
          taxTotal,
          discount: discountAmount,
          tip: tipAmount,
          total,
        }
      });

      // Link orders to this bill
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: { billId: bill.id }
      });

      return await tx.bill.findUnique({
        where: { id: bill.id },
        include: { payments: true }
      });
    });
  }

  static async getAllBills(restaurantId: string) {
    // 1. Fetch all explicit bills
    const bills = await prisma.bill.findMany({
      where: { restaurantId },
      include: {
        session: {
          include: { table: true }
        },
        orders: {
          include: { items: { include: { item: true } } }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    const billIds = new Set(bills.map(b => b.id));

    // 2. Fetch standalone paid/completed/voided orders without a billId or whose bill isn't in the list
    const standaloneOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['paid', 'completed', 'voided'] },
        OR: [
          { billId: null },
          { billId: { notIn: Array.from(billIds) } }
        ]
      },
      include: {
        table: true,
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    // BUG 18: Format standalone orders as bill objects — mark synthetic payments clearly
    const formattedOrdersAsBills = standaloneOrders.map((o: any) => ({
      id: o.id,
      restaurantId: o.restaurantId,
      sessionId: o.sessionId,
      status: o.status === 'completed' ? 'paid' : o.status,
      subtotal: Number(o.subtotal || 0),
      taxTotal: Number(o.taxTotal || 0),
      total: Number(o.total || 0),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      session: o.table ? { table: o.table } : (o.sessionId ? { table: null } : null),
      orders: [o],
      payments: [
        {
          id: `synthetic_${o.id.slice(0, 8)}`, // BUG 18: Clearly marked as synthetic
          amount: Number(o.total || 0),
          method: (o.metadata as any)?.paymentMethod || 'cash',
          status: 'completed',
          createdAt: o.createdAt,
          _isSynthetic: true // BUG 18: Flag so frontend can distinguish
        }
      ],
      _isStandaloneOrder: true // BUG 18: Flag for frontend
    }));

    // Combine and expand bills with multiple payments into distinct transaction logs if needed
    const expandedBills: any[] = [];

    bills.forEach((b: any) => {
      if (b.payments && b.payments.length > 1) {
        // Output each payment as a dedicated transaction record so Cash and Online UTR appear distinctly
        b.payments.forEach((p: any, idx: number) => {
          const rowStatus = ['refunded', 'reversed', 'voided'].includes(p.status)
            ? (p.status === 'reversed' ? 'refunded' : p.status)
            : b.status;

          expandedBills.push({
            ...b,
            id: idx === 0 ? b.id : `${b.id}-DUP${idx}`,
            isDoublePaymentEntry: idx > 0 || b.payments.length > 1,
            status: rowStatus,
            paymentMethod: p.method,
            transactionId: p.transactionId,
            payments: [p],
            total: Number(p.amount || b.total),
            notes: p.notes || (idx > 0 ? `Duplicate Payment Candidate (UTR: ${p.transactionId || 'N/A'})` : undefined)
          });
        });
      } else {
        expandedBills.push(b);
      }
    });

    const combined = [...expandedBills, ...formattedOrdersAsBills];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined;
  }
}
