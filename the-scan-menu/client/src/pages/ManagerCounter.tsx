import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Loader,
  Receipt,
  CreditCard,
  Smartphone,
  Banknote,
  UtensilsCrossed,
  ShoppingBag,
  X,
  User,
  Phone,
  MessageSquare,
  Printer,
  Trash2,
  CornerDownLeft,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  History as HistoryIcon,
  ChefHat,
  FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import apiClient from '../lib/api';
import { printOrderTicket, TicketPrintType } from '../utils/printReceipt';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { MenuBadge } from './PublicTable/components/MenuBadge';

interface SelectedCounterItem {
  itemId: string;
  baseItemId?: string;
  variantName?: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

type PaymentMethod = 'UPI' | 'CASH' | 'CARD';
type OrderMode = 'DINE_IN' | 'TAKEAWAY';

const paymentMethodOptions: { key: PaymentMethod; label: string; sub: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    key: 'UPI',
    label: 'UPI / QR Code',
    sub: 'GPay, PhonePe, Paytm, BHIM',
    shortcut: '1',
    icon: <Smartphone className="w-5 h-5 text-indigo-500" strokeWidth={2} />,
  },
  {
    key: 'CASH',
    label: 'Cash Payment',
    sub: 'Physical cash at counter',
    shortcut: '2',
    icon: <Banknote className="w-5 h-5 text-emerald-500" strokeWidth={2} />,
  },
  {
    key: 'CARD',
    label: 'Credit / Debit Card',
    sub: 'POS card swipe or tap',
    shortcut: '3',
    icon: <CreditCard className="w-5 h-5 text-amber-500" strokeWidth={2} />,
  },
];

