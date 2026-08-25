import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurantSettingsTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface IRestaurantSettingsBranding {
  logoUrl?: string;
  coverImageUrl?: string;
  googleReviewUrl?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  whatsapp?: string;
}

export interface IRestaurantSettingsWorkflow {
  orderWorkflowMode: 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';
  autoAcceptConfig: {
    enabled: boolean;
    delaySeconds: number;
  };
}

export interface IRestaurantSettingsPayment {
  activeProvider: 'CASH' | 'RAZORPAY' | 'STRIPE' | 'SQUARE';
  activeMode: 'PREPAID' | 'POSTPAID' | 'HYBRID';
  taxRatePercent: number;
  paymentMethods: {
    cash: boolean;
    card: boolean;
    upi: boolean;
    razorpay: boolean;
  };
  razorpayConfig?: {
    keyId?: string;
    keySecret?: string;
  };
  integrationConfig: {
    provider: string;
    config: Record<string, any>;
  };
  gstNumber?: string;
}

export interface IRestaurantSettingsNotification {
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

export interface IRestaurantSettingsOrderConfig {
  minOrderAmount: number;
  allowSpecialInstructions: boolean;
  enableTableOrdering: boolean;
  enableTakeaway: boolean;
  enableDelivery: boolean;
}

export interface IRestaurantSettingsUi {
  defaultLanguage: string;
  displayItemImages: boolean;
  enableDarkMode: boolean;
}

export interface IRestaurantSettingsInventory {
  enableLowStockAlerts: boolean;
  defaultLowStockThreshold: number;
  auto86OnZeroStock: boolean;
}

export interface IRestaurantSettingsPrinter {
  paperWidth: '80mm' | '58mm' | 'A4';
  templateTheme?: 'classic' | 'modern' | 'compact';
  showLogo?: boolean;
  logoUrl?: string;
  showGstNumber?: boolean;
  gstNumber?: string;
  showFssai?: boolean;
  fssaiNumber?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  showCustomerInfo?: boolean;
  showPaymentMode?: boolean;
  showTaxBreakup?: boolean;
  showPaymentQr?: boolean;
  upiId?: string;
  paymentQrUrl?: string;
  kotNotes?: string;
  kotShowServerName?: boolean;
  defaultPrintTarget: 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE';
  silentPrintingEnabled?: boolean;
  kitchenPrinterIp?: string;
  kitchenPrinterPort?: number;
  counterPrinterIp?: string;
  counterPrinterPort?: number;
}

export interface IRestaurantSettingsQrStyle {
  fgColor?: string;
  bgColor?: string;
  showLogo?: boolean;
  logoUrl?: string;
  cornerStyle?: 'square' | 'rounded' | 'dots';
  cardFrameText?: string;
  templateTheme?: 'minimal' | 'branded' | 'standee';
}

export interface IRestaurantSettingsLoyalty {
  enabled: boolean;
  earningMode: 'PERCENTAGE' | 'SPEND_RATIO' | 'FIXED_PER_ORDER';
  earnPercentage: number; // e.g. 50 = 50% of order total earned as points
  spendRatioPaise: number; // e.g. 1000 = 1 point per ₹10
  fixedPointsPerOrder: number; // e.g. 50 flat points
  validityDays: number; // e.g. 7 days validity (0 = no expiry)
  pointValuePaise: number; // e.g. 50 = ₹0.50 per point
  maxRedemptionPercentPerOrder: number; // e.g. 50 = max 50% of bill total
  minPointsToRedeem: number; // e.g. 50 minimum points threshold
}

export interface IRestaurantSettings extends Document {
  restaurantId: Types.ObjectId;
  currency: string;
  timezone: string;
  theme: IRestaurantSettingsTheme;
  branding: IRestaurantSettingsBranding;
  workflow: IRestaurantSettingsWorkflow;
  paymentConfig: IRestaurantSettingsPayment;
  notificationPreferences: IRestaurantSettingsNotification;
  orderConfig: IRestaurantSettingsOrderConfig;
  inventoryConfig: IRestaurantSettingsInventory;
  uiSettings: IRestaurantSettingsUi;
  printerConfig: IRestaurantSettingsPrinter;
  qrCodeStyle?: IRestaurantSettingsQrStyle;
  loyaltyConfig?: IRestaurantSettingsLoyalty;
  timings?: {
    open: string;
    close: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    currency: { type: String, required: true, default: 'INR' },
    timezone: { type: String, required: true, default: 'Asia/Kolkata' },
    theme: {
      primaryColor: { type: String, required: true, default: '#111827' },
      secondaryColor: { type: String, required: true, default: '#FFFFFF' },
      accentColor: { type: String, required: true, default: '#F59E0B' },
      fontFamily: { type: String, required: true, default: 'Plus Jakarta Sans' },
      logoUrl: { type: String },
      coverImageUrl: { type: String },
    },
    branding: {
      logoUrl: { type: String },
      coverImageUrl: { type: String },
      googleReviewUrl: { type: String },
      socialLinks: {
        facebook: { type: String },
        instagram: { type: String },
        twitter: { type: String },
      },
      whatsapp: { type: String },
    },
    workflow: {
      orderWorkflowMode: {
        type: String,
        enum: ['FIVE_STEP', 'FOUR_STEP', 'THREE_STEP'],
        default: 'FIVE_STEP',
      },
      autoAcceptConfig: {
        enabled: { type: Boolean, default: false },
        delaySeconds: { type: Number, default: 10 },
      },
    },
    paymentConfig: {
      activeProvider: {
        type: String,
        enum: ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'],
        default: 'CASH',
      },
      activeMode: {
        type: String,
        enum: ['PREPAID', 'POSTPAID', 'HYBRID'],
        default: 'POSTPAID',
      },
      taxRatePercent: { type: Number, default: 0 },
      paymentMethods: {
        cash: { type: Boolean, default: true },
        card: { type: Boolean, default: true },
        upi: { type: Boolean, default: true },
        razorpay: { type: Boolean, default: false },
      },
      razorpayConfig: {
        keyId: { type: String },
        keySecret: { type: String },
      },
      integrationConfig: {
        provider: { type: String, default: 'NONE' },
        config: { type: Schema.Types.Mixed, default: {} },
      },
      gstNumber: { type: String },
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      whatsappNotifications: { type: Boolean, default: false },
    },
    orderConfig: {
      minOrderAmount: { type: Number, default: 0 },
      allowSpecialInstructions: { type: Boolean, default: true },
      enableTableOrdering: { type: Boolean, default: true },
      enableTakeaway: { type: Boolean, default: true },
      enableDelivery: { type: Boolean, default: false },
    },
    inventoryConfig: {
      enableLowStockAlerts: { type: Boolean, default: true },
      defaultLowStockThreshold: { type: Number, default: 5 },
      auto86OnZeroStock: { type: Boolean, default: true },
    },
    uiSettings: {
      defaultLanguage: { type: String, default: 'en' },
      displayItemImages: { type: Boolean, default: true },
      enableDarkMode: { type: Boolean, default: false },
    },
    printerConfig: {
      paperWidth: { type: String, enum: ['80mm', '58mm', 'A4'], default: '80mm' },
      templateTheme: { type: String, enum: ['classic', 'modern', 'compact'], default: 'classic' },
      showLogo: { type: Boolean, default: true },
      logoUrl: { type: String, trim: true, default: '' },
      showGstNumber: { type: Boolean, default: true },
      gstNumber: { type: String, trim: true, default: '' },
      showFssai: { type: Boolean, default: true },
      fssaiNumber: { type: String, trim: true, default: '' },
      receiptHeader: { type: String, trim: true, default: '' },
      receiptFooter: { type: String, trim: true, default: '' },
      showCustomerInfo: { type: Boolean, default: true },
      showPaymentMode: { type: Boolean, default: true },
      showTaxBreakup: { type: Boolean, default: true },
      showPaymentQr: { type: Boolean, default: true },
      upiId: { type: String, trim: true, default: '' },
      paymentQrUrl: { type: String, trim: true, default: '' },
      kotNotes: { type: String, trim: true, default: '' },
      kotShowServerName: { type: Boolean, default: true },
      defaultPrintTarget: { type: String, enum: ['BOTH', 'KITCHEN', 'COUNTER', 'NONE'], default: 'BOTH' },
      silentPrintingEnabled: { type: Boolean, default: false },
      kitchenPrinterIp: { type: String, trim: true, default: '' },
      kitchenPrinterPort: { type: Number, default: 9100 },
      counterPrinterIp: { type: String, trim: true, default: '' },
      counterPrinterPort: { type: Number, default: 9100 },
    },
    qrCodeStyle: {
      fgColor: { type: String, default: '#0F172A' },
      bgColor: { type: String, default: '#FFFFFF' },
      showLogo: { type: Boolean, default: true },
      logoUrl: { type: String, trim: true, default: '' },
      cornerStyle: { type: String, enum: ['square', 'rounded', 'dots'], default: 'rounded' },
      cardFrameText: { type: String, default: 'Scan to View Menu & Order' },
      templateTheme: { type: String, enum: ['minimal', 'branded', 'standee'], default: 'branded' },
    },
    loyaltyConfig: {
      enabled: { type: Boolean, default: true },
      earningMode: { type: String, enum: ['PERCENTAGE', 'SPEND_RATIO', 'FIXED_PER_ORDER'], default: 'PERCENTAGE' },
      earnPercentage: { type: Number, default: 50 }, // 50% points on spend
      spendRatioPaise: { type: Number, default: 1000 }, // ₹10 = 1 pt
      fixedPointsPerOrder: { type: Number, default: 50 },
      validityDays: { type: Number, default: 7 }, // 7 Days validity
      pointValuePaise: { type: Number, default: 50 }, // 1 pt = ₹0.50
      maxRedemptionPercentPerOrder: { type: Number, default: 50 }, // Max 50% of bill
      minPointsToRedeem: { type: Number, default: 50 }, // Min 50 pts required
    },
    timings: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '23:00' },
    },
  },
  {
    timestamps: true,
    collection: 'restaurant_settings',
  }
);


export const RestaurantSettings = (mongoose.models.RestaurantSettings as any) || model<IRestaurantSettings>('RestaurantSettings', restaurantSettingsSchema);
export default RestaurantSettings;
