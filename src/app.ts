import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { setupSwagger } from './config/swagger';
import authRoutes from './modules/auth/auth.routes';
import menuRoutes from './modules/menu/menu.routes';
import orderRoutes from './modules/orders/order.routes';
import uploadRoutes from './modules/upload/upload.routes';
import tableRoutes from './modules/tables/tables.routes';
import reservationRoutes from './modules/reservations/reservation.routes';
import paymentRoutes from './modules/payments/payment.routes';
import waitlistRoutes from './modules/waitlist/waitlist.routes';
import sessionRoutes from './modules/sessions/session.routes';
import staffRoutes from './modules/staff/staff.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import kitchenRoutes from './modules/kitchen/kitchen.routes';
import restaurantRoutes from './modules/restaurants/restaurants.routes';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Setup Swagger API Docs
setupSwagger(app);

// Basic Health Route
/**
 * @openapi
 * /health:
 *   get:
 *     description: Health check endpoint
 *     responses:
 *       200:
 *         description: Returns ok
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

import customerRoutes from './modules/customer/customer.routes';

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1', paymentRoutes); // Note: payment routes use /orders/:id/payments so it expects /api/v1

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
