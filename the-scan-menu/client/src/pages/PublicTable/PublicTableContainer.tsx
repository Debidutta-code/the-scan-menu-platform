import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { Helmet } from 'react-helmet-async';
import { Loader, AlertTriangle, X, Plus, Minus } from 'lucide-react';
import { publicService, PublicCategory, MenuItem, AddOn, MenuItemVariant } from '../../services/restaurant.service';
import { useCartStore } from '../../store/useCartStore';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import apiClient from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

import { ActiveTab, CartOrdersSubTab, WaiterCallState, WaiterRequestType } from './types';
import { loadRazorpay, getItemBadge, formatPrice } from './utils';
import { ConfirmModal } from './components/ConfirmModal';
import { ItemDetailSheet } from './components/ItemDetailSheet';
import { OtpModal } from './components/OtpModal';
import { ViewBillSheet } from './components/ViewBillSheet';
import { BottomNav } from './components/BottomNav';
import { FloatingCartBar } from './components/FloatingCartBar';
import { LandingTab } from './tabs/LandingTab';
import { MenuTab } from './tabs/MenuTab';
import { WaiterTab } from './tabs/WaiterTab';
import { CartOrdersTab } from './tabs/CartOrdersTab';

export const PublicTable: React.FC = () => {
  const { restaurantSlug, tableToken } = useParams<{ restaurantSlug?: string; tableToken?: string }>();

  const queryClient = useQueryClient();

  // Zustand Cart Store
  const {
    items: cartItems,
    customerNote,
    useLoyaltyPoints,
    toggleUseLoyaltyPoints,
    addItem,
    updateQuantity,
    setCustomerNote,
    clearCart,
    setTable,
    getOrCreateIdempotencyKey,
    resetIdempotencyKey,
  } = useCartStore();

  // Customer Auth
  const {
    customer,
    customerToken,
    isAuthenticated: isCustomerAuthenticated,
    sendOtp,
    verifyOtp,
    switchCustomer,
  } = useCustomerAuth();

  useEffect(() => {
    if (customer) {
      if (customer.name) setCustomerName((prev) => prev || customer.name);
      if (customer.phone) setPhoneNumber((prev) => prev || customer.phone);
    }
  }, [customer]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Primary Bottom Tab: 'landing' | 'menu' | 'waiter' | 'cart-orders'
  const activeTab = (searchParams.get('tab') as ActiveTab) || 'landing';
  const cartOrdersSubTab = (searchParams.get('sub') as CartOrdersSubTab) || 'cart';

  const updateNavigationState = (
    tab: ActiveTab,
    sub?: CartOrdersSubTab,
    _trackId?: string | null
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (sub) {
        next.set('sub', sub);
      }
      return next;
    });
  };

  const setActiveTab = (tab: ActiveTab) => {
    updateNavigationState(tab);
  };

  const setCartOrdersSubTab = (sub: CartOrdersSubTab) => {
    updateNavigationState(activeTab, sub);
  };

  const [recentWaiterCalls, setRecentWaiterCalls] = useState<{ type: string; timestamp: string }[]>([]);

  useEffect(() => {
    if (restaurantSlug && tableToken) {
      const key = `pixora_waiter_calls_${restaurantSlug}_${tableToken}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      setRecentWaiterCalls(stored);
    }
  }, [restaurantSlug, tableToken]);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [chefsSpecialFilter, setChefsSpecialFilter] = useState<boolean>(false);
  const [priceSort, setPriceSort] = useState<'default' | 'low-high' | 'high-low'>('default');
  const showAvailableOnly = true;

  // Category Scrolling State
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);

  // Waiter request types and confirm states
  const [selectedRequestType, setSelectedRequestType] = useState<WaiterRequestType>('CALL_WAITER');
  const [isWaiterConfirmOpen, setIsWaiterConfirmOpen] = useState(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);
  const [isClearSessionModalOpen, setIsClearSessionModalOpen] = useState(false);
  const [isViewBillModalOpen, setIsViewBillModalOpen] = useState(false);
  const [isTaxBreakdownExpanded, setIsTaxBreakdownExpanded] = useState(false);

  // Customer Phone & 4-Digit PIN State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCooldownRemaining, setOtpCooldownRemaining] = useState<number>(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  // Order Placement & Idempotency / Recovery States
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isRecoveringOrder, setIsRecoveringOrder] = useState(false);
  const [failedOrderDetails, setFailedOrderDetails] = useState<
    { menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }[]
  >([]);

  // OTP Cooldown Timer ticker / Socket connection for this table (shared across waiter call + session/order real-time updates)
  useEffect(() => {
    if (otpCooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldownRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldownRemaining]);
  const { socket } = useSocket(null);

  // Phase 7 Waiter Call States & Cooldown Timer
  const COOLDOWN_DURATION_SEC = 300; // 5-minute table cooldown window
  const [waiterCallState, setWaiterCallState] = useState<WaiterCallState>('idle');
  const [attendingStaffName, setAttendingStaffName] = useState<string | undefined>(undefined);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Initialize and sync waiter call cooldown from localStorage
  useEffect(() => {
    if (!restaurantSlug || !tableToken) return;
    const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
    const storedEnd = localStorage.getItem(cooldownKey);
    if (storedEnd) {
      const endMs = parseInt(storedEnd, 10);
      const now = Date.now();
      if (endMs > now) {
        setCooldownRemaining(Math.ceil((endMs - now) / 1000));
      } else {
        localStorage.removeItem(cooldownKey);
      }
    }
  }, [restaurantSlug, tableToken]);

  // Active countdown timer ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (restaurantSlug && tableToken) {
            const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
            localStorage.removeItem(cooldownKey);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining, restaurantSlug, tableToken]);

  // On mount fetch the current state once (handles page refresh while a call is active).
  // After that, all state transitions are driven by socket events — no polling.
  useEffect(() => {
    if (!tableToken) return;

    let cancelled = false;
    apiClient
      .get(`/public/tables/${tableToken}/waiter-call/active`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success && res.data.data) {
          const call = res.data.data;
          if (call.status === 'ACKNOWLEDGED') {
            setWaiterCallState('acknowledged');
            setAttendingStaffName(call.acknowledgedBy?.name || 'Captain');
          } else {
            setWaiterCallState('waiting');
            setAttendingStaffName(undefined);
          }
          // Compute server remaining cooldown (5 min window)
          if (call.createdAt) {
            const createdMs = new Date(call.createdAt).getTime();
            const remaining = Math.max(0, Math.ceil((createdMs + 5 * 60 * 1000 - Date.now()) / 1000));
            setCooldownRemaining(remaining);
          }
        } else {
          setWaiterCallState('idle');
          setAttendingStaffName(undefined);
        }
      })
      .catch(() => { /* silently ignore — socket will keep state current */ });

    return () => { cancelled = true; };
  }, [tableToken]);

  // Join the table socket room and listen for waiter call events & table state changes
  useEffect(() => {
    if (!socket || !tableToken) return;

    socket.emit('join_table', { tableToken });

    const handleWaiterCallCreated = (_data?: any) => {
      setWaiterCallState('waiting');
      setAttendingStaffName(undefined);
      setCooldownRemaining(COOLDOWN_DURATION_SEC); // 5 min cooldown window across all phones at this table
      if (restaurantSlug && tableToken) {
        const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
        localStorage.setItem(cooldownKey, String(Date.now() + COOLDOWN_DURATION_SEC * 1000));
      }
    };

    const handleWaiterCallResolved = (data?: any) => {
      const status = (data?.status || '').toUpperCase();
      if (status === 'ACKNOWLEDGED') {
        setWaiterCallState('acknowledged');
        setAttendingStaffName(data?.acknowledgedBy?.name || 'Captain');
      } else {
        // RESOLVED or EXPIRED or CANCELLED
        setWaiterCallState('idle');
        setAttendingStaffName(undefined);
        setCooldownRemaining(0);
        if (restaurantSlug && tableToken) {
          const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
          localStorage.removeItem(cooldownKey);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['activeWaiterCall', tableToken] });
    };

    const handleTableStateChanged = (_data?: any) => {
      // Instantly refresh table info and active session/orders when table is cleared/freed by staff
      queryClient.invalidateQueries({ queryKey: ['publicTable', restaurantSlug, tableToken] });
      queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
    };

    socket.on('waiter_call:created', handleWaiterCallCreated);
    socket.on('waiter_call:resolved', handleWaiterCallResolved);
    socket.on('waiter_call:acknowledged', handleWaiterCallResolved);
    socket.on('table:cleared', handleTableStateChanged);
    socket.on('table:updated', handleTableStateChanged);
    socket.on('session:updated', handleTableStateChanged);

    return () => {
      socket.off('waiter_call:created', handleWaiterCallCreated);
      socket.off('waiter_call:resolved', handleWaiterCallResolved);
      socket.off('waiter_call:acknowledged', handleWaiterCallResolved);
      socket.off('table:cleared', handleTableStateChanged);
      socket.off('table:updated', handleTableStateChanged);
      socket.off('session:updated', handleTableStateChanged);
    };
  }, [socket, tableToken, restaurantSlug, queryClient]);

  // Bottom Sheet States for Item Detail
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailSelectedAddOns, setDetailSelectedAddOns] = useState<AddOn[]>([]);
  const [detailSpecialInstructions, setDetailSpecialInstructions] = useState('');

  // Navigation refs
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);
  const isScrollingRef = useRef(false);

  // Debouncing Search Query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query table resolution (Theme and Core Details)
  const { data: tableData, error: tableError, isLoading: isTableLoading } = useQuery({
    queryKey: ['publicTable', restaurantSlug, tableToken],
    queryFn: () => publicService.resolveTable(restaurantSlug, tableToken!),
    enabled: !!tableToken,
    retry: false,
  });

  const activeSessionId = tableData?.success
    ? (tableData.data?.table?.activeSessionId || tableData.data?.session?._id || tableData.data?.activeSessionSummary?.sessionId || null)
    : null;

  const clearSessionMutation = useMutation({
    mutationFn: async () => {
      const url = restaurantSlug
        ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/clear-session`
        : `/public/table/${tableToken}/clear-session`;
      const res = await apiClient.post(url);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicTable'] });
      queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
    },
    onError: () => {
      // silently fail — user can retry
    },
  });

  // Fetch active session and its orders/rounds
  const { data: sessionDetailsData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['publicSessionDetails', activeSessionId, tableToken],
    queryFn: async () => {
      let url = `/public/table-sessions/${activeSessionId}`;
      if (tableToken) {
        url = restaurantSlug
          ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/session`
          : `/public/table/${tableToken}/session`;
      }
      const res = await apiClient.get(url);
      return res.data;
    },
    enabled: !!activeSessionId,
    refetchInterval: activeTab === 'cart-orders' && cartOrdersSubTab === 'orders' ? 5000 : false, // Poll session details while on orders tab
  });

  // Real-time socket updates for Public Session Details
  useEffect(() => {
    if (!socket || !activeSessionId || !sessionDetailsData?.success) return;

    // Join session room
    socket.emit('join_session', { sessionId: activeSessionId });

    // Join order rooms for all orders under the current session to get their item updates
    const orders = sessionDetailsData.data.orders || [];
    orders.forEach((order: any) => {
      socket.emit('join_order', { orderId: order._id });
    });

    const handleSessionUpdate = (data: { sessionId: string }) => {
      if (data.sessionId === activeSessionId) {
        queryClient.invalidateQueries({ queryKey: ['publicTable', restaurantSlug, tableToken] });
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
      }
    };

    const handleItemStatusUpdated = (data: { orderId: string }) => {
      const belongsToSession = orders.some((o: any) => o._id === data.orderId);
      if (belongsToSession) {
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails', activeSessionId] });
      }
    };

    const handleOrderStatusUpdated = (data: { orderId: string }) => {
      const belongsToSession = orders.some((o: any) => o._id === data.orderId);
      if (belongsToSession) {
        queryClient.invalidateQueries({ queryKey: ['publicSessionDetails', activeSessionId] });
      }
    };

    socket.on('session:updated', handleSessionUpdate);
    socket.on('order:item_status_updated', handleItemStatusUpdated);
    socket.on('order:status_updated', handleOrderStatusUpdated);

    return () => {
      socket.off('session:updated', handleSessionUpdate);
      socket.off('order:item_status_updated', handleItemStatusUpdated);
      socket.off('order:status_updated', handleOrderStatusUpdated);
    };
  }, [socket, activeSessionId, sessionDetailsData, queryClient, restaurantSlug, tableToken]);

  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});

  const toggleRound = (roundId: string) => {
    setExpandedRounds((prev) => {
      const current = prev[roundId] ?? true;
      return { ...prev, [roundId]: !current };
    });
  };

  // Query public menu
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getPublicMenu(restaurantSlug, tableToken!),
    enabled: !!tableToken,
    retry: false,
  });

  const restaurantId = tableData?.data?.restaurant?.id;
  const { data: taxesData } = useQuery({
    queryKey: ['publicTaxes', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/public/restaurants/${restaurantId}/taxes`);
      return res.data;
    },
    enabled: !!restaurantId,
  });
  const activeTaxes: any[] = taxesData?.data || [];

  // Verify and clear cart if tableToken is changed
  useEffect(() => {
    if (tableData?.success && tableToken && restaurantSlug) {
      setTable(restaurantSlug, tableToken);
    }
  }, [tableData, tableToken, restaurantSlug, setTable]);

  // Handle active category auto-scroll into horizontal nav view
  useEffect(() => {
    if (!activeCategoryId || !categoryNavRef.current) return;

    const frameId = requestAnimationFrame(() => {
      if (activePillRef.current && categoryNavRef.current) {
        const activePill = activePillRef.current;
        const navContainer = categoryNavRef.current;
        const containerWidth = navContainer.offsetWidth;
        const pillOffsetLeft = activePill.offsetLeft;
        const pillWidth = activePill.offsetWidth;

        navContainer.scrollTo({
          left: pillOffsetLeft - containerWidth / 2 + pillWidth / 2,
          behavior: 'smooth',
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeCategoryId]);

  // Scroll Spy logic with bottom-of-page and viewport detection
  useEffect(() => {
    if (activeTab !== 'menu') return;
    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const categoryElements = document.querySelectorAll('[data-category-section]');
      if (categoryElements.length === 0) return;

      // 1. Check if user is near the bottom of the page (within 140px)
      // When at bottom, always activate the last category section!
      const scrollPosition = window.innerHeight + window.scrollY;
      const totalHeight = document.documentElement.scrollHeight;
      if (scrollPosition >= totalHeight - 140) {
        const lastEl = categoryElements[categoryElements.length - 1] as HTMLElement;
        const lastId = lastEl.getAttribute('data-category-section') || '';
        if (lastId && lastId !== activeCategoryId) {
          setActiveCategoryId(lastId);
        }
        return;
      }

      // 2. Normal scroll: find which category section covers the top view area
      let currentActiveId = '';
      const topThreshold = 190;

      for (let i = 0; i < categoryElements.length; i++) {
        const el = categoryElements[i] as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top <= topThreshold) {
          currentActiveId = el.getAttribute('data-category-section') || '';
        }
      }

      // If at the very top and no section crossed topThreshold yet, default to first category
      if (!currentActiveId && categoryElements.length > 0) {
        currentActiveId = (categoryElements[0] as HTMLElement).getAttribute('data-category-section') || '';
      }

      if (currentActiveId && currentActiveId !== activeCategoryId) {
        setActiveCategoryId(currentActiveId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategoryId, activeTab]);

  const [repeatPromptItem, setRepeatPromptItem] = useState<{ item: MenuItem; configurations: any[] } | null>(null);
  const [removePromptItem, setRemovePromptItem] = useState<{ item: MenuItem; configurations: any[] } | null>(null);

  if (isTableLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const isError = !!tableError || !tableData?.success;
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 font-sans">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
            <AlertTriangle className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-normal text-slate-900">Unavailable</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              This restaurant or table isn't available right now. Please verify your QR code scan or request assistance from staff.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { restaurant, table } = tableData.data;
  const { theme, currency } = restaurant;

  // CSS variables for white-label styling
  const cssVariables = {
    '--theme-primary': theme.primaryColor || '#111827',
    '--theme-secondary': theme.secondaryColor || '#FFFFFF',
    '--theme-accent': theme.accentColor || '#F59E0B',
  } as React.CSSProperties;

  const publicUrl = typeof window !== 'undefined' ? window.location.href : '';

  const rawCategories: PublicCategory[] = menuData?.success ? menuData.data : [];

  // Filter and sort items dynamically for menu and search tabs
  const getFilteredMenu = () => {
    const allItems = rawCategories.flatMap((c) => c.menuItems);
    const fuse = new Fuse(allItems, {
      keys: ['name', 'description'],
      threshold: 0.4,
      ignoreLocation: true,
    });
    
    const searchResults = debouncedSearchQuery
      ? new Set(fuse.search(debouncedSearchQuery).map((r: any) => r.item._id))
      : null;

    return rawCategories
      .map((category) => {
        let matchedItems = category.menuItems.filter((item) => {
          // Search term match
          const matchesQuery = !debouncedSearchQuery || (searchResults && searchResults.has(item._id));

          // Diet filter
          const matchesDiet =
            dietFilter === 'all' ||
            (dietFilter === 'veg' && item.isVegetarian) ||
            (dietFilter === 'nonveg' && !item.isVegetarian);

          // Chef's special filter
          const matchesChefsSpecial = !chefsSpecialFilter || !!item.isChefsSpecial;

          // Availability check
          const matchesAvailability = !showAvailableOnly || item.isAvailable;

          return matchesQuery && matchesDiet && matchesAvailability && matchesChefsSpecial;
        });

        // Price Sorting
        if (priceSort === 'low-high') {
          matchedItems = [...matchedItems].sort((a, b) => a.price - b.price);
        } else if (priceSort === 'high-low') {
          matchedItems = [...matchedItems].sort((a, b) => b.price - a.price);
        }

        return {
          ...category,
          menuItems: matchedItems,
        };
      })
      .filter((category) => category.menuItems.length > 0);
  };

  const filteredCategories = getFilteredMenu();

  // Set initial active category once loaded
  if (!activeCategoryId && filteredCategories.length > 0) {
    setActiveCategoryId(filteredCategories[0]._id);
  }

  // Handle Category Pill Click
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const element = document.getElementById(`category-section-${categoryId}`);
    if (element) {
      isScrollingRef.current = true;
      const topOffset = element.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({
        top: topOffset,
        behavior: 'smooth',
      });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 600);
    }
  };

  // Open item bottom sheet
  const handleItemCardClick = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setSelectedItem(item);
    if (item.pricingType === 'PORTION' && item.variants && item.variants.length > 0) {
      const defaultV = item.variants.find((v) => v.isDefault) || item.variants[0];
      setSelectedVariant(defaultV);
    } else {
      setSelectedVariant(null);
    }
    setDetailQuantity(1);
    setDetailSelectedAddOns([]);
    setDetailSpecialInstructions('');
  };

  // Add-on check toggler
  const handleAddOnToggle = (addOn: AddOn) => {
    setDetailSelectedAddOns((prev) => {
      const exists = prev.some((x) => x.name === addOn.name);
      if (exists) {
        return prev.filter((x) => x.name !== addOn.name);
      }
      return [...prev, addOn];
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const isPortion = selectedItem.pricingType === 'PORTION' && selectedItem.variants && selectedItem.variants.length > 0;
    const chosenVariant = isPortion ? selectedVariant || selectedItem.variants![0] : null;
    const basePrice = chosenVariant ? chosenVariant.price : selectedItem.price;
    const nameToUse = chosenVariant ? `${selectedItem.name} (${chosenVariant.name})` : selectedItem.name;

    addItem({
      itemId: selectedItem._id,
      name: nameToUse,
      variantName: chosenVariant ? chosenVariant.name : undefined,
      basePrice,
      quantity: detailQuantity,
      selectedAddOns: detailSelectedAddOns,
      specialInstructions: detailSpecialInstructions,
    });

    setSelectedItem(null);
    setSelectedVariant(null);
  };

  // Helper to directly add a specific portion variant

  // Helper to compute total quantity of an item in cart
  const getItemCartQuantity = (itemId: string): number => {
    return cartItems
      .filter((ci) => ci.itemId === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  // Helper to directly add an item from the card
  const handleQuickAdd = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.isAvailable) return;

    const isPortion = item.pricingType === 'PORTION' && item.variants && item.variants.length > 0;
    const isCustomizable = isPortion || (item.addOns && item.addOns.length > 0);

    if (isCustomizable) {
      handleItemCardClick(item);
      return;
    }

    addItem({
      itemId: item._id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      selectedAddOns: [],
      specialInstructions: '',
    });
  };

  // Helper to increment an item already in cart
  const handleQuickIncrement = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const existingEntries = cartItems.filter((ci) => ci.itemId === item._id);
    if (existingEntries.length === 0) {
      handleQuickAdd(item, e);
      return;
    }

    const isPortion = item.pricingType === 'PORTION' && item.variants && item.variants.length > 0;
    const isCustomizable = isPortion || (item.addOns && item.addOns.length > 0);

    // If item is customizable, open prompt showing existing customizations
    if (isCustomizable) {
      setRepeatPromptItem({ item, configurations: existingEntries });
      return;
    }

    const target = existingEntries[0];
    updateQuantity(item._id, target.selectedAddOns, target.specialInstructions || '', 1, target.variantName);
  };

  // Helper to decrement an item from the card
  const handleQuickDecrement = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const existingEntries = cartItems.filter((ci) => ci.itemId === item._id);
    if (existingEntries.length === 0) return;

    // If there are multiple distinct customized configurations in cart, prompt user which to decrement/remove
    if (existingEntries.length > 1) {
      setRemovePromptItem({ item, configurations: existingEntries });
      return;
    }

    const target = existingEntries[0];
    updateQuantity(item._id, target.selectedAddOns, target.specialInstructions || '', -1, target.variantName);
  };

  // Main order submission worker
  const submitOrderPayload = async (name: string, phone: string, tokenOverride?: string | null) => {
    if (cartItems.length === 0 || isPlacingOrder) return;

    setIsPlacingOrder(true);
    setFailedOrderDetails([]);
    const idempotencyKey = getOrCreateIdempotencyKey();

    try {
      const payload = {
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          variantName: item.variantName,
          quantity: item.quantity,
          selectedAddOns: item.selectedAddOns.map((addon) => ({
            name: addon.name,
            priceDelta: addon.priceDelta,
          })),
          specialInstructions: item.specialInstructions || '',
        })),
        customerNote: customerNote.trim() || undefined,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        paymentStatus: 'PENDING',
        useLoyaltyPoints: !!useLoyaltyPoints,
      };

      const activeCustomerToken = tokenOverride !== undefined ? tokenOverride : customerToken;
      const res = await publicService.placeOrder(restaurantSlug, tableToken!, payload, {
        customerToken: activeCustomerToken,
        idempotencyKey,
      });

      if (res?.success) {
        const order = res.data;
        const finalizeOrderSuccess = (orderId: string) => {
          const key = `pixora_orders_${restaurantSlug || 'subdomain'}_${tableToken}`;
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          stored.push(orderId);
          localStorage.setItem(key, JSON.stringify(stored));

          resetIdempotencyKey();
          clearCart();
          queryClient.invalidateQueries({ queryKey: ['publicTable'] });
          queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
          setIsOtpModalOpen(false);
          setOtpDigits(['', '', '', '']);
          setOtpSent(false);
          setIsPlacingOrder(false);
          setIsRecoveringOrder(false);
          updateNavigationState('cart-orders', 'orders', orderId);
        };

        const activeProvider = tableData?.data?.restaurant?.settings?.paymentConfig?.activeProvider;

        if (activeProvider === 'RAZORPAY') {
          const isScriptLoaded = await loadRazorpay();
          if (!isScriptLoaded) {
            setIsPlacingOrder(false);
            return;
          }

          try {
            const intentUrl = restaurantSlug
              ? `/public/restaurants/${restaurantSlug}/tables/${tableToken}/payments/intent`
              : `/public/table/${tableToken}/payments/intent`;

            const intentRes = await apiClient.post(intentUrl, {
              amount: order.total,
              currency: 'INR',
              metadata: { orderId: order.id || order._id },
            });

            const { providerReferenceId, amount, currency: resCurrency, razorpayKeyId } = intentRes.data.data;

            const options = {
              key: razorpayKeyId,
              amount,
              currency: resCurrency,
              name: tableData?.data?.restaurant?.name,
              description: `Order #${order.orderNumber || ''}`,
              order_id: providerReferenceId,
              handler: function () {
                finalizeOrderSuccess(order.id || order._id);
              },
              prefill: { name, contact: phone },
              theme: { color: tableData?.data?.restaurant?.settings?.theme?.primaryColor || '#111827' },
              modal: {
                ondismiss: function () {
                  setIsPlacingOrder(false);
                  finalizeOrderSuccess(order.id || order._id);
                },
              },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          } catch (intentErr) {
            console.error('Payment intent error:', intentErr);
            finalizeOrderSuccess(order.id || order._id);
          }
        } else {
          finalizeOrderSuccess(order.id || order._id);
        }
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      const errResponse = err.response?.data?.error;

      if (errResponse?.code === 'ITEMS_UNAVAILABLE') {
        const failed = errResponse.details || [];
        setFailedOrderDetails(failed);
        setIsOtpModalOpen(false);
        setIsPlacingOrder(false);
      } else if (!err.response || err.code === 'ECONNABORTED') {
        // Network timeout / drop: Enter recovery state using idempotency
        setIsRecoveringOrder(true);

        // Polling recovery
        setTimeout(async () => {
          try {
            const sessionRes = await publicService.getTableSession(restaurantSlug, tableToken);
            if (sessionRes?.success && sessionRes.data?.orders?.length > 0) {
              const orders = sessionRes.data.orders;
              const latest = orders[orders.length - 1];
              resetIdempotencyKey();
              clearCart();
              queryClient.invalidateQueries({ queryKey: ['publicTable'] });
              queryClient.invalidateQueries({ queryKey: ['publicSessionDetails'] });
              setIsOtpModalOpen(false);
              setIsPlacingOrder(false);
              setIsRecoveringOrder(false);
              updateNavigationState('cart-orders', 'orders', latest.id || latest._id);
              return;
            }
          } catch {
            // Still unreachable
          }
          setIsPlacingOrder(false);
          setIsRecoveringOrder(false);
        }, 3000);
      } else {
        setIsPlacingOrder(false);
      }
    }
  };

  // Trigger checkout: 1-Tap for returning diners, or modal for new diners
  const handleCheckoutTrigger = () => {
    if (cartItems.length === 0) return;

    if (isCustomerAuthenticated && customer?.name && customer?.phone) {
      // Returning customer: 1-Tap place order without OTP
      submitOrderPayload(customer.name, customer.phone, customerToken);
    } else {
      // New diner: Open OTP verification modal
      setIsOtpModalOpen(true);
    }
  };

  // Send 4-Digit PIN
  const handleSendOtp = async () => {
    if (!customerName || customerName.trim().length === 0) return;
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) return;

    setIsSendingOtp(true);
    try {
      const res = await sendOtp(phoneNumber, restaurantSlug, restaurantId);
      if (res?.success) {
        setOtpSent(true);
        setOtpCooldownRemaining(res.data?.cooldownSeconds || 60);
      }
    } catch (err: any) {
      console.error('OTP send error:', err);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify 4-digit PIN and automatically submit order in one continuous action
  const handleVerifyOtpAndPlaceOrder = async () => {
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 4) return;

    setIsVerifyingOtp(true);
    try {
      const res = await verifyOtp(phoneNumber, otpCode, restaurantSlug, restaurantId, customerName);
      if (res?.success && res.data?.customerToken) {
        setIsVerifyingOtp(false);
        // Seamlessly place the order with the freshly minted customer token
        await submitOrderPayload(customerName, phoneNumber, res.data.customerToken);
      } else {
        setIsVerifyingOtp(false);
      }
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setIsVerifyingOtp(false);
    }
  };

  // Trigger public waiter assistance request directly by type
  const handleTriggerWaiterCall = async (type: WaiterRequestType) => {
    if (cooldownRemaining > 0) return;

    setSelectedRequestType(type);
    setWaiterCallState('pulsing');

    try {
      await apiClient.post(`/public/tables/${tableToken}/waiter-call`, {
        requestType: type,
      });
      queryClient.invalidateQueries({ queryKey: ['activeWaiterCall', tableToken] });

      // Start Cooldown Rate Limit
      const endMs = Date.now() + COOLDOWN_DURATION_SEC * 1000;
      const cooldownKey = `pixora_waiter_cooldown_${restaurantSlug}_${tableToken}`;
      localStorage.setItem(cooldownKey, endMs.toString());
      setCooldownRemaining(COOLDOWN_DURATION_SEC);

      // Add to recent log
      const key = `pixora_waiter_calls_${restaurantSlug}_${tableToken}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const newCall = {
        type: type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updated = [newCall, ...stored].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
      setRecentWaiterCalls(updated);

      setTimeout(() => {
        setWaiterCallState('waiting');
      }, 500);
    } catch (err: any) {
      console.error(err);
      setWaiterCallState('idle');
    }
  };

  // Trigger public waiter assistance request via modal
  const handleCallWaiterConfirm = async () => {
    setIsWaiterConfirmOpen(false);
    await handleTriggerWaiterCall(selectedRequestType);
  };

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let cartTaxTotal = 0;
  const cartTaxBreakdown: any[] = [];

  const taxesArr = activeTaxes || [];
  const groups = taxesArr.filter((t: any) => t.type === 'GROUP');
  const standardTaxes = taxesArr.filter((t: any) => t.type === 'TAX');

  for (const group of groups) {
    const subTaxes = standardTaxes.filter((t: any) => typeof t.groupId === 'string' ? t.groupId === group._id : t.groupId?._id === group._id);
    if (subTaxes.length === 0) continue;

    let groupAmount = 0;
    let groupPercentage = 0;
    const subTaxesBreakdown = subTaxes.map((st: any) => {
      const amt = Math.round(cartSubtotal * (st.percentage / 100));
      groupAmount += amt;
      groupPercentage += st.percentage;
      return { name: st.name, percentage: st.percentage, amount: amt };
    });

    cartTaxTotal += groupAmount;
    cartTaxBreakdown.push({
      name: group.name,
      percentage: groupPercentage,
      amount: groupAmount,
      subTaxes: subTaxesBreakdown
    });
  }

  const standaloneTaxes = standardTaxes.filter((t: any) => !t.groupId);
  for (const st of standaloneTaxes) {
    const amount = Math.round(cartSubtotal * (st.percentage / 100));
    cartTaxTotal += amount;
    cartTaxBreakdown.push({
      name: st.name,
      percentage: st.percentage,
      amount,
      subTaxes: []
    });
  }

  const cartGrandTotal = cartSubtotal + cartTaxTotal;

  const activeOrderCount = sessionDetailsData?.data?.orders?.length || 0;
  const activeOrdersIds = (sessionDetailsData?.data?.orders || []).map((o: any) => o._id);

  return (
    <div style={cssVariables} className="min-h-screen bg-slate-50 font-sans antialiased pb-20 relative">
      <Helmet>
        <title>{restaurant.name} - Digital Menu & Ordering</title>
        <meta name="description" content={restaurant.description || `View the digital menu and place your order at ${restaurant.name}.`} />
        <meta property="og:title" content={`${restaurant.name} - Digital Menu`} />
        <meta property="og:description" content={restaurant.description || `View the digital menu and place your order at ${restaurant.name}.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={publicUrl} />
        {restaurant.logoUrl && <meta property="og:image" content={restaurant.logoUrl} />}
        <link rel="canonical" href={publicUrl} />
      </Helmet>

      {/* ==================== SCREEN WRAPPERS ==================== */}

      {activeTab === 'landing' && (
        <LandingTab
          restaurant={restaurant}
          table={table}
          currency={currency}
          activeOrderCount={activeOrderCount}
          activeOrdersIds={activeOrdersIds}
          isCustomerAuthenticated={isCustomerAuthenticated}
          customer={customer}
          restaurantSlug={restaurantSlug}
          rawCategories={rawCategories}
          onExploreMenu={() => setActiveTab('menu')}
          onTrackOrders={(orderId) => updateNavigationState('cart-orders', 'orders', orderId)}
          onCategoryJump={(catId) => {
            setActiveTab('menu');
            setTimeout(() => handleCategoryClick(catId), 250);
          }}
        />
      )}

      {activeTab === 'menu' && (
        <MenuTab
          isMenuLoading={isMenuLoading}
          filteredCategories={filteredCategories}
          currency={currency}
          searchQuery={searchQuery}
          featureFlags={restaurant.featureFlags || []}
          debouncedSearchQuery={debouncedSearchQuery}
          dietFilter={dietFilter}
          priceSort={priceSort}
          activeCategoryId={activeCategoryId}
          activePillRef={activePillRef}
          categoryNavRef={categoryNavRef}
          activeOrderCount={activeOrderCount}
          activeOrdersIds={activeOrdersIds}
          cartItems={cartItems}
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          onDietFilterChange={setDietFilter}
          onPriceSortChange={setPriceSort}
          onCategoryClick={handleCategoryClick}
          onItemCardClick={handleItemCardClick}
          onQuickAdd={handleQuickAdd}
          onQuickIncrement={handleQuickIncrement}
          onQuickDecrement={handleQuickDecrement}
          chefsSpecialFilter={chefsSpecialFilter}
          onChefsSpecialFilterToggle={() => setChefsSpecialFilter((prev) => !prev)}
          onTrackOrders={(orderId) => updateNavigationState('cart-orders', 'orders', orderId)}
          getItemCartQuantity={getItemCartQuantity}
          getItemBadge={getItemBadge}
        />
      )}

      {activeTab === 'waiter' && (
        <WaiterTab
          selectedRequestType={selectedRequestType}
          waiterCallState={waiterCallState}
          attendingStaffName={attendingStaffName}
          cooldownRemaining={cooldownRemaining}
          recentWaiterCalls={recentWaiterCalls}
          onSelectRequestType={setSelectedRequestType}
          onTriggerWaiterCall={handleTriggerWaiterCall}
          onResetWaiterCallState={() => setWaiterCallState('idle')}
        />
      )}

      {activeTab === 'cart-orders' && (
        <CartOrdersTab
          cartOrdersSubTab={cartOrdersSubTab}
          cartItems={cartItems}
          currency={currency}
          activeOrderCount={activeOrderCount}
          activeSessionId={activeSessionId}
          isSessionLoading={isSessionLoading}
          sessionDetailsData={sessionDetailsData}
          isCustomerAuthenticated={isCustomerAuthenticated}
          customer={customer}
          isPlacingOrder={isPlacingOrder}
          isRecoveringOrder={isRecoveringOrder}
          failedOrderDetails={failedOrderDetails}
          customerNote={customerNote}
          useLoyaltyPoints={useLoyaltyPoints}
          onToggleLoyaltyPoints={toggleUseLoyaltyPoints}
          cartSubtotal={cartSubtotal}
          cartTaxBreakdown={cartTaxBreakdown}
          cartGrandTotal={cartGrandTotal}
          expandedRounds={expandedRounds}
          tableDisplayName={table.displayName}
          table={table}
          onSubTabChange={setCartOrdersSubTab}
          onUpdateQuantity={updateQuantity}
          onCustomerNoteChange={setCustomerNote}
          onCheckoutTrigger={handleCheckoutTrigger}
          onClearCart={() => setIsClearCartModalOpen(true)}
          onToggleRound={toggleRound}
          onViewBill={() => setIsViewBillModalOpen(true)}
          onClearSession={() => setIsClearSessionModalOpen(true)}
          onBrowseMenu={() => setActiveTab('menu')}
          onSwitchCustomer={switchCustomer}
        />
      )}

      {/* FLOATING CART BAR */}
      {(restaurant.featureFlags || []).some((f: any) => f.key === 'ordering' && f.enabled) && (
        <FloatingCartBar
          cartItems={cartItems}
          currency={currency}
          activeTab={activeTab}
          onViewCart={() => updateNavigationState('cart-orders', 'cart')}
        />
      )}

      {/* UNIFIED BOTTOM NAVIGATION */}
      <BottomNav
        activeTab={activeTab}
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        waiterCallState={waiterCallState}
        onTabChange={setActiveTab}
        featureFlags={restaurant.featureFlags || []}
      />

      {/* MODALS AND SHEETS */}
      <ConfirmModal
        isOpen={isWaiterConfirmOpen}
        title="Confirm Assistance Call?"
        message={`Would you like to request "${selectedRequestType.replace('_', ' ').toLowerCase()}" for Table ${table.tableNumber}?`}
        confirmText="Confirm Request"
        cancelText="Cancel"
        onConfirm={handleCallWaiterConfirm}
        onCancel={() => setIsWaiterConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearSessionModalOpen}
        title="Start New Session?"
        message="Are you sure you want to clear these orders and start a fresh session for this table? This cannot be undone."
        confirmText="Clear & Start New"
        cancelText="Cancel"
        onConfirm={() => {
          clearSessionMutation.mutate();
          setIsClearSessionModalOpen(false);
        }}
        onCancel={() => setIsClearSessionModalOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearCartModalOpen}
        title="Clear Basket?"
        message="Remove all items from your review list?"
        confirmText="Clear Basket"
        cancelText="Keep Items"
        onConfirm={() => {
          clearCart();
          setIsClearCartModalOpen(false);
        }}
        onCancel={() => setIsClearCartModalOpen(false)}
      />

      <ItemDetailSheet
        selectedItem={selectedItem}
        currency={currency}
        detailQuantity={detailQuantity}
        detailSelectedAddOns={detailSelectedAddOns}
        detailSpecialInstructions={detailSpecialInstructions}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
        onClose={() => {
          setSelectedItem(null);
          setSelectedVariant(null);
        }}
        onAddToCart={handleAddToCart}
        onAddOnToggle={handleAddOnToggle}
        onQuantityChange={setDetailQuantity}
        onInstructionsChange={setDetailSpecialInstructions}
        featureFlags={restaurant.featureFlags || []}
      />

      <OtpModal
        isOpen={isOtpModalOpen}
        isPlacingOrder={isPlacingOrder}
        isVerifyingOtp={isVerifyingOtp}
        isSendingOtp={isSendingOtp}
        otpSent={otpSent}
        customerName={customerName}
        phoneNumber={phoneNumber}
        otpDigits={otpDigits}
        otpCooldownRemaining={otpCooldownRemaining}
        tableDisplayName={table.displayName}
        otpInputRefs={otpInputRefs}
        onClose={() => setIsOtpModalOpen(false)}
        onNameChange={setCustomerName}
        onPhoneChange={setPhoneNumber}
        onSendOtp={handleSendOtp}
        onVerifyOtpAndPlaceOrder={handleVerifyOtpAndPlaceOrder}
        onOtpDigitsChange={setOtpDigits}
        onResetOtpSent={() => {
          setOtpSent(false);
          setOtpDigits(['', '', '', '']);
        }}
      />

      <ViewBillSheet
        isOpen={isViewBillModalOpen}
        sessionDetailsData={sessionDetailsData}
        currency={currency}
        tableDisplayName={table.displayName}
        isTaxBreakdownExpanded={isTaxBreakdownExpanded}
        onToggleTaxBreakdown={() => setIsTaxBreakdownExpanded(!isTaxBreakdownExpanded)}
        onClose={() => setIsViewBillModalOpen(false)}
      />

      {/* REPEAT CUSTOMIZATION PROMPT MODAL */}
      {repeatPromptItem && (() => {
        const activeConfigs = cartItems.filter((ci) => ci.itemId === repeatPromptItem.item._id);
        const configsToDisplay = activeConfigs.length > 0 ? activeConfigs : repeatPromptItem.configurations;

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-150 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Repeat Customization?
                </span>
                <button
                  onClick={() => setRepeatPromptItem(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-display text-lg font-bold text-slate-900 leading-tight">
                  {repeatPromptItem.item.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Select a previous customization to repeat, or customize a new one:
                </p>
              </div>

              {/* Configurations List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {configsToDisplay.map((cfg, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-amber-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cfg.variantName && (
                          <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                            {cfg.variantName}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {formatPrice(cfg.price, currency)}
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md font-mono">
                          in cart: {cfg.quantity}
                        </span>
                      </div>

                      {cfg.selectedAddOns && cfg.selectedAddOns.length > 0 && (
                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                          + {cfg.selectedAddOns.map((a: any) => a.name).join(', ')}
                        </p>
                      )}

                      {cfg.specialInstructions && (
                        <p className="text-[10px] text-amber-800 italic bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/50">
                          "{cfg.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        updateQuantity(
                          repeatPromptItem.item._id,
                          cfg.selectedAddOns,
                          cfg.specialInstructions || '',
                          1,
                          cfg.variantName
                        );
                        setRepeatPromptItem(null);
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs active:scale-95 transition whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Repeat (+1)
                    </button>
                  </div>
                ))}
              </div>

              {/* Choose New Customization Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const item = repeatPromptItem.item;
                    setRepeatPromptItem(null);
                    handleItemCardClick(item);
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>+ Choose New Customization</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* REMOVE CUSTOMIZATION PROMPT MODAL */}
      {removePromptItem && (() => {
        const activeConfigs = cartItems.filter((ci) => ci.itemId === removePromptItem.item._id);

        if (activeConfigs.length <= 1) {
          // If only 0 or 1 remains, close remove prompt modal
          setTimeout(() => setRemovePromptItem(null), 0);
          return null;
        }

        return (
          <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-150 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Remove Customization
                </span>
                <button
                  onClick={() => setRemovePromptItem(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-display text-lg font-bold text-slate-900 leading-tight">
                  {removePromptItem.item.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  You have multiple customizations of this item in your cart. Choose which one to remove or decrement:
                </p>
              </div>

              {/* Configurations List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {activeConfigs.map((cfg, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cfg.variantName && (
                          <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                            {cfg.variantName}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {formatPrice(cfg.price, currency)}
                        </span>
                      </div>

                      {cfg.selectedAddOns && cfg.selectedAddOns.length > 0 && (
                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                          + {cfg.selectedAddOns.map((a: any) => a.name).join(', ')}
                        </p>
                      )}

                      {cfg.specialInstructions && (
                        <p className="text-[10px] text-amber-800 italic bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/50">
                          "{cfg.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateQuantity(
                            removePromptItem.item._id,
                            cfg.selectedAddOns,
                            cfg.specialInstructions || '',
                            -1,
                            cfg.variantName
                          );
                        }}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition active:scale-90 cursor-pointer"
                        title="Remove 1"
                      >
                        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                      <span className="w-5 text-center font-mono font-black text-xs text-slate-800">
                        {cfg.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateQuantity(
                            removePromptItem.item._id,
                            cfg.selectedAddOns,
                            cfg.specialInstructions || '',
                            1,
                            cfg.variantName
                          );
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer"
                        title="Add 1"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRemovePromptItem(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition active:scale-95 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PublicTable;
