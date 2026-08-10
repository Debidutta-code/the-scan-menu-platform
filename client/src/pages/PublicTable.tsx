import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Search as SearchIcon,
  Loader,
  AlertTriangle,
  Flame,
  Leaf,
  Plus,
  Minus,
  Trash2,
  X,
  Sparkles,
  ChevronRight,
  BellRing,
  CheckCircle2,
  Compass,
  Star,
  MessageSquare,
  Phone,
  Lock,
  MapPin,
  Clock,
  CreditCard,
  Zap,
  ShieldCheck,
  Receipt,
  ClipboardList,
  ChefHat,
  Utensils,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { publicService, PublicCategory, MenuItem, AddOn } from '../services/restaurant.service';
import { useCartStore } from '../store/useCartStore';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import { useSocket, ConnectionStatus } from '../hooks/useSocket';
import ConnectionIndicator from '../components/ConnectionIndicator';

// ==========================================
// HELPERS
// ==========================================

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatPrice = (amountInPaise: number, currency: string) => {
  const amount = amountInPaise / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// ==========================================
// SUBCOMPONENTS
// ==========================================

interface MenuBadgeProps {
  variant: 'veg' | 'spicy';
}

const MenuBadge: React.FC<MenuBadgeProps> = ({ variant }) => {
  if (variant === 'veg') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
        <Leaf className="w-2.5 h-2.5" strokeWidth={2} />
        Veg
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-red-50 text-red-700 border border-red-100">
      <Flame className="w-2.5 h-2.5" strokeWidth={2} />
      Spicy
    </span>
  );
};

const MenuSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex gap-2 overflow-x-hidden py-2">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-9 w-24 bg-slate-200 rounded-full shrink-0" />
      ))}
    </div>
    {[1, 2].map((cat) => (
      <div key={cat} className="space-y-4">
        <div className="h-7 bg-slate-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ==========================================
// CUSTOM WAITER CALL SERVICE ICONS (High-Fidelity)
// ==========================================

const ClocheBellIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-purple-600' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 4v2" />
    <path d="M4 18h16" />
    <path d="M4 18a8 8 0 0 1 16 0" />
    <circle cx="12" cy="4" r="1" />
  </svg>
);

const ReceiptBillIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-blue-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 3v18l3.5-2 3.5 2 3.5-2 3.5 2V3l-3.5 2L12 3 8.5 5z" />
    <path d="M12 8v8" />
    <path d="M9.5 10.5a2.5 2.5 0 0 1 5 0c0 2-5 2-5 4a2.5 2.5 0 0 0 5 0" />
  </svg>
);

const WaterBottleServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-cyan-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 2h8v3H8z" />
    <path d="M7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M12 11c0 0-3 3.5-3 5.5a3 3 0 0 0 6 0c0-2-3-5.5-3-5.5z" />
  </svg>
);

const TissuePaperServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-emerald-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 13h18a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" />
    <path d="M7 13V8.5a3.5 3.5 0 0 1 7 0V13" />
    <path d="M10 8.5V4a2 2 0 0 1 4 0v4.5" />
  </svg>
);

const ChatOtherServiceIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 text-amber-500' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="8" cy="10" r="1.25" fill="currentColor" />
    <circle cx="12" cy="10" r="1.25" fill="currentColor" />
    <circle cx="16" cy="10" r="1.25" fill="currentColor" />
  </svg>
);

const ClappingHandsOutlineIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10 text-emerald-700/50' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.9-2.7l-4.4-6a1.5 1.5 0 0 1 2.4-1.8L6 13.5" />
  </svg>
);

// ==========================================
// TIMELINE COMPONENT (WITH ANIMATED CONNECTING LINES)
// Dynamic based on restaurant's orderWorkflowMode
// ==========================================

type WorkflowMode = 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';

