import net from 'net';
import { EscPosBuilder } from '../utils/escposBuilder';

export class PrinterService {
  /**
   * Transmits raw ESC/POS binary buffer to a network thermal printer via TCP socket
   */
  async printRawTcp(ip: string, port: number = 9100, buffer: Buffer, timeoutMs: number = 5000): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let isResolved = false;

      client.setTimeout(timeoutMs);

      client.connect(port, ip, () => {
        client.write(buffer, () => {
          client.end();
          if (!isResolved) {
            isResolved = true;
            resolve({ success: true, message: `Successfully sent ${buffer.length} bytes to ${ip}:${port}` });
          }
        });
      });

      client.on('timeout', () => {
        client.destroy();
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Connection to printer at ${ip}:${port} timed out after ${timeoutMs}ms`));
        }
      });

      client.on('error', (err) => {
        client.destroy();
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Failed to connect to printer at ${ip}:${port}: ${err.message}`));
        }
      });
    });
  }

  /**
   * Helper to format currency for thermal printers in standard ASCII format
   */
  formatAmount(amount: number = 0): string {
    const inUnits = amount > 100 && Number.isInteger(amount) ? amount / 100 : amount;
    return `Rs. ${inUnits.toFixed(2)}`;
  }

  /**
   * Generates and prints a test ticket to verify network printer communication
   */
  async printTestSlip(
    ip: string,
    port: number = 9100,
    paperWidth: '80mm' | '58mm' = '80mm',
    restaurantName: string = 'Pixora POS',
    printerName: string = 'Counter Printer'
  ): Promise<any> {
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
      .feed(1)
      .cut(false);

    const buffer = builder.toBuffer();
    return await this.printRawTcp(ip, port, buffer);
  }

  /**
   * Formats and prints a Customer Bill / Tax Invoice on 80mm/58mm thermal POS printers
   */
  async printCustomerBill(
    ip: string,
    port: number = 9100,
    order: {
      orderNumber: number;
      orderMode?: string;
      tableName?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        name: string;
        nameSnapshot?: string;
        quantity: number;
        price?: number;
        unitPriceSnapshot?: number;
        isCombo?: boolean;
        comboItemsSnapshot?: Array<{ name: string; quantity: number }>;
        selectedAddOns?: Array<{ name: string; priceDelta?: number; price?: number }>;
        specialInstructions?: string;
      }>;
      subtotal?: number;
      tax?: number;
      taxBreakdown?: Array<{ name: string; percentage?: number; amount: number }>;
      discount?: number;
      serviceCharge?: number;
      roundOff?: number;
      total?: number;
      paymentStatus?: string;
      paymentMethod?: string;
      createdAt?: Date | string;
    },
    restaurant: {
      name?: string;
      address?: string;
      phone?: string;
      gstNumber?: string;
      fssaiNumber?: string;
      receiptHeader?: string;
      receiptFooter?: string;
    } = {},
    paperWidth: '80mm' | '58mm' = '80mm'
  ): Promise<any> {
    const builder = new EscPosBuilder({ paperWidth });
    const isPaid = order.paymentStatus === 'PAID';

    // 1. Restaurant Header (Centered)
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
      .line(isPaid ? 'TAX INVOICE' : 'BILL FOR PAYMENT (PROFORMA)')
      .bold(false)
      .divider('-');

    // 2. Order Metadata (Left & Right)
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

    // 3. Line Items Column Header
    builder
      .bold(true)
      .twoColumnRow('QTY  ITEM', 'AMOUNT')
      .bold(false)
      .divider('-');

    // 4. Items List with Add-ons & Notes
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
          addOnDescriptions.push(`${a.name} (${this.formatAmount(delta)})`);
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
        this.formatAmount(totalLinePrice),
        addOnDescriptions,
        item.specialInstructions
      );
    }

    builder.divider('-');

    // 5. Totals & Tax Breakdown
    const subtotal = order.subtotal ?? 0;
    const tax = order.tax ?? 0;
    const total = order.total ?? (subtotal + tax);

    builder.twoColumnRow('Subtotal', this.formatAmount(subtotal));

    if (tax > 0) {
      if (order.taxBreakdown && order.taxBreakdown.length > 0) {
        for (const tb of order.taxBreakdown) {
          builder.twoColumnRow(`${tb.name}${tb.percentage ? ` (${tb.percentage}%)` : ''}`, this.formatAmount(tb.amount));
        }
      } else {
        const halfTax = Math.round(tax / 2);
        const otherHalf = tax - halfTax;
        builder.twoColumnRow('CGST 2.5%', this.formatAmount(halfTax));
        builder.twoColumnRow('SGST 2.5%', this.formatAmount(otherHalf));
      }
    }

    if (order.discount && order.discount > 0) {
      builder.twoColumnRow('Discount', `-${this.formatAmount(order.discount)}`);
    }

    if (order.serviceCharge && order.serviceCharge > 0) {
      builder.twoColumnRow('Service Charge', this.formatAmount(order.serviceCharge));
    }

    if (order.roundOff && order.roundOff !== 0) {
      const sign = order.roundOff > 0 ? '+' : '-';
      builder.twoColumnRow('Round Off', `${sign}${this.formatAmount(Math.abs(order.roundOff))}`);
    }

    // Grand Total (Prominent)
    builder
      .doubleDivider()
      .bold(true)
      .doubleHeight(true)
      .twoColumnRow(isPaid ? 'TOTAL PAID' : 'TOTAL PAYABLE', this.formatAmount(total))
      .doubleHeight(false)
      .bold(false)
      .doubleDivider();

    // 6. Payment Method & Status
    const method = (order.paymentMethod || 'CASH').toUpperCase();
    builder
      .alignCenter()
      .bold(true)
      .line(isPaid ? `[OK] PAID (${method})` : 'STATUS: PAYMENT DUE')
      .bold(false)
      .feed(1);

    // 7. Footer
    builder
      .line(restaurant.receiptFooter || 'Thank you for dining with us!')
      .line('Powered by Pixora')
      .feed(2)
      .cut(false);

    const buffer = builder.toBuffer();
    return await this.printRawTcp(ip, port, buffer);
  }

  /**
   * Formats and prints a Kitchen Order Ticket (KOT)
   */
  async printKOT(
    ip: string,
    port: number = 9100,
    order: {
      orderNumber: number;
      tableName?: string;
      orderMode?: string;
      items: Array<{ name: string; quantity: number; specialInstructions?: string; selectedAddOns?: any[] }>;
      customerNote?: string;
      createdAt?: Date;
    },
    paperWidth: '80mm' | '58mm' = '80mm'
  ): Promise<any> {
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
      .twoColumnRow('Time:', new Date(order.createdAt || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      .divider('-');

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
      builder.divider('-');
      builder.line(`NOTE: ${order.customerNote}`);
    }

    builder.cut(false);
    return await this.printRawTcp(ip, port, builder.toBuffer());
  }
}

export const printerService = new PrinterService();
export default printerService;
