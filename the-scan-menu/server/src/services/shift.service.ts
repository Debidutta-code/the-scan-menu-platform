import { Types } from 'mongoose';
import { Shift, IShift, CashMovementType } from '../models/Shift';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { AuditLog } from '../models/AuditLog';

class CustomError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class ShiftService {
  /**
   * Computes real-time sales metrics for a shift window
   */
  private async calculateShiftSales(restaurantId: Types.ObjectId, startTime: Date, endTime: Date = new Date()) {
    const rId = new Types.ObjectId(restaurantId);

    const payments = await Payment.find({
      restaurantId: rId,
      status: 'CAPTURED',
      createdAt: { $gte: startTime, $lte: endTime },
    }).lean();

    let cashSales = 0;
    let cardSales = 0;
    let upiSales = 0;

    for (const p of payments) {
      const method = (p.method || p.provider || '').toUpperCase();
      if (method.includes('CASH')) {
        cashSales += p.amount || 0;
      } else if (method.includes('CARD')) {
        cardSales += p.amount || 0;
      } else {
        upiSales += p.amount || 0;
      }
    }

    const orderCount = await Order.countDocuments({
      restaurantId: rId,
      status: { $ne: 'CANCELLED' },
      createdAt: { $gte: startTime, $lte: endTime },
    });

    const totalSales = cashSales + cardSales + upiSales;

    return {
      cashSales,
      cardSales,
      upiSales,
      totalSales,
      orderCount,
    };
  }

  /**
   * Retrieves the currently active OPEN shift with real-time calculated sales
   */
  async getCurrentShift(restaurantId: string | Types.ObjectId): Promise<any | null> {
    const rId = new Types.ObjectId(restaurantId);
    const shift = await Shift.findOne({ restaurantId: rId, status: 'OPEN' })
      .populate('staffId', 'name email role')
      .sort({ openedAt: -1 });

    if (!shift) return null;

    const liveSales = await this.calculateShiftSales(rId, shift.openedAt, new Date());

    shift.cashSales = liveSales.cashSales;
    shift.cardSales = liveSales.cardSales;
    shift.upiSales = liveSales.upiSales;
    shift.totalSales = liveSales.totalSales;
    shift.orderCount = liveSales.orderCount;
    shift.expectedCashInDrawer = shift.openingFloat + liveSales.cashSales + shift.cashIn - shift.cashOut;

    return shift;
  }

  /**
   * Opens a new shift with an opening cash float
   */
  async openShift(
    restaurantId: string | Types.ObjectId,
    staffId: string | Types.ObjectId,
    openingFloatPaise: number = 0,
    notes?: string
  ): Promise<IShift> {
    const rId = new Types.ObjectId(restaurantId);
    const sId = new Types.ObjectId(staffId);

    const existing = await Shift.findOne({ restaurantId: rId, status: 'OPEN' });
    if (existing) {
      throw new CustomError('SHIFT_ALREADY_OPEN', 'An active shift is already open. Please close it first.', 409);
    }

    const lastShift = await Shift.findOne({ restaurantId: rId }).sort({ shiftNumber: -1 });
    const shiftNumber = (lastShift?.shiftNumber || 0) + 1;

    const newShift = await Shift.create({
      restaurantId: rId,
      staffId: sId,
      shiftNumber,
      status: 'OPEN',
      openedAt: new Date(),
      openingFloat: openingFloatPaise,
      cashIn: 0,
      cashOut: 0,
      pettyCashEntries: [],
      cashSales: 0,
      cardSales: 0,
      upiSales: 0,
      totalSales: 0,
      orderCount: 0,
      expectedCashInDrawer: openingFloatPaise,
      closingNotes: notes,
    });

    await AuditLog.create({
      action: 'SHIFT_OPENED',
      actorId: staffId.toString(),
      actorRole: 'STAFF',
      restaurantId: rId.toString(),
      entityType: 'Shift',
      entityId: newShift._id,
      details: { shiftNumber, openingFloat: openingFloatPaise },
    });

    return newShift;
  }

  /**
   * Records a Petty Cash movement (Cash In / Cash Out)
   */
  async recordPettyCash(
    restaurantId: string | Types.ObjectId,
    shiftId: string | Types.ObjectId,
    type: CashMovementType,
    amountPaise: number,
    category: any,
    reason: string,
    staffId?: string | Types.ObjectId
  ): Promise<IShift> {
    const rId = new Types.ObjectId(restaurantId);
    const shId = new Types.ObjectId(shiftId);

    const shift = await Shift.findOne({ _id: shId, restaurantId: rId, status: 'OPEN' });
    if (!shift) {
      throw new CustomError('SHIFT_NOT_FOUND', 'Active open shift not found', 404);
    }

    if (amountPaise <= 0) {
      throw new CustomError('INVALID_AMOUNT', 'Amount must be greater than zero', 400);
    }

    shift.pettyCashEntries.push({
      type,
      amount: amountPaise,
      category: category || 'OTHER',
      reason: reason.trim(),
      staffId: staffId ? new Types.ObjectId(staffId) : undefined,
      createdAt: new Date(),
    });

    if (type === 'CASH_IN') {
      shift.cashIn += amountPaise;
    } else {
      shift.cashOut += amountPaise;
    }

    const liveSales = await this.calculateShiftSales(rId, shift.openedAt, new Date());
    shift.expectedCashInDrawer = shift.openingFloat + liveSales.cashSales + shift.cashIn - shift.cashOut;

    await shift.save();

    await AuditLog.create({
      action: `PETTY_CASH_${type}`,
      actorId: staffId?.toString(),
      actorRole: 'STAFF',
      restaurantId: rId.toString(),
      entityType: 'Shift',
      entityId: shift._id,
      details: { type, amount: amountPaise, category, reason },
    });

    return shift;
  }

