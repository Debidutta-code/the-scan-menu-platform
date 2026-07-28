import React, { useState, useEffect } from 'react';
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
  Layers,
  Search,
  Filter
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
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerNote?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  source: string;
  createdAt: string;
}

// ─── Workflow Step Definitions ─────────────────────────────────────────────────

const WORKFLOW_STEPS: Record<WorkflowMode, { status: string; label: string; color: string; barColor: string }[]> = {
  FIVE_STEP: [
    { status: 'PENDING',  label: 'New',       color: 'text-amber-600',  barColor: 'bg-amber-500' },
    { status: 'ACCEPTED', label: 'Accepted',  color: 'text-emerald-600', barColor: 'bg-emerald-500' },
    { status: 'PREPARING',label: 'Kitchen',   color: 'text-indigo-600', barColor: 'bg-indigo-500' },
    { status: 'READY',    label: 'Ready',     color: 'text-purple-600', barColor: 'bg-purple-500' },
    { status: 'SERVED',   label: 'Served',    color: 'text-blue-600',   barColor: 'bg-blue-500' },
  ],
  FOUR_STEP: [
    { status: 'PENDING',  label: 'New',       color: 'text-amber-600',  barColor: 'bg-amber-500' },
    { status: 'PREPARING',label: 'Kitchen',   color: 'text-indigo-600', barColor: 'bg-indigo-500' },
    { status: 'READY',    label: 'Ready',     color: 'text-purple-600', barColor: 'bg-purple-500' },
    { status: 'SERVED',   label: 'Served',    color: 'text-blue-600',   barColor: 'bg-blue-500' },
  ],
  THREE_STEP: [
    { status: 'PENDING',  label: 'New',       color: 'text-amber-600',  barColor: 'bg-amber-500' },
    { status: 'PREPARING',label: 'Preparing', color: 'text-indigo-600', barColor: 'bg-indigo-500' },
    { status: 'SERVED',   label: 'Served',    color: 'text-blue-600',   barColor: 'bg-blue-500' },
  ],
};

const getNextStatus = (currentStatus: string, workflowMode: WorkflowMode): string | null => {
  const steps = WORKFLOW_STEPS[workflowMode];
  const idx = steps.findIndex((s) => s.status === currentStatus);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1].status;
};

