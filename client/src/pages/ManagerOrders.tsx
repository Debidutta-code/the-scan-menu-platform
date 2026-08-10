import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  XCircle,
  ArrowRight,
  FileText,
  Loader,
  AlertCircle,
  X,
  HelpCircle,
  Search,
  Filter,
  MapPin,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Receipt,
  Layers,
  Volume2,
  VolumeX,
  Check,
  ChevronRight,
  History as HistoryIcon,
  Kanban as KanbanIcon
} from 'lucide-react';
import apiClient from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkflowMode = 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';

interface OrderItem {
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  selectedAddOns: { name: string; priceDelta: number }[];
  specialInstructions?: string;
  prepTimeMinutesSnapshot?: number;
  itemStatus?: string;
}

interface Order {
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

// ─── Workflow Step Definitions ─────────────────────────────────────────────────

const WORKFLOW_STEPS: Record<WorkflowMode, { status: string; label: string; shortLabel: string; color: string; badgeBg: string; activeColor: string; icon: any }[]> = {
  FIVE_STEP: [
    { status: 'PENDING',  label: 'New Orders',     shortLabel: 'New',      color: 'text-amber-600',  badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500', icon: Clock },
    { status: 'ACCEPTED', label: 'Accepted',       shortLabel: 'Accepted', color: 'text-emerald-600',badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-500', icon: CheckCircle2 },
    { status: 'PREPARING',label: 'Kitchen Prep',   shortLabel: 'Kitchen',  color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeColor: 'bg-indigo-500', icon: ChefHat },
    { status: 'READY',    label: 'Ready to Serve', shortLabel: 'Ready',    color: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', activeColor: 'bg-purple-500', icon: Sparkles },
    { status: 'SERVED',   label: 'Served',         shortLabel: 'Served',   color: 'text-blue-600',   badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-500', icon: Utensils },
  ],
  FOUR_STEP: [
    { status: 'PENDING',  label: 'New Orders',     shortLabel: 'New',      color: 'text-amber-600',  badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500', icon: Clock },
    { status: 'PREPARING',label: 'Kitchen Prep',   shortLabel: 'Kitchen',  color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeColor: 'bg-indigo-500', icon: ChefHat },
    { status: 'READY',    label: 'Ready to Serve', shortLabel: 'Ready',    color: 'text-purple-600', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200', activeColor: 'bg-purple-500', icon: Sparkles },
    { status: 'SERVED',   label: 'Served',         shortLabel: 'Served',   color: 'text-blue-600',   badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-500', icon: Utensils },
  ],
  THREE_STEP: [
    { status: 'PENDING',  label: 'New Orders',     shortLabel: 'New',      color: 'text-amber-600',  badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500', icon: Clock },
    { status: 'PREPARING',label: 'Preparing',      shortLabel: 'Prep',     color: 'text-indigo-600', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeColor: 'bg-indigo-500', icon: ChefHat },
    { status: 'SERVED',   label: 'Served',         shortLabel: 'Served',   color: 'text-blue-600',   badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-500', icon: Utensils },
  ],
};

const getNextStatus = (currentStatus: string, workflowMode: WorkflowMode): string | null => {
  const steps = WORKFLOW_STEPS[workflowMode];
  const idx = steps.findIndex((s) => s.status === currentStatus);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1].status;
};

const getNextActionLabel = (currentStatus: string, workflowMode: WorkflowMode): { label: string; gradient: string; icon: any } => {
  const nextStatus = getNextStatus(currentStatus, workflowMode);
  switch (nextStatus) {
    case 'ACCEPTED':
      return { label: 'Accept Order', gradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500', icon: Check };
    case 'PREPARING':
      return { label: 'Start Kitchen Prep', gradient: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500', icon: ChefHat };
    case 'READY':
      return { label: 'Mark Ready for Pickup', gradient: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500', icon: Sparkles };
    case 'SERVED':
      return { label: 'Mark as Served', gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500', icon: Utensils };
    default:
      return { label: 'Advance Order', gradient: 'bg-slate-900 hover:bg-slate-800', icon: ArrowRight };
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getElapsedTimeLabel = (createdAt: string, now: Date) => {
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  return `${diffHrs}h ${diffMin % 60}m ago`;
};

const formatAmount = (amt: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amt / 100);

const getOrderModeInfo = (mode?: string) => {
  switch (mode) {
    case 'TAKEAWAY':
      return { label: 'Takeaway', icon: ShoppingBag, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'DELIVERY':
      return { label: 'Delivery', icon: MapPin, color: 'text-purple-700 bg-purple-50 border-purple-200' };
    case 'COUNTER':
      return { label: 'Counter POS', icon: CreditCard, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    case 'DINE_IN':
    default:
      return { label: 'Dine-In', icon: Utensils, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  }
};

// ─── Modern Stepper Progress Component ───────────────────────────────────────

const ModernOrderStepper: React.FC<{ currentStatus: string; workflowMode: WorkflowMode }> = ({
  currentStatus,
  workflowMode,
}) => {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="w-full py-3 px-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-rose-700">
        <XCircle className="w-4 h-4 text-rose-600" strokeWidth={2} />
        <span>This order was cancelled</span>
      </div>
    );
  }

  const steps = WORKFLOW_STEPS[workflowMode] || WORKFLOW_STEPS['FIVE_STEP'];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const currentStep = currentIdx !== -1 ? currentIdx + 1 : 1;

  return (
    <div className="w-full bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-4">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1.5 text-slate-800 font-sans">
          <Layers className="w-4 h-4 text-amber-500" strokeWidth={2} />
          Workflow Stage
        </span>
        <span className="text-slate-500 font-mono text-[11px]">
          Step <strong className="text-slate-900 font-black">{currentStep}</strong> of {steps.length} •{' '}
          <span className="uppercase text-amber-600 font-black tracking-wide">{currentStatus}</span>
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative flex items-center justify-between px-2 sm:px-4">
        {/* Continuous Background Line passing through center of w-8 nodes */}
        <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0" />
        
        {/* Active Filled Line */}
        <div
          className="absolute left-6 top-4 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 z-0"
          style={{
            width: `${Math.max(0, ((currentStep - 1) / Math.max(1, steps.length - 1)) * 100)}%`,
            maxWidth: 'calc(100% - 3rem)',
          }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isPassed = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const StepIcon = step.icon;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCurrent
                    ? 'bg-slate-950 text-white ring-4 ring-amber-400/30 scale-110 shadow-md'
                    : isPassed
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isPassed ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <StepIcon className="w-4 h-4" strokeWidth={2} />
                )}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'text-slate-950 font-black'
                    : isPassed
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getOrderContextDetails = (order: Order) => {
  const mode = order.orderMode || (order.tableId ? 'DINE_IN' : 'TAKEAWAY');

  if (mode === 'TAKEAWAY') {
    return {
      title: 'Takeaway Order',
      subtitle: order.customerName ? `Guest: ${order.customerName}` : 'Walk-in Customer',
      icon: ShoppingBag,
      iconColor: 'text-amber-600',
      badge: 'Takeaway',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  if (mode === 'COUNTER') {
    return {
      title: 'Counter POS Order',
      subtitle: order.customerName ? `Guest: ${order.customerName}` : 'Walk-in Customer',
      icon: CreditCard,
      iconColor: 'text-indigo-600',
      badge: 'Counter POS',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    };
  }

  if (mode === 'DELIVERY') {
    return {
      title: 'Delivery Order',
      subtitle: order.customerName ? `Recipient: ${order.customerName}` : 'Direct Delivery',
      icon: MapPin,
      iconColor: 'text-blue-600',
      badge: 'Delivery',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }

  // DINE_IN
  const rawTable = order.tableId?.displayName || order.tableId?.tableNumber || '1';
  const tableTitle = rawTable.toString().toLowerCase().startsWith('table') ? rawTable : `Table ${rawTable}`;

  return {
    title: tableTitle,
    subtitle: order.customerName ? `Guest: ${order.customerName}` : 'Dine-In Guest',
    icon: MapPin,
    iconColor: 'text-emerald-600',
    badge: 'Dine-In',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
};

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

// ─── Main Component ───────────────────────────────────────────────────────────

export const ManagerOrders: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active view toggle: Kanban vs History table
  const [viewMode, setViewMode] = useState<'KANBAN' | 'HISTORY'>('KANBAN');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Seed initial workflow mode from localStorage so the board renders instantly without layout jumps on refresh
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>(() => {
    if (!activeRestaurantId) return 'FIVE_STEP';
    return readWorkflowCache(activeRestaurantId) ?? 'FIVE_STEP';
  });

  // Re-seed from localStorage when activeRestaurantId changes
  useEffect(() => {
    if (!activeRestaurantId) return;
    const cached = readWorkflowCache(activeRestaurantId);
    if (cached) {
      setWorkflowMode(cached);
    }
  }, [activeRestaurantId]);

  // Fetch restaurant config for workflow mode
  const { data: restaurantResponse } = useQuery({
    queryKey: ['restaurantConfig', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    staleTime: 60_000,
  });

  // Sync server workflowMode and update localStorage
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

  const workflowSteps = WORKFLOW_STEPS[workflowMode];

  // Mobile tab state
  const [mobileStatusTab, setMobileStatusTab] = useState<string>('PENDING');

  // Page for served history pagination
  const [servedPage, setServedPage] = useState(1);
  const [servedOrders, setServedOrders] = useState<Order[]>([]);
  const [hasMoreServed, setHasMoreServed] = useState(true);

  // All Orders History States
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal / detail states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Live clock
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(historySearch);
      setHistoryPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [historySearch]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHistoryStatusFilter(e.target.value);
    setHistoryPage(1);
  };

  // 1. Fetch Active Orders
  const { data: activeOrdersResponse, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    refetchInterval: 15000,
  });

  const activeOrders: Order[] = activeOrdersResponse?.success ? activeOrdersResponse.data : [];

  // 2. Fetch Served Orders (history)
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

  useEffect(() => {
    if (servedOrdersData?.success) {
      const fetched = servedOrdersData.data.orders || [];
      const pagination = servedOrdersData.data.pagination;
      if (servedPage === 1) {
        setServedOrders(fetched);
      } else {
        setServedOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o._id));
          return [...prev, ...fetched.filter((o: Order) => !existingIds.has(o._id))];
        });
      }
      setHasMoreServed(pagination ? servedPage < pagination.totalPages : false);
    }
  }, [servedOrdersData, servedPage]);

  // 3. Fetch All Orders History (Paginated & Filtered)
  const { data: historyOrdersData, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['allOrdersHistory', activeRestaurantId, historyPage, debouncedSearch, historyStatusFilter],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/orders?page=${historyPage}&limit=15&search=${encodeURIComponent(debouncedSearch)}&status=${historyStatusFilter}`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && viewMode === 'HISTORY',
  });

  useEffect(() => {
    if (historyOrdersData?.success) {
      const fetched = historyOrdersData.data.orders || [];
      const pagination = historyOrdersData.data.pagination;
      if (historyPage === 1) {
        setHistoryOrders(fetched);
      } else {
        setHistoryOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o._id));
          return [...prev, ...fetched.filter((o: Order) => !existingIds.has(o._id))];
        });
      }
      setHasMoreHistory(pagination ? historyPage < pagination.totalPages : false);
    }
  }, [historyOrdersData, historyPage]);

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Socket real-time updates
  const token = localStorage.getItem('accessToken');
  const { socket } = useSocket(token);

  useEffect(() => {
    if (!socket || !activeRestaurantId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
    };
    socket.on('order:status_updated', invalidate);
    socket.on('order:created', invalidate);
    socket.on('session:updated', invalidate);
    return () => {
      socket.off('order:status_updated', invalidate);
      socket.off('order:created', invalidate);
      socket.off('session:updated', invalidate);
    };
  }, [socket, activeRestaurantId, queryClient]);

  // ─── Status Mutations ───────────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/orders/${orderId}/status`,
        { status: nextStatus }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast(`Order #${data.data.orderNumber} advanced to ${data.data.status}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
      setSelectedOrder((prev) => (prev && prev._id === data.data._id ? data.data : prev));
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update order status', 'error');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/orders/${orderId}/cancel`);
      return res.data;
    },
    onSuccess: (data) => {
      toast(`Order #${data.data.orderNumber} has been cancelled`, 'info');
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      setOrderToCancel(null);
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to cancel order', 'error');
    },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getOrdersByStatus = (st: string) => {
    let list: Order[] = [];
    if (st === 'SERVED') {
      const todayStr = new Date().toDateString();
      list = servedOrders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    } else {
      list = activeOrders.filter((o) => o.status === st);
    }
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB; // Earliest orders first in kitchen queue
    });
  };

  // ─── Loading / Guard ──────────────────────────────────────────────────────

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="h-16 w-16 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-800">No Active Restaurant</h2>
        <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
          Please select or impersonate a restaurant outlet to view the kitchen orders queue.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans select-none pb-12">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-sm">
            <ChefHat className="w-5 h-5 text-amber-400" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">Kitchen Operations</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {activeOrders.length} active ticket{activeOrders.length === 1 ? '' : 's'} in preparation
            </p>
          </div>
        </div>

        {/* View Switcher & Audio Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              audioEnabled
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
            title={audioEnabled ? 'Sound notifications on' : 'Sound muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} /> : <VolumeX className="w-4 h-4 text-rose-500" strokeWidth={1.75} />}
          </button>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Live Board</span>
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>All History</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Column Tab Bar ── */}
      {viewMode === 'KANBAN' && (
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-1 py-1 scrollbar-none">
          {workflowSteps.map((step) => {
            const count = getOrdersByStatus(step.status).length;
            const isActive = mobileStatusTab === step.status;
            return (
              <button
                key={step.status}
                onClick={() => setMobileStatusTab(step.status)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition shadow-sm ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span>{step.shortLabel}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── KANBAN BOARD VIEW ── */}
      {viewMode === 'KANBAN' && (
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div
            className="grid grid-cols-1 gap-4.5"
            style={{
              gridTemplateColumns: `repeat(${workflowSteps.length}, minmax(280px, 1fr))`,
              minWidth: `${workflowSteps.length * 290}px`,
              minHeight: '75vh',
            }}
          >
            {workflowSteps.map((step) => {
              const ordersInColumn = getOrdersByStatus(step.status);
              const isMobileHidden = mobileStatusTab !== step.status;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.status}
                  className={`flex flex-col h-full bg-slate-100/70 border border-slate-200/90 rounded-3xl p-3 shadow-inner ${
                    isMobileHidden ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-2 mb-3 bg-white border border-slate-200/70 rounded-2xl shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${step.badgeBg}`}>
                        <StepIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </div>
                      <span className="font-bold text-xs text-slate-900 tracking-tight">
                        {step.label}
                      </span>
                    </div>
                    <span className="bg-slate-900 text-white font-mono text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-inner">
                      {ordersInColumn.length}
                    </span>
                  </div>

                  {/* Column Orders List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                    {isLoadingActive && step.status !== 'SERVED' ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader className="w-6 h-6 animate-spin mb-2 text-slate-500" strokeWidth={1.75} />
                        <span className="text-xs font-semibold">Updating queue...</span>
                      </div>
                    ) : ordersInColumn.length === 0 ? (
                      <div className="h-40 border-2 border-dashed border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs font-medium p-4 text-center">
                        <Check className="w-5 h-5 text-slate-300 mb-1" strokeWidth={2} />
                        <span>No orders in this stage</span>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {ordersInColumn.map((order) => {
                          const modeInfo = getOrderModeInfo(order.orderMode);
                          const ModeIcon = modeInfo.icon;
                          const nextStatus = getNextStatus(order.status, workflowMode);

                          return (
                            <motion.div
                              key={order._id}
                              initial={{ opacity: 0, scale: 0.96, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -10 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => setSelectedOrder(order)}
                              className="bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden"
                            >
                              {/* Order Card Top Bar */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-sm">
                                    #{order.orderNumber}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${modeInfo.color}`}>
                                    <ModeIcon className="w-2.5 h-2.5" strokeWidth={2} />
                                    <span>{modeInfo.label}</span>
                                  </span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" strokeWidth={1.75} />
                                  {getElapsedTimeLabel(order.createdAt, now)}
                                </span>
                              </div>

                              {/* Table & Customer Row */}
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                <span className="flex items-center gap-1 text-slate-900">
                                  <MapPin className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                                  {order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}
                                </span>
                                {order.customerName && (
                                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]">
                                    {order.customerName}
                                  </span>
                                )}
                              </div>

                              {/* Order Items Preview */}
                              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                                        {item.quantity}x
                                      </span>
                                      <span className="truncate font-semibold text-slate-800">
                                        {item.nameSnapshot}
                                      </span>
                                    </div>
                                    {item.specialInstructions && (
                                      <FileText className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={2} />
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Card Footer with Fast Action Button */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="font-mono text-xs font-black text-slate-900">
                                  {formatAmount(order.total)}
                                </span>

                                {/* Quick advance button on card */}
                                {nextStatus && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateStatusMutation.mutate({ orderId: order._id, nextStatus });
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1 shadow-sm transition active:scale-95"
                                  >
                                    <span>Advance</span>
                                    <ArrowRight className="w-3 h-3" strokeWidth={2} />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}

                    {/* Load More for Served column */}
                    {step.status === 'SERVED' && hasMoreServed && (
                      <button
                        onClick={() => setServedPage((p) => p + 1)}
                        disabled={isFetchingServed}
                        className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        {isFetchingServed ? (
                          <Loader className="w-3.5 h-3.5 animate-spin text-slate-500" strokeWidth={2} />
                        ) : (
                          <span>Load More History</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL ORDERS HISTORY VIEW ── */}
      {viewMode === 'HISTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Order Logs & History</h2>
              <p className="text-xs text-slate-500 font-medium">Search and review all historical orders and receipts</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search Order # or Table..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                />
              </div>

              {/* Filter */}
              <div className="relative w-full sm:w-44">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <select
                  value={historyStatusFilter}
                  onChange={handleStatusFilterChange}
                  className="w-full pl-9.5 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="READY">Ready</option>
                  <option value="SERVED">Served</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          {isFetchingHistory && historyOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader className="w-8 h-8 animate-spin text-slate-500 mb-2" strokeWidth={2} />
              <span className="text-xs font-semibold">Loading orders history...</span>
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-bold text-slate-600">No orders found</span>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[90px_1fr_1fr_120px_110px_100px_40px] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Order #</span>
                <span>Table / Mode</span>
                <span>Customer</span>
                <span>Timestamp</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>

              <div className="divide-y divide-slate-100">
                {historyOrders.map((order) => {
                  const modeInfo = getOrderModeInfo(order.orderMode);
                  return (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className="grid grid-cols-1 md:grid-cols-[90px_1fr_1fr_120px_110px_100px_40px] gap-2 md:gap-4 items-center p-4 hover:bg-amber-50/40 cursor-pointer transition"
                    >
                      <span className="font-mono text-xs font-black text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                        <span>{order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${modeInfo.color}`}>
                          {modeInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        {order.customerName || '—'}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                          {order.status}
                        </span>
                      </div>
                      <div className="font-mono text-xs font-black text-slate-900 md:text-right">
                        {formatAmount(order.total)}
                      </div>
                      <div className="text-right text-slate-400">
                        <ChevronRight className="w-4 h-4" strokeWidth={2} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasMoreHistory && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={isFetchingHistory}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                {isFetchingHistory ? (
                  <Loader className="w-4 h-4 animate-spin text-slate-500" strokeWidth={2} />
                ) : (
                  <span>Load More Orders</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODERN ORDER DETAILS MODAL / DIALOG
          ══════════════════════════════════════════════ */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedOrder && (
              <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 flex min-h-screen items-center justify-center select-none">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedOrder(null)}
                  className="fixed inset-0 cursor-pointer"
                />

                {/* Modal Body */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 16 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl w-full max-w-xl max-h-[86vh] shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden z-10 my-auto"
                >
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/80 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-black bg-slate-900 text-white px-3 py-1 rounded-xl shadow-inner">
                        Order #{selectedOrder.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black font-mono tracking-wide bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        {selectedOrder.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
                    {/* Modern Stepper */}
                    <ModernOrderStepper currentStatus={selectedOrder.status} workflowMode={workflowMode} />

                    {/* Table & Guest Context Card */}
                    {(() => {
                      const ctx = getOrderContextDetails(selectedOrder);
                      const ContextIcon = ctx.icon;

                      return (
                        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
                              <ContextIcon className={`w-5 h-5 ${ctx.iconColor}`} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-slate-900 text-sm block">
                                  {ctx.title}
                                </span>
                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${ctx.badgeBg}`}>
                                  {ctx.badge}
                                </span>
                              </div>
                              <span className="text-slate-500 font-medium text-[11px] mt-0.5 block truncate">
                                {ctx.subtitle}
                                {selectedOrder.customerPhone ? ` • ${selectedOrder.customerPhone}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            {selectedOrder.roundNumber && (
                              <span className="bg-white border border-slate-200 text-slate-800 font-mono text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xs">
                                Round {selectedOrder.roundNumber}
                              </span>
                            )}
                            <span className="bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xs">
                              {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ticket Items List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider font-mono">
                          Order Items ({selectedOrder.items.length})
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">Prepared fresh</span>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="p-4 hover:bg-slate-50/60 transition flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-xl mt-0.5 shadow-inner shrink-0">
                                  {item.quantity}x
                                </span>
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-slate-900 leading-snug block">
                                    {item.nameSnapshot}
                                  </span>
                                  {item.prepTimeMinutesSnapshot && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3 text-slate-400" strokeWidth={2} />
                                      <span>~{item.prepTimeMinutesSnapshot}m prep</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-sm font-black text-slate-900 shrink-0">
                                {formatAmount(item.unitPriceSnapshot * item.quantity)}
                              </span>
                            </div>

                            {/* Add-ons */}
                            {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                              <div className="pl-10 flex flex-wrap gap-1.5 mt-0.5">
                                {item.selectedAddOns.map((addon, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="inline-flex items-center text-[10px] font-bold bg-amber-50 border border-amber-200/80 text-amber-800 px-2 py-0.5 rounded-md"
                                  >
                                    + {addon.name} ({formatAmount(addon.priceDelta)})
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Special Instructions */}
                            {item.specialInstructions && (
                              <div className="ml-10 mt-1 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 italic">
                                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                                <span>"{item.specialInstructions}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer General Note */}
                    {selectedOrder.customerNote && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Customer Note
                        </span>
                        <p className="text-slate-700 italic font-medium">"{selectedOrder.customerNote}"</p>
                      </div>
                    )}

                    {/* Receipt & Bill Breakdown */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                        <span>Subtotal</span>
                        <span className="font-mono font-bold text-slate-800">{formatAmount(selectedOrder.subtotal)}</span>
                      </div>

                      {selectedOrder.taxBreakdown && selectedOrder.taxBreakdown.length > 0 ? (
                        selectedOrder.taxBreakdown.map((t, i) => (
                          <div key={i} className="flex justify-between items-center text-xs text-slate-500">
                            <span>{t.name} ({t.percentage}%)</span>
                            <span className="font-mono">{formatAmount(t.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Taxes & GST</span>
                          <span className="font-mono">{formatAmount(selectedOrder.tax)}</span>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-dashed border-slate-300 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                            Total Amount
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                            {selectedOrder.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING'}
                          </span>
                        </div>
                        <span className="font-mono text-xl font-black text-slate-950">
                          {formatAmount(selectedOrder.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="p-5 sm:p-6 bg-slate-50/90 border-t border-slate-200 flex flex-col gap-3 shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Cancel Button */}
                      {['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(selectedOrder.status) && (
                        <button
                          onClick={() => setOrderToCancel(selectedOrder)}
                          className="py-3.5 px-4 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-2xl transition active:scale-98"
                        >
                          Cancel Ticket
                        </button>
                      )}

                      {/* Primary Advance CTA */}
                      {(() => {
                        const nextStatus = getNextStatus(selectedOrder.status, workflowMode);
                        if (nextStatus) {
                          const nextAction = getNextActionLabel(selectedOrder.status, workflowMode);
                          const ActionIcon = nextAction.icon;

                          return (
                            <button
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  orderId: selectedOrder._id,
                                  nextStatus,
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                              className={`flex-1 py-3.5 px-6 text-white text-xs font-black rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-98 ${nextAction.gradient}`}
                            >
                              {updateStatusMutation.isPending ? (
                                <Loader className="w-4 h-4 animate-spin text-white" strokeWidth={2} />
                              ) : (
                                <>
                                  <ActionIcon className="w-4 h-4" strokeWidth={2} />
                                  <span>{nextAction.label}</span>
                                  <ArrowRight className="w-4 h-4 ml-1" strokeWidth={2} />
                                </>
                              )}
                            </button>
                          );
                        }

                        return (
                          <div className="flex-1 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                            <span>Order Complete &amp; Served</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Settle Table Session CTA if Served */}
                    {selectedOrder.sessionId && selectedOrder.status === 'SERVED' && (
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.post(
                              `/restaurants/${activeRestaurantId}/table-sessions/${selectedOrder.sessionId}/close`
                            );
                            toast('Table settled and session closed!', 'success');
                            setSelectedOrder(null);
                            queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
                          } catch (err: any) {
                            toast(err.response?.data?.error?.message || 'Failed to settle table', 'error');
                          }
                        }}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm active:scale-98"
                      >
                        <Receipt className="w-4 h-4 text-amber-400" strokeWidth={2} />
                        <span>Close Session &amp; Free Table</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ══════════════════════════════════════════════
          MODERN CONFIRM CANCEL MODAL
          ══════════════════════════════════════════════ */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {orderToCancel && (
              <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-4 flex min-h-screen items-center justify-center select-none">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 my-auto z-10"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                    <HelpCircle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">Cancel Order #{orderToCancel.orderNumber}?</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    Are you sure you want to cancel this ticket? The kitchen will be alerted and this ticket will be marked as cancelled.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(null)}
                      className="w-1/2 py-3 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                    >
                      Keep Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelOrderMutation.mutate(orderToCancel._id)}
                      disabled={cancelOrderMutation.isPending}
                      className="w-1/2 py-3 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition shadow-sm"
                    >
                      {cancelOrderMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export default ManagerOrders;
