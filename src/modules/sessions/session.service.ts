import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SessionService {
  static async createSession(restaurantId: string, data: any) {
    const { tableId, guestCount, reservationId, waitlistId } = data;

    return await prisma.$transaction(async (tx) => {
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
    return prisma.tableSession.findMany({
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
              include: { item: true }
            }
          }
        },
        bills: {
          include: { payments: true }
        }
      }
    });
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
}
