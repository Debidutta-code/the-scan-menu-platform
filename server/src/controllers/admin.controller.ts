import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { sendSuccess, sendError } from '../utils/response';
import { EmailService } from '../services/email.service';
import { restaurantProvisioningService } from '../services/restaurantProvisioning.service';
import { counterService } from '../services/counter.service';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export class AdminController {
  constructor() {
    this.provisionRestaurant = this.provisionRestaurant.bind(this);
    this.getOnboardingProgress = this.getOnboardingProgress.bind(this);
    this.createRestaurant = this.createRestaurant.bind(this);
    this.listRestaurants = this.listRestaurants.bind(this);
    this.getRestaurant = this.getRestaurant.bind(this);
    this.editRestaurant = this.editRestaurant.bind(this);
    this.suspendRestaurant = this.suspendRestaurant.bind(this);
    this.activateRestaurant = this.activateRestaurant.bind(this);
    this.deleteRestaurant = this.deleteRestaurant.bind(this);
    this.assignManager = this.assignManager.bind(this);
    this.getPlatformStats = this.getPlatformStats.bind(this);
  }

  async provisionRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, logoUrl, coverImageUrl, description, phone, email, address, currency, timezone, manager, settings } = req.body;

      if (!name) {
        sendError(res, 'BAD_REQUEST', 'Restaurant name is required', null, 400);
        return;
      }

      if (!manager || !manager.email || !manager.name || !manager.password) {
        sendError(res, 'BAD_REQUEST', 'Manager details (name, email, password) are required', null, 400);
        return;
      }

      const result = await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name, slug, logoUrl, coverImageUrl, description, phone, email, address, currency, timezone },
        manager,
        settings,
      });

      sendSuccess(res, result, 'Restaurant provisioned successfully', 201);
    } catch (error: any) {
      if (error.message && error.message.startsWith('SLUG_CONFLICT')) {
        sendError(res, 'SLUG_CONFLICT', error.message, null, 400);
        return;
      }
      next(error);
    }
  }

  async getOnboardingProgress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const onboarding = await restaurantProvisioningService.getOnboardingProgress(id);
      sendSuccess(res, onboarding, 'Restaurant onboarding progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getPlatformStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const totalRestaurants = await Restaurant.countDocuments();
      const activeRestaurants = await Restaurant.countDocuments({ status: { $in: ['ACTIVE', 'TRIAL'] } });
      const suspendedRestaurants = await Restaurant.countDocuments({ status: 'SUSPENDED' });

      const totalOrders = await Order.countDocuments();

      const recentRestaurants = await Restaurant.find().sort({ createdAt: -1 }).limit(5);
      const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('restaurantId', 'name');

      const activityFeed = [];

      for (const rest of recentRestaurants) {
        activityFeed.push({
          type: 'RESTAURANT_CREATED',
          message: `New restaurant tenant "${rest.name}" (${rest.code || 'NO_CODE'}) was registered on the platform.`,
          timestamp: rest.createdAt,
        });
      }

      for (const order of recentOrders) {
        activityFeed.push({
          type: 'ORDER_PLACED',
          message: `Order #${order.orderNumber} placed at "${(order.restaurantId as any)?.name || 'Tenant'}" for ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(order.total / 100)}.`,
          timestamp: order.createdAt,
        });
      }

      activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const stats = {
        totalRestaurants,
        activeRestaurants,
        suspendedRestaurants,
        totalOrders,
        activityFeed: activityFeed.slice(0, 10),
      };

      sendSuccess(res, stats, 'Platform statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, slug, logoUrl, coverImageUrl, description, phone, email, address } = req.body;

      if (!name) {
        sendError(res, 'BAD_REQUEST', 'Restaurant name is required', null, 400);
        return;
      }

      let finalSlug = slug ? slugify(slug) : slugify(name);

      const existing = await Restaurant.findOne({ slug: finalSlug });
      if (existing) {
        if (!slug) {
          finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          sendError(res, 'SLUG_CONFLICT', 'The provided slug is already in use.', null, 400);
          return;
        }
      }

      const code = await counterService.getNextSequence('restaurant_code', 'RST-', 6);

      const restaurant = new Restaurant({
        code,
        name,
        slug: finalSlug,
        status: 'TRIAL',
        logoUrl,
        coverImageUrl,
        description,
        phone,
        email,
        address,
      });

      await restaurant.save();

      sendSuccess(res, restaurant, 'Restaurant created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listRestaurants(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const total = await Restaurant.countDocuments();
      const restaurants = await Restaurant.find().skip(skip).limit(limit).sort({ createdAt: -1 });

      sendSuccess(
        res,
        {
          restaurants,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Restaurants listed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const restaurant = await Restaurant.findById(id);

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      sendSuccess(res, restaurant, 'Restaurant fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async editRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      if (updateData.slug) {
        updateData.slug = slugify(updateData.slug);
        const existing = await Restaurant.findOne({ slug: updateData.slug, _id: { $ne: id } });
        if (existing) {
          sendError(res, 'SLUG_CONFLICT', 'The provided slug is already in use.', null, 400);
          return;
        }
      }

      const restaurant = await Restaurant.findByIdAndUpdate(id, updateData, { new: true });
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      sendSuccess(res, restaurant, 'Restaurant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async suspendRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const restaurant = await Restaurant.findByIdAndUpdate(id, { status: 'SUSPENDED' }, { new: true });

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      logger.info(`[AUDIT] Restaurant Suspended: ${restaurant.name} (${restaurant.code})`);

      sendSuccess(res, restaurant, 'Restaurant suspended successfully');
    } catch (error) {
      next(error);
    }
  }

  async activateRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const restaurant = await Restaurant.findByIdAndUpdate(id, { status: 'ACTIVE' }, { new: true });

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      logger.info(`[AUDIT] Restaurant Activated: ${restaurant.name} (${restaurant.code})`);

      sendSuccess(res, restaurant, 'Restaurant activated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const restaurant = await Restaurant.findByIdAndUpdate(id, { status: 'ARCHIVED' }, { new: true });

      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      logger.info(`[AUDIT] Restaurant Deleted: ${restaurant.name} (${restaurant.code})`);

      sendSuccess(res, restaurant, 'Restaurant archived successfully');
    } catch (error) {
      next(error);
    }
  }

  async assignManager(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, email, name, password } = req.body;

      const restaurant = await Restaurant.findById(id);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      let targetUserId: string;

      if (userId) {
        const existingUser = await User.findById(userId);
        if (!existingUser) {
          sendError(res, 'USER_NOT_FOUND', 'The specified user was not found', null, 404);
          return;
        }
        targetUserId = existingUser.id;
      } else if (email && name && password) {
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
          sendError(res, 'USER_ALREADY_EXISTS', 'A user with this email already exists', null, 400);
          return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          role: 'MANAGER',
          isActive: true,
        });
        await newUser.save();
        targetUserId = newUser.id;

        try {
          const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          await EmailService.getInstance().sendManagerInvite(
            email.toLowerCase().trim(),
            name,
            restaurant.name,
            `${clientUrl}/login`
          );
        } catch (emailErr) {
          logger.error(emailErr, 'Failed to send manager invite email during registration');
        }
      } else {
        sendError(
          res,
          'BAD_REQUEST',
          'Provide either a valid userId or new manager credentials (email, name, password)',
          null,
          400
        );
        return;
      }

      const existingStaff = await RestaurantStaff.findOne({
        userId: targetUserId,
        restaurantId: restaurant.id,
      });

      if (existingStaff) {
        if (!existingStaff.isActive || existingStaff.role !== 'MANAGER') {
          existingStaff.isActive = true;
          existingStaff.role = 'MANAGER';
          await existingStaff.save();
        }
        sendSuccess(res, existingStaff, 'Manager assigned successfully');
        return;
      }

      const staff = new RestaurantStaff({
        userId: targetUserId,
        restaurantId: restaurant.id,
        role: 'MANAGER',
        isActive: true,
      });

      await staff.save();

      sendSuccess(res, staff, 'Manager assigned successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
