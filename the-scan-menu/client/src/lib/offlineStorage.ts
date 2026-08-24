export interface QueuedOfflineOrder {
  localTempId: string;
  restaurantId: string;
  payload: any;
  createdAt: string;
  retryCount: number;
}

const STORAGE_KEYS = {
  MENU_CACHE: (restId: string) => `pixora_menu_cache_${restId}`,
  OFFLINE_QUEUE: (restId: string) => `pixora_offline_queue_${restId}`,
};

export const offlineStorage = {
  /**
   * Cache restaurant menu items, categories, and settings locally
   */
  cacheMenu(restaurantId: string, categories: any[], items: any[], settings?: any): void {
    try {
      const data = {
        categories,
        items,
        settings,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.MENU_CACHE(restaurantId), JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to cache menu offline:', err);
    }
  },

  /**
   * Retrieve cached menu data
   */
  getCachedMenu(restaurantId: string): { categories: any[]; items: any[]; settings?: any; cachedAt: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MENU_CACHE(restaurantId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Queue an order placed while offline
   */
  queueOrder(restaurantId: string, payload: any): QueuedOfflineOrder {
    const queue = this.getQueuedOrders(restaurantId);
    const tempNumber = Math.floor(1000 + Math.random() * 9000);
    const localTempId = `OFF-${Date.now()}-${tempNumber}`;

    const queuedItem: QueuedOfflineOrder = {
      localTempId,
      restaurantId,
      payload: {
        ...payload,
        isOfflineGenerated: true,
        offlineLocalId: localTempId,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(queuedItem);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE(restaurantId), JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to save offline order to local queue:', err);
    }

    return queuedItem;
  },

  /**
   * Get all pending queued offline orders for a restaurant
   */
  getQueuedOrders(restaurantId: string): QueuedOfflineOrder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE(restaurantId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Remove a single synced order from the offline queue
   */
  removeOrder(restaurantId: string, localTempId: string): void {
    const queue = this.getQueuedOrders(restaurantId).filter((o) => o.localTempId !== localTempId);
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE(restaurantId), JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to update offline queue:', err);
    }
  },

  /**
   * Clear the entire queue for a restaurant
   */
  clearQueue(restaurantId: string): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE(restaurantId));
    } catch (err) {
      console.error('Failed to clear offline queue:', err);
    }
  },
};

export default offlineStorage;
