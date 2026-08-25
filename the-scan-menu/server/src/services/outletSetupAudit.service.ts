import mongoose, { Types } from 'mongoose';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Table } from '../models/Table';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Tax } from '../models/Tax';
import { FeatureFlag } from '../models/FeatureFlag';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { DEFAULT_FLAGS } from './featureFlag.service';
import { loyaltyService } from './loyalty.service';

export interface SetupStep {
  id: string;
  category: 'CORE' | 'DINING' | 'CATALOG' | 'BILLING' | 'HARDWARE' | 'FEATURE_REQUIREMENT';
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  weight: number;
  actionTab?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface MissingFeatureSetup {
  featureKey: string;
  featureName: string;
  missingRequirements: string[];
  actionTab: string;
  actionLabel: string;
}

export interface OutletSetupAuditResult {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  overallPercentage: number;
  isReadyForService: boolean;
  totalSteps: number;
  completedSteps: number;
  steps: SetupStep[];
  missingFeatureSetups: MissingFeatureSetup[];
  featureReadiness: Record<string, { isEnabled: boolean; isReady: boolean; reason?: string }>;
  summary: {
    tablesCount: number;
    categoriesCount: number;
    menuItemsCount: number;
    taxesConfigured: boolean;
    paymentsConfigured: boolean;
    printerConfigured: boolean;
    brandingConfigured: boolean;
    managerActive: boolean;
  };
}

export class OutletSetupAuditService {
  async auditOutlet(restaurantId: string | Types.ObjectId): Promise<OutletSetupAuditResult> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;

    const [restaurant, settings, tables, categories, menuItems, taxes, flags, staffJoins] = await Promise.all([
      Restaurant.findById(rId),
      RestaurantSettings.findOne({ restaurantId: rId }),
      Table.find({ restaurantId: rId, isArchived: { $ne: true } }),
      Category.find({ restaurantId: rId, isActive: { $ne: false } }),
      MenuItem.find({ restaurantId: rId, isAvailable: { $ne: false } }),
      Tax.find({ restaurantId: rId, isActive: true }),
      FeatureFlag.find({ restaurantId: rId }),
      RestaurantStaff.find({ restaurantId: rId, isActive: true }),
    ]);

    if (!restaurant) {
      throw new Error(`Restaurant not found for ID: ${rId}`);
    }

    const enabledFlagsMap: Record<string, boolean> = {};
    flags.forEach((f) => {
      enabledFlagsMap[f.key] = f.enabled;
    });

    // Fallback if flags not yet seeded
    if (flags.length === 0) {
      DEFAULT_FLAGS.forEach((df) => {
        enabledFlagsMap[df.key] = true;
      });
    }

    // --- Entity State Checks ---
    const hasCoreInfo = Boolean(
      restaurant.name &&
      (restaurant.phone || restaurant.email) &&
      restaurant.address
    );

    const hasBranding = Boolean(
      restaurant.logoUrl || settings?.branding?.logoUrl ||
      restaurant.coverImageUrl || settings?.branding?.coverImageUrl
    );

    const hasTables = tables.length > 0;
    const activeTablesCount = tables.filter((t) => t.isActive).length;

    const hasCategories = categories.length > 0;
    const hasMenuItems = menuItems.length > 0;

    const hasTaxes = taxes.length > 0 || (settings?.paymentConfig?.taxRatePercent !== undefined && settings.paymentConfig.taxRatePercent >= 0);

    const paymentMethods = settings?.paymentConfig?.paymentMethods || { cash: true, card: true, upi: true, razorpay: false };
    const hasActivePaymentMethod = Boolean(paymentMethods.cash || paymentMethods.card || paymentMethods.upi || paymentMethods.razorpay);
    const hasRazorpayKeys = Boolean(settings?.paymentConfig?.razorpayConfig?.keyId);

    const hasPrinterConfig = Boolean(settings?.printerConfig?.paperWidth);
    const hasTimings = Boolean(settings?.timings?.open && settings?.timings?.close);

    const hasManager = staffJoins.some((s) => s.role === 'MANAGER');

