import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { LoyaltyLedger, ILoyaltyLedger } from '../models/LoyaltyLedger';
import { RestaurantSettings, IRestaurantSettingsLoyalty } from '../models/RestaurantSettings';
import { PlatformSettings, IPlatformSettingsLoyalty } from '../models/PlatformSettings';

export const DEFAULT_LOYALTY_CONFIG: IRestaurantSettingsLoyalty & { mode?: 'GLOBAL' | 'OUTLET_WISE' } = {
  mode: 'GLOBAL',
  enabled: true,
  earningMode: 'PERCENTAGE',
  earnPercentage: 50, // 50% points of spend total
  spendRatioPaise: 1000, // 1 point per ₹10 spent
  fixedPointsPerOrder: 50,
  validityDays: 7, // 7 days validity
  pointValuePaise: 50, // 1 point = ₹0.50
  maxRedemptionPercentPerOrder: 50, // max 50% discount per order
  minPointsToRedeem: 50, // minimum 50 points required to redeem
};

export class LoyaltyService {
  private calculateTier(lifetimePoints: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
    if (lifetimePoints >= 5000) return 'PLATINUM';
    if (lifetimePoints >= 2000) return 'GOLD';
    if (lifetimePoints >= 500) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Retrieves singleton PlatformSettings for SuperAdmin global loyalty policies
   */
  async getPlatformSettings(): Promise<any> {
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      settings = await PlatformSettings.create({
        loyalty: {
          mode: 'GLOBAL',
          enabled: true,
          earningMode: 'PERCENTAGE',
          earnPercentage: 50,
          spendRatioPaise: 1000,
          fixedPointsPerOrder: 50,
          validityDays: 7,
          pointValuePaise: 50,
          maxRedemptionPercentPerOrder: 50,
          minPointsToRedeem: 50,
        },
      });
    }
    return settings;
  }

  /**
   * Updates SuperAdmin platform loyalty configuration
   */
  async updateGlobalLoyaltyPolicy(configPartial: Partial<IPlatformSettingsLoyalty>): Promise<any> {
    const settings = await this.getPlatformSettings();
    const current = settings.loyalty || {};
    settings.loyalty = { ...current, ...configPartial };
    await settings.save();
    return settings.loyalty;
  }

  /**
   * Resolves active loyalty configuration (Global Policy vs Outlet-Wise Policy)
   */
  async getLoyaltyConfig(restaurantId: string | Types.ObjectId): Promise<IRestaurantSettingsLoyalty & { mode?: string }> {
    const platform = await this.getPlatformSettings();
    if (platform.loyalty && platform.loyalty.mode === 'GLOBAL') {
      return { ...DEFAULT_LOYALTY_CONFIG, ...platform.loyalty, mode: 'GLOBAL' };
    }

    // Outlet-wise mode: fetch outlet specific settings
    const rId = new Types.ObjectId(restaurantId);
    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    if (!settings || !settings.loyaltyConfig) {
      return { ...DEFAULT_LOYALTY_CONFIG, ...platform.loyalty, mode: 'OUTLET_WISE' };
    }
    return { ...DEFAULT_LOYALTY_CONFIG, ...settings.loyaltyConfig, mode: 'OUTLET_WISE' };
  }

  /**
   * Updates restaurant outlet loyalty configuration (in Outlet-Wise mode)
   */
  async updateLoyaltyConfig(
    restaurantId: string | Types.ObjectId,
    configPartial: Partial<IRestaurantSettingsLoyalty>
  ): Promise<IRestaurantSettingsLoyalty> {
    const rId = new Types.ObjectId(restaurantId);
    let settings = await RestaurantSettings.findOne({ restaurantId: rId });
    if (!settings) {
      settings = new RestaurantSettings({
        restaurantId: rId,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      });
    }

    const currentConfig = settings.loyaltyConfig || { ...DEFAULT_LOYALTY_CONFIG };
    const updatedConfig = { ...currentConfig, ...configPartial };
    settings.loyaltyConfig = updatedConfig as any;
    await settings.save();

    return updatedConfig;
  }

