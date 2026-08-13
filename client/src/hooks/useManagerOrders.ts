import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { useSocket } from './useSocket';
import apiClient from '../lib/api';

export type WorkflowMode = 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';

export interface OrderItem {
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  selectedAddOns: { name: string; priceDelta: number }[];
  specialInstructions?: string;
  prepTimeMinutesSnapshot?: number;
  itemStatus?: string;
}

export interface Order {
  _id: string;
  restaurantId: string;
  tableId: { displayName: string; tableNumber: string } | any;
  sessionId?: string;
  roundNumber?: number;
  isMerged?: boolean;
  orderNumber: number;
  orderMode?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  taxBreakdown?: { name: string; percentage: number; amount: number; subTaxes?: { name: string; percentage: number; amount: number }[] }[];
  total: number;
  paymentStatus?: 'PENDING' | 'PAID';
  customerNote?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  source: string;
  integrationMetadata?: Record<string, any>;
  createdAt: string;
}

const WORKFLOW_CACHE_PREFIX = 'pixora_workflow_mode_';

function readWorkflowCache(restaurantId: string): WorkflowMode | null {
  try {
    const raw = localStorage.getItem(`${WORKFLOW_CACHE_PREFIX}${restaurantId}`);
    if (raw === 'FIVE_STEP' || raw === 'FOUR_STEP' || raw === 'THREE_STEP') {
      return raw as WorkflowMode;
    }
    return null;
  } catch {
    return null;
  }
}

function writeWorkflowCache(restaurantId: string, mode: WorkflowMode): void {
  try {
    localStorage.setItem(`${WORKFLOW_CACHE_PREFIX}${restaurantId}`, mode);
  } catch {
    // Storage quota or private mode — ignore
  }
}

interface UseManagerOrdersParams {
  servedPage: number;
  historyPage: number;
  debouncedSearch: string;
  historyStatusFilter: string;
  isHistoryView: boolean;
}

