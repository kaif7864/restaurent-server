import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { processPaymentSchema } from './payment.schema';
import prisma from '../../config/prisma';

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { id: billId } = req.params;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required',
      });
    }

    // Add user's restaurant ID to validation
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: req.user?.restaurantId
      }
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const validatedData = processPaymentSchema.parse(req.body);

    const payment = await PaymentService.processPayment(billId, validatedData);

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment',
    });
  }
};

export const getBillPayments = async (req: Request, res: Response) => {
  try {
    const { id: billId } = req.params;

    // Verify bill belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: {
        id: billId,
        restaurantId: req.user?.restaurantId
      }
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const payments = await PaymentService.getPaymentsByBill(billId);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
    });
  }
};
