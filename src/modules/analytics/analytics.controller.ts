import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const metrics = await AnalyticsService.getDashboardMetrics(restaurantId);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