const orderModeOptions: { key: OrderMode; label: string; icon: React.ReactNode }[] = [
  { key: 'DINE_IN', label: 'Dine-In', icon: <UtensilsCrossed className="w-4 h-4" strokeWidth={2} /> },
  { key: 'TAKEAWAY', label: 'Takeaway', icon: <ShoppingBag className="w-4 h-4" strokeWidth={2} /> },
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [orderMode, setOrderMode] = useState<OrderMode>('DINE_IN');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Checkout Wizard Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'CUSTOMER_INFO' | 'PAYMENT_CONFIRM'>('CUSTOMER_INFO');
  const [selectedPrintTarget, setSelectedPrintTarget] = useState<TicketPrintType>('BOTH');

  // Recent Orders Drawer & Quick Reprint Modal State
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [reprintModalOrder, setReprintModalOrder] = useState<any | null>(null);

  // Item variant selection modal state
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<any | null>(null);

  // Input refs for automatic keyboard focus
  const customerNameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Socket.IO Inventory Sync
  const token = localStorage.getItem('accessToken');
  const { socket } = useSocket(token);

  useEffect(() => {
    if (!socket || !restaurantId) return;

    const handleInventoryUpdated = (payload: any) => {
      queryClient.setQueryData(['managerCounterMenuItems', restaurantId], (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((item: any) => {
            if (item._id === payload.itemId) {
              return {
                ...item,
                isAvailable: payload.data.isAvailable !== undefined ? payload.data.isAvailable : item.isAvailable,
                stockQuantity: payload.data.stockQuantity !== undefined ? payload.data.stockQuantity : item.stockQuantity,
                trackStock: payload.data.trackStock !== undefined ? payload.data.trackStock : item.trackStock,
              };
            }
            return item;
          }),
        };
      });
    };

    socket.on('inventory:updated', handleInventoryUpdated);
    return () => {
      socket.off('inventory:updated', handleInventoryUpdated);
    };
  }, [socket, restaurantId, queryClient]);

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

  // Fetch Recent Orders for Quick Reprints
  const { data: recentOrdersData } = useQuery({
    queryKey: ['managerCounterRecentOrders', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/orders?limit=15`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Fetch tax rate and printer config from settings
  const { data: settingsData } = useQuery({
    queryKey: ['restaurantSettings', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Automatically sync default print behavior from outlet printer configuration
  useEffect(() => {
    const configuredTarget =
      settingsData?.data?.printerConfig?.defaultPrintTarget ||
      settingsData?.data?.settings?.printerConfig?.defaultPrintTarget;
    if (configuredTarget) {
      setSelectedPrintTarget(configuredTarget as TicketPrintType);
    }
  }, [settingsData]);

  // Global POS Keyboard Shortcut (/ to search, Escape to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const taxRatePercent: number = settingsData?.data?.settings?.paymentConfig?.taxRatePercent ?? 0;

  const categories = categoriesData?.data || [];
  const allMenuItems = menuItemsData?.data || [];
  const isLoading = isLoadingCats || isLoadingItems;

  const addItemToCart = (item: any, variant?: any) => {
    if (!item.isAvailable || (item.trackStock && item.stockQuantity <= 0)) {
      toast(`"${item.name}" is currently sold out / 86'd!`, 'error');
      return;
    }

    const targetId = variant ? `${item._id}_${variant.name}` : item._id;
    const targetName = variant ? `${item.name} (${variant.name})` : item.name;
    const targetPrice = variant ? variant.price : item.price;

    setCartItems((prev) => {
      const existing = prev.find((i) => i.itemId === targetId);
      if (existing) {
        if (item.trackStock && existing.quantity >= item.stockQuantity) {
          toast(`Only ${item.stockQuantity} portions left for "${item.name}"!`, 'error');
          return prev;
        }
        return prev.map((i) => (i.itemId === targetId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          itemId: targetId,
          baseItemId: item._id,
          variantName: variant?.name,
          name: targetName,
          price: targetPrice,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItemFromCart(itemId);
    } else {
      setCartItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, quantity: qty } : i)));
    }
  };

  const removeItemFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const clearCart = useCallback(() => {
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNote('');
  }, []);

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = Math.round((cartSubtotal * taxRatePercent) / 100);
  const grandTotal = cartSubtotal + taxAmount;
  const totalItemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  // Open Checkout Wizard Modal
  const handleOpenCheckoutModal = useCallback(() => {
    if (cartItems.length === 0) {
      toast('Please select at least one item first', 'error');
      return;
    }
    const defaultPrint = settingsData?.data?.printerConfig?.defaultPrintTarget || 'BOTH';
    setSelectedPrintTarget(defaultPrint as TicketPrintType);
    setPaymentMethod('UPI');
    setPaymentStatus('PAID');
    setCheckoutStep('CUSTOMER_INFO');
    setShowCheckoutModal(true);

    // Auto-focus customer name field
    setTimeout(() => {
      customerNameInputRef.current?.focus();
    }, 100);
  }, [cartItems.length, settingsData?.data?.printerConfig?.defaultPrintTarget, toast]);

  // Step 1 -> Step 2
  const handleProceedToPayment = useCallback(() => {
    setCheckoutStep('PAYMENT_CONFIRM');
  }, []);

  // Final Order Placement & Auto Print
  const handleConfirmAndPunchOrder = useCallback(async () => {
    if (cartItems.length === 0) {
      toast('Ticket is empty', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        paymentStatus,
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
        const createdOrder = res.data.data;
        const orderToPrint = {
          ...createdOrder,
          paymentMethod: createdOrder.paymentMethod || paymentMethod || 'UPI',
        };

        // Auto print dual tickets if selected
        if (selectedPrintTarget && (selectedPrintTarget as string) !== 'NONE') {
          try {
            printOrderTicket(orderToPrint, settingsData?.data, selectedPrintTarget);
          } catch (pErr) {
            console.error('Print trigger error:', pErr);
          }
        }

        toast(`Order #${createdOrder.orderNumber} placed & printed successfully!`, 'success');
        setShowCheckoutModal(false);
        clearCart();
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', restaurantId] });
      }
    } catch (err: any) {
      // Order placement failed -> DO NOT PRINT BILL
      toast(err.response?.data?.error?.message || 'Failed to place order. No bill printed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    cartItems,
    customerName,
    customerPhone,
    customerNote,
    paymentStatus,
    paymentMethod,
    orderMode,
    restaurantId,
    selectedPrintTarget,
    settingsData?.data,
    toast,
    clearCart,
    queryClient,
  ]);

  // Global Keyboard Navigation (Enter, Esc, Arrow keys, 1/2/3 shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Modal is OPEN
      if (showCheckoutModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCheckoutModal(false);
          return;
        }

        // STEP 1: CUSTOMER_INFO
        if (checkoutStep === 'CUSTOMER_INFO') {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleProceedToPayment();
          }
          return;
        }

        // STEP 2: PAYMENT_CONFIRM
        if (checkoutStep === 'PAYMENT_CONFIRM') {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (!isSubmitting) {
              handleConfirmAndPunchOrder();
            }
            return;
          }

          if (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
            e.preventDefault();
            setCheckoutStep('CUSTOMER_INFO');
            return;
          }

          // Arrow Key payment mode selection
          const methods: PaymentMethod[] = ['UPI', 'CASH', 'CARD'];
          const currentIndex = methods.indexOf(paymentMethod);

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % methods.length;
            setPaymentMethod(methods[nextIndex]);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + methods.length) % methods.length;
            setPaymentMethod(methods[prevIndex]);
          } else if (e.key === '1') {
            setPaymentMethod('UPI');
          } else if (e.key === '2') {
            setPaymentMethod('CASH');
          } else if (e.key === '3') {
            setPaymentMethod('CARD');
          }
          return;
        }
      }

      // Modal is CLOSED (Main Screen)
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInput) {
          e.preventDefault();
          if (cartItems.length > 0) {
            handleOpenCheckoutModal();
          } else {
            toast('Please select items from the menu first', 'error');
          }
        }
      } else if (e.key === '/' && !showCheckoutModal) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showCheckoutModal,
    checkoutStep,
    isSubmitting,
    cartItems.length,
    paymentMethod,
    handleProceedToPayment,
    handleConfirmAndPunchOrder,
    handleOpenCheckoutModal,
    toast,
  ]);

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
      <div className="flex items-center justify-between gap-4 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
            <Receipt className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none flex items-center gap-2">
              <span>Counter POS</span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Ready
              </span>
            </h1>
            <span className="text-xs text-slate-500 font-medium mt-0.5 block">
              Mouse selection & high-speed checkout wizard
            </span>
          </div>
        </div>

        {/* Header Right: Mode Toggle + Recent Orders */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRecentOrdersModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer active:scale-95"
            title="View recent orders and reprint customer bills or KOTs"
          >
            <HistoryIcon className="w-4 h-4 text-amber-600" strokeWidth={2} />
            <span className="hidden sm:inline">Recent Orders</span>
          </button>

          {/* Order Mode Toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner">
            {orderModeOptions.map((opt) => {
              const isActive = orderMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setOrderMode(opt.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: LARGE SEARCH BAR + CATEGORY PILLS + DISH CARDS */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* FULL-WIDTH POS SEARCH BAR */}
          <div className="relative group">
            <Search
              className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-amber-500 pointer-events-none"
              strokeWidth={2}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes by name or code... (Press / to search)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-12 pr-24 py-3.5 rounded-2xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-xs transition-all"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  title="Clear search (Esc)"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* TALL HORIZONTAL CATEGORY CHIPS BAR */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                All Categories ({allMenuItems.filter((i: any) => i.isAvailable).length})
              </button>
              {categories.map((cat: any) => {
                const catCount = allMenuItems.filter((item: any) => {
                  const itemCatId =
                    typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
                  return itemCatId === cat._id && item.isAvailable;
                }).length;

                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat._id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-2 ${
                      selectedCategoryFilter === cat._id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        selectedCategoryFilter === cat._id
                          ? 'bg-slate-800 text-amber-300'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {catCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* DISHES GRID */}
          <div className="space-y-4 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 custom-scrollbar">
            {allMenuItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-sm text-slate-500">
                No menu items found. Add items under Menu Management.
              </div>
            ) : (
              (() => {
                const fuse = new Fuse(allMenuItems, {
                  keys: ['name', 'description'],
                  threshold: 0.4,
                  ignoreLocation: true,
                });
                
                const searchResults = searchQuery
                  ? new Set(fuse.search(searchQuery).map((r: any) => r.item._id))
                  : null;

                const filteredCategories =
                  selectedCategoryFilter === 'ALL'
                    ? categories
                    : categories.filter((c: any) => c._id === selectedCategoryFilter);

                let hasAnyItems = false;

                const categoryBlocks = filteredCategories.map((cat: any) => {
                  const catItems = allMenuItems.filter((item: any) => {
                    const itemCatId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
                    const matchesCategory = itemCatId === cat._id;
                    const matchesSearch =
                      !searchQuery ||
                      (searchResults && searchResults.has(item._id));
                    return matchesCategory && matchesSearch && item.isAvailable;
                  });

                  if (catItems.length === 0) return null;
                  hasAnyItems = true;

                  return (
                    <div key={cat._id} className="space-y-2.5">
                      <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-2">
                        <span>{cat.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
                          {catItems.length} items
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {catItems.map((item: any) => {
                          const isPortion = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
                          const selectedPortions = cartItems.filter(i => i.baseItemId === item._id);
                          const selectedItem = !isPortion ? cartItems.find((i) => i.itemId === item._id) : undefined;
                          const isSelected = !isPortion ? !!selectedItem : selectedPortions.length > 0;
                          const totalPortionQty = selectedPortions.reduce((sum, p) => sum + p.quantity, 0);
                          const isTracked = !!item.trackStock;
                          const qty = item.stockQuantity || 0;
                          const threshold = item.lowStockThreshold || 5;
                          const isLow = isTracked && qty > 0 && qty <= threshold;
                          const isOut = !item.isAvailable || (isTracked && qty <= 0);

                          return (
                            <div
                              key={item._id}
                              onClick={() => {
                                if (isOut) return;
                                if (isPortion) {
                                  setSelectedItemForVariants(item);
                                } else {
                                  addItemToCart(item);
                                }
                              }}
                              className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 select-none active:scale-[0.98] shadow-2xs relative ${
                                isOut
                                  ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-sm cursor-pointer'
                                  : 'bg-white border-slate-200/90 hover:border-amber-300 hover:shadow-md cursor-pointer'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isOut ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                      {item.name}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {item.isCombo && (
                                      <span className="text-[8px] font-black uppercase text-amber-950 bg-amber-300 px-1.5 py-0.2 rounded shadow-2xs">
                                        COMBO
                                      </span>
                                    )}
                                    {isOut ? (
                                      <span className="text-[9px] font-mono font-black uppercase text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded shrink-0">
                                        86'D
                                      </span>
                                    ) : isLow ? (
                                      <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                                        ⚡ {qty} left
                                      </span>
                                    ) : isTracked ? (
                                      <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded shrink-0">
                                        {qty} left
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {!isPortion && (
                                  <span className="font-mono text-xs font-black text-slate-800 block">
                                    ₹{(item.price / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {isPortion ? (
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-700' : 'text-slate-500'}`}>
                                    Multiple Options
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {isSelected && totalPortionQty > 0 && (
                                      <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-mono text-[10px] flex items-center justify-center font-bold shadow-sm">
                                        {totalPortionQty}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isSelected ? 'text-amber-800 bg-amber-200 border-amber-300' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                      {isSelected ? 'EDIT' : '+ ADD'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  {isOut ? (
                                    <span className="text-[10px] font-bold text-rose-600 font-mono w-full text-center py-1">
                                      Out of Stock
                                    </span>
                                  ) : selectedItem ? (
                                    <div className="flex items-center gap-1.5 bg-amber-100/90 border border-amber-300/80 p-0.5 rounded-xl shadow-2xs w-full justify-between">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(item._id, selectedItem.quantity - 1);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center justify-center transition active:scale-95 border border-amber-200/80 shadow-2xs cursor-pointer"
                                        title="Decrease quantity"
                                      >
                                        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                      </button>
                                      <span className="font-mono font-black text-xs px-1 text-slate-900 min-w-[20px] text-center">
                                        {selectedItem.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(item._id, selectedItem.quantity + 1);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
                                        title="Increase quantity"
                                      >
                                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-[10px] font-bold text-slate-400">Click to add</span>
                                      <span className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center text-slate-600 transition shadow-2xs">
                                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });

                if (!hasAnyItems) {
                  return (
                    <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-xs text-slate-400">
                      No matching dishes found.
                    </div>
                  );
                }

                return categoryBlocks;
              })()
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ORDER DETAILS SUMMARY (NO CLUTTER) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 sticky top-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 font-mono uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-amber-500" strokeWidth={2} />
                <span>Order Summary ({totalItemCount})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {orderMode === 'DINE_IN' ? '🍽️ Dine-In Table' : '🛍️ Takeaway'}
              </span>
            </div>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Selected Items List */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p className="font-medium">No dishes added yet.</p>
                <p className="text-[11px] text-slate-400">Click any dish on the left to add to this ticket.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.itemId}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <h5 className="font-bold text-slate-900 truncate leading-tight text-xs">{item.name}</h5>
                    <span className="font-mono text-[11px] text-slate-500 font-medium block mt-0.5">
                      ₹{(item.price / 100).toFixed(2)} × {item.quantity} = ₹{((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-200 p-0.5 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      title="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="font-mono font-bold text-xs min-w-[20px] text-center text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition cursor-pointer"
                      title="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemFromCart(item.itemId)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition ml-0.5 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Footer & Financials */}
          <div className="border-t pt-3 space-y-3">
            <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({totalItemCount} items)</span>
                <span className="font-mono font-bold text-slate-800">₹{(cartSubtotal / 100).toFixed(2)}</span>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({taxRatePercent}%)</span>
                  <span className="font-mono font-bold text-slate-700">₹{(taxAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-slate-900 border-t border-slate-200/80 pt-2">
                <span className="text-sm">Payable Total</span>
                <span className="font-mono text-xl text-emerald-600 font-black">
                  ₹{(grandTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* PUNCH ORDER BUTTON (OPENS STEP 1 MODAL) */}
            <button
              type="button"
              onClick={handleOpenCheckoutModal}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-2xl transition shadow-md disabled:opacity-40 flex items-center justify-between px-5 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Punch Order</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                <span>Enter</span>
                <CornerDownLeft className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================================================
          STEP-BY-STEP CHECKOUT WIZARD MODAL
          ================================================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showCheckoutModal && (
              <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 select-none">
                <motion.div
                  initial={{ scale: 0.94, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 12 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="relative bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-slate-100 z-10 space-y-5"
                >
              {/* STEP 1: CUSTOMER DETAILS (NAME & NUMBER) */}
              {checkoutStep === 'CUSTOMER_INFO' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                        <User className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                            Step 1 of 2
                          </span>
                          <span className="text-xs text-slate-500 font-bold">
                            Total: ₹{(grandTotal / 100).toFixed(2)}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 leading-tight mt-0.5">
                          Guest Details (Optional)
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Type guest details or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">Enter ↵</kbd> directly to skip to payment.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                        <span>Customer Name</span>
                      </label>
                      <input
                        ref={customerNameInputRef}
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full h-12 bg-white px-4 rounded-xl border-2 border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mobile Number</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full h-12 bg-white px-4 rounded-xl border-2 border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span>Kitchen Special Note</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Extra spicy, no onions, pack separately"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        className="w-full h-12 bg-white px-4 rounded-xl border-2 border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckoutModal(false)}
                      className="w-1/3 py-3.5 border-2 border-slate-200 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel (Esc)
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      className="w-2/3 py-3.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Payment (Enter ↵)</span>
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PAYMENT METHOD SELECTION & FINAL DUAL PRINT */}
              {checkoutStep === 'PAYMENT_CONFIRM' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('CUSTOMER_INFO')}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
                        title="Back to Customer Info"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 uppercase">
                            Step 2 of 2
                          </span>
                          <span className="text-xs text-slate-500 font-bold">
                            {customerName ? `Guest: ${customerName}` : 'Walk-in Guest'}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 leading-tight mt-0.5">
                          Select Payment Mode
                        </h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Amount
                      </span>
                      <span className="font-mono text-lg font-black text-emerald-600">
                        ₹{(grandTotal / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* LARGE ARROW-KEY NAVIGABLE PAYMENT CARDS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                        Payment Mode (Use ← → Arrow Keys or 1,2,3)
                      </label>
                      <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                        Default: UPI
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {paymentMethodOptions.map((opt) => {
                        const isSelected = paymentMethod === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setPaymentMethod(opt.key)}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative select-none ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 ring-4 ring-amber-500/20 shadow-sm scale-[1.02]'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              {opt.icon}
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                  isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {opt.shortcut}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-slate-900 leading-snug">{opt.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PAYMENT STATUS TOGGLE */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-700">Payment Status</span>
                    <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('PAID')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          paymentStatus === 'PAID'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ✓ Marked as Paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('PENDING')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          paymentStatus === 'PENDING'
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pay Later (Pending)
                      </button>
                    </div>
                  </div>

                  {/* PRINT BEHAVIOR (DEFAULT: BOTH KOT + COUNTER BILL) */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                        <span>Print on Placement (Default: Both)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Format: {settingsData?.data?.printerConfig?.paperWidth || '80mm'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {[
                        { id: 'BOTH', label: 'Both (KOT+Bill)', icon: '🖨️' },
                        { id: 'CUSTOMER', label: 'Customer Bill', icon: '🧾' },
                        { id: 'KITCHEN', label: 'Kitchen KOT', icon: '🍳' },
                        { id: 'COUNTER', label: 'Counter Copy', icon: '📋' },
                        { id: 'NONE', label: 'No Print', icon: '🚫' },
                      ].map((opt) => {
                        const isSelected = selectedPrintTarget === opt.id;
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => setSelectedPrintTarget(opt.id as any)}
                            className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500 text-slate-950 font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium'
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px] block leading-tight">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONFIRM & PRINT BUTTON */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('CUSTOMER_INFO')}
                      disabled={isSubmitting}
                      className="w-1/3 py-3.5 border-2 border-slate-200 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAndPunchOrder}
                      disabled={isSubmitting}
                      className="w-2/3 py-3.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin text-amber-400" strokeWidth={2} />
                          <span>Placing Order & Printing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                          <span>Confirm & Print Bill (Enter ↵)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── RECENT ORDERS & QUICK REPRINT MODAL ──────────────────────────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showRecentOrdersModal && (
              <div className="fixed inset-0 z-[9990] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]"
                >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <HistoryIcon className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-slate-900 leading-tight">
                      Recent Orders &amp; Quick Reprint
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Instantly reprint Customer Bills, Kitchen KOTs, or Counter Copies
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowRecentOrdersModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Order List */}
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                {(() => {
                  const recentOrdersList: any[] = Array.isArray(recentOrdersData?.data)
                    ? recentOrdersData.data
                    : recentOrdersData?.data?.orders || [];

                  if (recentOrdersList.length === 0) {
                    return (
                      <div className="py-12 text-center text-slate-400 text-xs font-medium">
                        No recent orders found for this outlet.
                      </div>
                    );
                  }

                  return recentOrdersList.map((ord) => {
                    const numInRupees =
                      (ord.total || 0) > 100 && Number.isInteger(ord.total)
                        ? ord.total / 100
                        : ord.total || 0;
                    const totalFormatted = numInRupees.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                    const isPaid = ord.paymentStatus === 'PAID';
                    const itemsSummary = (ord.items || [])
                      .map((i: any) => `${i.quantity}x ${i.nameSnapshot || i.name || 'Item'}`)
                      .join(', ');

                    return (
                      <div
                        key={ord._id}
                        className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-amber-300 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Order Details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-black text-slate-950">
                              #{ord.orderNumber}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                              {ord.orderMode || 'COUNTER'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isPaid ? '✓ Paid' : 'Payment Due'}
                            </span>
                            {ord.customerName && (
                              <span className="text-xs text-slate-600 font-medium">
                                • Guest: {ord.customerName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-md">
                            {itemsSummary || 'No items'}
                          </p>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • Total: <strong className="text-slate-800 font-mono">₹{totalFormatted}</strong>
                          </div>
                        </div>

                        {/* Quick Reprint Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                          {/* Print Customer Bill */}
                          <button
                            type="button"
                            onClick={() => printOrderTicket(ord, settingsData?.data, 'CUSTOMER')}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                            title="Print Customer Tax Invoice / Proforma Bill with UPI QR"
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                            <span>Customer Bill</span>
                          </button>

                          {/* Print Kitchen KOT */}
                          <button
                            type="button"
                            onClick={() => printOrderTicket(ord, settingsData?.data, 'KITCHEN')}
                            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                            title="Print Kitchen Preparation Slip (No Logo)"
                          >
                            <ChefHat className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                            <span>KOT</span>
                          </button>

                          {/* Print Counter Copy */}
                          <button
                            type="button"
                            onClick={() => printOrderTicket(ord, settingsData?.data, 'COUNTER')}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                            title="Print Counter / Cashier Audit Copy"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                            <span>Counter</span>
                          </button>

                          {/* Modal Options */}
                          <button
                            type="button"
                            onClick={() => setReprintModalOrder(ord)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 cursor-pointer"
                            title="More Print Options & Live Preview"
                          >
                            <Printer className="w-4 h-4 text-slate-600" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowRecentOrdersModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── PRINT ORDER MODAL FOR REPRINTS ───────────────────────────────────── */}
      <PrintOrderModal
        isOpen={!!reprintModalOrder}
        onClose={() => setReprintModalOrder(null)}
        order={reprintModalOrder}
        restaurantInfo={settingsData?.data}
      />

      {/* ── VARIANT SELECTION MODAL ────────────────────────────────────────── */}
      {selectedItemForVariants && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedItemForVariants(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedItemForVariants.name}</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Select Option</p>
              </div>
              <button
                onClick={() => setSelectedItemForVariants(null)}
                className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-500 transition cursor-pointer shadow-sm border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedItemForVariants.variants.map((v: any) => {
                  const variantId = `${selectedItemForVariants._id}_${v.name}`;
                  const selectedVar = cartItems.find((ci) => ci.itemId === variantId);
                  const isOut = !selectedItemForVariants.isAvailable || (selectedItemForVariants.trackStock && selectedItemForVariants.stockQuantity <= 0);
                  return (
                    <div
                      key={v.name}
                      onClick={() => {
                        if (!isOut) {
                          addItemToCart(selectedItemForVariants, v);
                          setSelectedItemForVariants(null);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                        selectedVar
                          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                          : isOut
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black uppercase text-slate-800">{v.name}</span>
                        <span className="font-mono text-sm font-black text-slate-600">₹{(v.price / 100).toFixed(2)}</span>
                      </div>
                      {selectedVar ? (
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono text-sm flex items-center justify-center font-bold">
                          {selectedVar.quantity}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManagerCounter;
