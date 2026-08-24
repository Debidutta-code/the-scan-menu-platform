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
   * Generates and prints a test ticket to verify network printer communication
   */
  async printTestSlip(ip: string, port: number = 9100, paperWidth: '80mm' | '58mm' = '80mm', restaurantName: string = 'Pixora POS'): Promise<any> {
    const builder = new EscPosBuilder({ paperWidth });

    builder
      .alignCenter()
      .doubleSize(true)
      .bold(true)
      .line(restaurantName)
      .doubleSize(false)
      .bold(false)
      .line('*** PRINTER TEST SLIP ***')
      .divider()
      .alignLeft()
      .twoColumnRow('Printer IP:', ip)
      .twoColumnRow('Port:', String(port))
      .twoColumnRow('Paper Width:', paperWidth)
      .twoColumnRow('Timestamp:', new Date().toLocaleString('en-IN'))
      .divider()
      .alignCenter()
      .bold(true)
      .line('ESC/POS NETWORK PRINT TEST PASSED')
      .bold(false)
      .line('Zero-Click Silent Printing Ready')
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
