import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2, XCircle, AlertTriangle, X, CornerDownLeft } from 'lucide-react';

export interface PaymentVerificationModalProps {
  isOpen: boolean;
  order: any;
  currency?: string;
  mode?: 'PREPAID' | 'POSTPAID';
  title?: string;
  subtitle?: string;
  onConfirmPayment: (isPaid: boolean) => void;
  onCancel: () => void;
}

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
  // Default selected option is NOT_PAID so pressing Enter fast defaults to Not Paid
  const [selectedOption, setSelectedOption] = useState<'NOT_PAID' | 'PAID'>('NOT_PAID');

  useEffect(() => {
    if (isOpen) {
      setSelectedOption('NOT_PAID');
    }
  }, [isOpen]);

  // Keyboard navigation event handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedOption('PAID');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedOption('NOT_PAID');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirmPayment(selectedOption === 'PAID');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedOption, onConfirmPayment, onCancel]);

  if (!isOpen || !order) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
  }).format((order.total || 0) / 100);

  const displayTitle =
    title ||
    (mode === 'PREPAID'
      ? `Verify Payment for Order #${order.orderNumber}`
      : `Verify Payment to Free Table ${order.tableId?.displayName || order.tableId?.tableNumber || ''}`);

  const displaySubtitle =
    subtitle ||
    (mode === 'PREPAID'
      ? 'Prepaid Mode: Order cannot move to kitchen preparation until payment is marked as PAID.'
      : 'Postpaid Mode: Table cannot be freed after service until bill payment is marked as PAID.');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onCancel}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-white tracking-tight">{displayTitle}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{displaySubtitle}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Order Details Card */}
          <div className="p-6 space-y-5">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Order Amount</span>
                <span className="text-2xl font-black font-mono text-amber-400">{formattedAmount}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white block">
                  {order.tableId?.displayName || order.tableId?.tableNumber || 'Table'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {order.customerName || 'Diner'} • {order.items?.length || 0} items
                </span>
              </div>
            </div>

            {/* Keyboard Guidance Alert */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={2} />
                <span>Use <strong>← / →</strong> keys to select, <strong>Enter</strong> to confirm.</span>
              </div>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-300">
                <CornerDownLeft className="w-3 h-3" /> Enter
              </span>
            </div>

            {/* Selection Options */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Option 1: NOT PAID (Default Focus) */}
              <button
                type="button"
                onClick={() => setSelectedOption('NOT_PAID')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-32 cursor-pointer ${
                  selectedOption === 'NOT_PAID'
                    ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <XCircle className={`w-6 h-6 ${selectedOption === 'NOT_PAID' ? 'text-rose-400' : 'text-slate-500'}`} strokeWidth={2} />
                  {selectedOption === 'NOT_PAID' && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full">
                      Default Enter
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white block">Not Paid Yet</span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    {mode === 'PREPAID' ? 'Keep in Pending' : 'Keep Table Occupied'}
                  </span>
                </div>
              </button>

              {/* Option 2: PAYMENT RECEIVED / PAID */}
              <button
                type="button"
                onClick={() => setSelectedOption('PAID')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-32 cursor-pointer ${
                  selectedOption === 'PAID'
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <CheckCircle2 className={`w-6 h-6 ${selectedOption === 'PAID' ? 'text-emerald-400' : 'text-slate-500'}`} strokeWidth={2} />
                  {selectedOption === 'PAID' && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                      Selected (← / →)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white block">Payment Received</span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                    {mode === 'PREPAID' ? 'Mark Paid & Accept Order' : 'Mark Paid & Free Table'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition"
            >
              Cancel (Esc)
            </button>

            <button
              onClick={() => onConfirmPayment(selectedOption === 'PAID')}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center gap-2 active:scale-95 ${
                selectedOption === 'PAID'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              <span>
                {selectedOption === 'PAID' ? 'Confirm Payment Received' : 'Confirm Not Paid (Keep Pending)'}
              </span>
              <CornerDownLeft className="w-4 h-4 opacity-80" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
