import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { LoyaltyLedger, ILoyaltyLedger } from '../models/LoyaltyLedger';

export class LoyaltyService {
  // Standard loyalty conversion rules (1 point earned per ₹10 / 1000 paise spent, 1 point = ₹0.50 / 50 paise value)
  private readonly EARN_RATE_DIVISOR = 1000; // 1 pt per ₹10
  private readonly POINT_VALUE_PAISE = 50; // 1 pt = ₹0.50

  private calculateTier(lifetimePoints: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
    if (lifetimePoints >= 5000) return 'PLATINUM';
    if (lifetimePoints >= 2000) return 'GOLD';
    if (lifetimePoints >= 500) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Looks up a customer's loyalty profile by phone number or customer ID
   */
  async getCustomerLoyalty(restaurantId: string | Types.ObjectId, phone: string): Promise<any> {
    const rId = new Types.ObjectId(restaurantId);
    const cleanPhone = phone.trim();

    const customer = await Customer.findOne({ restaurantId: rId, phone: cleanPhone });

    if (!customer) {
      return {
        exists: false,
        loyaltyPoints: 0,
        redeemableRupees: 0,
        tier: 'BRONZE',
      };
    }

    const redeemableRupees = (customer.loyaltyPoints * this.POINT_VALUE_PAISE) / 100;

    return {
      exists: true,
      customerId: customer._id,
      name: customer.name,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints || 0,
      lifetimePointsEarned: customer.lifetimePointsEarned || 0,
      redeemableRupees,
      tier: customer.tier || 'BRONZE',
    };
  }

  /**
   * Accrues loyalty points when an order is completed
   */
  async earnPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    orderTotalPaise: number,
    orderId?: string | Types.ObjectId
  ): Promise<{ pointsEarned: number; newBalance: number }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) return { pointsEarned: 0, newBalance: 0 };

    const pointsEarned = Math.floor(orderTotalPaise / this.EARN_RATE_DIVISOR);
    if (pointsEarned <= 0) {
      return { pointsEarned: 0, newBalance: customer.loyaltyPoints || 0 };
    }

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
      rupeeValuePaise: pointsEarned * this.POINT_VALUE_PAISE,
      balanceAfter: customer.loyaltyPoints,
      reason: `Points earned on Order #${orderId ? String(orderId).slice(-4) : ''}`,
    });

    return { pointsEarned, newBalance: customer.loyaltyPoints };
  }

  /**
   * Redeems loyalty points for an order
   */
  async redeemPoints(
    restaurantId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    pointsToRedeem: number,
    orderId?: string | Types.ObjectId
  ): Promise<{ pointsRedeemed: number; discountPaise: number; newBalance: number }> {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    if (pointsToRedeem <= 0 || pointsToRedeem > (customer.loyaltyPoints || 0)) {
      throw new Error('Insufficient loyalty points');
    }

    customer.loyaltyPoints -= pointsToRedeem;
    await customer.save();

    const discountPaise = pointsToRedeem * this.POINT_VALUE_PAISE;

    await LoyaltyLedger.create({
      restaurantId: rId,
      customerId: cId,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      type: 'REDEEM',
      points: -pointsToRedeem,
      rupeeValuePaise: discountPaise,
      balanceAfter: customer.loyaltyPoints,
      reason: `Redeemed on Order #${orderId ? String(orderId).slice(-4) : ''}`,
    });

    return { pointsRedeemed: pointsToRedeem, discountPaise, newBalance: customer.loyaltyPoints };
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

    await LoyaltyLedger.create({
      restaurantId: rId,
      customerId: cId,
      type: 'ADJUST',
      points: pointsDelta,
      rupeeValuePaise: pointsDelta * this.POINT_VALUE_PAISE,
      balanceAfter: customer.loyaltyPoints,
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
    return await LoyaltyLedger.find({ restaurantId: rId, customerId: cId }).sort({ createdAt: -1 }).limit(50);
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
