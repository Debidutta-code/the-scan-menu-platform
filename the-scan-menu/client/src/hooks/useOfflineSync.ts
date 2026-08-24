import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineStorage, QueuedOfflineOrder } from '../lib/offlineStorage';
import apiClient from '../lib/api';
import { useToast } from './useToast';

export function useOfflineSync(restaurantId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queuedOrders, setQueuedOrders] = useState<QueuedOfflineOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Refresh queue count
  const refreshQueue = useCallback(() => {
    if (!restaurantId) return;
    const orders = offlineStorage.getQueuedOrders(restaurantId);
    setQueuedOrders(orders);
  }, [restaurantId]);

  // Sync pending orders when online
  const syncPendingOrders = useCallback(async () => {
    if (!restaurantId || !navigator.onLine || isSyncing) return;

    const pending = offlineStorage.getQueuedOrders(restaurantId);
    if (pending.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;

    for (const order of pending) {
      try {
        const res = await apiClient.post(`/restaurants/${restaurantId}/orders/counter`, order.payload);
        if (res.data?.success) {
          offlineStorage.removeOrder(restaurantId, order.localTempId);
          syncedCount++;
        }
      } catch (err: any) {
        console.error('Failed to sync offline order:', order.localTempId, err);
      }
    }

    setIsSyncing(false);
    refreshQueue();

    if (syncedCount > 0) {
      toast(`Successfully synced ${syncedCount} offline order(s) to server!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['currentShift', restaurantId] });
    }
  }, [restaurantId, isSyncing, toast, queryClient, refreshQueue]);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast('Network connection restored. Syncing offline orders...', 'info');
      syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Internet disconnected. POS switched to Offline Mode.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingOrders, refreshQueue, toast]);

  return {
    isOnline,
    queuedCount: queuedOrders.length,
    queuedOrders,
    isSyncing,
    syncPendingOrders,
    refreshQueue,
  };
}

export default useOfflineSync;
