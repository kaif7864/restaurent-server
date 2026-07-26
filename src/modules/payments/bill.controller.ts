import { Request, Response } from 'express';
import { BillService } from './bill.service';

export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) throw new Error('Unauthorized');
    
    const sessions = await BillService.getActiveSessions(restaurantId);
    
    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sessions',
    });
  }
};

/**
 * BUG 8: Now passes discount and tip from request body to BillService.generateBill.
 * Previously these values were ignored even though the frontend sent them.
 */
export const generateBill = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    const { discount, tip } = req.body;

    const bill = await BillService.generateBill(
      sessionId,
      Number(discount) || 0,
      Number(tip) || 0
    );

    return res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate bill',
    });
  }
};

export const getAllBills = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) throw new Error('Unauthorized');
    
    const bills = await BillService.getAllBills(restaurantId);
    
    return res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch bills',
    });
  }
};
