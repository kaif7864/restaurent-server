import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TAX_RATE = 0.05; // 5% GST

export const createOrder = async (restaurantId: string, data: any) => {
  const { tableId, orderType, items } = data;

  // Fetch menu items to get current prices (never trust frontend prices)
  const itemIds = items.map((i: any) => i.itemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { 
      id: { in: itemIds },
      restaurantId 
    },
  });

  if (menuItems.length !== items.length) {
    throw new Error('Some items were not found or do not belong to this restaurant');
  }

  const priceMap = new Map(menuItems.map(item => [item.id, Number(item.price)]));

  let subtotal = 0;
  const orderItemsData = items.map((item: any) => {
    const unitPrice = priceMap.get(item.itemId) || 0;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    
    return {
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      notes: item.notes,
      status: item.initialStatus || data.initialStatus || 'sent' 
    };
  });

  const taxTotal = subtotal * TAX_RATE;
  const total = subtotal + taxTotal;

  // Handle Table Session logic
  let sessionId = null;
  if (tableId) {
    // Find active session
    let session = await prisma.tableSession.findFirst({
      where: { tableId, status: 'active' }
    });

    if (!session) {
      session = await prisma.tableSession.create({
        data: { tableId, status: 'active', guestCount: 2 } // Default guest count
      });
      // Update table status to occupied
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'occupied' }
      });
    }
    sessionId = session.id;
  }

  // Generate a simple order number (e.g., ORD-XXXX)
  const orderNumber = `ORD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // Create the Order and its Items in a single transaction
  const order = await prisma.order.create({
    data: {
      restaurantId,
      tableId: tableId || null,
      sessionId,
      orderNumber,
      orderType,
      subtotal,
      taxTotal,
      total,
      status: 'new',
      items: {
        create: orderItemsData
      }
    },
    include: {
      items: {
        include: {
          item: {
            select: { name: true, imageUrl: true }
          }
        }
      },
      table: true
    }
  });

  return order;
};

export const getActiveOrders = async (restaurantId: string, type?: 'food' | 'drink' | 'all') => {
  const orders = await prisma.order.findMany({
    where: { 
      restaurantId,
      status: { notIn: ['paid', 'voided'] },
      ...(type && type !== 'all' ? {
        items: {
          some: { item: { category: { type } } }
        }
      } : {})
    },
    include: {
      items: {
        where: type && type !== 'all' ? { item: { category: { type } } } : undefined,
        include: {
          item: {
            include: { category: true }
          }
        }
      },
      table: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return orders;
};

export const updateOrderItemStatus = async (restaurantId: string, orderItemId: string, status: string) => {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: { restaurantId }
    }
  });

  if (!item) throw new Error('Order item not found');

  return await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status }
  });
};

export const updateOrderStatus = async (restaurantId: string, orderId: string, status: string) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId
    },
    include: { items: true }
  });

  if (!order) throw new Error('Order not found');

  return await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status }
    });

    // If order is served or ready_to_serve, mark all non-served items accordingly
    if (status === 'served' || status === 'ready_to_serve') {
      await tx.orderItem.updateMany({
        where: { orderId: orderId, status: { notIn: ['served', 'ready_to_serve'] } },
        data: { status }
      });
    }

    return updatedOrder;
  });
};