export function useManagerOrders({
  servedPage,
  historyPage,
  debouncedSearch,
  historyStatusFilter,
  isHistoryView,
}: UseManagerOrdersParams) {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pending set to track in-flight actions per orderId
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());

  // Mutation execution queue map per orderId to prevent race conditions on rapid actions
  const mutationQueueRef = useRef<Map<string, Promise<any>>>(new Map());

  // Local workflow mode state
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(() => {
    if (!activeRestaurantId) return 'FIVE_STEP';
    return readWorkflowCache(activeRestaurantId) ?? 'FIVE_STEP';
  });

  useEffect(() => {
    if (!activeRestaurantId) return;
    const cached = readWorkflowCache(activeRestaurantId);
    if (cached) {
      setWorkflowMode(cached);
    }
  }, [activeRestaurantId]);

  // Local archived served tickets
  const [archivedServedIds, setArchivedServedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`pixora_archived_served_${activeRestaurantId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const archiveServedOrder = useCallback((orderId: string) => {
    setArchivedServedIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      try {
        localStorage.setItem(`pixora_archived_served_${activeRestaurantId}`, JSON.stringify([...next]));
      } catch (err) {
        console.warn('Failed to persist archived orders to localStorage:', err);
      }
      return next;
    });
    toast('Order moved to History view', 'info');
  }, [activeRestaurantId, toast]);

  const unarchiveServedOrder = useCallback((orderId: string) => {
    setArchivedServedIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      try {
        localStorage.setItem(`pixora_archived_served_${activeRestaurantId}`, JSON.stringify([...next]));
      } catch (err) {
        console.warn('Failed to persist unarchived orders to localStorage:', err);
      }
      return next;
    });
  }, [activeRestaurantId]);

  // 1. Restaurant Config
  const { data: restaurantResponse } = useQuery({
    queryKey: ['restaurantConfig', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (restaurantResponse?.data?.orderWorkflowMode) {
      const serverMode = restaurantResponse.data.orderWorkflowMode as WorkflowMode;
      if (serverMode === 'FIVE_STEP' || serverMode === 'FOUR_STEP' || serverMode === 'THREE_STEP') {
        setWorkflowMode(serverMode);
        if (activeRestaurantId) {
          writeWorkflowCache(activeRestaurantId, serverMode);
        }
      }
    }
  }, [restaurantResponse, activeRestaurantId]);

  // 2. Active Orders Queue Query
  const { data: activeOrdersResponse, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    refetchInterval: 15000,
  });

  const activeOrders: Order[] = useMemo(() => {
    return activeOrdersResponse?.success && Array.isArray(activeOrdersResponse.data)
      ? activeOrdersResponse.data
      : [];
  }, [activeOrdersResponse]);

  // 3. Served Orders Query
  const { data: servedOrdersData, isFetching: isFetchingServed } = useQuery({
    queryKey: ['servedOrdersHistory', activeRestaurantId, servedPage],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/orders?status=SERVED&page=${servedPage}&limit=15`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  // 4. All Orders History Query
  const { data: historyOrdersData, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/orders?page=${historyPage}&limit=15&search=${encodeURIComponent(debouncedSearch)}&status=${historyStatusFilter}`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && isHistoryView,
  });

  // Socket Realtime Handler
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const { socket } = useSocket(token);

  useEffect(() => {
    if (!socket || !activeRestaurantId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
    };

    const handleStatusUpdated = (data: { orderId: string; status: string }) => {
      // Only refetch if the order is not currently mid-flight in pending state
      if (!data?.orderId || !pendingOrderIds.has(data.orderId)) {
        invalidate();
      }
    };

    socket.on('order:status_updated', handleStatusUpdated);
    socket.on('order:created', invalidate);
    socket.on('session:updated', invalidate);
    return () => {
      socket.off('order:status_updated', handleStatusUpdated);
      socket.off('order:created', invalidate);
      socket.off('session:updated', invalidate);
    };
  }, [socket, activeRestaurantId, queryClient, pendingOrderIds]);

  // ─── OPTIMISTIC MUTATIONS ───────────────────────────────────────────────────

  // A. Optimistic Update Status Mutation (Accept, Prep, Ready, Serve, Revert)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      // 1. Get existing promise chain for this orderId or start with resolved Promise
      const previousPromise = mutationQueueRef.current.get(orderId) || Promise.resolve();

      // 2. Chain current request onto previousPromise to execute strictly in pipeline order
      const currentPromise = previousPromise.then(
        async () => {
          const res = await apiClient.patch(
            `/restaurants/${activeRestaurantId}/orders/${orderId}/status`,
            { status: nextStatus }
          );
          return res.data;
        },
        (prevErr) => {
          // If upstream request in pipeline failed, abort downstream request
          throw prevErr;
        }
      );

      // 3. Store in queue map for rapid subsequent requests on same orderId
      mutationQueueRef.current.set(orderId, currentPromise.catch(() => {}));

      return currentPromise;
    },
    onMutate: async ({ orderId, nextStatus }) => {
      // 1. Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      // 2. Snapshot current state
      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
      const previousServed = queryClient.getQueryData(['servedOrdersHistory', activeRestaurantId, servedPage]);
      const previousHistory = queryClient.getQueryData(['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter]);

      // 3. Mark pending
      setPendingOrderIds((prev) => new Set(prev).add(orderId));

      // 4. Optimistically update activeOrdersQueue cache
      queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], (old: any) => {
        if (!old || !old.success || !Array.isArray(old.data)) return old;
        const existingIndex = old.data.findIndex((order: Order) => order._id === orderId);
        const updatedData = [...old.data];

        if (existingIndex !== -1) {
          updatedData[existingIndex] = { ...updatedData[existingIndex], status: nextStatus as any };
        } else if (nextStatus !== 'SERVED' && nextStatus !== 'CANCELLED') {
          // Order was not in active queue (e.g. was SERVED). Find in served history cache and restore to active queue!
          const servedList = (previousServed as any)?.data?.orders || [];
          const historyList = (previousHistory as any)?.data?.orders || [];
          const target =
            servedList.find((o: Order) => o._id === orderId) ||
            historyList.find((o: Order) => o._id === orderId);
          if (target) {
            updatedData.unshift({ ...target, status: nextStatus as any });
          }
        }
        return { ...old, data: updatedData };
      });

      // 5. Optimistically update servedOrdersHistory cache if moving to SERVED or in served list
      queryClient.setQueryData(['servedOrdersHistory', activeRestaurantId, servedPage], (old: any) => {
        if (!old || !old.success || !old.data || !Array.isArray(old.data.orders)) return old;
        if (nextStatus !== 'SERVED') {
          // If reverting or moving away from SERVED, remove from served list
          const filteredOrders = old.data.orders.filter((o: Order) => o._id !== orderId);
          return { ...old, data: { ...old.data, orders: filteredOrders } };
        } else {
          const existingIdx = old.data.orders.findIndex((o: Order) => o._id === orderId);
          const updatedOrders = [...old.data.orders];
          if (existingIdx !== -1) {
            updatedOrders[existingIdx] = { ...updatedOrders[existingIdx], status: 'SERVED' };
          } else {
            const activeList = (previousActive as any)?.data || [];
            const target = activeList.find((o: Order) => o._id === orderId);
            if (target) {
              updatedOrders.unshift({ ...target, status: 'SERVED' });
            }
          }
          return { ...old, data: { ...old.data, orders: updatedOrders } };
        }
      });

      // 6. Optimistically update allOrdersHistory
      queryClient.setQueriesData({ queryKey: ['allOrdersHistory', activeRestaurantId] }, (old: any) => {
        if (!old || !old.success || !old.data || !Array.isArray(old.data.orders)) return old;
        const updatedOrders = old.data.orders.map((o: Order) => {
          if (o._id === orderId) return { ...o, status: nextStatus as any };
          return o;
        });
        return { ...old, data: { ...old.data, orders: updatedOrders } };
      });

      return { previousActive, previousServed, previousHistory, orderId, nextStatus };
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
      }
      if (context?.previousServed) {
        queryClient.setQueryData(['servedOrdersHistory', activeRestaurantId, servedPage], context.previousServed);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter], context.previousHistory);
      }
      const errMsg = err?.response?.data?.error?.message || 'Failed to update order status. Rolled back.';
      toast(errMsg, 'error');
    },
    onSuccess: (_data, variables) => {
      if (archivedServedIds.has(variables.orderId) && variables.nextStatus !== 'SERVED') {
        unarchiveServedOrder(variables.orderId);
      }
    },
    onSettled: (_data, _error, variables) => {
      mutationQueueRef.current.delete(variables.orderId);
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
    },
  });

  // B. Optimistic Cancel Order Mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/orders/${orderId}/cancel`);
      return res.data;
    },
    onMutate: async (orderId: string) => {
      await queryClient.cancelQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
      const previousServed = queryClient.getQueryData(['servedOrdersHistory', activeRestaurantId, servedPage]);
      const previousHistory = queryClient.getQueryData(['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter]);

      setPendingOrderIds((prev) => new Set(prev).add(orderId));

      queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], (old: any) => {
        if (!old || !old.success || !Array.isArray(old.data)) return old;
        const updatedData = old.data.map((order: Order) => {
          if (order._id === orderId) {
            return { ...order, status: 'CANCELLED' };
          }
          return order;
        });
        return { ...old, data: updatedData };
      });

      return { previousActive, previousServed, previousHistory, orderId };
    },
    onError: (err: any, _orderId, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
      }
      if (context?.previousServed) {
        queryClient.setQueryData(['servedOrdersHistory', activeRestaurantId, servedPage], context.previousServed);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter], context.previousHistory);
      }
      const errMsg = err?.response?.data?.error?.message || 'Failed to cancel order. Rolled back.';
      toast(errMsg, 'error');
    },
    onSuccess: (data) => {
      const orderNum = data?.data?.orderNumber || '';
      toast(`Order #${orderNum} has been cancelled`, 'info');
    },
    onSettled: (_data, _error, orderId) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
    },
  });

  // C. Optimistic Settle/Close Session Mutation
  const closeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, orderId }: { sessionId: string; orderId: string }) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/table-sessions/${sessionId}/close`);
      return { res: res.data, orderId };
    },
    onMutate: async ({ orderId }) => {
      setPendingOrderIds((prev) => new Set(prev).add(orderId));
    },
    onError: (err: any, { orderId }) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      toast(err?.response?.data?.error?.message || 'Failed to close session. Rolled back.', 'error');
    },
    onSuccess: (_res, { orderId }) => {
      archiveServedOrder(orderId);
      toast('Table session closed & freed!', 'success');
    },
    onSettled: (_data, _err, { orderId }) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
    },
  });

  // D. POS Retry Sync Mutation
  const retryPosMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/orders/${orderId}/retry-pos`);
      return res.data;
    },
    onSuccess: () => {
      toast('POS synchronization retry queued!', 'success');
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err?.response?.data?.error?.message || 'Failed to trigger POS retry', 'error');
    },
  });

  return {
    activeRestaurantId,
    workflowMode,
    activeOrders,
    isLoadingActive,
    servedOrdersData,
    isFetchingServed,
    historyOrdersData,
    isFetchingHistory,
    pendingOrderIds,
    archivedServedIds,
    archiveServedOrder,
    unarchiveServedOrder,
    updateStatusMutation,
    cancelOrderMutation,
    closeSessionMutation,
    retryPosMutation,
  };
}
