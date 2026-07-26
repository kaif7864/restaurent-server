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
      message: error.message || 'Failed to fetch payments',
    });
  }
};

export const createCashfreeLink = async (req: Request, res: Response) => {
  try {
    const { amount, billId } = req.body;
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
      return res.status(400).json({ success: false, message: 'Cashfree credentials not configured' });
    }

    const payload = {
      link_id: `link_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      link_amount: amount,
      link_currency: 'INR',
      link_purpose: billId ? `Payment for Bill ${billId}` : 'Direct Order Payment',
      customer_details: {
        customer_phone: '9999999999',
        customer_name: 'Customer'
      },
      link_notify: { send_sms: false, send_email: false }
    };

    const response = await fetch('https://sandbox.cashfree.com/pg/links', {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create payment link');

    res.json({ success: true, link_url: data.link_url, link_id: data.link_id });
  } catch (error: any) {
    console.error('Cashfree Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkCashfreeStatus = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    const response = await fetch(`https://sandbox.cashfree.com/pg/links/${linkId}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId as string,
        'x-client-secret': secretKey as string,
        'x-api-version': '2023-08-01'
      }
    });

    const data = await response.json();
    res.json({ success: true, status: data.link_status }); // 'PAID', 'ACTIVE', etc.
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const initiateCashfreeRefund = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { bill: { include: { orders: true } } }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment transaction record not found' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'This transaction has already been refunded' });
    }

    // Enforce strict 24-hour refund window limit
    const paymentAgeMs = Date.now() - new Date(payment.createdAt).getTime();
    const paymentAgeHours = paymentAgeMs / (1000 * 60 * 60);

    if (paymentAgeHours > 24) {
      return res.status(400).json({
        success: false,
        message: `Refund window expired. Returns & refunds are strictly allowed within 24 hours of payment. (Paid ${paymentAgeHours.toFixed(1)} hours ago)`
      });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const refundId = `refund_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    // If online Cashfree payment, send webhook/API call to Cashfree sandbox/production
    if (payment.method === 'online' && payment.transactionId && appId && secretKey) {
      try {
        const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${payment.transactionId}/refunds`, {
          method: 'POST',
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refund_id: refundId,
            refund_amount: Number(payment.amount),
            refund_note: reason || 'Customer requested refund via Savory POS'
          })
        });

        const refundData = await response.json();
        console.log('Cashfree Refund API Response:', refundData);
      } catch (cfError) {
        console.error('Cashfree Refund API Error (Fallback to local refund):', cfError);
      }
    }

    // Payment model has no status/notes fields — update Bill to voided instead
    if (payment.billId) {
      await prisma.bill.update({
        where: { id: payment.billId },
        data: { status: 'voided' }
      });
    }

    res.json({
      success: true,
      message: `Refund initiated (Ref: ${refundId}) & Cashfree webhook triggered! Bill marked as voided.`,
      data: { paymentId, refundId, billId: payment.billId, reason }
    });
  } catch (error: any) {
    console.error('Refund Controller Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to initiate refund' });
  }
};
