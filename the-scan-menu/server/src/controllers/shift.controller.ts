import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { shiftService } from '../services/shift.service';
import { sendSuccess, sendError } from '../utils/response';

export class ShiftController {
  async getCurrentShift(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const shift = await shiftService.getCurrentShift(restaurantId);
      sendSuccess(res, shift, shift ? 'Active shift retrieved' : 'No active shift currently open');
    } catch (error) {
      next(error);
    }
  }

  async openShift(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { openingFloat = 0, notes } = req.body;

      const openingFloatPaise = Math.round(Number(openingFloat) * 100);

      const shift = await shiftService.openShift(
        restaurantId,
        req.user!.id,
        openingFloatPaise,
        notes
      );

      sendSuccess(res, shift, `Shift #${shift.shiftNumber} opened successfully`, 201);
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, null, error.status);
        return;
      }
      next(error);
    }
  }

  async recordPettyCash(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, shiftId } = req.params;
      const { type, amount, category, reason } = req.body;

      if (!type || !['CASH_IN', 'CASH_OUT'].includes(type)) {
        sendError(res, 'BAD_REQUEST', 'Type must be CASH_IN or CASH_OUT', null, 400);
        return;
      }

      if (!amount || Number(amount) <= 0) {
        sendError(res, 'BAD_REQUEST', 'Amount must be greater than 0', null, 400);
        return;
      }

      if (!reason || !reason.trim()) {
        sendError(res, 'BAD_REQUEST', 'Reason/description is required', null, 400);
        return;
      }

      const amountPaise = Math.round(Number(amount) * 100);

      const shift = await shiftService.recordPettyCash(
        restaurantId,
        shiftId,
        type,
        amountPaise,
        category,
        reason,
        req.user?.id
      );

      sendSuccess(res, shift, `Petty cash ${type === 'CASH_IN' ? 'added' : 'deducted'} successfully`);
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, null, error.status);
        return;
      }
      next(error);
    }
  }

  async closeShift(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, shiftId } = req.params;
      const { actualCashCounted = 0, notes } = req.body;

      const actualCashPaise = Math.round(Number(actualCashCounted) * 100);

      const shift = await shiftService.closeShift(
        restaurantId,
        shiftId,
        actualCashPaise,
        notes,
        req.user?.id
      );

      sendSuccess(res, shift, `Shift #${shift.shiftNumber} closed and settled successfully`);
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, null, error.status);
        return;
      }
      next(error);
    }
  }

  async getXReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { shiftId } = req.query;

      const report = await shiftService.getXReport(restaurantId, shiftId as string);
      sendSuccess(res, report, 'X-Report generated successfully');
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, null, error.status);
        return;
      }
      next(error);
    }
  }

  async getZReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, shiftId } = req.params;

      const report = await shiftService.getZReport(restaurantId, shiftId);
      sendSuccess(res, report, 'Z-Report generated successfully');
    } catch (error: any) {
      if (error.code && error.status) {
        sendError(res, error.code, error.message, null, error.status);
        return;
      }
      next(error);
    }
  }

  async listShiftHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await shiftService.listShiftHistory(restaurantId, page, limit);
      sendSuccess(res, result, 'Shift history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const shiftController = new ShiftController();
export default shiftController;
