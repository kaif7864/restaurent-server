import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { processPaymentSchema, closeTableSchema } from './payment.schema';
import prisma from '../../config/prisma';
import crypto from 'crypto';

// ─── AUDIT HELPER ───
// BUG 24: Centralized audit logging for all financial events
const logPaymentAudit = async (
  restaurantId: string,
  userId: string | undefined,
  action: string,
  details: Record<string, any>
) => {
  try {
    await (prisma as any).auditLog.create({
      data: { restaurantId, userId: userId || 'system', action, details }
    });
  } catch (e) {
    // AuditLog model may not exist yet — log to console as fallback
    console.log(`[AUDIT] ${action}:`, JSON.stringify(details));
  }
};

// ─── WEBHOOK SIGNATURE VERIFICATION ───
// BUG 5: Verify Cashfree webhook signature to prevent spoofed requests
const verifyCashfreeWebhookSignature = (rawBody: string, signature: string | undefined): boolean => {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

  // In development/sandbox without secret configured, log a warning and allow
  if (!webhookSecret) {
    console.warn('[SECURITY WARNING] CASHFREE_WEBHOOK_SECRET not configured — webhook signature verification skipped. Set this in production!');
    return true;
  }

  if (!signature) {
    console.error('[SECURITY] Webhook received without x-webhook-signature header');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    console.error('[SECURITY] Webhook signature verification error:', e);
    return false;
  }
};

export const processPayment = async (req: Request, res: Response) => {
  try {
    const { id: billId } = req.params;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required',
      });
    }

    // Verify bill belongs to user's restaurant
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

    // BUG 24: Audit log for payment
    await logPaymentAudit(
      req.user?.restaurantId || '',
      req.user?.userId,
      'PAYMENT_PROCESSED',
      { billId, amount: validatedData.amount, method: validatedData.method, paymentId: payment.id }
    );

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

/**
 * BUG 1 / BUG 12: Separate endpoint to close a table after bill is fully paid.
 * Previously, a ₹0 payment was sent to trigger table closure — now it's explicit.
 */
