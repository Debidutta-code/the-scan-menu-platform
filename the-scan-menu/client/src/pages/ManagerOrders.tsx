import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Volume2,
  VolumeX,
  Check,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Eye,
  History as HistoryIcon,
  Kanban as KanbanIcon,
  Printer
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useManagerOrders, Order, WorkflowMode } from '../hooks/useManagerOrders';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { printOrderTicket } from '../utils/printReceipt';
import apiClient from '../lib/api';

// â”€â”€â”€ Workflow Step Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const getPreviousStatus = (currentStatus: string, workflowMode: WorkflowMode): string | null => {
  const steps = WORKFLOW_STEPS[workflowMode];
  const idx = steps.findIndex((s) => s.status === currentStatus);
  if (idx <= 0) return null;
  return steps[idx - 1].status;
};

const getPreviousActionLabel = (previousStatus: string): { label: string; icon: any } => {
  switch (previousStatus) {
    case 'READY':
      return { label: 'Revert to Ready', icon: RotateCcw };
    case 'PREPARING':
      return { label: 'Revert to Kitchen Prep', icon: RotateCcw };
    case 'ACCEPTED':
      return { label: 'Revert to Accepted', icon: RotateCcw };
    case 'PENDING':
      return { label: 'Revert to New', icon: RotateCcw };
    default:
      return { label: `Revert to ${previousStatus}`, icon: RotateCcw };
  }
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Premium Order Stepper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ModernOrderStepper: React.FC<{ currentStatus: string; workflowMode: WorkflowMode }> = ({
  currentStatus,
  workflowMode,
}) => {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2.5 py-2.5 px-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
        <XCircle className="w-4 h-4 text-rose-500" strokeWidth={2} />
        Order was cancelled
      </div>
    );
  }

  const steps = WORKFLOW_STEPS[workflowMode] || WORKFLOW_STEPS['FIVE_STEP'];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const currentStep = currentIdx !== -1 ? currentIdx + 1 : 1;

  return (
    <div className="relative flex items-start justify-between gap-0">
      {/* Background connector line */}
      <div className="absolute top-4 left-4 right-4 h-px bg-slate-200 z-0" />
      {/* Filled connector */}
      <div
        className="absolute top-4 left-4 h-px bg-amber-500 z-0 transition-all duration-500"
        style={{ width: `${Math.max(0, ((currentStep - 1) / Math.max(1, steps.length - 1)) * (100 - (8 / steps.length * 100 / 100)))}%` }}
      />
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isPassed = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const StepIcon = step.icon;
        return (
          <div key={step.status} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
              isCurrent ? 'bg-amber-500 text-white ring-2 ring-amber-200 scale-110' :
              isPassed ? 'bg-slate-900 text-white' :
              'bg-white border-2 border-slate-200 text-slate-400'
            }`}>
              {isPassed ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <StepIcon className="w-3.5 h-3.5" strokeWidth={2} />}
            </div>
            <span className={`text-[10px] font-bold text-center leading-tight whitespace-nowrap ${
              isCurrent ? 'text-amber-700' : isPassed ? 'text-slate-600' : 'text-slate-400'
            }`}>{step.shortLabel}</span>
          </div>
        );
      })}
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



// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ManagerOrders: React.FC = () => {
  // Active view toggle: Kanban vs History table
  const [viewMode, setViewMode] = useState<'KANBAN' | 'HISTORY'>('KANBAN');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Mobile tab state
  const [mobileStatusTab, setMobileStatusTab] = useState<string>('PENDING');

  // All Orders History States
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal / detail states
  const [selectedCardOrder, setSelectedCardOrder] = useState<Order | null>(null);
  const [detailModalOrder, setDetailModalOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<Order | null>(null);
  const [freeTableOrder, setFreeTableOrder] = useState<Order | null>(null);

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

  // Consume optimistic orders hook
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
    cancelOrderMutation,
    clearOrderMutation,
    retryPosMutation,
  } = useManagerOrders({
    historyPage,
    debouncedSearch,
    historyStatusFilter,
    isHistoryView: viewMode === 'HISTORY',
  });

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurantProfilePrint', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const restaurantInfo = React.useMemo(() => ({
    name: restaurantData?.data?.name,
    address: restaurantData?.data?.address,
    phone: restaurantData?.data?.phone,
    gstNumber: restaurantData?.data?.gstNumber,
    logoUrl: restaurantData?.data?.branding?.logoUrl,
    currency: restaurantData?.data?.currency || 'INR',
    settings: restaurantData?.data?.settings,
    printerConfig: restaurantData?.data?.printerConfig || restaurantData?.data?.settings?.printerConfig,
    headerMessage: restaurantData?.data?.settings?.receiptHeader || 'Welcome!',
    footerMessage: restaurantData?.data?.settings?.receiptFooter || 'Thank you for dining with us!',
  }), [restaurantData]);

  const workflowSteps = WORKFLOW_STEPS[workflowMode];

  // Live reactive references for selected card and detail modal
  const liveSelectedOrder = React.useMemo(() => {
    if (!selectedCardOrder) return null;
    return (
      activeOrders.find((o) => o._id === selectedCardOrder._id) ||
      historyOrders.find((o) => o._id === selectedCardOrder._id) ||
      selectedCardOrder
    );
  }, [selectedCardOrder, activeOrders, historyOrders]);

  const liveDetailOrder = React.useMemo(() => {
    if (!detailModalOrder) return null;
    return (
      activeOrders.find((o) => o._id === detailModalOrder._id) ||
      historyOrders.find((o) => o._id === detailModalOrder._id) ||
      detailModalOrder
    );
  }, [detailModalOrder, activeOrders, historyOrders]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getOrdersByStatus = useCallback((st: string) => {
    const list = activeOrders.filter((o) => o.status === st);
    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB; // Earliest orders first in kitchen queue
    });
  }, [activeOrders]);

  const handleConfirmFreeTable = useCallback((printBill: boolean) => {
    if (!freeTableOrder) return;
    const target = freeTableOrder;
    if (printBill) {
      printOrderTicket(target, restaurantInfo, 'CUSTOMER');
    }
    clearOrderMutation.mutate({ orderId: target._id });
    setFreeTableOrder(null);
    if (detailModalOrder?._id === target._id) setDetailModalOrder(null);
    if (selectedCardOrder?._id === target._id) setSelectedCardOrder(null);
  }, [freeTableOrder, restaurantInfo, clearOrderMutation, detailModalOrder, selectedCardOrder]);

  // Full KDS Keyboard Navigation: Arrow Keys (Up/Down/Left/Right), Enter (Advance / Free Table & Print), Backspace (Revert), Escape (Deselect/Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.tagName === 'TEXTAREA');
      if (isInputActive) return;

      // Free Table confirmation modal is active
      if (freeTableOrder) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmFreeTable(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setFreeTableOrder(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (detailModalOrder) {
          setDetailModalOrder(null);
        } else if (selectedCardOrder) {
          setSelectedCardOrder(null);
        }
        return;
      }

      const activeOrder = detailModalOrder || liveSelectedOrder;

      // A. Enter -> Advance order to next stage OR open Free Table on SERVED
      if (e.key === 'Enter') {
        if (activeOrder) {
          const nextStatus = getNextStatus(activeOrder.status, workflowMode);
          if (nextStatus) {
            e.preventDefault();
            updateStatusMutation.mutate({ orderId: activeOrder._id, nextStatus });
          } else if (activeOrder.status === 'SERVED') {
            e.preventDefault();
            setFreeTableOrder(activeOrder);
          }
        }
        return;
      }

      // B. Backspace -> Rollback / Revert order to previous stage
      if (e.key === 'Backspace') {
        if (activeOrder) {
          const prevStatus = getPreviousStatus(activeOrder.status, workflowMode);
          if (prevStatus) {
            e.preventDefault();
            updateStatusMutation.mutate({ orderId: activeOrder._id, nextStatus: prevStatus });
          }
        }
        return;
      }

      // C. Arrow Keys -> Grid & Column Navigation across cards
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (viewMode !== 'KANBAN') return;
        e.preventDefault();

        // Find current column index C and row index R of selected order
        let currentColIdx = -1;
        let currentRowIdx = -1;

        if (activeOrder) {
          for (let col = 0; col < workflowSteps.length; col++) {
            const list = getOrdersByStatus(workflowSteps[col].status);
            const rIdx = list.findIndex((o) => o._id === activeOrder._id);
            if (rIdx !== -1) {
              currentColIdx = col;
              currentRowIdx = rIdx;
              break;
            }
          }
        }

        // If no order card is selected yet, default to the first available order card on the board
        if (currentColIdx === -1) {
          for (let col = 0; col < workflowSteps.length; col++) {
            const list = getOrdersByStatus(workflowSteps[col].status);
            if (list.length > 0) {
              setSelectedCardOrder(list[0]);
              return;
            }
          }
          return;
        }

        // 1. ArrowDown -> Move to next order down in the same column
        if (e.key === 'ArrowDown') {
          const currentList = getOrdersByStatus(workflowSteps[currentColIdx].status);
          if (currentRowIdx < currentList.length - 1) {
            setSelectedCardOrder(currentList[currentRowIdx + 1]);
          }
        }

        // 2. ArrowUp -> Move to previous order up in the same column
        if (e.key === 'ArrowUp') {
          const currentList = getOrdersByStatus(workflowSteps[currentColIdx].status);
          if (currentRowIdx > 0) {
            setSelectedCardOrder(currentList[currentRowIdx - 1]);
          }
        }

        // 3. ArrowRight -> Jump to order in next column to the right
        if (e.key === 'ArrowRight') {
          for (let col = currentColIdx + 1; col < workflowSteps.length; col++) {
            const targetList = getOrdersByStatus(workflowSteps[col].status);
            if (targetList.length > 0) {
              const targetRow = Math.min(currentRowIdx, targetList.length - 1);
              setSelectedCardOrder(targetList[targetRow]);
              break;
            }
          }
        }

        // 4. ArrowLeft -> Jump to order in previous column to the left
        if (e.key === 'ArrowLeft') {
          for (let col = currentColIdx - 1; col >= 0; col--) {
            const targetList = getOrdersByStatus(workflowSteps[col].status);
            if (targetList.length > 0) {
              const targetRow = Math.min(currentRowIdx, targetList.length - 1);
              setSelectedCardOrder(targetList[targetRow]);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    freeTableOrder,
    handleConfirmFreeTable,
    detailModalOrder,
    selectedCardOrder,
    liveSelectedOrder,
    workflowMode,
    workflowSteps,
    viewMode,
    getOrdersByStatus,
    updateStatusMutation,
    clearOrderMutation,
  ]);

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

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // â”€â”€â”€ Loading / Guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      {/* â”€â”€ Top Header Toolbar â”€â”€ */}
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
            onClick={() => refetchActiveOrders()}
            className="p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5 active:scale-95"
            title="Refresh Orders Manually"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingActive ? 'animate-spin text-amber-500' : ''}`} strokeWidth={2} />
          </button>

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

      {/* â”€â”€ Mobile Column Tab Bar â”€â”€ */}
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

      {/* â”€â”€ KANBAN BOARD VIEW â”€â”€ */}
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
                    {isLoadingActive ? (
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
                        {ordersInColumn.map((order: Order) => {
                          const modeInfo = getOrderModeInfo(order.orderMode);
                          const ModeIcon = modeInfo.icon;
                          const nextStatus = getNextStatus(order.status, workflowMode);
                          const isSelected = selectedCardOrder?._id === order._id;
                          const isPendingAction = pendingOrderIds.has(order._id);

                          return (
                            <motion.div
                              key={order._id}
                              initial={{ opacity: 0, scale: 0.96, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -10 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              onClick={() => {
                                if (isSelected) {
                                  setDetailModalOrder(order);
                                } else {
                                  setSelectedCardOrder(order);
                                }
                              }}
                              className={`rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden ${
                                isSelected
                                  ? 'bg-amber-50/50 border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.01]'
                                  : 'bg-white border border-slate-200/90 hover:border-amber-400/80'
                              }`}
                            >
                              {/* Order Card Top Bar */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-sm">
                                    #{order.orderNumber}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${modeInfo.color}`}>
                                    <ModeIcon className="w-2.5 h-2.5" strokeWidth={2} />
                                    <span>{modeInfo.label}</span>
                                  </span>
                                  {isPendingAction && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                      <Loader className="w-3 h-3 animate-spin text-amber-600" strokeWidth={2} />
                                      <span>Updating...</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailModalOrder(order);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition opacity-80 hover:opacity-100"
                                    title="View full order details"
                                  >
                                    <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                  </button>
                                  <span className="text-[11px] font-bold text-slate-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" strokeWidth={1.75} />
                                    {getElapsedTimeLabel(order.createdAt, now)}
                                  </span>
                                </div>
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
                                {order.items.map((item: any, idx: number) => (
                                  <div key={idx} className="space-y-0.5 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                                          {item.quantity}x
                                        </span>
                                        <span className="truncate font-semibold text-slate-800">
                                          {item.nameSnapshot}
                                        </span>
                                      </div>
                                    </div>
                                    {item.specialInstructions && (
                                      <div className="pl-6 text-[10px] font-bold text-amber-900 bg-amber-100/80 border border-amber-300/80 px-1.5 py-0.5 rounded italic truncate">
                                        ⚠️ "{item.specialInstructions}"
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {order.customerNote && (
                                  <div className="text-[10px] font-medium text-amber-900 bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-lg italic line-clamp-1 mt-1">
                                    <strong>Table Note:</strong> "{order.customerNote}"
                                  </div>
                                )}
                              </div>

                              {/* Card Footer with Fast Action Button */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="font-mono text-xs font-black text-slate-900">
                                  {formatAmount(order.total)}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {/* Quick Print Customer Bill / KOT */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrintModalOrder(order);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition active:scale-95 cursor-pointer"
                                    title="Print Customer Bill / KOT"
                                  >
                                    <Printer className="w-3.5 h-3.5" strokeWidth={2} />
                                  </button>

                                  {/* Quick revert button if previous stage exists */}
                                  {(() => {
                                    const prevStatus = getPreviousStatus(order.status, workflowMode);
                                    if (!prevStatus) return null;
                                    return (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateStatusMutation.mutate({ orderId: order._id, nextStatus: prevStatus });
                                        }}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                                        title={`Revert to ${prevStatus}`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                                      </button>
                                    );
                                  })()}

                                  {/* Quick advance button on card */}
                                  {nextStatus && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatusMutation.mutate({ orderId: order._id, nextStatus });
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                                    >
                                      <span>Advance</span>
                                      <ArrowRight className="w-3 h-3" strokeWidth={2} />
                                    </button>
                                  )}

                                  {/* Quick Free Table & Print Bill button on served card */}
                                  {step.status === 'SERVED' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFreeTableOrder(order);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                                      title="Free Table & Print Bill"
                                    >
                                      <Receipt className="w-3 h-3 text-emerald-700" strokeWidth={2} />
                                      <span>Free Table</span>
                                    </button>
                                  )}
                                </div>
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
      )}

      {/* â”€â”€ ALL ORDERS HISTORY VIEW â”€â”€ */}
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
                  const isSelected = selectedCardOrder?._id === order._id;
                  const isPendingRow = pendingOrderIds.has(order._id);
                  return (
                    <div
                      key={order._id}
                      onClick={() => {
                        if (isSelected) {
                          setDetailModalOrder(order);
                        } else {
                          setSelectedCardOrder(order);
                        }
                      }}
                      className={`grid grid-cols-1 md:grid-cols-[90px_1fr_1fr_120px_110px_100px_40px] gap-2 md:gap-4 items-center p-4 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-100/60 border-l-4 border-l-amber-500 font-medium'
                          : 'hover:bg-amber-50/40'
                      }`}
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
                        {order.customerName || 'â€”'}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                          {order.status}
                        </span>
                        {isPendingRow && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            <Loader className="w-3 h-3 animate-spin text-amber-600" strokeWidth={2} />
                            <span>Updating...</span>
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs font-black text-slate-900 md:text-right">
                        {formatAmount(order.total)}
                      </div>
                      <div className="text-right text-slate-400 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            printOrderTicket(order, restaurantInfo, 'CUSTOMER');
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          title="Print Customer Bill"
                        >
                          <Receipt className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintModalOrder(order);
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition cursor-pointer"
                          title="Print Options &amp; KOT"
                        >
                          <Printer className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalOrder(order);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                          title="View order details"
                        >
                          <ChevronRight className="w-4 h-4" strokeWidth={2} />
                        </button>
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PERSISTENT FLOATING QUICK ACTION DOCK
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {liveSelectedOrder && !detailModalOrder && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-3xl bg-slate-950/95 backdrop-blur-xl border border-slate-800 text-white rounded-3xl p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap"
          >
            {/* Left: Selected Order Info */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-sm sm:text-base font-black bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl shadow-xs shrink-0">
                #{liveSelectedOrder.orderNumber}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-white truncate">
                    {liveSelectedOrder.tableId?.displayName || liveSelectedOrder.tableId?.tableNumber || 'Table'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 border border-slate-700 uppercase">
                    {liveSelectedOrder.status}
                  </span>
                  {pendingOrderIds.has(liveSelectedOrder._id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      <Loader className="w-3 h-3 animate-spin text-amber-400" strokeWidth={2} />
                      <span>Updating...</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                  <span>{liveSelectedOrder.items.length} items</span>
                  <span>â€¢</span>
                  <span className="text-white font-bold">{formatAmount(liveSelectedOrder.total)}</span>
                  {liveSelectedOrder.customerName && (
                    <>
                      <span>â€¢</span>
                      <span className="text-slate-300 truncate max-w-[100px]">{liveSelectedOrder.customerName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {/* Quick Revert Button */}
              {(() => {
                const prevStatus = getPreviousStatus(liveSelectedOrder.status, workflowMode);
                if (!prevStatus) return null;
                return (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: liveSelectedOrder._id,
                        nextStatus: prevStatus,
                      })
                    }
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
                    title={`Revert to ${prevStatus}`}
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" strokeWidth={2} />
                    <span className="hidden sm:inline">Revert</span>
                  </button>
                );
              })()}

              {/* Quick Advance Button */}
              {(() => {
                const nextStatus = getNextStatus(liveSelectedOrder.status, workflowMode);
                if (nextStatus) {
                  const nextAction = getNextActionLabel(liveSelectedOrder.status, workflowMode);
                  const ActionIcon = nextAction.icon;
                  return (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          orderId: liveSelectedOrder._id,
                          nextStatus,
                        })
                      }
                      className={`px-4 py-2 sm:py-2.5 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 active:scale-95 ${nextAction.gradient}`}
                    >
                      <ActionIcon className="w-4 h-4" strokeWidth={2.2} />
                      <span>{nextAction.label}</span>
                    </button>
                  );
                }

                if (liveSelectedOrder.status === 'SERVED') {
                  return (
                    <button
                      onClick={() => setFreeTableOrder(liveSelectedOrder)}
                      className="px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" strokeWidth={2} />
                      <span>Free Table (Enter ↵)</span>
                    </button>
                  );
                }

                return null;
              })()}

              {/* Quick Print Customer Bill Button */}
              <button
                onClick={() => printOrderTicket(liveSelectedOrder, restaurantInfo, 'CUSTOMER')}
                className="px-3 py-2 sm:py-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-blue-500/40 active:scale-95 cursor-pointer"
                title="Quick Print Customer Bill"
              >
                <Receipt className="w-4 h-4 text-blue-400" strokeWidth={2} />
                <span className="hidden sm:inline">Print Bill</span>
              </button>

              {/* Print Modal Button */}
              <button
                onClick={() => setPrintModalOrder(liveSelectedOrder)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 active:scale-95 cursor-pointer"
                title="Print KOT & Options"
              >
                <Printer className="w-4 h-4 text-amber-400" strokeWidth={2} />
              </button>

              {/* View Full Details Button */}
              <button
                onClick={() => setDetailModalOrder(liveSelectedOrder)}
                className="px-3.5 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer"
                title="View full order details and bill breakdown"
              >
                <FileText className="w-4 h-4 text-amber-400" strokeWidth={2} />
                <span>View Details</span>
              </button>

              {/* Deselect / Close Button */}
              <button
                onClick={() => setSelectedCardOrder(null)}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                title="Deselect order (Esc)"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ORDER DETAIL MODAL
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {liveDetailOrder && (
              <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDetailModalOrder(null)}
                  className="fixed inset-0 cursor-pointer"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 20 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl w-full max-w-lg max-h-[88vh] shadow-[0_32px_64px_rgba(0,0,0,0.28)] flex flex-col overflow-hidden z-10 my-auto"
                >
                  {/* Dark status-tinted header */}
                  <div className={`shrink-0 px-6 pt-5 pb-4 ${
                    liveDetailOrder.status === 'CANCELLED' ? 'bg-rose-900' :
                    liveDetailOrder.status === 'SERVED'    ? 'bg-slate-800' :
                    liveDetailOrder.status === 'READY'     ? 'bg-purple-900' :
                    liveDetailOrder.status === 'PREPARING' ? 'bg-indigo-900' :
                    'bg-slate-900'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-lg font-black text-white">
                            Order #{liveDetailOrder.orderNumber}
                          </span>
                          {pendingOrderIds.has(liveDetailOrder._id) ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                              <Loader className="w-3 h-3 animate-spin" strokeWidth={2} />
                              Updating…
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              liveDetailOrder.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                              liveDetailOrder.status === 'SERVED'    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                              'bg-amber-400/20 text-amber-300 border-amber-400/30'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {liveDetailOrder.status}
                            </span>
                          )}
                        </div>
                        {/* Table / context meta */}
                        {(() => {
                          const ctx = getOrderContextDetails(liveDetailOrder);
                          const CtxIcon = ctx.icon;
                          return (
                            <div className="flex items-center gap-1.5 text-white/55 text-xs font-medium flex-wrap">
                              <CtxIcon className="w-3.5 h-3.5" strokeWidth={2} />
                              <span>{ctx.title}</span>
                              <span className="opacity-50">·</span>
                              <span>{ctx.badge}</span>
                              {liveDetailOrder.roundNumber && (
                                <><span className="opacity-50">·</span><span>Round {liveDetailOrder.roundNumber}</span></>
                              )}
                              <span className="opacity-50">·</span>
                              <span className="font-mono">
                                {new Date(liveDetailOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrintModalOrder(liveDetailOrder)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5 border border-white/10 active:scale-95"
                          title="Print Kitchen Ticket or Counter Bill"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={() => setDetailModalOrder(null)}
                          className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition -mt-0.5 -mr-1"
                        >
                          <X className="w-5 h-5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {/* Stepper embedded in header */}
                    <div className="mt-4 bg-white/[0.08] rounded-2xl px-4 py-3">
                      <ModernOrderStepper currentStatus={liveDetailOrder.status} workflowMode={workflowMode} />
                    </div>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

                    {/* Items */}
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                          Items · {liveDetailOrder.items.length}
                        </h3>
                        <span className="text-[11px] text-slate-400">Prepared fresh</span>
                      </div>
                      <div className="space-y-0.5">
                        {liveDetailOrder.items.map((item, idx) => (
                          <div key={idx} className="py-2.5 first:pt-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center mt-0.5">
                                  {item.quantity}×
                                </span>
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-slate-900 leading-snug block">{item.nameSnapshot}</span>
                                  {item.prepTimeMinutesSnapshot && (
                                    <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-slate-400 font-mono">
                                      <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                                      ~{item.prepTimeMinutesSnapshot}m prep
                                    </span>
                                  )}
                                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {item.selectedAddOns.map((addon, aIdx) => (
                                        <span key={aIdx} className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded-md">
                                          + {addon.name} ({formatAmount(addon.priceDelta)})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {item.specialInstructions && (
                                    <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-xl text-[11px] text-amber-900 italic">
                                      <FileText className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" strokeWidth={2} />
                                      "{item.specialInstructions}"
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="font-mono text-sm font-black text-slate-900 shrink-0">
                                {formatAmount(item.unitPriceSnapshot * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer note */}
                    {liveDetailOrder.customerNote && (
                      <div className="px-5 py-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Customer Note</p>
                        <p className="text-xs text-slate-700 italic font-medium leading-relaxed bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          "{liveDetailOrder.customerNote}"
                        </p>
                      </div>
                    )}

                    {/* POS sync row */}
                    <div className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold">POS Integration</span>
                        <span className="text-slate-400 text-[11px]">· Petpooja Sync</span>
                      </div>
                      <button
                        onClick={() => retryPosMutation.mutate(liveDetailOrder._id)}
                        disabled={retryPosMutation.isPending}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-sm disabled:opacity-50"
                      >
                        {retryPosMutation.isPending
                          ? <Loader className="w-3 h-3 animate-spin" strokeWidth={2} />
                          : <RefreshCw className="w-3 h-3" strokeWidth={2} />}
                        Sync POS
                      </button>
                    </div>

                    {/* Bill breakdown */}
                    <div className="px-5 py-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal</span>
                        <span className="font-mono font-bold text-slate-700">{formatAmount(liveDetailOrder.subtotal)}</span>
                      </div>
                      {liveDetailOrder.taxBreakdown && liveDetailOrder.taxBreakdown.length > 0
                        ? liveDetailOrder.taxBreakdown.map((t, i) => (
                            <div key={i} className="flex justify-between text-xs text-slate-400">
                              <span>{t.name} ({t.percentage}%)</span>
                              <span className="font-mono">{formatAmount(t.amount)}</span>
                            </div>
                          ))
                        : (
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>Taxes &amp; GST</span>
                              <span className="font-mono">{formatAmount(liveDetailOrder.tax)}</span>
                            </div>
                          )
                      }
                      <div className="pt-3 border-t border-dashed border-slate-200 flex items-end justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wide">Total</p>
                          <span className={`text-[10px] font-bold ${liveDetailOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {liveDetailOrder.paymentStatus === 'PAID' ? '✓ Paid' : 'Payment Pending'}
                          </span>
                        </div>
                        <span className="font-mono text-2xl font-black text-slate-950">{formatAmount(liveDetailOrder.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 px-5 py-4 bg-white border-t border-slate-100 space-y-2.5">
                    {/* Primary advance CTA */}
                    {(() => {
                      const nextStatus = getNextStatus(liveDetailOrder.status, workflowMode);
                      if (nextStatus) {
                        const nextAction = getNextActionLabel(liveDetailOrder.status, workflowMode);
                        const ActionIcon = nextAction.icon;
                        return (
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: liveDetailOrder._id, nextStatus })}
                            className={`w-full py-3.5 text-white text-sm font-black rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-[0.98] ${nextAction.gradient}`}
                          >
                            <ActionIcon className="w-4 h-4" strokeWidth={2} />
                            {nextAction.label}
                            <ArrowRight className="w-4 h-4 ml-1" strokeWidth={2.5} />
                          </button>
                        );
                      }
                      return (
                        <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-2xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                          Order Complete &amp; Served
                        </div>
                      );
                    })()}

                    {/* Print ticket action row */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase font-mono">
                        <span>Print Receipts &amp; Tickets</span>
                        <button
                          type="button"
                          onClick={() => setPrintModalOrder(liveDetailOrder)}
                          className="text-amber-600 hover:text-amber-700 font-bold lowercase flex items-center gap-1 cursor-pointer"
                        >
                          <span>options &amp; preview →</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'CUSTOMER')}
                          className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                          title="Print Customer Tax Invoice / Proforma Bill with UPI QR"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                          <span>Customer Bill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'KITCHEN')}
                          className="py-2.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                          title="Print Kitchen Order Ticket"
                        >
                          <ChefHat className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                          <span>Kitchen KOT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'COUNTER')}
                          className="py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                          title="Print Counter / Cashier Audit Copy"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                          <span>Counter Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Revert + Cancel row */}
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const prevStatus = getPreviousStatus(liveDetailOrder.status, workflowMode);
                        if (!prevStatus) return <div />;
                        const prevAction = getPreviousActionLabel(prevStatus);
                        const PrevIcon = prevAction.icon;
                        return (
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: liveDetailOrder._id, nextStatus: prevStatus })}
                            className="flex items-center justify-center gap-1.5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-2xl transition active:scale-[0.98]"
                          >
                            <PrevIcon className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                            {prevAction.label}
                          </button>
                        );
                      })()}
                      {['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(liveDetailOrder.status) ? (
                        <button
                          onClick={() => setOrderToCancel(liveDetailOrder)}
                          disabled={pendingOrderIds.has(liveDetailOrder._id)}
                          className="flex items-center justify-center gap-1.5 py-3 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-2xl transition active:scale-[0.98] disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
                          Cancel Ticket
                        </button>
                      ) : <div />}
                    </div>

                    {/* Settle served table */}
                    {liveDetailOrder.status === 'SERVED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFreeTableOrder(liveDetailOrder)}
                          disabled={pendingOrderIds.has(liveDetailOrder._id)}
                          className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-white" strokeWidth={2} />
                          <span>Free Table &amp; Print Bill (Enter ↵)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* =================================================================================================
          CONFIRM CANCEL MODAL
          ================================================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {orderToCancel && (
              <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 z-10"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
                    <HelpCircle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-1 tracking-tight">
                    Cancel Order #{orderToCancel.orderNumber}?
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-6">
                    The kitchen will be alerted and this ticket will be permanently marked as cancelled.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(null)}
                      className="w-1/2 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:bg-slate-50 transition"
                    >
                      Keep Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = orderToCancel._id;
                        setOrderToCancel(null);
                        setSelectedCardOrder(null);
                        setDetailModalOrder(null);
                        cancelOrderMutation.mutate(targetId);
                      }}
                      disabled={pendingOrderIds.has(orderToCancel._id)}
                      className="w-1/2 py-3 bg-rose-600 text-white text-sm font-bold rounded-2xl hover:bg-rose-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {pendingOrderIds.has(orderToCancel._id) ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                          Cancellingâ€¦
                        </>
                      ) : 'Yes, Cancel'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* =================================================================================================
          FREE TABLE & PRINT BILL SETTLEMENT MODAL
          ================================================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {freeTableOrder && (
              <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 10 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-100 z-10 space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <Receipt className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-slate-900 leading-tight">
                          Free Table &amp; Settle Bill
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Order #{freeTableOrder.orderNumber} • {freeTableOrder.tableId?.displayName || freeTableOrder.tableId?.tableNumber || 'Table'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFreeTableOrder(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Items:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[200px]">
                        {freeTableOrder.items.length} items ({freeTableOrder.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Payment Status:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          freeTableOrder.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {freeTableOrder.paymentStatus === 'PAID' ? '✓ PAID' : '⚠️ PAYMENT DUE (UPI QR on bill)'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-900">Total Payable:</span>
                      <span className="font-mono text-xl font-black text-slate-950">
                        {formatAmount(freeTableOrder.total)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed text-center">
                    Print the customer bill and mark this table as available for the next guests.
                  </p>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    {/* Primary Print & Free */}
                    <button
                      type="button"
                      onClick={() => handleConfirmFreeTable(true)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-white" strokeWidth={2} />
                      <span>Print Bill &amp; Free Table (Enter ↵)</span>
                    </button>

                    {/* Secondary Free Only */}
                    <button
                      type="button"
                      onClick={() => handleConfirmFreeTable(false)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition active:scale-[0.98] cursor-pointer"
                    >
                      <span>Free Table Only (Skip Print)</span>
                    </button>

                    {/* Cancel */}
                    <button
                      type="button"
                      onClick={() => setFreeTableOrder(null)}
                      className="w-full py-2 text-slate-400 hover:text-slate-600 font-medium text-xs transition cursor-pointer"
                    >
                      Keep Occupied (Esc)
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── Print Order Modal ────────────────────────────────────────────────── */}
      <PrintOrderModal
        isOpen={!!printModalOrder}
        onClose={() => setPrintModalOrder(null)}
        order={printModalOrder}
        restaurantInfo={restaurantInfo}
      />
    </div>
  );
};

export default ManagerOrders;

