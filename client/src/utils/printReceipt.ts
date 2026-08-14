export type PaperWidth = '80mm' | '58mm' | 'A4';
export type TicketPrintType = 'KITCHEN' | 'COUNTER' | 'CUSTOMER' | 'BOTH';
export type ReceiptTheme = 'classic' | 'modern' | 'compact';

export interface PrintItem {
  nameSnapshot?: string;
  name?: string;
  unitPriceSnapshot?: number;
  price?: number;
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
  total?: number;
  paymentStatus?: 'PENDING' | 'PAID' | string;
  paymentMethod?: string;
  serverName?: string;
}

export interface RestaurantPrintInfo {
  name?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
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
      upiId?: string;
      activeMode?: 'PREPAID' | 'POSTPAID' | 'HYBRID';
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
  };
}

/**
 * Formats monetary amounts
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
 * Formats dates for tickets
 */
export function formatPrintDate(dateStr?: string | Date): string {
  if (!dateStr) return new Date().toLocaleString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString('en-IN', {
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
  const cfg = restaurant.printerConfig || {};
  const theme = cfg.templateTheme || 'classic';

  const itemsHtml = order.items.map((item, idx) => {
    const itemName = item.nameSnapshot || item.name || `Item #${idx + 1}`;
    const addOns = item.selectedAddOns && item.selectedAddOns.length > 0
      ? `<div style="font-size:11px;color:#333;padding-left:14px;margin-top:2px;">+ ${item.selectedAddOns.map(a => a.name).join(', ')}</div>`
      : '';
    const note = item.specialInstructions
      ? `<div style="font-size:11px;font-style:italic;color:#b45309;padding-left:14px;margin-top:2px;font-weight:bold;">⚡ Note: ${item.specialInstructions}</div>`
      : '';

    return `
      <tr style="border-bottom:1px dashed #ccc;">
        <td style="padding:6px 0;vertical-align:top;font-weight:900;font-size:17px;width:38px;">[${item.quantity}x]</td>
        <td style="padding:6px 0;vertical-align:top;">
          <div style="font-size:14px;font-weight:bold;color:#000;">${itemName}</div>
          ${addOns}
          ${note}
        </td>
      </tr>
    `;
  }).join('');

  const customerNoteHtml = order.customerNote ? `
    <div style="margin-top:8px;padding:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:12px;">
      <strong>⚠️ Customer Special Request:</strong> ${order.customerNote}
    </div>
  ` : '';

  const kotNotesHtml = cfg.kotNotes ? `
    <div style="margin-top:8px;padding:6px;background:#f1f5f9;border-left:3px solid #64748b;font-size:11px;font-style:italic;">
      ${cfg.kotNotes}
    </div>
  ` : '';

  const fontFamily = theme === 'modern' ? 'Arial, Helvetica, sans-serif' : "'Courier New', Courier, monospace";

  return `
    <div class="kot-ticket" style="font-family:${fontFamily};color:#000;padding:8px 0;line-height:1.3;">
      <!-- Strict KOT Header (No Logo in Kitchen) -->
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;">
        <div style="font-size:16px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">*** KITCHEN ORDER TICKET (KOT) ***</div>
        <div style="font-size:24px;font-weight:900;margin-top:4px;">ORDER #${order.orderNumber}</div>
        <div style="font-size:13px;font-weight:bold;margin-top:4px;background:#000;color:#fff;display:inline-block;padding:3px 10px;border-radius:4px;">
          ${orderModeLabel} ${orderModeLabel === 'DINE_IN' ? `• ${tableLabel}` : ''}
        </div>
      </div>

      <div style="font-size:11px;margin-bottom:6px;display:flex;justify-content:space-between;border-bottom:1px dashed #ccc;padding-bottom:4px;">
        <span><strong>Time:</strong> ${formattedDate}</span>
        ${cfg.kotShowServerName !== false && order.serverName ? `<span><strong>Server:</strong> ${order.serverName}</span>` : ''}
      </div>

      ${customerNoteHtml}

      <table style="width:100%;border-collapse:collapse;margin-top:6px;">
        <thead>
          <tr style="border-bottom:2px solid #000;text-align:left;font-size:12px;">
            <th style="padding:4px 0;width:38px;">QTY</th>
            <th style="padding:4px 0;">ITEM & PREPARATION</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${kotNotesHtml}

      <div style="text-align:center;border-top:2px solid #000;margin-top:10px;padding-top:6px;font-size:11px;font-weight:bold;">
        *** END OF KOT ***
      </div>
    </div>
  `;
}

/**
 * Generates Customer Bill or Counter Bill / Tax Invoice HTML snippet
 * Handles PREPAID vs POSTPAID and Payment QR Code generation
 */
export function generateCounterBillHtml(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  paperWidth: PaperWidth = '80mm',
  isCounterCopy: boolean = false
): string {
  const tableLabel = getTableString(order);
  const orderModeLabel = (order.orderMode || 'DINE_IN').toUpperCase();
  const formattedDate = formatPrintDate(order.createdAt);
  const currency = restaurant.currency || 'INR';
  const cfg = restaurant.printerConfig || {};

  const theme: ReceiptTheme = cfg.templateTheme || 'classic';
  const showLogo = cfg.showLogo !== false;
  const logoUrl = cfg.logoUrl || restaurant.logoUrl || restaurant.branding?.logoUrl;
  const showGst = cfg.showGstNumber !== false;
  const gstNumber = cfg.gstNumber || restaurant.gstNumber || restaurant.settings?.paymentConfig?.gstNumber;
  const showFssai = cfg.showFssai !== false;
  const fssaiNumber = cfg.fssaiNumber;
  const showCustomer = cfg.showCustomerInfo !== false;
  const showTaxBreakup = cfg.showTaxBreakup !== false;
  const showPayment = cfg.showPaymentMode !== false;
  const showPaymentQr = cfg.showPaymentQr !== false;

  const isPaid = order.paymentStatus === 'PAID';

  const logoMaxHeight = paperWidth === '58mm' ? '36px' : paperWidth === 'A4' ? '65px' : '48px';
  const fontFamily = theme === 'modern' ? 'Arial, Helvetica, sans-serif' : "'Courier New', Courier, monospace";

  const itemsHtml = order.items.map((item, idx) => {
    const itemName = item.nameSnapshot || item.name || `Item #${idx + 1}`;
    const unitPrice = item.unitPriceSnapshot ?? item.price ?? 0;
    const itemTotal = unitPrice * item.quantity;

    let addOnsPrice = 0;
    const addOnLines = (item.selectedAddOns || []).map(a => {
      const p = a.priceDelta ?? a.price ?? 0;
      addOnsPrice += p * item.quantity;
      return `<div style="font-size:10px;color:#555;padding-left:6px;">+ ${a.name} (${formatPrintCurrency(p, currency)})</div>`;
    }).join('');

    const lineTotal = itemTotal + addOnsPrice;

    return `
      <tr style="border-bottom:1px dashed ${theme === 'modern' ? '#e2e8f0' : '#ccc'};">
        <td style="padding:4px 0;vertical-align:top;font-size:12px;font-weight:bold;width:24px;">${item.quantity}</td>
        <td style="padding:4px 0;vertical-align:top;font-size:12px;">
          <div>${itemName}</div>
          ${addOnLines}
        </td>
        <td style="padding:4px 0;vertical-align:top;font-size:12px;text-align:right;font-family:monospace;white-space:nowrap;">
          ${formatPrintCurrency(lineTotal, currency)}
        </td>
      </tr>
    `;
  }).join('');

  const subtotal = order.subtotal ?? 0;
  const tax = order.tax ?? 0;
  const total = order.total ?? (subtotal + tax);
  const totalInRupees = (total > 100 && Number.isInteger(total) ? total / 100 : total).toFixed(2);

  // Compute CGST and SGST split (e.g. 2.5% + 2.5% on 5% GST)
  let taxBreakdownHtml = '';
  if (showTaxBreakup && tax > 0) {
    if (order.taxBreakdown && order.taxBreakdown.length > 0) {
      taxBreakdownHtml = order.taxBreakdown.map(tb => `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;margin-top:2px;">
          <span>${tb.name} ${tb.percentage ? `(${tb.percentage}%)` : ''}</span>
          <span style="font-family:monospace;">${formatPrintCurrency(tb.amount, currency)}</span>
        </div>
      `).join('');
    } else {
      const halfTax = Math.round(tax / 2);
      const otherHalf = tax - halfTax;
      taxBreakdownHtml = `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;margin-top:2px;">
          <span>CGST</span>
          <span style="font-family:monospace;">${formatPrintCurrency(halfTax, currency)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;margin-top:2px;">
          <span>SGST</span>
          <span style="font-family:monospace;">${formatPrintCurrency(otherHalf, currency)}</span>
        </div>
      `;
    }
  } else if (tax > 0) {
    taxBreakdownHtml = `
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;margin-top:2px;">
        <span>GST / Tax</span>
        <span style="font-family:monospace;">${formatPrintCurrency(tax, currency)}</span>
      </div>
    `;
  }

  // UPI Payment QR Code for POSTPAID / UNPAID customer bills
  let paymentQrHtml = '';
  if (!isPaid && !isCounterCopy && showPaymentQr) {
    const upiId = cfg.upiId || (restaurant as any).upiId || restaurant.settings?.paymentConfig?.upiId;
    const paymentQrUrl = cfg.paymentQrUrl;

    if (paymentQrUrl) {
      paymentQrHtml = `
        <div style="text-align:center;margin-top:8px;padding:6px;border:1px dashed #000;border-radius:6px;">
          <div style="font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:4px;">SCAN & PAY VIA UPI</div>
          <img src="${paymentQrUrl}" style="width:110px;height:110px;margin:0 auto;display:block;object-fit:contain;" />
          <div style="font-size:10px;font-weight:bold;margin-top:3px;">GPay • PhonePe • Paytm • BHIM</div>
        </div>
      `;
    } else if (upiId) {
      const storeName = restaurant.name || 'Restaurant';
      const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${totalInRupees}&cu=INR&tn=${encodeURIComponent(`Bill #${order.orderNumber}`)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(upiUri)}`;

      paymentQrHtml = `
        <div style="text-align:center;margin-top:8px;padding:6px;border:1px dashed #000;border-radius:6px;">
          <div style="font-size:11px;font-weight:900;text-transform:uppercase;margin-bottom:4px;">SCAN & PAY VIA UPI</div>
          <img src="${qrApiUrl}" style="width:110px;height:110px;margin:0 auto;display:block;" />
          <div style="font-size:10px;font-weight:bold;margin-top:3px;">GPay • PhonePe • Paytm • BHIM</div>
          <div style="font-size:9px;color:#444;font-family:monospace;margin-top:2px;">UPI ID: ${upiId}</div>
        </div>
      `;
    }
  }

  // Bill Heading according to PREPAID / POSTPAID / COUNTER COPY
  const billTitle = isCounterCopy
    ? 'COUNTER / AUDIT RECEIPT'
    : isPaid
    ? 'TAX INVOICE'
    : 'BILL FOR PAYMENT (PROFORMA)';

  return `
    <div class="counter-bill" style="font-family:${fontFamily};color:#000;padding:6px 0;line-height:1.3;">
      <!-- Restaurant Header & Branding -->
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:6px;">
        ${showLogo && logoUrl ? `<img src="${logoUrl}" style="max-height:${logoMaxHeight};max-width:180px;object-fit:contain;margin-bottom:4px;" />` : ''}
        <div style="font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">${restaurant.name || 'THE RESTAURANT'}</div>
        ${restaurant.address ? `<div style="font-size:11px;color:#222;margin-top:2px;">${restaurant.address}</div>` : ''}
        ${restaurant.phone ? `<div style="font-size:11px;color:#222;">Ph: ${restaurant.phone}</div>` : ''}
        ${showGst && gstNumber ? `<div style="font-size:11px;font-weight:bold;margin-top:2px;">GSTIN: ${gstNumber}</div>` : ''}
        ${showFssai && fssaiNumber ? `<div style="font-size:10px;color:#333;">FSSAI: ${fssaiNumber}</div>` : ''}
        ${cfg.receiptHeader ? `<div style="font-size:10px;font-style:italic;margin-top:3px;color:#444;">${cfg.receiptHeader}</div>` : ''}
        <div style="font-size:11px;font-weight:bold;margin-top:4px;background:#000;color:#fff;display:inline-block;padding:2px 8px;border-radius:2px;">
          ${billTitle}
        </div>
      </div>

      <!-- Invoice Details -->
      <div style="font-size:11px;margin-bottom:6px;border-bottom:1px solid #000;padding-bottom:5px;">
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:12px;">
          <span>ORDER #${order.orderNumber}</span>
          <span>${orderModeLabel} ${orderModeLabel === 'DINE_IN' ? `(${tableLabel})` : ''}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#333;margin-top:2px;">
          <span>Date: ${formattedDate}</span>
          ${showCustomer && order.customerName ? `<span>Guest: ${order.customerName}</span>` : ''}
        </div>
        ${showCustomer && order.customerPhone ? `<div style="color:#333;">Phone: ${order.customerPhone}</div>` : ''}
      </div>

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-top:4px;">
        <thead>
          <tr style="border-bottom:1px solid #000;text-align:left;font-size:11px;font-weight:bold;">
            <th style="padding:3px 0;width:24px;">QTY</th>
            <th style="padding:3px 0;">DESCRIPTION</th>
            <th style="padding:3px 0;text-align:right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals & Taxes Section -->
      <div style="border-top:1.5px solid #000;margin-top:6px;padding-top:4px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span>Subtotal</span>
          <span style="font-family:monospace;font-weight:bold;">${formatPrintCurrency(subtotal, currency)}</span>
        </div>

        ${taxBreakdownHtml}

        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;border-top:2px solid #000;border-bottom:2px solid #000;margin-top:5px;padding:5px 0;">
          <span>${isPaid ? 'TOTAL PAID' : 'PAYABLE AMOUNT'}</span>
          <span style="font-family:monospace;">${formatPrintCurrency(total, currency)}</span>
        </div>
      </div>

      <!-- Payment Status & Method -->
      ${showPayment ? `
        <div style="margin-top:6px;text-align:center;font-size:11px;font-weight:bold;">
          ${isPaid ? `✓ PAID (${order.paymentMethod || 'CASH'})` : 'STATUS: PAYMENT DUE'}
        </div>
      ` : ''}

      <!-- Dynamic QR Code for Postpaid Unpaid Bills -->
      ${paymentQrHtml}

      <!-- Counter Copy Signature Footer -->
      ${isCounterCopy ? `
        <div style="margin-top:10px;padding-top:6px;border-top:1px dashed #999;font-size:10px;display:flex;justify-content:space-between;color:#333;">
          <span>Cashier: ___________</span>
          <span>Sign: ___________</span>
        </div>
      ` : ''}

      <!-- Footer Message -->
      <div style="text-align:center;border-top:1px dashed #ccc;margin-top:8px;padding-top:5px;font-size:11px;color:#444;">
        ${cfg.receiptFooter || restaurant.footerMessage || 'Thank you for dining with us! Please visit again.'}
        <div style="font-size:9px;color:#777;margin-top:3px;">Powered by Pixora QR</div>
      </div>
    </div>
  `;
}

/**
 * Triggers printing using a hidden offscreen iframe to prevent popup blocker blocking
 */
export function triggerPrintHtml(htmlBody: string, paperWidth: PaperWidth = '80mm'): void {
  const widthCss = paperWidth === '58mm' ? '210px' : paperWidth === '80mm' ? '300px' : '100%';

  const fullDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Order</title>
        <meta charset="utf-8" />
        <style>
          @page {
            margin: 0;
            size: ${paperWidth === 'A4' ? 'A4' : 'auto'};
          }
          body {
            margin: 0;
            padding: ${paperWidth === 'A4' ? '20px' : '8px'};
            width: ${widthCss};
            margin-left: auto;
            margin-right: auto;
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
          }
          @media print {
            body {
              width: ${widthCss} !important;
              padding: 0 !important;
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
            }, 150);
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
      // Ignore if already removed
    }
  }, 2000);
}

/**
 * Exported entry point for printing tickets
 */
export function printOrderTicket(
  order: PrintOrderData,
  restaurant: RestaurantPrintInfo = {},
  type: TicketPrintType = 'BOTH',
  paperWidth?: PaperWidth
): void {
  const resolvedPaperWidth: PaperWidth =
    paperWidth ||
    restaurant.paperWidth ||
    restaurant.printerConfig?.paperWidth ||
    '80mm';

  let content = '';

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
      <div class="page-break" style="page-break-after: always; break-after: page; height: 1px; margin: 15px 0;"></div>
      ${bill}
    `;
  }

  triggerPrintHtml(content, resolvedPaperWidth);
}