    // --- Build Audit Steps ---
    const steps: SetupStep[] = [
      {
        id: 'core_identity',
        category: 'CORE',
        title: 'Store Identity & Contact Details',
        description: 'Restaurant legal name, address, contact phone, and operating hours.',
        isCompleted: hasCoreInfo && hasTimings,
        isRequired: true,
        weight: 15,
        actionTab: 'identity',
        actionLabel: 'Edit Store Profile',
      },
      {
        id: 'manager_account',
        category: 'CORE',
        title: 'Manager Account & Access',
        description: 'Assigned active manager with login credentials.',
        isCompleted: hasManager,
        isRequired: true,
        weight: 10,
        actionTab: 'staff',
        actionLabel: 'Manage Staff',
      },
      {
        id: 'branding_assets',
        category: 'CORE',
        title: 'Branding & Visuals',
        description: 'Restaurant logo, banner cover image, and theme accent colors.',
        isCompleted: hasBranding,
        isRequired: false,
        weight: 5,
        actionTab: 'identity',
        actionLabel: 'Upload Branding',
      },
      {
        id: 'dining_tables',
        category: 'DINING',
        title: 'Dining Tables & QR Codes',
        description: 'Physical table layouts with generated secure QR dining tokens.',
        isCompleted: hasTables && activeTablesCount > 0,
        isRequired: true,
        weight: 20,
        actionTab: 'tables',
        actionLabel: 'Configure Tables',
        metadata: { tablesCount: tables.length, activeTablesCount },
      },
      {
        id: 'menu_catalog',
        category: 'CATALOG',
        title: 'Menu Categories & Items',
        description: 'Food & beverage categories with dishes, pricing, portions, and tags.',
        isCompleted: hasCategories && hasMenuItems,
        isRequired: true,
        weight: 25,
        actionTab: 'menu',
        actionLabel: 'Manage Menu Catalog',
        metadata: { categoriesCount: categories.length, menuItemsCount: menuItems.length },
      },
      {
        id: 'billing_taxes',
        category: 'BILLING',
        title: 'Taxes & Payment Modes',
        description: 'GST / VAT rates, billing breakdown rules, and active settlement methods.',
        isCompleted: hasTaxes && hasActivePaymentMethod,
        isRequired: true,
        weight: 15,
        actionTab: 'billing',
        actionLabel: 'Configure Taxes & Billing',
      },
      {
        id: 'hardware_printers',
        category: 'HARDWARE',
        title: 'Receipt & POS Printer Setup',
        description: 'Thermal receipt paper width (80mm/58mm), header/footer, and print routing.',
        isCompleted: hasPrinterConfig,
        isRequired: false,
        weight: 10,
        actionTab: 'hardware',
        actionLabel: 'Configure Hardware',
      },
    ];

    // --- Dynamic Missing Requirements for Enabled Feature Flags ---
    const missingFeatureSetups: MissingFeatureSetup[] = [];
    const featureReadiness: Record<string, { isEnabled: boolean; isReady: boolean; reason?: string }> = {};

