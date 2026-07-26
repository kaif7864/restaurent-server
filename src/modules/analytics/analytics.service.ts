import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsService {
  static async getDashboardMetrics(restaurantId: string, period: string = 'week') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Date range based on period
    let startDate = new Date(today);
    if (period === 'today') {
      startDate = today;
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 29);
    } else {
      // Default: week (7 days)
      startDate.setDate(startDate.getDate() - 6);
    }

    // 1. Fetch Orders for Selected Period (with fallback to all restaurant orders if range is empty)
    let periodOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        status: { notIn: ['voided'] }
      },
      include: {
        items: {
          include: {
            item: { select: { costPrice: true, name: true, category: true } }
          }
        }
      }
    });

    // Fallback: If no orders in strict date range, fetch all non-voided orders for this restaurant
    if (periodOrders.length === 0) {
      periodOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: { notIn: ['voided'] }
        },
        include: {
          items: {
            include: {
              item: { select: { costPrice: true, name: true, category: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });
    }

    // 2. Compute Period Sales, COGS & Estimated Net Profit
    const periodSales = periodOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const periodCogs = periodOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, orderItem) => {
        return itemSum + (Number(orderItem.item?.costPrice || 0) * orderItem.quantity);
      }, 0);
    }, 0);
    const periodProfit = periodSales - periodCogs;

    // Yesterday's Sales for Growth %
    const yesterdayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: yesterday, lt: today },
        status: { notIn: ['voided'] }
      }
    });

    const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const salesGrowth = yesterdaySales === 0 ? (periodSales > 0 ? 100 : 0) : ((periodSales - yesterdaySales) / yesterdaySales) * 100;

    // 3. Guests Count for Period
    let periodSessions = await prisma.tableSession.findMany({
      where: {
        table: { restaurantId },
        openedAt: { gte: startDate }
      }
    });
    if (periodSessions.length === 0) {
      periodSessions = await prisma.tableSession.findMany({
        where: { table: { restaurantId } },
        take: 100
      });
    }
    const periodGuests = periodSessions.reduce((sum, session) => sum + (session.guestCount || 1), 0);

    const activeOrdersCount = await prisma.order.count({
      where: {
        restaurantId,
        status: { notIn: ['paid', 'voided', 'served'] }
      }
    });

    // 4. Sales Trend Data (Chronological Order)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesTrendMap = new Map();

    if (period === 'today') {
      // 24 Hourly Buckets for Today
      for (let h = 0; h < 24; h += 2) {
        const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
        salesTrendMap.set(h, { name: hourLabel, sales: 0, orders: 0 });
      }
      periodOrders.forEach(order => {
        const h = new Date(order.createdAt).getHours();
        const bucket = Math.floor(h / 2) * 2;
        if (salesTrendMap.has(bucket)) {
          const entry = salesTrendMap.get(bucket);
          entry.sales += Number(order.total || 0);
          entry.orders += 1;
        }
      });
    } else {
      // Daily Buckets (Chronological: from startDate to today)
      const numDays = period === 'month' ? 30 : 7;
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toDateString();
        const dayLabel = period === 'month' 
          ? `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`
          : days[d.getDay()];
        salesTrendMap.set(dateKey, { name: dayLabel, sales: 0, orders: 0 });
      }

      periodOrders.forEach(order => {
        const dateKey = new Date(order.createdAt).toDateString();
        if (salesTrendMap.has(dateKey)) {
          const entry = salesTrendMap.get(dateKey);
          entry.sales += Number(order.total || 0);
          entry.orders += 1;
        }
      });
    }

    const salesTrend = Array.from(salesTrendMap.values());

    // 5. REAL Category Breakdown
    const categoryMap = new Map<string, { name: string; value: number; revenue: number }>();
    periodOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const catName = orderItem.item?.category?.name || 'General Menu';
        const qty = orderItem.quantity || 1;
        const rev = Number(orderItem.totalPrice || 0);

        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, { name: catName, value: 0, revenue: 0 });
        }
        const cat = categoryMap.get(catName)!;
        cat.value += qty;
        cat.revenue += rev;
      });
    });

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // 6. REAL Peak Hours Distribution
    const hourlyMap = new Map<number, { hour: string; orders: number; sales: number }>();
    const peakHoursList = [11, 12, 13, 14, 15, 18, 19, 20, 21, 22]; // Common restaurant hours
    peakHoursList.forEach(h => {
      const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
      hourlyMap.set(h, { hour: hourLabel, orders: 0, sales: 0 });
    });

    periodOrders.forEach(order => {
      const h = new Date(order.createdAt).getHours();
      if (hourlyMap.has(h)) {
        const entry = hourlyMap.get(h)!;
        entry.orders += 1;
        entry.sales += Number(order.total || 0);
      }
    });

    const peakHoursData = Array.from(hourlyMap.values());

    // 7. REAL Payment Methods Breakdown
    let bills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        status: { in: ['paid', 'payment_pending'] }
      },
      include: { payments: true }
    });

    if (bills.length === 0) {
      bills = await prisma.bill.findMany({
        where: {
          restaurantId,
          status: { in: ['paid', 'payment_pending'] }
        },
        include: { payments: true },
        take: 100
      });
    }

    const paymentTotals: Record<string, number> = { cash: 0, card: 0, upi: 0, online: 0 };
    let totalPaymentAmount = 0;

    bills.forEach(bill => {
      bill.payments.forEach(p => {
        const method = (p.method || 'cash').toLowerCase();
        const amt = Number(p.amount || 0);
        totalPaymentAmount += amt;
        if (method.includes('cashfree') || method.includes('online')) {
          paymentTotals.online += amt;
        } else if (method.includes('upi')) {
          paymentTotals.upi += amt;
        } else if (method.includes('card')) {
          paymentTotals.card += amt;
        } else {
          paymentTotals.cash += amt;
        }
      });
    });

    const paymentMethodData = [
      { method: 'UPI / QR', amount: paymentTotals.upi + paymentTotals.online, percentage: totalPaymentAmount > 0 ? Math.round(((paymentTotals.upi + paymentTotals.online) / totalPaymentAmount) * 100) : 0 },
      { method: 'Cash', amount: paymentTotals.cash, percentage: totalPaymentAmount > 0 ? Math.round((paymentTotals.cash / totalPaymentAmount) * 100) : 0 },
      { method: 'Card', amount: paymentTotals.card, percentage: totalPaymentAmount > 0 ? Math.round((paymentTotals.card / totalPaymentAmount) * 100) : 0 }
    ];

    // 8. Top Selling Items
    const itemMap = new Map<string, { name: string; sold: number; revenue: number }>();
    periodOrders.forEach(order => {
      order.items.forEach(orderItem => {
        const itemName = orderItem.item?.name || 'Menu Item';
        const qty = orderItem.quantity || 1;
        const rev = Number(orderItem.totalPrice || 0);

        if (!itemMap.has(itemName)) {
          itemMap.set(itemName, { name: itemName, sold: 0, revenue: 0 });
        }
        const item = itemMap.get(itemName)!;
        item.sold += qty;
        item.revenue += rev;
      });
    });

    const topItemsData = Array.from(itemMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    return {
      todaySales: periodSales,
      todayProfit: periodProfit,
      todayCogs: periodCogs,
      salesGrowth: salesGrowth.toFixed(1),
      todayGuests: periodGuests,
      todayOrdersCount: periodOrders.length,
      activeOrdersCount,
      salesTrend,
      categoryBreakdown,
      peakHoursData,
      paymentMethodData,
      topItems: topItemsData
    };
  }

  static async getZReport(restaurantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await prisma.bill.findMany({
      where: {
        restaurantId,
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
