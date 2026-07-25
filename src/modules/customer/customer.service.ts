import prisma from '../../config/prisma';
import jwt from 'jsonwebtoken';

// Use a distinct secret for customer tokens if possible, or same as staff for now
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export const createCustomerSession = async (tableIdOrName: string, phone: string, name: string) => {
  const table = await prisma.restaurantTable.findFirst({ 
    where: { 
      OR: [
        ...(isUUID(tableIdOrName) ? [{ id: tableIdOrName }] : []),
        { name: tableIdOrName }
      ]
    } 
  });
  if (!table) throw new Error('Table not found');

  // Check if table is occupied
  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { in: ['pending_approval', 'active'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (activeOrder && activeOrder.metadata) {
    const orderMeta: any = activeOrder.metadata;
    if (orderMeta.customerPhone && orderMeta.customerPhone !== phone) {
      throw new Error('Table is already occupied by another guest.');
    }
  }

  // Here you could also save the Customer in a separate `Customer` CRM table
  
  // Generate a mock JWT for the customer
  const token = jwt.sign(
    { 
      role: 'customer', 
      tableId: table.id, 
      restaurantId: table.restaurantId,
      phone,
      name
    },
    JWT_SECRET,
    { expiresIn: '3h' } // 3 hours session
  );

  return token;
};

export const getMenuForTable = async (tableIdOrName: string) => {
  const table = await prisma.restaurantTable.findFirst({ 
    where: { 
      OR: [
        ...(isUUID(tableIdOrName) ? [{ id: tableIdOrName }] : []),
        { name: tableIdOrName }
      ]
    } 
  });
  if (!table) throw new Error('Table not found');

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: table.restaurantId },
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        where: { isAvailable: true }
      }
    }
  });

  return categories;
};

export const createPendingOrder = async (tableIdOrName: string, items: any[], customerDetails: any) => {
  const table = await prisma.restaurantTable.findFirst({ 
    where: { 
      OR: [
        ...(isUUID(tableIdOrName) ? [{ id: tableIdOrName }] : []),
        { name: tableIdOrName }
      ]
    } 
  });
  if (!table) throw new Error('Table not found');

  // Check if there's an active session for this table, or create a mock order
  // Waiter will link it to an active session when they approve it
  
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  
  const taxTotal = subtotal * 0.05; // 5% mock tax
  const total = subtotal + taxTotal;

  // Check if there is already an active or pending order for this table
  const existingOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { notIn: ['paid', 'voided'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingOrder) {
    // Append items to existing order and update totals
    const updatedOrder = await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        subtotal: Number(existingOrder.subtotal) + subtotal,
        taxTotal: Number(existingOrder.taxTotal) + taxTotal,
        total: Number(existingOrder.total) + total,
        // If it was already active, leave it active. If it was pending_approval, leave it pending_approval.
        items: {
          create: items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            status: 'pending_approval',
          }))
        }
      },
      include: { items: true }
    });
    return updatedOrder;
  }

  // Create a brand new order if none exists
  const order = await prisma.order.create({
    data: {
      restaurantId: table.restaurantId,
      tableId: table.id,
      status: 'pending_approval',
      source: 'customer_qr',
      subtotal,
      taxTotal,
      total,
      metadata: {
        customerName: customerDetails.customerName,
        customerPhone: customerDetails.customerPhone,
        isGuestApp: true
      },
      items: {
        create: items.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          status: 'pending_approval',
        }))
      }
    },
    include: {
      items: true
    }
  });

  // Update table status to occupied
  await prisma.restaurantTable.update({
    where: { id: table.id },
    data: { status: 'occupied' }
  });

  return order;
};

export const getTableOrders = async (tableIdOrName: string) => {
  const table = await prisma.restaurantTable.findFirst({ 
    where: { 
      OR: [
        ...(isUUID(tableIdOrName) ? [{ id: tableIdOrName }] : []),
        { name: tableIdOrName }
      ]
    } 
  });
  if (!table) throw new Error('Table not found');

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      status: {
        notIn: ['paid'] // We include 'voided' so the frontend can show the Rejected screen
      }
    },
    include: {
      items: {
        include: {
          item: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return orders;
};
