import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    sortOrder: z.number().int().optional(),
  }),
});

export const createItemSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid('Invalid Category ID'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().positive('Price must be greater than 0'),
    type: z.enum(['veg', 'non-veg', 'egg', 'vegan']),
    imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
    isAvailable: z.boolean().optional(),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.number().positive().optional(),
    type: z.enum(['veg', 'non-veg', 'egg', 'vegan']).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    isAvailable: z.boolean().optional(),
    categoryId: z.string().uuid().optional(),
  }),
});
