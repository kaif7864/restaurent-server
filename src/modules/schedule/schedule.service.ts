import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ScheduleService {
  static async getSchedules(restaurantId: string) {
    return (prisma as any).schedule.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: { id: true, name: true, roles: true }
        }
      },
      orderBy: { date: 'asc' }
    });
  }

  static async createSchedule(restaurantId: string, data: { userId: string; shift: string; date: string; notes?: string }) {
    return (prisma as any).schedule.create({
      data: {
        restaurantId,
        userId: data.userId,
        shift: data.shift,
        date: new Date(data.date),
        notes: data.notes
      }
    });
  }

  static async deleteSchedule(restaurantId: string, id: string) {
    return (prisma as any).schedule.deleteMany({
      where: { id, restaurantId }
    });
  }
}
