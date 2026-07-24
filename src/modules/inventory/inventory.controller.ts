import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInventory = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addInventoryItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const { name, category, unit, stock, minStock } = req.body;
    
    const item = await prisma.inventoryItem.create({
      data: {
        restaurantId,
        name,
        category,
        unit,
        stock,
        minStock,
        status: stock <= minStock ? (stock === 0 ? 'out' : 'low') : 'ok'
      }
    });
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = (req as any).user.restaurantId;
    const { stock, ...rest } = req.body;
    
    const current = await prisma.inventoryItem.findFirst({ where: { id, restaurantId } });
    if (!current) return res.status(404).json({ success: false, message: 'Not found' });
    
    let newStatus = current.status;
    let newStock = stock !== undefined ? stock : current.stock;
    const minStock = rest.minStock !== undefined ? rest.minStock : current.minStock;
    
    if (newStock !== undefined || minStock !== undefined) {
      newStatus = Number(newStock) <= Number(minStock) ? (Number(newStock) === 0 ? 'out' : 'low') : 'ok';
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        stock: newStock,
        minStock,
        status: newStatus,
        ...rest,
        lastRestocked: stock > current.stock ? new Date() : undefined
      }
    });
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
