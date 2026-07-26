import { Request, Response } from 'express';
import * as orderService from './order.service';
import { notifyOrderUpdate } from '../../socket';
import prisma from '../../config/prisma';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const order = await orderService.createOrder(restaurantId, req.body);
    notifyOrderUpdate(order);
    res.status(201).json({ message: 'Order created successfully', data: order });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    res.status(400).json({ message: error.message || 'Failed to create order' });
  }
};

export const getActiveOrders = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const type = req.query.type as 'food' | 'drink' | 'all' | undefined;
    const orders = await orderService.getActiveOrders(restaurantId, type);
    res.json({ data: orders });
  } catch (error: any) {
    console.error('Get Active Orders Error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const updateItemStatus = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { itemId } = req.params;
    const { status, rejectionReason } = req.body;
    
    const updated = await orderService.updateOrderItemStatus(restaurantId, itemId, status, rejectionReason);
    notifyOrderUpdate(updated);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { orderId } = req.params;
    const { status, rejectionReason } = req.body;
    
    const updated = await orderService.updateOrderStatus(restaurantId, orderId, status, rejectionReason);
    notifyOrderUpdate(updated);

    // AUDIT LOG
    if (status === 'voided') {
      try {
        await (prisma as any).auditLog.create({
          data: {
            restaurantId,
            userId: req.user!.userId,
            action: 'VOID_ORDER',
            details: { orderId, orderNumber: updated?.orderNumber },
          }
        });
      } catch (e) {
        console.log('[AUDIT] VOID_ORDER:', { orderId, orderNumber: updated?.orderNumber });
      }
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const orders = await orderService.getAllOrders(restaurantId);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('Get All Orders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all orders' });
  }
};

/**
 * BUG 4: Pay a direct order (takeout/delivery) — now creates proper Bill + Payment records.
 * BUG 22: Uses shared prisma instance instead of creating new PrismaClient per request.
 */
export const payDirectOrder = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { orderId } = req.params;
    const { amount, method } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }

    // BUG 4: Create proper Bill + Payment records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create a session for the direct order
      let sessionId = order.sessionId;
      if (!sessionId) {
        // For direct orders without a table, create a minimal session
        const session = await tx.tableSession.create({
          data: {
            tableId: order.tableId || undefined as any,
            status: 'closed',
            closedAt: new Date(),
            guestCount: 1,
            openedAt: new Date(),
          }
        });
        sessionId = session.id;
      }

      // Create a Bill
      const bill = await tx.bill.create({
        data: {
          restaurantId,
          sessionId: sessionId!,
          status: 'paid',
          subtotal: order.subtotal,
          taxTotal: order.taxTotal,
          total: order.total,
        }
      });

      // Create a Payment record
      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount: Number(amount),
          method: method || 'cash',
          status: 'completed',
        }
      });

      // Link order to bill and mark as paid
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          billId: bill.id,
        }
      });

      return { order: updatedOrder, bill, payment };
    });

    // Handle table cleanup if applicable
    if (order.tableId) {
      try {
        await prisma.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'needs_cleaning' }
        });
        const { scheduleTableAutoClean } = require('../tables/tables.service');
        scheduleTableAutoClean(order.tableId);
      } catch (e) {
        console.warn('Table cleanup failed (non-critical):', e);
      }
    }

    // Audit log
    try {
      await (prisma as any).auditLog.create({
        data: {
          restaurantId,
          userId: req.user!.userId,
          action: 'DIRECT_ORDER_PAYMENT',
          details: { orderId, amount, method, billId: result.bill.id, paymentId: result.payment.id },
        }
      });
    } catch (e) {
      console.log('[AUDIT] DIRECT_ORDER_PAYMENT:', { orderId, amount, method });
    }

    res.json({ success: true, data: result.order });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
