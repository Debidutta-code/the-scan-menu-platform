import { EscPosBuilder } from './escposBuilder';

export interface PrintItem {
  name: string;
  nameSnapshot?: string;
  quantity: number;
  price?: number;
  unitPriceSnapshot?: number;
  isCombo?: boolean;
  comboItemsSnapshot?: Array<{ name: string; quantity: number }>;
  selectedAddOns?: Array<{ name: string; priceDelta?: number; price?: number }>;
  specialInstructions?: string;
}

export interface PrintOrderData {
  orderNumber: number;
  orderMode?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  items: PrintItem[];
  subtotal?: number;
  tax?: number;
  taxBreakdown?: Array<{ name: string; percentage?: number; amount: number }>;
  discount?: number;
  serviceCharge?: number;
  roundOff?: number;
  total?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  serverName?: string;
  createdAt?: Date | string;
}

export interface RestaurantPrintInfo {
  name?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  receiptHeader?: string;
  receiptFooter?: string;
}

export function formatAmount(amount: number = 0): string {
  const inUnits = amount > 100 && Number.isInteger(amount) ? amount / 100 : amount;
  return `Rs. ${inUnits.toFixed(2)}`;
}

/**
 * Builds 80mm / 58mm Customer Bill ESC/POS buffer
 */