export const closeTableForBill = async (req: Request, res: Response) => {
  try {
    const { id: billId } = req.params;

    if (!billId) {
      return res.status(400).json({ success: false, message: 'Bill ID is required' });
    }

    // Verify bill belongs to restaurant
    const bill = await prisma.bill.findFirst({
      where: { id: billId, restaurantId: req.user?.restaurantId }
    });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const result = await PaymentService.closeTableForPaidBill(billId);

    // BUG 24: Audit log
    await logPaymentAudit(
      req.user?.restaurantId || '',
      req.user?.userId,
      'TABLE_CLOSED_AFTER_PAYMENT',
      { billId }
    );

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to close table',
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

    // BUG 10: Generate a unique link_id that includes the billId for reliable mapping
    const linkId = billId
      ? `link_bill_${billId.slice(0, 8)}_${Date.now()}`
      : `link_direct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      link_id: linkId,
      link_amount: amount,
      link_currency: 'INR',
      link_purpose: billId ? `Payment for Bill ${billId}` : 'Direct Order Payment',
      customer_details: {
        customer_phone: '9999999999',
        customer_name: 'Customer'
      },
      link_notify: { send_sms: false, send_email: false },
      // BUG 10: Store billId in metadata for reliable webhook matching
      link_meta: billId ? { savory_bill_id: billId } : undefined
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

    // BUG 10: Store the link_id → billId mapping in DB for reliable webhook matching
    if (billId) {
      try {
        await prisma.bill.update({
          where: { id: billId },
          data: {
            metadata: {
              ...(typeof (await prisma.bill.findUnique({ where: { id: billId } }))?.metadata === 'object'
                ? (await prisma.bill.findUnique({ where: { id: billId } }))?.metadata as Record<string, any>
                : {}),
              cashfreeLinkId: data.link_id || linkId,
              cashfreeLinkUrl: data.link_url
            }
          }
        });
      } catch (e) {
        console.warn('Failed to store Cashfree link mapping in bill metadata:', e);
      }
    }

    res.json({ success: true, link_url: data.link_url, link_id: data.link_id || linkId });
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

    // BUG 7: Properly check refunded status
    if (payment.status === 'refunded' || payment.status === 'reversed') {
      return res.status(400).json({ success: false, message: 'This transaction has already been refunded/reversed' });
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

    // If online Cashfree payment, send API call to Cashfree gateway
    let cfResult = null;
    if ((payment.method === 'online' || payment.method === 'upi' || payment.transactionId) && payment.transactionId) {
      try {
        cfResult = await triggerCashfreeApiRefund(
          payment.transactionId,
          Number(payment.amount),
          reason || 'Customer requested refund via Savory POS'
        );
      } catch (cfError: any) {
        console.error('Cashfree Refund API Error:', cfError.message);
        return res.status(400).json({
          success: false,
          message: `Cashfree Gateway Failed to Process Refund: ${cfError.message}`
        });
      }
    }

    // BUG 7: Update BOTH Payment status AND Bill status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'refunded',
        notes: `Refund processed: ${reason || 'Customer requested refund via POS'}. Ref: refund_${Date.now()}`
      }
    });

    if (payment.billId) {
      await prisma.bill.update({
        where: { id: payment.billId },
        data: { status: 'voided' }
      });
    }

    // BUG 24: Audit log for refund
    await logPaymentAudit(
      req.user?.restaurantId || payment.bill?.orders?.[0]?.restaurantId || '',
      req.user?.userId,
      'REFUND_INITIATED',
      {
        paymentId,
        amount: Number(payment.amount),
        method: payment.method,
        billId: payment.billId,
        reason,
        isOnlineRefund: Boolean(cfResult)
      }
    );

    res.json({
      success: true,
      message: `Refund processed successfully. Payment marked as refunded, bill marked as voided.`,
      data: { paymentId, billId: payment.billId, reason, cfResult }
    });
  } catch (error: any) {
    console.error('Refund Controller Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to initiate refund' });
  }
};

/**
 * BUG 5: Webhook handler with signature verification
 * BUG 10: Uses bill metadata for reliable link→bill mapping
 * BUG 23: Logs warnings when order can't be found
 */
export const handleCashfreeWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[Cashfree Webhook Payload Received]:', JSON.stringify(payload, null, 2));

    // BUG 5: Verify webhook signature
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!verifyCashfreeWebhookSignature(rawBody, signature)) {
      console.error('[SECURITY] Invalid webhook signature — request rejected');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const type = payload.type || payload.event_type;
    const data = payload.data || {};

    const orderId = data.order?.order_id || data.order_id;
    const linkId = data.link_id;
    const paymentId = data.payment?.cf_payment_id || data.cf_payment_id || linkId;
    const amount = Number(data.payment?.payment_amount || data.link_amount || data.order?.order_amount || 0);

    const isSuccess = ['PAYMENT_SUCCESS_WEBHOOK', 'LINK_STATUS_CHANGE_WEBHOOK'].includes(type) ||
                      data.payment?.payment_status === 'SUCCESS' ||
                      data.link_status === 'PAID';

    if (isSuccess && (orderId || linkId)) {
      // BUG 10: First try to find bill by stored linkId in bill metadata
      let billFromMapping = null;
      if (linkId) {
        billFromMapping = await prisma.bill.findFirst({
          where: {
            metadata: { path: ['cashfreeLinkId'], equals: linkId }
          },
          include: { payments: true, session: true }
        });
      }

      let order = null;
      if (orderId) {
        order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { bill: { include: { payments: true } } }
        });
      }

      // Fallback: try linkId-based order matching
      if (!order && linkId) {
        // Try to extract billId from our link naming convention: link_bill_{billId8chars}_timestamp
        const billMatch = linkId.match(/^link_bill_([a-f0-9]{8})_/i);
        if (billMatch && billMatch[1]) {
          const matchedBill = await prisma.bill.findFirst({
            where: { id: { startsWith: billMatch[1] } },
            include: { orders: true, payments: true }
          });
          if (matchedBill && matchedBill.orders.length > 0) {
            order = await prisma.order.findUnique({
              where: { id: matchedBill.orders[0].id },
              include: { bill: { include: { payments: true } } }
            });
          }
        }
        
        // Legacy fallback for old link_timestamp format
        if (!order) {
          const match = linkId.match(/^link_([0-9a-f]{8})_/i);
          if (match && match[1]) {
            order = await prisma.order.findFirst({
              where: { id: { startsWith: match[1] } },
              include: { bill: { include: { payments: true } } }
            });
          }
        }
      }

      if (!order && !billFromMapping) {
        // BUG 23: Log warning instead of silently returning 200
        console.warn(`[Cashfree Webhook] Could not find matching order or bill for webhook. orderId=${orderId}, linkId=${linkId}. Payment may need manual reconciliation.`);
        return res.status(200).json({ success: true, message: 'Webhook received but no matching order found. Logged for manual review.' });
      }

      // Determine the billId to use
      let billId = billFromMapping?.id || order?.billId;
      
      if (!billId && order) {
        const existingBill = await prisma.bill.findFirst({
          where: {
            OR: [
              { sessionId: order.sessionId ?? undefined },
              { session: { tableId: order.tableId ?? undefined } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingBill) {
          billId = existingBill.id;
          await prisma.order.update({
            where: { id: order.id },
            data: { billId: existingBill.id }
          });
        } else {
          let session = order.tableId ? await prisma.tableSession.findFirst({
            where: { tableId: order.tableId },
            orderBy: { openedAt: 'desc' }
          }) : null;

          if (!session) {
            session = await (prisma as any).tableSession.create({
              data: {
                tableId: order.tableId,
                status: 'closed',
                closedAt: new Date(),
                guestCount: 1,
                openedAt: new Date(),
              }
            });
          }
          const bill = await prisma.bill.create({
            data: {
              restaurant: { connect: { id: order.restaurantId } },
              session: { connect: { id: session!.id } },
              status: 'paid',
              subtotal: order.subtotal,
              taxTotal: order.taxTotal,
              total: order.total
            }
          });
          billId = bill.id;
          await prisma.order.update({
            where: { id: order.id },
            data: { billId: bill.id }
          });
        }
      }

      if (billId) {
        const currentBill = await prisma.bill.findUnique({
          where: { id: billId },
          include: { payments: true }
        });

        const hasCompletedPayment = currentBill?.payments.some(p => p.status === 'completed');

        // Check for existing payment with same transactionId (deduplication)
        const existingPayment = await prisma.payment.findFirst({
          where: {
            billId: billId,
            OR: [
              { transactionId: String(paymentId) },
              ...(linkId ? [{ transactionId: String(linkId) }] : [])
            ]
          }
        });

        if (!existingPayment) {
          const isDoublePayment = hasCompletedPayment || currentBill?.status === 'paid';

          await prisma.payment.create({
            data: {
              bill: { connect: { id: billId } },
              amount: amount || (order?.total ? Number(order.total) : 0),
              method: 'online',
              status: isDoublePayment ? 'pending_review' : 'completed',
              type: isDoublePayment ? 'double_candidate' : 'single',
              transactionId: String(paymentId || linkId || `cf_${Date.now()}`),
              notes: isDoublePayment ? 'Double Payment Webhook: Received after existing payment.' : undefined
            }
          });

          await prisma.bill.update({
            where: { id: billId },
            data: { status: isDoublePayment ? 'payment_discrepancy' : 'paid' }
          });

          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: 'paid' }
            });
          }

          try {
            const { notifyOrderUpdate } = require('../../socket');
            notifyOrderUpdate({
              ...(order || {}),
              billId,
              isDoublePayment,
              billStatus: isDoublePayment ? 'payment_discrepancy' : 'paid'
            });
          } catch (e) {}
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('Cashfree Webhook Error:', error);
    // BUG 23: Return 500 so Cashfree retries on actual errors
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const syncCashfreePayment = async (req: Request, res: Response) => {
  try {
    const { orderId, linkId } = req.body;
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
      return res.status(400).json({ success: false, message: 'Cashfree credentials not configured' });
    }

    let order: any = null;
    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { bill: { include: { payments: true } } }
      });
    }

    if (!order && linkId) {
      // BUG 10: Try bill metadata mapping first
      const mappedBill = await prisma.bill.findFirst({
        where: { metadata: { path: ['cashfreeLinkId'], equals: linkId } },
        include: { orders: true, payments: true }
      });
      if (mappedBill && mappedBill.orders.length > 0) {
        order = await prisma.order.findUnique({
          where: { id: mappedBill.orders[0].id },
          include: { bill: { include: { payments: true } } }
        });
      }

      // Legacy fallback
      if (!order) {
        const match = linkId.match(/^link_([0-9a-f]{8})_/i);
        if (match && match[1]) {
          order = await prisma.order.findFirst({
            where: { id: { startsWith: match[1] } },
            include: { bill: { include: { payments: true } } }
          });
        }
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const onlinePaymentRecord = order.bill?.payments.find((p: any) => p.transactionId?.startsWith('link_'));
    const targetLinkId = linkId || onlinePaymentRecord?.transactionId;

    if (!targetLinkId) {
      return res.status(400).json({ success: false, message: 'No Cashfree Payment Link ID found for this order' });
    }

    let cfStatus = 'UNKNOWN';
    let cfTxnId = targetLinkId;
    let cfAmount = Number(order.total);

    try {
      const response = await fetch(`https://sandbox.cashfree.com/pg/links/${targetLinkId}`, {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01'
        }
      });
      const cfData = await response.json();
      if (response.ok) {
        cfStatus = cfData.link_status;
        cfAmount = Number(cfData.link_amount || order.total);
      }
    } catch (err) {
      console.error('Failed to query Cashfree link status directly', err);
    }

    let billId = order.billId;
    if (!billId) {
      let session = order.tableId ? await prisma.tableSession.findFirst({
        where: { tableId: order.tableId, status: 'active' }
      }) : null;
      if (!session) {
        session = await (prisma as any).tableSession.create({
          data: {
            tableId: order.tableId,
            status: 'closed',
            closedAt: new Date(),
            guestCount: 1,
            openedAt: new Date(),
          }
        });
      }
      const bill = await prisma.bill.create({
        data: {
          restaurant: { connect: { id: order.restaurantId } },
          session: { connect: { id: session!.id } },
          status: 'paid',
          subtotal: order.subtotal,
          taxTotal: order.taxTotal,
          total: order.total
        }
      });
      billId = bill.id;
      await prisma.order.update({
        where: { id: order.id },
        data: { billId: bill.id }
      });
    }

    const currentBill = await prisma.bill.findUnique({
      where: { id: billId! },
      include: { payments: true }
    });

    const hasCompletedPayment = currentBill?.payments.some(p => p.status === 'completed');

    const existingPayment = await prisma.payment.findFirst({
      where: {
        billId: billId!,
        OR: [
          { transactionId: String(targetLinkId) }
        ]
      }
    });

    if (!existingPayment) {
      const isDoublePayment = hasCompletedPayment || currentBill?.status === 'paid';

      await prisma.payment.create({
        data: {
          billId: billId!,
          amount: cfAmount,
          method: 'online',
          status: isDoublePayment ? 'pending_review' : (cfStatus === 'PAID' ? 'completed' : 'pending'),
          type: isDoublePayment ? 'double_candidate' : 'single',
          transactionId: targetLinkId,
          notes: isDoublePayment ? 'Double Payment Detected during sync' : undefined
        }
      });

      if (isDoublePayment) {
        await prisma.bill.update({
          where: { id: billId! },
          data: { status: 'payment_discrepancy' }
        });
      }
    }

    if (cfStatus === 'PAID') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid' }
      });
    }

    const updatedBill = await prisma.bill.findUnique({
      where: { id: billId! },
      include: { payments: true, session: { include: { table: true } }, orders: true }
    });

    return res.json({
      success: true,
      message: 'Cashfree status synced successfully!',
      data: updatedBill
    });
  } catch (error: any) {
    console.error('syncCashfreePayment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerCashfreeApiRefund = async (transactionId: string, amount: number, reason: string) => {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    console.warn('Cashfree API credentials missing in .env file. Processing mock refund.');
    return { isMockRefund: true, message: 'Local refund processed (No Cashfree credentials configured).' };
  }

  const headers = {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json'
  };

  let targetOrderId = transactionId;

  // If transactionId is a Payment Link ID (link_...), fetch underlying Cashfree Order ID
  if (transactionId.startsWith('link_')) {
    try {
      const linkOrdersRes = await fetch(`https://sandbox.cashfree.com/pg/links/${transactionId}/orders`, {
        method: 'GET',
        headers
      });
      const linkOrdersData = await linkOrdersRes.json();
      console.log('Cashfree Payment Link orders lookup:', linkOrdersData);

      if (Array.isArray(linkOrdersData) && linkOrdersData.length > 0) {
        targetOrderId = linkOrdersData[0].order_id || linkOrdersData[0].cf_order_id || transactionId;
      } else if (linkOrdersData && linkOrdersData.order_id) {
        targetOrderId = linkOrdersData.order_id;
      }
    } catch (err) {
      console.error('Error querying Cashfree orders for link:', err);
    }
  }

  const refundId = `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  console.log(`Executing Cashfree Refund API call on Order [${targetOrderId}] for Amount ₹${amount}...`);

  try {
    const refundRes = await fetch(`https://sandbox.cashfree.com/pg/orders/${targetOrderId}/refunds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        refund_id: refundId,
        refund_amount: Number(amount),
        refund_note: reason || 'Customer double payment refund'
      })
    });

    const refundData = await refundRes.json();
    console.log('Cashfree Refund API Result:', refundRes.status, refundData);

    if (!refundRes.ok) {
      if (['link_not_found', 'order_not_found'].includes(refundData.code)) {
        console.warn(`[Mock/Test Order Detected] Cashfree response: ${refundData.message}. Processing local DB refund for test transaction.`);
        return { isMockRefund: true, message: `Local refund processed (${refundData.message})` };
      }
      throw new Error(`Cashfree Gateway Error (${refundRes.status}): ${refundData.message || refundData.reason}`);
    }

    return refundData;
  } catch (err: any) {
    if (err.message.includes('Cashfree Gateway Error')) {
      throw err;
    }
    console.warn('[Cashfree API Call Fallback]:', err.message);
    return { isMockRefund: true, message: err.message };
  }
};

