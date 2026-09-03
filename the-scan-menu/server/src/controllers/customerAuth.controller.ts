import { Request, Response, NextFunction } from 'express';
import { CustomerAuthenticatedRequest } from '../middleware/customerAuth';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { customerRepository } from '../repositories/customer.repository';
import { customerService } from '../services/customer.service';
import { loyaltyService } from '../services/loyalty.service';
import { otpService } from '../services/otp.service';
import { TokenService } from '../services/token.service';
import { sendSuccess, sendError } from '../utils/response';
import { toCustomerSafeCustomerDTO } from '../utils/dto';
import mongoose from 'mongoose';

const tokenService = new TokenService();

export class CustomerAuthController {
  constructor() {
    this.sendOtp = this.sendOtp.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
    this.getMe = this.getMe.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.getOrders = this.getOrders.bind(this);
  }

  /**
   * POST /api/v1/public/customers/send-otp
   * Initiates customer phone login via 4-digit PIN.
   * Enforces 60-second cooldown and 5-minute TTL without exposing user existence.
   * NOTE: Currently returns a fixed '0000' PIN until SMS gateway is integrated.
   */
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, restaurantSlug, restaurantId } = req.body;

      if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
        sendError(res, 'BAD_REQUEST', 'A valid Indian mobile phone number is required', null, 400);
        return;
      }

      // Resolve restaurant tenant
      let restaurant: any = null;
      if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        restaurant = await restaurantRepository.findById(restaurantId);
      } else if (restaurantSlug) {
        restaurant = await restaurantRepository.findBySlug(restaurantSlug.toLowerCase().trim());
      }

      if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant identifier is invalid or missing', null, 404);
        return;
      }

      const otpResult = await otpService.sendOtp(restaurant._id, phone);

      sendSuccess(
        res,
        {
          phone: otpResult.phone,
          cooldownSeconds: otpResult.cooldownSeconds,
          demoOtp: otpResult.demoOtp,
        },
        'Verification code sent successfully'
      );
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /api/v1/public/customers/verify-otp
   * Validates OTP and creates/updates the customer account and issues a Customer JWT.
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp, name, email, restaurantSlug, restaurantId } = req.body;

      if (!phone || !otp) {
        sendError(res, 'BAD_REQUEST', 'Phone number and verification code are required', null, 400);
        return;
      }

      // Resolve restaurant
      let restaurant: any = null;
      if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        restaurant = await restaurantRepository.findById(restaurantId);
      } else if (restaurantSlug) {
        restaurant = await restaurantRepository.findBySlug(restaurantSlug.toLowerCase().trim());
      }

      if (!restaurant || ['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant identifier is invalid or missing', null, 404);
        return;
      }

      // Verify OTP (throws CustomError on mismatch, expiry, or max attempts)
      const verification = await otpService.verifyOtp(restaurant._id, phone, otp);

      // Find or create customer only after successful OTP verification
      const customer = await customerService.findOrCreateCustomer(
        restaurant._id,
        verification.phone,
        name,
        email,
        true
      );

      if (customer.isBlocked) {
        sendError(res, 'FORBIDDEN', 'This customer account has been blocked', null, 403);
        return;
      }

      // Generate Customer JWT token (30-day validity)
      const customerToken = tokenService.generateCustomerToken({
        id: customer._id.toString(),
        phone: customer.phone,
        restaurantId: restaurant._id.toString(),
        name: customer.name,
        role: 'CUSTOMER',
      });

      sendSuccess(
        res,
        {
          customer: toCustomerSafeCustomerDTO(customer),
          customerToken,
          restaurant: {
            id: restaurant._id.toString(),
            name: restaurant.name,
            slug: restaurant.slug,
          },
        },
        'Customer verified and logged in successfully',
        200
      );
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  /**
   * GET /api/v1/public/customers/me
   * Returns current authenticated customer profile.
   */
  async getMe(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = req.customer;
      if (!customer) {
        sendError(res, 'UNAUTHORIZED', 'Customer profile not found', null, 401);
        return;
      }

      // Auto-expire unredeemed points first
      await loyaltyService.processExpiredPoints(customer.restaurantId, customer._id);

      // Auto-repair any uncredited completed orders for this customer
      await loyaltyService.repairAndAccrueUncreditedOrders(
        customer.restaurantId,
        customer._id,
        customer.phone,
        customer.name
      ).catch((err) => console.error('Failed to repair uncredited orders:', err));

      // Re-fetch fresh customer profile from database to get latest loyalty points balance
      const freshCustomer = (await customerRepository.findById(customer._id)) || customer;

      const restaurant = await restaurantRepository.findById(customer.restaurantId);

      const loyaltyLedger = await loyaltyService.getCustomerLedger(customer.restaurantId, customer._id);

      sendSuccess(
        res,
        {
          customer: toCustomerSafeCustomerDTO(freshCustomer),
          restaurant,
          loyaltyLedger,
        },
        'Customer profile retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/public/customers/profile
   * Updates customer name or contact email.
   */
  async updateProfile(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = req.customer;
      if (!customer) {
        sendError(res, 'UNAUTHORIZED', 'Customer profile not found', null, 401);
        return;
      }

      const { name, email, notes } = req.body;

      if (name && typeof name === 'string' && name.trim()) {
        customer.name = name.trim();
      }
      if (email !== undefined) {
        customer.email = email ? email.trim() : undefined;
      }
      if (notes !== undefined) {
        customer.notes = notes ? notes.trim() : undefined;
      }

      await customerRepository.save(customer);

      sendSuccess(res, toCustomerSafeCustomerDTO(customer), 'Customer profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/customers/orders
   * Returns personal order history for current customer.
   */
  async getOrders(req: CustomerAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = req.customer;
      if (!customer) {
        sendError(res, 'UNAUTHORIZED', 'Customer profile not found', null, 401);
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await customerService.getCustomerOrderHistory(
        customer.restaurantId,
        customer._id,
        page,
        limit
      );

      sendSuccess(res, result, 'Customer order history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const customerAuthController = new CustomerAuthController();
export default customerAuthController;
