import { Request, Response } from 'express';
import { orderRepository } from '../repositories/order.repository';
import { logger } from '../utils/logger';

export class PetpoojaWebhookController {
  /**
   * POST /api/v1/webhooks/petpooja
   * Inbound status updates pushed from Petpooja POS.
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      let bodyData: any = req.body;
      
      // If req.body is a raw Buffer (because mounted before express.json parsing), parse as JSON string
      if (Buffer.isBuffer(req.body)) {
        try {
          bodyData = JSON.parse(req.body.toString('utf8'));
        } catch {
          bodyData = {};
        }
      }

      const { order_id, petpooja_order_id, status } = bodyData || {};
      const targetOrderId = petpooja_order_id || order_id;

      if (!targetOrderId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing order_id in webhook payload' } });
        return;
      }

      // Map numerical status code or status string to internal OrderStatus
      const statusCodeMap: Record<string | number, string> = {
        '1': 'ACCEPTED',
        '2': 'PREPARING',
        '3': 'READY',
        '4': 'SERVED',
        '5': 'CANCELLED',
        ACCEPTED: 'ACCEPTED',
        PREPARING: 'PREPARING',
        READY: 'READY',
        SERVED: 'SERVED',
        CANCELLED: 'CANCELLED',
      };

      const mappedStatus = statusCodeMap[status] || statusCodeMap[String(status)];

      if (!mappedStatus) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: `Unknown Petpooja status: ${status}` } });
        return;
      }

      // Find order by petpoojaOrderId or ObjectId or orderNumber
      let order = null;
      if (targetOrderId.match(/^[0-9a-fA-F]{24}$/)) {
        order = await orderRepository.findById(targetOrderId);
      }
      if (!order) {
        const matchingOrders = await orderRepository.aggregate([
          {
            $match: {
              $or: [
                { 'integrationMetadata.petpoojaOrderId': targetOrderId },
                { orderNumber: Number(targetOrderId) || -1 },
              ],
            },
          },
          { $limit: 1 },
        ]);
        if (matchingOrders.length > 0) {
          order = await orderRepository.findById(matchingOrders[0]._id);
        }
      }

      if (!order) {
        logger.warn(`[PetpoojaWebhook] Order not found for ticket ID: ${targetOrderId}`);
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
        return;
      }

      order.status = mappedStatus as any;
      await orderRepository.save(order);

      logger.info(`[PetpoojaWebhook] Successfully updated Order ${order._id} status to ${mappedStatus}`);

      res.status(200).json({
        success: true,
        data: { orderId: order._id, status: order.status },
        message: 'Petpooja status update processed successfully',
      });
    } catch (error: any) {
      logger.error(`[PetpoojaWebhook] Unexpected webhook handling error: ${error.message}`);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process Petpooja webhook' } });
    }
  }
}

export const petpoojaWebhookController = new PetpoojaWebhookController();
export default petpoojaWebhookController;