const WORKFLOW_TIMELINE_MAP: Record<WorkflowMode, { status: string; label: string; icon: typeof Clock }[]> = {
  FIVE_STEP: [
    { status: 'PENDING',   label: 'Placed',    icon: Clock },
    { status: 'ACCEPTED',  label: 'Accepted',  icon: CheckCircle2 },
    { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
    { status: 'READY',     label: 'Ready',     icon: Utensils },
    { status: 'SERVED',    label: 'Served',    icon: CheckCircle2 },
  ],
  FOUR_STEP: [
    { status: 'PENDING',   label: 'Placed',    icon: Clock },
    { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
    { status: 'READY',     label: 'Ready',     icon: Utensils },
    { status: 'SERVED',    label: 'Served',    icon: CheckCircle2 },
  ],
  THREE_STEP: [
    { status: 'PENDING',   label: 'Placed',    icon: Clock },
    { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
    { status: 'SERVED',    label: 'Served',    icon: CheckCircle2 },
  ],
};

interface TimelineProps {
  currentStatus: string;
  workflowMode?: WorkflowMode;
}

const Timeline: React.FC<TimelineProps> = ({ currentStatus, workflowMode = 'FIVE_STEP' }) => {
  const steps = WORKFLOW_TIMELINE_MAP[workflowMode] || WORKFLOW_TIMELINE_MAP['FIVE_STEP'];
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  if (currentStatus === 'CANCELLED') return null;

  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-slate-150 shadow-sm space-y-6">
      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center block border-b border-slate-50 pb-2">
        Preparation Timeline
      </h4>
      <div className="relative flex justify-between items-center w-full px-2">
        {/* Animated Connecting Line Track */}
        <div className="absolute left-6 right-6 top-[15px] h-1 bg-slate-100 -z-10 rounded" />

        {/* Active fill line drawing itself */}
        <motion.div
          className="absolute left-6 top-[15px] h-1 bg-emerald-500 -z-10 rounded origin-left"
          initial={{ width: '0%' }}
          animate={{
            width: currentIndex > 0 ? `${(currentIndex / (steps.length - 1)) * 90}%` : '0%',
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />

        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.status} className="flex flex-col items-center space-y-2 relative">
              {/* Timeline Node dot */}
              <motion.div
                layout
                animate={{
                  scale: isCurrent ? 1.25 : 1.0,
                  backgroundColor: isCurrent ? '#10B981' : isCompleted ? '#34D399' : '#F1F5F9',
                  borderColor: isCurrent ? '#D1FAE5' : isCompleted ? '#E2E8F0' : '#E2E8F0',
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[10px] ${
                  isCompleted ? 'text-white' : 'text-slate-400'
                } shadow-sm relative`}
              >
                <StepIcon className="w-4 h-4" strokeWidth={isCurrent ? 2.5 : 1.75} />
              </motion.div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold tracking-wide transition-colors ${
                  isCurrent ? 'text-emerald-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// ORDER TRACKER COMPONENT (INLINE INDEPENDENT POLLED/WS SCREEN)
// ==========================================
interface OrderTrackerProps {
  orderId: string;
  currency: string;

  onBack: () => void;
  workflowMode?: WorkflowMode;
}

const OrderTracker: React.FC<OrderTrackerProps> = ({
  orderId,
  currency,

  onBack,
  workflowMode = 'FIVE_STEP',
}) => {
  const { socket, status: connectionStatus } = useSocket(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !orderId) return;

    // Join public order room
    socket.emit('join_order', { orderId });

    socket.on('order:status_updated', (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId) {
        setLiveStatus(data.status);
      }
    });

    return () => {
      socket.off('order:status_updated');
    };
  }, [socket, orderId]);

  // Query order details
  const { data: orderData, isLoading: isOrderLoading, error } = useQuery({
    queryKey: ['publicOrderDetails', orderId],
    queryFn: async () => {
      const res = await apiClient.get(`/public/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
    retry: false,
  });

  const [animationCompleted, setAnimationCompleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationCompleted(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isOrderLoading) {
    return (
      <div className="py-12 bg-white rounded-3xl border border-slate-150 p-8 flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !orderData?.success) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-150 text-center space-y-4">
        <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800">Order Error</h4>
          <p className="text-xs text-slate-400">Could not load this order. Please reach out to table service.</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const order = orderData.data;
  const currentStatus = liveStatus || order.status;

  const statusDetails: Record<string, { title: string; desc: string; icon: React.ReactNode; color: string }> = {
    PENDING: {
      title: 'Order Placed',
      desc: 'Waiting for the kitchen to accept your order.',
      icon: <Clock className="w-6 h-6 text-amber-500" strokeWidth={1.75} />,
      color: 'bg-amber-50 border-amber-100 text-amber-800',
    },
    ACCEPTED: {
      title: 'Order Accepted',
      desc: 'Our staff has accepted your order and is queuing it.',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" strokeWidth={1.75} />,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    },
    PREPARING: {
      title: 'Preparing',
      desc: 'Our chefs are handcrafting your food right now!',
      icon: <ChefHat className="w-6 h-6 text-indigo-500" strokeWidth={1.75} />,
      color: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    },
    READY: {
      title: 'Ready for Pickup',
      desc: 'Your order is hot, ready, and heading to your table!',
      icon: <Utensils className="w-6 h-6 text-purple-500" strokeWidth={1.75} />,
      color: 'bg-purple-50 border-purple-100 text-purple-800',
    },
    SERVED: {
      title: 'Served',
      desc: 'Enjoy your meal! Let us know if you need anything else.',
      icon: <CheckCircle2 className="w-6 h-6 text-blue-500" strokeWidth={1.75} />,
      color: 'bg-blue-50 border-blue-100 text-blue-800',
    },
    CANCELLED: {
      title: 'Cancelled',
      desc: 'This order was cancelled. Please speak to staff for details.',
      icon: <XCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />,
      color: 'bg-red-50 border-red-100 text-red-800',
    },
  };

  const currentStatusInfo = statusDetails[currentStatus] || {
    title: 'Processing',
    desc: 'Checking order status...',
    icon: <Clock className="w-6 h-6 text-slate-500" strokeWidth={1.75} />,
    color: 'bg-slate-50 border-slate-100 text-slate-800',
  };

  return (
    <div className="space-y-6">
      {/* Header bar within tab */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2">
          <ConnectionIndicator status={connectionStatus as ConnectionStatus} />
          <span className="text-xs font-mono font-bold text-slate-400">Order #{order.orderNumber}</span>
        </div>
      </div>

      {currentStatus !== 'CANCELLED' ? (
        <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm text-center flex flex-col items-center py-8 space-y-4">
          <div className="relative">
            <svg
              className="w-16 h-16 text-emerald-500"
              viewBox="0 0 52 52"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <circle cx="26" cy="26" r="23" className="stroke-emerald-100" />
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                d="M14 27l8 8 16-16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="font-display tracking-tight text-2xl font-normal text-slate-900">
              Order Confirmed!
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Your kitchen dispatch ticket is active
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50/50 rounded-3xl p-6 border border-red-150 shadow-sm text-center flex flex-col items-center py-8 space-y-4">
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <X className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h4 className="font-display tracking-tight text-2xl font-normal text-red-900">
              Order Cancelled
            </h4>
            <p className="text-xs text-red-500 font-medium">
              This order was cancelled by dining staff.
            </p>
          </div>
        </div>
      )}

      {/* Live Polled Status Details */}
      <AnimatePresence>
        {animationCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-4 shadow-sm ${currentStatusInfo.color}`}
          >
            <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
              {currentStatusInfo.icon}
            </div>
            <div className="space-y-1 text-left">
              <h5 className="text-sm font-bold leading-tight">{currentStatusInfo.title}</h5>
              <p className="text-xs opacity-90 leading-relaxed">{currentStatusInfo.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live timeline — dynamically matches restaurant workflow */}
      {currentStatus !== 'CANCELLED' && animationCompleted && (
        <Timeline currentStatus={currentStatus} workflowMode={workflowMode} />
      )}

      {/* Receipt summary */}
      <AnimatePresence>
        {animationCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4 text-left"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
              <h5 className="text-sm font-bold text-slate-900">Receipt Summary</h5>
            </div>

            <div className="divide-y divide-slate-50 space-y-2.5">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between py-1.5 first:pt-0">
                  <div>
                    <h6 className="text-xs font-bold text-slate-900">
                      {item.nameSnapshot} <span className="font-mono text-slate-400">x{item.quantity}</span>
                    </h6>
                    {item.selectedAddOns.length > 0 && (
                      <p className="text-[10px] text-slate-400">
                        + {item.selectedAddOns.map((x: any) => x.name).join(', ')}
                      </p>
                    )}
                    {item.specialInstructions && (
                      <p className="text-[10px] text-amber-600 bg-amber-50/50 rounded px-1.5 py-0.5 inline-block mt-1 italic font-medium">
                        Note: "{item.specialInstructions}"
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatPrice(item.unitPriceSnapshot * item.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(order.subtotal, currency)}</span>
              </div>
              {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
                order.taxBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between font-medium">
                      <span>{t.name} ({t.percentage}%)</span>
                      <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                    </div>
                    {t.subTaxes && t.subTaxes.length > 0 && (
                      <div className="pl-3 border-l-2 border-slate-200 ml-1 space-y-0.5 my-0.5">
                        {t.subTaxes.map((st: any, j: number) => (
                          <div key={j} className="flex justify-between text-slate-400 text-[11px]">
                            <span>{st.name} ({st.percentage}%)</span>
                            <span className="font-mono text-slate-400">({formatPrice(st.amount, currency)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                  <div className="flex justify-between font-medium">
                    <span>Taxes</span>
                    <span className="font-mono">{formatPrice(order.tax, currency)}</span>
                  </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-50 pt-2">
                <span>Grand Total</span>
                <span className="font-mono">{formatPrice(order.total, currency)}</span>
              </div>
            </div>

            {order.customerNote && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                <span className="font-bold text-slate-600 block mb-1">Customer Note:</span>
                <p className="text-slate-500 leading-relaxed italic">"{order.customerNote}"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const PublicTable: React.FC = () => {
  const { restaurantSlug, tableToken } = useParams<{ restaurantSlug?: string; tableToken?: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Zustand Cart Store
  const { items: cartItems, setTable, addItem, updateQuantity, clearCart } = useCartStore();

  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Bottom Tab: 'landing' | 'menu' | 'waiter' | 'cart-orders'
  const activeTab = (searchParams.get('tab') as 'landing' | 'menu' | 'waiter' | 'cart-orders') || 'landing';
  const cartOrdersSubTab = (searchParams.get('sub') as 'cart' | 'orders') || 'cart';
  const activeTrackingOrderId = searchParams.get('trackId') || null;

  const updateNavigationState = (
    tab: 'landing' | 'menu' | 'waiter' | 'cart-orders',
    sub?: 'cart' | 'orders',
    trackId?: string | null
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (sub) {
        next.set('sub', sub);
      }
      if (trackId !== undefined) {
        if (trackId) {
          next.set('trackId', trackId);
        } else {
          next.delete('trackId');
        }
      } else if (tab !== 'cart-orders') {
        next.delete('trackId');
      }
      return next;
    });
  };

  const setActiveTab = (tab: 'landing' | 'menu' | 'waiter' | 'cart-orders') => {
    updateNavigationState(tab);
  };

  const setCartOrdersSubTab = (sub: 'cart' | 'orders') => {
    updateNavigationState(activeTab, sub);
  };

  const setActiveTrackingOrderId = (trackId: string | null) => {
    updateNavigationState(activeTab, cartOrdersSubTab, trackId);
  };

  const [recentWaiterCalls, setRecentWaiterCalls] = useState<{ type: string; timestamp: string }[]>([]);

  useEffect(() => {
    if (restaurantSlug && tableToken) {
      const key = `pixora_waiter_calls_${restaurantSlug}_${tableToken}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      setRecentWaiterCalls(stored);
    }
  }, [restaurantSlug, tableToken]);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [priceSort, setPriceSort] = useState<'default' | 'low-high' | 'high-low'>('default');
  const showAvailableOnly = true;

  // Category Scrolling State
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Waiter request types and confirm states
  const [selectedRequestType, setSelectedRequestType] = useState<'CALL_WAITER' | 'REQUEST_BILL' | 'WATER' | 'TISSUE' | 'OTHER'>('CALL_WAITER');
  const [isWaiterConfirmOpen, setIsWaiterConfirmOpen] = useState(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);
  const [isClearSessionModalOpen, setIsClearSessionModalOpen] = useState(false);

  // Phone checkout / OTP State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Phase 5 Order Placement States
  const [customerNote, setCustomerNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [failedOrderDetails, setFailedOrderDetails] = useState<
    { menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }[]
  >([]);

  // Socket connection for this table (shared across waiter call + session/order real-time updates)
  const { socket } = useSocket(null);

  // Phase 7 Waiter Call States & Cooldown Timer
  const [waiterCallState, setWaiterCallState] = useState<'idle' | 'pulsing' | 'waiting'>('idle');
  const COOLDOWN_DURATION_SEC = 60; // 60-second cooldown rate limit
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Initialize and sync waiter call cooldown from localStorage
  useEffect(() => {
    if (!restaurantSlug || !tableToken) return;
    const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
    const storedEnd = localStorage.getItem(cooldownKey);
    if (storedEnd) {
      const endMs = parseInt(storedEnd, 10);
      const now = Date.now();
      if (endMs > now) {
        setCooldownRemaining(Math.ceil((endMs - now) / 1000));
      } else {
        localStorage.removeItem(cooldownKey);
      }
    }
  }, [restaurantSlug, tableToken]);

  // Active countdown timer ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (restaurantSlug && tableToken) {
            const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
            localStorage.removeItem(cooldownKey);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining, restaurantSlug, tableToken]);

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
    }
    return `${secs}s`;
  };

  // On mount fetch the current state once (handles page refresh while a call is active).
  // After that, all state transitions are driven by socket events — no polling.
  useEffect(() => {
    if (!tableToken) return;

    let cancelled = false;
    apiClient
      .get(`/public/tables/${tableToken}/waiter-call/active`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) {
          setWaiterCallState(res.data.data ? 'waiting' : 'idle');
        }
      })
      .catch(() => { /* silently ignore — socket will keep state current */ });

    return () => { cancelled = true; };
  }, [tableToken]);

  // Join the table socket room and listen for waiter call events
  useEffect(() => {
    if (!socket || !tableToken) return;

    socket.emit('join_table', { tableToken });

    const handleWaiterCallCreated = () => {
      setWaiterCallState('waiting');
    };

    const handleWaiterCallResolved = (data?: any) => {
      // Instantly unlock the button and clear cooldown when manager acknowledges or resolves
      setWaiterCallState('idle');
      setCooldownRemaining(0);
      if (restaurantSlug && tableToken) {
        const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
        localStorage.removeItem(cooldownKey);
      }
      queryClient.invalidateQueries({ queryKey: ['activeWaiterCall', tableToken] });

      const isAck = data?.status === 'ACKNOWLEDGED';
      if (isAck) {
        toast('Staff has acknowledged your call and is on their way!', 'success');
      } else {
        toast('Your table request has been resolved by our staff.', 'success');
      }
    };

    socket.on('waiter_call:created', handleWaiterCallCreated);
    socket.on('waiter_call:resolved', handleWaiterCallResolved);
    socket.on('waiter_call:acknowledged', handleWaiterCallResolved);

    return () => {
      socket.off('waiter_call:created', handleWaiterCallCreated);
      socket.off('waiter_call:resolved', handleWaiterCallResolved);
      socket.off('waiter_call:acknowledged', handleWaiterCallResolved);
    };
  }, [socket, tableToken, restaurantSlug, queryClient, toast]);


  // Bottom Sheet States for Item Detail
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailSelectedAddOns, setDetailSelectedAddOns] = useState<AddOn[]>([]);
  const [detailSpecialInstructions, setDetailSpecialInstructions] = useState('');

  // Navigation refs
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);
  const isScrollingRef = useRef(false);

  // Debouncing Search Query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query table resolution (Theme and Core Details)
  const { data: tableData, error: tableError, isLoading: isTableLoading } = useQuery({
    queryKey: ['publicTable', restaurantSlug, tableToken],
    queryFn: () => publicService.resolveTable(restaurantSlug, tableToken!),
    enabled: !!tableToken,
    retry: false,
  });

  const activeSessionId = tableData?.success ? tableData.data?.table?.activeSessionId : null;

  const clearSessionMutation = useMutation({
    mutationFn: async () => {
      const url = restaurantSlug
        ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/clear-session`
        : `/public/table/${tableToken}/clear-session`;
      const res = await apiClient.post(url);
      return res.data;
    },
    onSuccess: () => {
      toast('Session cleared successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['publicTable'] });
      queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to clear session', 'error');
    },
  });

  // Fetch active session and its orders/rounds
  const { data: sessionDetailsData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['publicSessionDetails', activeSessionId],
    queryFn: async () => {
      const res = await apiClient.get(`/public/table-sessions/${activeSessionId}`);
      return res.data;
    },
    enabled: !!activeSessionId,
    refetchInterval: activeTab === 'cart-orders' && cartOrdersSubTab === 'orders' ? 5000 : false, // Poll session details while on orders tab
  });

  // Real-time socket updates for Public Session Details

  useEffect(() => {
    if (!socket || !activeSessionId || !sessionDetailsData?.success) return;

    // Join session room
    socket.emit('join_session', { sessionId: activeSessionId });

    // Join order rooms for all orders under the current session to get their item updates
    const orders = sessionDetailsData.data.orders || [];
    orders.forEach((order: any) => {
      socket.emit('join_order', { orderId: order._id });
    });

    const handleSessionUpdate = (data: { sessionId: string }) => {
      if (data.sessionId === activeSessionId) {
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails', activeSessionId] });
      }
    };

    const handleItemStatusUpdated = (data: { orderId: string }) => {
      const belongsToSession = orders.some((o: any) => o._id === data.orderId);
      if (belongsToSession) {
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails', activeSessionId] });
      }
    };

    const handleOrderStatusUpdated = (data: { orderId: string }) => {
      const belongsToSession = orders.some((o: any) => o._id === data.orderId);
      if (belongsToSession) {
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails', activeSessionId] });
      }
    };

    socket.on('session:updated', handleSessionUpdate);
    socket.on('order:item_status_updated', handleItemStatusUpdated);
    socket.on('order:status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('session:updated', handleSessionUpdate);
      socket.off('order:item_status_updated', handleItemStatusUpdated);
      socket.off('order:status_updated', handleOrderStatusUpdated);
    };
  }, [socket, activeSessionId, sessionDetailsData, queryClient]);

  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const toggleRound = (roundId: string) => {
    setExpandedRounds(prev => {
      const current = prev[roundId] ?? true;
      return { ...prev, [roundId]: !current };
    });
  };

  // Query public menu
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getPublicMenu(restaurantSlug, tableToken!),
    enabled: !!tableToken,
    retry: false,
  });

  const restaurantId = tableData?.data?.restaurant?.id;
  const { data: taxesData } = useQuery({
    queryKey: ['publicTaxes', restaurantId],
    queryFn: async () => {
       const res = await apiClient.get(`/public/restaurants/${restaurantId}/taxes`);
       return res.data;
    },
    enabled: !!restaurantId,
  });
  const activeTaxes: any[] = taxesData?.data || [];


  // Verify and clear cart if tableToken is changed
  useEffect(() => {
    if (tableData?.success && tableToken && restaurantSlug) {
      setTable(restaurantSlug, tableToken);
    }
  }, [tableData, tableToken, restaurantSlug, setTable]);

  // Handle active category auto-scroll into horizontal nav view
  useEffect(() => {
    if (activeCategoryId && activePillRef.current && categoryNavRef.current) {
      const activePill = activePillRef.current;
      const navContainer = categoryNavRef.current;
      const containerWidth = navContainer.offsetWidth;
      const pillOffsetLeft = activePill.offsetLeft;
      const pillWidth = activePill.offsetWidth;

      navContainer.scrollTo({
        left: pillOffsetLeft - containerWidth / 2 + pillWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [activeCategoryId]);

  // Scroll Spy logic
  useEffect(() => {
    if (activeTab !== 'menu') return;
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const categoryElements = document.querySelectorAll('[data-category-section]');
      let currentActiveId = '';

      for (let i = 0; i < categoryElements.length; i++) {
        const el = categoryElements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 140) {
          currentActiveId = el.getAttribute('data-category-section') || '';
        }
      }

      if (currentActiveId && currentActiveId !== activeCategoryId) {
        setActiveCategoryId(currentActiveId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategoryId, activeTab]);

  if (isTableLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const isError = !!tableError || !tableData?.success;
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 font-sans">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
            <AlertTriangle className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-normal text-slate-900">Unavailable</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              This restaurant or table isn't available right now. Please verify your QR code scan or request assistance from staff.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { restaurant, table } = tableData.data;
  const { theme, currency } = restaurant;

  // CSS variables for white-label styling
  const cssVariables = {
    '--theme-primary': theme.primaryColor || '#111827',
    '--theme-secondary': theme.secondaryColor || '#FFFFFF',
    '--theme-accent': theme.accentColor || '#F59E0B',
  } as React.CSSProperties;

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  const rawCategories: PublicCategory[] = menuData?.success ? menuData.data : [];

  // Filter and sort items dynamically for menu and search tabs
  const getFilteredMenu = () => {
    return rawCategories
      .map((category) => {
        let matchedItems = category.menuItems.filter((item) => {
          // Search term match
          const matchesQuery = item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

          // Diet filter
          const matchesDiet =
            dietFilter === 'all' ||
            (dietFilter === 'veg' && item.isVegetarian) ||
            (dietFilter === 'nonveg' && !item.isVegetarian);

          // Availability check
          const matchesAvailability = !showAvailableOnly || item.isAvailable;

          return matchesQuery && matchesDiet && matchesAvailability;
        });

        // Price Sorting
        if (priceSort === 'low-high') {
          matchedItems = [...matchedItems].sort((a, b) => a.price - b.price);
        } else if (priceSort === 'high-low') {
          matchedItems = [...matchedItems].sort((a, b) => b.price - a.price);
        }

        return {
          ...category,
          menuItems: matchedItems,
        };
      })
      .filter((category) => category.menuItems.length > 0);
  };

  const filteredCategories = getFilteredMenu();

  // Set initial active category once loaded
  if (!activeCategoryId && filteredCategories.length > 0) {
    setActiveCategoryId(filteredCategories[0]._id);
  }

  // Handle Category Pill Click
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const element = document.getElementById(`category-section-${categoryId}`);
    if (element) {
      isScrollingRef.current = true;
      const topOffset = element.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({
        top: topOffset,
        behavior: 'smooth',
      });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 600);
    }
  };

  // Open item bottom sheet
  const handleItemCardClick = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setSelectedItem(item);
    setDetailQuantity(1);
    setDetailSelectedAddOns([]);
    setDetailSpecialInstructions('');
  };

  // Add-on check toggler
  const handleAddOnToggle = (addOn: AddOn) => {
    setDetailSelectedAddOns((prev) => {
      const exists = prev.some((x) => x.name === addOn.name);
      if (exists) {
        return prev.filter((x) => x.name !== addOn.name);
      }
      return [...prev, addOn];
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    addItem({
      itemId: selectedItem._id,
      name: selectedItem.name,
      basePrice: selectedItem.price,
      quantity: detailQuantity,
      selectedAddOns: detailSelectedAddOns,
      specialInstructions: detailSpecialInstructions,
    });

    toast(`Added ${selectedItem.name} to cart`, 'success');
    setSelectedItem(null);
  };

  // Request SMS/OTP confirmation modal
  const handleCheckoutTrigger = () => {
    if (cartItems.length === 0) return;
    setIsOtpModalOpen(true);
  };

  const handleSendOtp = () => {
    if (!customerName || customerName.trim().length === 0) {
      toast('Please enter your name', 'error');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      toast('Please enter a valid mobile number', 'error');
      return;
    }
    setOtpSent(true);
    toast('Demo OTP sent! Type 1234 to verify.', 'info');
  };

  // Complete authenticated checkouts
  const handleVerifyOtpAndPlaceOrder = async () => {
    if (otpCode !== '1234') {
      toast('Incorrect verification code. Use dummy code 1234.', 'error');
      return;
    }

    setIsPlacingOrder(true);
    setFailedOrderDetails([]);

    try {
      const payload = {
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          selectedAddOns: item.selectedAddOns.map((addon) => ({
            name: addon.name,
            priceDelta: addon.priceDelta,
          })),
          specialInstructions: item.specialInstructions || '',
        })),
        customerNote: customerNote.trim() || undefined,
        customerName: customerName.trim(),
        customerPhone: phoneNumber.trim(),
        paymentStatus: 'PENDING',
      };

      const orderUrl = restaurantSlug
        ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/orders`
        : `/public/table/${tableToken}/orders`;

      const res = await apiClient.post(orderUrl, payload);

      if (res.data.success) {
        const finalizeOrderSuccess = (orderId: string) => {
          const key = `pixora_orders_${restaurantSlug || 'subdomain'}_${tableToken}`;
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          stored.push(orderId);
          localStorage.setItem(key, JSON.stringify(stored));

          clearCart();
          queryClient.invalidateQueries({ queryKey: ['publicTable'] });
          setIsOtpModalOpen(false);
          setCustomerNote('');
          setPhoneNumber('');
          setOtpCode('');
          setOtpSent(false);
          setIsPlacingOrder(false);
          updateNavigationState('cart-orders', 'orders', orderId);
        };

        const activeProvider = tableData?.data?.restaurant?.settings?.paymentConfig?.activeProvider;

        if (activeProvider === 'RAZORPAY') {
            setIsPlacingOrder(true);

            const isScriptLoaded = await loadRazorpay();
            if (!isScriptLoaded) {
              toast('Failed to load Razorpay SDK. Please check your connection.', 'error');
              setIsPlacingOrder(false);
              return;
            }

            try {
               const intentUrl = restaurantSlug
                 ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/payments/intent`
                 : `/public/table/${tableToken}/payments/intent`;

               const intentRes = await apiClient.post(intentUrl, {
                 amount: res.data.data.total,
                 currency: 'INR',
                 metadata: { orderId: res.data.data._id }
               });

               const { providerReferenceId, amount, currency, razorpayKeyId } = intentRes.data.data;

               const options = {
                 key: razorpayKeyId,
                 amount: amount,
                 currency: currency,
                 name: tableData?.data?.restaurant?.name,
                 description: `Order #${res.data.data.orderNumber || ''}`,
                 order_id: providerReferenceId,
                 handler: function () {
                    toast('Payment processing... Please wait a moment while we confirm your order.', 'info');
                    finalizeOrderSuccess(res.data.data._id);
                 },
                 prefill: { name: customerName, contact: phoneNumber },
                 theme: { color: tableData?.data?.restaurant?.settings?.theme?.primaryColor || '#111827' },
                 modal: {
                    ondismiss: function() {
                       setIsPlacingOrder(false);
                       toast('Payment cancelled.', 'error');
                    }
                 }
               };

               const rzp = new (window as any).Razorpay(options);
               rzp.open();
            } catch (err) {
                console.error("Intent error", err);
                toast("Failed to initiate payment", "error");
                setIsPlacingOrder(false);
            }
        } else {
            toast('Order verified and placed successfully!', 'success');
            finalizeOrderSuccess(res.data.data._id);
        }
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      const errResponse = err.response?.data?.error;
      if (errResponse && errResponse.code === 'ITEMS_UNAVAILABLE') {
        const failed = errResponse.details || [];
        setFailedOrderDetails(failed);
        setIsOtpModalOpen(false);
        toast('Some items in your basket are no longer available. Please review.', 'error');
      } else {
        toast(errResponse?.message || 'Failed to place order. Please try again.', 'error');
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Trigger public waiter assistance request directly by type
  const handleTriggerWaiterCall = async (type: 'CALL_WAITER' | 'REQUEST_BILL' | 'WATER' | 'TISSUE' | 'OTHER') => {
    if (cooldownRemaining > 0) {
      toast(`Please wait ${formatCooldown(cooldownRemaining)} before requesting again.`, 'info');
      return;
    }

    setSelectedRequestType(type);
    setWaiterCallState('pulsing');

    try {
      await apiClient.post(`/public/tables/${tableToken}/waiter-call`, {
        requestType: type,
      });
      toast(`Request for ${type.replace('_', ' ').toLowerCase()} sent!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['activeWaiterCall', tableToken] });

      // Start Cooldown Rate Limit
      const endMs = Date.now() + COOLDOWN_DURATION_SEC * 1000;
      const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
      localStorage.setItem(cooldownKey, endMs.toString());
      setCooldownRemaining(COOLDOWN_DURATION_SEC);

      // Add to recent log
      const key = `pixora_waiter_calls_${restaurantSlug}_${tableToken}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const newCall = {
        type: type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updated = [newCall, ...stored].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
      setRecentWaiterCalls(updated);

      setTimeout(() => {
        setWaiterCallState('waiting');
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast('Failed to alert floor staff. Please retry.', 'error');
      setWaiterCallState('idle');
    }
  };

  // Trigger public waiter assistance request via modal
  const handleCallWaiterConfirm = async () => {
    setIsWaiterConfirmOpen(false);
    await handleTriggerWaiterCall(selectedRequestType);
  };

  // Auto badge helpers based on item pricing/names for visual fidelity
  const getItemBadge = (item: MenuItem, idx: number) => {
    if (idx % 5 === 0) return 'Chef Special';
    if (idx % 7 === 0) return 'Best Seller';
    if (item.price > 35000) return 'Recommended';
    if (idx % 4 === 0) return 'New';
    return null;
  };

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let cartTaxTotal = 0;
  const cartTaxBreakdown: any[] = [];

  const taxesArr = activeTaxes || [];
  const groups = taxesArr.filter((t: any) => t.type === 'GROUP');
  const standardTaxes = taxesArr.filter((t: any) => t.type === 'TAX');

  for (const group of groups) {
      const subTaxes = standardTaxes.filter((t: any) => typeof t.groupId === 'string' ? t.groupId === group._id : t.groupId?._id === group._id);
      if (subTaxes.length === 0) continue;

      let groupAmount = 0;
      let groupPercentage = 0;
      const subTaxesBreakdown = subTaxes.map((st: any) => {
         const amt = Math.round(cartSubtotal * (st.percentage / 100));
         groupAmount += amt;
         groupPercentage += st.percentage;
         return { name: st.name, percentage: st.percentage, amount: amt };
      });

      cartTaxTotal += groupAmount;
      cartTaxBreakdown.push({
         name: group.name,
         percentage: groupPercentage,
         amount: groupAmount,
         subTaxes: subTaxesBreakdown
      });
  }

  const standaloneTaxes = standardTaxes.filter((t: any) => !t.groupId);
  for (const st of standaloneTaxes) {
      const amount = Math.round(cartSubtotal * (st.percentage / 100));
      cartTaxTotal += amount;
      cartTaxBreakdown.push({
         name: st.name,
         percentage: st.percentage,
         amount,
         subTaxes: []
      });
  }

  const cartGrandTotal = cartSubtotal + cartTaxTotal;

  const activeOrderCount = sessionDetailsData?.data?.orders?.length || 0;
  const activeOrdersIds = (sessionDetailsData?.data?.orders || []).map((o: any) => o._id);


  // Mock Google reviews details
  const mockReviews = [
    { author: 'Rahul Sharma', text: 'Incredibly fast checkout and the sourdough pizzas are to die for! Madras coffee on tap is spectacular.', rating: 5 },
    { author: 'Neha Gupta', text: 'Brilliant QR menu design. Tapping Call Waiter brings tissues in seconds. Exceptional service.', rating: 5 },
    { author: 'David K.', text: 'A clean, modern platform. Love the veggie filters and modifier options on sliders.', rating: 5 },
  ];

  return (
    <div style={cssVariables} className="min-h-screen bg-slate-50 font-sans antialiased pb-28 relative">
      <Helmet>
        <title>{restaurant.name} - Digital Menu & Ordering</title>
        <meta name="description" content={restaurant.description || `View the digital menu and place your order at ${restaurant.name}.`} />

        {/* Open Graph Tags for SEO & Social Sharing */}
        <meta property="og:title" content={`${restaurant.name} - Digital Menu`} />
        <meta property="og:description" content={restaurant.description || `View the digital menu and place your order at ${restaurant.name}.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={publicUrl} />
        {restaurant.logoUrl && <meta property="og:image" content={restaurant.logoUrl} />}

        <link rel="canonical" href={publicUrl} />
      </Helmet>

      {/* ==================== SCREEN WRAPPERS ==================== */}

      {/* -------------------- 1. LANDING TAB -------------------- */}
      {activeTab === 'landing' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Cover Header */}
          <div className="relative w-full h-64 overflow-hidden bg-slate-900 text-white flex flex-col justify-end p-6">
            {restaurant.coverImageUrl && (
              <img
                src={restaurant.coverImageUrl}
                alt={restaurant.name}
                className="absolute inset-0 w-full h-full object-cover opacity-45"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

            <div className="relative flex items-center gap-4">
              {restaurant.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="w-16 h-16 object-contain rounded-2xl bg-white p-1 shadow"
                />
              ) : (
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center font-bold font-display text-3xl text-slate-950 shadow">
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="font-display tracking-tight text-3xl font-semibold leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Open for dine-in & checkout</span>
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto px-4 space-y-6 pb-6">
            {/* Active Table spot info */}
            <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3 animate-fade-in">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                Active Dining Station
              </span>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-none">{table.displayName}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Token validation active</p>
                </div>
                <span className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-bold font-mono">
                  #{table.tableNumber}
                </span>
              </div>
            </div>

            {/* Track Orders Banner */}
            {activeOrderCount > 0 && (
              <div className="bg-amber-50 border border-amber-200/65 rounded-3xl p-5 flex items-center justify-between shadow-sm animate-fade-in gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Track Placed Orders</h4>
                    <p className="text-[10px] text-slate-500 font-medium">You have {activeOrderCount} order{activeOrderCount > 1 ? 's' : ''} placed at this table.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    updateNavigationState('cart-orders', 'orders', activeOrdersIds[activeOrdersIds.length - 1]);
                  }}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm shrink-0 whitespace-nowrap"
                >
                  <span>Track Status</span>
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Prompt CTA to explore */}
            <button
              onClick={() => setActiveTab('menu')}
              className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              <span>Explore Menu & Order</span>
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {/* Description */}
            <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-1.5">
                About Restaurant
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
                {restaurant.description || 'Welcome to Demo Cafe! We serve gourmet delicacies, refreshing tonics, and hot baked furnace sourdoughs.'}
              </p>
            </div>

            {/* Operational Info */}
            <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
                Dine-In Information
              </span>
              <div className="space-y-3.5 text-xs text-slate-600">
                {restaurant.timings && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span>Dine-In Hours: <strong className="text-slate-800">{restaurant.timings.open} - {restaurant.timings.close}</strong></span>
                  </div>
                )}
                {restaurant.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span className="leading-relaxed">Address: <strong className="text-slate-800">{restaurant.address}</strong></span>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span>Contact Service: <strong className="text-slate-800">{restaurant.phone}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Methods */}
            {restaurant.paymentMethods && (
              <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
                  Supported Payments
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {restaurant.paymentMethods.cash && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                      <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Cash
                    </span>
                  )}
                  {restaurant.paymentMethods.card && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
                      <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Cards
                    </span>
                  )}
                  {restaurant.paymentMethods.upi && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-100">
                      <Zap className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.75} />
                      UPI
                    </span>
                  )}
                  {restaurant.paymentMethods.razorpay && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                      Razorpay
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Gourmet Jumps */}
            {rawCategories.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
                  Popular Categories
                </span>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {rawCategories.slice(0, 4).map((cat) => (
                    <button
                      key={cat._id}
                      onClick={() => {
                        setActiveTab('menu');
                        setTimeout(() => {
                          handleCategoryClick(cat._id);
                        }, 250);
                      }}
                      className="p-3 text-left bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-150 flex items-center justify-between transition-colors group"
                    >
                      <span className="font-bold text-xs text-slate-700 truncate">{cat.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" strokeWidth={2.5} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="space-y-4 border-t border-slate-200/60 pt-6">
              <div className="text-center space-y-1">
                <h3 className="font-display text-2xl font-normal text-slate-900">What Our Guests Say</h3>
                <p className="text-xs text-slate-500">Verified platform testimonials from our guests.</p>
              </div>

              {/* Ratings Overview Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center bg-amber-50/50 border border-amber-100 p-4 rounded-2xl shrink-0">
                    <span className="text-3xl font-black text-slate-900 block font-mono leading-none">4.9</span>
                    <div className="flex gap-0.5 text-amber-500 justify-center mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" strokeWidth={1.5} />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold block mt-1 font-mono">148 reviews</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 font-bold font-mono text-slate-400">5</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: '92%' }} />
                      </div>
                      <span className="w-6 text-right font-bold text-slate-400 font-mono">92%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 font-bold font-mono text-slate-400">4</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: '6%' }} />
                      </div>
                      <span className="w-6 text-right font-bold text-slate-400 font-mono">6%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-2 font-bold font-mono text-slate-400">3</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: '2%' }} />
                      </div>
                      <span className="w-6 text-right font-bold text-slate-400 font-mono">2%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-center gap-1.5 border border-slate-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                  <span className="text-[10px] text-slate-500 font-bold leading-relaxed text-center">
                    100% Authentic Dine-In Feedback verified via platform checkout.
                  </span>
                </div>
              </div>

              {/* Testimonials Carousel */}
              <div className="w-full overflow-hidden">
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-4 px-1 pt-1">
                  {mockReviews.map((rev, idx) => {
                    const colors = [
                      'bg-amber-100 text-amber-800',
                      'bg-indigo-100 text-indigo-800',
                      'bg-emerald-100 text-emerald-800',
                      'bg-rose-100 text-rose-800',
                    ];
                    const avatarColor = colors[idx % colors.length];
                    return (
                      <div
                        key={idx}
                        className="snap-center shrink-0 w-[85%] bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${avatarColor}`}>
                            {rev.author.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 text-xs block truncate">{rev.author}</span>
                            <div className="flex gap-0.5 text-amber-500 mt-0.5">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-current" strokeWidth={1.5} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed italic font-sans min-h-[48px]">
                          "{rev.text}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Google Review Link */}
              <a
                href={restaurant.googleReviewUrl || `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' reviews')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 bg-white border-2 border-slate-950 text-slate-950 hover:bg-slate-50 font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-sm text-center"
              >
                <MessageSquare className="w-5 h-5 text-amber-500 fill-current" strokeWidth={1.75} />
                <span>Submit Google Review</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* -------------------- 2. MENU TAB -------------------- */}
      {activeTab === 'menu' && (
        <motion.div
          key="menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Integrated Search & Filter Controls */}
          <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search dishes, drinks, pizzas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl border border-slate-150 shadow-sm focus:outline-none focus:border-slate-400 transition-all text-sm placeholder:text-slate-400 text-slate-800 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </div>

            <div className="flex gap-2.5 items-center justify-between">
              {/* Diet filter group */}
              <div className="flex gap-1">
                {([
                  { key: 'all', label: 'All' },
                  { key: 'veg', label: 'Veg' },
                  { key: 'nonveg', label: 'Non-Veg' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setDietFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      dietFilter === opt.key
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Price Sort Dropdown */}
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as any)}
                className="border border-slate-150 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none font-bold text-xs text-slate-600"
              >
                <option value="default">Sort Price</option>
                <option value="low-high">Low to High</option>
                <option value="high-low">High to Low</option>
              </select>
            </div>
          </div>

          {/* Track Orders Banner */}
          {activeOrderCount > 0 && (
            <div className="max-w-md mx-auto px-4">
              <div className="bg-amber-50 border border-amber-200/65 rounded-3xl p-4 flex items-center justify-between shadow-sm animate-fade-in gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Track Placed Orders</h4>
                    <p className="text-[10px] text-slate-500 font-medium">You have {activeOrderCount} order{activeOrderCount > 1 ? 's' : ''} placed at this table.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    updateNavigationState('cart-orders', 'orders', activeOrdersIds[activeOrdersIds.length - 1]);
                  }}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm shrink-0 whitespace-nowrap"
                >
                  <span>Track Status</span>
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {/* Horizontal category sub nav */}
          {filteredCategories.length > 0 && (
            <div className="sticky top-0 z-20 py-2.5 bg-slate-50/90 backdrop-blur-md border-b border-slate-150">
              <div
                ref={categoryNavRef}
                className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-4"
              >
                {filteredCategories.map((category) => {
                  const isActive = activeCategoryId === category._id;
                  return (
                    <button
                      key={category._id}
                      ref={isActive ? activePillRef : null}
                      onClick={() => handleCategoryClick(category._id)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap tracking-wide transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-150 hover:bg-slate-50'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="max-w-md mx-auto px-4 space-y-8">
            {isMenuLoading ? (
              <MenuSkeleton />
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 p-8 space-y-3">
                <SearchIcon className="w-10 h-10 text-slate-300 mx-auto animate-pulse" strokeWidth={1.75} />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">No matching dishes found</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Try adjusting your query or choosing another dietary filter.</p>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setDietFilter('all');
                      setPriceSort('default');
                    }}
                    className="mt-2 text-xs font-bold text-amber-600 hover:underline"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {filteredCategories.map((category) => (
                  <section
                    key={category._id}
                    id={`category-section-${category._id}`}
                    data-category-section={category._id}
                    className="space-y-4 pt-2 scroll-mt-24"
                  >
                    <h3 className="font-display text-2xl font-normal text-slate-900 tracking-tight pl-1 border-l-2 border-amber-500">
                      {category.name}
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      {category.menuItems.map((item, idx) => {
                        const badge = getItemBadge(item, idx);
                        return (
                          <div
                            key={item._id}
                            onClick={() => handleItemCardClick(item)}
                            className={`flex gap-4 p-4 bg-white rounded-3xl border transition-all ${
                              item.isAvailable
                                ? 'border-slate-150 hover:border-slate-300 shadow-sm cursor-pointer active:scale-[0.99]'
                                : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {/* Image with featured badges */}
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                                  <Sparkles className="w-5 h-5 opacity-40" strokeWidth={1.75} />
                                </div>
                              )}
                              {badge && item.isAvailable && (
                                <div className="absolute top-1 left-1">
                                  <span className="text-[8px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-slate-950/85 rounded-full backdrop-blur-sm">
                                    {badge}
                                  </span>
                                </div>
                              )}
                              {!item.isAvailable && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-black/60 rounded">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                                    {item.name}
                                  </h4>
                                  <div className="flex gap-1 shrink-0">
                                    {item.isVegetarian && <MenuBadge variant="veg" />}
                                    {item.isSpicy && <MenuBadge variant="spicy" />}
                                  </div>
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-2.5">
                                <span className="text-sm font-extrabold text-slate-900 font-mono">
                                  {formatPrice(item.price, currency)}
                                </span>
                                {item.isAvailable ? (
                                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl transition-colors font-sans uppercase tracking-wider">
                                    Add
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Sold Out
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* -------------------- 4. CALL WAITER TAB (Redesigned Screen) -------------------- */}
      {activeTab === 'waiter' && (
        <motion.div
          key="waiter"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto px-4 py-3 space-y-5 flex flex-col pb-12"
        >
          {/* Top Hero Section: Title + Bell Graphic */}
          <div className="bg-gradient-to-b from-[#FBF9F5] via-[#FCFAF8] to-white rounded-3xl p-5 sm:p-6 border border-slate-150/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2 z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                We're here to <br />
                <span className="text-[#6366F1] font-black">assist</span> you 👋✨
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px]">
                Choose a service and our team will be right with you.
              </p>
            </div>
            <div className="w-[125px] sm:w-[155px] shrink-0 flex items-center justify-end z-10">
              <img
                src="/waiter_call.png"
                alt="Service Bell"
                className="w-full max-h-[125px] sm:max-h-[145px] object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Section Divider with Sparkles and Purple Bar */}
          <div className="text-center py-1 space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm tracking-tight">
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
              <span>What can we get for you?</span>
              <Sparkles className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <div className="w-9 h-1 bg-[#6366F1] rounded-full mx-auto" />
          </div>

          {/* 5 Circular Action Cards Grid (3 on Top, 2 on Bottom Centered) */}
          <div className="pt-2 space-y-6">
            {/* Top Row: 3 Options */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 justify-items-center">
              {[
                {
                  key: 'CALL_WAITER' as const,
                  title: 'Call Waiter',
                  subtitle: 'Need assistance from our staff',
                  icon: ClocheBellIcon,
                  activeRing: 'ring-4 ring-offset-2 ring-purple-500 border-2 border-purple-500 bg-purple-100/90 shadow-[0_14px_35px_rgba(168,85,247,0.42)]',
                  activeBadge: 'bg-purple-600',
                  activeTextColor: 'text-purple-700',
                  ringBorder: 'border-purple-200/70',
                  ringBg: 'bg-purple-50/60',
                  glowShadow: 'shadow-[0_8px_20px_rgba(147,51,234,0.10)]',
                  iconColor: 'text-purple-600',
                },
                {
                  key: 'REQUEST_BILL' as const,
                  title: 'Request Bill',
                  subtitle: 'Get your bill instantly',
                  icon: ReceiptBillIcon,
                  activeRing: 'ring-4 ring-offset-2 ring-blue-500 border-2 border-blue-500 bg-blue-100/90 shadow-[0_14px_35px_rgba(59,130,246,0.42)]',
                  activeBadge: 'bg-blue-600',
                  activeTextColor: 'text-blue-700',
                  ringBorder: 'border-blue-200/70',
                  ringBg: 'bg-blue-50/60',
                  glowShadow: 'shadow-[0_8px_20px_rgba(59,130,246,0.10)]',
                  iconColor: 'text-blue-500',
                },
                {
                  key: 'WATER' as const,
                  title: 'Drinking Water',
                  subtitle: 'Request fresh drinking water',
                  icon: WaterBottleServiceIcon,
                  activeRing: 'ring-4 ring-offset-2 ring-cyan-500 border-2 border-cyan-500 bg-cyan-100/90 shadow-[0_14px_35px_rgba(6,182,212,0.42)]',
                  activeBadge: 'bg-cyan-600',
                  activeTextColor: 'text-cyan-700',
                  ringBorder: 'border-cyan-200/70',
                  ringBg: 'bg-cyan-50/60',
                  glowShadow: 'shadow-[0_8px_20px_rgba(6,182,212,0.10)]',
                  iconColor: 'text-cyan-500',
                },
              ].map((opt) => {
                const IconComp = opt.icon;
                const isSelected = selectedRequestType === opt.key;

                return (
                  <motion.button
                    key={opt.key}
                    type="button"
                    whileHover={{ scale: isSelected ? 1.10 : 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setSelectedRequestType(opt.key);
                      if (waiterCallState === 'waiting') {
                        setWaiterCallState('idle');
                      }
                    }}
                    className={`flex flex-col items-center text-center group cursor-pointer select-none focus:outline-none transition-all duration-300 ${
                      isSelected ? 'scale-105 z-10' : 'opacity-65 hover:opacity-95'
                    }`}
                  >
                    {/* Outer Glowing Halo Circle */}
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border transition-all duration-300 relative flex items-center justify-center p-1.5 ${
                        isSelected
                          ? `${opt.activeRing} scale-108`
                          : `${opt.ringBorder} ${opt.ringBg} ${opt.glowShadow}`
                      }`}
                    >
                      {/* Inner Pure White Disc */}
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-white shadow-md border-2 border-white'
                            : 'bg-white shadow-inner border border-white/80'
                        }`}
                      >
                        <IconComp
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 ${
                            opt.iconColor
                          } ${isSelected ? 'scale-115 stroke-[2.25]' : 'scale-100'}`}
                        />
                      </div>

                      {/* Prominent Floating Checkmark Badge */}
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${opt.activeBadge} text-white font-black text-[11px] flex items-center justify-center shadow-md ring-2 ring-white`}
                        >
                          ✓
                        </motion.span>
                      )}
                    </div>

                    {/* Label & Subtitle */}
                    <div className="mt-2.5 flex flex-col items-center">
                      <span
                        className={`text-xs sm:text-sm tracking-tight transition-colors ${
                          isSelected
                            ? `${opt.activeTextColor} font-black scale-105`
                            : 'text-slate-800 font-extrabold'
                        }`}
                      >
                        {opt.title}
                      </span>
                      <span
                        className={`text-[10px] sm:text-[11px] leading-tight max-w-[100px] sm:max-w-[115px] mt-0.5 transition-colors ${
                          isSelected ? 'text-slate-700 font-semibold' : 'text-slate-500 font-medium'
                        }`}
                      >
                        {opt.subtitle}
                      </span>

                      {/* Active Pill Indicator underneath */}
                      {isSelected && (
                        <motion.div
                          layoutId="active-waiter-indicator"
                          className={`w-6 h-1 rounded-full ${opt.activeBadge} mt-1.5 shadow-xs`}
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Bottom Row: 2 Options Centered */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              {[
                {
                  key: 'TISSUE' as const,
                  title: 'Tissue Paper',
                  subtitle: 'Request extra tissue paper',
                  icon: TissuePaperServiceIcon,
                  activeRing: 'ring-4 ring-offset-2 ring-emerald-500 border-2 border-emerald-500 bg-emerald-100/90 shadow-[0_14px_35px_rgba(16,185,129,0.42)]',
                  activeBadge: 'bg-emerald-600',
                  activeTextColor: 'text-emerald-700',
                  ringBorder: 'border-emerald-200/70',
                  ringBg: 'bg-emerald-50/60',
                  glowShadow: 'shadow-[0_8px_20px_rgba(16,185,129,0.10)]',
                  iconColor: 'text-emerald-500',
                },
                {
                  key: 'OTHER' as const,
                  title: 'Other Requests',
                  subtitle: "Anything else? We're here to help",
                  icon: ChatOtherServiceIcon,
                  activeRing: 'ring-4 ring-offset-2 ring-amber-500 border-2 border-amber-500 bg-amber-100/90 shadow-[0_14px_35px_rgba(245,158,11,0.42)]',
                  activeBadge: 'bg-amber-600',
                  activeTextColor: 'text-amber-700',
                  ringBorder: 'border-amber-200/70',
                  ringBg: 'bg-amber-50/60',
                  glowShadow: 'shadow-[0_8px_20px_rgba(245,158,11,0.10)]',
                  iconColor: 'text-amber-500',
                },
              ].map((opt) => {
                const IconComp = opt.icon;
                const isSelected = selectedRequestType === opt.key;

                return (
                  <motion.button
                    key={opt.key}
                    type="button"
                    whileHover={{ scale: isSelected ? 1.10 : 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setSelectedRequestType(opt.key);
                      if (waiterCallState === 'waiting') {
                        setWaiterCallState('idle');
                      }
                    }}
                    className={`flex flex-col items-center text-center group cursor-pointer select-none focus:outline-none transition-all duration-300 ${
                      isSelected ? 'scale-105 z-10' : 'opacity-65 hover:opacity-95'
                    }`}
                  >
                    {/* Outer Glowing Halo Circle */}
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border transition-all duration-300 relative flex items-center justify-center p-1.5 ${
                        isSelected
                          ? `${opt.activeRing} scale-108`
                          : `${opt.ringBorder} ${opt.ringBg} ${opt.glowShadow}`
                      }`}
                    >
                      {/* Inner Pure White Disc */}
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-white shadow-md border-2 border-white'
                            : 'bg-white shadow-inner border border-white/80'
                        }`}
                      >
                        <IconComp
                          className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 ${
                            opt.iconColor
                          } ${isSelected ? 'scale-115 stroke-[2.25]' : 'scale-100'}`}
                        />
                      </div>

                      {/* Prominent Floating Checkmark Badge */}
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${opt.activeBadge} text-white font-black text-[11px] flex items-center justify-center shadow-md ring-2 ring-white`}
                        >
                          ✓
                        </motion.span>
                      )}
                    </div>

                    {/* Label & Subtitle */}
                    <div className="mt-2.5 flex flex-col items-center">
                      <span
                        className={`text-xs sm:text-sm tracking-tight transition-colors ${
                          isSelected
                            ? `${opt.activeTextColor} font-black scale-105`
                            : 'text-slate-800 font-extrabold'
                        }`}
                      >
                        {opt.title}
                      </span>
                      <span
                        className={`text-[10px] sm:text-[11px] leading-tight max-w-[100px] sm:max-w-[115px] mt-0.5 transition-colors ${
                          isSelected ? 'text-slate-700 font-semibold' : 'text-slate-500 font-medium'
                        }`}
                      >
                        {opt.subtitle}
                      </span>

                      {/* Active Pill Indicator underneath */}
                      {isSelected && (
                        <motion.div
                          layoutId="active-waiter-indicator"
                          className={`w-6 h-1 rounded-full ${opt.activeBadge} mt-1.5 shadow-xs`}
                        />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Buttons with Rate-Limit Countdown */}
          <div className="pt-2">
            {waiterCallState === 'idle' && (
              <>
                {cooldownRemaining > 0 ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 bg-slate-100 text-slate-400 font-extrabold text-sm rounded-2xl border border-slate-200 flex items-center justify-center gap-2.5 cursor-not-allowed shadow-none select-none transition-all"
                  >
                    <Clock className="w-4.5 h-4.5 text-slate-400 animate-pulse" />
                    <span>Please wait ({formatCooldown(cooldownRemaining)}) to call again</span>
                  </button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTriggerWaiterCall(selectedRequestType)}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-slate-900/20 cursor-pointer"
                  >
                    <BellRing className="w-4.5 h-4.5 text-amber-400 animate-bounce" strokeWidth={2.2} />
                    <span>Call Waiter for {selectedRequestType.replace('_', ' ').toLowerCase()}</span>
                  </motion.button>
                )}
              </>
            )}

            {waiterCallState === 'pulsing' && (
              <div className="w-full py-4 bg-amber-50 text-amber-800 text-sm font-bold rounded-2xl flex items-center justify-center gap-2.5 border border-amber-200 shadow-sm animate-pulse">
                <Loader className="w-4 h-4 animate-spin text-amber-600" />
                <span>Dispatching call to floor team...</span>
              </div>
            )}

            {waiterCallState === 'waiting' && (
              <div className="space-y-3">
                {/* Bottom Confirmation Notification Card ("Request Sent!") */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden"
                >
                  {/* Left Checkmark with Decorative Confetti */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#22C55E] flex items-center justify-center text-white shadow-md shadow-green-500/20">
                        <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                      </div>
                      {/* Decorative confetti stars */}
                      <span className="absolute -top-1 -left-1 text-[11px] text-amber-400">✦</span>
                      <span className="absolute -bottom-1 -right-1 text-[11px] text-purple-400">✦</span>
                    </div>

                    {/* Center text */}
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-sm sm:text-base text-[#15803D] tracking-tight">
                        Request Sent!
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                        Your request has been sent successfully. <br className="hidden sm:inline" />
                        Our team will be with you shortly.
                      </p>
                    </div>
                  </div>

                  {/* Right Clapping Hands Illustration */}
                  <div className="shrink-0 hidden xs:block opacity-60">
                    <ClappingHandsOutlineIcon className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-800" />
                  </div>
                </motion.div>

                {/* Cooldown or Secondary Re-call Action Button */}
                {cooldownRemaining > 0 ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2 cursor-not-allowed select-none"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                    <span>Please wait ({formatCooldown(cooldownRemaining)}) before requesting again</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWaiterCallState('idle')}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Need another service? Choose & Call</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recent Service History */}
          {recentWaiterCalls.length > 0 && (
            <div className="space-y-2.5 pt-4 border-t border-slate-150">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                Recent Service History
              </span>
              <div className="space-y-2">
                {recentWaiterCalls.map((call, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-3 border border-slate-150 flex items-center justify-between text-xs transition shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {call.type.replace('_', ' ')} Requested
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {call.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* -------------------- 5. CART & ORDERS TAB -------------------- */}
      {activeTab === 'cart-orders' && (
        <motion.div
          key="cart-orders"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto px-4 py-4 space-y-6 flex flex-col pb-8"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <h3 className="font-display text-4xl font-normal text-slate-900 tracking-tight">My Basket & Orders</h3>
            <p className="text-xs text-slate-500">Manage your active cart and track kitchen orders.</p>
          </div>

          {/* Sticky/Fixed Segmented Top Tab Controls */}
          <div className="flex bg-slate-100 rounded-2xl p-1.5 border border-slate-200">
            <button
              onClick={() => setCartOrdersSubTab('cart')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                cartOrdersSubTab === 'cart'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Basket Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
            <button
              onClick={() => setCartOrdersSubTab('orders')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                cartOrdersSubTab === 'orders'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Placed Orders ({activeOrderCount})
            </button>
          </div>

          {/* Sub Tab: CART */}
          {cartOrdersSubTab === 'cart' && (
            <div className="space-y-6">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 space-y-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <ClipboardList className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">Your basket is empty</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Browse our delicious menu, customize your options, and add them here to request service!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[11px] rounded-xl transition shadow-sm"
                  >
                    Browse Delicious Menu
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                      Selected Dishes ({cartItems.length})
                    </span>
                    <button
                      onClick={() => setIsClearCartModalOpen(true)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Clear All
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 space-y-3">
                    {cartItems.map((item, _idx) => {
                      const failedCheck = failedOrderDetails.find((f) => f.menuItemId === item.itemId);
                      const isFailed = !!failedCheck;

                      return (
                        <div
                          key={_idx}
                          className={`flex gap-4 py-3 first:pt-0 rounded-xl transition-all ${
                            isFailed ? 'bg-red-50/50 p-3 border border-red-200/50' : ''
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.name}</h4>
                            {item.selectedAddOns.length > 0 && (
                              <p className="text-[10px] text-slate-400 font-medium">+ {item.selectedAddOns.map((x) => x.name).join(', ')}</p>
                            )}
                            {item.specialInstructions && (
                              <p className="text-[10px] text-amber-600 bg-amber-50/50 rounded-lg px-2 py-1 inline-block italic font-medium">
                                Note: "{item.specialInstructions}"
                              </p>
                            )}
                            {isFailed && <p className="text-[10px] font-bold text-red-600 mt-1">⚠️ Item is currently unavailable.</p>}
                            <p className="text-xs font-bold text-slate-500">{formatPrice(item.price, currency)} each</p>
                          </div>

                          <div className="flex flex-col items-end justify-between shrink-0">
                            <span className="text-xs font-black text-slate-900 font-mono">{formatPrice(item.price * item.quantity, currency)}</span>
                            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5 mt-2">
                              <button
                                onClick={() => updateQuantity(item.itemId, item.selectedAddOns, item.specialInstructions || '', -1)}
                                className="p-1 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                              >
                                <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                              <span className="px-2 font-bold text-slate-900 text-[11px] font-mono w-5 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.itemId, item.selectedAddOns, item.specialInstructions || '', 1)}
                                className="p-1 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">Kitchen Special Request Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Add spice requests, cooking style notes..."
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        className="w-full p-3 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex flex-col gap-1 mb-2 border-b border-slate-200 pb-2">
                       <div className="flex justify-between text-slate-500 text-sm font-medium">
                          <span>Subtotal</span>
                          <span className="font-mono">{formatPrice(cartSubtotal, currency)}</span>
                       </div>
                       {cartTaxBreakdown.map((t: any, idx: number) => (
                           <div key={idx} className="flex flex-col gap-0.5">
                               <div className="flex justify-between text-slate-500 text-sm font-medium">
                                  <span>{t.name} ({t.percentage}%)</span>
                                  <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                               </div>
                               {t.subTaxes && t.subTaxes.length > 0 && (
                                   <div className="pl-3 border-l-2 border-slate-200 ml-1 space-y-0.5 my-0.5">
                                       {t.subTaxes.map((st: any, i: number) => (
                                           <div key={i} className="flex justify-between text-slate-400 text-xs">
                                              <span>{st.name} ({st.percentage}%)</span>
                                              <span className="font-mono text-slate-400">({formatPrice(st.amount, currency)})</span>
                                           </div>
                                       ))}
                                   </div>
                               )}
                           </div>
                       ))}
                    </div>
                    {sessionDetailsData?.data?.session ? (
                      <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 mt-1">
                         <div className="flex justify-between text-slate-500 text-sm">
                            <span>Current Session Total</span>
                            <span className="font-mono">{formatPrice(sessionDetailsData.data.session.total, currency)}</span>
                         </div>
                         <div className="flex justify-between text-slate-500 text-sm">
                            <span>This Order Total</span>
                            <span className="font-mono">{formatPrice(cartGrandTotal, currency)}</span>
                         </div>
                         <div className="flex justify-between text-slate-900 font-bold text-sm mt-1 border-t border-slate-200 pt-2">
                            <span>Expected Final Bill</span>
                            <span className="text-lg font-black text-slate-900 font-mono">{formatPrice(sessionDetailsData.data.session.total + cartGrandTotal, currency)}</span>
                         </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-800 font-bold text-sm">Grand Total (Incl. Taxes)</span>
                        <span className="text-lg font-black text-slate-900 font-mono">{formatPrice(cartGrandTotal, currency)}</span>
                      </div>
                    )}

                    <button
                      onClick={handleCheckoutTrigger}
                      disabled={cartItems.length === 0}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white py-3.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-md active:scale-[0.99] uppercase"
                    >
                      Confirm Checkout & Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub Tab: ORDERS */}
          {cartOrdersSubTab === 'orders' && (
            <div className="space-y-6">
              {activeTrackingOrderId ? (
                <OrderTracker
                  orderId={activeTrackingOrderId}
                  currency={currency}

                  onBack={() => setActiveTrackingOrderId(null)}
                  workflowMode={(restaurant as any).orderWorkflowMode || 'FIVE_STEP'}
                />
              ) : !activeSessionId ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 space-y-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <Clock className="w-6 h-6 animate-pulse" strokeWidth={1.75} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">No orders placed yet</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Your placed kitchen orders will appear here. Place items from your basket to see live progress!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[11px] rounded-xl transition shadow-sm"
                  >
                    Go to Menu
                  </button>
                </div>
              ) : isSessionLoading ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 flex items-center justify-center">
                  <Loader className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : !sessionDetailsData || !sessionDetailsData.success || !sessionDetailsData.data.session ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 space-y-2 text-slate-500 text-xs">
                  Error loading orders. Please contact service.
                </div>
              ) : (() => {
                const session = sessionDetailsData.data.session;
                const orders = sessionDetailsData.data.orders || [];
                return (
                  <div className="space-y-5">
                    <div className="flex justify-center pb-2">
                      <button
                        onClick={() => setIsClearSessionModalOpen(true)}
                        className="text-xs font-semibold text-slate-500 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                      >
                        Not your orders? Start a new session
                      </button>
                    </div>

                    {/* Top Session Summary Card */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4 text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display text-2xl font-normal text-slate-900 leading-snug">
                            {table.displayName}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Rounds {orders.map((o: any) => o.roundNumber).join(' & ')} •{' '}
                            <strong className="text-slate-900 font-extrabold font-mono">
                              {formatPrice(session.total, currency)} total
                            </strong>
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 font-mono">
                          Session {session.status}
                        </span>
                      </div>

                      {/* Single live status summary across the whole session */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex items-center gap-3">
                        <Utensils className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.75} />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900">Live Status Summary</span>
                          <p className="text-[11px] text-slate-500 truncate leading-relaxed">
                            {orders.length} round{orders.length > 1 ? 's' : ''} placed. Items served:{' '}
                            {orders.flatMap((o: any) => o.items).filter((i: any) => i.itemStatus === 'SERVED').length} of{' '}
                            {orders.flatMap((o: any) => o.items).length} total.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Compacting Rounds List */}
                    <div className="space-y-4">
                      {orders.map((order: any) => {
                        const isExpanded = expandedRounds[order._id] ?? true;
                        const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const sortedItems = [...order.items].sort((a, b) => (a.prepTimeMinutesSnapshot || 10) - (b.prepTimeMinutesSnapshot || 10));

                        return (
                          <div key={order._id} className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden text-left">
                            {/* Compact clickable header */}
                            <div
                              onClick={() => toggleRound(order._id)}
                              className="p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition select-none"
                            >
                              <div>
                                <h5 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                  <span>Round {order.roundNumber}</span>
                                  {order.isMerged && (
                                    <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                      Merged
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Placed at {orderTime} • {formatPrice(order.total, currency)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                  {sortedItems.length} item{sortedItems.length > 1 ? 's' : ''}
                                </span>
                                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                              </div>
                            </div>

                            {/* Collapsible item checklist */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="divide-y divide-slate-50 px-4"
                                >
                                  {sortedItems.map((item: any, itemIdx: number) => {
                                    const isServed = item.itemStatus === 'SERVED';
                                    const isReady = item.itemStatus === 'READY';
                                    const isPreparing = item.itemStatus === 'PREPARING';

                                    return (
                                      <div key={itemIdx} className="py-3 flex items-start justify-between gap-3 text-xs">
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                          <div className="shrink-0 mt-0.5">
                                            {isServed ? (
                                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50/30" strokeWidth={2} />
                                            ) : isReady ? (
                                              <Utensils className="w-4.5 h-4.5 text-purple-500 animate-pulse" strokeWidth={2} />
                                            ) : isPreparing ? (
                                              <ChefHat className="w-4.5 h-4.5 text-indigo-500 animate-pulse" strokeWidth={2} />
                                            ) : (
                                              <Clock className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <h6 className={`font-bold text-slate-900 leading-tight ${isServed ? 'line-through text-slate-400 font-normal' : ''}`}>
                                              {item.nameSnapshot} <span className="font-mono text-slate-400 font-bold text-[10px]">x{item.quantity}</span>
                                            </h6>
                                            {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                              <p className="text-[10px] text-slate-400 mt-0.5">+ {item.selectedAddOns.map((x: any) => x.name).join(', ')}</p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {item.prepTimeMinutesSnapshot && item.prepTimeMinutesSnapshot <= 10 && (
                                            <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-extrabold font-sans tracking-wide uppercase shrink-0 leading-none">
                                              Quick
                                            </span>
                                          )}
                                          <span className={`text-[10px] font-bold font-mono tracking-wide ${isServed ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {item.itemStatus || 'PENDING'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Detailed tracking button per round card */}
                                  <div className="py-3 flex justify-end">
                                    <button
                                      onClick={() => setActiveTrackingOrderId(order._id)}
                                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm"
                                    >
                                      <span>Track Round Status</span>
                                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </motion.div>
      )}

      {/* ==========================================
          FLOATING CART BAR
          ========================================== */}
      <AnimatePresence>
        {cartItems.length > 0 && activeTab !== 'cart-orders' && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto"
          >
            <button
              onClick={() => {
                updateNavigationState('cart-orders', 'cart');
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white py-3.5 px-5 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-between border border-slate-800 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <span className="bg-amber-500 text-slate-950 font-black font-mono text-xs px-2.5 py-0.5 rounded-full flex items-center justify-center">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
                <span className="font-sans">View Basket</span>
              </div>
              <span className="font-mono font-black">{formatPrice(cartSubtotal, currency)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          UNIFIED BOTTOM NAVIGATION (STICKY FIXED)
          ========================================== */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 flex items-center justify-around px-4 pb-safe z-40 shadow-lg select-none">

        {/* Landing */}
        <button
          onClick={() => setActiveTab('landing')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'landing' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
          }`}
        >
          <Compass className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] leading-none">Home</span>
        </button>

        {/* Menu & Search */}
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'menu' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
          }`}
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] leading-none">Menu & Search</span>
        </button>

        {/* Call Waiter */}
        <button
          onClick={() => setActiveTab('waiter')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
            activeTab === 'waiter' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
          }`}
        >
          <BellRing className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[10px] leading-none">Assistance</span>
          {waiterCallState === 'waiting' && (
            <span className="absolute top-2 right-1/4 h-2 w-2 bg-amber-500 rounded-full animate-ping" />
          )}
        </button>

        {/* Cart & Orders */}
        <button
          onClick={() => setActiveTab('cart-orders')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
            activeTab === 'cart-orders' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[10px] leading-none">Cart & Orders</span>
        </button>

      </nav>

      {/* ==========================================
          WAITER ASSISTANCE CONFIRM MODAL
          ========================================== */}
      <ConfirmModal
        isOpen={isWaiterConfirmOpen}
        title="Confirm Assistance Call?"
        message={`Would you like to request "${selectedRequestType.replace('_', ' ').toLowerCase()}" for Table ${table.tableNumber}?`}
        confirmText="Confirm Request"
        cancelText="Cancel"
        onConfirm={handleCallWaiterConfirm}
        onCancel={() => setIsWaiterConfirmOpen(false)}
      />

      {/* ==========================================
          CLEAR SESSION CONFIRM MODAL
          ========================================== */}
      <ConfirmModal
        isOpen={isClearSessionModalOpen}
        title="Start New Session?"
        message="Are you sure you want to clear these orders and start a fresh session for this table? This cannot be undone."
        confirmText="Clear & Start New"
        cancelText="Cancel"
        onConfirm={() => {
          clearSessionMutation.mutate();
          setIsClearSessionModalOpen(false);
        }}
        onCancel={() => setIsClearSessionModalOpen(false)}
      />

      {/* ==========================================
          CLEAR CART CONFIRM MODAL
          ========================================== */}
      <ConfirmModal
        isOpen={isClearCartModalOpen}
        title="Clear Basket?"
        message="Remove all items from your review list?"
        confirmText="Clear Basket"
        cancelText="Keep Items"
        onConfirm={() => {
          clearCart();
          setIsClearCartModalOpen(false);
          toast('Basket cleared', 'info');
        }}
        onCancel={() => setIsClearCartModalOpen(false)}
      />

      {/* ==========================================
          ITEM DETAIL BOTTOM SHEET
          ========================================== */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedItem(null)}
            />

            {/* Bottom Drawer Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 240 }}
              className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto font-sans flex flex-col"
            >
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

              <button
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-500 hover:text-slate-700 z-10"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>

              <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
                <div className="w-full h-56 bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-100">
                  {selectedItem.imageUrl ? (
                    <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Sparkles className="w-12 h-12" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex gap-1.5">
                    {selectedItem.isVegetarian && <MenuBadge variant="veg" />}
                    {selectedItem.isSpicy && <MenuBadge variant="spicy" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-3xl font-normal text-slate-900 leading-tight">{selectedItem.name}</h3>
                  {selectedItem.description && <p className="text-slate-500 text-sm leading-relaxed">{selectedItem.description}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-900">{formatPrice(selectedItem.price, currency)}</span>
                    {selectedItem.prepTimeMinutes && <span className="text-xs text-slate-400 font-medium">• {selectedItem.prepTimeMinutes} mins prep</span>}
                  </div>
                </div>

                {/* Add-Ons Customizations */}
                {selectedItem.addOns && selectedItem.addOns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Customize Item</h4>
                    <div className="space-y-2.5">
                      {selectedItem.addOns.map((addOn) => {
                        const isChecked = detailSelectedAddOns.some((x) => x.name === addOn.name);
                        return (
                          <label
                            key={addOn.name}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50/50 border-[var(--theme-accent)]/40 text-slate-950'
                                : 'border-slate-150 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleAddOnToggle(addOn)}
                                className="w-4.5 h-4.5 accent-[var(--theme-accent)] rounded border-slate-300"
                              />
                              <span className="text-sm font-semibold">{addOn.name}</span>
                            </div>
                            <span className="text-sm font-bold">+ {formatPrice(addOn.priceDelta, currency)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cooking instructions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Special Cooking Instructions</h4>
                  <textarea
                    rows={2}
                    placeholder="E.g., Extra hot, sugar-free, less ice..."
                    value={detailSpecialInstructions}
                    onChange={(e) => setDetailSpecialInstructions(e.target.value)}
                    className="w-full p-3.5 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 focus:border-[var(--theme-accent)] text-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 shrink-0">
                    <button
                      onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <span className="px-4 font-bold text-slate-900 text-sm font-mono w-8 text-center">{detailQuantity}</span>
                    <button
                      onClick={() => setDetailQuantity((q) => q + 1)}
                      className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center justify-between shadow-md"
                  >
                    <span>Add to Cart</span>
                    <span>
                      {formatPrice(
                        (selectedItem.price +
                          detailSelectedAddOns.reduce((sum, x) => sum + x.priceDelta, 0)) *
                          detailQuantity,
                        currency
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ==========================================
          MOBILE NUMBER AND OTP CHECKOUT DIALOG
          ========================================== */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsOtpModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-6 font-sans"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  <span>Verify Checkout</span>
                </h3>
                <button
                  onClick={() => setIsOtpModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {!otpSent ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Enter your name and mobile number to complete authentication and place your secure kitchen order.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Your Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="E.g., John Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2} />
                      <input
                        type="tel"
                        placeholder="E.g., +91 98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSendOtp}
                    className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Send Verification SMS
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Enter the 4-digit verification code sent to <strong>{phoneNumber}</strong>.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">OTP Code</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter 1234"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-lg font-black font-mono tracking-widest focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOtpSent(false)}
                      className="w-1/3 py-3 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyOtpAndPlaceOrder}
                      disabled={isPlacingOrder || otpCode.length < 4}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-slate-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
                    >
                      {isPlacingOrder && <Loader className="w-4 h-4 animate-spin" />}
                      <span>Verify & Place Order</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100 space-y-6 text-center font-sans"
          >
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-normal text-slate-900">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition shadow-sm"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PublicTable;
