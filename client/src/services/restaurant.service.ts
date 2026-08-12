import apiClient from '../lib/api';

export interface RestaurantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  googleReviewUrl?: string;
  currency: string;
  timezone: string;
  theme: RestaurantTheme;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableZone {
  _id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
}

export interface Tax {
  _id: string;
  restaurantId: string;
  type: 'GROUP' | 'TAX';
  groupId?: string | Tax;
  name: string;
  percentage: number;
  isActive: boolean;
}

export interface OrderTaxBreakdown {
  name: string;
  percentage: number;
  amount: number;
  subTaxes?: {
    name: string;
    percentage: number;
    amount: number;
  }[];
}

export interface Table {
  _id: string;
  restaurantId: string;
  zoneId?: TableZone | string;
  tableNumber: string;
  displayName: string;
  token: string;
  isActive: boolean;
  qrCodeUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddOn {
  name: string;
  priceDelta: number;
}

export interface Staff {
  _id: string;
  email: string;
  name: string;
  role: 'MANAGER' | 'STAFF';
  pin?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number; // in cents/paise
  imageUrl?: string;
  isAvailable: boolean;
  trackStock?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  prepTimeMinutes?: number;
  sortOrder: number;
  addOns?: AddOn[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicCategory {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  menuItems: MenuItem[];
}

export interface PublicResolutionResponse {
  restaurant: Restaurant;
  table: Table;
}

export const adminService = {
  async getPlatformStats() {
    const res = await apiClient.get('/admin/stats');
    return res.data;
  },

  async getPlatformAnalytics() {
    const res = await apiClient.get('/admin/analytics');
    return res.data;
  },

  async listRestaurants(page = 1, limit = 100) {
    const res = await apiClient.get(`/admin/restaurants?page=${page}&limit=${limit}`);
    return res.data;
  },

  async getRestaurant(id: string) {
    const res = await apiClient.get(`/admin/restaurants/${id}`);
    return res.data;
  },

  async createRestaurant(data: Partial<Restaurant>) {
    const res = await apiClient.post('/admin/restaurants', data);
    return res.data;
  },

  async provisionRestaurant(data: any) {
    const res = await apiClient.post('/admin/restaurants/provision', data);
    return res.data;
  },

  async getOnboardingProgress(id: string) {
    const res = await apiClient.get(`/admin/restaurants/${id}/onboarding`);
    return res.data;
  },

  async editRestaurant(id: string, data: Partial<Restaurant>) {
    const res = await apiClient.patch(`/admin/restaurants/${id}`, data);
    return res.data;
  },

  async suspendRestaurant(id: string) {
    const res = await apiClient.patch(`/admin/restaurants/${id}/suspend`);
    return res.data;
  },

  async activateRestaurant(id: string) {
    const res = await apiClient.patch(`/admin/restaurants/${id}/activate`);
    return res.data;
  },

  async deleteRestaurant(id: string) {
    const res = await apiClient.delete(`/admin/restaurants/${id}`);
    return res.data;
  },

  async assignManager(restaurantId: string, managerData: { userId?: string; email?: string; name?: string; password?: string }) {
    const res = await apiClient.post(`/admin/restaurants/${restaurantId}/managers`, managerData);
    return res.data;
  },

  async getAllPlans() {
    const res = await apiClient.get('/subscriptions');
    return res.data;
  },

  async assignPlan(restaurantId: string, planKey: string) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/subscription`, { planKey });
    return res.data;
  },

  // POS Integrations
  async getPOSOutlets() {
    const res = await apiClient.get('/admin/pos/outlets');
    return res.data;
  },

  async getPOSSyncLogs(page = 1, limit = 50) {
    const res = await apiClient.get(`/admin/pos/sync-logs?page=${page}&limit=${limit}`);
    return res.data;
  },

  async triggerPOSMenuSync(restaurantId: string) {
    const res = await apiClient.post(`/admin/pos/${restaurantId}/sync-menu`);
    return res.data;
  },

  async updatePOSConfig(restaurantId: string, data: { enabled: boolean; outletId: string; apiKey?: string }) {
    const res = await apiClient.patch(`/admin/pos/${restaurantId}/config`, data);
    return res.data;
  },

  // Payment Gateways
  async getPaymentOverview() {
    const res = await apiClient.get('/admin/payments/overview');
    return res.data;
  },

  async getTenantPaymentConfigs() {
    const res = await apiClient.get('/admin/payments/tenant-configs');
    return res.data;
  },

  async updateTenantPaymentMethods(restaurantId: string, data: { cashEnabled: boolean; cardEnabled: boolean; upiEnabled: boolean; razorpayEnabled: boolean }) {
    const res = await apiClient.patch(`/admin/payments/restaurants/${restaurantId}/methods`, data);
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(params: { page?: number; limit?: number; action?: string; severity?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await apiClient.get(`/admin/audit-logs?${query}`);
    return res.data;
  },
};

export const managerService = {
  async getRestaurantProfile(restaurantId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}`);
    return res.data;
  },

