import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeedbackService {
  static async getFeedbacks(restaurantId: string) {
    return (prisma as any).feedback.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async createFeedback(restaurantId: string, data: { customerName: string; customerPhone?: string; tableNumber?: string; rating: number; comment?: string }) {
    return (prisma as any).feedback.create({
      data: {
        restaurantId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        tableNumber: data.tableNumber,
        rating: Number(data.rating),
        comment: data.comment
      }
    });
  }
}
