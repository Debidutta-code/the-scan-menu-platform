import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  ArrowRight,
  Loader,
  AlertCircle,
  X,
  Search,
  MapPin,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Receipt,
  Check,
  RefreshCw,
  RotateCcw,
  Kanban as KanbanIcon,
  User,
  Trash2,
  Banknote,
  QrCode,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useManagerOrders, Order, WorkflowMode } from '../hooks/useManagerOrders';
import { printOrderTicket } from '../utils/printReceipt';
import apiClient from '../lib/api';

// ─── Workflow Step Definitions ────────────────────────────────────────────────

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
      return { label: 'Accept Order', gradient: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: Check };
    case 'PREPARING':
      return { label: 'Start Kitchen Prep', gradient: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: ChefHat };
    case 'READY':
      return { label: 'Mark Ready to Serve', gradient: 'bg-purple-600 hover:bg-purple-700 text-white', icon: Sparkles };
    case 'SERVED':
      return { label: 'Mark as Served', gradient: 'bg-blue-600 hover:bg-blue-700 text-white', icon: Utensils };
    default:
      return { label: 'Advance Order', gradient: 'bg-slate-900 hover:bg-slate-800 text-white', icon: ArrowRight };
  }
};

const getPreviousStatus = (currentStatus: string, workflowMode: WorkflowMode): string | null => {
  const steps = WORKFLOW_STEPS[workflowMode];
  const idx = steps.findIndex((s) => s.status === currentStatus);
  if (idx <= 0) return null;
  return steps[idx - 1].status;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { label: 'New Order', bg: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' };
    case 'ACCEPTED':
      return { label: 'Accepted', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' };
    case 'PREPARING':
      return { label: 'Kitchen Prep', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80', dot: 'bg-indigo-500' };
    case 'READY':
      return { label: 'Ready', bg: 'bg-purple-50 text-purple-800 border-purple-200/80', dot: 'bg-purple-500' };
    case 'SERVED':
      return { label: 'Served', bg: 'bg-blue-50 text-blue-800 border-blue-200/80', dot: 'bg-blue-500' };
    case 'COMPLETED':
      return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: 'bg-rose-50 text-rose-800 border-rose-200/80', dot: 'bg-rose-500' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-500' };
  }
};

const getElapsedTimeLabel = (createdAt: string, now: Date) => {
  const diffMs = now.getTime() - new Date(createdAt).getTime();
  const diffSecTotal = Math.max(0, Math.floor(diffMs / 1000));
  const hrs = Math.floor(diffSecTotal / 3600);
  const mins = Math.floor((diffSecTotal % 3600) / 60);
  const secs = diffSecTotal % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ago`;
  }
  if (mins > 0) {
    return `${mins}m ago`;
  }
  return `${secs}s ago`;
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

export const ManagerOrders: React.FC = () => {
  // Active view toggle: Kanban vs History table
  const [viewMode, setViewMode] = useState<'KANBAN' | 'HISTORY'>('KANBAN');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for the dedicated Right Details Panel
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // 3-dot dropdown menu and cancel confirmation state
  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  // Animated visual highlight for payment requirement in prepaid mode
  const [isPaymentHighlighted, setIsPaymentHighlighted] = useState(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceTimestampRef = useRef<number>(0);

  useEffect(() => {
    setShowOrderMenu(false);
    setIsConfirmingCancel(false);
    setIsPaymentHighlighted(false);
  }, [selectedOrderId]);

  // All Orders History States
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Live clock
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Hook for orders
  const {
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
  } = useManagerOrders({
    historyPage,
    debouncedSearch,
    historyStatusFilter: 'ALL',
    isHistoryView: viewMode === 'HISTORY',
  });

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurantProfilePrint', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    staleTime: 60_000,
  });

  const orderingPaymentPolicy = useMemo(() => {
    return (
      restaurantData?.data?.settings?.paymentConfig?.activeMode ||
      restaurantData?.data?.paymentConfig?.activeMode ||
      restaurantData?.data?.activeMode ||
      'POSTPAID'
    ) as 'PREPAID' | 'POSTPAID' | 'HYBRID';
  }, [restaurantData]);

  const restaurantInfo = useMemo(() => ({
    _id: activeRestaurantId,
    name: restaurantData?.data?.name || 'Restaurant',
    address: restaurantData?.data?.address,
    phone: restaurantData?.data?.phone,
    gstNumber: restaurantData?.data?.gstNumber,
    logoUrl: restaurantData?.data?.branding?.logoUrl,
    currency: restaurantData?.data?.currency || 'INR',
    settings: restaurantData?.data?.settings,
    printerConfig: restaurantData?.data?.printerConfig || restaurantData?.data?.settings?.printerConfig,
    headerMessage: restaurantData?.data?.settings?.receiptHeader || 'Welcome!',
    footerMessage: restaurantData?.data?.settings?.receiptFooter || 'Thank you for dining with us!',
  }), [restaurantData, activeRestaurantId]);

  const workflowSteps = WORKFLOW_STEPS[workflowMode] || WORKFLOW_STEPS['THREE_STEP'];

  // Filtered active orders based on search query
  const filteredActiveOrders = useMemo(() => {
    if (!searchQuery.trim()) return activeOrders;
    const q = searchQuery.toLowerCase();
    return activeOrders.filter((o) => {
      const orderNum = o.orderNumber?.toString() || '';
      const table = (o.tableId?.displayName || o.tableId?.tableNumber || '').toString().toLowerCase();
      const customer = (o.customerName || '').toLowerCase();
      const phone = (o.customerPhone || '').toLowerCase();
      return orderNum.includes(q) || table.includes(q) || customer.includes(q) || phone.includes(q);
    });
  }, [activeOrders, searchQuery]);

  // Group active orders by status
  const getOrdersByStatus = useCallback((status: string) => {
    const list = filteredActiveOrders.filter((o) => o.status === status);
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
  }, [filteredActiveOrders]);

  // Sync selected order object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }
    return (
      activeOrders.find((o) => o._id === selectedOrderId) ||
      historyOrders.find((o) => o._id === selectedOrderId) ||
      null
    );
  }, [selectedOrderId, activeOrders, historyOrders]);

  // Reset cancel confirm state when selected order changes
  useEffect(() => {
    setIsConfirmingCancel(false);
  }, [selectedOrderId]);

  // Sync history orders pagination
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

  // Live clock timer (1s interval for real-time seconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Action Handlers
  const handleAdvanceStatus = useCallback((order: Order) => {
    const timestamp = Date.now();
    // 160ms throttle to absorb accidental double-strike hardware bounces
    if (timestamp - lastAdvanceTimestampRef.current < 160) {
      return;
    }
    lastAdvanceTimestampRef.current = timestamp;

    const isPrepaid = orderingPaymentPolicy === 'PREPAID';
    if (isPrepaid && order.paymentStatus !== 'PAID' && order.status === 'PENDING') {
      // Direct visual highlight animation on payment options instead of generic toast error
      setSelectedOrderId(order._id);
      setIsPaymentHighlighted(true);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => {
        setIsPaymentHighlighted(false);
      }, 3500);
      return;
    }
    const nextStatus = getNextStatus(order.status, workflowMode);
    if (!nextStatus) return;
    updateStatusMutation.mutate({ orderId: order._id, nextStatus });
  }, [orderingPaymentPolicy, workflowMode, updateStatusMutation]);

  const handleRevertStatus = useCallback((order: Order) => {
    const prevStatus = getPreviousStatus(order.status, workflowMode);
    if (!prevStatus) return;
    updateStatusMutation.mutate({ orderId: order._id, nextStatus: prevStatus });
  }, [workflowMode, updateStatusMutation]);

  const handleTogglePaymentStatus = (order: Order, paymentMethod?: string) => {
    setIsPaymentHighlighted(false);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    const nextPaymentStatus = order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    updatePaymentStatusMutation.mutate({
      orderId: order._id,
      paymentStatus: nextPaymentStatus,
      paymentMethod: nextPaymentStatus === 'PAID' ? (paymentMethod || 'cash') : undefined,
    });
  };

  const handleFreeTable = useCallback((order: Order, printBill = true) => {
    const timestamp = Date.now();
    if (timestamp - lastAdvanceTimestampRef.current < 250) {
      return;
    }
    lastAdvanceTimestampRef.current = timestamp;

    if (printBill) {
      printOrderTicket(order, restaurantInfo, 'CUSTOMER');
    }
    clearOrderMutation.mutate({ orderId: order._id });
  }, [restaurantInfo, clearOrderMutation]);

  const handleConfirmCancel = (order: Order) => {
    cancelOrderMutation.mutate(order._id);
    setIsConfirmingCancel(false);
  };

  // Keyboard Shortcuts (Enter = Advance/Free, Backspace = Revert, Arrow Keys = Navigation, Escape = Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.tagName === 'TEXTAREA');
      if (isInputActive) return;

      if (e.key === 'Escape') {
        if (isConfirmingCancel) {
          setIsConfirmingCancel(false);
        } else if (selectedOrderId) {
          setSelectedOrderId(null);
        }
        return;
      }

      if (!selectedOrder) return;

      // 1. Enter: Advance status OR Free Table on SERVED
      if (e.key === 'Enter') {
        const nextStatus = getNextStatus(selectedOrder.status, workflowMode);
        if (nextStatus) {
          e.preventDefault();
          handleAdvanceStatus(selectedOrder);
        } else if (selectedOrder.status === 'SERVED') {
          e.preventDefault();
          handleFreeTable(selectedOrder, true);
        }
        return;
      }

      // 2. Backspace: Revert status to previous stage
      if (e.key === 'Backspace') {
        const prevStatus = getPreviousStatus(selectedOrder.status, workflowMode);
        if (prevStatus) {
          e.preventDefault();
          handleRevertStatus(selectedOrder);
        }
        return;
      }

      // 3. Arrow Keys: Card navigation in Kanban board
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && viewMode === 'KANBAN') {
        e.preventDefault();
        let currentColIdx = -1;
        let currentRowIdx = -1;

        for (let col = 0; col < workflowSteps.length; col++) {
          const list = getOrdersByStatus(workflowSteps[col].status);
          const rIdx = list.findIndex((o) => o._id === selectedOrder._id);
          if (rIdx !== -1) {
            currentColIdx = col;
            currentRowIdx = rIdx;
            break;
          }
        }

        if (currentColIdx === -1) return;

        if (e.key === 'ArrowDown') {
          const currentList = getOrdersByStatus(workflowSteps[currentColIdx].status);
          if (currentRowIdx < currentList.length - 1) {
            setSelectedOrderId(currentList[currentRowIdx + 1]._id);
          }
        } else if (e.key === 'ArrowUp') {
          const currentList = getOrdersByStatus(workflowSteps[currentColIdx].status);
          if (currentRowIdx > 0) {
            setSelectedOrderId(currentList[currentRowIdx - 1]._id);
          }
        } else if (e.key === 'ArrowRight') {
          for (let col = currentColIdx + 1; col < workflowSteps.length; col++) {
            const targetList = getOrdersByStatus(workflowSteps[col].status);
            if (targetList.length > 0) {
              const targetRow = Math.min(currentRowIdx, targetList.length - 1);
              setSelectedOrderId(targetList[targetRow]._id);
              break;
            }
          }
        } else if (e.key === 'ArrowLeft') {
          for (let col = currentColIdx - 1; col >= 0; col--) {
            const targetList = getOrdersByStatus(workflowSteps[col].status);
            if (targetList.length > 0) {
              const targetRow = Math.min(currentRowIdx, targetList.length - 1);
              setSelectedOrderId(targetList[targetRow]._id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedOrder,
    selectedOrderId,
    isConfirmingCancel,
    workflowMode,
    workflowSteps,
    viewMode,
    getOrdersByStatus,
    handleAdvanceStatus,
    handleRevertStatus,
    handleFreeTable,
  ]);

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
    <div className="w-full h-full flex flex-col min-h-0 space-y-3 font-sans select-none overflow-hidden pb-1">
      {/* ── Top Bar / Header & Filters ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 sm:px-4 shadow-xs shrink-0">
        {/* Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search orders, tables, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-sans transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher & Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
          <button
            onClick={() => refetchActiveOrders()}
            className="p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
            title="Refresh Orders Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingActive ? 'animate-spin text-amber-500' : ''}`} strokeWidth={2} />
          </button>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Order History</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace Area (Left Stages + Right Details Panel) ── */}
      <div className="flex-1 min-h-0 flex gap-3.5 overflow-hidden">
        {/* ── LEFT / MIDDLE: KANBAN STAGES OR HISTORY TABLE ── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {viewMode === 'KANBAN' ? (
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scrollbar-none">
              <div
                className="grid h-full gap-2.5"
                style={{
                  gridTemplateColumns: `repeat(${workflowSteps.length}, minmax(190px, 1fr))`,
                  minWidth: `${workflowSteps.length * 195}px`,
                }}
              >
                {workflowSteps.map((step) => {
                  const ordersInColumn = getOrdersByStatus(step.status);
                  const StepIcon = step.icon;

                  return (
                    <div
                      key={step.status}
                      className="flex flex-col h-full bg-slate-100/60 border border-slate-200/80 rounded-2xl p-2.5 min-h-0 overflow-hidden"
                    >
                      {/* Column Header with improved padding */}
                      <div className="flex items-center justify-between px-3 py-2 mb-2 bg-white border border-slate-200/70 rounded-xl shadow-xs shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1 rounded-lg ${step.badgeBg} shrink-0`}>
                            <StepIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </div>
                          <span className="font-bold text-xs text-slate-900 tracking-tight truncate">
                            {step.label}
                          </span>
                        </div>
                        <span className="bg-slate-900 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-full shadow-inner shrink-0">
                          {ordersInColumn.length}
                        </span>
                      </div>

                      {/* Simple Compact Cards List */}
                      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-1.5 pr-0.5">
                        {isLoadingActive ? (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <Loader className="w-4 h-4 animate-spin mb-1 text-slate-500" strokeWidth={1.75} />
                            <span className="text-[10px] font-semibold">Updating queue...</span>
                          </div>
                        ) : ordersInColumn.length === 0 ? (
                          <div className="h-24 border-2 border-dashed border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-slate-400 text-[11px] font-medium p-2 text-center">
                            <Check className="w-3.5 h-3.5 text-slate-300 mb-0.5" strokeWidth={2} />
                            <span>No orders</span>
                          </div>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {ordersInColumn.map((order: Order) => {
                              const modeInfo = getOrderModeInfo(order.orderMode);
                              const ModeIcon = modeInfo.icon;
                              const isSelected = selectedOrder?._id === order._id;
                              const isPendingAction = pendingOrderIds.has(order._id);
                              const isUnpaid = order.paymentStatus !== 'PAID';
                              const tableName = order.tableId?.displayName || order.tableId?.tableNumber || (order.orderMode === 'DINE_IN' ? 'Dine-In Table' : modeInfo.label);
                              const totalItemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || order.items?.length || 0;

                              return (
                                <motion.div
                                  layout="position"
                                  key={order._id}
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.96 }}
                                  transition={{
                                    layout: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                                    opacity: { duration: 0.14 },
                                  }}
                                  whileHover={{ scale: 1.012 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => setSelectedOrderId((prev) => (prev === order._id ? null : order._id))}
                                  className={`rounded-xl cursor-pointer transition-all duration-150 flex flex-col p-2.5 gap-1.5 group relative overflow-hidden ${
                                    isSelected
                                      ? 'bg-amber-50/80 border-2 border-amber-500 ring-2 ring-amber-500/15 shadow-xs'
                                      : isUnpaid
                                        ? 'bg-white border-y border-r border-slate-200/90 border-l-4 border-l-rose-500 hover:border-rose-400 hover:shadow-2xs'
                                        : 'bg-white border border-slate-200/90 hover:border-amber-400/80 hover:shadow-2xs'
                                  }`}
                                >
                                  {/* Row 1: #Order + Mode + Compact Elapsed Time */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-mono text-[11px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                        #{order.orderNumber}
                                      </span>
                                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${modeInfo.color}`}>
                                        <ModeIcon className="w-2.5 h-2.5" strokeWidth={2} />
                                        <span>{modeInfo.label}</span>
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-semibold text-slate-400 font-mono flex items-center gap-0.5 whitespace-nowrap shrink-0">
                                      <Clock className="w-2.5 h-2.5 text-slate-400" strokeWidth={2} />
                                      {getElapsedTimeLabel(order.createdAt, now)}
                                    </span>
                                  </div>

                                  {/* Row 2: Table Name (Full width for maximum readability) */}
                                  <div className="text-[12px] font-bold text-slate-900 truncate leading-tight">
                                    {tableName}
                                  </div>

                                  {/* Row 3: Items & Unpaid Indicator + Total Amount */}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-1 text-[10px]">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-slate-500 text-[10px] font-medium truncate">
                                        {totalItemsCount} item{totalItemsCount === 1 ? '' : 's'}
                                      </span>
                                      {isUnpaid && (
                                        <span className="text-[8px] font-extrabold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 shrink-0">
                                          UNPAID
                                        </span>
                                      )}
                                      {isPendingAction && (
                                        <Loader className="w-2.5 h-2.5 animate-spin text-amber-600 shrink-0" strokeWidth={2} />
                                      )}
                                    </div>
                                    <span className="font-mono font-black text-slate-900 text-xs shrink-0">
                                      {formatAmount(order.total)}
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Order History Table View ── */
            <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col overflow-hidden">
              <div className="pb-3 border-b border-slate-150 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">All Order Records</h2>
                  <p className="text-xs text-slate-500">Historical tickets and receipts log</p>
                </div>
              </div>

              {isFetchingHistory && historyOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Loader className="w-6 h-6 animate-spin text-slate-500 mb-2" strokeWidth={2} />
                  <span className="text-xs font-semibold">Loading orders...</span>
                </div>
              ) : historyOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 my-4">
                  <Receipt className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-slate-600">No orders found</span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 border border-slate-200/80 rounded-xl overflow-y-auto scrollbar-none mt-3">
                  <div className="divide-y divide-slate-100">
                    {historyOrders.map((order) => {
                      const isSelected = selectedOrder?._id === order._id;
                      const badgeInfo = getStatusBadge(order.status);
                      const modeInfo = getOrderModeInfo(order.orderMode);
                      const ModeIcon = modeInfo.icon;

                      return (
                        <div
                          key={order._id}
                          onClick={() => setSelectedOrderId((prev) => (prev === order._id ? null : order._id))}
                          className={`flex items-center justify-between p-3 cursor-pointer transition ${
                            isSelected ? 'bg-amber-50/80 border-l-4 border-l-amber-500' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-black text-slate-900">
                              #{order.orderNumber}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{order.tableId?.displayName || order.tableId?.tableNumber || 'Takeaway'}</span>
                                <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold inline-flex items-center gap-0.5 ${modeInfo.color}`}>
                                  <ModeIcon className="w-2.5 h-2.5" />
                                  <span>{modeInfo.label}</span>
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.items?.length || 0} items
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${badgeInfo.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot}`} />
                              {badgeInfo.label}
                            </span>
                            <span className="font-mono text-xs font-black text-slate-900">
                              {formatAmount(order.total)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasMoreHistory && (
                <div className="pt-2 flex justify-center shrink-0">
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={isFetchingHistory}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    {isFetchingHistory ? (
                      <Loader className="w-3.5 h-3.5 animate-spin text-slate-500" strokeWidth={2} />
                    ) : (
                      <span>Load More Orders</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: DEDICATED ORDER DETAILS & QUICK ACTION SPACE ── */}
        <div className="w-72 lg:w-[300px] xl:w-[315px] shrink-0 bg-white border border-slate-200/80 rounded-2xl flex flex-col min-h-0 shadow-xs overflow-hidden">
          {selectedOrder ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Header (Clean 2-Liner) */}
              <div className="p-3 border-b border-slate-150 bg-slate-50/70 shrink-0 space-y-1.5">
                {/* Line 1: Order # + Mode & Table (Left) | Status Badge + 3-Dot Menu (Right) */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-base font-black text-slate-900 shrink-0">
                      #{selectedOrder.orderNumber}
                    </span>
                    <span className="text-slate-300 font-normal shrink-0">•</span>
                    <span className="font-bold text-xs text-slate-800 truncate">
                      {selectedOrder.orderMode || 'Dine-In'} • {selectedOrder.tableId?.displayName || selectedOrder.tableId?.tableNumber || 'Table'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(() => {
                      const badge = getStatusBadge(selectedOrder.status);
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      );
                    })()}

                    {/* 3-dot Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowOrderMenu((prev) => !prev);
                          setIsConfirmingCancel(false);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showOrderMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => {
                              setShowOrderMenu(false);
                              setIsConfirmingCancel(false);
                            }}
                          />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1 space-y-1">
                            {['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(selectedOrder.status) ? (
                              isConfirmingCancel ? (
                                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                                  <p className="text-[11px] font-bold text-rose-800 leading-tight">
                                    Cancel order #{selectedOrder.orderNumber}?
                                  </p>
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsConfirmingCancel(false);
                                      }}
                                      className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white rounded transition cursor-pointer"
                                    >
                                      Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmCancel(selectedOrder);
                                        setShowOrderMenu(false);
                                        setIsConfirmingCancel(false);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition cursor-pointer shadow-xs"
                                    >
                                      Yes, Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsConfirmingCancel(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Cancel Order</span>
                                </button>
                              )
                            ) : (
                              <div className="px-2.5 py-1.5 text-xs text-slate-400 italic">
                                No actions available
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line 2: Customer Name (Left) | Elapsed Time with Seconds (Right) */}
                <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                  <span className="flex items-center gap-1 truncate text-[11px]">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{selectedOrder.customerName || 'Guest Diner'} {selectedOrder.customerPhone ? `(${selectedOrder.customerPhone})` : ''}</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0 font-medium flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                    {getElapsedTimeLabel(selectedOrder.createdAt, now)}
                  </span>
                </div>
              </div>

              {/* Scrollable Middle: Items List & Order Summary */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3.5 scrollbar-none divide-y divide-slate-100">
                {/* Order Items Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <span>Order Items ({selectedOrder.items?.length || 0})</span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-slate-400 shrink-0">
                              {item.quantity}x
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-800 block truncate">
                                  {item.nameSnapshot || (item as any).name}
                                </span>
                                {item.isCombo && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    Combo
                                  </span>
                                )}
                              </div>
                              {item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0 && (
                                <div className="text-[11px] text-indigo-900 bg-indigo-50/70 border border-indigo-150 rounded px-1.5 py-0.5 mt-1 space-y-0.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block">Includes:</span>
                                  {item.comboItemsSnapshot.map((c: any, cIdx: number) => (
                                    <div key={cIdx} className="flex items-center gap-1 pl-1">
                                      <span className="text-indigo-400 font-mono">↳</span>
                                      <span className="font-medium">{c.quantity}x {c.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  + {item.selectedAddOns.map((a) => a.name).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-800 shrink-0">
                            {formatAmount(item.unitPriceSnapshot * item.quantity)}
                          </span>
                        </div>

                        {item.specialInstructions && (
                          <div className="ml-6 text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200/70 px-2 py-0.5 rounded-md italic">
                            📝 "{item.specialInstructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedOrder.customerNote && (
                    <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 font-medium italic space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800">Customer Note</span>
                      <p>"{selectedOrder.customerNote}"</p>
                    </div>
                  )}
                </div>

                {/* Order Summary Section */}
                <div className="pt-3.5 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Order Summary
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Items Total</span>
                      <span className="font-mono font-medium">{formatAmount(selectedOrder.subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Taxes &amp; Charges</span>
                      <span className="font-mono font-medium">{formatAmount(selectedOrder.tax)}</span>
                    </div>

                    {Boolean(selectedOrder.loyaltyDiscount && selectedOrder.loyaltyDiscount > 0) && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Loyalty Discount</span>
                        <span className="font-mono">-{formatAmount(selectedOrder.loyaltyDiscount || 0)}</span>
                      </div>
                    )}

                    {Boolean((selectedOrder as any).roundOff && (selectedOrder as any).roundOff !== 0) && (
                      <div className="flex justify-between text-slate-600">
                        <span>Round Off</span>
                        <span className="font-mono font-medium">
                          {(selectedOrder as any).roundOff > 0 ? '+' : '-'}
                          {formatAmount(Math.abs((selectedOrder as any).roundOff))}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                      <span className="text-xs uppercase">Total Amount</span>
                      <span className="font-mono text-base font-black">{formatAmount(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action & Payment Section (Stacked at Sticky Bottom) */}
              <div className="p-3 bg-slate-50/90 border-t border-slate-200 space-y-2 shrink-0">
                {/* 1. Payment Status & Quick 1-Click Pay Modes */}
                {selectedOrder.paymentStatus === 'PAID' ? (
                  <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Paid {selectedOrder.paymentMethod ? `(${selectedOrder.paymentMethod.toUpperCase()})` : ''}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentStatus(selectedOrder)}
                      className="px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100/80 border border-rose-200 bg-white rounded-md transition cursor-pointer"
                      title="Revert payment status to unpaid"
                    >
                      Set Unpaid
                    </button>
                  </div>
                ) : (
                  <motion.div
                    key={isPaymentHighlighted ? 'highlighted' : 'normal'}
                    animate={
                      isPaymentHighlighted
                        ? {
                            x: [0, -7, 7, -5, 5, -3, 3, 0],
                            scale: [1, 1.02, 1],
                          }
                        : {}
                    }
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className={`p-2.5 rounded-xl space-y-2 transition-all duration-300 ${
                      isPaymentHighlighted
                        ? 'bg-rose-50/90 border-2 border-rose-500 ring-4 ring-rose-500/25 shadow-md'
                        : 'bg-white border border-slate-200/90 shadow-2xs'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span className={`flex items-center gap-1 font-bold ${isPaymentHighlighted ? 'text-rose-900' : 'text-rose-700'}`}>
                        <CreditCard className={`w-3.5 h-3.5 text-rose-600 ${isPaymentHighlighted ? 'animate-bounce' : ''}`} />
                        <span>{isPaymentHighlighted ? 'Collect Payment to Start Prep' : 'Payment Pending'}</span>
                      </span>
                      <span className={`text-[10px] font-bold ${isPaymentHighlighted ? 'text-rose-700 font-black animate-pulse' : 'text-amber-700'}`}>
                        {isPaymentHighlighted ? '⚠️ Action Required' : '1-click pay'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(selectedOrder, 'cash')}
                        className={`py-2 px-1 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group ${
                          isPaymentHighlighted
                            ? 'bg-white border-2 border-emerald-500 hover:bg-emerald-50 shadow-xs ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                            : 'bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <Banknote className={`w-4 h-4 text-emerald-600 group-hover:scale-110 transition ${isPaymentHighlighted ? 'scale-110' : ''}`} />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(selectedOrder, 'upi')}
                        className={`py-2 px-1 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group ${
                          isPaymentHighlighted
                            ? 'bg-white border-2 border-purple-500 hover:bg-purple-50 shadow-xs ring-2 ring-purple-500/20 text-purple-950 font-black'
                            : 'bg-slate-50 hover:bg-purple-50 hover:border-purple-300 border border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <QrCode className={`w-4 h-4 text-purple-600 group-hover:scale-110 transition ${isPaymentHighlighted ? 'scale-110' : ''}`} />
                        <span>UPI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(selectedOrder, 'card')}
                        className={`py-2 px-1 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer group ${
                          isPaymentHighlighted
                            ? 'bg-white border-2 border-indigo-500 hover:bg-indigo-50 shadow-xs ring-2 ring-indigo-500/20 text-indigo-950 font-black'
                            : 'bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <CreditCard className={`w-4 h-4 text-indigo-600 group-hover:scale-110 transition ${isPaymentHighlighted ? 'scale-110' : ''}`} />
                        <span>Card</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 2. Primary Workflow Action Button */}
                <AnimatePresence mode="wait" initial={false}>
                  {(() => {
                    const isPrepaid = orderingPaymentPolicy === 'PREPAID';
                    const isUnpaidPrepaidPending = isPrepaid && selectedOrder.paymentStatus !== 'PAID' && selectedOrder.status === 'PENDING';
                    const nextStatus = getNextStatus(selectedOrder.status, workflowMode);

                    if (isUnpaidPrepaidPending) {
                      return (
                        <motion.div
                          key="payment-required"
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.12 }}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(selectedOrder)}
                            className={`w-full py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                              isPaymentHighlighted
                                ? 'bg-rose-100 border-2 border-rose-500 text-rose-950 ring-2 ring-rose-400/30 font-black shadow-xs animate-pulse'
                                : 'bg-rose-50 border border-rose-300 text-rose-800 hover:bg-rose-100 shadow-2xs'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-rose-600" />
                            <span>{isPaymentHighlighted ? '☝️ Select Cash, UPI, or Card above' : 'Payment Required to Start Prep'}</span>
                          </button>
                        </motion.div>
                      );
                    }

                    if (nextStatus) {
                      const nextAction = getNextActionLabel(selectedOrder.status, workflowMode);
                      const ActionIcon = nextAction.icon;
                      return (
                        <motion.div
                          key={`action-${selectedOrder.status}-${nextStatus}`}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.12 }}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(selectedOrder)}
                            disabled={pendingOrderIds.has(selectedOrder._id)}
                            className={`w-full py-2.5 text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer ${nextAction.gradient} disabled:opacity-50`}
                          >
                            <ActionIcon className="w-4 h-4" strokeWidth={2.2} />
                            <span>{nextAction.label}</span>
                          </button>
                        </motion.div>
                      );
                    }

                    if (selectedOrder.status === 'SERVED') {
                      return (
                        <motion.div
                          key="served-clear"
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.12 }}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={() => handleFreeTable(selectedOrder, true)}
                            disabled={pendingOrderIds.has(selectedOrder._id)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
                          >
                            <Receipt className="w-4 h-4 text-white" strokeWidth={2} />
                            <span>Free Table &amp; Print Bill</span>
                          </button>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key="completed"
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.12 }}
                        className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Order Completed</span>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {/* 3. Secondary Actions: Kitchen Token + Bill + Revert */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printOrderTicket(selectedOrder, restaurantInfo, 'KITCHEN')}
                    className="flex-1 py-2 px-2 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Print Kitchen Token (KOT)"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                    <span>Kitchen Token</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printOrderTicket(selectedOrder, restaurantInfo, 'CUSTOMER')}
                    className="flex-1 py-2 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Print Customer Bill"
                  >
                    <Receipt className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                    <span>Bill</span>
                  </button>

                  {getPreviousStatus(selectedOrder.status, workflowMode) && (
                    <button
                      type="button"
                      onClick={() => handleRevertStatus(selectedOrder)}
                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                      title="Revert to previous stage"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State for Right Panel */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <Receipt className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-sm text-slate-700">No Order Selected</h3>
              <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                Click any order card from the board to view items, summary, and quick action controls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerOrders;