  async editRestaurantProfile(restaurantId: string, data: Partial<Restaurant>) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}`, data);
    return res.data;
  },

  async listTables(restaurantId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}/tables`);
    return res.data;
  },

  async createTable(restaurantId: string, data: { tableNumber?: string; displayName?: string; zoneId?: string }) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/tables`, data);
    return res.data;
  },

  async bulkCreateTables(restaurantId: string, data: { count: number; prefix?: string; zoneId?: string }) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/tables/bulk`, data);
    return res.data;
  },

  async editTable(restaurantId: string, tableId: string, data: Partial<Table>) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/tables/${tableId}`, data);
    return res.data;
  },

  async deleteTable(restaurantId: string, tableId: string) {
    const res = await apiClient.delete(`/restaurants/${restaurantId}/tables/${tableId}`);
    return res.data;
  },

  async activateTable(restaurantId: string, tableId: string) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/tables/${tableId}/activate`);
    return res.data;
  },

  async deactivateTable(restaurantId: string, tableId: string) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/tables/${tableId}/deactivate`);
    return res.data;
  },

  async regenerateTableQr(restaurantId: string, tableId: string) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/tables/${tableId}/regenerate-qr`);
    return res.data;
  },

  async getTableQr(restaurantId: string, tableId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}/tables/${tableId}/qr`);
    return res.data;
  },

  // Zone endpoints
  async listZones(restaurantId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}/zones`);
    return res.data;
  },

  async createZone(restaurantId: string, data: any) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/zones`, data);
    return res.data;
  },

  async updateZone(restaurantId: string, zoneId: string, data: any) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/zones/${zoneId}`, data);
    return res.data;
  },

  async deleteZone(restaurantId: string, zoneId: string) {
    const res = await apiClient.delete(`/restaurants/${restaurantId}/zones/${zoneId}`);
    return res.data;
  },

  // Tax endpoints
  async listTaxes(restaurantId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}/taxes`);
    return res.data;
  },

  async createTax(restaurantId: string, data: any) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/taxes`, data);
    return res.data;
  },

  async updateTax(restaurantId: string, taxId: string, data: any) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/taxes/${taxId}`, data);
    return res.data;
  },

  async deleteTax(restaurantId: string, taxId: string) {
    const res = await apiClient.delete(`/restaurants/${restaurantId}/taxes/${taxId}`);
    return res.data;
  },

  // Staff endpoints
  async listStaff(restaurantId: string) {
    const res = await apiClient.get(`/restaurants/${restaurantId}/staff`);
    return res.data;
  },

  async createStaff(restaurantId: string, data: any) {
    const res = await apiClient.post(`/restaurants/${restaurantId}/staff`, data);
    return res.data;
  },

  async updateStaff(restaurantId: string, staffId: string, data: any) {
    const res = await apiClient.patch(`/restaurants/${restaurantId}/staff/${staffId}`, data);
    return res.data;
  },

  async deleteStaff(restaurantId: string, staffId: string) {
    const res = await apiClient.delete(`/restaurants/${restaurantId}/staff/${staffId}`);
    return res.data;
  },
};

export const publicService = {
  async resolveTable(restaurantSlug: string | undefined, tableToken: string, guestToken?: string) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}`
      : `/public/table/${tableToken}`;
    const headers: Record<string, string> = {};
    if (guestToken) {
      headers['x-guest-token'] = guestToken;
    }
    const res = await apiClient.get(url, { headers });
    return res.data;
  },

  async joinSession(restaurantSlug: string | undefined, tableToken: string, data: { guestName?: string; joinPin?: string; forceNew?: boolean }) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/join`
      : `/public/table/${tableToken}/join`;
    const res = await apiClient.post(url, data);
    return res.data;
  },

  async getPublicMenu(restaurantSlug: string | undefined, tableToken: string) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/menu`
      : `/public/table/${tableToken}/menu`;
    const res = await apiClient.get(url);
    return res.data;
  },

  async createPrepaidCheckout(restaurantSlug: string | undefined, tableToken: string, data: any) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/checkout/prepaid`
      : `/public/table/${tableToken}/checkout/prepaid`;
    const res = await apiClient.post(url, data);
    return res.data;
  },

  async confirmPrepaidPayment(checkoutAttemptId: string, gatewayPaymentId: string) {
    const res = await apiClient.post('/public/checkout/prepaid/confirm', {
      checkoutAttemptId,
      gatewayPaymentId,
    });
    return res.data;
  },

  async requestBill(restaurantSlug: string | undefined, sessionId: string) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/table-sessions/${sessionId}/bill/request`
      : `/public/table-sessions/${sessionId}/bill/request`;
    const res = await apiClient.post(url);
    return res.data;
  },

  async reopenSession(restaurantSlug: string | undefined, sessionId: string) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/table-sessions/${sessionId}/reopen`
      : `/public/table-sessions/${sessionId}/reopen`;
    const res = await apiClient.post(url);
    return res.data;
  },

  async getTableSession(restaurantSlug?: string, tableToken?: string, sessionId?: string) {
    let url = `/public/table-sessions/${sessionId}`;
    if (tableToken) {
      url = restaurantSlug
        ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/session`
        : `/public/table/${tableToken}/session`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },

  async placeOrder(
    restaurantSlug: string | undefined,
    tableToken: string,
    payload: any,
    options?: { customerToken?: string | null; idempotencyKey?: string }
  ) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/orders`
      : `/public/table/${tableToken}/orders`;
    const headers: Record<string, string> = {};
    if (options?.customerToken) {
      headers['Authorization'] = `Bearer ${options.customerToken}`;
    }
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
    const res = await apiClient.post(url, payload, { headers });
    return res.data;
  },

  async getOrderDetails(restaurantSlug: string | undefined, tableToken: string, orderId: string) {
    const url = restaurantSlug
      ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/orders/${orderId}`
      : `/public/table/${tableToken}/orders/${orderId}`;
    const res = await apiClient.get(url);
    return res.data;
  },
};
