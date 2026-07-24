import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  static async getDashboardMetrics(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today },
        status: { notIn: ['voided'] }
      },
      include: {
        items: {
          include: {
            item: { select: { costPrice: true } }
          }
        }
      }
    });

    const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const todayCogs = todayOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, orderItem) => {
        return itemSum + (Number(orderItem.item?.costPrice || 0) * orderItem.quantity);
      }, 0);
    }, 0);
    const todayProfit = todaySales - todayCogs;

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

    // Sales Trend (Last 7 Days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const last7DaysOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: sevenDaysAgo },
        status: { notIn: ['voided'] }
      },
      select: {
        total: true,
        createdAt: true
      }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesTrendMap = new Map();
    
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      salesTrendMap.set(d.toDateString(), { name: days[d.getDay()], sales: 0 });
    }

    last7DaysOrders.forEach(order => {
      const dateKey = order.createdAt.toDateString();
      if (salesTrendMap.has(dateKey)) {
        salesTrendMap.get(dateKey).sales += Number(order.total);
      }
    });

    // Top Selling Items (Last 7 Days)
    const itemsQuery = await prisma.orderItem.groupBy({
      by: ['itemId'],
      where: {
        order: {
          restaurantId,
          createdAt: { gte: sevenDaysAgo },
          status: { notIn: ['voided'] }
        }
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    });

    const topItemsData = await Promise.all(itemsQuery.map(async (item) => {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.itemId } });
      return {
        name: menuItem?.name || 'Unknown',
        sold: item._sum?.quantity || 0,
        revenue: (item._sum?.totalPrice ? Number(item._sum.totalPrice) : 0)
      };
    }));

    return {
      todaySales,
      todayProfit,
      todayCogs,
      salesGrowth: salesGrowth.toFixed(1),
      todayGuests,
      todayOrdersCount: todayOrders.length,
      activeOrdersCount,
      salesTrend: Array.from(salesTrendMap.values()).reverse(),
      topItems: topItemsData
    };
  }

  static async getZReport(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await prisma.bill.findMany({
      where: {
        session: { table: { restaurantId } },
        createdAt: { gte: today },
        status: 'paid'
      },
      include: {
        payments: true,
        session: {
          include: {
            orders: {
              where: { status: { not: 'voided' } }
            }
          }
        }
      }
    });

    let grossSales = 0;
    let netSales = 0;
    let taxTotal = 0;
    let tipsTotal = 0;
    let totalReceived = 0;
    const paymentsByMethod: Record<string, number> = {};

    bills.forEach(bill => {
      grossSales += Number(bill.subtotal);
      netSales += Number(bill.total) - Number(bill.taxTotal);
      taxTotal += Number(bill.taxTotal);
      tipsTotal += Number(bill.tip || 0);

      bill.payments.forEach(payment => {
        totalReceived += Number(payment.amount);
        paymentsByMethod[payment.method] = (paymentsByMethod[payment.method] || 0) + Number(payment.amount);
      });
    });

    const directOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        sessionId: null,
        status: 'paid',
        createdAt: { gte: today }
      }
    });

    directOrders.forEach(order => {
      grossSales += Number(order.subtotal);
      netSales += Number(order.total) - Number(order.taxTotal);
      taxTotal += Number(order.taxTotal);
      
      const method = (order.metadata as any)?.paymentMethod || 'cash';
      totalReceived += Number(order.total);
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(order.total);
    });

    return {
      grossSales,
      netSales,
      taxTotal,
      tipsTotal,
      totalReceived,
      paymentsByMethod,
      date: new Date().toISOString()
    };
  }
}
