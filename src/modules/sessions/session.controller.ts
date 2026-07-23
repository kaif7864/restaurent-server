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