export function buildCustomerBillBuffer(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  paperWidth: '80mm' | '58mm' = '80mm',
  isCounterCopy: boolean = false
): Buffer {
  const builder = new EscPosBuilder({ paperWidth });
  const isPaid = order.paymentStatus === 'PAID';

  // 1. Header
  builder
    .alignCenter()
    .doubleSize(true)
    .bold(true)
    .line(restaurant.name || 'RESTAURANT')
    .doubleSize(false)
    .bold(false);

  if (restaurant.address) builder.line(restaurant.address);
  if (restaurant.phone) builder.line(`Ph: ${restaurant.phone}`);
  if (restaurant.gstNumber) builder.bold(true).line(`GSTIN: ${restaurant.gstNumber}`).bold(false);
  if (restaurant.fssaiNumber) builder.line(`FSSAI: ${restaurant.fssaiNumber}`);
  if (restaurant.receiptHeader) builder.line(restaurant.receiptHeader);

  builder
    .feed(1)
    .bold(true)
    .line(isCounterCopy ? 'COUNTER / AUDIT COPY' : isPaid ? 'TAX INVOICE' : 'BILL FOR PAYMENT (PROFORMA)')
    .bold(false)
    .divider('-');

  // 2. Metadata
  const modeLabel = (order.orderMode || 'DINE_IN').toUpperCase();
  const tableLabel = order.tableName ? `TABLE: ${order.tableName}` : modeLabel;
  const dateStr = new Date(order.createdAt || new Date()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  builder
    .alignLeft()
    .twoColumnRow(`ORDER #${order.orderNumber}`, tableLabel)
    .twoColumnRow('Date:', dateStr);

  if (order.customerName) {
    builder.twoColumnRow('Guest:', order.customerName);
  }
  if (order.customerPhone) {
    builder.twoColumnRow('Phone:', order.customerPhone);
  }

  builder.divider('-');

  // 3. Columns
  builder
    .bold(true)
    .twoColumnRow('QTY  ITEM', 'AMOUNT')
    .bold(false)
    .divider('-');

  // 4. Items
  for (const item of order.items) {
    const itemName = item.nameSnapshot || item.name || 'Item';
    const unitPrice = item.unitPriceSnapshot ?? item.price ?? 0;
    const itemBaseTotal = unitPrice * item.quantity;

    let addOnsTotal = 0;
    const addOnDescriptions: string[] = [];
    if (item.selectedAddOns && item.selectedAddOns.length > 0) {
      for (const a of item.selectedAddOns) {
        const delta = a.priceDelta ?? a.price ?? 0;
        addOnsTotal += delta * item.quantity;
        addOnDescriptions.push(`${a.name} (${formatAmount(delta)})`);
      }
    }

    if (item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0) {
      for (const ci of item.comboItemsSnapshot) {
        addOnDescriptions.push(`↳ ${ci.quantity * item.quantity}x ${ci.name}`);
      }
    }

    const totalLinePrice = itemBaseTotal + addOnsTotal;
    builder.multilineItemRow(
      item.quantity,
      item.isCombo ? `${itemName} (Combo)` : itemName,
      formatAmount(totalLinePrice),
      addOnDescriptions,
      item.specialInstructions
    );
  }

  if (order.customerNote) {
    builder.feed(1).line(`Note: ${order.customerNote}`);
  }

  builder.divider('-');

  // 5. Totals
  const subtotal = order.subtotal ?? 0;
  const tax = order.tax ?? 0;
  const total = order.total ?? subtotal + tax;

  builder.twoColumnRow('Subtotal', formatAmount(subtotal));

  if (tax > 0) {
    if (order.taxBreakdown && order.taxBreakdown.length > 0) {
      for (const tb of order.taxBreakdown) {
        builder.twoColumnRow(`${tb.name}${tb.percentage ? ` (${tb.percentage}%)` : ''}`, formatAmount(tb.amount));
      }
    } else {
      const halfTax = Math.round(tax / 2);
      const otherHalf = tax - halfTax;
      builder.twoColumnRow('CGST 2.5%', formatAmount(halfTax));
      builder.twoColumnRow('SGST 2.5%', formatAmount(otherHalf));
    }
  }

  if (order.discount && order.discount > 0) {
    builder.twoColumnRow('Discount', `-${formatAmount(order.discount)}`);
  }

  if (order.serviceCharge && order.serviceCharge > 0) {
    builder.twoColumnRow('Service Charge', formatAmount(order.serviceCharge));
  }

  if (order.roundOff && order.roundOff !== 0) {
    const sign = order.roundOff > 0 ? '+' : '-';
    builder.twoColumnRow('Round Off', `${sign}${formatAmount(Math.abs(order.roundOff))}`);
  }

  // Grand Total
  builder
    .doubleDivider()
    .bold(true)
    .doubleHeight(true)
    .twoColumnRow(isPaid ? 'TOTAL PAID' : 'TOTAL PAYABLE', formatAmount(total))
    .doubleHeight(false)
    .bold(false)
    .doubleDivider();

  // 6. Payment Status
  const method = (order.paymentMethod || 'CASH').toUpperCase();
  builder
    .alignCenter()
    .bold(true)
    .line(isPaid ? `[OK] PAID (${method})` : 'STATUS: PAYMENT DUE')
    .bold(false);

  if (isCounterCopy) {
    builder.feed(1).divider('-').twoColumnRow('Cashier: ________', 'Sign: ________');
  }

  // 7. Footer
  builder
    .feed(1)
    .line(restaurant.receiptFooter || 'Thank you for dining with us!')
    .line('Powered by Pixora')
    .feed(2)
    .cut(false);

  return builder.toBuffer();
}

/**
 * Builds Kitchen Order Ticket (KOT) ESC/POS buffer
 */
export function buildKOTBuffer(
  order: PrintOrderData,
  paperWidth: '80mm' | '58mm' = '80mm',
  kotNotes?: string
): Buffer {
  const builder = new EscPosBuilder({ paperWidth });

  builder
    .alignCenter()
    .doubleSize(true)
    .bold(true)
    .line('*** KITCHEN ORDER TICKET ***')
    .doubleSize(false)
    .bold(false)
    .divider('=')
    .alignLeft()
    .twoColumnRow(`ORDER #${order.orderNumber}`, order.tableName ? `TABLE: ${order.tableName}` : order.orderMode || 'TAKEAWAY')
    .twoColumnRow('Time:', new Date(order.createdAt || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  if (order.serverName) {
    builder.twoColumnRow('Server:', order.serverName);
  }

  builder.divider('-');

  for (const item of order.items) {
    builder.bold(true);
    builder.twoColumnRow(item.name, `x${item.quantity}`);
    builder.bold(false);

    if (item.selectedAddOns && item.selectedAddOns.length > 0) {
      for (const addon of item.selectedAddOns) {
        builder.line(`  + ${addon.name}`);
      }
    }

    if (item.specialInstructions) {
      builder.line(`  * Note: ${item.specialInstructions}`);
    }
  }

  if (order.customerNote) {
    builder.divider('-').line(`SPECIAL: ${order.customerNote}`);
  }

  if (kotNotes) {
    builder.divider('-').line(`NOTE: ${kotNotes}`);
  }

  builder.feed(2).cut(false);
  return builder.toBuffer();
}

/**
 * Builds representative Thermal Test Slip buffer
 */
export function buildTestSlipBuffer(
  ip: string,
  port: number = 9100,
  paperWidth: '80mm' | '58mm' = '80mm',
  restaurantName: string = 'Demo Cafe',
  printerName: string = 'Counter Printer'
): Buffer {
  const builder = new EscPosBuilder({ paperWidth });

  builder
    .alignCenter()
    .doubleSize(true)
    .bold(true)
    .line(restaurantName)
    .doubleSize(false)
    .bold(false)
    .feed(1)
    .bold(true)
    .line('THERMAL TEST')
    .bold(false)
    .divider('-')
    .alignLeft()
    .twoColumnRow('Printer:', printerName)
    .twoColumnRow('Paper:', paperWidth)
    .twoColumnRow('IP:', `${ip}:${port}`)
    .twoColumnRow('Time:', new Date().toLocaleString('en-IN'))
    .feed(1)
    .line('[OK] Connection successful')
    .line('[OK] ESC/POS test successful')
    .divider('-')
    .alignCenter()
    .bold(true)
    .line('TEST COMPLETE')
    .bold(false)
    .feed(2)
    .cut(false);

  return builder.toBuffer();
}
