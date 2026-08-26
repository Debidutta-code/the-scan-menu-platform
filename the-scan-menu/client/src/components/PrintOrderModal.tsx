import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  ChefHat,
  Receipt,
  Layers,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  PrintOrderData,
  RestaurantPrintInfo,
  PaperWidth,
  TicketPrintType,
  printOrderTicket,
  generateKOTHtml,
  generateCounterBillHtml,
  getTableString,
} from '../utils/printReceipt';

interface PrintOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintOrderData | null;
  restaurantInfo?: RestaurantPrintInfo;
}

export const PrintOrderModal: React.FC<PrintOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  restaurantInfo = {},
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<TicketPrintType>('CUSTOMER');

  // Resolved paper width directly from outlet printer settings
  const resolvedPaperWidth: PaperWidth =
    restaurantInfo.paperWidth ||
    restaurantInfo.printerConfig?.paperWidth ||
    (restaurantInfo.settings as any)?.printerConfig?.paperWidth ||
    '80mm';

  const handlePrint = useCallback((type: TicketPrintType) => {
    if (!order) return;
    printOrderTicket(order, restaurantInfo, type, resolvedPaperWidth);
    onClose();
  }, [order, restaurantInfo, resolvedPaperWidth, onClose]);

  // Keyboard shortcut listener: 1: Customer, 2: KOT, 3: Counter, 4/Enter: Both, Esc: Close
  useEffect(() => {
    if (!isOpen || !order) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '1') {
        e.preventDefault();
        handlePrint('CUSTOMER');
      } else if (e.key === '2') {
        e.preventDefault();
        handlePrint('KITCHEN');
      } else if (e.key === '3') {
        e.preventDefault();
        handlePrint('COUNTER');
      } else if (e.key === '4' || (e.key === 'Enter' && !showPreview)) {
        e.preventDefault();
        handlePrint('BOTH');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, order, showPreview, handlePrint, onClose]);

  if (!isOpen || !order) return null;

  const tableLabel = getTableString(order);
  const isPaid = order.paymentStatus === 'PAID';
  const rawTotal = order.total ?? 0;
  const numInRupees =
    rawTotal > 100 && Number.isInteger(rawTotal)
      ? rawTotal / 100
      : rawTotal;
  const totalFormatted = numInRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Printer className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-xl text-slate-950 leading-tight">
                    Order #{order.orderNumber}
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {resolvedPaperWidth}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {order.orderMode || 'Dine-In'} • {tableLabel} {order.customerName ? `• ${order.customerName}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Quick Order Highlights */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-100/60 border-b border-slate-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium font-mono">
                {order.items?.length || 0} items
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isPaid ? '✓ Paid' : 'Payment Due (UPI QR on Bill)'}
              </span>
            </div>
            <div className="font-mono text-sm font-black text-slate-900">
              ₹{totalFormatted}
            </div>
          </div>

          {/* Body: Action Buttons Grid */}
          <div className="p-4 sm:p-5 space-y-3.5 max-h-[78vh] overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Bill (Primary) */}
              <button
                type="button"
                onClick={() => handlePrint('CUSTOMER')}
                className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/70 hover:bg-blue-100 hover:border-blue-400 text-left transition flex flex-col justify-between group active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Receipt className="w-4.5 h-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-200/80 text-blue-900">
                    Press [1]
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Customer Bill</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    {isPaid ? 'Paid Tax Invoice' : 'Bill for payment + Dynamic UPI QR'}
                  </p>
                </div>
              </button>

              {/* Kitchen KOT */}
              <button
                type="button"
                onClick={() => handlePrint('KITCHEN')}
                className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400 text-left transition flex flex-col justify-between group active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <ChefHat className="w-4.5 h-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
                    Press [2]
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Kitchen KOT</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    High-contrast food prep slip (No logo)
                  </p>
                </div>
              </button>

              {/* Counter Audit Copy */}
              <button
                type="button"
                onClick={() => handlePrint('COUNTER')}
                className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 hover:border-emerald-400 text-left transition flex flex-col justify-between group active:scale-[0.98] shadow-2xs cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <FileText className="w-4.5 h-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                    Press [3]
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Counter Copy</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    Cashier audit slip with signature line
                  </p>
                </div>
              </button>

              {/* Both (1-Click) */}
              <button
                type="button"
                onClick={() => handlePrint('BOTH')}
                className="p-4 rounded-2xl border-2 border-slate-900 bg-slate-950 hover:bg-slate-900 text-white text-left transition flex flex-col justify-between group active:scale-[0.98] shadow-sm cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shadow-xs">
                    <Layers className="w-4.5 h-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                    Enter ↵
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Print Both</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                    Kitchen KOT + Counter Bill in sequence
                  </p>
                </div>
              </button>
            </div>

            {/* Collapsible Thermal Preview (Optional inspection) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-500 hover:text-slate-800 py-1.5 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide Thermal Preview' : 'Show Thermal Ticket Preview'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {resolvedPaperWidth} template
                </span>
              </button>

              {showPreview && (
                <div className="mt-3 space-y-2">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                    {(['CUSTOMER', 'KITCHEN', 'COUNTER', 'BOTH'] as TicketPrintType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPreviewTab(t)}
                        className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                          previewTab === t
                            ? 'bg-white text-slate-950 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t === 'CUSTOMER' ? 'Customer Bill' : t === 'KITCHEN' ? 'KOT' : t === 'COUNTER' ? 'Counter' : 'Both'}
                      </button>
                    ))}
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto flex justify-center max-h-[220px] border border-slate-800">
                    <div
                      className="bg-white rounded-lg p-3 text-black font-mono text-xs shadow-xl"
                      style={{
                        width: resolvedPaperWidth === '58mm' ? '210px' : resolvedPaperWidth === '80mm' ? '280px' : '100%',
                      }}
                    >
                      {previewTab === 'CUSTOMER' ? (
                        <div dangerouslySetInnerHTML={{ __html: generateCounterBillHtml(order, restaurantInfo, resolvedPaperWidth, false) }} />
                      ) : previewTab === 'KITCHEN' ? (
                        <div dangerouslySetInnerHTML={{ __html: generateKOTHtml(order, restaurantInfo, resolvedPaperWidth) }} />
                      ) : previewTab === 'COUNTER' ? (
                        <div dangerouslySetInnerHTML={{ __html: generateCounterBillHtml(order, restaurantInfo, resolvedPaperWidth, true) }} />
                      ) : (
                        <div className="space-y-4">
                          <div dangerouslySetInnerHTML={{ __html: generateKOTHtml(order, restaurantInfo, resolvedPaperWidth) }} />
                          <div className="border-t-2 border-dashed border-slate-300 my-3 pt-2 text-center text-[10px] text-slate-400 font-sans">
                            ✂️ Paper Cut / Page Break
                          </div>
                          <div dangerouslySetInnerHTML={{ __html: generateCounterBillHtml(order, restaurantInfo, resolvedPaperWidth, true) }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
            >
              Cancel (Esc)
            </button>

            <button
              onClick={() => handlePrint('CUSTOMER')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
            >
              <Receipt className="w-4 h-4" strokeWidth={2} />
              <span>Print Customer Bill</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
