import mongoose, { ClientSession, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { userRepository } from '../repositories/user.repository';
import { restaurantStaffRepository } from '../repositories/restaurantStaff.repository';
import { restaurantSettingsRepository } from '../repositories/restaurantSettings.repository';
import { restaurantStatsRepository } from '../repositories/restaurantStats.repository';
import { restaurantOnboardingRepository } from '../repositories/restaurantOnboarding.repository';
import { tableRepository } from '../repositories/table.repository';
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
  planKey?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
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
    planKey?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
    gstNumber?: string;
    whatsapp?: string;
    googleReviewUrl?: string;
    openTime?: string;
    closeTime?: string;
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
    gstNumber?: string;
    whatsapp?: string;
    googleReviewUrl?: string;
    timings?: { open: string; close: string };
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
    const existingUser = await userRepository.findByEmail(m.email.toLowerCase().trim());
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
      const existingSlug = await restaurantRepository.findBySlug(finalSlug);
      if (existingSlug) {
        if (!input.restaurant.slug) {
          finalSlug = `${rawSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          throw new Error('SLUG_CONFLICT: The provided slug is already in use.');
        }
      }

      const assignedPlanKey = input.restaurant.planKey || input.planKey || 'ENTERPRISE';

      // 3. Create Restaurant document
      const restaurant = await restaurantRepository.create(
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
            planKey: assignedPlanKey,
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        session
      );

      // 4. Create or assign Manager User & RestaurantStaff
      const normalizedEmail = input.manager.email.toLowerCase().trim();
      let user = await userRepository.findByEmail(normalizedEmail, session);

      if (!user) {
        const passwordHash = await bcrypt.hash(input.manager.password, 10);
        user = await userRepository.create(
          {
            email: normalizedEmail,
            passwordHash,
            name: input.manager.name,
            role: 'MANAGER',
            isActive: true,
          },
          session
        );
      }

      await restaurantStaffRepository.create(
        {
          userId: user._id,
          restaurantId: restaurant._id,
          role: 'MANAGER',
          isActive: true,
        },
        session
      );

      // 5. Create RestaurantSettings
      const settings = await restaurantSettingsRepository.create(
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
            googleReviewUrl: input.restaurant.googleReviewUrl || input.settings?.googleReviewUrl || '',
            whatsapp: input.restaurant.whatsapp || input.settings?.whatsapp || '',
          },
          timings: input.settings?.timings || {
            open: input.restaurant.openTime || '09:00',
            close: input.restaurant.closeTime || '23:00',
          },
          paymentConfig: {
            activeProvider: 'CASH',
            activeMode: 'PREPAID',
            taxRatePercent: input.settings?.taxRatePercent || 0,
            paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
            integrationConfig: { provider: 'NONE', config: {} },
            gstNumber: input.restaurant.gstNumber || input.settings?.gstNumber || '',
          },
        },
        session
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
          status: 'AVAILABLE' as any,
          isArchived: false,
        });
      }
      const tables = await tableRepository.insertMany(tableDocs, session);

      // 7. Create RestaurantStats
      const stats = await restaurantStatsRepository.create(
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
        session
      );

      // 8. Create RestaurantOnboarding
      const onboarding = await restaurantOnboardingRepository.create(
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
        session
      );

      // 9. Assign selected subscription and sync Feature Flags
      await subscriptionService.assignPlanToRestaurant(restaurant._id, assignedPlanKey, session);

      // Audit logs
      logger.info(`[AUDIT] Restaurant Created: ${restaurant.name} (${restaurant.code})`);
      logger.info(`[AUDIT] Manager Created: ${user.email} for ${restaurant.code}`);
      logger.info(`[AUDIT] Subscription Assigned: ${assignedPlanKey} to ${restaurant.code}`);

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
    let onboarding = await restaurantOnboardingRepository.findByRestaurantId(restaurantId);
    if (!onboarding) {
      onboarding = await restaurantOnboardingRepository.create({
        restaurantId: new Types.ObjectId(restaurantId.toString()),
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
