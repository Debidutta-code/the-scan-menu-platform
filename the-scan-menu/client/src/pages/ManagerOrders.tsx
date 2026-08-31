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
  Check,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Eye,
  History as HistoryIcon,
  Kanban as KanbanIcon,
  Printer,
  User,
  Phone,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useManagerOrders, Order, WorkflowMode } from '../hooks/useManagerOrders';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { PaymentVerificationModal } from '../components/PaymentVerificationModal';
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
      return { label: 'Accept Order', gradient: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: Check };
    case 'PREPARING':
      return { label: 'Start Kitchen Prep', gradient: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: ChefHat };
    case 'READY':
      return { label: 'Mark Ready for Pickup', gradient: 'bg-amber-600 hover:bg-amber-700 text-white', icon: Sparkles };
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
      return { label: 'Ready for Pickup', bg: 'bg-purple-50 text-purple-800 border-purple-200/80', dot: 'bg-purple-500' };
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

// ─── Minimal Segmented Order Stepper ──────────────────────────────────────────

const ModernOrderStepper: React.FC<{ currentStatus: string; workflowMode: WorkflowMode }> = ({
  currentStatus,
  workflowMode,
}) => {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-700">
        <XCircle className="w-4 h-4 text-rose-500 shrink-0" strokeWidth={2} />
        <span>Order was cancelled</span>
      </div>
    );
  }

  const steps = WORKFLOW_STEPS[workflowMode] || WORKFLOW_STEPS['FIVE_STEP'];
  const currentIdx = steps.findIndex((s) => s.status === currentStatus);
  const currentStep = currentIdx !== -1 ? currentIdx + 1 : 1;

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center gap-1.5 w-full">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isPassed = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={step.status} className="flex-1 flex flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-amber-500 shadow-xs'
                    : isPassed
                    ? 'bg-slate-900'
                    : 'bg-slate-200'
                }`}
              />
              <span
                className={`text-[10px] text-center tracking-tight truncate leading-none ${
                  isCurrent
                    ? 'text-amber-800 font-bold'
                    : isPassed
                    ? 'text-slate-700 font-medium'
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



// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ManagerOrders: React.FC = () => {
  // Active view toggle: Kanban vs History table
  const [viewMode, setViewMode] = useState<'KANBAN' | 'HISTORY'>('KANBAN');

  // Density view state (managed in Settings)
  const [densityMode, setDensityMode] = useState<'COMPACT' | 'COMFORTABLE'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_orders_density');
      if (saved === 'COMPACT' || saved === 'COMFORTABLE') return saved;
      if (window.innerWidth <= 1440) return 'COMPACT';
    }
    return 'COMPACT';
  });

  useEffect(() => {
    const handleDensityChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'COMPACT' || detail === 'COMFORTABLE') {
        setDensityMode(detail);
      }
    };
    window.addEventListener('densityModeChanged', handleDensityChange);
    return () => window.removeEventListener('densityModeChanged', handleDensityChange);
  }, []);

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
  const [paymentVerificationModalOrder, setPaymentVerificationModalOrder] = useState<{
    order: Order;
    targetAction: 'ACCEPT' | 'FREE_TABLE';
    nextStatus?: string;
  } | null>(null);

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
    updatePaymentStatusMutation,
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
    staleTime: 60_000,
  });

  const restaurantInfo = React.useMemo(() => ({
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
  }), [restaurantData]);

  const orderingPaymentPolicy = (restaurantData?.data?.paymentConfig?.activeMode || restaurantData?.data?.activeMode || 'POSTPAID') as 'PREPAID' | 'POSTPAID';

  const enabledPaymentMethods = React.useMemo(() => {
    const pConfig = restaurantData?.data?.paymentConfig || restaurantData?.data?.settings?.paymentConfig;
    return pConfig?.paymentMethods || { cash: true, card: true, upi: true, razorpay: false };
  }, [restaurantData]);

  const handleAdvanceOrder = React.useCallback((order: Order, nextStatus: string) => {
    if (order.paymentStatus !== 'PAID' && orderingPaymentPolicy === 'PREPAID') {
      setPaymentVerificationModalOrder({ order, targetAction: 'ACCEPT', nextStatus });
      return;
    }
    updateStatusMutation.mutate({ orderId: order._id, nextStatus });
  }, [orderingPaymentPolicy, updateStatusMutation]);

  const handleFreeTableRequest = React.useCallback((order: Order) => {
    if (order.paymentStatus !== 'PAID') {
      setPaymentVerificationModalOrder({ order, targetAction: 'FREE_TABLE' });
      return;
    }
    setFreeTableOrder(order);
  }, []);

  const handlePaymentModalConfirm = (isPaid: boolean, paymentMethod?: string) => {
    if (!paymentVerificationModalOrder) return;
    const { order, targetAction, nextStatus } = paymentVerificationModalOrder;

    if (isPaid) {
      if (targetAction === 'ACCEPT' && nextStatus) {
        // Single atomic mutation: updates paymentStatus to PAID AND status to nextStatus in one request
        updateStatusMutation.mutate({
          orderId: order._id,
          nextStatus,
          paymentStatus: 'PAID',
          paymentMethod,
        });
      } else if (targetAction === 'FREE_TABLE') {
        updatePaymentStatusMutation.mutate({
          orderId: order._id,
          paymentStatus: 'PAID',
          paymentMethod,
        });
        setFreeTableOrder(order);
      }
      setPaymentVerificationModalOrder(null);
    } else {
      setPaymentVerificationModalOrder(null);
    }
  };

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

      // Active modals keydown guards
      if (paymentVerificationModalOrder || freeTableOrder) {
        if (freeTableOrder) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmFreeTable(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setFreeTableOrder(null);
          }
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
            handleAdvanceOrder(activeOrder, nextStatus);
          } else if (activeOrder.status === 'SERVED') {
            e.preventDefault();
            handleFreeTableRequest(activeOrder);
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
    paymentVerificationModalOrder,
    freeTableOrder,
    handleConfirmFreeTable,
    handleAdvanceOrder,
    handleFreeTableRequest,
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

  // ─── Loading / Guard ─────────────────────────────────────────────────────────────

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
    <div className="w-full h-full flex flex-col min-h-0 space-y-2.5 sm:space-y-3 font-sans select-none overflow-hidden">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 md:px-5 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <ChefHat className="w-4.5 h-4.5 text-amber-400" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg md:text-xl font-bold text-slate-900 tracking-tight">Kitchen Operations</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {activeOrders.length} active ticket{activeOrders.length === 1 ? '' : 's'} in preparation
            </p>
          </div>
        </div>

        {/* View Switcher & Manual Refresh Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-end sm:self-auto">
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
        <div className="md:hidden flex items-center gap-2 overflow-x-auto px-1 py-1 scrollbar-none shrink-0">
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
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-0.5">
          <div
            className={`grid grid-cols-1 h-full ${densityMode === 'COMPACT' ? 'gap-2.5' : 'gap-3.5'}`}
            style={{
              gridTemplateColumns: `repeat(${workflowSteps.length}, minmax(${densityMode === 'COMPACT' ? '215px' : '280px'}, 1fr))`,
              minWidth: `${workflowSteps.length * (densityMode === 'COMPACT' ? 220 : 290)}px`,
            }}
          >
            {workflowSteps.map((step) => {
              const ordersInColumn = getOrdersByStatus(step.status);
              const isMobileHidden = mobileStatusTab !== step.status;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.status}
                  className={`flex flex-col h-full bg-slate-100/70 border border-slate-200/90 rounded-2xl ${
                    densityMode === 'COMPACT' ? 'p-2 sm:p-2.5' : 'p-3'
                  } shadow-inner min-h-0 overflow-hidden ${
                    isMobileHidden ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-2.5 bg-white border border-slate-200/70 rounded-xl shadow-xs shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`p-1 rounded-md ${step.badgeBg} shrink-0`}>
                        <StepIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </div>
                      <span className="font-bold text-xs text-slate-900 tracking-tight truncate">
                        {step.label}
                      </span>
                    </div>
                    <span className="bg-slate-900 text-white font-mono text-[10px] font-black px-2 py-0.2 rounded-full shadow-inner shrink-0">
                      {ordersInColumn.length}
                    </span>
                  </div>

                  {/* Column Orders List */}
                  <div className={`flex-1 min-h-0 overflow-y-auto scrollbar-none ${densityMode === 'COMPACT' ? 'space-y-2' : 'space-y-3'} pr-0.5`}>
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
                              className={`rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col group relative overflow-hidden ${
                                densityMode === 'COMPACT' ? 'p-3 gap-2.5' : 'p-3.5 gap-3'
                              } ${
                                isSelected
                                  ? 'bg-amber-50/40 border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                                  : 'bg-white border border-slate-200/90 hover:border-amber-400/80'
                              }`}
                            >
                              {/* Order Card Top Bar (Row 1: #Number + Mode | Elapsed Time + Eye) */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-xs font-black bg-slate-950 text-white px-2 py-0.5 rounded-lg shadow-2xs shrink-0">
                                    #{order.orderNumber}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${modeInfo.color}`}>
                                    <ModeIcon className="w-2.5 h-2.5" strokeWidth={2} />
                                    <span>{modeInfo.label}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-semibold text-slate-500 font-mono flex items-center gap-1 whitespace-nowrap bg-slate-100/80 px-1.5 py-0.5 rounded-md">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" strokeWidth={2} />
                                    {getElapsedTimeLabel(order.createdAt, now)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailModalOrder(order);
                                    }}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                                    title="View full order details"
                                  >
                                    <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Payment Status & Pending Activity Tag */}
                              <div className="flex items-center gap-1.5 flex-wrap -mt-0.5">
                                {order.paymentStatus === 'PAID' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" strokeWidth={2.5} />
                                    <span>PAID</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPaymentVerificationModalOrder({ order, targetAction: 'ACCEPT', nextStatus: getNextStatus(order.status, workflowMode) || undefined });
                                    }}
                                    className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                    title="Click to verify or mark payment"
                                  >
                                    <CreditCard className="w-2.5 h-2.5 text-rose-500" strokeWidth={2} />
                                    <span>PAYMENT PENDING</span>
                                  </button>
                                )}
                                {isPendingAction && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <Loader className="w-2.5 h-2.5 animate-spin text-amber-600" strokeWidth={2} />
                                    <span>Updating...</span>
                                  </span>
                                )}
                              </div>

                              {/* Table & Customer Row */}
                              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800">
                                <span className="flex items-center gap-1 text-slate-900 truncate">
                                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />
                                  <span className="truncate">{order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}</span>
                                </span>
                                {(order.customerName || order.customerPhone) && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md truncate max-w-[150px] shrink-0">
                                    <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{order.customerName || 'Diner'}</span>
                                    {order.customerPhone && (
                                      <span className="text-slate-400 font-mono text-[9px] truncate">({order.customerPhone.slice(-4)})</span>
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Order Items Preview */}
                              <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-2 space-y-1.5">
                                {order.items.map((item: any, idx: number) => (
                                  <div key={idx} className="space-y-0.5 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 truncate min-w-0">
                                        <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200/90 px-1.5 py-0.2 rounded text-[10px] shrink-0 shadow-2xs">
                                          {item.quantity}x
                                        </span>
                                        <span className="truncate font-semibold text-slate-800 text-[11px] leading-tight">
                                          {item.nameSnapshot}
                                        </span>
                                        {item.variantName && (
                                          <span className="text-[10px] text-slate-400 font-normal">
                                            ({item.variantName})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                      <div className="pl-6 text-[10px] text-slate-500 truncate">
                                        + {item.selectedAddOns.map((a: any) => a.name).join(', ')}
                                      </div>
                                    )}
                                    {item.specialInstructions && (
                                      <div className="pl-5 text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md italic truncate flex items-center gap-1">
                                        <span className="text-[10px]">📝</span>
                                        <span className="truncate">"{item.specialInstructions}"</span>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {order.customerNote && (
                                  <div className="text-[10px] font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/90 px-2.5 py-1 rounded-lg italic line-clamp-2 mt-1 flex items-start gap-1">
                                    <span className="text-[10px] shrink-0">📌</span>
                                    <span><strong>Order Note:</strong> "{order.customerNote}"</span>
                                  </div>
                                )}
                              </div>

                              {/* Card Footer with Fast Action Button */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
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
                                        handleAdvanceOrder(order, nextStatus);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-slate-950 hover:bg-slate-900 flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
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
                                        handleFreeTableRequest(order);
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

      {/* ── ALL ORDERS HISTORY VIEW ── */}
      {viewMode === 'HISTORY' && (
        <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-3.5 border-b border-slate-150">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-tight">Order Logs &amp; History</h2>
              <p className="text-xs text-slate-500 font-medium">Search and review all historical orders, customer info, and receipts</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search Order #, table, customer or phone..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9.5 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-44">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                <select
                  value={historyStatusFilter}
                  onChange={handleStatusFilterChange}
                  className="w-full pl-8.5 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SERVED">Served</option>
                  <option value="READY">Ready</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* History Table */}
          {isFetchingHistory && historyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader className="w-8 h-8 animate-spin text-slate-500 mb-2" strokeWidth={2} />
              <span className="text-xs font-semibold">Loading orders history...</span>
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 my-4">
              <Receipt className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
              <span className="text-sm font-bold text-slate-600">No orders found</span>
              <span className="text-xs text-slate-400">Try changing your search keywords or status filter.</span>
            </div>
          ) : (
            <div className="flex-1 min-h-0 border border-slate-200/80 rounded-2xl overflow-y-auto scrollbar-none mt-3 flex flex-col">
              <div className="sticky top-0 z-10 hidden md:grid grid-cols-[80px_1.1fr_1.3fr_110px_130px_100px_90px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Order #</span>
                <span>Table / Mode</span>
                <span>Customer &amp; Phone</span>
                <span>Timestamp</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-100 flex-1">
                {historyOrders.map((order) => {
                  const modeInfo = getOrderModeInfo(order.orderMode);
                  const isSelected = selectedCardOrder?._id === order._id;
                  const isPendingRow = pendingOrderIds.has(order._id);
                  const badgeInfo = getStatusBadge(order.status);
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
                      className={`grid grid-cols-1 md:grid-cols-[80px_1.1fr_1.3fr_110px_130px_100px_90px] gap-2 md:gap-3 items-center p-3.5 sm:px-4 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-50/80 border-l-4 border-l-amber-500 font-medium'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Order # */}
                      <span className="font-mono text-xs font-black text-slate-900">
                        #{order.orderNumber}
                      </span>

                      {/* Table / Mode */}
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />
                          <span className="truncate">{order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${modeInfo.color}`}>
                          {modeInfo.label}
                        </span>
                      </div>

                      {/* Customer Name & Phone */}
                      <div className="text-xs min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {order.customerName || 'Guest Diner'}
                        </div>
                        {order.customerPhone ? (
                          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{order.customerPhone}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No phone</div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs font-mono text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono ${badgeInfo.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot}`} />
                          {badgeInfo.label}
                        </span>
                        {isPendingRow && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                            <Loader className="w-3 h-3 animate-spin text-amber-600" strokeWidth={2} />
                          </span>
                        )}
                      </div>

                      {/* Total */}
                      <div className="font-mono text-xs font-black text-slate-900 md:text-right">
                        {formatAmount(order.total)}
                      </div>

                      {/* Actions */}
                      <div className="text-right text-slate-400 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            printOrderTicket(order, restaurantInfo, 'CUSTOMER');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                          title="Print Customer Bill"
                        >
                          <Receipt className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintModalOrder(order);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition cursor-pointer"
                          title="Print Options &amp; KOT"
                        >
                          <Printer className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalOrder(order);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
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
            <div className="pt-3 flex justify-center shrink-0">
              <button
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={isFetchingHistory}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
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

      {/* ── PERSISTENT FLOATING QUICK ACTION DOCK ────────────────────────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {liveSelectedOrder &&
              !detailModalOrder &&
              !paymentVerificationModalOrder &&
              !freeTableOrder &&
              !printModalOrder && (
              <div className="fixed bottom-6 left-0 right-0 z-[9990] flex justify-center pointer-events-none px-3 sm:px-4">
                <motion.div
                  initial={{ y: 60, opacity: 0, scale: 0.96 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 60, opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto w-full max-w-4xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 text-white rounded-3xl p-3 sm:px-5 sm:py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.12)] flex items-center justify-between gap-3 flex-wrap md:flex-nowrap"
                >
                  {/* Left: Selected Order Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm sm:text-base font-black bg-amber-500 text-slate-950 px-3 py-1.5 rounded-2xl shadow-xs shrink-0 flex items-center justify-center">
                      #{liveSelectedOrder.orderNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-white truncate">
                          {liveSelectedOrder.tableId?.displayName || liveSelectedOrder.tableId?.tableNumber || 'Table'}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                          liveSelectedOrder.status === 'PENDING'
                            ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            : liveSelectedOrder.status === 'ACCEPTED'
                            ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                            : liveSelectedOrder.status === 'PREPARING'
                            ? 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40'
                            : liveSelectedOrder.status === 'READY'
                            ? 'bg-purple-400/20 text-purple-300 border-purple-400/40'
                            : 'bg-blue-400/20 text-blue-300 border-blue-400/40'
                        }`}>
                          {liveSelectedOrder.status}
                        </span>
                        {pendingOrderIds.has(liveSelectedOrder._id) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                            <Loader className="w-3 h-3 animate-spin text-amber-400" strokeWidth={2} />
                            <span>Updating...</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                        <span>{liveSelectedOrder.items.length} items</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-white font-mono font-black">{formatAmount(liveSelectedOrder.total)}</span>
                        {(liveSelectedOrder.customerName || liveSelectedOrder.customerPhone) && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300 font-semibold truncate max-w-[190px] flex items-center gap-1.5">
                              <span>{liveSelectedOrder.customerName || 'Diner'}</span>
                              {liveSelectedOrder.customerPhone && (
                                <span className="text-slate-400 font-mono text-[11px]">({liveSelectedOrder.customerPhone})</span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {/* Quick Revert Button */}
                    {(() => {
                      const prevStatus = getPreviousStatus(liveSelectedOrder.status, workflowMode);
                      if (!prevStatus) return null;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              orderId: liveSelectedOrder._id,
                              nextStatus: prevStatus,
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer"
                          title={`Revert to ${prevStatus}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
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
                            type="button"
                            onClick={() => handleAdvanceOrder(liveSelectedOrder, nextStatus)}
                            className={`px-4 sm:px-5 py-2.5 text-white text-xs sm:text-sm font-black rounded-2xl transition shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer ${nextAction.gradient}`}
                          >
                            <ActionIcon className="w-4 h-4" strokeWidth={2.2} />
                            <span>{nextAction.label}</span>
                            <span className="hidden lg:inline text-[10px] bg-black/25 px-1.5 py-0.5 rounded font-mono font-normal">↵</span>
                          </button>
                        );
                      }

                      if (liveSelectedOrder.status === 'SERVED') {
                        return (
                          <button
                            type="button"
                            onClick={() => setFreeTableOrder(liveSelectedOrder)}
                            className="px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black rounded-2xl transition shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95 cursor-pointer"
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
                      type="button"
                      onClick={() => printOrderTicket(liveSelectedOrder, restaurantInfo, 'CUSTOMER')}
                      className="px-3.5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 text-xs font-extrabold rounded-2xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                      title="Quick Print Customer Bill"
                    >
                      <Receipt className="w-4 h-4 text-blue-400" strokeWidth={2} />
                      <span className="hidden sm:inline">Print Bill</span>
                    </button>

                    {/* Print Modal Button */}
                    <button
                      onClick={() => setPrintModalOrder(liveSelectedOrder)}
                      className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 active:scale-95 cursor-pointer"
                      title="Print KOT & Options"
                    >
                      <Printer className="w-4 h-4 text-amber-400" strokeWidth={2} />
                    </button>

                    {/* View Full Details Button */}
                    <button
                      onClick={() => setDetailModalOrder(liveSelectedOrder)}
                      className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-2xl transition flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer"
                      title="View full order details and bill breakdown"
                    >
                      <FileText className="w-4 h-4 text-amber-400" strokeWidth={2} />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    {/* Deselect / Close Button */}
                    <button
                      onClick={() => setSelectedCardOrder(null)}
                      className="p-2.5 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Deselect order (Esc)"
                    >
                      <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* =================================================================================================
          ORDER DETAIL MODAL (Minimalist & High-Clarity)
          ================================================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {liveDetailOrder && (
              <div className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDetailModalOrder(null)}
                  className="fixed inset-0 cursor-pointer"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 flex flex-col overflow-hidden z-10 my-auto"
                >
                  {/* Header: Clean, Crisp, Minimalist */}
                  <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="font-mono text-xl font-black text-slate-900 tracking-tight">
                            Order #{liveDetailOrder.orderNumber}
                          </h2>
                          {pendingOrderIds.has(liveDetailOrder._id) ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              <Loader className="w-3 h-3 animate-spin" strokeWidth={2} />
                              Updating…
                            </span>
                          ) : (() => {
                            const badgeInfo = getStatusBadge(liveDetailOrder.status);
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeInfo.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badgeInfo.dot} animate-pulse`} />
                                {badgeInfo.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Context Metadata */}
                        {(() => {
                          const ctx = getOrderContextDetails(liveDetailOrder);
                          const CtxIcon = ctx.icon;
                          return (
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium flex-wrap mt-1.5">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                <CtxIcon className={`w-3.5 h-3.5 ${ctx.iconColor}`} strokeWidth={2} />
                                {ctx.title}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{ctx.badge}</span>
                              {liveDetailOrder.roundNumber && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span>Round {liveDetailOrder.roundNumber}</span>
                                </>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="font-mono">
                                {new Date(liveDetailOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {(liveDetailOrder.customerName || liveDetailOrder.customerPhone) && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{liveDetailOrder.customerName || 'Guest Diner'}</span>
                                    {liveDetailOrder.customerPhone && (
                                      <span className="text-slate-500 font-mono text-xs">({liveDetailOrder.customerPhone})</span>
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={() => setDetailModalOrder(null)}
                        className="p-1.5 -mr-1 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        title="Close modal"
                      >
                        <X className="w-5 h-5" strokeWidth={2} />
                      </button>
                    </div>

                    {/* Minimalist Stepper */}
                    <div className="mt-4 pt-3.5 border-t border-slate-200/60">
                      <ModernOrderStepper currentStatus={liveDetailOrder.status} workflowMode={workflowMode} />
                    </div>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {/* Order Items */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Ordered Items ({liveDetailOrder.items.length})
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Freshly prepared</span>
                      </div>

                      <div className="space-y-3">
                        {liveDetailOrder.items.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-3 py-1">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="flex-shrink-0 min-w-[26px] h-6 px-1.5 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-xs flex items-center justify-center mt-0.5">
                                {item.quantity}×
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900 leading-snug">
                                    {item.nameSnapshot}
                                  </span>
                                  {item.prepTimeMinutesSnapshot && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-mono">
                                      <Clock className="w-2.5 h-2.5" strokeWidth={2} />
                                      ~{item.prepTimeMinutesSnapshot}m
                                    </span>
                                  )}
                                </div>

                                {/* Addons */}
                                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.selectedAddOns.map((addon, aIdx) => (
                                      <span
                                        key={aIdx}
                                        className="text-[11px] font-medium bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md"
                                      >
                                        + {addon.name} ({formatAmount(addon.priceDelta)})
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Cooking Instructions */}
                                {item.specialInstructions && (
                                  <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50/70 border-l-2 border-amber-400 px-2.5 py-1 rounded-r-lg text-xs text-amber-900">
                                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                                    <span className="italic">"{item.specialInstructions}"</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Item Total */}
                            <span className="font-mono text-sm font-bold text-slate-900 shrink-0">
                              {formatAmount(item.unitPriceSnapshot * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Note */}
                    {liveDetailOrder.customerNote && (
                      <div className="px-6 py-3.5 bg-amber-50/40">
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                          Special Customer Note
                        </p>
                        <p className="text-xs text-amber-950 font-medium italic leading-relaxed">
                          "{liveDetailOrder.customerNote}"
                        </p>
                      </div>
                    )}

                    {/* Bill & Payment Card */}
                    <div className="px-6 py-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                          <span>Subtotal</span>
                          <span className="font-mono text-slate-700 font-semibold">{formatAmount(liveDetailOrder.subtotal)}</span>
                        </div>

                        {liveDetailOrder.taxBreakdown && liveDetailOrder.taxBreakdown.length > 0 ? (
                          liveDetailOrder.taxBreakdown.map((t, i) => (
                            <div key={i} className="flex justify-between text-xs text-slate-400">
                              <span>{t.name} ({t.percentage}%)</span>
                              <span className="font-mono">{formatAmount(t.amount)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Taxes &amp; GST</span>
                            <span className="font-mono">{formatAmount(liveDetailOrder.tax)}</span>
                          </div>
                        )}

                        {Boolean(liveDetailOrder.loyaltyDiscount && liveDetailOrder.loyaltyDiscount > 0) && (
                          <div className="flex justify-between text-xs text-emerald-700 font-semibold bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60">
                            <span className="flex items-center gap-1">
                              <span>Loyalty Discount</span>
                              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 rounded-full font-mono font-bold">
                                -{liveDetailOrder.loyaltyPointsRedeemed || 0} pts
                              </span>
                            </span>
                            <span className="font-mono font-bold">-{formatAmount(liveDetailOrder.loyaltyDiscount || 0)}</span>
                          </div>
                        )}

                        {/* Total line */}
                        <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">Total</span>
                            <span className={`inline-block text-[10px] font-bold ${
                              liveDetailOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {liveDetailOrder.paymentStatus === 'PAID' ? '✓ Paid' : 'Payment Pending'}
                            </span>
                          </div>
                          <span className="font-mono text-xl font-black text-slate-950">
                            {formatAmount(liveDetailOrder.total)}
                          </span>
                        </div>
                      </div>

                      {/* POS Sync Status (Clean subtle inline bar) */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-medium text-slate-600">POS Integration</span>
                          <span className="text-slate-400 text-[11px]">· Petpooja</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => retryPosMutation.mutate(liveDetailOrder._id)}
                          disabled={retryPosMutation.isPending}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                        >
                          {retryPosMutation.isPending ? (
                            <Loader className="w-3 h-3 animate-spin text-slate-500" strokeWidth={2} />
                          ) : (
                            <RefreshCw className="w-3 h-3 text-slate-500" strokeWidth={2} />
                          )}
                          <span>Sync POS</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="shrink-0 px-6 py-4 bg-white border-t border-slate-100 space-y-2.5">
                    {/* Primary Workflow Advance CTA */}
                    {(() => {
                      const nextStatus = getNextStatus(liveDetailOrder.status, workflowMode);
                      if (nextStatus) {
                        const nextAction = getNextActionLabel(liveDetailOrder.status, workflowMode);
                        const ActionIcon = nextAction.icon;
                        return (
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrder(liveDetailOrder, nextStatus)}
                            className={`w-full py-3 text-white text-sm font-bold rounded-2xl transition shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer ${nextAction.gradient}`}
                          >
                            <ActionIcon className="w-4 h-4" strokeWidth={2.2} />
                            <span>{nextAction.label}</span>
                            <ArrowRight className="w-4 h-4 ml-0.5" strokeWidth={2.5} />
                          </button>
                        );
                      }

                      if (liveDetailOrder.status === 'SERVED') {
                        return (
                          <button
                            type="button"
                            onClick={() => setFreeTableOrder(liveDetailOrder)}
                            disabled={pendingOrderIds.has(liveDetailOrder._id)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                          >
                            <Receipt className="w-4 h-4 text-white" strokeWidth={2} />
                            <span>Free Table &amp; Print Bill (Enter ↵)</span>
                          </button>
                        );
                      }

                      return (
                        <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                          <span>Order Completed &amp; Served</span>
                        </div>
                      );
                    })()}

                    {/* Secondary Actions: Quick Print Row + Revert/Cancel */}
                    <div className="flex items-center gap-2">
                      {/* Print Segmented Group */}
                      <div className="flex-1 flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'CUSTOMER')}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs border border-slate-200/50 cursor-pointer"
                          title="Print Customer Bill"
                        >
                          <Receipt className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                          <span>Bill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'KITCHEN')}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs border border-slate-200/50 cursor-pointer"
                          title="Print Kitchen KOT Ticket"
                        >
                          <ChefHat className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                          <span>KOT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(liveDetailOrder, restaurantInfo, 'COUNTER')}
                          className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs border border-slate-200/50 cursor-pointer"
                          title="Print Counter / Cashier Copy"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                          <span>Counter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintModalOrder(liveDetailOrder)}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition shadow-2xs border border-slate-200/50 cursor-pointer"
                          title="More print options & preview"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" strokeWidth={2} />
                        </button>
                      </div>

                      {/* Revert Button if available */}
                      {(() => {
                        const prevStatus = getPreviousStatus(liveDetailOrder.status, workflowMode);
                        if (!prevStatus) return null;
                        const prevAction = getPreviousActionLabel(prevStatus);
                        return (
                          <button
                            type="button"
                            onClick={() => updateStatusMutation.mutate({ orderId: liveDetailOrder._id, nextStatus: prevStatus })}
                            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title={prevAction.label}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                            <span className="hidden sm:inline">Back</span>
                          </button>
                        );
                      })()}

                      {/* Cancel Button if eligible */}
                      {['PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(liveDetailOrder.status) && (
                        <button
                          type="button"
                          onClick={() => setOrderToCancel(liveDetailOrder)}
                          disabled={pendingOrderIds.has(liveDetailOrder._id)}
                          className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Cancel Order Ticket"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" strokeWidth={2} />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      )}
                    </div>
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

      {/* ── Payment Verification Modal ────────────────────────────────────── */}
      <PaymentVerificationModal
        isOpen={!!paymentVerificationModalOrder}
        order={paymentVerificationModalOrder?.order}
        currency={restaurantInfo.currency}
        mode={orderingPaymentPolicy}
        enabledPaymentMethods={enabledPaymentMethods}
        preferredMethodOrder={restaurantData?.data?.preferredMethodOrder || restaurantData?.data?.paymentConfig?.preferredMethodOrder}
        onConfirmPayment={handlePaymentModalConfirm}
        onCancel={() => setPaymentVerificationModalOrder(null)}
      />

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

