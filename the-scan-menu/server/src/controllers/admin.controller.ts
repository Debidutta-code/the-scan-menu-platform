import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Tax } from '../models/Tax';
import { auditLogService } from '../services/auditLog.service';
import { sendSuccess, sendError } from '../utils/response';
import { EmailService } from '../services/email.service';
import { restaurantProvisioningService } from '../services/restaurantProvisioning.service';
import { outletSetupAuditService } from '../services/outletSetupAudit.service';
import { counterService } from '../services/counter.service';
import { logger } from '../utils/logger';
import config from '../config';
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
    this.getOutletSetupAudit = this.getOutletSetupAudit.bind(this);
    this.updateOutletSettings = this.updateOutletSettings.bind(this);
    this.seedDemoMenu = this.seedDemoMenu.bind(this);
    this.applyTaxPreset = this.applyTaxPreset.bind(this);
    this.createRestaurant = this.createRestaurant.bind(this);
    this.listRestaurants = this.listRestaurants.bind(this);
    this.getRestaurant = this.getRestaurant.bind(this);
    this.editRestaurant = this.editRestaurant.bind(this);
    this.suspendRestaurant = this.suspendRestaurant.bind(this);
    this.activateRestaurant = this.activateRestaurant.bind(this);
    this.deleteRestaurant = this.deleteRestaurant.bind(this);
    this.assignManager = this.assignManager.bind(this);
    this.getPlatformStats = this.getPlatformStats.bind(this);
    this.getPlatformAnalytics = this.getPlatformAnalytics.bind(this);

    // Advanced Super Admin Features
    this.getPOSOutlets = this.getPOSOutlets.bind(this);
    this.getPOSSyncLogs = this.getPOSSyncLogs.bind(this);
    this.triggerPOSMenuSync = this.triggerPOSMenuSync.bind(this);
    this.updatePOSConfig = this.updatePOSConfig.bind(this);
    this.getPaymentOverview = this.getPaymentOverview.bind(this);
    this.getTenantPaymentConfigs = this.getTenantPaymentConfigs.bind(this);
    this.updateTenantPaymentMethods = this.updateTenantPaymentMethods.bind(this);
    this.getAuditLogs = this.getAuditLogs.bind(this);
  }

  async provisionRestaurant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body || {};
      const restaurantData = body.restaurant || body;
      const managerData = body.manager || {
        name: body.managerName,
        email: body.managerEmail,
        password: body.managerPassword,
      };
      const settingsData = body.settings;
      const planKey = restaurantData.planKey || body.planKey || 'ENTERPRISE';

      const name = restaurantData.name;
      if (!name || (typeof name === 'string' && !name.trim())) {
        sendError(res, 'BAD_REQUEST', 'Restaurant name is required', null, 400);
        return;
      }

      if (!managerData || !managerData.email || !managerData.name || !managerData.password) {
        sendError(res, 'BAD_REQUEST', 'Manager details (name, email, password) are required', null, 400);
        return;
      }

      const result = await restaurantProvisioningService.provisionRestaurant({
        planKey,
        restaurant: {
          name: typeof restaurantData.name === 'string' ? restaurantData.name.trim() : restaurantData.name,
          slug: restaurantData.slug ? String(restaurantData.slug).trim() : undefined,
          logoUrl: restaurantData.logoUrl,
          coverImageUrl: restaurantData.coverImageUrl,
          description: restaurantData.description,
          phone: restaurantData.phone,
          email: restaurantData.email,
          address: restaurantData.address,
          currency: restaurantData.currency || 'INR',
          timezone: restaurantData.timezone || 'Asia/Kolkata',
          planKey,
          gstNumber: restaurantData.gstNumber,
          whatsapp: restaurantData.whatsapp,
          googleReviewUrl: restaurantData.googleReviewUrl,
          openTime: restaurantData.openTime,
          closeTime: restaurantData.closeTime,
        },
        manager: {
          name: typeof managerData.name === 'string' ? managerData.name.trim() : managerData.name,
          email: typeof managerData.email === 'string' ? managerData.email.trim() : managerData.email,
          password: managerData.password,
        },
        settings: settingsData,
      });

      sendSuccess(res, result, 'Restaurant provisioned successfully', 201);
    } catch (error: any) {
      if (error.message && error.message.startsWith('SLUG_CONFLICT')) {
        sendError(res, 'SLUG_CONFLICT', error.message, null, 400);
        return;
      }
      if (error.message && (error.message.startsWith('VALIDATION:') || error.message.startsWith('DUPLICATE_EMAIL:'))) {
        sendError(res, 'BAD_REQUEST', error.message, null, 400);
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

  async getOutletSetupAudit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const audit = await outletSetupAuditService.auditOutlet(id);
      sendSuccess(res, audit, 'Outlet setup audit completed successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateOutletSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const restaurant = await Restaurant.findById(id);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      // 1. Update Restaurant Entity Fields if provided
      const restFields: any = {};
      if (updateData.name) restFields.name = updateData.name.trim();
      if (updateData.slug) restFields.slug = slugify(updateData.slug);
      if (updateData.phone !== undefined) restFields.phone = updateData.phone;
      if (updateData.email !== undefined) restFields.email = updateData.email;
      if (updateData.address !== undefined) restFields.address = updateData.address;
      if (updateData.description !== undefined) restFields.description = updateData.description;
      if (updateData.logoUrl !== undefined) restFields.logoUrl = updateData.logoUrl;
      if (updateData.coverImageUrl !== undefined) restFields.coverImageUrl = updateData.coverImageUrl;

      if (Object.keys(restFields).length > 0) {
        await Restaurant.findByIdAndUpdate(id, restFields, { new: true });
      }

      // 2. Update or Upsert RestaurantSettings
      let settings = await RestaurantSettings.findOne({ restaurantId: id });
      if (!settings) {
        settings = new RestaurantSettings({ restaurantId: id });
      }

      if (updateData.theme) settings.theme = { ...settings.theme, ...updateData.theme };
      if (updateData.currency) settings.currency = updateData.currency;
      if (updateData.timezone) settings.timezone = updateData.timezone;
      if (updateData.taxRatePercent !== undefined) settings.paymentConfig.taxRatePercent = updateData.taxRatePercent;
      if (updateData.activeMode) settings.paymentConfig.activeMode = updateData.activeMode;
      if (updateData.paymentMethods) settings.paymentConfig.paymentMethods = { ...settings.paymentConfig.paymentMethods, ...updateData.paymentMethods };
      if (updateData.razorpayConfig) settings.paymentConfig.razorpayConfig = { ...settings.paymentConfig.razorpayConfig, ...updateData.razorpayConfig };
      if (updateData.integrationConfig) settings.paymentConfig.integrationConfig = updateData.integrationConfig;
      if (updateData.gstNumber !== undefined) settings.paymentConfig.gstNumber = updateData.gstNumber;
      if (updateData.workflow) settings.workflow = { ...settings.workflow, ...updateData.workflow };
      if (updateData.orderWorkflowMode) settings.workflow.orderWorkflowMode = updateData.orderWorkflowMode;
      if (updateData.autoAcceptConfig) settings.workflow.autoAcceptConfig = updateData.autoAcceptConfig;
      if (updateData.orderConfig) settings.orderConfig = { ...(settings.orderConfig || {}), ...updateData.orderConfig };
      if (updateData.uiSettings) settings.uiSettings = { ...(settings.uiSettings || {}), ...updateData.uiSettings };
      if (updateData.inventoryConfig) settings.inventoryConfig = { ...(settings.inventoryConfig || {}), ...updateData.inventoryConfig };
      if (updateData.timings) settings.timings = updateData.timings;
      if (updateData.googleReviewUrl !== undefined) settings.branding.googleReviewUrl = updateData.googleReviewUrl;
      if (updateData.whatsapp !== undefined) settings.branding.whatsapp = updateData.whatsapp;
      if (updateData.socialLinks) settings.branding.socialLinks = { ...settings.branding.socialLinks, ...updateData.socialLinks };
      if (updateData.printerConfig) settings.printerConfig = { ...(settings.printerConfig || {}), ...updateData.printerConfig };

      await settings.save();

      // Recalculate audit
      const audit = await outletSetupAuditService.auditOutlet(id);

      sendSuccess(res, { settings, audit }, 'Outlet settings and profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async seedDemoMenu(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const restaurant = await Restaurant.findById(id);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      // Check existing categories
      const existingCategories = await Category.find({ restaurantId: restaurant._id });
      if (existingCategories.length > 0) {
        sendError(res, 'MENU_EXISTS', 'Restaurant already has categories. Delete them first or add items individually.', null, 400);
        return;
      }

      // 1. Create Starter Categories
      const catStarters = await Category.create({
        restaurantId: restaurant._id,
        name: 'Starters & Appetizers',
        description: 'Crispy bites and freshly grilled appetizers',
        sortOrder: 1,
        isActive: true,
      });

      const catMains = await Category.create({
        restaurantId: restaurant._id,
        name: 'Main Course',
        description: 'Chef signature curries and rich gravies',
        sortOrder: 2,
        isActive: true,
      });

      const catBreads = await Category.create({
        restaurantId: restaurant._id,
        name: 'Breads & Rice',
        description: 'Clay-oven baked naans, rotis, and aromatic biryanis',
        sortOrder: 3,
        isActive: true,
      });

      const catDesserts = await Category.create({
        restaurantId: restaurant._id,
        name: 'Desserts',
        description: 'Sweet treats and authentic desserts',
        sortOrder: 4,
        isActive: true,
      });

      const catDrinks = await Category.create({
        restaurantId: restaurant._id,
        name: 'Beverages & Mocktails',
        description: 'Refreshing coolers, smoothies, and artisan shakes',
        sortOrder: 5,
        isActive: true,
      });

      // 2. Create Dishes
      const demoItems = [
        // Starters
        {
          restaurantId: restaurant._id,
          categoryId: catStarters._id,
          name: 'Crispy Paneer Tikka',
          description: 'Cottage cheese marinated in spiced yogurt and roasted in clay oven.',
          price: 28000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: true,
          isChefsSpecial: true,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catStarters._id,
          name: 'Classic Chicken Tikka',
          description: 'Juicy boneless chicken thighs grilled with smoky tandoori spices.',
          price: 34000,
          pricingType: 'SINGLE',
          isVegetarian: false,
          isSpicy: true,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 2,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catStarters._id,
          name: 'Truffle French Fries',
          description: 'Golden fries tossed in parmesan, truffle oil, and fresh herbs.',
          price: 19000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 3,
        },
        // Mains
        {
          restaurantId: restaurant._id,
          categoryId: catMains._id,
          name: 'Butter Chicken Grand Cru',
          description: 'Slow-cooked roasted chicken simmered in rich creamy tomato and butter gravy.',
          price: 42000,
          pricingType: 'SINGLE',
          isVegetarian: false,
          isSpicy: false,
          isChefsSpecial: true,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catMains._id,
          name: 'Paneer Butter Masala',
          description: 'Velvety cottage cheese cubes in aromatic cashew nut and tomato gravy.',
          price: 36000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 2,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catMains._id,
          name: 'Dal Makhani Heritage',
          description: 'Black lentils slow cooked overnight on charcoal with rich white butter.',
          price: 29000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: true,
          isAvailable: true,
          sortOrder: 3,
        },
        // Breads & Rice
        {
          restaurantId: restaurant._id,
          categoryId: catBreads._id,
          name: 'Garlic Butter Naan',
          description: 'Tandoor leavened flatbread brushed with garlic butter.',
          price: 8000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catBreads._id,
          name: 'Hyderabadi Dum Biryani',
          description: 'Fragrant basmati rice layered with spiced marinated chicken and saffron.',
          price: 38000,
          pricingType: 'SINGLE',
          isVegetarian: false,
          isSpicy: true,
          isChefsSpecial: true,
          isAvailable: true,
          sortOrder: 2,
        },
        // Desserts
        {
          restaurantId: restaurant._id,
          categoryId: catDesserts._id,
          name: 'Warm Chocolate Lava Cake',
          description: 'Gooey dark chocolate center served with vanilla bean gelato.',
          price: 24000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: true,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catDesserts._id,
          name: 'Gulab Jamun with Rabri',
          description: 'Soft saffron milk dumplings served on a bed of thick creamy rabri.',
          price: 18000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 2,
        },
        // Drinks
        {
          restaurantId: restaurant._id,
          categoryId: catDrinks._id,
          name: 'Virgin Mojito Cooler',
          description: 'Crushed fresh mint, lime juice, and sparkling soda over crushed ice.',
          price: 15000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          restaurantId: restaurant._id,
          categoryId: catDrinks._id,
          name: 'Cold Brew Iced Latte',
          description: 'Signature 18-hour steeped arabica coffee with creamy chilled milk.',
          price: 18000,
          pricingType: 'SINGLE',
          isVegetarian: true,
          isSpicy: false,
          isChefsSpecial: false,
          isAvailable: true,
          sortOrder: 2,
        },
      ];

      await MenuItem.insertMany(demoItems);

      const audit = await outletSetupAuditService.auditOutlet(id);
      sendSuccess(res, { categoriesCount: 5, itemsCount: demoItems.length, audit }, 'Starter demo menu seeded successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async applyTaxPreset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { preset } = req.body; // 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE'

      const restaurant = await Restaurant.findById(id);
      if (!restaurant) {
        sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      // Remove existing taxes
      await Tax.deleteMany({ restaurantId: restaurant._id });

      let createdTaxes: any[] = [];
      let defaultRate = 0;

      if (preset === 'GST_5') {
        defaultRate = 5;
        const group = await Tax.create({
          restaurantId: restaurant._id,
          type: 'GROUP',
          name: 'GST (5%)',
          percentage: 5,
          isActive: true,
        });

        const cgst = await Tax.create({
          restaurantId: restaurant._id,
          type: 'TAX',
          groupId: group._id,
          name: 'CGST',
          percentage: 2.5,
          isActive: true,
        });

        const sgst = await Tax.create({
          restaurantId: restaurant._id,
          type: 'TAX',
          groupId: group._id,
          name: 'SGST',
          percentage: 2.5,
          isActive: true,
        });

        createdTaxes = [group, cgst, sgst];
      } else if (preset === 'GST_18') {
        defaultRate = 18;
        const group = await Tax.create({
          restaurantId: restaurant._id,
          type: 'GROUP',
          name: 'GST (18%)',
          percentage: 18,
          isActive: true,
        });

        const cgst = await Tax.create({
          restaurantId: restaurant._id,
          type: 'TAX',
          groupId: group._id,
          name: 'CGST',
          percentage: 9,
          isActive: true,
        });

        const sgst = await Tax.create({
          restaurantId: restaurant._id,
          type: 'TAX',
          groupId: group._id,
          name: 'SGST',
          percentage: 9,
          isActive: true,
        });

        createdTaxes = [group, cgst, sgst];
      } else if (preset === 'VAT_10') {
        defaultRate = 10;
        const vat = await Tax.create({
          restaurantId: restaurant._id,
          type: 'TAX',
          name: 'VAT',
          percentage: 10,
          isActive: true,
        });
        createdTaxes = [vat];
      }

      // Update settings default tax rate
      await RestaurantSettings.findOneAndUpdate(
        { restaurantId: restaurant._id },
        { 'paymentConfig.taxRatePercent': defaultRate },
        { new: true, upsert: true }
      );

      const audit = await outletSetupAuditService.auditOutlet(id);
      sendSuccess(res, { preset, taxes: createdTaxes, defaultRate, audit }, 'Tax preset applied successfully');
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

      const settings = await RestaurantSettings.findOne({ restaurantId: id });

      const payload = {
        ...restaurant.toObject(),
        gstNumber: settings?.paymentConfig?.gstNumber || '',
        timings: settings?.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings?.branding?.googleReviewUrl || '',
        whatsapp: settings?.branding?.whatsapp || '',
      };

      sendSuccess(res, payload, 'Restaurant fetched successfully');
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

      // Sync settings if settings-related fields exist
      let settings = await RestaurantSettings.findOne({ restaurantId: id });
      if (!settings) {
        settings = new RestaurantSettings({ restaurantId: id });
      }

      if (updateData.gstNumber !== undefined) {
        if (!settings.paymentConfig) settings.paymentConfig = {} as any;
        settings.paymentConfig.gstNumber = updateData.gstNumber;
      }
      if (updateData.timings !== undefined) {
        settings.timings = updateData.timings;
      }
      if (updateData.googleReviewUrl !== undefined) {
        if (!settings.branding) settings.branding = {} as any;
        settings.branding.googleReviewUrl = updateData.googleReviewUrl;
      }
      if (updateData.whatsapp !== undefined) {
        if (!settings.branding) settings.branding = {} as any;
        settings.branding.whatsapp = updateData.whatsapp;
      }
      if (updateData.logoUrl !== undefined) {
        if (!settings.branding) settings.branding = {} as any;
        settings.branding.logoUrl = updateData.logoUrl;
      }
      if (updateData.coverImageUrl !== undefined) {
        if (!settings.branding) settings.branding = {} as any;
        settings.branding.coverImageUrl = updateData.coverImageUrl;
      }
      await settings.save();

      const payload = {
        ...restaurant.toObject(),
        gstNumber: settings?.paymentConfig?.gstNumber || '',
        timings: settings?.timings || { open: '09:00', close: '23:00' },
        googleReviewUrl: settings?.branding?.googleReviewUrl || '',
        whatsapp: settings?.branding?.whatsapp || '',
      };

      sendSuccess(res, payload, 'Restaurant updated successfully');
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
          const clientUrl = config.app.clientUrl;
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

  async getPlatformAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Total Platform GMV
      const revenueAggregate = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
      ]);
      const totalRevenue = revenueAggregate[0]?.totalRevenue || 0;

      // 30-Day Daily Revenue & Orders Trend
      const dailyTrendRaw = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $ne: 'CANCELLED' },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Top 5 Performing Restaurants
      const topRestaurantsRaw = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: '$restaurantId',
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'restaurants',
            localField: '_id',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        { $unwind: '$restaurant' },
        {
          $project: {
            _id: 1,
            name: '$restaurant.name',
            slug: '$restaurant.slug',
            code: '$restaurant.code',
            totalRevenue: 1,
            totalOrders: 1,
          },
        },
      ]);

      // Subscription Plan Distribution
      const planDistributionRaw = await Restaurant.aggregate([
        {
          $group: {
            _id: '$subscription.planKey',
            count: { $sum: 1 },
          },
        },
      ]);

      const planDistribution: Record<string, number> = {
        FREE: 0,
        STARTER: 0,
        PROFESSIONAL: 0,
        ENTERPRISE: 0,
      };
      for (const item of planDistributionRaw) {
        if (item._id) planDistribution[item._id] = item.count;
      }

      sendSuccess(
        res,
        {
          totalRevenue,
          dailyTrend: dailyTrendRaw,
          topRestaurants: topRestaurantsRaw,
          planDistribution,
        },
        'Platform analytics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  // 1. Get POS Outlets
  async getPOSOutlets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const settingsList = await RestaurantSettings.find().lean();
      const restaurants = await Restaurant.find({ status: { $ne: 'ARCHIVED' } }).lean();

      const outlets = restaurants.map((rest: any) => {
        const set = settingsList.find((s: any) => s.restaurantId?.toString() === rest._id.toString());
        return {
          restaurantId: rest._id,
          name: rest.name,
          slug: rest.slug,
          code: rest.code,
          petpoojaConfig: set?.petpoojaConfig || {
            enabled: false,
            outletId: '',
            apiKey: '',
            lastSyncAt: null,
          },
        };
      });

      sendSuccess(res, outlets, 'POS outlets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // 2. Get POS Sync Logs
  async getPOSSyncLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        IntegrationSyncLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        IntegrationSyncLog.countDocuments(),
      ]);

      sendSuccess(res, { logs, total, page, pages: Math.ceil(total / limit) }, 'POS sync logs retrieved');
    } catch (error) {
      next(error);
    }
  }

  // 3. Trigger POS Menu Sync
  async triggerPOSMenuSync(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const rest = await Restaurant.findById(restaurantId);
      if (!rest) {
        sendError(res, 'NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      await RestaurantSettings.findOneAndUpdate(
        { restaurantId },
        { 'petpoojaConfig.lastSyncAt': new Date() },
        { upsert: true }
      );

      await auditLogService.logEvent({
        action: 'POS_MENU_SYNC_TRIGGERED',
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        restaurantId: rest.id,
        restaurantName: rest.name,
        details: { provider: 'Petpooja' },
      });

      sendSuccess(res, { restaurantId, syncedAt: new Date() }, 'POS menu sync triggered successfully');
    } catch (error) {
      next(error);
    }
  }

  // 4. Update POS Config
  async updatePOSConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { enabled, outletId, apiKey } = req.body;

      const settings = await RestaurantSettings.findOneAndUpdate(
        { restaurantId },
        {
          'petpoojaConfig.enabled': enabled,
          'petpoojaConfig.outletId': outletId,
          'petpoojaConfig.apiKey': apiKey,
        },
        { new: true, upsert: true }
      );

      const rest = await Restaurant.findById(restaurantId);
      await auditLogService.logEvent({
        action: 'POS_CONFIG_UPDATED',
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        restaurantId: rest?.id,
        restaurantName: rest?.name,
        details: { enabled, outletId },
      });

      sendSuccess(res, settings.petpoojaConfig, 'POS configuration updated');
    } catch (error) {
      next(error);
    }
  }

  // 5. Get Payment Overview
  async getPaymentOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const paymentAggregation = await Order.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: '$paymentMethod',
            totalVolume: { $sum: '$total' },
            orderCount: { $sum: 1 },
          },
        },
      ]);

      const methodStats: Record<string, { totalVolume: number; orderCount: number }> = {
        CASH: { totalVolume: 0, orderCount: 0 },
        CARD: { totalVolume: 0, orderCount: 0 },
        UPI: { totalVolume: 0, orderCount: 0 },
        RAZORPAY: { totalVolume: 0, orderCount: 0 },
      };

      for (const item of paymentAggregation) {
        if (item._id) {
          methodStats[item._id] = {
            totalVolume: item.totalVolume,
            orderCount: item.orderCount,
          };
        }
      }

      sendSuccess(
        res,
        {
          methodStats,
          razorpayGatewayStatus: 'ACTIVE',
          platformFeePercentage: 0.0,
        },
        'Payment overview retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  // 6. Get Tenant Payment Configs
  async getTenantPaymentConfigs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurants = await Restaurant.find({ status: { $ne: 'ARCHIVED' } }).lean();
      const settingsList = await RestaurantSettings.find().lean();

      const configs = restaurants.map((rest: any) => {
        const set = settingsList.find((s: any) => s.restaurantId?.toString() === rest._id.toString());
        return {
          restaurantId: rest._id,
          name: rest.name,
          slug: rest.slug,
          paymentGateways: set?.paymentGateways || {
            cashEnabled: true,
            cardEnabled: true,
            upiEnabled: true,
            razorpayEnabled: true,
          },
        };
      });

      sendSuccess(res, configs, 'Tenant payment configs retrieved');
    } catch (error) {
      next(error);
    }
  }

  // 7. Update Tenant Payment Methods
  async updateTenantPaymentMethods(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { cashEnabled, cardEnabled, upiEnabled, razorpayEnabled } = req.body;

      const settings = await RestaurantSettings.findOneAndUpdate(
        { restaurantId },
        {
          'paymentGateways.cashEnabled': cashEnabled,
          'paymentGateways.cardEnabled': cardEnabled,
          'paymentGateways.upiEnabled': upiEnabled,
          'paymentGateways.razorpayEnabled': razorpayEnabled,
        },
        { new: true, upsert: true }
      );

      const rest = await Restaurant.findById(restaurantId);
      await auditLogService.logEvent({
        action: 'PAYMENT_CONFIG_UPDATED',
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorRole: req.user?.role,
        restaurantId: rest?.id,
        restaurantName: rest?.name,
        details: { cashEnabled, cardEnabled, upiEnabled, razorpayEnabled },
      });

      sendSuccess(res, settings.paymentGateways, 'Payment methods updated');
    } catch (error) {
      next(error);
    }
  }

  // 8. Get System Audit Logs
  async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const action = req.query.action as string;
      const severity = req.query.severity as string;
      const search = req.query.search as string;

      const result = await auditLogService.queryLogs({ page, limit, action, severity, search });
      sendSuccess(res, result, 'Audit logs retrieved');
    } catch (error) {
      next(error);
    }
  }

}
