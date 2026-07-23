import { Request, Response } from 'express';
import * as authService from './auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.registerRestaurant(req.body);
    
    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = result.user;

    res.status(201).json({
      success: true,
      message: 'Restaurant and owner registered successfully',
      data: {
        user: userWithoutPassword,
        token: result.token,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUser(req.body);
    
    const { passwordHash, ...userWithoutPassword } = result.user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token: result.token,
      },
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  // req.user is set by auth middleware
  res.status(200).json({
    success: true,
    data: req.user
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
