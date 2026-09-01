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
  Tv,
  AlertTriangle,
  Armchair,
  Check,
  PauseCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import apiClient from '../lib/api';
import { printOrderTicket, TicketPrintType } from '../utils/printReceipt';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { ItemModifierModal } from '../components/pos/ItemModifierModal';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { offlineStorage } from '../lib/offlineStorage';
import { MenuBadge } from './PublicTable/components/MenuBadge';
import { Button } from '../components/ui/Button';

export interface SelectedCounterItem {
  itemId: string;
  baseItemId?: string;
  variantName?: string;
  name: string;
  price: number;
  quantity: number;
  selectedAddOns?: Array<{ name: string; priceDelta: number }>;
  specialInstructions?: string;
}

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD';
export type OrderMode = 'DINE_IN' | 'TAKEAWAY';

export interface CounterOrderTab {
  id: string;
  name: string;
  createdAt: number;
  isHeld: boolean;
  cartItems: SelectedCounterItem[];
  customerName: string;
  customerPhone: string;
  customerNote: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PAID' | 'PENDING';
  orderMode: OrderMode;
  selectedTable: any | null;
}

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
  const { user, activeRestaurantId, impersonatedOutlet } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restaurantId = activeRestaurantId;

  // Multi-Tab Order & Hold State Initialization
  const [tabs, setTabs] = useState<CounterOrderTab[]>(() => {
    if (restaurantId) {
      try {
        const saved = localStorage.getItem(`pos_active_tabs_${restaurantId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to parse cached POS tabs:', err);
      }
    }
    return [
      {
        id: `tab_${Date.now()}`,
        name: 'Order #1',
        createdAt: Date.now(),
        isHeld: false,
        cartItems: [],
        customerName: '',
        customerPhone: '',
        customerNote: '',
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        orderMode: 'DINE_IN',
        selectedTable: null,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (restaurantId) {
      try {
        const savedActiveId = localStorage.getItem(`pos_active_tab_id_${restaurantId}`);
        if (savedActiveId && tabs.some((t) => t.id === savedActiveId)) {
          return savedActiveId;
        }
      } catch (err) {
        console.warn('Failed to get cached POS active tab ID:', err);
      }
    }
    return tabs[0]?.id || `tab_${Date.now()}`;
  });

  const initialTabLoadedRef = useRef(false);

  // Active Working Form State
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

  // Table Selection State for Dine-In Table Orders
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [showTablePickerModal, setShowTablePickerModal] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');

  // Initialize Working State from Active Tab on initial mount
  useEffect(() => {
    if (initialTabLoadedRef.current) return;
    const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
    if (currentTab) {
      setCartItems(currentTab.cartItems || []);
      setCustomerName(currentTab.customerName || '');
      setCustomerPhone(currentTab.customerPhone || '');
      setCustomerNote(currentTab.customerNote || '');
      setPaymentMethod(currentTab.paymentMethod || 'UPI');
      setPaymentStatus(currentTab.paymentStatus || 'PAID');
      setOrderMode(currentTab.orderMode || 'DINE_IN');
      setSelectedTable(currentTab.selectedTable || null);
    }
    initialTabLoadedRef.current = true;
  }, [activeTabId, tabs]);

  // Continuously synchronize active working state back into the active tab in `tabs` and `localStorage`
  useEffect(() => {
    if (!initialTabLoadedRef.current) return;
    setTabs((prevTabs) => {
      const updated = prevTabs.map((tab) => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            cartItems,
            customerName,
            customerPhone,
            customerNote,
            paymentMethod,
            paymentStatus,
            orderMode,
            selectedTable,
          };
        }
        return tab;
      });

      if (restaurantId) {
        try {
          localStorage.setItem(`pos_active_tabs_${restaurantId}`, JSON.stringify(updated));
          localStorage.setItem(`pos_active_tab_id_${restaurantId}`, activeTabId);
        } catch (err) {
          console.warn('Failed to sync POS tabs to localStorage:', err);
        }
      }
      return updated;
    });
  }, [
    activeTabId,
    cartItems,
    customerName,
    customerPhone,
    customerNote,
    paymentMethod,
    paymentStatus,
    orderMode,
    selectedTable,
    restaurantId,
  ]);

  // Inline Note Editor State for Cart Items
  const [editingNoteItem, setEditingNoteItem] = useState<{ itemId: string; name: string; note: string } | null>(null);

  // Checkout Wizard Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'CUSTOMER_INFO' | 'PAYMENT_CONFIRM'>('CUSTOMER_INFO');
  const [selectedPrintTarget, setSelectedPrintTarget] = useState<TicketPrintType>('BOTH');


  // Recent Orders Drawer & Quick Reprint Modal State
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false);
  const [reprintModalOrder, setReprintModalOrder] = useState<any | null>(null);

  // Item variant selection modal state
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<any | null>(null);

  // Offline Synchronization Hook
  const { isOnline, queuedCount, syncPendingOrders } = useOfflineSync(restaurantId);

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

  // Fetch Tables for Table Order Placement
  const { data: tablesData } = useQuery({
    queryKey: ['managerCounterTables', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/tables`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Fetch Zones for Table Filtering
  const { data: zonesData } = useQuery({
    queryKey: ['managerCounterZones', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/zones`);
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
    setSelectedTable(null);
  }, []);

  // Multi-Tab Actions
  const switchTab = useCallback((targetTabId: string) => {
    if (targetTabId === activeTabId) return;
    const target = tabs.find((t) => t.id === targetTabId);
    if (!target) return;

    setActiveTabId(targetTabId);
    setCartItems(target.cartItems || []);
    setCustomerName(target.customerName || '');
    setCustomerPhone(target.customerPhone || '');
    setCustomerNote(target.customerNote || '');
    setPaymentMethod(target.paymentMethod || 'UPI');
    setPaymentStatus(target.paymentStatus || 'PAID');
    setOrderMode(target.orderMode || 'DINE_IN');
    setSelectedTable(target.selectedTable || null);

    setShowCheckoutModal(false);
    setEditingNoteItem(null);
  }, [activeTabId, tabs]);

  const createNewTab = useCallback((customName?: string) => {
    const nextIndex = tabs.length + 1;
    const newTab: CounterOrderTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: customName || `Order #${nextIndex}`,
      createdAt: Date.now(),
      isHeld: false,
      cartItems: [],
      customerName: '',
      customerPhone: '',
      customerNote: '',
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      orderMode: 'DINE_IN',
      selectedTable: null,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNote('');
    setPaymentMethod('UPI');
    setPaymentStatus('PAID');
    setOrderMode('DINE_IN');
    setSelectedTable(null);
    setShowCheckoutModal(false);
    setEditingNoteItem(null);
  }, [tabs.length]);

  const holdCurrentTab = useCallback(() => {
    if (cartItems.length === 0) {
      toast('Add items to order before parking on hold', 'info');
      return;
    }

    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isHeld: true } : t))
    );

    const currentTab = tabs.find((t) => t.id === activeTabId);
    const label = currentTab?.selectedTable
      ? (currentTab.selectedTable.displayName || `Table ${currentTab.selectedTable.tableNumber}`)
      : currentTab?.customerName?.trim() || currentTab?.name || 'Order';

    toast(`Order parked on hold: ${label}`, 'info');
    createNewTab();
  }, [cartItems.length, activeTabId, tabs, createNewTab, toast]);

  const closeTab = useCallback((targetTabId: string) => {
    if (tabs.length <= 1) {
      clearCart();
      const freshTab: CounterOrderTab = {
        id: `tab_${Date.now()}`,
        name: 'Order #1',
        createdAt: Date.now(),
        isHeld: false,
        cartItems: [],
        customerName: '',
        customerPhone: '',
        customerNote: '',
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        orderMode: 'DINE_IN',
        selectedTable: null,
      };
      setTabs([freshTab]);
      setActiveTabId(freshTab.id);
      toast('Tab cleared', 'info');
      return;
    }

    const remainingTabs = tabs.filter((t) => t.id !== targetTabId);
    setTabs(remainingTabs);

    if (activeTabId === targetTabId) {
      const nextTab = remainingTabs[remainingTabs.length - 1];
      setActiveTabId(nextTab.id);
      setCartItems(nextTab.cartItems || []);
      setCustomerName(nextTab.customerName || '');
      setCustomerPhone(nextTab.customerPhone || '');
      setCustomerNote(nextTab.customerNote || '');
      setPaymentMethod(nextTab.paymentMethod || 'UPI');
      setPaymentStatus(nextTab.paymentStatus || 'PAID');
      setOrderMode(nextTab.orderMode || 'DINE_IN');
      setSelectedTable(nextTab.selectedTable || null);
    }
  }, [tabs, activeTabId, clearCart, toast]);

  const completeActiveTab = useCallback(() => {
    setShowCheckoutModal(false);
    if (tabs.length <= 1) {
      clearCart();
      const freshTab: CounterOrderTab = {
        id: `tab_${Date.now()}`,
        name: 'Order #1',
        createdAt: Date.now(),
        isHeld: false,
        cartItems: [],
        customerName: '',
        customerPhone: '',
        customerNote: '',
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        orderMode: 'DINE_IN',
        selectedTable: null,
      };
      setTabs([freshTab]);
      setActiveTabId(freshTab.id);
    } else {
      const remainingTabs = tabs.filter((t) => t.id !== activeTabId);
      setTabs(remainingTabs);
      const nextTab = remainingTabs[0];
      setActiveTabId(nextTab.id);
      setCartItems(nextTab.cartItems || []);
      setCustomerName(nextTab.customerName || '');
      setCustomerPhone(nextTab.customerPhone || '');
      setCustomerNote(nextTab.customerNote || '');
      setPaymentMethod(nextTab.paymentMethod || 'UPI');
      setPaymentStatus(nextTab.paymentStatus || 'PAID');
      setOrderMode(nextTab.orderMode || 'DINE_IN');
      setSelectedTable(nextTab.selectedTable || null);
    }
  }, [tabs, activeTabId, clearCart]);

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = Math.round((cartSubtotal * taxRatePercent) / 100);
  const unroundedTotal = cartSubtotal + taxAmount;
  const roundingConfig =
    settingsData?.data?.roundingConfig ||
    settingsData?.data?.settings?.roundingConfig;

  let roundOffAmount = 0;
  let grandTotal = unroundedTotal;
  if (roundingConfig?.enabled !== false) {
    const strategy = roundingConfig?.strategy || 'NEAREST';
    if (strategy === 'UP') {
      grandTotal = Math.ceil(unroundedTotal / 100) * 100;
    } else if (strategy === 'DOWN') {
      grandTotal = Math.floor(unroundedTotal / 100) * 100;
    } else {
      grandTotal = Math.round(unroundedTotal / 100) * 100;
    }
    roundOffAmount = grandTotal - unroundedTotal;
  }
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
    setPaymentStatus(selectedTable?.status === 'OCCUPIED' ? 'PENDING' : 'PAID');
    setCheckoutStep('CUSTOMER_INFO');
    setShowCheckoutModal(true);

    // Auto-focus customer name field
    setTimeout(() => {
      customerNameInputRef.current?.focus();
    }, 100);
  }, [cartItems.length, selectedTable, settingsData?.data?.printerConfig?.defaultPrintTarget, toast]);

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
    const resolvedOrderMode = selectedTable ? 'DINE_IN' : orderMode;
    const defaultGuestName = selectedTable
      ? (selectedTable.displayName || `Table ${selectedTable.tableNumber}`)
      : 'Walk-in Customer';

    const payload = {
      tableId: selectedTable?._id || undefined,
      customerName: customerName.trim() || defaultGuestName,
      customerPhone: customerPhone.trim() || undefined,
      customerNote: customerNote.trim() || undefined,
      paymentStatus,
      paymentMethod,
      orderMode: resolvedOrderMode,
      items: cartItems.map((item) => ({
        // For variant items, itemId is a composite "mongoId_variantName" used only for cart deduplication.
        // baseItemId always holds the real MongoDB MenuItem _id — use it for the API.
        itemId: item.baseItemId || item.itemId,
        variantName: item.variantName,
        quantity: item.quantity,
        selectedAddOns: item.selectedAddOns || [],
        specialInstructions: item.specialInstructions || '',
      })),
    };

    if (!navigator.onLine) {
      const queued = offlineStorage.queueOrder(restaurantId!, payload);
      const offlineOrder = {
        _id: queued.localTempId,
        orderNumber: parseInt(queued.localTempId.split('-')[2] || '999', 10),
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerNote: payload.customerNote,
        orderMode: payload.orderMode,
        items: cartItems,
        total: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
        paymentMethod,
        paymentStatus,
        createdAt: new Date(),
      };
      if (selectedPrintTarget && (selectedPrintTarget as string) !== 'NONE') {
        printOrderTicket(offlineOrder, settingsData?.data, selectedPrintTarget);
      }
      toast(`⚠️ Offline Order #${offlineOrder.orderNumber} queued locally & printed! Will sync when online.`, 'info');
      completeActiveTab();
      setIsSubmitting(false);
      return;
    }

    try {
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

        const tableLabel = selectedTable ? ` for ${selectedTable.displayName || 'Table ' + selectedTable.tableNumber}` : '';
        toast(`Order #${createdOrder.orderNumber}${tableLabel} placed & printed successfully!`, 'success');
        completeActiveTab();
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['managerCounterTables', restaurantId] });
        queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      }
    } catch (err: any) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        const queued = offlineStorage.queueOrder(restaurantId!, payload);
        const offlineOrder = {
          _id: queued.localTempId,
          orderNumber: parseInt(queued.localTempId.split('-')[2] || '999', 10),
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerNote: payload.customerNote,
          orderMode: payload.orderMode,
          items: cartItems,
          total: cartItems.reduce((s, i) => s + i.price * i.quantity, 0),
          paymentMethod,
          paymentStatus,
          createdAt: new Date(),
        };
        if (selectedPrintTarget && (selectedPrintTarget as string) !== 'NONE') {
          printOrderTicket(offlineOrder, settingsData?.data, selectedPrintTarget);
        }
        toast(`⚠️ Network disconnected: Order queued locally & printed! Will auto-sync.`, 'error');
        completeActiveTab();
      } else {
        toast(err.response?.data?.error?.message || 'Failed to place order. No bill printed.', 'error');
      }
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
    selectedTable,
    restaurantId,
    selectedPrintTarget,
    settingsData?.data,
    toast,
    completeActiveTab,
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

      // Tab management shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        createNewTab();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        holdCurrentTab();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeTab(activeTabId);
        return;
      }

      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          switchTab(tabs[idx].id);
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
    createNewTab,
    holdCurrentTab,
    closeTab,
    switchTab,
    activeTabId,
    tabs,
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
    <div className="w-full h-full flex flex-col min-h-0 space-y-2.5 sm:space-y-3 font-sans select-none overflow-hidden">
      {/* ── TOP HEADER & MODE SELECTOR ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-3 md:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 shadow-xs shrink-0">
            <Receipt className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-none">
                Counter POS
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ready
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Direct checkout, fast bill printing &amp; live kitchen sync
            </span>
          </div>
        </div>

        {/* Header Right: Mode Toggle + Recent Orders */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Offline Sync Status Chip */}
          {(!isOnline || queuedCount > 0) && (
            <button
              type="button"
              onClick={() => syncPendingOrders()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse cursor-pointer"
              title="Click to manually sync queued offline orders"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>{!isOnline ? 'Offline' : 'Syncing'} ({queuedCount} queued)</span>
            </button>
          )}

          <a
            href={`/r/${(user?.role === 'SUPER_ADMIN' ? impersonatedOutlet?.slug : (user as any)?.restaurants?.[0]?.slug) || 'demo-cafe'}/display`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer active:scale-95 shadow-2xs"
            title="Open Customer Live Display TV Queue in a new window"
          >
            <Tv className="w-4 h-4 text-emerald-600" strokeWidth={2} />
            <span className="hidden sm:inline">TV Display</span>
          </a>

          <button
            type="button"
            onClick={() => setShowRecentOrdersModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer active:scale-95"
            title="View recent orders and reprint customer bills or KOTs"
          >
            <HistoryIcon className="w-4 h-4 text-amber-600" strokeWidth={2} />
            <span className="hidden sm:inline">Recent Orders</span>
          </button>

          {/* Table Selector Pill */}
          {selectedTable ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs">
              <Armchair className="w-3.5 h-3.5 text-amber-700 shrink-0" strokeWidth={2.5} />
              <span className="truncate max-w-[130px]">{selectedTable.displayName || `Table ${selectedTable.tableNumber}`}</span>
              <button
                type="button"
                onClick={() => setShowTablePickerModal(true)}
                className="text-[10px] text-amber-800 hover:underline ml-0.5 cursor-pointer font-bold"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="w-4 h-4 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 flex items-center justify-center transition cursor-pointer ml-0.5"
                title="Clear Table (revert to walk-in)"
              >
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTablePickerModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Assign this order to a specific Dine-in Table"
            >
              <Armchair className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
              <span>Assign Table</span>
            </button>
          )}

          {/* Order Mode Toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner">
            {orderModeOptions.map((opt) => {
              const isActive = (!selectedTable && orderMode === opt.key) || (selectedTable && opt.key === 'DINE_IN');
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    if (opt.key === 'TAKEAWAY') {
                      setSelectedTable(null);
                    }
                    setOrderMode(opt.key);
                  }}
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

      {/* ── MULTI-TAB ORDER & HOLD BAR ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 select-none">
        <div className="flex items-center gap-1.5 flex-nowrap">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;
            const tabItemCount = (tab.cartItems || []).reduce((s, i) => s + i.quantity, 0);
            const tabSubtotal = (tab.cartItems || []).reduce((s, i) => s + i.price * i.quantity, 0);

            // Dynamic display label: Table Name, Customer Name, or Tab Default
            const displayName = tab.selectedTable
              ? (tab.selectedTable.displayName || `Table ${tab.selectedTable.tableNumber}`)
              : tab.customerName?.trim()
              ? `${tab.orderMode === 'TAKEAWAY' ? 'Takeaway • ' : ''}${tab.customerName.trim()}`
              : tab.name;

            return (
              <div
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-800 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {/* Shortcut Index Pill */}
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-slate-500'
                  }`}
                  title={`Press Alt+${index + 1} to switch`}
                >
                  {index + 1}
                </span>

                {/* Tab Name */}
                <span className="font-bold truncate max-w-[110px] sm:max-w-[140px]">
                  {displayName}
                </span>

                {/* Held Badge */}
                {tab.isHeld && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider">
                    HELD
                  </span>
                )}

                {/* Item Count & Subtotal Pill */}
                {tabItemCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tabItemCount} • ₹{tabSubtotal}
                  </span>
                )}

                {/* Close Tab Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`p-0.5 rounded-md transition opacity-60 hover:opacity-100 ${
                    isActive ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-500'
                  }`}
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {/* Action: + New Tab */}
          <button
            type="button"
            onClick={() => createNewTab()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/50 text-slate-700 hover:text-amber-900 text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
            title="Create a new order tab (Ctrl+T / Alt+N)"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
            <span>New Tab</span>
          </button>

          {/* Action: Hold & New */}
          <button
            type="button"
            onClick={holdCurrentTab}
            disabled={cartItems.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
              cartItems.length > 0
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
            }`}
            title="Hold current order and open a new blank tab (Ctrl+H)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
            <span>Hold &amp; New</span>
            <span className="text-[10px] opacity-70 font-mono hidden md:inline">(Ctrl+H)</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4.5 flex-1 min-h-0 overflow-hidden items-stretch">
        {/* LEFT COLUMN: LARGE SEARCH BAR + CATEGORY PILLS + DISH CARDS */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 space-y-2 sm:space-y-2.5">
          {/* FULL-WIDTH POS SEARCH BAR */}
          <div className="relative group shrink-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-amber-500 pointer-events-none"
              strokeWidth={2}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search dishes by name or code... (Press / to search)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-20 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* TALL HORIZONTAL CATEGORY CHIPS BAR */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All ({allMenuItems.filter((i: any) => i.isAvailable).length})
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5 ${
                      selectedCategoryFilter === cat._id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
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
          <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto scrollbar-none pr-0.5">
            {allMenuItems.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
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
                    <div key={cat._id} className="space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                        <span>{cat.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-md font-mono font-bold">
                          {catItems.length}
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
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
                                const hasCustomization = isPortion || (Array.isArray(item.addOns) && item.addOns.length > 0) || (Array.isArray(item.customizationGroups) && item.customizationGroups.length > 0);
                                if (hasCustomization) {
                                  setSelectedItemForVariants(item);
                                } else {
                                  addItemToCart(item);
                                }
                              }}
                              className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 select-none active:scale-[0.98] shadow-2xs relative ${
                                isOut
                                   ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs cursor-pointer'
                                  : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs cursor-pointer'
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
                                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-700' : 'text-slate-500'}`}>
                                    Options
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {isSelected && totalPortionQty > 0 && (
                                      <span className="w-4.5 h-4.5 rounded-full bg-amber-400 text-amber-950 font-mono text-[10px] flex items-center justify-center font-bold shadow-2xs">
                                        {totalPortionQty}
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border ${isSelected ? 'text-amber-800 bg-amber-200 border-amber-300' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                                      {isSelected ? 'EDIT' : '+ ADD'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                  {isOut ? (
                                    <span className="text-[10px] font-bold text-rose-600 font-mono w-full text-center py-0.5">
                                      Out of Stock
                                    </span>
                                  ) : selectedItem ? (
                                    <div className="flex items-center gap-1 bg-amber-100/90 border border-amber-300/80 p-0.5 rounded-lg shadow-2xs w-full justify-between">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(item._id, selectedItem.quantity - 1);
                                        }}
                                        className="w-6 h-6 rounded-md bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center justify-center transition active:scale-95 border border-amber-200/80 shadow-2xs cursor-pointer"
                                        title="Decrease quantity"
                                      >
                                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                                      </button>
                                      <span className="font-mono font-black text-xs px-1 text-slate-900 min-w-[18px] text-center">
                                        {selectedItem.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(item._id, selectedItem.quantity + 1);
                                        }}
                                        className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer"
                                        title="Increase quantity"
                                      >
                                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-[10px] font-medium text-slate-400">Click to add</span>
                                      <span className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center text-slate-600 transition shadow-2xs">
                                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
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

        {/* RIGHT COLUMN: ORDER DETAILS SUMMARY (NO CLUTTER) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between border-b pb-2 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Receipt className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                <span>Order Summary ({totalItemCount})</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  {selectedTable ? (
                    <span className="text-amber-900 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 inline-flex items-center gap-1">
                      <Armchair className="w-2.5 h-2.5 text-amber-600" />
                      {selectedTable.displayName || `Table ${selectedTable.tableNumber}`}
                    </span>
                  ) : orderMode === 'DINE_IN' ? (
                    '🍽️ Walk-in Dine-In'
                  ) : (
                    '🛍️ Walk-in Takeaway'
                  )}
                </span>
                {selectedTable ? (
                  <button
                    type="button"
                    onClick={() => setShowTablePickerModal(true)}
                    className="text-[9px] text-slate-400 hover:text-amber-800 underline font-medium cursor-pointer"
                  >
                    Switch
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTablePickerModal(true)}
                    className="text-[9px] text-amber-700 hover:text-amber-900 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 cursor-pointer"
                  >
                    + Assign Table
                  </button>
                )}
              </div>
            </div>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Selected Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-1.5 pr-0.5 my-2">
            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1.5">
                <ShoppingBag className="w-6 h-6 mx-auto text-slate-300 stroke-1" />
                <p className="font-semibold text-xs">No dishes added yet.</p>
                <p className="text-[10px] text-slate-400">Click any dish on the left to add to this ticket.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.itemId}
                  className="p-2 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-bold text-slate-900 truncate leading-tight text-xs">{item.name}</h5>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingNoteItem({
                            itemId: item.itemId,
                            name: item.name,
                            note: item.specialInstructions || '',
                          })
                        }
                        className={`p-0.5 rounded transition cursor-pointer shrink-0 ${
                          item.specialInstructions
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title={item.specialInstructions ? 'Edit kitchen instruction' : 'Add kitchen instruction (e.g. less sugar)'}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>

                    {item.specialInstructions && (
                      <div className="text-[10px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-1.5 py-0.2 rounded mt-0.5 font-medium flex items-center gap-1 truncate max-w-fit">
                        <span className="font-bold">Note:</span> {item.specialInstructions}
                      </div>
                    )}

                    <span className="font-mono text-[10px] text-slate-500 font-medium block mt-0.5">
                      ₹{(item.price / 100).toFixed(2)} × {item.quantity} = ₹{((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                      className="w-6 h-6 rounded-md hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      title="Decrease"
                    >
                      <Minus className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                    <span className="font-mono font-bold text-xs min-w-[18px] text-center text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition cursor-pointer"
                      title="Increase"
                    >
                      <Plus className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemFromCart(item.itemId)}
                      className="w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition ml-0.5 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Footer & Financials */}
          <div className="border-t pt-2 space-y-2 shrink-0 mt-auto">
            <div className="space-y-1 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Subtotal ({totalItemCount} items)</span>
                <span className="font-mono font-bold text-slate-800">₹{(cartSubtotal / 100).toFixed(2)}</span>
              </div>
              {taxRatePercent > 0 && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>GST ({taxRatePercent}%)</span>
                  <span className="font-mono font-bold text-slate-700">₹{(taxAmount / 100).toFixed(2)}</span>
                </div>
              )}
              {roundOffAmount !== 0 && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Round Off</span>
                  <span className="font-mono font-bold text-slate-700">
                    {roundOffAmount > 0 ? '+' : '-'}₹{(Math.abs(roundOffAmount) / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-slate-900 border-t border-slate-200/80 pt-1">
                <span className="text-xs font-bold">Payable Total</span>
                <span className="font-mono text-lg text-emerald-600 font-black">
                  ₹{(grandTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* PUNCH ORDER BUTTON (OPENS STEP 1 MODAL) */}
            <button
              type="button"
              onClick={handleOpenCheckoutModal}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full h-9 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-40 flex items-center justify-between px-3.5 cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Punch Order</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700">
                <span>Enter</span>
                <CornerDownLeft className="w-3 h-3 text-amber-400" />
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
                          {selectedTable ? `${selectedTable.displayName || 'Table ' + selectedTable.tableNumber} Order` : 'Guest Details (Optional)'}
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

                  {selectedTable && (
                    <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Armchair className="w-4 h-4 text-amber-700" />
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">
                            Assigned Table: {selectedTable.displayName || `Table ${selectedTable.tableNumber}`}
                          </span>
                          <span className="text-[10px] text-amber-800">
                            Order will be bound to this table's live dining session.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCheckoutModal(false);
                          setShowTablePickerModal(true);
                        }}
                        className="text-[10px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                      >
                        Change Table
                      </button>
                    </div>
                  )}

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
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-1/3"
                      onClick={() => setShowCheckoutModal(false)}
                    >
                      Cancel (Esc)
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-2/3"
                      onClick={handleProceedToPayment}
                      rightIcon={<ArrowRight className="w-4 h-4 text-amber-400" />}
                    >
                      Proceed to Payment (Enter ↵)
                    </Button>
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
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Payment Settlement</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {selectedTable
                          ? 'Collect payment immediately or add to table tab'
                          : 'Counter walk-in orders are normally paid on placement'}
                      </span>
                    </div>
                    <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('PAID')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          paymentStatus === 'PAID'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ✓ Paid Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('PENDING')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          paymentStatus === 'PENDING'
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pay Later (Tab)
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
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-1/3"
                      onClick={() => setCheckoutStep('CUSTOMER_INFO')}
                      disabled={isSubmitting}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-2/3"
                      onClick={handleConfirmAndPunchOrder}
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    >
                      Confirm &amp; Print Bill (Enter ↵)
                    </Button>
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

      {/* ── ITEM MODIFIER & CUSTOMIZATION MODAL ────────────────────────── */}
      <ItemModifierModal
        isOpen={!!selectedItemForVariants}
        onClose={() => setSelectedItemForVariants(null)}
        item={selectedItemForVariants}
        onAddToCart={(customizedItem: any) => {
          setCartItems((prev) => {
            const existingIndex = prev.findIndex(
              (i) =>
                i.itemId === customizedItem.itemId &&
                i.specialInstructions === customizedItem.specialInstructions
            );
            if (existingIndex > -1) {
              const updated = [...prev];
              updated[existingIndex].quantity += customizedItem.quantity;
              return updated;
            }
            return [
              ...prev,
              {
                itemId: customizedItem.itemId,
                baseItemId: customizedItem.baseItemId,
                name: customizedItem.variantName
                  ? `${customizedItem.name} (${customizedItem.variantName})`
                  : customizedItem.name,
                variantName: customizedItem.variantName,
                price: customizedItem.price,
                quantity: customizedItem.quantity,
                selectedAddOns: customizedItem.selectedAddOns,
                specialInstructions: customizedItem.specialInstructions,
              },
            ];
          });
        }}
      />

      {/* ── TABLE PICKER MODAL (DINE-IN TABLE ORDERING) ────────────────────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showTablePickerModal && (
              <div className="fixed inset-0 z-[9995] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Armchair className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-lg text-slate-900 leading-tight">
                          Select Dine-in Table
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                          Assign this counter order to a specific floor table
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTablePickerModal(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search table by number (e.g. 2, T-04, Indoor)..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition"
                        autoFocus
                      />
                    </div>

                    {/* Zone Chips */}
                    {Array.isArray(zonesData?.data) && zonesData.data.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setSelectedZoneFilter('ALL')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedZoneFilter === 'ALL'
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          All Zones
                        </button>
                        {zonesData.data.map((zone: any) => (
                          <button
                            key={zone._id}
                            type="button"
                            onClick={() => setSelectedZoneFilter(zone._id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                              selectedZoneFilter === zone._id
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {zone.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tables Grid */}
                  <div className="p-5 overflow-y-auto flex-1">
                    {(() => {
                      const allTables: any[] = Array.isArray(tablesData?.data) ? tablesData.data : [];
                      const zonesMap: Record<string, string> = {};
                      if (Array.isArray(zonesData?.data)) {
                        zonesData.data.forEach((z: any) => {
                          zonesMap[z._id] = z.name;
                        });
                      }

                      const filtered = allTables.filter((tbl) => {
                        const matchesZone =
                          selectedZoneFilter === 'ALL' ||
                          (tbl.zoneId && (typeof tbl.zoneId === 'object' ? tbl.zoneId._id : tbl.zoneId) === selectedZoneFilter);

                        const q = tableSearchQuery.toLowerCase().trim();
                        const zoneName = tbl.zoneId ? (zonesMap[typeof tbl.zoneId === 'object' ? tbl.zoneId._id : tbl.zoneId] || '') : '';
                        const matchesQuery =
                          !q ||
                          tbl.tableNumber?.toLowerCase().includes(q) ||
                          tbl.displayName?.toLowerCase().includes(q) ||
                          zoneName.toLowerCase().includes(q);

                        return matchesZone && matchesQuery && tbl.isActive && !tbl.isArchived;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            No active tables found matching your search.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {filtered.map((tbl) => {
                            const isSelected = selectedTable?._id === tbl._id;
                            const isOccupied = tbl.status === 'OCCUPIED';
                            const isBillReq = tbl.status === 'BILL_REQUESTED';
                            const zoneName = tbl.zoneId ? (zonesMap[typeof tbl.zoneId === 'object' ? tbl.zoneId._id : tbl.zoneId] || '') : '';

                            return (
                              <button
                                key={tbl._id}
                                type="button"
                                onClick={() => {
                                  setSelectedTable(tbl);
                                  setOrderMode('DINE_IN');
                                  setShowTablePickerModal(false);
                                  toast(`Assigned to ${tbl.displayName || 'Table ' + tbl.tableNumber}`, 'success');
                                }}
                                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer shadow-2xs select-none active:scale-95 ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50/90 ring-4 ring-amber-500/20 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <span className="font-display font-black text-sm text-slate-900 block truncate">
                                      {tbl.displayName || `Table ${tbl.tableNumber}`}
                                    </span>
                                    {zoneName && (
                                      <span className="text-[10px] text-slate-500 font-medium truncate block">
                                        📍 {zoneName}
                                      </span>
                                    )}
                                  </div>
                                  <Armchair className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                                      isOccupied
                                        ? 'bg-amber-100 text-amber-900'
                                        : isBillReq
                                        ? 'bg-indigo-100 text-indigo-900'
                                        : 'bg-emerald-100 text-emerald-900'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isOccupied ? 'bg-amber-500' : isBillReq ? 'bg-indigo-500' : 'bg-emerald-500'
                                      }`}
                                    />
                                    {isOccupied ? 'Occupied' : isBillReq ? 'Bill Due' : 'Available'}
                                  </span>

                                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 font-black" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTable(null);
                        setShowTablePickerModal(false);
                        toast('Switched to Walk-in Counter order', 'info');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Clear Table (Use Walk-in)
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTablePickerModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ── INLINE ITEM SPECIAL INSTRUCTION / NOTE EDITOR MODAL ───────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {editingNoteItem && (
              <div className="fixed inset-0 z-[9996] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none font-sans">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border border-slate-100 space-y-4"
                >
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-sm text-slate-900">Kitchen Note: {editingNoteItem.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingNoteItem(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase font-mono">
                      Special Preparation Instruction
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A little less sugar, extra crispy, no onions..."
                      value={editingNoteItem.note}
                      onChange={(e) =>
                        setEditingNoteItem((prev) => (prev ? { ...prev, note: e.target.value } : null))
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition shadow-2xs"
                      autoFocus
                    />
                  </div>

                  {/* Quick Preset Instruction Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Less Sugar',
                      'No Sugar',
                      'Extra Spicy',
                      'Less Spicy',
                      'No Onion / Garlic',
                      'Pack Separately',
                      'Serve Hot',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setEditingNoteItem((prev) => (prev ? { ...prev, note: preset } : null))
                        }
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 transition cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-1/2"
                      onClick={() => {
                        // Clear note
                        setCartItems((prev) =>
                          prev.map((i) =>
                            i.itemId === editingNoteItem.itemId ? { ...i, specialInstructions: undefined } : i
                          )
                        );
                        setEditingNoteItem(null);
                      }}
                    >
                      Remove Note
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-1/2"
                      onClick={() => {
                        const trimmed = editingNoteItem.note.trim();
                        setCartItems((prev) =>
                          prev.map((i) =>
                            i.itemId === editingNoteItem.itemId
                              ? { ...i, specialInstructions: trimmed || undefined }
                              : i
                          )
                        );
                        setEditingNoteItem(null);
                      }}
                    >
                      Save Note
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

    </div>
  );
};

export default ManagerCounter;
