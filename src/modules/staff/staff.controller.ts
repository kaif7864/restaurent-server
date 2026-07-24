import { Request, Response } from 'express';
import { StaffService } from './staff.service';

export const getStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const staff = await StaffService.getStaff(restaurantId);
    res.json({ success: true, data: staff });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const staff = await StaffService.createStaff(restaurantId, req.body);
    res.status(201).json({ success: true, data: staff });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const staff = await StaffService.updateStaff(restaurantId, req.params.id, req.body);
    res.json({ success: true, data: staff });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    await StaffService.deleteStaff(restaurantId, req.params.id);
    res.json({ success: true, message: 'Staff deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const clockIn = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const log = await StaffService.clockIn(restaurantId, req.params.id);
    res.status(201).json({ success: true, data: log });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const clockOut = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const log = await StaffService.clockOut(restaurantId, req.params.id);
    res.json({ success: true, data: log });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTimeLogs = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const userId = req.query.userId as string;
    const logs = await StaffService.getTimeLogs(restaurantId, userId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const logs = await StaffService.getAuditLogs(restaurantId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
