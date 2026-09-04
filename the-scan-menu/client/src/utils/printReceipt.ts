export type PaperWidth = '80mm' | '58mm' | 'A4';
export type TicketPrintType = 'KITCHEN' | 'COUNTER' | 'CUSTOMER' | 'BOTH' | 'A4_INVOICE';
export type ReceiptTheme = 'classic' | 'modern' | 'compact';

export interface PrintItem {
  nameSnapshot?: string;
  name?: string;
  unitPriceSnapshot?: number;
  originalPriceSnapshot?: number;
  price?: number;
  isCombo?: boolean;
  comboItemsSnapshot?: { name: string; quantity: number; categoryName?: string }[];
  quantity: number;
  selectedAddOns?: { name: string; priceDelta?: number; price?: number }[];
  specialInstructions?: string;
  itemStatus?: string;
}

export interface PrintOrderData {
  _id?: string;
  orderNumber: number;
  orderMode?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER' | string;
  tableId?: { displayName?: string; tableNumber?: string } | any;
  tableName?: string;
  createdAt?: string | Date;
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  items: PrintItem[];
  subtotal?: number;
  tax?: number;
  taxBreakdown?: { name: string; percentage?: number; amount: number }[];
  roundOff?: number;
  discount?: number;
  serviceCharge?: number;
  total?: number;
  paymentStatus?: 'PENDING' | 'PAID' | string;
  paymentMethod?: string;
  serverName?: string;
}

export interface RestaurantPrintInfo {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  logoUrl?: string;
  currency?: string;
  headerMessage?: string;
  footerMessage?: string;
  paperWidth?: PaperWidth;
  branding?: {
    logoUrl?: string;
  };
  settings?: {
    paymentConfig?: {
      taxRatePercent?: number;
      gstNumber?: string;
      fssaiNumber?: string;
      upiId?: string;
      activeMode?: 'PREPAID' | 'POSTPAID' | 'HYBRID';
    };
    printerConfig?: {
      paperWidth?: PaperWidth;
      templateTheme?: ReceiptTheme;
      showLogo?: boolean;
      logoUrl?: string;
      showGstNumber?: boolean;
      gstNumber?: string;
      showFssai?: boolean;
      fssaiNumber?: string;
      receiptHeader?: string;
      receiptFooter?: string;
      showCustomerInfo?: boolean;
      showPaymentMode?: boolean;
      showTaxBreakup?: boolean;
      showPaymentQr?: boolean;
      upiId?: string;
      paymentQrUrl?: string;
      kotNotes?: string;
      kotShowServerName?: boolean;
      defaultPrintTarget?: 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE';
      silentPrintingEnabled?: boolean;
      kitchenPrinterIp?: string;
      kitchenPrinterPort?: number;
      counterPrinterIp?: string;
      counterPrinterPort?: number;
    };
  };
  printerConfig?: {
    paperWidth?: PaperWidth;
    templateTheme?: ReceiptTheme;
    showLogo?: boolean;
    logoUrl?: string;
    showGstNumber?: boolean;
    gstNumber?: string;
    showFssai?: boolean;
    fssaiNumber?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    showCustomerInfo?: boolean;
    showPaymentMode?: boolean;
    showTaxBreakup?: boolean;
    showPaymentQr?: boolean;
    upiId?: string;
    paymentQrUrl?: string;
    kotNotes?: string;
    kotShowServerName?: boolean;
    defaultPrintTarget?: 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE';
    silentPrintingEnabled?: boolean;
    kitchenPrinterIp?: string;
    kitchenPrinterPort?: number;
    counterPrinterIp?: string;
    counterPrinterPort?: number;
  };
}

export interface PrintResult {
  success: boolean;
  method: 'LAN' | 'BROWSER';
  message?: string;
}

/**
 * Formats monetary amounts using Indian Rupee standards
 */
export function formatPrintCurrency(amount: number = 0, currency: string = 'INR'): string {
  const numInUnits = amount > 100 && Number.isInteger(amount) ? amount / 100 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(numInUnits);
}

/**
 * Formats dates for receipts and tickets
 */
