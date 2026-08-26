import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Banknote,
  QrCode,
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  CornerDownLeft,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export interface PaymentVerificationModalProps {
  isOpen: boolean;
  order: any;
  currency?: string;
  mode?: 'PREPAID' | 'POSTPAID';
  title?: string;
  subtitle?: string;
  onConfirmPayment: (isPaid: boolean, paymentMethod?: string) => void;
  onCancel: () => void;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY';

const PAYMENT_METHODS: { id: PaymentMethodType; name: string; icon: any; description: string }[] = [
  { id: 'CASH', name: 'Cash', icon: Banknote, description: 'Physical cash collected' },
  { id: 'CARD', name: 'Card / POS', icon: CreditCard, description: 'Card machine / EDC' },
  { id: 'UPI', name: 'UPI / QR', icon: QrCode, description: 'Instant UPI transfer' },
  { id: 'RAZORPAY', name: 'Digital Gateway', icon: Globe, description: 'Online gateway payment' },
];

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  order,
  currency = 'INR',
  mode = 'PREPAID',
  title,
  subtitle,
  onConfirmPayment,
  onCancel,
}) => {
  // Step 1: Choose payment method. Step 2: Confirm payment status.
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state: payment method index
  const [selectedMethodIdx, setSelectedMethodIdx] = useState<number>(0);

  // Step 2 state: status option ('NOT_PAID' or 'PAID')
  // Index 0: NOT_PAID, Index 1: PAID
  const [selectedStatusIdx, setSelectedStatusIdx] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMethodIdx(0);
      setSelectedStatusIdx(0);
    }
  }, [isOpen]);

  // Keyboard Navigation Handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 1) {
        // Step 1 Navigation: Choose Payment Method
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMethodIdx((prev) => (prev + 1) % PAYMENT_METHODS.length);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMethodIdx((prev) => (prev - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setStep(2);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      } else if (step === 2) {
        // Step 2 Navigation: Confirm Payment Done / Not Paid
        // Index 0: NOT_PAID (Left), Index 1: PAID (Right)
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedStatusIdx((prev) => (prev + 1) % 2);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedStatusIdx((prev) => (prev - 1 + 2) % 2);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const isPaid = selectedStatusIdx === 1;
          const method = PAYMENT_METHODS[selectedMethodIdx].id;
          onConfirmPayment(isPaid, method);
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
  }, [isOpen, step, selectedMethodIdx, selectedStatusIdx, onConfirmPayment, onCancel]);

  if (!isOpen || !order) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  }).format((order.total || 0) / 100);

  const activeMethod = PAYMENT_METHODS[selectedMethodIdx];
  const isPaidSelected = selectedStatusIdx === 1;

  const displayTitle =
    title ||
    (mode === 'PREPAID'
      ? `Verify Payment for Order #${order.orderNumber}`
      : `Verify Payment to Free Table ${order.tableId?.displayName || order.tableId?.tableNumber || ''}`);

  const displaySubtitle =
    subtitle ||
    (mode === 'PREPAID'
      ? 'Prepaid Mode: Order requires payment verification before kitchen prep.'
      : 'Postpaid Mode: Table settlement verification.');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Clean Light Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={onCancel}
        />

        {/* Modal Window in Modern Light Theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-white border border-slate-200 text-slate-900 rounded-3xl shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <CreditCard className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">{displayTitle}</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                    Step {step} of 2
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{displaySubtitle}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Order Details Card */}
          <div className="p-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                  Order Amount
                </span>
                <span className="text-2xl font-black font-mono text-amber-600">{formattedAmount}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block">
                  {order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {order.customerName || 'Diner'} • {order.items?.length || 0} items
                </span>
              </div>
            </div>

            {/* Keyboard Guidance Bar */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2} />
                {step === 1 ? (
                  <span>
                    Use <strong>← / →</strong> to pick payment mode, <strong>Enter ↵</strong> for next step.
                  </span>
                ) : (
                  <span>
                    Use <strong>← / →</strong> to select status, <strong>Enter ↵</strong> to confirm.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {step === 2 && (
                  <span className="text-[10px] font-mono bg-white border border-amber-200 px-1.5 py-0.5 rounded text-amber-800 font-bold">
                    Bksp: Back
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded shadow-2xs">
                  <CornerDownLeft className="w-3 h-3" /> Enter
                </span>
              </div>
            </div>

            {/* Step 1: Select Payment Mode */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                  1. Choose Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m, idx) => {
                    const MethodIcon = m.icon;
                    const isSelected = selectedMethodIdx === idx;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodIdx(idx)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-28 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 shadow-md shadow-amber-500/10 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`p-2 rounded-xl ${
                              isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <MethodIcon className="w-5 h-5" strokeWidth={2} />
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                              Selected (←/→)
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 block">{m.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium block">{m.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Confirm Payment Received vs Not Paid */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    2. Confirm Payment Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Change Method ({activeMethod.name})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Option 0: NOT PAID YET (Left) */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(0)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-32 cursor-pointer ${
                      !isPaidSelected
                        ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-500/10 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <XCircle
                        className={`w-6 h-6 ${!isPaidSelected ? 'text-rose-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {!isPaidSelected && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                          Selected (←/→)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 block">Not Paid Yet</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {mode === 'PREPAID' ? 'Keep in Pending' : 'Keep Table Occupied'}
                      </span>
                    </div>
                  </button>

                  {/* Option 1: PAYMENT RECEIVED (Right) */}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIdx(1)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-32 cursor-pointer ${
                      isPaidSelected
                        ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/10 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CheckCircle2
                        className={`w-6 h-6 ${isPaidSelected ? 'text-emerald-600' : 'text-slate-400'}`}
                        strokeWidth={2}
                      />
                      {isPaidSelected && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Selected (←/→)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 block">Payment Received</span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {mode === 'PREPAID' ? `Mark Paid (${activeMethod.name}) & Accept` : `Mark Paid (${activeMethod.name})`}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back (Backspace)
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition cursor-pointer"
              >
                Cancel (Esc)
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Next: Confirm Status</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConfirmPayment(isPaidSelected, activeMethod.id)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center gap-2 active:scale-95 cursor-pointer ${
                  isPaidSelected
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                }`}
              >
                <span>
                  {isPaidSelected
                    ? `Confirm Paid (${activeMethod.name})`
                    : 'Confirm Not Paid (Keep Pending)'}
                </span>
                <CornerDownLeft className="w-4 h-4 opacity-80" strokeWidth={2} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
