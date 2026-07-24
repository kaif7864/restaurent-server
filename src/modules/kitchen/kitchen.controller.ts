import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getNotes = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const notes = await prisma.kitchenNote.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: notes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addNote = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user.restaurantId;
    const { title, content, priority } = req.body;
    const createdBy = (req as any).user.name;
    
    const note = await prisma.kitchenNote.create({
      data: {
        restaurantId,
        title,
        content,
        priority: priority || 'medium',
        createdBy
      }
    });
    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority, content, title } = req.body;
    
    const note = await prisma.kitchenNote.update({
      where: { id },
      data: { status, priority, content, title }
    });
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.kitchenNote.delete({ where: { id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
