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

export const ManagerCounter: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restaurantId = user?.restaurants?.[0];

  const [cartItems, setCartItems] = useState<SelectedCounterItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Menu for Counter Order Entry
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['managerCounterMenu', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/categories`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  const categories = menuData?.data || [];

  const addItemToCart = (item: any) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.itemId === item._id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          itemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.itemId !== itemId));
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.itemId === itemId ? { ...i, quantity: qty } : i))
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNote('');
  };

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          selectedAddOns: [],
          specialInstructions: item.specialInstructions || '',
        })),
      };

      const res = await apiClient.post(`/restaurants/${restaurantId}/orders/counter`, payload);

      if (res.data.success) {
        toast(`Counter Order #${res.data.data.orderNumber} placed & marked PAID!`, 'success');
        clearCart();
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
      }
    } catch (err: any) {
      console.error(err);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Counter POS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Rapid walk-in order creation for staff & managers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Auto-Settled</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Menu Item Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search items for counter entry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {categories.map((cat: any) => {
              const items = (cat.menuItems || []).filter((item: any) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (items.length === 0) return null;

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
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                            <span className="text-xs font-mono font-bold text-slate-700">₹{(item.price / 100).toFixed(2)}</span>
                          </div>
                          {selected ? (
                            <span className="bg-amber-500 text-slate-950 font-mono text-xs px-2 py-1 rounded-xl font-bold">
                              x{selected.quantity}
                            </span>
                          ) : (
                            <span className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">
                              <Plus className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Counter Order Ticket & Punch Action */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4 flex flex-col justify-between h-full min-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>Counter Ticket</span>
              </h3>
              {cartItems.length > 0 && (
                <button onClick={clearCart} className="text-[11px] font-bold text-red-500 hover:underline">
                  Clear
                </button>
              )}
            </div>

            {/* Customer Information (Optional for Walk-in) */}
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

            {/* Selected Items List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cartItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Select menu items from the left to build order.</p>
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
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Total Amount</span>
              <span className="font-mono text-lg text-emerald-600">₹{(cartSubtotal / 100).toFixed(2)}</span>
            </div>

            <button
              onClick={handlePunchOrder}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin text-amber-500" /> : (
                <>
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>Punch Counter Order (Cash Paid)</span>
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
