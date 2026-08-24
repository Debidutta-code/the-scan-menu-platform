export type AdminTab =
  | 'checklist'
  | 'identity'
  | 'flags'
  | 'kitchen'
  | 'counter'
  | 'customer'
  | 'taxes'
  | 'payments'
  | 'billing'
  | 'tables'
  | 'menu'
  | 'hardware'
  | 'staff'
  | 'integrations';

export interface IdentityFormData {
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  gstNumber: string;
  openTime: string;
  closeTime: string;
  whatsapp: string;
  googleReviewUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  timezone: string;
}

export interface KitchenFormData {
  orderWorkflowMode: 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';
  autoAcceptEnabled: boolean;
  autoAcceptDelaySeconds: number;
  kdsSoundAlerts: boolean;
  prepWarningThresholdMinutes: number;
  autoKotPrintOnBump: boolean;
}

export interface CounterFormData {
  activeMode: 'PREPAID' | 'POSTPAID' | 'HYBRID';
  enableTableOrdering: boolean;
  enableTakeaway: boolean;
  enableDelivery: boolean;
  minOrderAmount: number;
  allowSpecialInstructions: boolean;
  quickCashButtons: boolean;
  autoPrintOnCheckout: boolean;
}

export interface CustomerFormData {
  displayItemImages: boolean;
  enableDarkMode: boolean;
  defaultLanguage: string;
  allowWaiterCall: boolean;
  allowBillRequest: boolean;
  showEstimatedPrepTime: boolean;
  liveDisplayAudioChime: boolean;
}

export interface BillingFormData {
  taxRatePercent: number;
  cash: boolean;
  card: boolean;
  upi: boolean;
  razorpay: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  upiId: string;
  upiMerchantName: string;
  gstNumber: string;
}

export interface HardwareFormData {
  paperWidth: '80mm' | '58mm' | 'A4';
  templateTheme: 'classic' | 'modern' | 'compact';
  showLogo: boolean;
  logoUrl: string;
  showGstNumber: boolean;
  gstNumber: string;
  showFssai: boolean;
  fssaiNumber: string;
  showPaymentQr: boolean;
  upiId: string;
  receiptHeader: string;
  receiptFooter: string;
  showCustomerInfo: boolean;
  showPaymentMode: boolean;
  showTaxBreakup: boolean;
  kotShowServerName: boolean;
  kotNotes: string;
  defaultPrintTarget: 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE';
}

export interface IntegrationFormData {
  provider: string;
  petpoojaRestId: string;
  petpoojaAppKey: string;
  petpoojaAppSecret: string;
  urbanpiperStoreId: string;
  urbanpiperApiKey: string;
}
