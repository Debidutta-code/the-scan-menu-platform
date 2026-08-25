import { AddOn } from '../../services/restaurant.service';

// ==========================================
// NAVIGATION TYPES
// ==========================================

export type ActiveTab = 'landing' | 'menu' | 'waiter' | 'cart-orders';
export type CartOrdersSubTab = 'cart' | 'orders';
export type WaiterCallState = 'idle' | 'pulsing' | 'waiting' | 'acknowledged';
export type WaiterRequestType = 'CALL_WAITER' | 'REQUEST_BILL' | 'WATER' | 'TISSUE' | 'OTHER';

// ==========================================
// COMPONENT PROP TYPES
// ==========================================

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ItemDetailSheetProps {
  selectedItem: import('../../services/restaurant.service').MenuItem | null;
  currency: string;
  detailQuantity: number;
  detailSelectedAddOns: AddOn[];
  detailSpecialInstructions: string;
  selectedVariant?: import('../../services/restaurant.service').MenuItemVariant | null;
  onVariantChange?: (variant: import('../../services/restaurant.service').MenuItemVariant) => void;
  onClose: () => void;
  onAddToCart: () => void;
  onAddOnToggle: (addOn: AddOn) => void;
  onQuantityChange: (qty: number) => void;
  onInstructionsChange: (val: string) => void;
  featureFlags: { key: string; enabled: boolean }[];
}

export interface OtpModalProps {
  isOpen: boolean;
  isPlacingOrder: boolean;
  isVerifyingOtp: boolean;
  isSendingOtp: boolean;
  otpSent: boolean;
  customerName: string;
  phoneNumber: string;
  otpDigits: string[];
  otpCooldownRemaining: number;
  tableDisplayName: string;
  otpInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onSendOtp: () => void;
  onVerifyOtpAndPlaceOrder: () => void;
  onOtpDigitsChange: (digits: string[]) => void;
  onResetOtpSent: () => void;
}

export interface ViewBillSheetProps {
  isOpen: boolean;
  sessionDetailsData: any;
  currency: string;
  tableDisplayName: string;
  isTaxBreakdownExpanded: boolean;
  onToggleTaxBreakdown: () => void;
  onClose: () => void;
}

export interface BottomNavProps {
  activeTab: ActiveTab;
  cartItemsCount: number;
  waiterCallState: WaiterCallState;
  onTabChange: (tab: ActiveTab) => void;
  featureFlags: { key: string; enabled: boolean }[];
}

export interface FloatingCartBarProps {
  cartItems: import('../../store/useCartStore').CartItem[];
  currency: string;
  activeTab: ActiveTab;
  onViewCart: () => void;
}

export interface LandingTabProps {
  restaurant: any;
  table: any;
  currency: string;
  activeOrderCount: number;
  activeOrdersIds: string[];
  isCustomerAuthenticated: boolean;
  customer: any;
  restaurantSlug?: string;
  rawCategories: import('../../services/restaurant.service').PublicCategory[];
  onExploreMenu: () => void;
  onTrackOrders: (orderId: string) => void;
  onCategoryJump: (categoryId: string) => void;
}

export interface MenuTabProps {
  isMenuLoading: boolean;
  filteredCategories: import('../../services/restaurant.service').PublicCategory[];
  currency: string;
  searchQuery: string;
  debouncedSearchQuery: string;
  dietFilter: 'all' | 'veg' | 'nonveg';
  priceSort: 'default' | 'low-high' | 'high-low';
  activeCategoryId: string;
  activePillRef: React.RefObject<any>;
  categoryNavRef: React.RefObject<any>;
  activeOrderCount: number;
  activeOrdersIds: string[];
  cartItems: import('../../store/useCartStore').CartItem[];
  onSearchChange: (q: string) => void;
  onSearchClear: () => void;
  onDietFilterChange: (f: 'all' | 'veg' | 'nonveg') => void;
  onPriceSortChange: (s: 'default' | 'low-high' | 'high-low') => void;
  onCategoryClick: (id: string) => void;
  onItemCardClick: (item: import('../../services/restaurant.service').MenuItem) => void;
  onQuickAdd: (item: import('../../services/restaurant.service').MenuItem, e: React.MouseEvent) => void;
  onQuickIncrement: (item: import('../../services/restaurant.service').MenuItem, e: React.MouseEvent) => void;
  onQuickDecrement: (item: import('../../services/restaurant.service').MenuItem, e: React.MouseEvent) => void;
  onTrackOrders: (orderId: string) => void;
  getItemCartQuantity: (id: string) => number;
  getItemBadge: (item: import('../../services/restaurant.service').MenuItem, idx: number) => string | null;
  featureFlags: { key: string; enabled: boolean }[];
}

export interface WaiterTabProps {
  selectedRequestType: WaiterRequestType;
  waiterCallState: WaiterCallState;
  attendingStaffName?: string;
  cooldownRemaining: number;
  recentWaiterCalls: { type: string; timestamp: string }[];
  onSelectRequestType: (type: WaiterRequestType) => void;
  onTriggerWaiterCall: (type: WaiterRequestType) => void;
  onResetWaiterCallState: () => void;
}

export interface CartOrdersTabProps {
  cartOrdersSubTab: CartOrdersSubTab;
  cartItems: import('../../store/useCartStore').CartItem[];
  currency: string;
  activeOrderCount: number;
  activeSessionId: string | null;
  isSessionLoading: boolean;
  sessionDetailsData: any;
  isCustomerAuthenticated: boolean;
  customer: any;
  isPlacingOrder: boolean;
  isRecoveringOrder: boolean;
  failedOrderDetails: { menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }[];
  customerNote: string;
  useLoyaltyPoints?: boolean;
  onToggleLoyaltyPoints?: () => void;
  cartSubtotal: number;
  cartTaxBreakdown: any[];
  cartGrandTotal: number;
  expandedRounds: Record<string, boolean>;
  tableDisplayName: string;
  table: any;
  onSubTabChange: (sub: CartOrdersSubTab) => void;
  onUpdateQuantity: (
    itemId: string,
    selectedAddOns: import('../../services/restaurant.service').AddOn[],
    specialInstructions: string,
    delta: number,
    variantName?: string
  ) => void;
  onCustomerNoteChange: (note: string) => void;
  onCheckoutTrigger: () => void;
  onClearCart: () => void;
  onToggleRound: (roundId: string) => void;
  onViewBill: () => void;
  onClearSession: () => void;
  onBrowseMenu: () => void;
  onSwitchCustomer: () => void;
}
