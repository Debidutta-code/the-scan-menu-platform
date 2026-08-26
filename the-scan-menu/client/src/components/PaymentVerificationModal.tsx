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
  onConfirmPayment: (isPaid: boolean, paymentMethod?: string) => void;
  onCancel: () => void;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY';

const ALL_PAYMENT_METHODS: { id: PaymentMethodType; key: 'cash' | 'card' | 'upi' | 'razorpay'; name: string; icon: any; description: string }[] = [
  { id: 'CASH', key: 'cash', name: 'Cash', icon: Banknote, description: 'Cash collected at counter' },
  { id: 'CARD', key: 'card', name: 'Card / POS', icon: CreditCard, description: 'EDC Card machine terminal' },
  { id: 'UPI', key: 'upi', name: 'UPI / QR', icon: QrCode, description: 'Instant UPI QR code scan' },
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

  // Filter payment methods based on manager configurations set in settings
  const availableMethods = useMemo(() => {
    if (!enabledPaymentMethods) return ALL_PAYMENT_METHODS;
    const list = ALL_PAYMENT_METHODS.filter((m) => enabledPaymentMethods[m.key] !== false);
    return list.length > 0 ? list : ALL_PAYMENT_METHODS;
  }, [enabledPaymentMethods]);

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
          className="relative w-full max-w-lg bg-white border border-slate-200 text-slate-900 rounded-3xl shadow-2xl overflow-hidden text-left my-auto z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight">{displayTitle}</h4>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono shrink-0">
                    {step}/2
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{displaySubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Compact Order Summary Ribbon */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold block">
                  Total Order Amount
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 mt-0.5 block leading-none">
                  {formattedAmount}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block truncate max-w-[160px]">
                  {tableName}
                </span>
                <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">
                  {order.customerName ? `${order.customerName} • ` : ''}{order.items?.length || 0} items
                </span>
              </div>
            </div>

            {/* Step 1: Select Payment Mode */}
            {step === 1 && (
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  1. Choose Payment Method
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {availableMethods.map((m, idx) => {
                    const MethodIcon = m.icon;
                    const isSelected = selectedMethodIdx === idx;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodIdx(idx)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between min-h-[85px] cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-500 shadow-xs text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`p-2 rounded-xl ${
                              isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <MethodIcon className="w-4 h-4" strokeWidth={2} />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">{m.name}</span>
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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    2. Confirm Payment Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-extrabold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Change ({activeMethod.name})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option 0: NOT PAID YET */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(0)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between min-h-[105px] cursor-pointer ${
                      !isPaidSelected
                        ? 'bg-rose-50/90 border-rose-500 shadow-xs text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <XCircle
                        className={`w-6 h-6 ${!isPaidSelected ? 'text-rose-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {!isPaidSelected && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">Not Paid Yet</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {mode === 'PREPAID' ? 'Keep in Pending' : 'Keep Table Occupied'}
                      </span>
                    </div>
                  </button>

                  {/* Option 1: PAYMENT RECEIVED */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(1)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between min-h-[105px] cursor-pointer ${
                      isPaidSelected
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CheckCircle2
                        className={`w-6 h-6 ${isPaidSelected ? 'text-emerald-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {isPaidSelected && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 block leading-tight">Payment Received</span>
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
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Next: Confirm Status</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConfirmPayment(isPaidSelected, activeMethod.id)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isPaidSelected
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <span>
                  {isPaidSelected
                    ? `Confirm Paid (${activeMethod.name})`
                    : 'Confirm Not Paid'}
                </span>
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
