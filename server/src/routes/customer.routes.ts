import { Router } from 'express';
import { customerAuthController } from '../controllers/customerAuth.controller';
import { requireCustomerAuth } from '../middleware/customerAuth';

const router = Router();

// Public Customer Auth Endpoints
router.post('/send-otp', customerAuthController.sendOtp);
router.post('/verify-otp', customerAuthController.verifyOtp);

// Authenticated Customer Profile & History
router.get('/me', requireCustomerAuth, customerAuthController.getMe);
router.patch('/profile', requireCustomerAuth, customerAuthController.updateProfile);
router.get('/orders', requireCustomerAuth, customerAuthController.getOrders);

export default router;
