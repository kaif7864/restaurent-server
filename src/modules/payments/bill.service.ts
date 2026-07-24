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
          where: { status: { in: ['open', 'generated', 'payment_pending'] } },
          include: { payments: true }
        }
      },
      orderBy: { openedAt: 'asc' }
    });
  }

  // Generate a bill for a session
  static async generateBill(sessionId: string) {
    const session = await prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        orders: {
          where: { status: { notIn: ['paid', 'voided'] } },
          include: { items: true }
        },
        bills: {
          where: { status: { in: ['open', 'generated', 'payment_pending'] } },
          include: { payments: true }
        }
      }
    });

    if (!session) throw new Error('Session not found');
    if (session.bills.length > 0) return session.bills[0]; // Return existing unpaid bill

    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;
    const orderIds: string[] = [];

    session.orders.forEach((order) => {
      subtotal += Number(order.subtotal);
      taxTotal += Number(order.taxTotal);
      total += Number(order.total);
      orderIds.push(order.id);
    });

    // Create the Bill
    const bill = await prisma.bill.create({
      data: {
        restaurantId: session.orders[0]?.restaurantId || (await prisma.restaurantTable.findUnique({ where: { id: session.tableId } }))?.restaurantId!,
        sessionId: session.id,
        status: 'generated',
        subtotal,
        taxTotal,
        total,
      }
    });

    // Link orders to this bill
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { billId: bill.id }
    });

    return await prisma.bill.findUnique({
      where: { id: bill.id },
      include: { payments: true }
    });
  }

  static async getAllBills(restaurantId: string) {
    return prisma.bill.findMany({
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
      take: 200 // limit to last 200 for performance
    });
  }
}
