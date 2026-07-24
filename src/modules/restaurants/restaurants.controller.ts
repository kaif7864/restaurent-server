import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSettings = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    
    res.json({ success: true, data: {
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      settings: restaurant.metadata // using metadata for settings
    } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const { name, email, phone, address, settings } = req.body;
    
    const restaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        name,
        email,
        phone,
        address,
        metadata: settings // save settings json
      }
    });
    
    res.json({ success: true, data: {
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      address: restaurant.address,
      settings: restaurant.metadata
    } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