export function formatPrintDate(dateStr?: string | Date): string {
  if (!dateStr) return new Date().toLocaleString('en-IN');
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? new Date().toLocaleString('en-IN')
    : d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

/**
 * Extracts table display string
 */
export function getTableString(order: PrintOrderData): string {
  if (order.tableName) return order.tableName;
  if (order.tableId) {
    if (typeof order.tableId === 'string') return `Table ${order.tableId}`;
    const num = order.tableId.displayName || order.tableId.tableNumber || '';
    return num ? (num.toString().toLowerCase().startsWith('table') ? num : `Table ${num}`) : 'Table';
  }
  return order.orderMode || 'Takeaway';
}

/**
 * Generates Kitchen Order Ticket (KOT) HTML snippet - STRICTLY NO LOGO FOR KITCHEN
 */
export function generateKOTHtml(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  _width: PaperWidth = '80mm'
): string {
  const tableLabel = getTableString(order);
  const orderModeLabel = (order.orderMode || 'DINE_IN').toUpperCase();
  const formattedDate = formatPrintDate(order.createdAt);
  const cfg = restaurant.printerConfig || restaurant.settings?.printerConfig || {};
  const theme = cfg.templateTheme || 'classic';

  const itemsHtml = order.items
    .map((item, idx) => {
      const itemName = item.nameSnapshot || item.name || `Item #${idx + 1}`;
      const comboTag = item.isCombo
        ? ` <span style="font-size:11px;background:#000;color:#fff;padding:1px 4px;border-radius:3px;">[COMBO]</span>`
        : '';
      const comboSubItems =
        item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0
          ? `<div style="font-size:12px;font-weight:900;color:#000;padding-left:10px;margin-top:3px;border-left:3px solid #000;padding-top:2px;padding-bottom:2px;">
              ${item.comboItemsSnapshot
                .map((ci) => `<div>↳ ${ci.quantity * item.quantity}x ${ci.name} ${ci.categoryName ? `(${ci.categoryName})` : ''}</div>`)
                .join('')}
             </div>`
          : '';
      const addOns =
        item.selectedAddOns && item.selectedAddOns.length > 0
          ? `<div style="font-size:11px;color:#333;padding-left:14px;margin-top:2px;">+ ${item.selectedAddOns.map((a) => a.name).join(', ')}</div>`
          : '';
      const note = item.specialInstructions
        ? `<div style="font-size:11px;font-style:italic;color:#b45309;padding-left:14px;margin-top:2px;font-weight:bold;">⚡ Note: ${item.specialInstructions}</div>`
        : '';

      return `
      <tr style="border-bottom:1px dashed #ccc;">
        <td style="padding:6px 0;vertical-align:top;font-weight:900;font-size:16px;width:36px;">[${item.quantity}x]</td>
        <td style="padding:6px 0;vertical-align:top;">
          <div style="font-size:14px;font-weight:bold;color:#000;">${itemName}${comboTag}</div>
          ${comboSubItems}
          ${addOns}
          ${note}
        </td>
      </tr>
    `;
    })
    .join('');

  const customerNoteHtml = order.customerNote
    ? `
    <div style="margin-top:8px;padding:6px;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;font-size:11px;">
      <strong>⚠️ Special Request:</strong> ${order.customerNote}
    </div>
  `
    : '';

  const kotNotesHtml = cfg.kotNotes
    ? `
    <div style="margin-top:8px;padding:6px;background:#f1f5f9;border-left:3px solid #64748b;font-size:11px;font-style:italic;">
      ${cfg.kotNotes}
    </div>
  `
    : '';

  const fontFamily = theme === 'modern' ? 'Arial, Helvetica, sans-serif' : "'Courier New', Courier, monospace";

  return `
    <div class="kot-ticket" style="font-family:${fontFamily};color:#000;padding:4px 0;line-height:1.25;box-sizing:border-box;">
      <!-- Strict KOT Header (No Logo in Kitchen) -->
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
        <div style="font-size:15px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">*** KITCHEN ORDER TICKET (KOT) ***</div>
        <div style="font-size:22px;font-weight:900;margin-top:4px;">ORDER #${order.orderNumber}</div>
        <div style="font-size:12px;font-weight:bold;margin-top:4px;background:#000;color:#fff;display:inline-block;padding:2px 8px;border-radius:3px;">
          ${orderModeLabel} ${orderModeLabel === 'DINE_IN' ? `• ${tableLabel}` : ''}
        </div>
      </div>

      <div style="font-size:11px;margin-bottom:6px;display:flex;justify-content:space-between;border-bottom:1px dashed #000;padding-bottom:4px;">
        <span><strong>Time:</strong> ${formattedDate}</span>
        ${cfg.kotShowServerName !== false && order.serverName ? `<span><strong>Server:</strong> ${order.serverName}</span>` : ''}
      </div>

      ${customerNoteHtml}

      <table style="width:100%;border-collapse:collapse;margin-top:4px;">
        <thead>
          <tr style="border-bottom:1.5px solid #000;text-align:left;font-size:11px;">
            <th style="padding:3px 0;width:36px;">QTY</th>
            <th style="padding:3px 0;">ITEM & PREPARATION</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${kotNotesHtml}

      <div style="text-align:center;border-top:2px solid #000;margin-top:8px;padding-top:5px;font-size:11px;font-weight:bold;">
        *** END OF KOT ***
      </div>
    </div>
  `;
}

/**
 * Generates Dedicated 80mm / 58mm Thermal POS Customer Receipt
 * Features clean 48-column monospaced typography, item wrapping without overlapping amounts,
 * tax breakdown, dynamic height with no large blank margins, and payment QR support.
 */
export function generateCounterBillHtml(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  paperWidth: PaperWidth = '80mm',
  isCounterCopy: boolean = false
): string {
  const formattedDate = formatPrintDate(order.createdAt);
  const currency = restaurant.currency || 'INR';
  const cfg = restaurant.printerConfig || restaurant.settings?.printerConfig || {};

  const theme: ReceiptTheme = cfg.templateTheme || 'classic';
  const showLogo = cfg.showLogo !== false;
  const logoUrl = cfg.logoUrl || restaurant.logoUrl || restaurant.branding?.logoUrl;
  const showGst = cfg.showGstNumber !== false;
  const gstNumber = cfg.gstNumber || restaurant.gstNumber || restaurant.settings?.paymentConfig?.gstNumber;
  const showFssai = cfg.showFssai !== false;
  const fssaiNumber = cfg.fssaiNumber || restaurant.fssaiNumber || restaurant.settings?.paymentConfig?.fssaiNumber;
  const showCustomer = cfg.showCustomerInfo !== false;
  const showTaxBreakup = cfg.showTaxBreakup !== false;
  const showPayment = cfg.showPaymentMode !== false;
  const showPaymentQr = cfg.showPaymentQr !== false;

  const isPaid = order.paymentStatus === 'PAID';
  const logoMaxHeight = paperWidth === '58mm' ? '32px' : '45px';
  const fontFamily = theme === 'modern' ? 'Arial, Helvetica, sans-serif' : "'Courier New', Courier, monospace";

  // Items table generation with safe column widths
  const itemsHtml = order.items
    .map((item, idx) => {
      const itemName = item.nameSnapshot || item.name || `Item #${idx + 1}`;
      const unitPrice = item.unitPriceSnapshot ?? item.price ?? 0;
      const itemTotal = unitPrice * item.quantity;
      const comboTag = item.isCombo ? ` <span style="font-size:10px;font-weight:bold;">(Combo)</span>` : '';

      const comboSubItems =
        item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0
          ? `<div style="font-size:10px;color:#333;padding-left:6px;margin-top:1px;">
              ${item.comboItemsSnapshot.map((ci) => `<div>↳ ${ci.quantity * item.quantity}x ${ci.name}</div>`).join('')}
             </div>`
          : '';

      let addOnsPrice = 0;
      const addOnLines = (item.selectedAddOns || [])
        .map((a) => {
          const p = a.priceDelta ?? a.price ?? 0;
          addOnsPrice += p * item.quantity;
          return `<div style="font-size:10px;color:#444;padding-left:6px;">• ${a.name} (+${formatPrintCurrency(p, currency)})</div>`;
        })
        .join('');

      const itemNoteLine = item.specialInstructions
        ? `<div style="font-size:10px;font-style:italic;color:#555;padding-left:6px;">* ${item.specialInstructions}</div>`
        : '';

      const lineTotal = itemTotal + addOnsPrice;

      return `
      <tr style="border-bottom:1px dashed #e2e8f0;">
        <td style="padding:4px 0;vertical-align:top;font-size:12px;font-weight:bold;width:24px;">${item.quantity}</td>
        <td style="padding:4px 6px 4px 0;vertical-align:top;font-size:12px;word-break:break-word;">
          <div style="font-weight:bold;color:#000;">${itemName}${comboTag}</div>
          ${comboSubItems}
          ${addOnLines}
          ${itemNoteLine}
        </td>
        <td style="padding:4px 0;vertical-align:top;font-size:12px;text-align:right;font-family:monospace;white-space:nowrap;font-weight:bold;">
          ${formatPrintCurrency(lineTotal, currency)}
        </td>
      </tr>
    `;
    })
    .join('');

  const customerNoteHtml = order.customerNote
    ? `
    <div style="margin-top:4px;padding:3px 5px;background:#f8fafc;border-left:2px solid #64748b;font-size:10px;font-style:italic;">
      <strong>Note:</strong> ${order.customerNote}
    </div>
  `
    : '';

  const subtotal = order.subtotal ?? 0;
  const tax = order.tax ?? 0;
  const total = order.total ?? subtotal + tax;
  const totalInRupees = (total > 100 && Number.isInteger(total) ? total / 100 : total).toFixed(2);

  // Split CGST and SGST breakdown
  let taxBreakdownHtml = '';
  if (showTaxBreakup && tax > 0) {
    if (order.taxBreakdown && order.taxBreakdown.length > 0) {
      taxBreakdownHtml = order.taxBreakdown
        .map(
          (tb) => `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
          <span>${tb.name} ${tb.percentage ? `(${tb.percentage}%)` : ''}</span>
          <span style="font-family:monospace;">${formatPrintCurrency(tb.amount, currency)}</span>
        </div>
      `
        )
        .join('');
    } else {
      const halfTax = Math.round(tax / 2);
      const otherHalf = tax - halfTax;
      taxBreakdownHtml = `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
          <span>CGST 2.5%</span>
          <span style="font-family:monospace;">${formatPrintCurrency(halfTax, currency)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
          <span>SGST 2.5%</span>
          <span style="font-family:monospace;">${formatPrintCurrency(otherHalf, currency)}</span>
        </div>
      `;
    }
  } else if (tax > 0) {
    taxBreakdownHtml = `
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
        <span>GST / Tax</span>
        <span style="font-family:monospace;">${formatPrintCurrency(tax, currency)}</span>
      </div>
    `;
  }

  // Dynamic UPI Payment QR Code for UNPAID / POSTPAID customer bills
  let paymentQrHtml = '';
  if (!isPaid && !isCounterCopy && showPaymentQr) {
    const upiId = cfg.upiId || (restaurant as any).upiId || restaurant.settings?.paymentConfig?.upiId;
    const paymentQrUrl = cfg.paymentQrUrl;

    if (paymentQrUrl) {
      paymentQrHtml = `
        <div style="text-align:center;margin-top:8px;padding:6px;border:1px dashed #000;border-radius:4px;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:3px;">SCAN & PAY VIA UPI</div>
          <img src="${paymentQrUrl}" style="width:105px;height:105px;margin:0 auto;display:block;object-fit:contain;" />
          <div style="font-size:9px;font-weight:bold;margin-top:2px;">GPay • PhonePe • Paytm • UPI</div>
        </div>
      `;
    } else if (upiId) {
      const storeName = restaurant.name || 'Restaurant';
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalInRupees}&cu=INR&tn=${encodeURIComponent(`Bill #${order.orderNumber}`)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(upiUri)}`;

      paymentQrHtml = `
        <div style="text-align:center;margin-top:8px;padding:6px;border:1px dashed #000;border-radius:4px;">
          <div style="font-size:10px;font-weight:900;text-transform:uppercase;margin-bottom:3px;">SCAN & PAY VIA UPI</div>
          <img src="${qrApiUrl}" style="width:105px;height:105px;margin:0 auto;display:block;" />
          <div style="font-size:9px;font-weight:bold;margin-top:2px;">GPay • PhonePe • Paytm • UPI</div>
          <div style="font-size:9px;color:#333;font-family:monospace;margin-top:1px;">UPI: ${upiId}</div>
        </div>
      `;
    }
  }

  // Bill Heading
  const billTitle = isCounterCopy
    ? 'COUNTER / AUDIT RECEIPT'
    : isPaid
    ? 'TAX INVOICE'
    : 'BILL FOR PAYMENT (PROFORMA)';

  const rawOrderMode = (order.orderMode || 'DINE_IN').toUpperCase();
  const rawTableLabel = getTableString(order);
  let orderModeBadge = 'DINE-IN';
  if (rawOrderMode === 'COUNTER') orderModeBadge = 'COUNTER POS';
  else if (rawOrderMode === 'TAKEAWAY') orderModeBadge = 'TAKEAWAY';
  else if (rawOrderMode === 'DELIVERY') orderModeBadge = 'DELIVERY';
  else if (rawTableLabel && !['DINE_IN', 'DINE-IN'].includes(rawTableLabel.toUpperCase())) {
    orderModeBadge = `DINE-IN • ${rawTableLabel}`;
  }

  return `
    <div class="thermal-receipt" style="font-family:${fontFamily};color:#000;padding:2px 0;line-height:1.25;box-sizing:border-box;">
      <!-- Restaurant Header (Centered) -->
      <div style="text-align:center;border-bottom:1.5px dashed #000;padding-bottom:5px;margin-bottom:5px;">
        ${showLogo && logoUrl ? `<img src="${logoUrl}" style="max-height:${logoMaxHeight};max-width:160px;object-fit:contain;margin-bottom:3px;" />` : ''}
        <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">${restaurant.name || 'THE RESTAURANT'}</div>
        ${restaurant.address ? `<div style="font-size:11px;color:#222;margin-top:2px;">${restaurant.address}</div>` : ''}
        ${restaurant.phone ? `<div style="font-size:11px;color:#222;">Ph: ${restaurant.phone}</div>` : ''}
        ${showGst && gstNumber ? `<div style="font-size:11px;font-weight:bold;margin-top:2px;">GSTIN: ${gstNumber}</div>` : ''}
        ${showFssai && fssaiNumber ? `<div style="font-size:10px;color:#333;">FSSAI: ${fssaiNumber}</div>` : ''}
        ${cfg.receiptHeader ? `<div style="font-size:10px;font-style:italic;margin-top:2px;color:#444;">${cfg.receiptHeader}</div>` : ''}
        <div style="font-size:11px;font-weight:bold;margin-top:4px;background:#000;color:#fff;display:inline-block;padding:2px 8px;border-radius:2px;">
          ${billTitle}
        </div>
      </div>

      <!-- Order Metadata -->
      <div style="font-size:11px;margin-bottom:5px;border-bottom:1px dashed #000;padding-bottom:4px;">
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:12px;">
          <span>ORDER #${order.orderNumber}</span>
          <span>${orderModeBadge}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#222;margin-top:2px;">
          <span>Date: ${formattedDate}</span>
          ${showCustomer && order.customerName ? `<span>Guest: ${order.customerName}</span>` : ''}
        </div>
        ${showCustomer && order.customerPhone ? `<div style="color:#222;">Phone: ${order.customerPhone}</div>` : ''}
      </div>

      <!-- Line Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-top:3px;">
        <thead>
          <tr style="border-bottom:1.5px solid #000;text-align:left;font-size:11px;font-weight:bold;">
            <th style="padding:2px 0;width:24px;">QTY</th>
            <th style="padding:2px 0;">ITEM</th>
            <th style="padding:2px 0;text-align:right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${customerNoteHtml}

      <!-- Financial Totals Section -->
      <div style="border-top:1.5px solid #000;margin-top:5px;padding-top:4px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span>Subtotal</span>
          <span style="font-family:monospace;font-weight:bold;">${formatPrintCurrency(subtotal, currency)}</span>
        </div>

        ${taxBreakdownHtml}

        ${order.discount ? `
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#15803d;margin-top:2px;">
            <span>Discount</span>
            <span style="font-family:monospace;">-${formatPrintCurrency(order.discount, currency)}</span>
          </div>
        ` : ''}

        ${order.serviceCharge ? `
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
            <span>Service Charge</span>
            <span style="font-family:monospace;">${formatPrintCurrency(order.serviceCharge, currency)}</span>
          </div>
        ` : ''}

        ${order.roundOff && order.roundOff !== 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#222;margin-top:2px;">
            <span>Round Off</span>
            <span style="font-family:monospace;">${order.roundOff > 0 ? '+' : '-'}${formatPrintCurrency(Math.abs(order.roundOff), currency)}</span>
          </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;border-top:2px solid #000;border-bottom:2px solid #000;margin-top:4px;padding:4px 0;">
          <span>${isPaid ? 'TOTAL PAID' : 'TOTAL PAYABLE'}</span>
          <span style="font-family:monospace;">${formatPrintCurrency(total, currency)}</span>
        </div>
      </div>

      <!-- Payment Status & Method -->
      ${showPayment ? `
        <div style="margin-top:5px;text-align:center;font-size:11px;font-weight:bold;">
          ${(() => {
            const rawMethod = (order.paymentMethod || 'CASH').toUpperCase();
            const methodLabel =
              rawMethod === 'UPI'
                ? 'UPI'
                : rawMethod === 'CARD'
                ? 'CARD'
                : rawMethod === 'RAZORPAY'
                ? 'ONLINE'
                : 'CASH';
            return isPaid ? `✓ PAID (${methodLabel})` : 'STATUS: PAYMENT DUE';
          })()}
        </div>
      ` : ''}

      <!-- Dynamic QR Code for Postpaid Bills -->
      ${paymentQrHtml}

      <!-- Counter Copy Signature Footer -->
      ${isCounterCopy ? `
        <div style="margin-top:8px;padding-top:4px;border-top:1px dashed #666;font-size:10px;display:flex;justify-content:space-between;color:#222;">
          <span>Cashier: _________</span>
          <span>Sign: _________</span>
        </div>
      ` : ''}

      <!-- Footer Message -->
      <div style="text-align:center;border-top:1px dashed #aaa;margin-top:6px;padding-top:4px;font-size:10px;color:#333;">
        <div>${cfg.receiptFooter || restaurant.footerMessage || 'Thank you for dining with us! Please visit again.'}</div>
        <div style="font-size:9px;color:#666;margin-top:2px;">Powered by Pixora</div>
      </div>
    </div>
  `;
}

/**
 * Generates Formal A4 Tax Invoice HTML (for laser printing / PDF downloads)
 */
export function generateFormalA4InvoiceHtml(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {}
): string {
  const formattedDate = formatPrintDate(order.createdAt);
  const currency = restaurant.currency || 'INR';
  const isPaid = order.paymentStatus === 'PAID';
  const tableLabel = getTableString(order);

  const subtotal = order.subtotal ?? 0;
  const tax = order.tax ?? 0;
  const total = order.total ?? subtotal + tax;

  const itemsRows = order.items
    .map((item, idx) => {
      const unitPrice = item.unitPriceSnapshot ?? item.price ?? 0;
      const lineTotal = unitPrice * item.quantity;
      return `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 12px;text-align:center;color:#64748b;">${idx + 1}</td>
        <td style="padding:10px 12px;font-weight:600;color:#0f172a;">
          ${item.nameSnapshot || item.name}
          ${item.selectedAddOns?.length ? `<div style="font-size:12px;color:#64748b;font-weight:normal;">+ ${item.selectedAddOns.map(a => a.name).join(', ')}</div>` : ''}
        </td>
        <td style="padding:10px 12px;text-align:center;font-weight:600;">${item.quantity}</td>
        <td style="padding:10px 12px;text-align:right;font-family:monospace;">${formatPrintCurrency(unitPrice, currency)}</td>
        <td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:bold;">${formatPrintCurrency(lineTotal, currency)}</td>
      </tr>
    `;
    })
    .join('');

  return `
    <div style="max-width:800px;margin:0 auto;font-family:Inter,Segoe UI,sans-serif;color:#0f172a;background:#fff;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:16px;">
        <div>
          <h1 style="font-size:24px;font-weight:900;margin:0;letter-spacing:-0.5px;">${restaurant.name || 'RESTAURANT'}</h1>
          <p style="font-size:13px;color:#64748b;margin:4px 0 0 0;">${restaurant.address || ''}</p>
          <p style="font-size:13px;color:#64748b;margin:2px 0 0 0;">Phone: ${restaurant.phone || 'N/A'}</p>
          ${restaurant.gstNumber ? `<p style="font-size:13px;color:#0f172a;font-weight:bold;margin:2px 0 0 0;">GSTIN: ${restaurant.gstNumber}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px;font-weight:900;color:#0f172a;">TAX INVOICE</div>
          <div style="font-size:13px;font-weight:bold;color:#64748b;margin-top:2px;">INV #${order.orderNumber}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Date: ${formattedDate}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Station: ${tableLabel}</div>
        </div>
      </div>

      <div style="margin:20px 0;padding:12px;background:#f8fafc;border-radius:8px;display:flex;justify-content:space-between;font-size:13px;">
        <div>
          <span style="color:#64748b;">Customer:</span>
          <strong>${order.customerName || 'Walk-in Guest'}</strong>
          ${order.customerPhone ? `<span style="color:#64748b;margin-left:8px;">(${order.customerPhone})</span>` : ''}
        </div>
        <div>
          <span style="color:#64748b;">Payment Status:</span>
          <strong style="color:${isPaid ? '#16a34a' : '#ea580c'};">${isPaid ? `PAID (${(order.paymentMethod || 'CASH').toUpperCase()})` : 'DUE'}</strong>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;text-align:left;">
            <th style="padding:10px 12px;width:40px;text-align:center;">#</th>
            <th style="padding:10px 12px;">Item Description</th>
            <th style="padding:10px 12px;width:60px;text-align:center;">Qty</th>
            <th style="padding:10px 12px;width:100px;text-align:right;">Price</th>
            <th style="padding:10px 12px;width:110px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:24px;">
        <div style="width:280px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;color:#64748b;">
            <span>Subtotal:</span>
            <span style="font-family:monospace;color:#0f172a;font-weight:600;">${formatPrintCurrency(subtotal, currency)}</span>
          </div>
          ${tax > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:4px 0;color:#64748b;">
              <span>Taxes (GST):</span>
              <span style="font-family:monospace;color:#0f172a;font-weight:600;">${formatPrintCurrency(tax, currency)}</span>
            </div>
          ` : ''}
          ${order.discount ? `
            <div style="display:flex;justify-content:space-between;padding:4px 0;color:#16a34a;">
              <span>Discount:</span>
              <span style="font-family:monospace;font-weight:600;">-${formatPrintCurrency(order.discount, currency)}</span>
            </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #0f172a;font-size:16px;font-weight:900;margin-top:8px;">
            <span>Total:</span>
            <span style="font-family:monospace;">${formatPrintCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
        Thank you for dining with us • Powered by Pixora POS
      </div>
    </div>
  `;
}

/**
 * Triggers thermal receipt printing using a dedicated offscreen iframe with strict thermal CSS
 */
export function triggerPrintHtml(htmlBody: string, paperWidth: PaperWidth = '80mm'): void {
  const widthCss = paperWidth === '58mm' ? '48mm' : paperWidth === 'A4' ? '100%' : '72mm';
  const pageCss = paperWidth === '58mm' ? '58mm auto' : paperWidth === 'A4' ? 'A4' : '80mm auto';

  const fullDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Receipt</title>
        <meta charset="utf-8" />
        <style>
          @page {
            margin: 0;
            size: ${pageCss};
          }
          *, *:before, *:after {
            box-sizing: border-box;
          }
          html, body {
            margin: 0 auto;
            padding: ${paperWidth === 'A4' ? '20px' : '2mm 0'};
            width: ${widthCss};
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .thermal-receipt, .kot-ticket {
            width: 100%;
            margin: 0 auto;
          }
          @media print {
            html, body {
              width: ${widthCss} !important;
              margin: 0 auto !important;
              padding: 0 !important;
              height: auto !important;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          }
        </style>
      </head>
      <body>
        ${htmlBody}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Failed to access print iframe document');
    return;
  }

  doc.open();
  doc.write(fullDocument);
  doc.close();

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Ignore cleanup error if already removed
    }
  }, 2000);
}

export const LOCAL_PRINT_AGENT_URL = 'http://127.0.0.1:18181';

export interface AgentStatusResult {
  isOnline: boolean;
  version?: string;
  uptimeSeconds?: number;
}

/**
 * Checks if the ScanMenu Local Print Agent is active on the cashier POS machine
 */
export async function checkLocalPrintAgentStatus(): Promise<AgentStatusResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${LOCAL_PRINT_AGENT_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, version: data.version, uptimeSeconds: data.uptimeSeconds };
    }
    return { isOnline: false };
  } catch {
    return { isOnline: false };
  }
}

