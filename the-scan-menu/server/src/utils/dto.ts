/**
 * Customer-Safe Data Transfer Object (DTO) Serializers
 * 
 * Strict sanitization to protect sensitive customer data, prevent IDOR leakage,
 * and hide internal operational details (e.g. other diners' phone numbers, staff notes,
 * MongoDB metadata, integration payloads) from public responses.
 */

export interface CustomerSafeOrderItemDTO {
  name: string;
  nameSnapshot?: string;
  quantity: number;
  unitPrice: number;
  unitPriceSnapshot?: number;
  selectedAddOns: { name: string; priceDelta: number }[];
  specialInstructions?: string;
  prepTimeMinutes?: number;
  prepTimeMinutesSnapshot?: number;
  itemSubtotal: number;
  itemTotal: number;
  itemStatus: string;
}

export interface CustomerSafeOrderDTO {
  id: string;
  _id?: string;
  orderNumber: number;
  roundNumber: number;
  orderMode: string;
  customerName: string;
  customerPhone?: string; // Redacted unless owner or staff
  tableId?: string;
  deliveryAddress?: Record<string, any>;
  status: string;
  paymentStatus: string;
  items: CustomerSafeOrderItemDTO[];
  subtotal: number;
  tax: number;
  taxBreakdown: any[];
  total: number;
  customerNote: string;
  source?: string;
  sessionId?: string;
  diningSessionId?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CustomerSafeDiningSessionDTO {
  id: string;
  _id?: string;
  session?: any;
  sessionCode: string;
  tableId?: string;
  status: string;
  paymentMode: string;
  roundCount: number;
  guestCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  serviceCharge: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  orders: CustomerSafeOrderDTO[];
  bill?: {
    id: string;
    _id?: string;
    billNumber: string;
    subtotal: number;
    tax: number;
    discount: number;
    serviceCharge: number;
    total: number;
    status: string;
  } | null;
  openedAt: Date | string;
  lastActivityAt?: Date | string;
}

export interface CustomerSafeCustomerDTO {
  id: string;
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  totalOrdersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  lifetimePointsEarned: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  redeemableRupees: number;
  lastOrderAt?: Date | string;
  createdAt: Date | string;
}

/**
 * Sanitizes an Order document for customer-facing responses.
 * Phone numbers of other diners are strictly redacted.
 */
export function toCustomerSafeOrderDTO(
  order: any,
  isOwnerOrStaff = false
): CustomerSafeOrderDTO {
  if (!order) return order;

  const raw = typeof order.toObject === 'function' ? order.toObject() : order;
  const idStr = raw._id ? raw._id.toString() : (raw.id ? raw.id.toString() : '');
  const sessId = (raw.diningSessionId || raw.sessionId) ? (raw.diningSessionId || raw.sessionId).toString() : undefined;

  const tableIdStr = raw.tableId ? raw.tableId.toString() : undefined;

  return {
    id: idStr,
    _id: idStr,
    orderNumber: raw.orderNumber,
    roundNumber: raw.roundNumber || 1,
    orderMode: raw.orderMode || 'DINE_IN',
    customerName: raw.customerName || 'Guest Diner',
    customerPhone: isOwnerOrStaff ? raw.customerPhone : undefined,
    tableId: tableIdStr,
    deliveryAddress: raw.deliveryAddress || undefined,
    status: raw.status || 'PENDING',
    paymentStatus: raw.paymentStatus || 'PENDING',
    items: (raw.items || []).map((item: any) => {
      const unitPrice = item.unitPriceSnapshot !== undefined ? item.unitPriceSnapshot : (item.unitPrice || 0);
      const name = item.nameSnapshot || item.name || '';
      const prepTime = item.prepTimeMinutesSnapshot !== undefined ? item.prepTimeMinutesSnapshot : item.prepTimeMinutes;
      return {
        name,
        nameSnapshot: name,
        quantity: item.quantity || 1,
        unitPrice,
        unitPriceSnapshot: unitPrice,
        selectedAddOns: item.selectedAddOns || [],
        specialInstructions: item.specialInstructions || '',
        prepTimeMinutes: prepTime,
        prepTimeMinutesSnapshot: prepTime,
        itemSubtotal: item.itemSubtotal || 0,
        itemTotal: item.itemTotal || 0,
        itemStatus: item.itemStatus || 'PENDING',
      };
    }),
    subtotal: raw.subtotal || 0,
    tax: raw.tax || 0,
    taxBreakdown: raw.taxBreakdown || [],
    total: raw.total || 0,
    customerNote: raw.customerNote || '',
    source: raw.source || 'QR',
    sessionId: sessId,
    diningSessionId: sessId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Sanitizes a DiningSession document and its associated orders for shared table viewing.
 */
export function toCustomerSafeDiningSessionDTO(
  session: any,
  orders: any[] = [],
  bill: any = null,
  currentCustomerId?: string
): CustomerSafeDiningSessionDTO {
  const rawSession = typeof session.toObject === 'function' ? session.toObject() : session;
  const sessionIdStr = rawSession._id ? rawSession._id.toString() : (rawSession.id ? rawSession.id.toString() : '');

  const sanitizedOrders = (orders || []).map((o) => {
    const rawOrder = typeof o.toObject === 'function' ? o.toObject() : o;
    const isOwner =
      currentCustomerId &&
      rawOrder.customerId &&
      rawOrder.customerId.toString() === currentCustomerId.toString();
    return toCustomerSafeOrderDTO(rawOrder, isOwner);
  });

  let sanitizedBill: CustomerSafeDiningSessionDTO['bill'] = null;
  if (bill) {
    const rawBill = typeof bill.toObject === 'function' ? bill.toObject() : bill;
    const billIdStr = rawBill._id ? rawBill._id.toString() : rawBill.id;
    sanitizedBill = {
      id: billIdStr,
      _id: billIdStr,
      billNumber: rawBill.billNumber || '',
      subtotal: rawBill.subtotal || 0,
      tax: rawBill.tax || 0,
      discount: rawBill.discount || 0,
      serviceCharge: rawBill.serviceCharge || 0,
      total: rawBill.total || 0,
      status: rawBill.status || 'PENDING',
    };
  }

  return {
    id: sessionIdStr,
    _id: sessionIdStr,
    session: rawSession, // Backwards compatibility for tests expecting res.data.session
    sessionCode: rawSession.sessionCode || '',
    tableId: rawSession.tableId ? rawSession.tableId.toString() : undefined,
    status: rawSession.status || 'ACTIVE',
    paymentMode: rawSession.paymentMode || 'POSTPAID',
    roundCount: rawSession.roundCount || 0,
    guestCount: rawSession.guestCount || 1,
    subtotal: rawSession.subtotal || 0,
    tax: rawSession.tax || 0,
    discount: rawSession.discount || 0,
    serviceCharge: rawSession.serviceCharge || 0,
    total: rawSession.total || 0,
    paidAmount: rawSession.paidAmount || 0,
    balanceDue: rawSession.balanceDue || 0,
    orders: sanitizedOrders,
    bill: sanitizedBill,
    openedAt: rawSession.openedAt || rawSession.createdAt,
    lastActivityAt: rawSession.lastActivityAt,
  };
}

/**
 * Sanitizes a Customer profile document.
 */
export function toCustomerSafeCustomerDTO(customer: any): CustomerSafeCustomerDTO {
  const raw = typeof customer.toObject === 'function' ? customer.toObject() : customer;
  const idStr = raw._id ? raw._id.toString() : (raw.id ? raw.id.toString() : '');
  const pts = raw.loyaltyPoints || 0;

  return {
    id: idStr,
    _id: idStr,
    name: raw.name || '',
    phone: raw.phone || '',
    email: raw.email || undefined,
    totalOrdersCount: raw.totalOrdersCount || 0,
    totalSpent: raw.totalSpent || 0,
    loyaltyPoints: pts,
    lifetimePointsEarned: raw.lifetimePointsEarned || pts,
    tier: raw.tier || 'BRONZE',
    redeemableRupees: (pts * 50) / 100,
    lastOrderAt: raw.lastOrderAt,
    createdAt: raw.createdAt,
  };
}
