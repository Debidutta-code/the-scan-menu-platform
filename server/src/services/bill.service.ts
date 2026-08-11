import { Types } from 'mongoose';
import { Bill, IBill } from '../models/Bill';
import { DiningSession, IDiningSession } from '../models/DiningSession';
import { Order } from '../models/Order';
import { Payment } from '../models/Payment';
import { Tax } from '../models/Tax';
import { AuditLog } from '../models/AuditLog';
import { NotificationService } from './notification.service';

class CustomError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class BillService {
  /**
   * Generates a sequential invoice number for a restaurant, e.g. "INV-2026-0042"
   */
  async generateBillNumber(restaurantId: Types.ObjectId | string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await Bill.countDocuments({ restaurantId: new Types.ObjectId(restaurantId) });
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}-${seq}`;
  }

  /**
   * Requests/generates a versioned bill for an active dining session.
   * If a pending bill already exists, marks it SUPERSEDED and creates a new version.
   */
  async requestOrGenerateBill(
    restaurantId: Types.ObjectId | string,
    sessionId: Types.ObjectId | string,
    generatedByUserId?: string,
    manualDiscountAmount: number = 0,
    discountReason?: string
  ): Promise<IBill> {
    const session = await DiningSession.findOne({
      _id: new Types.ObjectId(sessionId),
      restaurantId: new Types.ObjectId(restaurantId),
      status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
    });

    if (!session) {
      throw new CustomError('SESSION_NOT_ACTIVE', 'Dining session is not active or not found', 409);
    }

    // 1. Fetch active orders in this session
    const orders = await Order.find({
      diningSessionId: session._id,
      status: { $ne: 'CANCELLED' },
    });

    if (orders.length === 0) {
      throw new CustomError('NO_ORDERS_IN_SESSION', 'Cannot generate a bill with no active orders', 400);
    }

    // 2. Compute gross amount and taxes
    const grossAmount = orders.reduce((sum, o) => sum + (o.subtotal || 0), 0);

    const activeTaxes: any[] = await Tax.find({ restaurantId: session.restaurantId, isActive: true });
    let taxAmount = 0;
    const taxBreakdown: any[] = [];
    const groups = activeTaxes.filter((t) => t.type === 'GROUP');
    const standardTaxes = activeTaxes.filter((t) => t.type === 'TAX');

    for (const group of groups) {
      const subTaxes = standardTaxes.filter((t) => t.groupId?.toString() === group._id.toString());
      if (subTaxes.length === 0) continue;

      let groupAmount = 0;
      let groupPercentage = 0;
      const subTaxesBreakdown = subTaxes.map((st) => {
        const amt = Math.round(grossAmount * (st.percentage / 100));
        groupAmount += amt;
        groupPercentage += st.percentage;
        return { name: st.name, percentage: st.percentage, amount: amt };
      });

      taxAmount += groupAmount;
      taxBreakdown.push({
        name: group.name,
        percentage: groupPercentage,
        amount: groupAmount,
        subTaxes: subTaxesBreakdown,
      });
    }

    const standaloneTaxes = standardTaxes.filter((t) => !t.groupId);
    for (const st of standaloneTaxes) {
      const amt = Math.round(grossAmount * (st.percentage / 100));
      taxAmount += amt;
      taxBreakdown.push({
        name: st.name,
        percentage: st.percentage,
        amount: amt,
        subTaxes: [],
      });
    }

    const discountAmount = Math.max(0, manualDiscountAmount || session.discount || 0);
    const serviceCharge = session.serviceCharge || 0;
    const netAmount = Math.max(0, grossAmount + taxAmount + serviceCharge - discountAmount);

    // Sum already captured payments for this session (e.g. partial cash deposits or prepaid rounds)
    const capturedPayments = await Payment.find({
      diningSessionId: session._id,
      status: 'CAPTURED',
    });
    const paidAmount = capturedPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, netAmount - paidAmount);

    // 3. Supersede any existing pending bills for this session
    const existingPendingBill = await Bill.findOne({
      diningSessionId: session._id,
      status: 'PENDING',
    });

    let version = 1;
    if (existingPendingBill) {
      existingPendingBill.status = 'SUPERSEDED';
      await existingPendingBill.save();
      version = existingPendingBill.version + 1;
    } else {
      const highestVersionBill = await Bill.findOne({ diningSessionId: session._id }).sort({ version: -1 });
      if (highestVersionBill) {
        version = highestVersionBill.version + 1;
      }
    }

    const billNumber = await this.generateBillNumber(restaurantId);

    const bill = new Bill({
      restaurantId: session.restaurantId,
      diningSessionId: session._id,
      tableId: session.tableId,
      billNumber,
      version,
      grossAmount,
      taxAmount,
      taxBreakdown,
      discountAmount,
      discountReason: discountReason || session.discountReason,
      serviceCharge,
      netAmount,
      paidAmount,
      balanceDue,
      status: balanceDue === 0 ? 'SETTLED' : 'PENDING',
      generatedBy: generatedByUserId ? new Types.ObjectId(generatedByUserId) : undefined,
      generatedAt: new Date(),
      settledAt: balanceDue === 0 ? new Date() : undefined,
    });

    await bill.save();

    // 4. Update DiningSession status and financials
    session.status = balanceDue === 0 ? 'SETTLED' : 'BILL_REQUESTED';
    session.subtotal = grossAmount;
    session.tax = taxAmount;
    session.taxBreakdown = taxBreakdown;
    session.discount = discountAmount;
    session.discountReason = discountReason || session.discountReason;
    session.total = netAmount;
    session.paidAmount = paidAmount;
    session.balanceDue = balanceDue;
    session.lastActivityAt = new Date();
    await session.save();

    await AuditLog.create({
      action: 'BILL_GENERATED',
      actorId: generatedByUserId,
      actorRole: generatedByUserId ? 'MANAGER' : 'CUSTOMER',
      restaurantId: restaurantId.toString(),
      entityType: 'Bill',
      entityId: bill._id,
      details: {
        billNumber: bill.billNumber,
        version: bill.version,
        netAmount: bill.netAmount,
        balanceDue: bill.balanceDue,
      },
    });

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session
      );
    } catch (err) {
      console.error('Failed to notify bill generation:', err);
    }

    return bill;
  }

  /**
   * Reopens a session for ordering if customer wants to add dessert before paying.
   */
  async reopenSessionForOrdering(
    restaurantId: Types.ObjectId | string,
    sessionId: Types.ObjectId | string
  ): Promise<IDiningSession> {
    const session = await DiningSession.findOne({
      _id: new Types.ObjectId(sessionId),
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'BILL_REQUESTED',
    });

    if (!session) {
      throw new CustomError('SESSION_NOT_IN_BILL_REQUESTED', 'Session is not currently awaiting bill settlement', 400);
    }

    // Mark pending bill as superseded
    await Bill.updateMany(
      { diningSessionId: session._id, status: 'PENDING' },
      { $set: { status: 'SUPERSEDED' } }
    );

    session.status = 'ACTIVE';
    session.lastActivityAt = new Date();
    await session.save();

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        session._id.toString(),
        session
      );
    } catch (err) {
      console.error('Failed to notify session reopened:', err);
    }

    return session;
  }

  /**
   * Settles a bill using multi-tender payments (Cash, UPI, Card).
   */
  async settleBill(
    restaurantId: Types.ObjectId | string,
    billId: Types.ObjectId | string,
    payments: { method: 'CASH' | 'UPI' | 'CARD' | 'NETBANKING'; amount: number; provider?: string }[],
    staffUserId?: string
  ): Promise<{ bill: IBill; session: IDiningSession; payments: any[] }> {
    const bill = await Bill.findOne({
      _id: new Types.ObjectId(billId),
      restaurantId: new Types.ObjectId(restaurantId),
      status: 'PENDING',
    });

    if (!bill) {
      throw new CustomError('BILL_NOT_FOUND_OR_ALREADY_SETTLED', 'Bill is not pending or does not exist', 404);
    }

    const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaymentAmount <= 0) {
      throw new CustomError('INVALID_PAYMENT_AMOUNT', 'Payment amount must be greater than zero', 400);
    }

    if (totalPaymentAmount > bill.balanceDue) {
      throw new CustomError('PAYMENT_EXCEEDS_BALANCE', `Payment amount (${totalPaymentAmount}) exceeds balance due (${bill.balanceDue})`, 400);
    }

    const sessionDoc = await DiningSession.findById(bill.diningSessionId);
    if (!sessionDoc) {
      throw new CustomError('SESSION_NOT_FOUND', 'Dining session not found', 404);
    }

    const createdPayments = [];
    for (const p of payments) {
      const payment = new Payment({
        restaurantId: new Types.ObjectId(restaurantId),
        diningSessionId: sessionDoc._id,
        billId: bill._id,
        provider: p.provider || (p.method === 'CASH' ? 'CASH' : 'RAZORPAY'),
        method: p.method,
        amount: p.amount,
        currency: 'INR',
        status: 'CAPTURED',
        providerReferenceId: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      await payment.save();
      createdPayments.push(payment);
    }

    // Update Bill
    bill.paidAmount += totalPaymentAmount;
    bill.balanceDue = Math.max(0, bill.netAmount - bill.paidAmount);
    const isFullySettled = bill.balanceDue === 0;

    if (isFullySettled) {
      bill.status = 'SETTLED';
      bill.settledAt = new Date();
    }
    await bill.save();

    // Settle all orders under the session to PAID
    await Order.updateMany(
      { diningSessionId: sessionDoc._id, status: { $ne: 'CANCELLED' } },
      { $set: { paymentStatus: 'PAID' } }
    );

    // Update DiningSession
    sessionDoc.paidAmount += totalPaymentAmount;
    sessionDoc.balanceDue = Math.max(0, sessionDoc.total - sessionDoc.paidAmount);
    if (isFullySettled) {
      sessionDoc.status = 'SETTLED';
      sessionDoc.closedAt = new Date();
    }
    sessionDoc.lastActivityAt = new Date();
    await sessionDoc.save();

    await AuditLog.create({
      action: 'SESSION_SETTLED',
      actorId: staffUserId,
      actorRole: 'MANAGER',
      restaurantId: restaurantId.toString(),
      entityType: 'Bill',
      entityId: bill._id,
      details: {
        billNumber: bill.billNumber,
        paidAmount: totalPaymentAmount,
        remainingBalance: bill.balanceDue,
        isFullySettled,
      },
    });

    try {
      NotificationService.getInstance().notifySessionUpdated(
        restaurantId.toString(),
        sessionDoc._id.toString(),
        sessionDoc
      );
    } catch (err) {
      console.error('Failed to broadcast bill settlement:', err);
    }

    return { bill, session: sessionDoc, payments: createdPayments };
  }
}

export const billService = new BillService();
export default billService;
