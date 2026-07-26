import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import { DEFAULT_TAX_RATE } from '../../config/business';

const TAX_RATE = DEFAULT_TAX_RATE;

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
    const baseUnitPrice = priceMap.get(item.itemId) || 0;
    
    let modifiersPrice = 0;
    const modifiers = item.metadata?.modifiers || item.selectedModifiers;
    if (modifiers && Array.isArray(modifiers)) {
      modifiersPrice = modifiers.reduce((sum: number, mod: any) => sum + Number(mod.price), 0);
    }
    
    const unitPrice = baseUnitPrice + modifiersPrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    
    return {
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      notes: item.notes,
      seatNumber: item.seatNumber,
      course: item.course,
      status: item.initialStatus || data.initialStatus || 'sent',
      metadata: modifiers ? { modifiers } : {}
    };
  });

  const taxTotal = subtotal * TAX_RATE;
  const total = subtotal + taxTotal;

  // 3-second Idempotency Check: Prevent duplicate order creation on rapid double-clicks
  if (tableId) {
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const recentOrder = await prisma.order.findFirst({
      where: {
        tableId,
        restaurantId,
        createdAt: { gte: threeSecondsAgo },
        subtotal: subtotal
      },
      include: { items: { include: { item: true } }, table: true }
    });
    if (recentOrder) {
      console.log(`[Idempotency] Duplicate order submission blocked within 3s for table ${tableId}`);
      return recentOrder;
    }
  }

  // Handle Table Session logic
  let sessionId = data.sessionId || null;
  if (tableId && !sessionId) {
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
      status: { notIn: ['paid', 'voided', 'closed', 'completed'] },
      ...(type && type !== 'all' ? {
        items: {
          some: { item: { category: { type } } }
        }
      } : {})
    },
    include: {
      items: {
        where: {
          status: { notIn: ['voided'] },
          ...(type && type !== 'all' ? { item: { category: { type } } } : {})
        },
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

export const updateOrderItemStatus = async (restaurantId: string, orderItemId: string, status: string, rejectionReason?: string) => {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: { restaurantId }
    },
    include: { order: { include: { items: true } } }
  });

  if (!item) throw new Error('Order item not found');

  const existingMeta = (item.metadata as any) || {};
  const updatedItem = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { 
      status,
      ...(rejectionReason ? { metadata: { ...existingMeta, rejectionReason } } : {})
    }
  });

  // Re-evaluate parent order status based on all items
  const allItems = await prisma.orderItem.findMany({ where: { orderId: item.orderId } });
  
  let newOrderStatus = item.order.status;
  
  if (status === 'sent' || status === 'preparing' || status === 'ready' || status === 'served') {
    if (newOrderStatus === 'pending_approval' || newOrderStatus === 'new') {
      newOrderStatus = 'preparing';
    }
  }
  
  const allVoided = allItems.every(i => i.status === 'voided');
  if (allVoided) {
    newOrderStatus = 'voided';
  } else {
    const allServed = allItems.every(i => i.status === 'served' || i.status === 'voided');
    if (allServed) newOrderStatus = 'served';
  }

  if (newOrderStatus !== item.order.status) {
    await prisma.order.update({
      where: { id: item.orderId },
      data: { status: newOrderStatus }
    });
  }

  return updatedItem;
};

export const updateOrderStatus = async (restaurantId: string, orderId: string, status: string, rejectionReason?: string) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      restaurantId
    },
    include: { items: true }
  });

  if (!order) throw new Error('Order not found');

  return await prisma.$transaction(async (tx) => {
    if (status === 'sent' || status === 'preparing') {
      // Approve all pending_approval items to sent
      await tx.orderItem.updateMany({
        where: { orderId: orderId, status: 'pending_approval' },
        data: { status: 'sent' }
      });

      // Update parent order status to sent/preparing
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'sent' },
        include: { items: { include: { item: true } }, table: true }
      });
      return updatedOrder;
    } 
    
    if (status === 'voided') {
      const existingOrderMeta = (order.metadata as any) || {};

      // Check if there are already approved items in the kitchen/served state
      const approvedItems = order.items.filter(i => ['sent', 'preparing', 'ready', 'served', 'active'].includes(i.status));
      const pendingItems = order.items.filter(i => i.status === 'pending_approval');

      // Safety Guard: If pending items were ALREADY approved by a parallel call, ignore conflicting reject request
      if (pendingItems.length === 0 && approvedItems.length > 0) {
        console.log(`[OrderLock] Conflicting reject call ignored for order ${orderId} as pending items were already approved.`);
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { item: true } }, table: true }
        });
        return currentOrder;
      }

      if (approvedItems.length > 0) {
        // ONLY void the pending_approval items! Do NOT void already approved kitchen items!
        for (const pItem of pendingItems) {
          const itemMeta = (pItem.metadata as any) || {};
          await tx.orderItem.update({
            where: { id: pItem.id },
            data: { 
              status: 'voided',
              metadata: { ...itemMeta, rejectionReason: rejectionReason || 'Item Out of Stock' }
            }
          });
        }

        // Recalculate order subtotal and total based on remaining non-voided items
        const remainingItems = await tx.orderItem.findMany({
          where: { orderId: orderId, status: { not: 'voided' } }
        });

        let newSubtotal = 0;
        for (const item of remainingItems) {
          newSubtotal += Number(item.totalPrice || 0);
        }
        const newTaxTotal = newSubtotal * DEFAULT_TAX_RATE;
        const newTotal = newSubtotal + newTaxTotal;

        // Parent order remains active/sent for the already approved items
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'sent',
            subtotal: newSubtotal,
            taxTotal: newTaxTotal,
            total: newTotal
          },
          include: { items: { include: { item: true } }, table: true }
        });
        return updatedOrder;
      } else {
        // No prior approved items exist — void entire new order
        for (const pItem of order.items) {
          const itemMeta = (pItem.metadata as any) || {};
          await tx.orderItem.update({
            where: { id: pItem.id },
            data: { 
              status: 'voided',
              metadata: { ...itemMeta, rejectionReason: rejectionReason || 'Order Cancelled' }
            }
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'voided',
            metadata: { 
              ...existingOrderMeta, 
              rejectionReason: rejectionReason || 'Order Cancelled by Restaurant', 
              voidReason: rejectionReason || 'Order Cancelled by Restaurant' 
            }
          },
          include: { items: { include: { item: true } }, table: true }
        });
        return updatedOrder;
      }
    }

    if (status === 'served' || status === 'ready_to_serve') {
      await tx.orderItem.updateMany({
        where: { orderId: orderId, status: { notIn: ['voided', status] } },
        data: { status }
      });
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { item: true } }, table: true }
    });

    return updatedOrder;
  });
};

export const getAllOrders = async (restaurantId: string) => {
  return await prisma.order.findMany({
    where: { restaurantId },
    include: {
      items: {
        include: {
          item: {
            include: { category: true }
          }
        }
      },
      table: true,
      bill: {
        include: {
          payments: {
            select: { id: true, method: true, transactionId: true, amount: true, createdAt: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200 // limit to last 200 for performance
  });
};

