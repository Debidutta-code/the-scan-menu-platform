import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { printerService } from '../services/printer.service';
import { Restaurant } from '../models/Restaurant';
import { sendSuccess, sendError } from '../utils/response';

export class PrinterController {
  async testPrinter(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { ip, port = 9100, paperWidth = '80mm' } = req.body;

      if (!ip || typeof ip !== 'string') {
        sendError(res, 'BAD_REQUEST', 'Printer IP address is required', null, 400);
        return;
      }

      const restaurant = await Restaurant.findById(restaurantId).select('name').lean();
      const restaurantName = restaurant?.name || 'Pixora POS';

      const result = await printerService.printTestSlip(ip.trim(), Number(port) || 9100, paperWidth, restaurantName);
      sendSuccess(res, result, 'Test print sent successfully to thermal printer');
    } catch (error: any) {
      sendError(res, 'PRINTER_ERROR', error.message || 'Failed to connect to printer', null, 502);
    }
  }

  async printKOT(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { ip, port = 9100, order, paperWidth = '80mm' } = req.body;

      if (!ip || !order || !Array.isArray(order.items)) {
        sendError(res, 'BAD_REQUEST', 'Printer IP and valid order data are required', null, 400);
        return;
      }

      const result = await printerService.printKOT(ip.trim(), Number(port) || 9100, order, paperWidth);
      sendSuccess(res, result, 'KOT sent to kitchen thermal printer');
    } catch (error: any) {
      sendError(res, 'PRINTER_ERROR', error.message || 'Failed to print KOT', null, 502);
    }
  }
}

export const printerController = new PrinterController();
export default printerController;
