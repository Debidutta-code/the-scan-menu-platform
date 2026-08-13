import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Loader,
  Receipt,
  Send,
  CreditCard,
  Smartphone,
  Banknote,
  UtensilsCrossed,
  ShoppingBag,
  X,
  User,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';

interface SelectedCounterItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

type PaymentMethod = 'CASH' | 'UPI' | 'CARD';
type OrderMode = 'DINE_IN' | 'TAKEAWAY';

const paymentMethodOptions: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { key: 'CASH', label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" strokeWidth={2} /> },
  { key: 'UPI', label: 'UPI / QR', icon: <Smartphone className="w-3.5 h-3.5" strokeWidth={2} /> },
  { key: 'CARD', label: 'Card', icon: <CreditCard className="w-3.5 h-3.5" strokeWidth={2} /> },
];

const orderModeOptions: { key: OrderMode; label: string; icon: React.ReactNode }[] = [
  { key: 'DINE_IN', label: 'Dine-In', icon: <UtensilsCrossed className="w-3.5 h-3.5" strokeWidth={2} /> },
  { key: 'TAKEAWAY', label: 'Takeaway', icon: <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} /> },
];

export const ManagerCounter: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restaurantId = activeRestaurantId;

  const [cartItems, setCartItems] = useState<SelectedCounterItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderMode, setOrderMode] = useState<OrderMode>('DINE_IN');
  const [lastOrder, setLastOrder] = useState<{ orderNumber: number; total: number; orderMode: string; paymentMethod: string } | null>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Fetch Categories for Counter Order Entry
  const { data: categoriesData, isLoading: isLoadingCats } = useQuery({
    queryKey: ['managerCounterCategories', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/categories`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Fetch Menu Items for Counter Order Entry
  const { data: menuItemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['managerCounterMenuItems', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Fetch tax rate from settings
  const { data: settingsData } = useQuery({
    queryKey: ['restaurantSettings', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  const taxRatePercent: number = settingsData?.data?.settings?.paymentConfig?.taxRatePercent ?? 0;

  const categories = categoriesData?.data || [];
  const allMenuItems = menuItemsData?.data || [];
  const isLoading = isLoadingCats || isLoadingItems;

  const addItemToCart = (item: any) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.itemId === item._id);
      if (existing) {
        return prev.map((i) => (i.itemId === item._id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { itemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.itemId !== itemId));
    } else {
      setCartItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, quantity: qty } : i)));
    }
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNote('');
    setShowNoteInput(false);
  };

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = Math.round((cartSubtotal * taxRatePercent) / 100);
  const grandTotal = cartSubtotal + taxAmount;
  const totalItemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handlePunchOrder = async () => {
    if (cartItems.length === 0) {
      toast('Please add at least one menu item', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        paymentStatus: 'PAID',
        paymentMethod,
        orderMode,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          selectedAddOns: [],
          specialInstructions: item.specialInstructions || '',
        })),
      };

      const res = await apiClient.post(`/restaurants/${restaurantId}/orders/counter`, payload);

      if (res.data.success) {
        setLastOrder({
          orderNumber: res.data.data.orderNumber,
          total: grandTotal,
          orderMode,
          paymentMethod,
        });
        clearCart();
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', restaurantId] });
      }
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Failed to place counter order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 animate-spin text-amber-500" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans select-none">
      {/* ── TOP HEADER & MODE SELECTOR ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Receipt className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">Counter POS</h1>
            <span className="text-[11px] text-slate-500 font-medium">Quick walk-in checkout</span>
          </div>
        </div>

        {/* Order Mode Toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          {orderModeOptions.map((opt) => {
            const isActive = orderMode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setOrderMode(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{opt.icon}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SUCCESS BANNER ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lastOrder && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
              <span className="font-bold">
                Order #{lastOrder.orderNumber} created! Total: ₹{(lastOrder.total / 100).toFixed(2)} ({lastOrder.paymentMethod})
              </span>
            </div>
            <button onClick={() => setLastOrder(null)} className="text-emerald-700 hover:text-emerald-900 p-0.5">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: MENU DISH SELECTOR */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          {/* Search bar + Category pills in one line */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                <button
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                {categories.map((cat: any) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategoryFilter(cat._id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      selectedCategoryFilter === cat._id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* High Density Dishes Grid */}
          <div className="space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 custom-scrollbar">
            {allMenuItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                No menu items found. Add items under Menu Management.
              </div>
            ) : (
              (() => {
                const filteredCategories =
                  selectedCategoryFilter === 'ALL'
                    ? categories
                    : categories.filter((c: any) => c._id === selectedCategoryFilter);

                let hasAnyItems = false;

                const categoryBlocks = filteredCategories.map((cat: any) => {
                  const items = allMenuItems.filter((item: any) => {
                    const itemCatId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
                    const matchesCategory = itemCatId === cat._id;
                    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesCategory && matchesSearch && item.isAvailable;
                  });

                  if (items.length === 0) return null;
                  hasAnyItems = true;

                  return (
                    <div key={cat._id} className="space-y-2">
                      <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                        {cat.name}
                      </h3>
                      {/* Tight small boxes grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {items.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);

                          return (
                            <div
                              key={item._id}
                              onClick={() => addItemToCart(item)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-1.5 ${
                                selected
                                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                                  {item.name}
                                </h4>
                                <span className="font-mono text-[11px] font-bold text-slate-600 block mt-0.5">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                                {selected ? (
                                  <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item._id, selected.quantity - 1);
                                      }}
                                      className="hover:text-white px-0.5"
                                    >
                                      -
                                    </button>
                                    <span>{selected.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item._id, selected.quantity + 1);
                                      }}
                                      className="hover:text-white px-0.5"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">Tap to add</span>
                                )}
                                {!selected && (
                                  <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });

                // Uncategorized items fallback
                const uncategorizedItems =
                  selectedCategoryFilter === 'ALL'
                    ? allMenuItems.filter((item: any) => {
                        const itemCatId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
                        const hasCategory = categories.some((c: any) => c._id === itemCatId);
                        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                        return !hasCategory && matchesSearch && item.isAvailable;
                      })
                    : [];

                if (uncategorizedItems.length > 0) {
                  hasAnyItems = true;
                  categoryBlocks.push(
                    <div key="uncategorized" className="space-y-2">
                      <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                        Other Items
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {uncategorizedItems.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);

                          return (
                            <div
                              key={item._id}
                              onClick={() => addItemToCart(item)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-1.5 ${
                                selected
                                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                                  {item.name}
                                </h4>
                                <span className="font-mono text-[11px] font-bold text-slate-600 block mt-0.5">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                                {selected ? (
                                  <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item._id, selected.quantity - 1);
                                      }}
                                      className="hover:text-white px-0.5"
                                    >
                                      -
                                    </button>
                                    <span>{selected.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(item._id, selected.quantity + 1);
                                      }}
                                      className="hover:text-white px-0.5"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">Tap to add</span>
                                )}
                                {!selected && (
                                  <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (!hasAnyItems) {
                  return (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      No matching dishes found.
                    </div>
                  );
                }

                return categoryBlocks;
              })()
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: COUNTER TICKET SUMMARY */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 sticky top-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              Ticket ({totalItemCount})
            </h3>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="text-[11px] font-bold text-rose-600 hover:underline">
                Clear
              </button>
            )}
          </div>

          {/* Compact Customer Details */}
          <div className="space-y-1.5">
            <div className="relative">
              <User className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" strokeWidth={2} />
              <input
                type="text"
                placeholder="Walk-in Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="relative">
              <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" strokeWidth={2} />
              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {!showNoteInput ? (
              <button
                type="button"
                onClick={() => setShowNoteInput(true)}
                className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1 pt-0.5"
              >
                <MessageSquare className="w-3 h-3" strokeWidth={2} />
                + Add Note / Special Request
              </button>
            ) : (
              <div className="relative pt-0.5">
                <input
                  type="text"
                  placeholder="Kitchen Note (e.g. Less spicy)"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full bg-amber-50/60 pl-2.5 pr-6 py-1 rounded-lg border border-amber-200 text-xs text-amber-900 italic font-medium"
                />
                <button
                  onClick={() => {
                    setCustomerNote('');
                    setShowNoteInput(false);
                  }}
                  className="absolute right-2 top-2 text-amber-600"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Segmented Control */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {paymentMethodOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPaymentMethod(opt.key)}
                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition ${
                    paymentMethod === opt.key
                      ? 'bg-slate-950 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Items List */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-0.5">
            {cartItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No items added yet. Click dishes to add.
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.itemId} className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="font-bold text-slate-900 truncate leading-tight">{item.name}</h5>
                    <span className="font-mono text-[10px] text-slate-500">
                      ₹{(item.price / 100).toFixed(2)} × {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                      className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                    >
                      <Minus className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                    <span className="font-mono font-bold text-xs w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                      className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-slate-600"
                    >
                      <Plus className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Footer */}
          <div className="border-t pt-2.5 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-700">₹{(cartSubtotal / 100).toFixed(2)}</span>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({taxRatePercent}%)</span>
                  <span className="font-mono font-bold text-slate-600">₹{(taxAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1">
                <span>Total</span>
                <span className="font-mono text-base text-emerald-600 font-black">₹{(grandTotal / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePunchOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader className="w-3.5 h-3.5 animate-spin text-amber-400" strokeWidth={2} />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
                  <span>Punch Order · {paymentMethod}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerCounter;