    // 1. Digital Menu
    if (enabledFlagsMap['qr_menu']) {
      const missing: string[] = [];
      if (!hasCategories) missing.push('At least 1 menu category is required');
      if (!hasMenuItems) missing.push('At least 1 menu item is required');
      if (!hasTables) missing.push('At least 1 dining table with QR is required');

      const isReady = missing.length === 0;
      featureReadiness['qr_menu'] = { isEnabled: true, isReady, reason: isReady ? undefined : missing.join(', ') };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'qr_menu',
          featureName: 'Digital QR Menu',
          missingRequirements: missing,
          actionTab: !hasCategories || !hasMenuItems ? 'menu' : 'tables',
          actionLabel: !hasCategories || !hasMenuItems ? 'Add Menu Items' : 'Generate Tables',
        });
      }
    } else {
      featureReadiness['qr_menu'] = { isEnabled: false, isReady: true };
    }

    // 2. Table Ordering
    if (enabledFlagsMap['ordering']) {
      const missing: string[] = [];
      if (!hasTables || activeTablesCount === 0) missing.push('Active dining tables are required for table ordering');
      if (!hasMenuItems) missing.push('Available menu items required for guest orders');
      if (!hasTaxes) missing.push('Tax rate configuration recommended for dine-in invoices');

      const isReady = missing.length === 0;
      featureReadiness['ordering'] = { isEnabled: true, isReady, reason: isReady ? undefined : missing.join(', ') };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'ordering',
          featureName: 'Table Ordering',
          missingRequirements: missing,
          actionTab: !hasTables ? 'tables' : !hasMenuItems ? 'menu' : 'billing',
          actionLabel: 'Complete Ordering Setup',
        });
      }
    } else {
      featureReadiness['ordering'] = { isEnabled: false, isReady: true };
    }

    // 3. Digital Payments
    if (enabledFlagsMap['payments']) {
      const missing: string[] = [];
      if (paymentMethods.razorpay && !hasRazorpayKeys) {
        missing.push('Razorpay Key ID is required when Razorpay is enabled');
      }
      if (!hasActivePaymentMethod) {
        missing.push('At least one payment method (Cash/Card/UPI/Razorpay) must be enabled');
      }

      const isReady = missing.length === 0;
      featureReadiness['payments'] = { isEnabled: true, isReady, reason: isReady ? undefined : missing.join(', ') };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'payments',
          featureName: 'Digital Payments',
          missingRequirements: missing,
          actionTab: 'billing',
          actionLabel: 'Configure Gateway Keys',
        });
      }
    } else {
      featureReadiness['payments'] = { isEnabled: false, isReady: true };
    }

    // 4. Counter POS Workstation
    if (enabledFlagsMap['pos']) {
      const missing: string[] = [];
      if (!hasMenuItems) missing.push('Menu items are required for POS counter billing');

      const isReady = missing.length === 0;
      featureReadiness['pos'] = { isEnabled: true, isReady, reason: isReady ? undefined : missing.join(', ') };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'pos',
          featureName: 'Counter POS Workstation',
          missingRequirements: missing,
          actionTab: 'menu',
          actionLabel: 'Add Items for POS',
        });
      }
    } else {
      featureReadiness['pos'] = { isEnabled: false, isReady: true };
    }

    // 5. Kitchen Display System (KDS)
    if (enabledFlagsMap['kds']) {
      const isReady = hasMenuItems;
      featureReadiness['kds'] = {
        isEnabled: true,
        isReady,
        reason: isReady ? undefined : 'Menu catalog required for kitchen ticket routing',
      };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'kds',
          featureName: 'Kitchen Display System (KDS)',
          missingRequirements: ['Menu items required for kitchen routing'],
          actionTab: 'menu',
          actionLabel: 'Setup Menu for KDS',
        });
      }
    } else {
      featureReadiness['kds'] = { isEnabled: false, isReady: true };
    }

    // 6. External POS Integration
    if (enabledFlagsMap['pos_integration']) {
      const integrationConfig = settings?.paymentConfig?.integrationConfig;
      const isConfigured = integrationConfig && integrationConfig.provider && integrationConfig.provider !== 'NONE';
      const isReady = Boolean(isConfigured);

      featureReadiness['pos_integration'] = {
        isEnabled: true,
        isReady,
        reason: isReady ? undefined : 'External POS Provider (Petpooja/UrbanPiper) mapping required',
      };

      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'pos_integration',
          featureName: 'External POS Integration',
          missingRequirements: ['POS Provider & Store Mapping Key required'],
          actionTab: 'integrations',
          actionLabel: 'Connect External POS',
        });
      }
    } else {
      featureReadiness['pos_integration'] = { isEnabled: false, isReady: true };
    }

    // 7. Inventory
    if (enabledFlagsMap['inventory']) {
      const isReady = menuItems.length > 0;
      featureReadiness['inventory'] = {
        isEnabled: true,
        isReady,
        reason: isReady ? undefined : 'Menu items required to track ingredient / dish stock',
      };
      if (!isReady) {
        missingFeatureSetups.push({
          featureKey: 'inventory',
          featureName: 'Inventory & Stock Control',
          missingRequirements: ['Menu items required to enable stock tracking'],
          actionTab: 'menu',
          actionLabel: 'Add Stock Trackable Items',
        });
      }
    } else {
      featureReadiness['inventory'] = { isEnabled: false, isReady: true };
    }

    // 8. Loyalty Program (Only audited if in OUTLET_WISE mode and tenant has loyalty feature enabled)
    try {
      const platform = await loyaltyService.getPlatformSettings();
      const isOutletWise = platform.loyalty && platform.loyalty.mode === 'OUTLET_WISE';

      if (enabledFlagsMap['loyalty'] && isOutletWise) {
        const isReady = Boolean(settings?.loyaltyConfig?.enabled);
        featureReadiness['loyalty'] = {
          isEnabled: true,
          isReady,
          reason: isReady ? undefined : 'Outlet Loyalty configuration is required in Outlet-Wise mode',
        };
        if (!isReady) {
          missingFeatureSetups.push({
            featureKey: 'loyalty',
            featureName: 'Loyalty Program',
            missingRequirements: ['Outlet loyalty rules configuration required'],
            actionTab: 'loyalty',
            actionLabel: 'Configure Outlet Loyalty',
          });
        }
      } else {
        featureReadiness['loyalty'] = { isEnabled: false, isReady: true };
      }
    } catch {
      featureReadiness['loyalty'] = { isEnabled: false, isReady: true };
    }

    // --- Calculate Overall Weighted Percentage ---
    let totalWeight = 0;
    let completedWeight = 0;

    steps.forEach((s) => {
      totalWeight += s.weight;
      if (s.isCompleted) {
        completedWeight += s.weight;
      }
    });

    const overallPercentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    const completedStepsCount = steps.filter((s) => s.isCompleted).length;

    const isReadyForService =
      hasCoreInfo &&
      hasTables &&
      hasCategories &&
      hasMenuItems &&
      hasManager &&
      missingFeatureSetups.length === 0;

    return {
      restaurantId: restaurant._id.toString(),
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      overallPercentage,
      isReadyForService,
      totalSteps: steps.length,
      completedSteps: completedStepsCount,
      steps,
      missingFeatureSetups,
      featureReadiness,
      summary: {
        tablesCount: tables.length,
        categoriesCount: categories.length,
        menuItemsCount: menuItems.length,
        taxesConfigured: hasTaxes,
        paymentsConfigured: hasActivePaymentMethod,
        printerConfigured: hasPrinterConfig,
        brandingConfigured: hasBranding,
        managerActive: hasManager,
      },
    };
  }
}

export const outletSetupAuditService = new OutletSetupAuditService();
export default outletSetupAuditService;
