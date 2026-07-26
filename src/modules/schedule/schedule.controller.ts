import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ScheduleService } from './schedule.service';

export const getSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const data = await ScheduleService.getSchedules(restaurantId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const data = await ScheduleService.createSchedule(restaurantId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    await ScheduleService.deleteSchedule(restaurantId, req.params.id);
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
