import { Request, Response } from 'express';
import * as orderService from './order.service';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const order = await orderService.createOrder(restaurantId, req.body);
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
    const { status } = req.body;
    
    const updated = await orderService.updateOrderItemStatus(restaurantId, itemId, status);
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
    const { status } = req.body;
    
    const updated = await orderService.updateOrderStatus(restaurantId, orderId, status);

    // AUDIT LOG
    if (status === 'voided') {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await (prisma as any).auditLog.create({
        data: {
          restaurantId,
          userId: req.user!.id,
          action: 'VOID_ORDER',
          details: { orderId, orderNumber: updated.orderNumber },
        }
      });
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

export const payDirectOrder = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { orderId } = req.params;
    const { amount, method } = req.body;
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId }
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // We update status to 'paid' and store paymentMethod in metadata
    const metadata = order.metadata || {};
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        metadata: { ...metadata, paymentMethod: method, paidAmount: amount }
      }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