/**
 * Triggers a test print via the Local Print Agent to the local LAN thermal printer
 */
export async function testLocalPrintAgent(
  ip: string,
  port: number = 9100,
  paperWidth: PaperWidth = '80mm',
  restaurantName: string = 'Demo Cafe',
  printerName: string = 'Counter Printer'
): Promise<{ success: boolean; message?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${LOCAL_PRINT_AGENT_URL}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip,
        port,
        paperWidth: paperWidth === '58mm' ? '58mm' : '80mm',
        restaurantName,
        printerName,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    return { success: res.ok && data.success, message: data.message || data.error };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reach local print agent on 127.0.0.1:18181' };
  }
}

/**
 * Centralized entry point for printing tickets and customer bills
 * Automatically utilizes direct network ESC/POS thermal printing via the Local Print Agent
 * if active, and seamlessly falls back to 80mm browser thermal printing.
 */
export async function printOrderTicket(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  type: TicketPrintType = 'CUSTOMER',
  paperWidth?: PaperWidth
): Promise<PrintResult> {
  const printerCfg = restaurant.printerConfig || restaurant.settings?.printerConfig || {};
  const resolvedPaperWidth: PaperWidth =
    paperWidth ||
    restaurant.paperWidth ||
    printerCfg.paperWidth ||
    '80mm';

  const isKot = type === 'KITCHEN';
  const targetIp = isKot ? printerCfg.kitchenPrinterIp : printerCfg.counterPrinterIp;
  const targetPort = isKot ? printerCfg.kitchenPrinterPort || 9100 : printerCfg.counterPrinterPort || 9100;
  const isSilentPrinting = printerCfg.silentPrintingEnabled !== false;

  // 1. Direct Network ESC/POS Print Path via Local Print Agent (127.0.0.1:18181)
  if (isSilentPrinting && targetIp && type !== 'A4_INVOICE') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const agentRes = await fetch(`${LOCAL_PRINT_AGENT_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ip: targetIp,
          port: targetPort,
          paperWidth: resolvedPaperWidth === '58mm' ? '58mm' : '80mm',
          order,
          restaurantInfo: restaurant,
          kotNotes: printerCfg.kotNotes,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.success) {
          return { success: true, method: 'LAN', message: agentData.message || 'Printed via Local Print Agent' };
        }
      }
    } catch {
      // Local agent offline or printer unreachable -> automatic graceful fallback to browser thermal print
      console.info('[PrintDispatcher] Local Print Agent not reachable on 127.0.0.1:18181. Falling back to browser thermal print.');
    }
  }

  // 2. Browser Thermal Printing Fallback
  let content = '';

  if (type === 'A4_INVOICE') {
    content = generateFormalA4InvoiceHtml(order, restaurant);
    triggerPrintHtml(content, 'A4');
    return { success: true, method: 'BROWSER', message: 'Formal A4 invoice sent to browser print' };
  }

  if (type === 'KITCHEN') {
    content = generateKOTHtml(order, restaurant, resolvedPaperWidth);
  } else if (type === 'COUNTER') {
    content = generateCounterBillHtml(order, restaurant, resolvedPaperWidth, true);
  } else if (type === 'CUSTOMER') {
    content = generateCounterBillHtml(order, restaurant, resolvedPaperWidth, false);
  } else {
    // BOTH (Kitchen KOT + Counter Bill)
    const kot = generateKOTHtml(order, restaurant, resolvedPaperWidth);
    const bill = generateCounterBillHtml(order, restaurant, resolvedPaperWidth, true);
    content = `
      ${kot}
      <div class="page-break" style="page-break-after: always; break-after: page; height: 1px; margin: 12px 0;"></div>
      ${bill}
    `;
  }

  triggerPrintHtml(content, resolvedPaperWidth);
  return { success: true, method: 'BROWSER', message: 'Thermal receipt sent to browser print' };
}
