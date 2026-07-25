import { Request, Response } from 'express';
import * as tableService from './tables.service';
import { createTableSchema, updateTableSchema } from './tables.schema';

export const getTables = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const tables = await tableService.getTables(restaurantId);
    res.json({ success: true, data: tables });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTable = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const validatedData = createTableSchema.parse(req.body);
    const table = await tableService.createTable(restaurantId, validatedData);
    res.status(201).json({ success: true, data: table });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    if (error.message === 'A table with this name already exists') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTable = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    const validatedData = updateTableSchema.parse(req.body);
    const table = await tableService.updateTable(id, restaurantId, validatedData);
    res.json({ success: true, data: table });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    if (error.errors) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTable = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    await tableService.deleteTable(id, restaurantId);
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
