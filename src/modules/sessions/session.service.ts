import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionService {
  static async createSession(restaurantId: string, data: any) {
    const { tableId, guestCount, reservationId, waitlistId } = data;

    return await prisma.$transaction(async (tx) => {
      // Check if table ALREADY has an active session
      const existingActive = await tx.tableSession.findFirst({
        where: { tableId, status: 'active' },
        include: { orders: true, bills: true }
      });

      if (existingActive) {
        const activeOrdersCount = existingActive.orders.filter(o => o.status !== 'voided').length;
        if (activeOrdersCount === 0 && existingActive.bills.length === 0) {
          // Cancel old empty ghost session
          await tx.tableSession.update({
            where: { id: existingActive.id },
            data: { status: 'cancelled', closedAt: new Date() }
          });
        } else {
          // Reuse existing active session!
          return existingActive;
        }
      }

      // Create session
      const session = await tx.tableSession.create({
        data: {
          tableId,
          guestCount: guestCount || 2,
          status: 'active'
        }
      });

      // Update table status
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'occupied' }
      });

      // If tied to reservation, mark completed
      if (reservationId) {
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'completed' }
        });
      }

      // If tied to waitlist, mark seated
      if (waitlistId) {
        await tx.waitlist.update({
          where: { id: waitlistId },
          data: { status: 'seated' }
        });
      }

      return session;
    });
  }

  static async getActiveSessions(restaurantId: string) {
    // 1. Auto-cleanup empty ghost active sessions (0 orders & 0 bills)
    await prisma.tableSession.updateMany({
      where: {
        status: 'active',
        table: { restaurantId },
        orders: { none: {} },
        bills: { none: {} }
      },
      data: { status: 'cancelled', closedAt: new Date() }
    });

    const sessions = await prisma.tableSession.findMany({
      where: {
        status: 'active',
        table: { restaurantId }
      },
      include: {
        table: true,
        orders: {
          where: { status: { notIn: ['voided'] } },
          include: {
            items: {
              where: { status: { notIn: ['voided'] } },
              include: { item: { select: { name: true, price: true, imageUrl: true } } }
            }
          }
        },
        bills: {
          include: { payments: true }
        }
      },
      orderBy: { openedAt: 'desc' }
    });

    // For any session where session.orders is empty, fetch table orders for tableId!
    for (const session of sessions) {
      if (!session.orders || session.orders.length === 0) {
        const tableOrders = await prisma.order.findMany({
          where: {
            tableId: session.tableId,
            status: { notIn: ['voided'] }
          },
          include: {
            items: {
              where: { status: { notIn: ['voided'] } },
              include: { item: { select: { name: true, price: true, imageUrl: true } } }
            }
          }
        });
        session.orders = tableOrders as any;
      }
    }

    // Deduplicate sessions per table: keep the session with non-zero orders or latest timestamp
    const tableMap = new Map<string, typeof sessions[0]>();
    sessions.forEach(s => {
      const tId = s.tableId;
      if (!tableMap.has(tId)) {
        tableMap.set(tId, s);
      } else {
        const existing = tableMap.get(tId)!;
        if (s.orders.length > existing.orders.length) {
          tableMap.set(tId, s);
        }
      }
    });

    return Array.from(tableMap.values());
  }

  static async generateBill(restaurantId: string, sessionId: string, discount: number = 0, tip: number = 0) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findFirst({
        where: { id: sessionId, table: { restaurantId } },
        include: { orders: true, bills: true }
      });

      if (!session) throw new Error('Session not found');
      if (session.bills.length > 0) return session.bills[0]; // Already generated

      const totalSubtotal = session.orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
      const totalTax = session.orders.reduce((sum, o) => sum + Number(o.taxTotal), 0);
      const total = totalSubtotal + totalTax - discount + tip;

      const bill = await tx.bill.create({
        data: {
          restaurantId,
          sessionId,
          subtotal: totalSubtotal,
          taxTotal: totalTax,
          discount,
          tip,
          total: Math.max(0, total),
          status: 'unpaid'
        }
      });

      return bill;
    });
  }

  static async transferTable(restaurantId: string, sessionId: string, newTableId: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findFirst({
        where: { id: sessionId, table: { restaurantId }, status: 'active' }
      });
      if (!session) throw new Error('Active session not found');

      const newTable = await tx.restaurantTable.findFirst({
        where: { id: newTableId, restaurantId }
      });
      if (!newTable || newTable.status === 'occupied') {
        throw new Error('New table is not available or does not exist');
      }

      // Update old table
      await tx.restaurantTable.update({
        where: { id: session.tableId },
        data: { status: 'needs_cleaning' }
      });

      // Update new table
      await tx.restaurantTable.update({
        where: { id: newTableId },
        data: { status: 'occupied' }
      });

      // Update session
      return tx.tableSession.update({
        where: { id: sessionId },
        data: { tableId: newTableId },
        include: { table: true }
      });
    });
  }

  static async cancelSession(restaurantId: string, sessionId: string) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findFirst({
        where: { id: sessionId, table: { restaurantId } },
        include: {
          orders: true,
          bills: {
            include: { payments: true }
          }
        }
      });

      if (!session) throw new Error('Session not found');

      // BUG 9: Block cancellation if any bill has completed/pending payments
      const billsWithPayments = session.bills.filter(
        (b: any) => b.payments && b.payments.length > 0 &&
          b.payments.some((p: any) => p.status === 'completed' || p.status === 'pending')
      );

      if (billsWithPayments.length > 0) {
        throw new Error(
          'Cannot cancel session with existing payments. Please process a refund first before cancelling.'
        );
      }

      // Void associated orders
      await tx.order.updateMany({
        where: { sessionId },
        data: { status: 'voided' }
      });

      // Void associated bills (safe — we verified no payments exist)
      await tx.bill.updateMany({
        where: { sessionId },
        data: { status: 'voided' }
      });

      // Mark session as cancelled
      await tx.tableSession.update({
        where: { id: sessionId },
        data: { status: 'cancelled', closedAt: new Date() }
      });

      // Reset table status
      if (session.tableId) {
        await tx.restaurantTable.update({
          where: { id: session.tableId },
          data: { status: 'free' }
        });
      }

      return { success: true, message: 'Session cancelled and table freed' };
    });
  }
}
