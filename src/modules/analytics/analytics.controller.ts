import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const period = (req.query.period as string) || 'week';
    const metrics = await AnalyticsService.getDashboardMetrics(restaurantId, period);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getZReport = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const report = await AnalyticsService.getZReport(restaurantId);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
