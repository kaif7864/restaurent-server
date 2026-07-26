import { Router } from 'express';
import * as customerController from './customer.controller';

const router = Router();

// Public routes for Customer QR App
// 1. Send OTP and Verify OTP (Create Guest Session)
router.post('/send-otp', customerController.sendOtp);
router.post('/verify-otp', customerController.verifyOtp);

// 2. Fetch Menu using tableId (which we will map to restaurantId internally)
router.get('/menu/:tableId', customerController.getMenuForTable);

// 3. Place Order (Pending Waiter Approval)
router.post('/order', customerController.placeOrder);

// 4. Get active orders for table
router.get('/orders/:tableId', customerController.getTableOrders);

// 5. Pay for an order online
router.post('/orders/:orderId/pay-online', customerController.payOrderOnline);
router.post('/orders/:orderId/verify-payment', customerController.verifyOrderPayment);

// 6. Submit feedback
router.post('/feedback', customerController.submitCustomerFeedback);

export default router;
