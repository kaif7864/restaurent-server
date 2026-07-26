import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { FeedbackService } from './feedback.service';

export const getFeedbacks = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const data = await FeedbackService.getFeedbacks(restaurantId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const data = await FeedbackService.createFeedback(restaurantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