  /**
   * Closes the active shift, calculates discrepancy, and locks the record (Z-Report basis)
   */
  async closeShift(
    restaurantId: string | Types.ObjectId,
    shiftId: string | Types.ObjectId,
    actualCashCountedPaise: number,
    closingNotes?: string,
    closedByStaffId?: string | Types.ObjectId
  ): Promise<IShift> {
    const rId = new Types.ObjectId(restaurantId);
    const shId = new Types.ObjectId(shiftId);

    const shift = await Shift.findOne({ _id: shId, restaurantId: rId, status: 'OPEN' });
    if (!shift) {
      throw new CustomError('SHIFT_NOT_FOUND', 'Active open shift not found', 404);
    }

    const closedAt = new Date();
    const finalSales = await this.calculateShiftSales(rId, shift.openedAt, closedAt);

    shift.cashSales = finalSales.cashSales;
    shift.cardSales = finalSales.cardSales;
    shift.upiSales = finalSales.upiSales;
    shift.totalSales = finalSales.totalSales;
    shift.orderCount = finalSales.orderCount;
    shift.expectedCashInDrawer = shift.openingFloat + finalSales.cashSales + shift.cashIn - shift.cashOut;
    shift.actualCashCounted = actualCashCountedPaise;
    shift.discrepancyAmount = actualCashCountedPaise - shift.expectedCashInDrawer;
    shift.status = 'CLOSED';
    shift.closedAt = closedAt;
    shift.closingNotes = closingNotes?.trim();
    if (closedByStaffId) {
      shift.closedBy = new Types.ObjectId(closedByStaffId);
    }

    await shift.save();

    await AuditLog.create({
      action: 'SHIFT_CLOSED',
      actorId: closedByStaffId?.toString(),
      actorRole: 'MANAGER',
      restaurantId: rId.toString(),
      entityType: 'Shift',
      entityId: shift._id,
      details: {
        expectedCash: shift.expectedCashInDrawer,
        actualCounted: shift.actualCashCounted,
        discrepancy: shift.discrepancyAmount,
        totalSales: shift.totalSales,
      },
    });

    return shift;
  }

  /**
   * Generates X-Report (Mid-shift instantaneous reading)
   */
  async getXReport(restaurantId: string | Types.ObjectId, shiftId?: string | Types.ObjectId) {
    const rId = new Types.ObjectId(restaurantId);
    let shift: any;

    if (shiftId) {
      shift = await Shift.findOne({ _id: new Types.ObjectId(shiftId), restaurantId: rId }).populate('staffId', 'name');
    } else {
      shift = await this.getCurrentShift(rId);
    }

    if (!shift) {
      throw new CustomError('NO_ACTIVE_SHIFT', 'No shift found to generate X-Report', 404);
    }

    const reportTime = new Date();
    const liveSales = await this.calculateShiftSales(rId, shift.openedAt, reportTime);

    return {
      reportType: 'X_REPORT',
      shiftNumber: shift.shiftNumber,
      openedAt: shift.openedAt,
      reportGeneratedAt: reportTime,
      staffName: shift.staffId?.name || 'Staff',
      openingFloat: shift.openingFloat,
      cashIn: shift.cashIn,
      cashOut: shift.cashOut,
      cashSales: liveSales.cashSales,
      cardSales: liveSales.cardSales,
      upiSales: liveSales.upiSales,
      totalSales: liveSales.totalSales,
      orderCount: liveSales.orderCount,
      expectedCashInDrawer: shift.openingFloat + liveSales.cashSales + shift.cashIn - shift.cashOut,
      pettyCashBreakdown: shift.pettyCashEntries || [],
    };
  }

  /**
   * Generates Z-Report (Formal closed shift report)
   */
  async getZReport(restaurantId: string | Types.ObjectId, shiftId: string | Types.ObjectId) {
    const rId = new Types.ObjectId(restaurantId);
    const shift = await Shift.findOne({ _id: new Types.ObjectId(shiftId), restaurantId: rId })
      .populate('staffId', 'name email')
      .populate('closedBy', 'name email');

    if (!shift) {
      throw new CustomError('SHIFT_NOT_FOUND', 'Shift record not found', 404);
    }

    return {
      reportType: 'Z_REPORT',
      shiftNumber: shift.shiftNumber,
      status: shift.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt || new Date(),
      openedBy: (shift.staffId as any)?.name || 'Cashier',
      closedBy: (shift.closedBy as any)?.name || (shift.staffId as any)?.name || 'Manager',
      openingFloat: shift.openingFloat,
      cashIn: shift.cashIn,
      cashOut: shift.cashOut,
      cashSales: shift.cashSales,
      cardSales: shift.cardSales,
      upiSales: shift.upiSales,
      totalSales: shift.totalSales,
      orderCount: shift.orderCount,
      expectedCashInDrawer: shift.expectedCashInDrawer,
      actualCashCounted: shift.actualCashCounted ?? 0,
      discrepancyAmount: shift.discrepancyAmount ?? 0,
      closingNotes: shift.closingNotes || '',
      pettyCashBreakdown: shift.pettyCashEntries || [],
    };
  }

  /**
   * List Shift History
   */
  async listShiftHistory(restaurantId: string | Types.ObjectId, page: number = 1, limit: number = 20) {
    const rId = new Types.ObjectId(restaurantId);
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      Shift.find({ restaurantId: rId })
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('staffId', 'name')
        .populate('closedBy', 'name')
        .lean(),
      Shift.countDocuments({ restaurantId: rId }),
    ]);

    return { shifts, total, page, totalPages: Math.ceil(total / limit) };
  }
}

export const shiftService = new ShiftService();
export default shiftService;
