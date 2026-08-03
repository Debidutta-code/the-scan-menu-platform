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

export interface IRestaurantSettingsWhiteLabel {
  enabled: boolean;
  customDomain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  hidePoweredBy?: boolean;
  customCss?: string;
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
  whiteLabelConfig?: IRestaurantSettingsWhiteLabel;
  uiSettings: IRestaurantSettingsUi;
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
      logoUrl: { type: String, trim: true },
      coverImageUrl: { type: String, trim: true },
      googleReviewUrl: { type: String, trim: true },
      socialLinks: {
        facebook: { type: String, trim: true, default: '' },
        instagram: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' },
      },
      whatsapp: { type: String, trim: true, default: '' },
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
      activeProvider: { type: String, enum: ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'], default: 'CASH' },
      activeMode: { type: String, enum: ['PREPAID', 'POSTPAID', 'HYBRID'], default: 'POSTPAID' },
      taxRatePercent: { type: Number, required: true, default: 0 },
      paymentMethods: {
        cash: { type: Boolean, default: true },
        card: { type: Boolean, default: true },
        upi: { type: Boolean, default: true },
        razorpay: { type: Boolean, default: false },
      },
      razorpayConfig: {
        keyId: { type: String, trim: true, default: '' },
        keySecret: { type: String, trim: true, default: '' },
      },
      integrationConfig: {
        provider: { type: String, required: true, default: 'NONE' },
        config: { type: Schema.Types.Mixed, required: true, default: {} },
      },
      gstNumber: { type: String, trim: true },
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
    whiteLabelConfig: {
      enabled: { type: Boolean, default: false },
      customDomain: { type: String, trim: true, lowercase: true },
      logoUrl: { type: String, trim: true },
      faviconUrl: { type: String, trim: true },
      primaryColor: { type: String, trim: true },
      secondaryColor: { type: String, trim: true },
      backgroundColor: { type: String, trim: true },
      textColor: { type: String, trim: true },
      fontFamily: { type: String, trim: true },
      hidePoweredBy: { type: Boolean, default: false },
      customCss: { type: String, trim: true },
    },
    uiSettings: {
      defaultLanguage: { type: String, default: 'en' },
      displayItemImages: { type: Boolean, default: true },
      enableDarkMode: { type: Boolean, default: false },
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

restaurantSettingsSchema.index({ 'whiteLabelConfig.customDomain': 1 }, { sparse: true });

export const RestaurantSettings = (mongoose.models.RestaurantSettings as any) || model<IRestaurantSettings>('RestaurantSettings', restaurantSettingsSchema);
export default RestaurantSettings;
