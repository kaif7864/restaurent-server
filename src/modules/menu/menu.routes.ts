import { Router } from 'express';
import * as menuController from './menu.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// All menu routes require authentication
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/menu/categories:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get all menu categories for the restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', menuController.getCategories);

/**
 * @openapi
 * /api/v1/menu/categories:
 *   post:
 *     tags:
 *       - Menu
 *     summary: Create a new menu category (Manager/Owner only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sortOrder:
 *                 type: number
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/categories', requireRole(['owner', 'manager']), menuController.createCategory);

/**
 * @openapi
 * /api/v1/menu/categories/{id}:
 *   put:
 *     tags:
 *       - Menu
 *     summary: Update an existing menu category (Manager/Owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put('/categories/:id', requireRole(['owner', 'manager']), menuController.updateCategory);

/**
 * @openapi
 * /api/v1/menu/categories/{id}:
 *   delete:
 *     tags:
 *       - Menu
 *     summary: Delete an existing menu category (Manager/Owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */
router.delete('/categories/:id', requireRole(['owner', 'manager']), menuController.deleteCategory);

/**
 * @openapi
 * /api/v1/menu/items:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get all menu items for the restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of menu items
 */
router.get('/items', menuController.getItems);

/**
 * @openapi
 * /api/v1/menu/items:
 *   post:
 *     tags:
 *       - Menu
 *     summary: Create a new menu item (Manager/Owner only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, name, price, type]
 *             properties:
 *               categoryId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [veg, non-veg, egg, vegan]
 *               imageUrl:
 *                 type: string
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Item created
 */
router.post('/items', requireRole(['owner', 'manager']), menuController.createItem);

/**
 * @openapi
 * /api/v1/menu/items/{id}:
 *   put:
 *     tags:
 *       - Menu
 *     summary: Update an existing menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Item updated
 */
router.put('/items/:id', requireRole(['owner', 'manager', 'kitchen']), menuController.updateItem);

/**
 * @openapi
 * /api/v1/menu/items/{id}:
 *   delete:
 *     tags:
 *       - Menu
 *     summary: Delete an existing menu item (Manager/Owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted
 */
router.delete('/items/:id', requireRole(['owner', 'manager']), menuController.deleteItem);

// --- Modifiers ---
router.get('/items/:itemId/modifiers', menuController.getModifiers);
router.post('/items/:itemId/modifiers', requireRole(['owner', 'manager']), menuController.createModifierGroup);
router.put('/modifiers/groups/:groupId', requireRole(['owner', 'manager']), menuController.updateModifierGroup);
router.delete('/modifiers/groups/:groupId', requireRole(['owner', 'manager']), menuController.deleteModifierGroup);
router.post('/modifiers/groups/:groupId/options', requireRole(['owner', 'manager']), menuController.createModifierOption);
router.put('/modifiers/options/:optionId', requireRole(['owner', 'manager']), menuController.updateModifierOption);
router.delete('/modifiers/options/:optionId', requireRole(['owner', 'manager']), menuController.deleteModifierOption);

export default router;
