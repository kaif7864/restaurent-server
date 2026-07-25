import { Request, Response } from 'express';
import * as customerService from './customer.service';

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { tableId, phone, name, otp } = req.body;
    if (!tableId || !phone || !name || !otp) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // In production, verify actual OTP. For now, accept 123456
    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const token = await customerService.createCustomerSession(tableId, phone, name);
    res.json({ success: true, data: { token } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMenuForTable = async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    const menu = await customerService.getMenuForTable(tableId);
    res.json({ success: true, data: menu });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const placeOrder = async (req: Request, res: Response) => {
  try {
    // We should ideally verify the customer token here, but for now we trust the payload
    const { tableId, items, customerName, customerPhone } = req.body;
    
    if (!tableId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    const order = await customerService.createPendingOrder(tableId, items, { customerName, customerPhone });
    
    // TODO: Emit socket event to the specific restaurant room that a new QR order arrived
    // const io = req.app.get('io');
    // io.to(`restaurant_${order.restaurantId}`).emit('new_qr_order', order);

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTableOrders = async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    const orders = await customerService.getTableOrders(tableId);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payOrderOnline = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { amount, phone, name } = req.body;
    
    // Using mock Cashfree credentials from env or dummy
    // Cashfree link_id max length is 50. orderId is UUID (36).
    const shortOrderId = orderId.substring(0, 8);
    const linkId = `link_${shortOrderId}_${Date.now()}`;
    const frontendUrl = req.body.returnUrl || 'http://localhost:5173';
    // Append query params to returnUrl so frontend can verify
    const returnUrl = frontendUrl.includes('?') 
      ? `${frontendUrl}&verify_payment=true&order_id=${orderId}&link_id=${linkId}`
      : `${frontendUrl}?verify_payment=true&order_id=${orderId}&link_id=${linkId}`;

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    // MOCK MODE: If no credentials, simulate Cashfree by immediately redirecting back
    if (!appId || !secretKey) {
      console.log('No Cashfree credentials found, running in MOCK mode.');
      return res.json({ success: true, link_url: returnUrl });
    }

    const payload = {
      customer_details: {
        customer_phone: phone || '9999999999',
        customer_name: name || 'Guest User',
        customer_email: 'guest@example.com'
      },
      link_notify: { send_sms: false, send_email: false },
      link_meta: { 
        return_url: returnUrl
      },
      link_id: linkId,
      link_amount: amount,
      link_currency: 'INR',
      link_purpose: `Payment for Order ${orderId}`
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
    if (!response.ok) {
      console.error('Cashfree Error:', data);
      throw new Error(data.message || 'Failed to create payment link');
    }

    res.json({ success: true, link_url: data.link_url });
  } catch (error: any) {
    console.error('payOrderOnline error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyOrderPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { linkId } = req.body; 

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    let isPaid = false;

    if (!appId || !secretKey) {
      console.log('MOCK MODE: Simulating successful payment verification');
      isPaid = true;
    } else {
      const response = await fetch(`https://sandbox.cashfree.com/pg/links/${linkId}`, {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment status');
      }
      if (data.link_status === 'PAID') {
        isPaid = true;
      }
    }

    if (isPaid) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const existingOrder = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { items: { include: { item: true } } }
      });
      if (existingOrder && existingOrder.status !== 'paid') {
        // Ensure there is an active session
        let session = await prisma.tableSession.findFirst({
          where: { tableId: existingOrder.tableId, status: 'active' }
        });
        
        if (!session) {
          session = await prisma.tableSession.create({
            data: {
              table: { connect: { id: existingOrder.tableId } },
              status: 'active',
              guestCount: 1,
              openedAt: new Date(),
            }
          });
        }

        // Create a bill for this online payment
        const bill = await prisma.bill.create({
          data: {
            restaurant: { connect: { id: existingOrder.restaurantId } },
            session: { connect: { id: session.id } },
            status: 'paid',
            subtotal: existingOrder.subtotal,
            taxTotal: existingOrder.taxTotal,
            total: existingOrder.total
          }
        });

        // Create a payment record
        await prisma.payment.create({
          data: {
            bill: { connect: { id: bill.id } },
            amount: existingOrder.total,
            method: 'online',
            status: 'completed',
            transactionId: linkId
          }
        });

        await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: 'paid',
            billId: bill.id 
          }
        });
        
        await prisma.restaurantTable.update({
          where: { id: existingOrder.tableId },
          data: { status: 'needs_cleaning' }
        });

        const { scheduleTableAutoClean } = require('../tables/tables.service');
        scheduleTableAutoClean(existingOrder.tableId);
      }
      return res.json({ success: true, message: 'Payment successful', status: 'PAID', order: existingOrder });
    }

    return res.json({ success: true, status: 'PENDING' }); // In real app, we'd return data.link_status
  } catch (error: any) {
    console.error('verifyOrderPayment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
