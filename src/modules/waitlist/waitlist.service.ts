import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WaitlistService {
  static async getWaitlist(restaurantId: string) {
    return prisma.waitlist.findMany({
      where: {
        restaurantId,
        status: { in: ['waiting', 'seated'] } // Maybe show recently seated too, or just waiting
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async addToWaitlist(restaurantId: string, data: any) {
    return prisma.waitlist.create({
      data: {
        restaurantId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        guestCount: data.guestCount,
        quotedTime: data.quotedTime,
        notes: data.notes
      }
    });
  }

  static async updateWaitlistEntry(restaurantId: string, entryId: string, data: any) {
    const entry = await prisma.waitlist.findFirst({
      where: { id: entryId, restaurantId }
    });

    if (!entry) throw new Error('Waitlist entry not found');

    return prisma.waitlist.update({
      where: { id: entryId },
      data
    });
  }

  static async removeFromWaitlist(restaurantId: string, entryId: string) {
    const entry = await prisma.waitlist.findFirst({
      where: { id: entryId, restaurantId }
    });

    if (!entry) throw new Error('Waitlist entry not found');

    return prisma.waitlist.update({
      where: { id: entryId },
      data: { status: 'cancelled' }
    });
  }
}
