import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  { key: 'CASH', label: 'Cash', icon: <Banknote className="w-4 h-4" strokeWidth={1.75} /> },
  { key: 'UPI', label: 'UPI', icon: <Smartphone className="w-4 h-4" strokeWidth={1.75} /> },
  { key: 'CARD', label: 'Card', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} /> },
];

const orderModeOptions: { key: OrderMode; label: string; icon: React.ReactNode }[] = [
  { key: 'DINE_IN', label: 'Dine-In', icon: <UtensilsCrossed className="w-4 h-4" strokeWidth={1.75} /> },
  { key: 'TAKEAWAY', label: 'Takeaway', icon: <ShoppingBag className="w-4 h-4" strokeWidth={1.75} /> },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderMode, setOrderMode] = useState<OrderMode>('DINE_IN');
  const [lastOrder, setLastOrder] = useState<{ orderNumber: number; total: number } | null>(null);

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
        return prev.map((i) => i.itemId === item._id ? { ...i, quantity: i.quantity + 1 } : i);
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
  };

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = Math.round((cartSubtotal * taxRatePercent) / 100);
  const grandTotal = cartSubtotal + taxAmount;

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
        setLastOrder({ orderNumber: res.data.data.orderNumber, total: grandTotal });
        clearCart();
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
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
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Counter POS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Rapid walk-in order creation for staff & managers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Order Mode selector */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {orderModeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setOrderMode(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  orderMode === opt.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Success receipt banner */}
      {lastOrder && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Order #{lastOrder.orderNumber} Punched!</p>
              <p className="text-xs text-emerald-700 font-mono">
                ₹{(lastOrder.total / 100).toFixed(2)} · {paymentMethod} · {orderMode.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button onClick={() => setLastOrder(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Menu Item Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search items for counter entry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategoryFilter(cat._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategoryFilter === cat._id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {allMenuItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-150 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No menu items found</p>
                <p className="text-xs text-slate-400">Add categories and menu items in Menu Management to start punching orders.</p>
              </div>
            ) : (
              (() => {
                const filteredCategories = selectedCategoryFilter === 'ALL'
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
                      <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase font-mono">{cat.name}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);
                          return (
                            <div
                              key={item._id}
                              onClick={() => addItemToCart(item)}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                                selected ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-white border-slate-150 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>
                              {selected ? (
                                <span className="shrink-0 bg-amber-500 text-slate-950 font-mono text-xs px-2 py-1 rounded-xl font-bold">
                                  x{selected.quantity}
                                </span>
                              ) : (
                                <span className="shrink-0 h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                                  <Plus className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });

                // Also check items without a category if "ALL" is selected
                const uncategorizedItems = selectedCategoryFilter === 'ALL'
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
                      <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase font-mono">Other Items</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {uncategorizedItems.map((item: any) => {
                          const selected = cartItems.find((i) => i.itemId === item._id);
                          return (
                            <div
                              key={item._id}
                              onClick={() => addItemToCart(item)}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                                selected ? 'bg-amber-50/70 border-amber-300 shadow-sm' : 'bg-white border-slate-150 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  ₹{(item.price / 100).toFixed(2)}
                                </span>
                              </div>
                              {selected ? (
                                <span className="shrink-0 bg-amber-500 text-slate-950 font-mono text-xs px-2 py-1 rounded-xl font-bold">
                                  x{selected.quantity}
                                </span>
                              ) : (
                                <span className="shrink-0 h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                                  <Plus className="w-4 h-4" />
                                </span>
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
                    <div className="p-8 text-center bg-white rounded-3xl border border-slate-150 space-y-2">
                      <Search className="w-6 h-6 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No matching items found</p>
                      <p className="text-[11px] text-slate-400">Try adjusting your search query or category filter.</p>
                    </div>
                  );
                }

                return categoryBlocks;
              })()
            )}
          </div>
        </div>

        {/* Right Col: Counter Order Ticket & Punch Action */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4 flex flex-col justify-between h-full min-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Counter Ticket
              </h3>
              {cartItems.length > 0 && (
                <button onClick={clearCart} className="text-[11px] font-bold text-red-500 hover:underline">
                  Clear
                </button>
              )}
            </div>

            {/* Customer Information */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Walk-in Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Payment Method</p>
              <div className="flex gap-2">
                {paymentMethodOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPaymentMethod(opt.key)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition ${
                      paymentMethod === opt.key
                        ? 'bg-slate-950 text-white border-transparent'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">Select menu items from the left.</p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.itemId} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-slate-900">{item.name}</h5>
                      <span className="font-mono text-slate-500">₹{(item.price / 100).toFixed(2)} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.itemId, item.quantity - 1)} className="p-1 hover:bg-slate-200 rounded">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.itemId, item.quantity + 1)} className="p-1 hover:bg-slate-200 rounded">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t pt-4 space-y-2">
            {/* Subtotal + Tax + Total breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">₹{(cartSubtotal / 100).toFixed(2)}</span>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({taxRatePercent}%)</span>
                  <span className="font-mono">₹{(taxAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-1.5">
                <span>Total Amount</span>
                <span className="font-mono text-base text-emerald-600">₹{(grandTotal / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePunchOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
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
