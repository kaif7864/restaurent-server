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
        table: true
      }
    });
  }
}
