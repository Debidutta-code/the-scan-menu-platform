import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, X, ChevronRight } from 'lucide-react';
import { ViewBillSheetProps } from '../types';
import { formatPrice } from '../utils';

export const ViewBillSheet: React.FC<ViewBillSheetProps> = ({
  isOpen,
  sessionDetailsData,
  currency,
  tableDisplayName,
  isTaxBreakdownExpanded,
  onToggleTaxBreakdown,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && sessionDetailsData?.data?.session && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl font-sans overflow-hidden"
          >
            {/* Drag handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3" />
            <div className="px-6 pb-8 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  <h3 className="font-display text-2xl font-bold text-slate-900">
                    Detailed Bill
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>

              {/* Table & Orders Summary */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                  <span>Dining Station</span>
                  <span className="font-bold text-slate-900">{tableDisplayName}</span>
                </div>

                {/* All items across orders */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 border-y border-slate-100 py-3">
                  {(sessionDetailsData.data.orders || []).flatMap((o: any) => o.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{item.nameSnapshot}</span>
                        <span className="text-slate-400 font-mono ml-1.5">x{item.quantity}</span>
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            + {item.selectedAddOns.map((x: any) => {
                              const delta = x.priceDelta ?? x.price ?? 0;
                              return `${x.name}${delta > 0 ? ` (${formatPrice(delta, currency)})` : ''}`;
                            }).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatPrice(item.unitPriceSnapshot * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Secondary Collapsible Tax Breakdown */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPrice(sessionDetailsData.data.session.subtotal || sessionDetailsData.data.session.total, currency)}</span>
                  </div>

                  {/* Collapsible Tax Section */}
                  <div className="border border-slate-150 rounded-xl p-2.5 bg-slate-50 space-y-2">
                    <button
                      onClick={onToggleTaxBreakdown}
                      className="w-full flex justify-between items-center text-slate-600 font-bold text-xs"
                    >
                      <span className="flex items-center gap-1">
                        <span>Taxes & Charges</span>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTaxBreakdownExpanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                      </span>
                      <span className="font-mono">{formatPrice(sessionDetailsData.data.session.tax || 0, currency)}</span>
                    </button>

                    <AnimatePresence>
                      {isTaxBreakdownExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pt-2 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-500"
                        >
                          <div className="flex justify-between">
                            <span>CGST (2.5%)</span>
                            <span className="font-mono">{formatPrice((sessionDetailsData.data.session.tax || 0) / 2, currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST (2.5%)</span>
                            <span className="font-mono">{formatPrice((sessionDetailsData.data.session.tax || 0) / 2, currency)}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Loyalty Discount line item if points were redeemed on orders in this session */}
                  {(() => {
                    const totalLoyaltyDiscount = (sessionDetailsData.data.orders || []).reduce((sum: number, o: any) => sum + (o.loyaltyDiscount || 0), 0);
                    const totalPointsRedeemed = (sessionDetailsData.data.orders || []).reduce((sum: number, o: any) => sum + (o.loyaltyPointsRedeemed || 0), 0);
                    if (totalLoyaltyDiscount <= 0) return null;
                    return (
                      <div className="flex justify-between text-emerald-700 font-bold px-2 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>Loyalty Discount</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-mono font-black">
                            -{totalPointsRedeemed} pts
                          </span>
                        </span>
                        <span className="font-mono text-emerald-700 font-black">-{formatPrice(totalLoyaltyDiscount, currency)}</span>
                      </div>
                    );
                  })()}

                  {/* Round Off line item if non-zero */}
                  {Boolean(sessionDetailsData.data.session.roundOff && sessionDetailsData.data.session.roundOff !== 0) && (
                    <div className="flex justify-between text-slate-600 font-medium">
                      <span>Round Off</span>
                      <span className="font-mono">
                        {sessionDetailsData.data.session.roundOff > 0 ? '+' : '-'}
                        {formatPrice(Math.abs(sessionDetailsData.data.session.roundOff), currency)}
                      </span>
                    </div>
                  )}

                  {/* Total spent so far */}
                  <div className="flex justify-between items-center text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                    <span>Table Total So Far</span>
                    <span className="text-xl font-mono text-emerald-600">
                      {formatPrice(sessionDetailsData.data.session.total, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Close Bill
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
