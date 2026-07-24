import { Request, Response } from 'express';
import { SessionService } from './session.service';

export const createSession = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await SessionService.createSession(restaurantId, req.body);
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const sessions = await SessionService.getActiveSessions(restaurantId);
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const generateBill = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { discount, tip } = req.body || {};
    const bill = await SessionService.generateBill(restaurantId, req.params.sessionId, discount, tip);

    // AUDIT LOG
    if (discount && discount > 0) {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await (prisma as any).auditLog.create({
        data: {
          restaurantId,
          userId: (req.user as any).id,
          action: 'apply_discount',
          details: `Applied discount of ${discount} to session ${req.params.sessionId}`
        }
      });
    }

    res.json({ success: true, data: bill });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const transferTable = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const session = await SessionService.transferTable(restaurantId, req.params.sessionId, req.body.newTableId);

    // AUDIT LOG
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await (prisma as any).auditLog.create({
      data: {
        restaurantId,
        userId: (req.user as any).id,
        action: 'transfer_table',
        details: `Transferred session ${req.params.sessionId} to table ${req.body.newTableId}`
      }
    });

    res.json({ success: true, data: session });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
