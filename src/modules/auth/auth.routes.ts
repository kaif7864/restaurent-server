import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register new restaurant & owner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantName
 *               - ownerName
 *               - email
 *               - password
 *             properties:
 *               restaurantName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Validation error or email exists
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current logged in user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, authController.getProfile);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token sent to email
 *       400:
 *         description: User not found or error
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Token is invalid or has expired
 */
router.post('/reset-password', authController.resetPassword);

export default router;
