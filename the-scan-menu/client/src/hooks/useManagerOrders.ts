import { useState, useEffect, useMemo, useRef } from 'react';
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
  hasEarnedLoyaltyPoints?: boolean;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  loyaltyPointsEarned?: number;
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
  historyPage: number;
  debouncedSearch: string;
  historyStatusFilter: string;
  isHistoryView: boolean;
}

export function useManagerOrders({
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

  // 2. Active Orders Queue Query (Single Source of Truth for Live Board)
  const { data: activeOrdersResponse, isLoading: isLoadingActive, refetch: refetchActiveOrders } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    refetchInterval: 10000,
  });

  const activeOrders: Order[] = useMemo(() => {
    return activeOrdersResponse?.success && Array.isArray(activeOrdersResponse.data)
      ? activeOrdersResponse.data
      : [];
  }, [activeOrdersResponse]);

  // 3. All Orders History Query
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
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
    };

    const handleStatusUpdated = (data: { orderId: string; status: string }) => {
      // Only refetch if the order is not currently mid-flight in pending state
      if (!data?.orderId || !pendingOrderIds.has(data.orderId)) {
        invalidate();
      }
    };

    socket.on('order:status_updated', handleStatusUpdated);
    socket.on('order:created', invalidate);
    socket.on('order:cleared', invalidate);
    socket.on('session:updated', invalidate);
    socket.on('table:updated', invalidate);
    return () => {
      socket.off('order:status_updated', handleStatusUpdated);
      socket.off('order:created', invalidate);
      socket.off('order:cleared', invalidate);
      socket.off('session:updated', invalidate);
      socket.off('table:updated', invalidate);
    };
  }, [socket, activeRestaurantId, queryClient, pendingOrderIds]);

  // ─── OPTIMISTIC MUTATIONS ───────────────────────────────────────────────────

  // A. Optimistic Update Status Mutation (Accept, Prep, Ready, Serve, Revert, with optional atomic payment)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      nextStatus,
      paymentStatus,
      paymentMethod,
    }: {
      orderId: string;
      nextStatus: string;
      paymentStatus?: 'PAID' | 'PENDING';
      paymentMethod?: string;
    }) => {
      // 1. Get existing promise chain for this orderId or start with resolved Promise
      const previousPromise = mutationQueueRef.current.get(orderId) || Promise.resolve();

      // 2. Chain current request onto previousPromise to execute strictly in pipeline order
      const currentPromise = previousPromise.then(
        async () => {
          const res = await apiClient.patch(
            `/restaurants/${activeRestaurantId}/orders/${orderId}/status`,
            { status: nextStatus, paymentStatus, paymentMethod }
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
    onMutate: async ({ orderId, nextStatus, paymentStatus }) => {
      // 1. Cancel in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      // 2. Snapshot current state
      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
      const previousHistory = queryClient.getQueryData([
        'allOrdersHistory',
        activeRestaurantId,
        historyPage,
        debouncedSearch,
        historyStatusFilter,
      ]);

      // 3. Mark pending
      setPendingOrderIds((prev) => new Set(prev).add(orderId));

      // 4. Optimistically update activeOrdersQueue cache
      queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], (old: any) => {
        if (!old || !old.success || !Array.isArray(old.data)) return old;
        const existingIndex = old.data.findIndex((order: Order) => order._id === orderId);
        const updatedData = [...old.data];

        if (existingIndex !== -1) {
          updatedData[existingIndex] = {
            ...updatedData[existingIndex],
            status: nextStatus as any,
            ...(paymentStatus ? { paymentStatus } : {}),
          };
        } else if (nextStatus !== 'CANCELLED') {
          // Order was not in active queue (e.g. from history). Restore to active queue!
          const historyList = (previousHistory as any)?.data?.orders || [];
          const target = historyList.find((o: Order) => o._id === orderId);
          if (target) {
            updatedData.unshift({
              ...target,
              status: nextStatus as any,
              ...(paymentStatus ? { paymentStatus } : {}),
            });
          }
        }
        return { ...old, data: updatedData };
      });

      // 5. Optimistically update allOrdersHistory
      queryClient.setQueriesData({ queryKey: ['allOrdersHistory', activeRestaurantId] }, (old: any) => {
        if (!old || !old.success || !old.data || !Array.isArray(old.data.orders)) return old;
        const updatedOrders = old.data.orders.map((o: Order) => {
          if (o._id === orderId) {
            return {
              ...o,
              status: nextStatus as any,
              ...(paymentStatus ? { paymentStatus } : {}),
            };
          }
          return o;
        });
        return { ...old, data: { ...old.data, orders: updatedOrders } };
      });

      return { previousActive, previousHistory, orderId, nextStatus };
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter], context.previousHistory);
      }
      const errMsg = err?.response?.data?.error?.message || 'Failed to update order status. Rolled back.';
      toast(errMsg, 'error');
    },
    onSettled: (_data, _error, variables) => {
      mutationQueueRef.current.delete(variables.orderId);
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
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
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
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

      return { previousActive, previousHistory, orderId };
    },
    onError: (err: any, _orderId, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
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
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
    },
  });

  // C. Optimistic Clear / Settle Order Mutation (Free Table & Clear from Live Board)
  const clearOrderMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/orders/${orderId}/clear`);
      return res.data;
    },
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
      setPendingOrderIds((prev) => new Set(prev).add(orderId));

      queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], (old: any) => {
        if (!old || !old.success || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.filter((order: Order) => order._id !== orderId),
        };
      });

      return { previousActive, orderId };
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
      }
      toast(err?.response?.data?.error?.message || 'Failed to clear order and free table. Rolled back.', 'error');
    },
    onSuccess: (data) => {
      const orderNum = data?.data?.orderNumber || '';
      toast(`Table freed & Order #${orderNum} cleared!`, 'success');
    },
    onSettled: (_data, _error, variables) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
    },
  });

  // D. Optimistic Settle/Close Session Mutation
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
    onSuccess: () => {
      toast('Table session closed & freed!', 'success');
    },
    onSettled: (_data, _err, { orderId }) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
    },
  });

  // D. Optimistic Update Payment Status Mutation (Cash, Card, UPI, etc.)
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      paymentStatus,
      paymentMethod,
    }: {
      orderId: string;
      paymentStatus: 'PAID' | 'PENDING';
      paymentMethod?: string;
    }) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/orders/${orderId}/payment-status`,
        { paymentStatus, paymentMethod }
      );
      return res.data;
    },
    onMutate: async ({ orderId, paymentStatus }) => {
      // 1. Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      await queryClient.cancelQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });

      // 2. Snapshot current state for rollback
      const previousActive = queryClient.getQueryData(['activeOrdersQueue', activeRestaurantId]);
      const previousHistory = queryClient.getQueryData([
        'allOrdersHistory',
        activeRestaurantId,
        historyPage,
        debouncedSearch,
        historyStatusFilter,
      ]);

      // 3. Mark pending
      setPendingOrderIds((prev) => new Set(prev).add(orderId));

      // 4. Optimistically update activeOrdersQueue cache immediately
      queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], (old: any) => {
        if (!old || !old.success || !Array.isArray(old.data)) return old;
        const updatedData = old.data.map((order: Order) => {
          if (order._id === orderId) {
            return { ...order, paymentStatus };
          }
          return order;
        });
        return { ...old, data: updatedData };
      });

      // 5. Optimistically update allOrdersHistory cache immediately
      queryClient.setQueriesData({ queryKey: ['allOrdersHistory', activeRestaurantId] }, (old: any) => {
        if (!old || !old.success || !old.data || !Array.isArray(old.data.orders)) return old;
        const updatedOrders = old.data.orders.map((o: Order) => {
          if (o._id === orderId) return { ...o, paymentStatus };
          return o;
        });
        return { ...old, data: { ...old.data, orders: updatedOrders } };
      });

      return { previousActive, previousHistory, orderId };
    },
    onError: (err: any, _variables, context: any) => {
      if (context?.previousActive) {
        queryClient.setQueryData(['activeOrdersQueue', activeRestaurantId], context.previousActive);
      }
      if (context?.previousHistory) {
        queryClient.setQueryData(
          ['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter],
          context.previousHistory
        );
      }
      const errMsg = err?.response?.data?.error?.message || 'Failed to update payment status. Rolled back.';
      toast(errMsg, 'error');
    },
    onSettled: (_data, _error, variables) => {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.orderId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['allOrdersHistory', activeRestaurantId] });
    },
  });

  // E. POS Retry Sync Mutation
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
    refetchActiveOrders,
    historyOrdersData,
    isFetchingHistory,
    pendingOrderIds,
    updateStatusMutation,
    updatePaymentStatusMutation,
    cancelOrderMutation,
    clearOrderMutation,
    closeSessionMutation,
    retryPosMutation,
  };
}
