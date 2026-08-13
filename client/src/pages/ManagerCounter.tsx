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
  Trash2,
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

const paymentMethodOptions: { key: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'CASH', label: 'Cash', icon: <Banknote className="w-4 h-4" strokeWidth={1.75} />, desc: 'Physical cash' },
  { key: 'UPI', label: 'UPI / QR', icon: <Smartphone className="w-4 h-4" strokeWidth={1.75} />, desc: 'GPay / PhonePe / Paytm' },
  { key: 'CARD', label: 'Card / POS', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} />, desc: 'Debit & Credit cards' },
];

const orderModeOptions: { key: OrderMode; label: string; icon: React.ReactNode }[] = [
  { key: 'DINE_IN', label: 'Dine-In', icon: <UtensilsCrossed className="w-4 h-4" strokeWidth={1.75} /> },
  { key: 'TAKEAWAY', label: 'Takeaway', icon: <ShoppingBag className="w-4 h-4" strokeWidth={1.75} /> },
];

const QUICK_GUEST_TYPES = ['Walk-in', 'Staff', 'VIP', 'Delivery Agent'];

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
      toast('Please add at least one menu item to the ticket', 'error');
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
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader className="w-9 h-9 animate-spin text-amber-500" strokeWidth={2} />
        <span className="text-xs font-semibold text-slate-500">Loading Counter POS Menu...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* ── TOP HEADER & MODE SELECTOR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
              <Receipt className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">Counter POS</h1>
              <p className="text-xs text-slate-500 font-medium">Fast-checkout &amp; direct order entry panel</p>
            </div>
          </div>
        </div>

        {/* Order Mode Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline-block font-mono">
            Order Type
          </span>
          <div className="flex gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
            {orderModeOptions.map((opt) => {
              const isActive = orderMode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setOrderMode(opt.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-md scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SUCCESS BANNER FOR LAST ORDER ────────────────────────────────────── */}
      <AnimatePresence>
        {lastOrder && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-950 shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-950 flex items-center gap-2">
                  Order #{lastOrder.orderNumber} Punched Successfully!
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-bold uppercase">
                    {lastOrder.orderMode.replace('_', ' ')}
                  </span>
                </p>
                <p className="text-xs text-emerald-800 font-mono mt-0.5 font-medium">
                  Total: ₹{(lastOrder.total / 100).toFixed(2)} · Paid via {lastOrder.paymentMethod}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLastOrder(null)}
                className="p-2 rounded-xl hover:bg-emerald-200/50 text-emerald-700 transition"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: MENU ITEM SELECTOR (7 or 8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search dishes, drinks, or items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-11 pr-10 py-3 rounded-2xl border border-slate-200/90 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Category Filter Horizontal Scroll */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Categories ({allMenuItems.length})
              </button>
              {categories.map((cat: any) => {
                const count = allMenuItems.filter((i: any) => {
                  const itemCatId = typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId;
                  return itemCatId === cat._id;
                }).length;

                return (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategoryFilter(cat._id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      selectedCategoryFilter === cat._id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedCategoryFilter === cat._id ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Menu Items Grid Container */}
          <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-1.5 custom-scrollbar">
            {allMenuItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <UtensilsCrossed className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-slate-800">No menu items found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Go to Menu Management to add categories and dishes before punching counter orders.
                </p>
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
                    <div key={cat._id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase font-mono">
                          {cat.name}
                        </h3>
                        <div className="h-px flex-1 bg-slate-200/80" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {items.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);

                          return (
                            <div
                              key={item._id}
                              className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                                selected
                                  ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                    {item.name}
                                  </h4>
                                </div>
                                <span className="font-mono text-xs font-black text-slate-900 block">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>

                              {/* Action controls */}
                              {selected ? (
                                <div className="flex items-center justify-between bg-amber-500 text-slate-950 p-1 rounded-xl font-mono text-xs font-bold">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(item._id, selected.quantity - 1);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-amber-600/40 hover:bg-amber-600/60 flex items-center justify-center transition active:scale-95 text-slate-950"
                                  >
                                    <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </button>
                                  <span className="px-2 font-black text-xs">{selected.quantity}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateQuantity(item._id, selected.quantity + 1);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-amber-600/40 hover:bg-amber-600/60 flex items-center justify-center transition active:scale-95 text-slate-950"
                                  >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addItemToCart(item)}
                                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />
                                  <span>Add to Ticket</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });

                // Also check items without a category if "ALL" is selected
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
                    <div key="uncategorized" className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase font-mono">
                          Other Items
                        </h3>
                        <div className="h-px flex-1 bg-slate-200/80" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {uncategorizedItems.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);

                          return (
                            <div
                              key={item._id}
                              className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                                selected
                                  ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-400/20'
                                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                              }`}
                            >
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                  {item.name}
                                </h4>
                                <span className="font-mono text-xs font-black text-slate-900 block">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>

                              {selected ? (
                                <div className="flex items-center justify-between bg-amber-500 text-slate-950 p-1 rounded-xl font-mono text-xs font-bold">
                                  <button
                                    onClick={() => updateQuantity(item._id, selected.quantity - 1)}
                                    className="w-7 h-7 rounded-lg bg-amber-600/40 hover:bg-amber-600/60 flex items-center justify-center transition active:scale-95 text-slate-950"
                                  >
                                    <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </button>
                                  <span className="px-2 font-black text-xs">{selected.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item._id, selected.quantity + 1)}
                                    className="w-7 h-7 rounded-lg bg-amber-600/40 hover:bg-amber-600/60 flex items-center justify-center transition active:scale-95 text-slate-950"
                                  >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addItemToCart(item)}
                                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                                >
                                  <Plus className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.5} />
                                  <span>Add to Ticket</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (!hasAnyItems) {
                  return (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
                      <Search className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No matching dishes found</p>
                      <p className="text-[11px] text-slate-400">Clear search or choose a different category filter.</p>
                    </div>
                  );
                }

                return categoryBlocks;
              })()
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: COUNTER ORDER TICKET & PUNCH ACTION (5 or 4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-5 flex flex-col justify-between sticky top-6">
          <div className="space-y-4">
            {/* Ticket Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-black">
                  {totalItemCount}
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display tracking-tight">Counter Ticket</h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Clear Ticket
                </button>
              )}
            </div>

            {/* Quick Guest Name Fill Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                Customer Details
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {QUICK_GUEST_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setCustomerName(type)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                      customerName === type
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Inputs */}
            <div className="space-y-2">
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Customer Name (Default: Walk-in Customer)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition"
                />
              </div>

              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" strokeWidth={2} />
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition"
                />
              </div>

              {/* Special Note Toggle */}
              {!showNoteInput ? (
                <button
                  type="button"
                  onClick={() => setShowNoteInput(true)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 pt-0.5"
                >
                  <MessageSquare className="w-3 h-3" strokeWidth={2} />
                  + Add Kitchen Instructions
                </button>
              ) : (
                <div className="relative pt-1">
                  <input
                    type="text"
                    placeholder="Kitchen Note (e.g. Less spicy, Extra ketchup)"
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-amber-50/70 pl-3 pr-8 py-2 rounded-xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/80 italic text-amber-900"
                  />
                  <button
                    onClick={() => {
                      setCustomerNote('');
                      setShowNoteInput(false);
                    }}
                    className="absolute right-2.5 top-3 text-amber-600 hover:text-amber-800"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method Tabs */}
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                Payment Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethodOptions.map((opt) => {
                  const isSelected = paymentMethod === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setPaymentMethod(opt.key)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-400/30'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className={isSelected ? 'text-amber-400' : 'text-slate-500'}>{opt.icon}</span>
                      <span className="text-[11px] font-bold mt-1">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Items List */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
                Ticket Items ({cartItems.length})
              </span>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto mb-1" strokeWidth={1.5} />
                    <p className="text-xs font-bold text-slate-500">Ticket is currently empty</p>
                    <p className="text-[10px] text-slate-400">Click dishes from the menu to add them</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="p-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-900 truncate">{item.name}</h5>
                        <span className="font-mono text-[11px] text-slate-500">
                          ₹{(item.price / 100).toFixed(2)} × {item.quantity} ={' '}
                          <strong className="text-slate-800 font-bold">
                            ₹{((item.price * item.quantity) / 100).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                          className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                        >
                          <Minus className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                        <span className="font-mono font-black text-xs w-4 text-center text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                          className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                        >
                          <Plus className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Footer & Punch CTA */}
          <div className="border-t border-slate-100 pt-4 space-y-3 mt-4">
            {/* Bill breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-slate-700">₹{(cartSubtotal / 100).toFixed(2)}</span>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST / Tax ({taxRatePercent}%)</span>
                  <span className="font-mono font-semibold text-slate-600">₹{(taxAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end border-t border-dashed border-slate-200 pt-2.5">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 font-mono">
                    ✓ Paid via {paymentMethod}
                  </span>
                </div>
                <span className="font-mono text-2xl font-black text-slate-950">
                  ₹{(grandTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Punch Button */}
            <button
              onClick={handlePunchOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-amber-400" strokeWidth={2} />
                  <span>Punching Order...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" strokeWidth={2} />
                  <span>Punch Order · ₹{(grandTotal / 100).toFixed(2)}</span>
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
