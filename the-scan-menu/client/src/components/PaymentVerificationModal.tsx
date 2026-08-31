import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Banknote,
  QrCode,
  Globe,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from './ui/Button';

export interface PaymentVerificationModalProps {
  isOpen: boolean;
  order: any;
  currency?: string;
  mode?: 'PREPAID' | 'POSTPAID';
  title?: string;
  subtitle?: string;
  enabledPaymentMethods?: {
    cash?: boolean;
    card?: boolean;
    upi?: boolean;
    razorpay?: boolean;
  };
  preferredMethodOrder?: string[];
  onConfirmPayment: (isPaid: boolean, paymentMethod?: string) => void;
  onCancel: () => void;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY';

const ALL_PAYMENT_METHODS: { id: PaymentMethodType; key: 'cash' | 'card' | 'upi' | 'razorpay'; name: string; icon: any; description: string }[] = [
  { id: 'UPI', key: 'upi', name: 'UPI / QR', icon: QrCode, description: 'Instant UPI QR code scan' },
  { id: 'CASH', key: 'cash', name: 'Cash', icon: Banknote, description: 'Cash collected at counter' },
  { id: 'CARD', key: 'card', name: 'Card / POS', icon: CreditCard, description: 'EDC Card machine terminal' },
  { id: 'RAZORPAY', key: 'razorpay', name: 'Razorpay Gateway', icon: Globe, description: 'Online gateway' },
];

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  order,
  currency = 'INR',
  mode = 'PREPAID',
  title,
  subtitle,
  enabledPaymentMethods,
  preferredMethodOrder,
  onConfirmPayment,
  onCancel,
}) => {
  // Step 1: Choose payment method. Step 2: Confirm payment status.
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state: payment method index
  const [selectedMethodIdx, setSelectedMethodIdx] = useState<number>(0);

  // Step 2 state: status option ('NOT_PAID' or 'PAID')
  // Index 0: NOT_PAID, Index 1: PAID
  const [selectedStatusIdx, setSelectedStatusIdx] = useState<number>(1); // Default to Paid (Received) for fast workflow

  // Filter and sort payment methods based on manager configurations set in settings
  const availableMethods = useMemo(() => {
    let list = ALL_PAYMENT_METHODS;
    if (enabledPaymentMethods) {
      list = ALL_PAYMENT_METHODS.filter((m) => enabledPaymentMethods[m.key] !== false);
    }
    if (preferredMethodOrder && Array.isArray(preferredMethodOrder) && preferredMethodOrder.length > 0) {
      list = [...list].sort((a, b) => {
        const idxA = preferredMethodOrder.indexOf(a.id);
        const idxB = preferredMethodOrder.indexOf(b.id);
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        return orderA - orderB;
      });
    }
    return list.length > 0 ? list : ALL_PAYMENT_METHODS;
  }, [enabledPaymentMethods, preferredMethodOrder]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMethodIdx(0);
      setSelectedStatusIdx(1);
    }
  }, [isOpen]);

  // Keyboard Navigation Handler (Preserved silently for desktop power users)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 1) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMethodIdx((prev) => (prev + 1) % availableMethods.length);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMethodIdx((prev) => (prev - 1 + availableMethods.length) % availableMethods.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setStep(2);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      } else if (step === 2) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedStatusIdx((prev) => (prev + 1) % 2);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedStatusIdx((prev) => (prev - 1 + 2) % 2);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const isPaid = selectedStatusIdx === 1;
          const activeM = availableMethods[selectedMethodIdx] || availableMethods[0];
          onConfirmPayment(isPaid, activeM.id);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          setStep(1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, selectedMethodIdx, selectedStatusIdx, availableMethods, onConfirmPayment, onCancel]);

  if (!isOpen || !order) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  }).format((order.total || 0) / 100);

  const activeMethod = availableMethods[selectedMethodIdx] || availableMethods[0];
  const isPaidSelected = selectedStatusIdx === 1;

  const rawTableName = order.tableId?.displayName || order.tableId?.tableNumber || '';
  const tableName = rawTableName
    ? rawTableName.toLowerCase().startsWith('table')
      ? rawTableName
      : `Table ${rawTableName}`
    : 'Table';

  const displayTitle =
    title ||
    (mode === 'PREPAID'
      ? `Verify Payment • Order #${order.orderNumber}`
      : `Verify Settlement • ${tableName}`);

  const displaySubtitle =
    subtitle ||
    (mode === 'PREPAID'
      ? 'Prepaid: Verify payment before prep'
      : 'Postpaid: Table settlement verification');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none">
        {/* Clean Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          onClick={onCancel}
        />

        {/* Compact, Sleek Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white border border-slate-200/80 text-slate-900 rounded-2xl shadow-xl overflow-hidden text-left my-auto z-10 font-sans select-none"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight">{displayTitle}</h4>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono shrink-0">
                    {step}/2
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{displaySubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3.5 sm:p-4 space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Compact Order Summary Ribbon */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold block">
                  Total Order Amount
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 mt-0.5 block leading-none">
                  {formattedAmount}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block truncate max-w-[160px]">
                  {tableName}
                </span>
                <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                  {order.customerName ? `${order.customerName} • ` : ''}{order.items?.length || 0} items
                </span>
              </div>
            </div>

            {/* Step 1: Select Payment Mode */}
            {step === 1 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 block">
                  1. Choose Payment Method
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {availableMethods.map((m, idx) => {
                    const MethodIcon = m.icon;
                    const isSelected = selectedMethodIdx === idx;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodIdx(idx)}
                        className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[75px] cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <MethodIcon className="w-3.5 h-3.5" strokeWidth={2} />
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <span className="text-xs font-bold text-slate-900 block leading-tight">{m.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">{m.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Confirm Payment Received vs Not Paid */}
            {step === 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 block">
                    2. Confirm Payment Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change ({activeMethod.name})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Option 0: NOT PAID YET */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(0)}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[90px] cursor-pointer shadow-2xs ${
                      !isPaidSelected
                        ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/20 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <XCircle
                        className={`w-5 h-5 ${!isPaidSelected ? 'text-rose-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {!isPaidSelected && (
                        <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span className="text-xs font-bold text-slate-900 block leading-tight">Not Paid Yet</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {mode === 'PREPAID' ? 'Keep in Pending' : 'Keep Table Occupied'}
                      </span>
                    </div>
                  </button>

                  {/* Option 1: PAYMENT RECEIVED */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(1)}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between min-h-[90px] cursor-pointer shadow-2xs ${
                      isPaidSelected
                        ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CheckCircle2
                        className={`w-5 h-5 ${isPaidSelected ? 'text-emerald-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {isPaidSelected && (
                        <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span className="text-xs font-bold text-slate-900 block leading-tight">Payment Received</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        Mark Paid ({activeMethod.name})
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {step === 2 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-3 h-3" />}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}

            {step === 1 ? (
              <Button
                type="button"
                variant="amber"
                onClick={() => setStep(2)}
                rightIcon={<ArrowRight className="w-3 h-3" strokeWidth={2.5} />}
              >
                Next: Confirm Status
              </Button>
            ) : (
              <Button
                type="button"
                variant={isPaidSelected ? 'emerald' : 'danger'}
                onClick={() => onConfirmPayment(isPaidSelected, activeMethod.id)}
                rightIcon={<Check className="w-3 h-3" strokeWidth={2.5} />}
              >
                {isPaidSelected
                  ? `Confirm Paid (${activeMethod.name})`
                  : 'Confirm Not Paid'}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
