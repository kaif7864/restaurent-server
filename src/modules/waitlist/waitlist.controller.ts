import { Request, Response } from 'express';
import { WaitlistService } from './waitlist.service';

export const getWaitlist = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const waitlist = await WaitlistService.getWaitlist(restaurantId);
    res.json({ success: true, data: waitlist });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addToWaitlist = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const entry = await WaitlistService.addToWaitlist(restaurantId, req.body);
    res.status(201).json({ success: true, data: entry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateWaitlistEntry = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const entry = await WaitlistService.updateWaitlistEntry(restaurantId, id, req.body);
    res.json({ success: true, data: entry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const removeFromWaitlist = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const entry = await WaitlistService.removeFromWaitlist(restaurantId, id);
    res.json({ success: true, data: entry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
