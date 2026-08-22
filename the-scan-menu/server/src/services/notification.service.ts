import { SocketService } from '../sockets/socket.service';
import { pushNotificationService } from './pushNotification.service';

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private getIO() {
    return SocketService.getInstance().getIO();
  }

  public notifyOrderCreated(restaurantId: string, orderSummary: any): void {
    try {
      // 1. Socket emission for active open web/app sessions
      this.getIO().to(`restaurant:${restaurantId}`).emit('order:created', orderSummary);
      this.getIO().to(`display:${restaurantId}`).emit('display:order_created', {
        id: orderSummary?._id?.toString() || orderSummary?.id?.toString(),
        orderNumber: String(orderSummary?.orderNumber || '').replace(/^#/, ''),
        displayToken: `#${String(orderSummary?.orderNumber || '').replace(/^#/, '')}`,
        status: orderSummary?.status || 'PENDING',
        tableName: orderSummary?.tableNumber ? `Table ${orderSummary.tableNumber}` : null,
        orderType: orderSummary?.orderType || 'DINE_IN',
        itemCount: Array.isArray(orderSummary?.items) ? orderSummary.items.length : 1,
        createdAt: orderSummary?.createdAt || new Date(),
        updatedAt: orderSummary?.updatedAt || new Date(),
      });

      // 2. Push Notification for background / closed captain app devices
      const tableNumber = orderSummary?.tableNumber ?? orderSummary?.table?.tableNumber ?? 'Floor';
      const orderNumber = orderSummary?.orderNumber ?? '';
      const itemsCount = Array.isArray(orderSummary?.items) ? orderSummary.items.length : 1;
      const totalAmount = orderSummary?.totalAmount ?? orderSummary?.total ?? 0;
      const orderId = orderSummary?._id?.toString() ?? orderSummary?.id?.toString() ?? '';

      pushNotificationService.sendToRestaurant(restaurantId, {
        title: `🛎️ New Order: Table ${tableNumber}`,
        body: `Order #${orderNumber || orderId.slice(-4)} • ${itemsCount} item(s) • ₹${totalAmount}`,
        channelId: 'scanmenu_orders',
        sound: 'order_alert',
        tag: `order_${orderId}`,
        data: {
          type: 'NEW_ORDER',
          orderId,
          restaurantId,
          tableNumber: String(tableNumber),
          orderNumber: String(orderNumber),
        },
      }).catch((pushErr) => {
        console.error('Failed to send order push notification:', pushErr);
      });
    } catch (err) {
      console.error('NotificationService notifyOrderCreated failed:', err);
    }
  }

  public notifyOrderStatusUpdated(restaurantId: string, orderId: string, status: string, updatedAt: Date): void {
    try {
      const payload = { orderId, status, updatedAt };
      this.getIO().to(`order:${orderId}`).emit('order:status_updated', payload);
      this.getIO().to(`restaurant:${restaurantId}`).emit('order:status_updated', payload);
      this.getIO().to(`display:${restaurantId}`).emit('display:order_status_updated', payload);
    } catch (err) {
      console.error('NotificationService notifyOrderStatusUpdated failed:', err);
    }
  }

  public notifyItemStatusUpdated(restaurantId: string, orderId: string, itemIndex: number, itemStatus: string, updatedAt: Date): void {
    try {
      const payload = { orderId, itemIndex, itemStatus, updatedAt };
      this.getIO().to(`order:${orderId}`).emit('order:item_status_updated', payload);
      this.getIO().to(`restaurant:${restaurantId}`).emit('order:item_status_updated', payload);
    } catch (err) {
      console.error('NotificationService notifyItemStatusUpdated failed:', err);
    }
  }

  public notifySessionUpdated(restaurantId: string, sessionId: string, session: any, tableToken?: string): void {
    try {
      const payload = { sessionId, session };
      this.getIO().to(`restaurant:${restaurantId}`).emit('session:updated', payload);
      this.getIO().to(`session:${sessionId}`).emit('session:updated', payload);
      if (tableToken) {
        this.getIO().to(`table:${tableToken}`).emit('session:updated', payload);
      }
    } catch (err) {
      console.error('NotificationService notifySessionUpdated failed:', err);
    }
  }

  public notifyTableCleared(tableToken: string, data?: any): void {
    try {
      const payload = { status: 'AVAILABLE', session: null, ...(data || {}), clearedAt: new Date() };
      this.getIO().to(`table:${tableToken}`).emit('table:cleared', payload);
      this.getIO().to(`table:${tableToken}`).emit('session:updated', payload);
      this.getIO().to(`table:${tableToken}`).emit('table:updated', payload);
    } catch (err) {
      console.error('NotificationService notifyTableCleared failed:', err);
    }
  }

  public notifyWaiterCallCreated(restaurantId: string, waiterCall: any): void {
    try {
      // 1. Socket emission for active open web/app sessions
      this.getIO().to(`restaurant:${restaurantId}`).emit('waiter_call:created', waiterCall);

      // 2. Push Notification for background / closed captain app devices
      const tableNumber = waiterCall?.tableNumberSnapshot ?? waiterCall?.tableNumber ?? waiterCall?.table?.tableNumber ?? 'Floor';
      const requestType = waiterCall?.requestType ?? waiterCall?.reason ?? 'CALL_WAITER';
      const reasonLabel = requestType === 'REQUEST_BILL'
        ? 'Requesting Bill / Payment'
        : requestType === 'WATER'
        ? 'Water Needed'
        : requestType === 'TISSUE'
        ? 'Tissues Needed'
        : 'Assistance Requested';
      const callId = waiterCall?._id?.toString() ?? waiterCall?.id?.toString() ?? '';

      pushNotificationService.sendToRestaurant(restaurantId, {
        title: `🚨 Captain Call: Table ${tableNumber}`,
        body: `Table ${tableNumber} • ${reasonLabel}`,
        channelId: 'scanmenu_waiter_calls',
        sound: 'call_bell',
        tag: `call_${callId}`,
        data: {
          type: 'WAITER_CALL',
          callId,
          restaurantId,
          tableNumber: String(tableNumber),
          tableNumberSnapshot: String(tableNumber),
          requestType: String(requestType),
          reason: String(reasonLabel),
        },
      }).catch((pushErr) => {
        console.error('Failed to send waiter call push notification:', pushErr);
      });
    } catch (err) {
      console.error('NotificationService notifyWaiterCallCreated failed:', err);
    }
  }

  public notifyWaiterCallResolved(restaurantId: string, callId: string, status: string, resolvedAt: Date, metadata?: any): void {
    try {
      const payload = { callId, status, resolvedAt, ...(metadata || {}) };
      this.getIO().to(`restaurant:${restaurantId}`).emit('waiter_call:resolved', payload);
    } catch (err) {
      console.error('NotificationService notifyWaiterCallResolved failed:', err);
    }
  }

  /** Emits waiter_call:created directly to the guest's table room */
  public notifyTableWaiterCallCreated(tableToken: string, waiterCall: any): void {
    try {
      this.getIO().to(`table:${tableToken}`).emit('waiter_call:created', waiterCall);
    } catch (err) {
      console.error('NotificationService notifyTableWaiterCallCreated failed:', err);
    }
  }

  /** Emits waiter_call:resolved directly to the guest's table room */
  public notifyTableWaiterCallResolved(tableToken: string, callId: string, status: string, resolvedAt: Date | undefined, metadata?: any): void {
    try {
      const payload = { callId, status, resolvedAt, ...(metadata || {}) };
      this.getIO().to(`table:${tableToken}`).emit('waiter_call:resolved', payload);
    } catch (err) {
      console.error('NotificationService notifyTableWaiterCallResolved failed:', err);
    }
  }

  public notifyInventoryUpdated(restaurantId: string, itemId: string, data: any): void {
    try {
      const payload = { itemId, ...data, updatedAt: new Date() };
      this.getIO().to(`restaurant:${restaurantId}`).emit('inventory:updated', payload);
    } catch (err) {
      console.error('NotificationService notifyInventoryUpdated failed:', err);
    }
  }
}

export default NotificationService;
