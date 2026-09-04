import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { printerService } from '../services/printer.service';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { sendSuccess, sendError } from '../utils/response';

export class PrinterController {
  async testPrinter(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { ip, ipAddress, port = 9100, paperWidth = '80mm', printerName = 'Counter Printer' } = req.body;
      const targetIp = ip || ipAddress;

      if (!targetIp || typeof targetIp !== 'string') {
        sendError(res, 'BAD_REQUEST', 'Printer IP address is required', null, 400);
        return;
      }

      const restaurant = await restaurantRepository.findById(restaurantId);
      const restaurantName = restaurant?.name || 'Pixora POS';

      const result = await printerService.printTestSlip(
        targetIp.trim(),
        Number(port) || 9100,
        paperWidth,
        restaurantName,
        printerName
      );
      sendSuccess(res, result, 'Test print sent successfully to thermal printer');
    } catch (error: any) {
      sendError(res, 'PRINTER_ERROR', error.message || 'Failed to connect to printer', null, 502);
    }
  }

  async printKOT(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { ip, ipAddress, port = 9100, order, paperWidth = '80mm' } = req.body;
      const targetIp = ip || ipAddress;

      if (!targetIp || !order || !Array.isArray(order.items)) {
        sendError(res, 'BAD_REQUEST', 'Printer IP and valid order data are required', null, 400);
        return;
      }

      const result = await printerService.printKOT(targetIp.trim(), Number(port) || 9100, order, paperWidth);
      sendSuccess(res, result, 'KOT sent to kitchen thermal printer');
    } catch (error: any) {
      sendError(res, 'PRINTER_ERROR', error.message || 'Failed to print KOT', null, 502);
    }
  }

  async printBill(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { ip, ipAddress, port = 9100, order, restaurantInfo, paperWidth = '80mm' } = req.body;
      const targetIp = ip || ipAddress;

      if (!targetIp || !order || !Array.isArray(order.items)) {
        sendError(res, 'BAD_REQUEST', 'Printer IP and valid order data are required', null, 400);
        return;
      }

      const restaurant = await restaurantRepository.findById(restaurantId);
      const mergedRestaurantInfo = {
        name: restaurant?.name || restaurantInfo?.name || 'Restaurant',
        address: restaurant?.address || restaurantInfo?.address,
        phone: restaurant?.phone || restaurantInfo?.phone,
        gstNumber: restaurantInfo?.gstNumber || restaurantInfo?.printerConfig?.gstNumber,
        fssaiNumber: restaurantInfo?.fssaiNumber || restaurantInfo?.printerConfig?.fssaiNumber,
        receiptHeader: restaurantInfo?.receiptHeader || restaurantInfo?.printerConfig?.receiptHeader,
        receiptFooter: restaurantInfo?.receiptFooter || restaurantInfo?.printerConfig?.receiptFooter,
        ...restaurantInfo,
      };

      const result = await printerService.printCustomerBill(
        targetIp.trim(),
        Number(port) || 9100,
        order,
        mergedRestaurantInfo,
        paperWidth
      );
      sendSuccess(res, result, 'Customer bill sent to thermal POS printer');
    } catch (error: any) {
      sendError(res, 'PRINTER_ERROR', error.message || 'Failed to print bill', null, 502);
    }
  }
}

export const printerController = new PrinterController();
export default printerController;
