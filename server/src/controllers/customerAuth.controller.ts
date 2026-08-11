import { Request, Response, NextFunction } from 'express';
import { CustomerAuthenticatedRequest } from '../middleware/customerAuth';
import { Customer } from '../models/Customer';
import { Restaurant } from '../models/Restaurant';
import { customerService } from '../services/customer.service';
import { TokenService } from '../services/token.service';
import { sendSuccess, sendError } from '../utils/response';
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
   * Initiates customer phone login via OTP.
   */
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, restaurantSlug, restaurantId } = req.body;

      if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
        sendError(res, 'BAD_REQUEST', 'A valid phone number is required', null, 400);
        return;
      }

      // Resolve restaurant
      let restaurant: any = null;
      if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        restaurant = await Restaurant.findById(restaurantId);
      } else if (restaurantSlug) {
        restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      }

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant identifier is invalid or missing', null, 404);
        return;
      }

      // Check if existing customer
      const existingCustomer = await Customer.findOne({
        restaurantId: restaurant._id,
        phone: phone.trim(),
      });

      // Demo OTP (Production hook ready for SMS Gateway)
      const isDemo = true;
      const demoOtp = '1234';

      sendSuccess(
        res,
        {
          phone: phone.trim(),
          isExistingUser: !!existingCustomer,
          customerName: existingCustomer?.name || null,
          demoOtp: isDemo ? demoOtp : undefined,
        },
        'Verification code sent successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/public/customers/verify-otp
   * Validates OTP and logs in / registers the customer.
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, otp, name, email, restaurantSlug, restaurantId } = req.body;

      if (!phone || !otp) {
        sendError(res, 'BAD_REQUEST', 'Phone number and verification OTP code are required', null, 400);
        return;
      }

      if (otp !== '1234') {
        sendError(res, 'INVALID_OTP', 'Incorrect verification code. Please use demo code 1234.', null, 400);
        return;
      }

      // Resolve restaurant
      let restaurant: any = null;
      if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
        restaurant = await Restaurant.findById(restaurantId);
      } else if (restaurantSlug) {
        restaurant = await Restaurant.findOne({ slug: restaurantSlug.toLowerCase().trim() });
      }

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant identifier is invalid or missing', null, 404);
        return;
      }

      // Find or create customer
      const customer = await customerService.findOrCreateCustomer(
        restaurant._id,
        phone.trim(),
        name,
        email
      );

      if (customer.isBlocked) {
        sendError(res, 'FORBIDDEN', 'This customer account has been blocked', null, 403);
        return;
      }

      // Generate Customer JWT token
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
          customer: {
            id: customer._id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            totalOrdersCount: customer.totalOrdersCount,
            totalSpent: customer.totalSpent,
            lastOrderAt: customer.lastOrderAt,
            createdAt: customer.createdAt,
          },
          customerToken,
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
          },
        },
        'Customer verified and logged in successfully',
        200
      );
    } catch (error) {
      next(error);
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

      const restaurant = await Restaurant.findById(customer.restaurantId).select('name slug logoUrl currency theme');

      sendSuccess(
        res,
        {
          customer,
          restaurant,
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

      await customer.save();

      sendSuccess(res, customer, 'Customer profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/customers/orders
   * Returns order history for current customer.
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
