import { Request, Response } from 'express';
import * as menuService from './menu.service';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const categories = await menuService.getCategories(restaurantId);
    res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const category = await menuService.createCategory(restaurantId, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    const category = await menuService.updateCategory(restaurantId, id, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    await menuService.deleteCategory(restaurantId, id);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getItems = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const items = await menuService.getItems(restaurantId);
    res.status(200).json({ success: true, data: items });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const item = await menuService.createItem(restaurantId, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    const item = await menuService.updateItem(restaurantId, id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { id } = req.params;
    await menuService.deleteItem(restaurantId, id);
    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getModifiers = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { itemId } = req.params;
    const modifiers = await menuService.getModifiers(restaurantId, itemId);
    res.status(200).json({ success: true, data: modifiers });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createModifierGroup = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { itemId } = req.params;
    const group = await menuService.createModifierGroup(restaurantId, itemId, req.body);
    res.status(201).json({ success: true, data: group });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateModifierGroup = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { groupId } = req.params;
    const group = await menuService.updateModifierGroup(restaurantId, groupId, req.body);
    res.status(200).json({ success: true, data: group });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteModifierGroup = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { groupId } = req.params;
    await menuService.deleteModifierGroup(restaurantId, groupId);
    res.status(200).json({ success: true, message: 'Modifier group deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createModifierOption = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { groupId } = req.params;
    const option = await menuService.createModifierOption(restaurantId, groupId, req.body);
    res.status(201).json({ success: true, data: option });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateModifierOption = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { optionId } = req.params;
    const option = await menuService.updateModifierOption(restaurantId, optionId, req.body);
    res.status(200).json({ success: true, data: option });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteModifierOption = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { optionId } = req.params;
    await menuService.deleteModifierOption(restaurantId, optionId);
    res.status(200).json({ success: true, message: 'Modifier option deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
