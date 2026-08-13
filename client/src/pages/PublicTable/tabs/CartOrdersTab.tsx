import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Trash2,
  Minus,
  Plus,
  Loader,
  Clock,
  ChevronRight,
  ChefHat,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { CartOrdersTabProps } from '../types';
import { formatPrice } from '../utils';

export const CartOrdersTab: React.FC<CartOrdersTabProps> = ({
  cartOrdersSubTab,
  cartItems,
  currency,
  activeOrderCount,
  activeSessionId,
  isSessionLoading,
  sessionDetailsData,
  isCustomerAuthenticated,
  customer,
  isPlacingOrder,
  isRecoveringOrder,
  failedOrderDetails,
  customerNote,
  cartSubtotal,
  cartTaxBreakdown,
  cartGrandTotal,
  expandedRounds,
  tableDisplayName,
  onSubTabChange,
  onUpdateQuantity,
  onCustomerNoteChange,
  onCheckoutTrigger,
  onClearCart,
  onToggleRound,
  onViewBill,
  onClearSession,
  onBrowseMenu,
  onSwitchCustomer,
}) => {
  return (
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
          onClick={() => onSubTabChange('cart')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
            cartOrdersSubTab === 'cart'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Basket Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
        <button
          onClick={() => onSubTabChange('orders')}
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
                onClick={onBrowseMenu}
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
                  onClick={onClearCart}
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
                            onClick={() => onUpdateQuantity(item.itemId, item.selectedAddOns, item.specialInstructions || '', -1)}
                            className="p-1 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                          <span className="px-2 font-bold text-slate-900 text-[11px] font-mono w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.itemId, item.selectedAddOns, item.specialInstructions || '', 1)}
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
                    onChange={(e) => onCustomerNoteChange(e.target.value)}
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
                  <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 mt-1 text-xs">
                    <div className="flex justify-between text-slate-500 font-medium px-1">
                      <span>Already Spent</span>
                      <span className="font-mono text-slate-700">{formatPrice(sessionDetailsData.data.session.total, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-950 font-bold bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80 shadow-xs">
                      <span className="flex items-center gap-1.5 font-sans">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>This Order</span>
                      </span>
                      <span className="font-mono font-black text-sm">{formatPrice(cartGrandTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-900 font-bold text-sm mt-0.5 border-t border-slate-200 pt-2.5 px-1">
                      <span>Total After This Order</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{formatPrice(sessionDetailsData.data.session.total + cartGrandTotal, currency)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-1 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
                    <span className="text-amber-950 font-bold text-sm">This Order</span>
                    <span className="text-lg font-black text-amber-950 font-mono">{formatPrice(cartGrandTotal, currency)}</span>
                  </div>
                )}

                {/* Ordering Identity Display for returning diners */}
                {isCustomerAuthenticated && customer ? (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                        {customer.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Ordering as <span className="text-amber-900 font-extrabold">{customer.name}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">{customer.phone}</p>
                      </div>
                    </div>
                    <button
                      onClick={onSwitchCustomer}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded-xl shrink-0 transition hover:shadow-xs"
                    >
                      Switch Diner
                    </button>
                  </div>
                ) : null}

                {/* Recovering Order Ambient Notice */}
                {isRecoveringOrder && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900 animate-pulse">
                    <Loader className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    <span>Verifying your order status with the restaurant... Please don't submit again.</span>
                  </div>
                )}

                <button
                  onClick={onCheckoutTrigger}
                  disabled={cartItems.length === 0 || isPlacingOrder || isRecoveringOrder}
                  className="w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-md active:scale-[0.99] uppercase flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Placing your order...</span>
                    </>
                  ) : isCustomerAuthenticated && customer ? (
                    <span>Place Order as {customer.name} • {formatPrice(cartGrandTotal, currency)}</span>
                  ) : (
                    <span>Proceed to Checkout • {formatPrice(cartGrandTotal, currency)}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub Tab: ORDERS */}
      {cartOrdersSubTab === 'orders' && (
        <div className="space-y-6 pb-24">
          {!activeSessionId ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 space-y-4">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Clock className="w-6 h-6 animate-pulse" strokeWidth={1.75} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">No orders placed yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Your placed kitchen orders will appear here with live preparation updates!
                </p>
              </div>
              <button
                onClick={onBrowseMenu}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[11px] rounded-xl transition shadow-sm"
              >
                Browse Menu to Order
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
                {/* Header Card */}
                <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-display text-2xl font-bold text-slate-900 leading-snug">
                        Your Orders
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {tableDisplayName} • {orders.length} order{orders.length > 1 ? 's' : ''} placed
                      </p>
                    </div>
                    <button
                      onClick={onClearSession}
                      className="text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition border border-slate-200/60"
                    >
                      Start New Session
                    </button>
                  </div>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                  {orders.map((order: any) => {
                    const isExpanded = expandedRounds[order._id] ?? true;
                    const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const sortedItems = [...order.items].sort((a, b) => (a.prepTimeMinutesSnapshot || 10) - (b.prepTimeMinutesSnapshot || 10));

                    // Calculate progress status step
                    let activeStep = 1; // 1: Placed, 2: Preparing, 3: Served
                    const isCancelled = order.status === 'CANCELLED';
                    if (!isCancelled) {
                      const nonCancelledItems = sortedItems.filter((i: any) => i.itemStatus !== 'CANCELLED');
                      const allServed = nonCancelledItems.length > 0 && nonCancelledItems.every((i: any) => i.itemStatus === 'SERVED');
                      const anyPreparingOrReady = nonCancelledItems.some((i: any) => i.itemStatus === 'PREPARING' || i.itemStatus === 'READY');

                      if (order.status === 'SERVED' || allServed) {
                        activeStep = 3;
                      } else if (order.status === 'PREPARING' || order.status === 'READY' || anyPreparingOrReady) {
                        activeStep = 2;
                      } else {
                        activeStep = 1;
                      }
                    }

                    return (
                      <div key={order._id} className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden text-left">
                        {/* Card Header */}
                        <div
                          onClick={() => onToggleRound(order._id)}
                          className="p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition select-none"
                        >
                          <div>
                            <h5 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                              <span>Order {order.roundNumber}</span>
                              {order.customerName && (
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg font-sans">
                                  {order.customerName}
                                </span>
                              )}
                            </h5>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              Placed at {orderTime} • {formatPrice(order.total, currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 font-mono">
                              {sortedItems.length} item{sortedItems.length > 1 ? 's' : ''}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                          </div>
                        </div>

                        {/* Card Body */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="p-4 space-y-4"
                            >
                              {/* Inline 3-Step Progress Status Bar */}
                              {isCancelled ? (
                                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center text-xs font-bold text-rose-700">
                                  This order was cancelled
                                </div>
                              ) : (
                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5">
                                  <div className="relative flex justify-between items-center w-full px-3">
                                    {/* Background Track */}
                                    <div className="absolute left-6 right-6 top-[15px] h-1 bg-slate-200 -z-0 rounded" />
                                    
                                    {/* Progress Line */}
                                    <motion.div
                                      className="absolute left-6 top-[15px] h-1 bg-emerald-500 -z-0 rounded"
                                      initial={{ width: '0%' }}
                                      animate={{
                                        width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%',
                                      }}
                                      transition={{ duration: 0.4 }}
                                    />

                                    {/* Step 1: Placed */}
                                    <div className="flex flex-col items-center gap-1 z-10">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                                        activeStep >= 1 ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-400'
                                      }`}>
                                        <Clock className="w-4 h-4" strokeWidth={2} />
                                      </div>
                                      <span className={`text-[11px] font-bold ${activeStep === 1 ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}`}>
                                        Placed
                                      </span>
                                    </div>

                                    {/* Step 2: Preparing */}
                                    <div className="flex flex-col items-center gap-1 z-10">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                                        activeStep >= 2 ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-400'
                                      }`}>
                                        <ChefHat className={`w-4 h-4 ${activeStep === 2 ? 'animate-bounce' : ''}`} strokeWidth={2} />
                                      </div>
                                      <span className={`text-[11px] font-bold ${activeStep === 2 ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}`}>
                                        Preparing
                                      </span>
                                    </div>

                                    {/* Step 3: Served */}
                                    <div className="flex flex-col items-center gap-1 z-10">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                                        activeStep === 3 ? 'bg-emerald-500 border-emerald-400 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-400'
                                      }`}>
                                        <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                                      </div>
                                      <span className={`text-[11px] font-bold ${activeStep === 3 ? 'text-emerald-700 font-extrabold' : 'text-slate-500'}`}>
                                        Served
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Item Checklist */}
                              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                                {sortedItems.map((item: any, itemIdx: number) => {
                                  const isServed = item.itemStatus === 'SERVED';
                                  const isReady = item.itemStatus === 'READY';
                                  const isPreparing = item.itemStatus === 'PREPARING';

                                  return (
                                    <div key={itemIdx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="shrink-0">
                                          {isServed ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50/50" strokeWidth={2} />
                                          ) : isReady || isPreparing ? (
                                            <ChefHat className="w-4 h-4 text-indigo-500 animate-pulse" strokeWidth={2} />
                                          ) : (
                                            <Clock className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <h6 className={`font-bold text-slate-900 leading-tight ${isServed ? 'line-through text-slate-400 font-normal' : ''}`}>
                                            {item.nameSnapshot} <span className="font-mono text-slate-500 font-bold text-[11px]">x{item.quantity}</span>
                                          </h6>
                                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">+ {item.selectedAddOns.map((x: any) => x.name).join(', ')}</p>
                                          )}
                                        </div>
                                      </div>

                                      <span className="text-xs font-mono font-bold text-slate-700 shrink-0">
                                        {formatPrice(item.unitPriceSnapshot * item.quantity, currency)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Sticky Summary Bar for Orders Screen */}
                <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
                  <div className="max-w-md mx-auto flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block font-mono">
                        Table Total So Far
                      </span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {formatPrice(session.total, currency)}
                      </span>
                    </div>
                    <button
                      onClick={onViewBill}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-[0.98]"
                    >
                      <Receipt className="w-4 h-4" strokeWidth={2} />
                      <span>View Bill</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
};
