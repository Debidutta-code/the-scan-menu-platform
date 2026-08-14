import mongoose, { ClientSession } from 'mongoose';
import bcrypt from 'bcrypt';
import { Restaurant } from '../models/Restaurant';
import { User } from '../models/User';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { RestaurantStats } from '../models/RestaurantStats';
import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { Table } from '../models/Table';
import { counterService } from './counter.service';
import { subscriptionService } from './subscription.service';
import TableService from './table.service';
import { logger } from '../utils/logger';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export interface ProvisionRestaurantInput {
  restaurant: {
    name: string;
    slug?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    currency?: string;
    timezone?: string;
  };
  manager: {
    name: string;
    email: string;
    password: string;
  };
  settings?: {
    theme?: any;
    branding?: any;
    taxRatePercent?: number;
  };
}

export class RestaurantProvisioningService {
  private tableService = new TableService();

  async provisionRestaurant(input: ProvisionRestaurantInput) {
    // --- Pre-transaction validation ---
    const { restaurant: r, manager: m } = input;

    // Missing manager information
    if (!m?.name?.trim() || !m?.email?.trim() || !m?.password?.trim()) {
      throw new Error('VALIDATION: Manager name, email, and password are required.');
    }

    // Validate timezone using Intl.DateTimeFormat (works across all Node.js ICU builds)
    if (r.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: r.timezone });
      } catch {
        throw new Error(`VALIDATION: Invalid timezone "${r.timezone}".`);
      }
    }

    // Validate currency (ISO 4217: 3 uppercase letters)
    if (r.currency && !/^[A-Z]{3}$/.test(r.currency)) {
      throw new Error(`VALIDATION: Invalid currency code "${r.currency}". Expected ISO 4217 (e.g. INR, USD).`);
    }

    // Duplicate manager email (pre-check; final check is inside transaction)
    const existingUser = await User.findOne({ email: m.email.toLowerCase().trim() });
    if (existingUser) {
      throw new Error(`DUPLICATE_EMAIL: Manager email "${m.email}" is already registered.`);
    }

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Generate sequential restaurant code atomically
      const code = await counterService.getNextSequence('restaurant_code', 'RST-', 6, session);

      // 2. Resolve & verify unique slug
      const rawSlug = input.restaurant.slug ? slugify(input.restaurant.slug) : slugify(input.restaurant.name);
      let finalSlug = rawSlug;
      const existingSlug = await Restaurant.findOne({ slug: finalSlug }).session(session);
      if (existingSlug) {
        if (!input.restaurant.slug) {
          finalSlug = `${rawSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          throw new Error('SLUG_CONFLICT: The provided slug is already in use.');
        }
      }

      // 3. Create Restaurant document
      const [restaurant] = await Restaurant.create(
        [
          {
            code,
            name: input.restaurant.name,
            slug: finalSlug,
            status: 'TRIAL',
            logoUrl: input.restaurant.logoUrl,
            coverImageUrl: input.restaurant.coverImageUrl,
            description: input.restaurant.description,
            phone: input.restaurant.phone,
            email: input.restaurant.email,
            address: input.restaurant.address,
            subscription: {
              status: 'TRIAL',
              planKey: 'FREE',
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
          },
        ],
        { session }
      );

      // 4. Create or assign Manager User & RestaurantStaff
      const normalizedEmail = input.manager.email.toLowerCase().trim();
      let user = await User.findOne({ email: normalizedEmail }).session(session);

      if (!user) {
        const passwordHash = await bcrypt.hash(input.manager.password, 10);
        const [newUser] = await User.create(
          [
            {
              email: normalizedEmail,
              passwordHash,
              name: input.manager.name,
              role: 'MANAGER',
              isActive: true,
            },
          ],
          { session }
        );
        user = newUser;
      }

      await RestaurantStaff.create(
        [
          {
            userId: user._id,
            restaurantId: restaurant._id,
            role: 'MANAGER',
            isActive: true,
          },
        ],
        { session }
      );

      // 5. Create RestaurantSettings
      const [settings] = await RestaurantSettings.create(
        [
          {
            restaurantId: restaurant._id,
            currency: input.restaurant.currency || 'INR',
            timezone: input.restaurant.timezone || 'Asia/Kolkata',
            theme: input.settings?.theme || {
              primaryColor: '#111827',
              secondaryColor: '#FFFFFF',
              accentColor: '#F59E0B',
              fontFamily: 'Plus Jakarta Sans',
            },
            branding: input.settings?.branding || {
              logoUrl: input.restaurant.logoUrl || '',
              coverImageUrl: input.restaurant.coverImageUrl || '',
            },
            paymentConfig: {
              taxRatePercent: input.settings?.taxRatePercent || 0,
              paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
              integrationConfig: { provider: 'NONE', config: {} },
            },
          },
        ],
        { session }
      );

      // 6. Create Tables T1–T10 and generate QR Tokens
      const tableDocs = [];
      for (let i = 1; i <= 10; i++) {
        const token = this.tableService.generateSecureToken(24);
        tableDocs.push({
          restaurantId: restaurant._id,
          tableNumber: `${i}`,
          displayName: `Table ${i}`,
          token,
          isActive: true,
          qrCodeUrl: `/p/${restaurant.slug}/table/${token}`,
          status: 'AVAILABLE',
          isArchived: false,
        });
      }
      const tables = await Table.insertMany(tableDocs, { session });

      // 7. Create RestaurantStats
      const [stats] = await RestaurantStats.create(
        [
          {
            restaurantId: restaurant._id,
            menuItemsCount: 0,
            tablesCount: tables.length,
            staffCount: 1,
            ordersCount: 0,
            activeOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            revenue: 0,
            todayRevenue: 0,
            todayOrders: 0,
          },
        ],
        { session }
      );

      // 8. Create RestaurantOnboarding
      const [onboarding] = await RestaurantOnboarding.create(
        [
          {
            restaurantId: restaurant._id,
            restaurantCreated: true,
            managerCreated: true,
            tablesCreated: true,
            menuImported: false,
            paymentsConfigured: false,
            subscriptionAssigned: true,
            completed: false,
          },
        ],
        { session }
      );

      // 9. Assign FREE subscription and sync Feature Flags
      await subscriptionService.assignPlanToRestaurant(restaurant._id, 'FREE', session);

      // Audit logs
      logger.info(`[AUDIT] Restaurant Created: ${restaurant.name} (${restaurant.code})`);
      logger.info(`[AUDIT] Manager Created: ${user.email} for ${restaurant.code}`);
      logger.info(`[AUDIT] Subscription Assigned: FREE to ${restaurant.code}`);

      // 10. Commit Transaction
      await session.commitTransaction();
      session.endSession();

      return {
        restaurant,
        manager: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        credentials: {
          email: user.email,
          temporaryPassword: input.manager.password,
        },
        summary: {
          restaurantCode: restaurant.code,
          managerEmail: user.email,
          tablesProvisioned: tables.length,
          planAssigned: 'FREE',
        },
        settings,
        stats,
        onboarding,
        tablesCount: tables.length,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async getOnboardingProgress(restaurantId: string | mongoose.Types.ObjectId) {
    let onboarding = await RestaurantOnboarding.findOne({ restaurantId });
    if (!onboarding) {
      onboarding = await RestaurantOnboarding.create({
        restaurantId,
        restaurantCreated: true,
        managerCreated: true,
        tablesCreated: true,
        menuImported: false,
        paymentsConfigured: false,
        subscriptionAssigned: true,
        completed: false,
      });
    }
    return onboarding;
  }
}

export const restaurantProvisioningService = new RestaurantProvisioningService();
export default restaurantProvisioningService;