  /**
   * Automatically expires past unredeemed points for a customer (e.g. past 7 days)
   */
  async processExpiredPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<{ expiredPointsTotal: number }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) return { expiredPointsTotal: 0 };

    const now = new Date();
    // Find unredeemed points batches past their expiration timestamp
    const expiredLedgers = await LoyaltyLedger.find({
      restaurantId: rId,
      customerId: cId,
      type: 'EARN',
      expiresAt: { $ne: null, $lte: now },
      remainingPoints: { $gt: 0 },
    });

    if (expiredLedgers.length === 0) {
      return { expiredPointsTotal: 0 };
    }

    let expiredPointsTotal = 0;
    for (const item of expiredLedgers) {
      expiredPointsTotal += item.remainingPoints || 0;
      item.remainingPoints = 0;
      await item.save();
    }

    if (expiredPointsTotal > 0) {
      const config = await this.getLoyaltyConfig(restaurantId);
      customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) - expiredPointsTotal);
      await customer.save();

      await LoyaltyLedger.create({
        restaurantId: rId,
        customerId: cId,
        type: 'EXPIRE',
        points: -expiredPointsTotal,
        rupeeValuePaise: expiredPointsTotal * config.pointValuePaise,
        balanceAfter: customer.loyaltyPoints,
        reason: `Points expired after ${config.validityDays || 7} days validity period`,
      });
    }

    return { expiredPointsTotal };
  }

  /**
   * Looks up a customer's loyalty profile by phone number or customer ID
   */
  async getCustomerLoyalty(restaurantId: string | Types.ObjectId, phone: string): Promise<any> {
    const rId = new Types.ObjectId(restaurantId);
    const cleanPhone = phone.trim();
    const config = await this.getLoyaltyConfig(restaurantId);

    const customer = await Customer.findOne({ restaurantId: rId, phone: cleanPhone });

    if (!customer) {
      return {
        exists: false,
        loyaltyPoints: 0,
        redeemableRupees: 0,
        tier: 'BRONZE',
        config,
      };
    }

    // Auto-expire unredeemed points first
    await this.processExpiredPoints(restaurantId, customer._id);

    const updatedCust = (await Customer.findById(customer._id)) || customer;
    const redeemableRupees = ((updatedCust.loyaltyPoints || 0) * config.pointValuePaise) / 100;

    return {
      exists: true,
      customerId: updatedCust._id,
      name: updatedCust.name,
      phone: updatedCust.phone,
      loyaltyPoints: updatedCust.loyaltyPoints || 0,
      lifetimePointsEarned: updatedCust.lifetimePointsEarned || 0,
      redeemableRupees,
      tier: updatedCust.tier || 'BRONZE',
      config,
    };
  }

  /**
   * Accrues loyalty points when an order is completed using configurable rules (e.g. 50% points of spend, 7 days validity)
   */
  async earnPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    orderTotalPaise: number,
    orderId?: string | Types.ObjectId
  ): Promise<{ pointsEarned: number; newBalance: number; expiresAt?: Date }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);
    const config = await this.getLoyaltyConfig(restaurantId);

    if (!config.enabled) {
      return { pointsEarned: 0, newBalance: 0 };
    }

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) return { pointsEarned: 0, newBalance: 0 };

    // Auto-process expired points first
    await this.processExpiredPoints(restaurantId, customer._id);

    let pointsEarned = 0;
    const mode = config.earningMode || 'PERCENTAGE';

    if (mode === 'PERCENTAGE') {
      // e.g. 50% points on ₹420 spend (42000 paise) = 210 points
      const rupeeSpent = orderTotalPaise / 100;
      pointsEarned = Math.floor(rupeeSpent * ((config.earnPercentage || 50) / 100));
    } else if (mode === 'FIXED_PER_ORDER') {
      pointsEarned = config.fixedPointsPerOrder || 50;
    } else if (mode === 'SPEND_RATIO') {
      const divisor = config.spendRatioPaise || 1000;
      pointsEarned = Math.floor(orderTotalPaise / divisor);
    }

    if (pointsEarned <= 0) {
      return { pointsEarned: 0, newBalance: customer.loyaltyPoints || 0 };
    }

    const validityDays = config.validityDays !== undefined ? config.validityDays : 7;
    const expiresAt = validityDays > 0 ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000) : undefined;

    customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned;
    customer.lifetimePointsEarned = (customer.lifetimePointsEarned || 0) + pointsEarned;
    customer.tier = this.calculateTier(customer.lifetimePointsEarned);
    await customer.save();

    await LoyaltyLedger.create({
      restaurantId: rId,
      customerId: cId,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      type: 'EARN',
      points: pointsEarned,
      remainingPoints: pointsEarned,
      rupeeValuePaise: pointsEarned * config.pointValuePaise,
      balanceAfter: customer.loyaltyPoints,
      expiresAt,
      reason: `Points earned on Order #${orderId ? String(orderId).slice(-4) : ''} (${validityDays > 0 ? `Valid ${validityDays} days` : 'No Expiry'})`,
    });

    return { pointsEarned, newBalance: customer.loyaltyPoints, expiresAt };
  }

  /**
   * Validates allowable point redemption & discount cap for checkout
   */
  async validateAndCalculateRedemption(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    requestedPoints: number,
    orderSubtotalPaise: number
  ): Promise<{ effectivePoints: number; discountPaise: number; pointValuePaise: number }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);
    const config = await this.getLoyaltyConfig(restaurantId);

    if (!config.enabled || requestedPoints <= 0) {
      return { effectivePoints: 0, discountPaise: 0, pointValuePaise: config.pointValuePaise };
    }

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) {
      return { effectivePoints: 0, discountPaise: 0, pointValuePaise: config.pointValuePaise };
    }

    await this.processExpiredPoints(restaurantId, customer._id);
    const updatedCust = (await Customer.findById(customer._id)) || customer;

    const availablePoints = updatedCust.loyaltyPoints || 0;
    if (availablePoints < (config.minPointsToRedeem || 50)) {
      return { effectivePoints: 0, discountPaise: 0, pointValuePaise: config.pointValuePaise };
    }

    // Maximum discount cap (e.g. max 50% of subtotal)
    const maxDiscountPaise = Math.floor((orderSubtotalPaise * (config.maxRedemptionPercentPerOrder || 50)) / 100);
    const maxPointsByCap = Math.floor(maxDiscountPaise / config.pointValuePaise);

    const effectivePoints = Math.min(requestedPoints, availablePoints, maxPointsByCap);
    const discountPaise = effectivePoints * config.pointValuePaise;

    return { effectivePoints, discountPaise, pointValuePaise: config.pointValuePaise };
  }

  /**
   * Redeems loyalty points for an order using FIFO deduction on active batches
   */
  async redeemPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    pointsToRedeem: number,
    orderId?: string | Types.ObjectId
  ): Promise<{ pointsRedeemed: number; discountPaise: number; newBalance: number }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);
    const config = await this.getLoyaltyConfig(restaurantId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.processExpiredPoints(restaurantId, customer._id);
    const updatedCust = (await Customer.findById(customer._id)) || customer;

    if (pointsToRedeem <= 0 || pointsToRedeem > (updatedCust.loyaltyPoints || 0)) {
      throw new Error('Insufficient valid loyalty points');
    }

    // Deduct remaining points FIFO from active EARN batches
    const now = new Date();
    const activeBatches = await LoyaltyLedger.find({
      restaurantId: rId,
      customerId: cId,
      type: 'EARN',
      remainingPoints: { $gt: 0 },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: 1 });

    let remainingToDeduct = pointsToRedeem;
    for (const batch of activeBatches) {
      if (remainingToDeduct <= 0) break;
      const batchAvail = batch.remainingPoints || 0;
      const deductFromBatch = Math.min(batchAvail, remainingToDeduct);
      batch.remainingPoints = batchAvail - deductFromBatch;
      remainingToDeduct -= deductFromBatch;
      await batch.save();
    }

    updatedCust.loyaltyPoints = Math.max(0, (updatedCust.loyaltyPoints || 0) - pointsToRedeem);
    await updatedCust.save();

    const discountPaise = pointsToRedeem * config.pointValuePaise;

    await LoyaltyLedger.create({
      restaurantId: rId,
      customerId: cId,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      type: 'REDEEM',
      points: -pointsToRedeem,
      rupeeValuePaise: discountPaise,
      balanceAfter: updatedCust.loyaltyPoints,
      reason: `Redeemed on Order #${orderId ? String(orderId).slice(-4) : ''}`,
    });

    return { pointsRedeemed: pointsToRedeem, discountPaise, newBalance: updatedCust.loyaltyPoints };
  }

  /**
   * Manual staff point adjustment (Customer recovery or goodwill)
   */
  async adjustPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    pointsDelta: number,
    reason: string,
    staffUserId?: string
  ): Promise<ICustomer> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);
    const config = await this.getLoyaltyConfig(restaurantId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    customer.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + pointsDelta);
    if (pointsDelta > 0) {
      customer.lifetimePointsEarned = (customer.lifetimePointsEarned || 0) + pointsDelta;
      customer.tier = this.calculateTier(customer.lifetimePointsEarned);
    }
    await customer.save();

    const validityDays = config.validityDays !== undefined ? config.validityDays : 7;
    const expiresAt = pointsDelta > 0 && validityDays > 0 ? new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000) : undefined;

    await LoyaltyLedger.create({
      restaurantId: rId,
      customerId: cId,
      type: 'ADJUST',
      points: pointsDelta,
      remainingPoints: pointsDelta > 0 ? pointsDelta : 0,
      rupeeValuePaise: pointsDelta * config.pointValuePaise,
      balanceAfter: customer.loyaltyPoints,
      expiresAt,
      reason: reason.trim() || 'Manual adjustment by staff',
      actorStaffId: staffUserId ? new Types.ObjectId(staffUserId) : undefined,
    });

    return customer;
  }

  /**
   * Retrieves points ledger history for a customer
   */
  async getCustomerLedger(restaurantId: string | Types.ObjectId, customerId: string | Types.ObjectId): Promise<ILoyaltyLedger[]> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);
    await this.processExpiredPoints(rId, cId);
    return await LoyaltyLedger.find({ restaurantId: rId, customerId: cId }).sort({ createdAt: -1 }).limit(50);
  }

  /**
   * Retrieves Customer Leaderboard / Ranking for a restaurant
   */
  async getLeaderboard(
    restaurantId: string | Types.ObjectId,
    sortBy: 'points' | 'spend' | 'visits' = 'points',
    limit = 20
  ): Promise<any[]> {
    const rId = new Types.ObjectId(restaurantId);
    const config = await this.getLoyaltyConfig(restaurantId);
    let sortObj: any = { loyaltyPoints: -1 };
    if (sortBy === 'spend') sortObj = { totalSpent: -1 };
    if (sortBy === 'visits') sortObj = { totalOrdersCount: -1 };

    const customers = await Customer.find({ restaurantId: rId })
      .sort(sortObj)
      .limit(limit)
      .lean();

    return customers.map((c: any, index: number) => ({
      rank: index + 1,
      customerId: c._id,
      name: c.name,
      phone: c.phone,
      tier: c.tier || 'BRONZE',
      loyaltyPoints: c.loyaltyPoints || 0,
      lifetimePointsEarned: c.lifetimePointsEarned || 0,
      totalOrdersCount: c.totalOrdersCount || 0,
      totalSpent: c.totalSpent || 0,
      redeemableRupees: ((c.loyaltyPoints || 0) * config.pointValuePaise) / 100,
    }));
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
