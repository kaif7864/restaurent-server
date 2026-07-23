import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  static async getDashboardMetrics(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's Sales
    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { notIn: ['voided'] }
      }
    });

    const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // Yesterday's Sales
    const yesterdayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: yesterday, lt: today },
        status: { notIn: ['voided'] }
      }
    });

    const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const salesGrowth = yesterdaySales === 0 ? 100 : ((todaySales - yesterdaySales) / yesterdaySales) * 100;

    // Total Guests Today
    const todaySessions = await prisma.tableSession.findMany({
      where: {
        table: { restaurantId },
        openedAt: { gte: today }
      }
    });

    const todayGuests = todaySessions.reduce((sum, session) => sum + session.guestCount, 0);

    // Active Orders
    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurantId,
        status: { notIn: ['paid', 'voided', 'served'] }
      }
    });

    return {
      todaySales,
      salesGrowth: salesGrowth.toFixed(1),
      todayGuests,
      activeOrdersCount
    };
  }
}