export const resolveDoublePayment = async (req: Request, res: Response) => {
  try {
    const { billId, action, reason } = req.body;
    
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { payments: true }
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Robustly identify Online vs Cash payment
    const onlinePayment = bill.payments.find((p: any) => 
      p.method === 'online' || 
      p.method === 'upi' || 
      p.method === 'cashfree' || 
      p.type === 'double_candidate' || 
      Boolean(p.transactionId)
    );
    
    const cashPayment = bill.payments.find((p: any) => 
      p.id !== onlinePayment?.id && (p.method === 'cash' || !p.transactionId)
    );

    if (action === 'refund_online') {
      if (!onlinePayment) {
        return res.status(400).json({ success: false, message: 'No online payment record found on this bill to refund' });
      }

      let cfRefundResult = null;
      if (onlinePayment.transactionId) {
        try {
          cfRefundResult = await triggerCashfreeApiRefund(
            onlinePayment.transactionId,
            Number(onlinePayment.amount),
            reason || 'Customer double payment refund'
          );
        } catch (cfErr: any) {
          console.error('Cashfree Refund API Failure:', cfErr.message);
          return res.status(400).json({
            success: false,
            message: `Cashfree Gateway Failed to Process Refund: ${cfErr.message}`
          });
        }
      }

      await prisma.payment.update({
        where: { id: onlinePayment.id },
        data: { 
          status: 'refunded',
          notes: `Refunded online payment via Cashfree: ${reason || 'Customer opted to keep cash payment'}`
        }
      });

      await prisma.bill.update({
        where: { id: billId },
        data: { status: 'paid' }
      });

      // BUG 24: Audit log
      await logPaymentAudit(
        req.user?.restaurantId || bill.restaurantId,
        req.user?.userId,
        'DOUBLE_PAYMENT_RESOLVED',
        { billId, action: 'refund_online', refundedPaymentId: onlinePayment.id, reason }
      );

      // Broadcast socket update
      try {
        const { notifyOrderUpdate } = require('../../socket');
        notifyOrderUpdate({ billId, status: 'paid', action: 'double_payment_resolved' });
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Online payment refund processed on Cashfree Gateway! Bill status updated to Paid (Cash kept).',
        cfData: cfRefundResult
      });
    }

    if (action === 'keep_online_return_cash') {
      if (cashPayment) {
        await prisma.payment.update({
          where: { id: cashPayment.id },
          data: {
            status: 'reversed',
            notes: `Reversed Cash: Returned cash from drawer to customer. Reason: ${reason || 'Customer preferred online payment'}`
          }
        });
      }

      if (onlinePayment) {
        await prisma.payment.update({
          where: { id: onlinePayment.id },
          data: {
            status: 'completed',
            type: 'single',
            notes: 'Completed: Settled via online payment after cash reversal'
          }
        });
      }

      await prisma.bill.update({
        where: { id: billId },
        data: { status: 'paid' }
      });

      // BUG 24: Audit log
      await logPaymentAudit(
        req.user?.restaurantId || bill.restaurantId,
        req.user?.userId,
        'DOUBLE_PAYMENT_RESOLVED',
        { billId, action: 'keep_online_return_cash', reversedPaymentId: cashPayment?.id, reason }
      );

      // Broadcast socket update
      try {
        const { notifyOrderUpdate } = require('../../socket');
        notifyOrderUpdate({ billId, status: 'paid', action: 'double_payment_resolved' });
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Cash payment reversed and marked returned. Online payment accepted as final.'
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action provided' });
  } catch (error: any) {
    console.error('resolveDoublePayment error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