const getNextActionLabel = (currentStatus: string, workflowMode: WorkflowMode): string => {
  const nextStatus = getNextStatus(currentStatus, workflowMode);
  switch (nextStatus) {
    case 'ACCEPTED':  return 'Accept Order';
    case 'PREPARING': return 'Start Preparing';
    case 'READY':     return 'Mark as Ready';
    case 'SERVED':    return 'Mark as Served';
    default:          return 'Advance Order';
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getElapsedTimeLabel = (createdAt: string, now: Date) => {
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  return `${diffHrs}h ${diffMin % 60}m ago`;
};

const formatAmount = (amt: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(amt / 100);

// ─── Progress Bar Component (dynamic) ─────────────────────────────────────────

const OrderProgressBar: React.FC<{ currentStatus: string; workflowMode: WorkflowMode; compact?: boolean }> = ({
  currentStatus,
  workflowMode,
  compact = false,
}) => {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="w-full py-1.5 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-red-600 font-mono">
        <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span>ORDER CANCELLED</span>
      </div>
    );
  }

  const steps = WORKFLOW_STEPS[workflowMode];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const currentStep = currentIdx + 1;

  if (compact) {
    return (
      <div className="flex items-center gap-1 w-full">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const active = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={step.status}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                active ? step.barColor : 'bg-slate-200'
              } ${isCurrent ? 'animate-pulse' : ''}`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
      <div className="flex items-center justify-between text-[10px] font-mono font-extrabold text-slate-500">
        <span className="flex items-center gap-1 text-slate-700">
          <Layers className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
          ORDER PROGRESS
        </span>
        <span className="text-slate-700">
          Step {currentStep} of {steps.length} •{' '}
          <strong className="text-slate-900 uppercase font-black">{currentStatus}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1.5 w-full">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const active = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={step.status} className="flex-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  active ? step.barColor : 'bg-slate-200'
                } ${isCurrent ? 'ring-2 ring-slate-900/20 shadow-sm animate-pulse' : ''}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stepNum === currentStep;
          const isPast = stepNum <= currentStep;
          return (
            <span
              key={step.status}
              className={`transition-colors ${
                isCurrent
                  ? 'text-slate-900 font-black underline decoration-2 underline-offset-2'
                  : isPast
                  ? 'text-slate-700 font-bold'
                  : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Status badges/icons ──────────────────────────────────────────────────────

const statusIcons: Record<string, React.ReactNode> = {
  PENDING:   <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" strokeWidth={1.75} />,
  ACCEPTED:  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />,
  PREPARING: <ChefHat className="w-3.5 h-3.5 text-indigo-500" strokeWidth={1.75} />,
  READY:     <Utensils className="w-3.5 h-3.5 text-purple-500" strokeWidth={1.75} />,
  SERVED:    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.75} />,
  CANCELLED: <XCircle className="w-3.5 h-3.5 text-red-500" strokeWidth={1.75} />,
};

const statusBadges: Record<string, string> = {
  PENDING:   'bg-amber-50 border-amber-100 text-amber-800',
  ACCEPTED:  'bg-emerald-50 border-emerald-100 text-emerald-800',
  PREPARING: 'bg-indigo-50 border-indigo-100 text-indigo-800',
  READY:     'bg-purple-50 border-purple-100 text-purple-800',
  SERVED:    'bg-blue-50 border-blue-100 text-blue-800',
  CANCELLED: 'bg-red-50 border-red-100 text-red-800',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ManagerOrders: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeRestaurantId = user?.restaurants?.[0];
  const isStaff = user?.role === 'STAFF';

  // Fetch restaurant config for workflow mode
  const { data: restaurantResponse, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['restaurantConfig', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    staleTime: 60_000,
  });

  const workflowMode: WorkflowMode =
    (restaurantResponse?.data?.orderWorkflowMode as WorkflowMode) || 'FIVE_STEP';
  const workflowSteps = WORKFLOW_STEPS[workflowMode];

  // Mobile tab state — initialise to first workflow step
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
      setHistoryPage(1); // reset to page 1 on search change
    }, 500);
    return () => clearTimeout(handler);
  }, [historySearch]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHistoryStatusFilter(e.target.value);
    setHistoryPage(1); // reset to page 1 on filter change
  };

  // 1. Fetch Active Orders
  const { data: activeOrdersResponse, isLoading: isLoadingActive } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
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
    enabled: !!activeRestaurantId,
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
    const timer = setInterval(() => setNow(new Date()), selectedOrder ? 10000 : 30000);
    return () => clearInterval(timer);
  }, [selectedOrder]);

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

  // ─── KOT status update mutation ───────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus }: { orderId: string; nextStatus: string }) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/orders/${orderId}/status`,
        { status: nextStatus }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast(`Order #${data.data.orderNumber} → ${data.data.status}`, 'success');
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
      toast(`Order #${data.data.orderNumber} cancelled`, 'info');
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
      const nameA = (a.tableId?.displayName || a.tableId?.tableNumber || '').toString();
      const nameB = (b.tableId?.displayName || b.tableId?.tableNumber || '').toString();
      return nameA.localeCompare(nameB);
    });
  };

  // ─── Loading state guard ──────────────────────────────────────────────────

  if (activeRestaurantId && (isLoadingConfig || isLoadingActive)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100/60 p-6 text-center">
        <Loader className="w-8 h-8 animate-spin text-slate-500 mb-3" strokeWidth={1.75} />
        <p className="text-slate-500 text-xs font-semibold">Loading orders workflow...</p>
      </div>
    );
  }

  // ─── No restaurant guard ──────────────────────────────────────────────────

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4">
          <AlertCircle className="w-8 h-8" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
          You are currently not associated as a manager or staff member with any restaurant.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col select-none">

      {/* ── Mobile Status Tab Bar ── */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-3 bg-white border-b border-slate-150 shrink-0 scrollbar-none">
        {workflowSteps.map((step) => {
          const count = getOrdersByStatus(step.status).length;
          const isActive = mobileStatusTab === step.status;
          return (
            <button
              key={step.status}
              onClick={() => setMobileStatusTab(step.status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all duration-150 shrink-0 ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{step.label}</span>
              <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-bold font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Order Columns ── */}
      <div className="p-4 md:p-6 bg-slate-100/60 flex flex-col gap-6">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div
            className={`h-full grid grid-cols-1 gap-4 min-w-[320px]`}
            style={{
              gridTemplateColumns: `repeat(${workflowSteps.length}, minmax(260px, 1fr))`,
              minWidth: `${workflowSteps.length * 280}px`,
              minHeight: '90vh'
            }}
          >
          {workflowSteps.map((step) => {
            const ordersInColumn = getOrdersByStatus(step.status);
            const isMobileHidden = mobileStatusTab !== step.status;

            const columnTitles: Record<string, string> = {
              PENDING:   'New Tickets',
              ACCEPTED:  'Accepted',
              PREPARING: 'In Kitchen',
              READY:     'Ready for Pickup',
              SERVED:    'Served Today',
            };

            return (
              <div
                key={step.status}
                className={`flex flex-col h-full bg-slate-50/80 border border-slate-200/80 rounded-3xl p-3 shadow-sm ${
                  isMobileHidden ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-1.5 mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${step.barColor}`} />
                    <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      {columnTitles[step.status] || step.label}
                    </span>
                    <span className="bg-slate-200 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {ordersInColumn.length}
                    </span>
                  </div>
                </div>

                {/* Column Scrollable Orders */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                  {isLoadingActive && step.status !== 'SERVED' ? (
                    <div className="flex justify-center py-8">
                      <Loader className="w-5 h-5 animate-spin text-slate-400" strokeWidth={1.75} />
                    </div>
                  ) : ordersInColumn.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                      <span>No orders</span>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {ordersInColumn.map((order) => (
                        <motion.div
                          key={order._id}
                          onClick={() => setSelectedOrder(order)}
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -15 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="bg-white border border-slate-150 hover:border-slate-300 rounded-2xl p-4 shadow-sm hover:shadow cursor-pointer transition flex flex-col gap-3 shrink-0"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 leading-none">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              {getElapsedTimeLabel(order.createdAt, now)}
                            </span>
                          </div>

                          {/* Table Name */}
                          <h4 className="text-xs font-extrabold text-slate-800 tracking-tight truncate">
                            📍 Table {order.tableId?.displayName || order.tableId?.tableNumber || order.tableId}
                          </h4>

                          {/* Customer Details Preview */}
                          {order.customerName && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-[-4px]">
                              👤 {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                            </p>
                          )}

                          {/* Progress Bar */}
                          <OrderProgressBar
                            currentStatus={order.status}
                            workflowMode={workflowMode}
                            compact
                          />

                          {/* Items Preview */}
                          <div className="space-y-1.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="truncate text-xs font-semibold text-slate-700 leading-none">
                                  {item.nameSnapshot}{' '}
                                  <strong className="text-slate-400 font-mono text-[10px]">x{item.quantity}</strong>
                                </span>
                                {item.specialInstructions && (
                                  <FileText className="w-3 h-3 text-amber-500 shrink-0" strokeWidth={1.75} />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Total Row */}
                          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-700 font-mono">
                            <span className="text-slate-400 font-sans text-[10px]">Total</span>
                            <span>{formatAmount(order.total)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}

                  {/* Served Load More */}
                  {step.status === 'SERVED' && hasMoreServed && (
                    <button
                      onClick={() => setServedPage((p) => p + 1)}
                      disabled={isFetchingServed}
                      className="w-full py-2.5 border border-dashed border-slate-200 bg-white/35 hover:bg-white/80 rounded-xl text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1.5 transition"
                    >
                      {isFetchingServed ? (
                        <Loader className="w-3.5 h-3.5 animate-spin text-slate-400" strokeWidth={1.75} />
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

        {/* ── All Orders History Section ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm shrink-0 mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-display font-bold text-slate-800">Order History</h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search order ID, phone, name..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-40 shrink-0">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <select
                  value={historyStatusFilter}
                  onChange={handleStatusFilterChange}
                  className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 appearance-none bg-white font-bold text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">New (Pending)</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="READY">Ready</option>
                  <option value="SERVED">Served</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* History List — table-style rows */}
          {isFetchingHistory && historyOrders.length === 0 ? (
            <div className="py-10 flex justify-center">
              <Loader className="w-5 h-5 animate-spin text-slate-400" strokeWidth={1.75} />
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Search className="w-8 h-8 mb-2 text-slate-300" strokeWidth={1.5} />
              <p className="text-sm font-bold">No orders found</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_100px_90px_80px] gap-3 px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>#</span>
                <span>Table</span>
                <span>Customer</span>
                <span>Date &amp; Time</span>
                <span>Status</span>
                <span className="text-right">Total</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {historyOrders.map((order, idx) => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={`grid grid-cols-[56px_1fr_80px] sm:grid-cols-[80px_1fr_1fr_100px_90px_80px] gap-3 items-center px-4 py-3 cursor-pointer transition-colors hover:bg-amber-50/60 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                    }`}
                  >
                    {/* Order # */}
                    <span className="font-mono text-xs font-extrabold text-slate-800">
                      #{order.orderNumber}
                    </span>

                    {/* Table */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}
                      </p>
                    </div>

                    {/* Customer — hidden on mobile */}
                    <div className="hidden sm:block min-w-0">
                      {order.customerName ? (
                        <p className="text-xs text-slate-500 truncate">
                          {order.customerName}
                          {order.customerPhone && <span className="text-slate-400 font-mono ml-1 text-[10px]">({order.customerPhone})</span>}
                        </p>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </div>

                    {/* Date & Time — hidden on mobile */}
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-mono leading-tight">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Status — hidden on mobile */}
                    <div className="hidden sm:flex">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${statusBadges[order.status]}`}>
                        {statusIcons[order.status]}
                        <span>{order.status}</span>
                      </span>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <span className="font-mono text-xs font-black text-slate-800">
                        {formatAmount(order.total)}
                      </span>
                      {/* Mobile-only status badge */}
                      <span className={`sm:hidden mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold ${statusBadges[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMoreHistory && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={isFetchingHistory}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                {isFetchingHistory ? (
                  <Loader className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  'Load More Orders'
                )}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          ORDER DETAIL MODAL / DRAWER
          ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50 overflow-hidden select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-white rounded-t-[2.5rem] md:rounded-3xl w-full max-w-lg md:max-w-md max-h-[85vh] md:max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-10"
            >
              {/* Mobile drag handle */}
              <div className="md:hidden h-1.5 w-12 bg-slate-250 rounded-full mx-auto my-3 shrink-0" />

              {/* Modal Header */}
              <div className="px-5 md:px-6 pb-4 border-b border-slate-150 flex items-start justify-between bg-slate-50/50 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      Order #{selectedOrder.orderNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold font-mono tracking-wider ${statusBadges[selectedOrder.status]}`}>
                      {statusIcons[selectedOrder.status]}
                      <span>{selectedOrder.status}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Received: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {getElapsedTimeLabel(selectedOrder.createdAt, now)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition shrink-0"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-4">
                {/* Dynamic Progress Bar */}
                <OrderProgressBar currentStatus={selectedOrder.status} workflowMode={workflowMode} />

                {/* Location + Round */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex flex-col gap-2 font-bold text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none">📍</span>
                      <span>Table {selectedOrder.tableId?.displayName || selectedOrder.tableId?.tableNumber || selectedOrder.tableId}</span>
                    </div>
                    {selectedOrder.roundNumber && (
                      <span className="bg-slate-200 text-slate-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Round {selectedOrder.roundNumber}
                      </span>
                    )}
                  </div>
                  {selectedOrder.customerName && (
                    <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                      <span className="text-base leading-none">👤</span>
                      <span>
                        {selectedOrder.customerName}
                        {selectedOrder.customerPhone && (
                           <span className="ml-1 text-slate-400 font-mono">({selectedOrder.customerPhone})</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items List (read-only, no checkboxes) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Ticket Items ({selectedOrder.items.length})
                  </h4>

                  <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl p-3 bg-white">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 text-xs flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-extrabold leading-tight text-slate-900">
                              {item.nameSnapshot}{' '}
                              <span className="font-mono text-slate-400 font-bold text-xs">x{item.quantity}</span>
                            </span>
                            {item.prepTimeMinutesSnapshot && item.prepTimeMinutesSnapshot <= 10 && (
                              <span className="inline-block ml-2 text-[8px] bg-amber-50 border border-amber-100 text-amber-700 px-1 rounded font-extrabold font-sans tracking-wide uppercase">
                                Quick
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-slate-700 font-extrabold shrink-0">
                            {formatAmount(item.unitPriceSnapshot * item.quantity)}
                          </span>
                        </div>

                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-sans italic pl-2">
                            + {item.selectedAddOns.map((x) => `${x.name} (${formatAmount(x.priceDelta)})`).join(', ')}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <div className="flex gap-1.5 items-start text-[11px] bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-xl italic font-sans leading-relaxed ml-2">
                            <FileText className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" strokeWidth={1.75} />
                            <span>"{item.specialInstructions}"</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Note */}
                {selectedOrder.customerNote && (
                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs space-y-1">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Customer Note</span>
                    <p className="text-slate-600 leading-relaxed italic font-sans">"{selectedOrder.customerNote}"</p>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-slate-150 pt-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatAmount(selectedOrder.subtotal)}</span>
                  </div>
                  {(selectedOrder as any).taxBreakdown && (selectedOrder as any).taxBreakdown.length > 0 ? (
                    (selectedOrder as any).taxBreakdown.map((t: any, i: number) => (
                      <div key={i} className="flex flex-col gap-0.5">
                          <div className="flex justify-between items-center text-[11px] text-slate-600 font-bold font-sans">
                            <span>{t.name} ({t.percentage}%)</span>
                            <span className="font-mono">{formatAmount(t.amount)}</span>
                          </div>
                          {t.subTaxes && t.subTaxes.length > 0 && (
                            <div className="pl-2 border-l border-slate-200 ml-1 space-y-0.5 my-0.5">
                              {t.subTaxes.map((st: any, j: number) => (
                                <div key={j} className="flex justify-between items-center text-[10px] text-slate-400 font-medium font-sans">
                                  <span>{st.name} ({st.percentage}%)</span>
                                  <span className="font-mono text-slate-400">({formatAmount(st.amount)})</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                      <span>Taxes</span>
                      <span className="font-mono">{formatAmount(selectedOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-1.5 border-t border-dashed border-slate-150">
                    <span className="font-sans text-xs">Total Bill Amount</span>
                    <span className="text-base font-black font-mono">{formatAmount(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-5 md:p-6 bg-slate-50/50 border-t border-slate-150 flex flex-col gap-3 shrink-0">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Cancel (manager only, non-served/cancelled) */}
                  {!isStaff &&
                    ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(selectedOrder.status) && (
                      <button
                        onClick={() => setOrderToCancel(selectedOrder)}
                        className="flex-1 py-3.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-extrabold rounded-2xl transition active:scale-[0.98]"
                      >
                        Cancel Order
                      </button>
                    )}

                  {/* Single KOT Advance Button */}
                  {(() => {
                    const nextStatus = getNextStatus(selectedOrder.status, workflowMode);
                    if (nextStatus) {
                      const label = getNextActionLabel(selectedOrder.status, workflowMode);
                      return (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              orderId: selectedOrder._id,
                              nextStatus,
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-extrabold rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                        >
                          {updateStatusMutation.isPending ? (
                            <Loader className="w-4 h-4 animate-spin text-white" strokeWidth={1.75} />
                          ) : (
                            <>
                              <span>{label}</span>
                              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
                            </>
                          )}
                        </button>
                      );
                    }

                    return (
                      <div className="flex-1 py-3.5 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold rounded-2xl text-center select-none">
                        ✓ Successfully Served
                      </div>
                    );
                  })()}
                </div>

                {/* Settle Table */}
                {selectedOrder.sessionId && selectedOrder.status === 'SERVED' && (() => {
                  const hasPendingRounds = activeOrders.some(
                    (o) =>
                      o.sessionId === selectedOrder.sessionId &&
                      o.status !== 'SERVED' &&
                      o.status !== 'CANCELLED'
                  );
                  return (
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
                      disabled={hasPendingRounds}
                      className={`w-full py-3.5 text-white text-xs font-extrabold rounded-2xl transition shadow-md ${
                        hasPendingRounds
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                      }`}
                    >
                      {hasPendingRounds ? 'Finish Active Rounds to Settle' : 'Close Table / Settle Bill'}
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          CONFIRM CANCEL MODAL
          ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {orderToCancel && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <HelpCircle className="w-6 h-6 shrink-0" strokeWidth={1.75} />
                <h3 className="font-bold text-lg leading-none">Cancel Kitchen Order?</h3>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed mb-6 font-sans">
                Are you sure you want to cancel <strong>Order #{orderToCancel.orderNumber}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="w-1/2 py-3 border border-slate-200 text-slate-600 text-xs font-extrabold rounded-xl hover:bg-slate-50 transition active:scale-[0.98]"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  onClick={() => cancelOrderMutation.mutate(orderToCancel._id)}
                  disabled={cancelOrderMutation.isPending}
                  className="w-1/2 py-3 bg-red-600 text-white text-xs font-extrabold rounded-xl hover:bg-red-700 transition active:scale-[0.98]"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerOrders;
