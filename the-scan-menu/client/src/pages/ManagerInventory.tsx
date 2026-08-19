import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useSocket } from '../hooks/useSocket';
import apiClient from '../lib/api';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader,
  Plus,
  Minus,
  Search,
  Lock,
  RefreshCw,
  LayoutGrid,
  List,
  History as HistoryIcon,
  ClipboardList,
  TrendingDown,
  X,
  Sparkles,
} from 'lucide-react';

interface MenuItemType {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  categoryId?: { _id: string; name: string } | string;
  sortOrder?: number;
}

interface CategoryType {
  _id: string;
  name: string;
}

interface InventoryLogItem {
  _id: string;
  action: string;
  actorType: string;
  actorId?: { name: string; email: string; role: string };
  menuItemId?: { name: string; price: number; imageUrl?: string };
  previousQuantity?: number;
  newQuantity?: number;
  previousAvailability: boolean;
  newAvailability: boolean;
  orderId?: { orderNumber: number; total: number };
  reason?: string;
  costPaise?: number;
  notes?: string;
  createdAt: string;
}

type ViewMode = 'GRID' | 'TABLE';
type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TRACKED_ONLY';
type WasteReason = 'SPOILED' | 'DROPPED' | 'BURNT' | 'EXPIRED' | 'RETURNED' | 'OTHER';

export const ManagerInventory: React.FC = () => {
  const { activeRestaurantId = '', user } = useAuth();
  const { toast } = useToast();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const queryClient = useQueryClient();

  const token = localStorage.getItem('accessToken');
  const { socket } = useSocket(token);

  const restaurantId = activeRestaurantId;
  const isStaff = user?.role === 'STAFF';

  // Local UI state
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals & Drawers
  const [showStocktakeModal, setShowStocktakeModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [wasteTargetItem, setWasteTargetItem] = useState<MenuItemType | null>(null);
  const [wasteQuantity, setWasteQuantity] = useState<string>('1');
  const [wasteReason, setWasteReason] = useState<WasteReason>('SPOILED');
  const [wasteNotes, setWasteNotes] = useState<string>('');

  // Stocktake Sheet Draft State { [itemId]: countedQty }
  const [stocktakeDraft, setStocktakeDraft] = useState<Record<string, number>>({});

  // History Filter
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('ALL');

  // Input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['managerCategories', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/categories`);
      return res.data;
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const categories: CategoryType[] = useMemo(
    () => (categoriesResponse?.success ? categoriesResponse.data : []),
    [categoriesResponse]
  );

  // 2. Fetch Menu Items with stock data
  const { data: menuResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['managerInventory', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  const items: MenuItemType[] = useMemo(
    () => (menuResponse?.success ? menuResponse.data : []),
    [menuResponse]
  );

  // 3. Fetch Inventory Summary (Metrics & Waste Cost)
  const { data: summaryResponse } = useQuery({
    queryKey: ['inventorySummary', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/inventory/summary`);
      return res.data;
    },
    enabled: !!restaurantId && isEnabled('inventory'),
    staleTime: 30_000,
  });

  const summary = summaryResponse?.success ? summaryResponse.data : null;

  // 4. Fetch Inventory Audit Logs for History Drawer
  const { data: logsResponse, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['inventoryLogs', restaurantId, historyActionFilter],
    queryFn: async () => {
      const actionParam = historyActionFilter !== 'ALL' ? `&action=${historyActionFilter}` : '';
      const res = await apiClient.get(`/restaurants/${restaurantId}/inventory/logs?limit=50${actionParam}`);
      return res.data;
    },
    enabled: !!restaurantId && showHistoryDrawer,
  });

  const logs: InventoryLogItem[] = logsResponse?.success ? logsResponse.data.logs : [];

  // ── Real-Time Socket.IO Live Synchronization ──
  useEffect(() => {
    if (!socket || !restaurantId) return;

    const handleInventoryUpdated = (payload: any) => {
      queryClient.setQueryData(['managerInventory', restaurantId], (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;
        return {
          ...oldData,
          data: oldData.data.map((item: MenuItemType) => {
            if (item._id === payload.itemId) {
              return {
                ...item,
                isAvailable: payload.data.isAvailable !== undefined ? payload.data.isAvailable : item.isAvailable,
                stockQuantity: payload.data.stockQuantity !== undefined ? payload.data.stockQuantity : item.stockQuantity,
                trackStock: payload.data.trackStock !== undefined ? payload.data.trackStock : item.trackStock,
                lowStockThreshold: payload.data.lowStockThreshold !== undefined ? payload.data.lowStockThreshold : item.lowStockThreshold,
              };
            }
            return item;
          }),
        };
      });

      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventoryLogs', restaurantId] });
    };

    socket.on('inventory:updated', handleInventoryUpdated);

    return () => {
      socket.off('inventory:updated', handleInventoryUpdated);
    };
  }, [socket, restaurantId, queryClient]);

  // ── Global Keyboard Shortcuts (/ to search, Esc to clear) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Mutations ──

  // Single Item Stock Update
  const updateStockMutation = useMutation({
    mutationFn: async ({
      itemId,
      isAvailable,
      stockQuantity,
      trackStock,
      lowStockThreshold,
    }: {
      itemId: string;
      isAvailable?: boolean;
      stockQuantity?: number;
      trackStock?: boolean;
      lowStockThreshold?: number;
    }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/menu-items/${itemId}/stock`, {
        isAvailable,
        stockQuantity,
        trackStock,
        lowStockThreshold,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      toast(`Updated stock for "${data.data.name}"`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update stock', 'error');
    },
  });

  // Fast Availability Toggle (86ing)
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/menu-items/${itemId}/availability`, {
        isAvailable,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      toast(
        data.data.isAvailable ? `"${data.data.name}" marked AVAILABLE` : `"${data.data.name}" marked 86'd OUT`,
        'success'
      );
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to toggle availability', 'error');
    },
  });

  // Bulk Availability Action
  const bulkAvailabilityMutation = useMutation({
    mutationFn: async ({ itemIds, isAvailable }: { itemIds: string[]; isAvailable: boolean }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/menu-items-bulk-availability`, {
        itemIds,
        isAvailable,
      });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      setSelectedIds(new Set());
      toast(`${vars.itemIds.length} items marked ${vars.isAvailable ? 'AVAILABLE' : '86\'d'}`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed bulk update', 'error');
    },
  });

  // Batch Stocktake Commit Mutation
  const batchStocktakeMutation = useMutation({
    mutationFn: async (adjustments: Array<{ itemId: string; stockQuantity: number; notes?: string }>) => {
      const res = await apiClient.post(`/restaurants/${restaurantId}/inventory/batch-adjust`, {
        adjustments,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      setShowStocktakeModal(false);
      setStocktakeDraft({});
      toast(data.message || 'Daily stocktake committed successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to commit stocktake', 'error');
    },
  });

  // Log Waste Mutation
  const logWasteMutation = useMutation({
    mutationFn: async (payload: { itemId: string; quantity: number; reason: string; notes?: string }) => {
      const res = await apiClient.post(`/restaurants/${restaurantId}/inventory/waste`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary', restaurantId] });
      setShowWasteModal(false);
      setWasteTargetItem(null);
      setWasteQuantity('1');
      setWasteNotes('');
      toast('Food waste recorded and deducted from stock', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to log waste', 'error');
    },
  });

  // Helpers
  const formatAmount = (paise: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      (paise || 0) / 100
    );

  const getCategoryName = useCallback((catId?: { _id: string; name: string } | string) => {
    if (!catId) return 'General';
    if (typeof catId === 'object' && catId.name) return catId.name;
    const matched = categories.find((c) => c._id === catId);
    return matched ? matched.name : 'General';
  }, [categories]);

  const getCategoryId = useCallback((catId?: { _id: string; name: string } | string) => {
    if (!catId) return '';
    if (typeof catId === 'object' && catId._id) return catId._id;
    return catId as string;
  }, []);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const catName = getCategoryName(item.categoryId);
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        catName.toLowerCase().includes(searchTerm.toLowerCase());

      const itemCatId = getCategoryId(item.categoryId);
      const matchesCategory = selectedCategory === 'ALL' || itemCatId === selectedCategory;

      const threshold = item.lowStockThreshold || 5;
      const isTracked = !!item.trackStock;
      const isLowStock = isTracked && item.stockQuantity > 0 && item.stockQuantity <= threshold;
      const isOutOfStock = !item.isAvailable || (isTracked && item.stockQuantity <= 0);
      const isInStock = item.isAvailable && (!isTracked || item.stockQuantity > threshold);

      let matchesFilter = true;
      if (stockFilter === 'IN_STOCK') matchesFilter = isInStock;
      else if (stockFilter === 'LOW_STOCK') matchesFilter = isLowStock;
      else if (stockFilter === 'OUT_OF_STOCK') matchesFilter = isOutOfStock;
      else if (stockFilter === 'TRACKED_ONLY') matchesFilter = isTracked;

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [items, searchTerm, selectedCategory, stockFilter, getCategoryName, getCategoryId]);

  // Metrics
  const totalItems = items.length;
  const inStockCount = items.filter(
    (i) => i.isAvailable && (!i.trackStock || i.stockQuantity > (i.lowStockThreshold || 5))
  ).length;
  const lowStockCount = items.filter(
    (i) => i.trackStock && i.stockQuantity > 0 && i.stockQuantity <= (i.lowStockThreshold || 5)
  ).length;
  const outOfStockCount = items.filter((i) => !i.isAvailable || (i.trackStock && i.stockQuantity <= 0)).length;

  // Handlers
  const handleAdjustStock = (item: MenuItemType, delta: number) => {
    const current = item.stockQuantity || 0;
    const newQty = Math.max(0, current + delta);
    updateStockMutation.mutate({
      itemId: item._id,
      stockQuantity: newQty,
      isAvailable: newQty > 0,
      trackStock: true,
    });
  };

  const handleSetStock = (item: MenuItemType, qty: number) => {
    updateStockMutation.mutate({
      itemId: item._id,
      stockQuantity: Math.max(0, qty),
      isAvailable: qty > 0,
      trackStock: true,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenStocktakeModal = () => {
    const initial: Record<string, number> = {};
    items.filter((i) => i.trackStock).forEach((i) => {
      initial[i._id] = i.stockQuantity;
    });
    setStocktakeDraft(initial);
    setShowStocktakeModal(true);
  };

  const handleOpenWasteModal = (item?: MenuItemType) => {
    setWasteTargetItem(item || (items.length > 0 ? items[0] : null));
    setWasteQuantity('1');
    setWasteReason('SPOILED');
    setWasteNotes('');
    setShowWasteModal(true);
  };

  const handleCommitStocktake = () => {
    const adjustments = Object.entries(stocktakeDraft).map(([itemId, stockQuantity]) => ({
      itemId,
      stockQuantity,
      notes: 'Daily physical count stocktake',
    }));
    batchStocktakeMutation.mutate(adjustments);
  };

  const handleCommitWaste = () => {
    if (!wasteTargetItem) return;
    const qty = parseInt(wasteQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast('Please enter a valid waste quantity', 'error');
      return;
    }
    logWasteMutation.mutate({
      itemId: wasteTargetItem._id,
      quantity: qty,
      reason: wasteReason,
      notes: wasteNotes,
    });
  };

  // Feature Flag Gate Check
  if (flagsLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center font-sans text-slate-500">
        <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" strokeWidth={2} />
        <span className="text-xs font-semibold">Loading stock controls...</span>
      </div>
    );
  }

  if (!isEnabled('inventory')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
            <Lock className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Inventory Tracking Locked</h3>
          <p className="text-slate-500 max-w-md mx-auto text-xs leading-relaxed">
            Inventory & portion tracking is not enabled for your subscription plan. Please upgrade to manage portion reserves and automatic 86ing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 font-sans select-none pb-16">
      {/* ── TOP HERO CARD ── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-7 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-wider bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              Kitchen &amp; Floor Operations
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Socket Sync
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
            Inventory &amp; Stock Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Real-time portion reserves, instant 1-tap 86ing, physical stocktake audits, and waste tracking synchronized across Counter POS, QR Menus, and KDS.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="relative z-10 flex items-center gap-2 flex-wrap shrink-0">
          {/* Stocktake Audit Sheet Button (Manager only) */}
          {!isStaff && (
            <button
              onClick={handleOpenStocktakeModal}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition active:scale-95 shadow-sm"
              title="Perform daily opening/closing physical count audit"
            >
              <ClipboardList className="w-4 h-4" strokeWidth={2.2} />
              <span>Stocktake Sheet</span>
            </button>
          )}

          {/* Log Waste Button */}
          <button
            onClick={() => handleOpenWasteModal()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
            title="Record dropped plates, spoilage, or kitchen waste"
          >
            <TrendingDown className="w-4 h-4 text-rose-400" strokeWidth={2} />
            <span>Log Waste {summary?.totalWasteValuePaise ? `(${formatAmount(summary.totalWasteValuePaise)})` : ''}</span>
          </button>

          {/* Audit History Drawer Button */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
            title="View complete audit trail of who changed stock and order deductions"
          >
            <HistoryIcon className="w-4 h-4 text-amber-400" strokeWidth={2} />
            <span className="hidden sm:inline">Movement Log</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl transition active:scale-95"
            title="Force refresh catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Catalog Items */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Catalog Recipes</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
              <Package className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-slate-900">{totalItems}</h3>
            <span className="text-[10px] text-slate-400 font-medium">total dishes</span>
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In-Stock Portions</span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-emerald-600">{inStockCount}</h3>
            <span className="text-[10px] text-emerald-700/70 font-medium">active for ordering</span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-amber-600">{lowStockCount}</h3>
            <span className="text-[10px] text-amber-700/70 font-medium">&le; 5 portions left</span>
          </div>
        </div>

        {/* 86'd Out of Stock */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex justify-between items-center text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">86'd Out of Stock</span>
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-rose-600">{outOfStockCount}</h3>
            <span className="text-[10px] text-rose-700/70 font-medium">disabled in POS/QR</span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
        {/* TOP TOOLBAR: POS-STYLE SEARCH + CATEGORY CHIPS + VIEW TOGGLE */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* FULL-WIDTH POS SEARCH INPUT */}
            <div className="relative flex-1 max-w-md group">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-amber-500 transition-colors pointer-events-none"
                strokeWidth={2}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search dish or category... (Press / to search)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 border-2 border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-2xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTerm ? (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* CONTROLS: STOCK FILTER + VIEW MODE SWITCHER */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Stock Status Selector */}
              <select
                value={stockFilter}
                onChange={(e: any) => setStockFilter(e.target.value)}
                className="px-3 py-2 border-2 border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Stock States</option>
                <option value="IN_STOCK">In-Stock Only</option>
                <option value="LOW_STOCK">Low Stock Alert (&le;5)</option>
                <option value="OUT_OF_STOCK">86'd Out of Stock</option>
                <option value="TRACKED_ONLY">Tracked Portions Only</option>
              </select>

              {/* View Mode Toggle: Grid vs Table */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'GRID' ? 'bg-white text-slate-950 shadow-xs font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="POS Cards Grid View"
                >
                  <LayoutGrid className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'TABLE' ? 'bg-white text-slate-950 shadow-xs font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Operations Table View"
                >
                  <List className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {/* Bulk Action Pill */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm animate-in fade-in">
                  <span>{selectedIds.size} selected</span>
                  <button
                    onClick={() =>
                      bulkAvailabilityMutation.mutate({
                        itemIds: Array.from(selectedIds),
                        isAvailable: true,
                      })
                    }
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-[11px]"
                  >
                    Make Available
                  </button>
                  <button
                    onClick={() =>
                      bulkAvailabilityMutation.mutate({
                        itemIds: Array.from(selectedIds),
                        isAvailable: false,
                      })
                    }
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition text-[11px]"
                  >
                    Mark 86'd
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-slate-400 hover:text-white px-1 font-mono"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* HORIZONTAL CATEGORY CHIPS BAR (Matching Counter POS) */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Categories ({items.length})
              </button>
              {categories.map((cat) => {
                const catCount = items.filter((item) => {
                  const itemCatId = getCategoryId(item.categoryId);
                  return itemCatId === cat._id;
                }).length;

                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5 ${
                      selectedCategory === cat._id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        selectedCategory === cat._id ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {catCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CONTENT AREA ── */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" strokeWidth={2} />
            <span className="text-xs font-semibold">Loading dishes and live stock reserves...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
            <span className="text-sm font-bold text-slate-700">No dishes match your filter</span>
            <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search term.</p>
          </div>
        ) : viewMode === 'GRID' ? (
          /* ─────────────────────────────────────────────────────────────
             VIEW 1: POS-STYLE HIGH-SPEED VISUAL CARDS GRID
             ───────────────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const isTracked = !!item.trackStock;
              const qty = item.stockQuantity || 0;
              const threshold = item.lowStockThreshold || 5;
              const isLow = isTracked && qty > 0 && qty <= threshold;
              const isOut = !item.isAvailable || (isTracked && qty <= 0);
              const isSelected = selectedIds.has(item._id);
              const catName = getCategoryName(item.categoryId);

              return (
                <div
                  key={item._id}
                  className={`bg-white rounded-2xl border-2 transition-all p-4 flex flex-col justify-between relative shadow-2xs hover:shadow-sm ${
                    isOut
                      ? 'border-rose-200 bg-rose-50/20'
                      : isLow
                      ? 'border-amber-200 bg-amber-50/20'
                      : isSelected
                      ? 'border-amber-500 bg-amber-50/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Item Row */}
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item._id)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        />
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-semibold truncate">
                              {catName}
                            </span>
                            {item.isVegetarian && (
                              <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                VEG
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Live Status Pill */}
                      <span
                        className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                          isOut
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isOut ? "86'D OUT" : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Middle: Stock Portion Display Meter */}
                    <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">Portions Reserve</span>
                      {isTracked ? (
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-xl font-black font-mono ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {qty}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">portions</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                          ∞ Unlimited
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Fast POS Replenish Preset Buttons & 86 Toggle */}
                  <div className="space-y-2 pt-2 border-t border-slate-150">
                    {isTracked ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item, -1)}
                          disabled={updateStockMutation.isPending || qty <= 0}
                          className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl font-bold transition active:scale-95"
                          title="Reduce 1 portion"
                        >
                          <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item, 1)}
                          disabled={updateStockMutation.isPending}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition active:scale-95"
                          title="Add 1 portion"
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>

                        {/* Quick Presets: +10, +20 */}
                        <button
                          type="button"
                          onClick={() => handleSetStock(item, qty + 10)}
                          disabled={updateStockMutation.isPending}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-700 font-mono font-black text-xs rounded-xl transition active:scale-95"
                          title="Quick add 10 portions"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStock(item, qty + 20)}
                          disabled={updateStockMutation.isPending}
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs rounded-xl transition active:scale-95 shadow-xs"
                          title="Quick add 20 portions"
                        >
                          +20
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          updateStockMutation.mutate({
                            itemId: item._id,
                            trackStock: true,
                            stockQuantity: 25,
                          })
                        }
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        Enable Portion Tracking
                      </button>
                    )}

                    {/* Bottom Utility Row: 86 Toggle + Waste Link */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAvailabilityMutation.mutate({
                            itemId: item._id,
                            isAvailable: !item.isAvailable,
                          })
                        }
                        disabled={toggleAvailabilityMutation.isPending}
                        className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs ${
                          item.isAvailable
                            ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {item.isAvailable ? "Mark 86'd" : 'Restore Item'}
                      </button>

                      {/* Fast Waste Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenWasteModal(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Log food waste for this dish"
                      >
                        <TrendingDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             VIEW 2: DENSE OPERATIONS DATA TABLE
             ───────────────────────────────────────────────────────────── */
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] font-black tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filteredItems.map((i) => i._id)));
                          else setSelectedIds(new Set());
                        }}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                    </th>
                    <th className="py-3 px-4">Menu Item</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock Mode</th>
                    <th className="py-3 px-4 text-center">Portions Left</th>
                    <th className="py-3 px-4 text-center">Live Status</th>
                    <th className="py-3 px-4 text-right">Quick Replenish &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isTracked = !!item.trackStock;
                    const qty = item.stockQuantity || 0;
                    const threshold = item.lowStockThreshold || 5;
                    const isLow = isTracked && qty > 0 && qty <= threshold;
                    const isOut = !item.isAvailable || (isTracked && qty <= 0);
                    const isSelected = selectedIds.has(item._id);
                    const catName = getCategoryName(item.categoryId);

                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          isSelected ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item._id)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-4 h-4" strokeWidth={1.5} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{catName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {formatAmount(item.price)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              updateStockMutation.mutate({
                                itemId: item._id,
                                trackStock: !isTracked,
                                stockQuantity: isTracked ? 0 : 25,
                              })
                            }
                            className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-xl uppercase transition ${
                              isTracked
                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isTracked ? 'TRACKED' : 'UNLIMITED'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isTracked ? (
                            <span
                              className={`font-mono text-sm font-black ${
                                isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {qty}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-bold">∞</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isOut ? "86'D OUT" : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isTracked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(item, -1)}
                                  disabled={updateStockMutation.isPending || qty <= 0}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-lg font-bold"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustStock(item, 1)}
                                  disabled={updateStockMutation.isPending}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetStock(item, qty + 20)}
                                  disabled={updateStockMutation.isPending}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg"
                                >
                                  +20
                                </button>
                              </>
                            )}

                            {/* 86 Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleAvailabilityMutation.mutate({
                                  itemId: item._id,
                                  isAvailable: !item.isAvailable,
                                })
                              }
                              className={`px-2.5 py-1 rounded-xl font-bold text-xs transition ${
                                item.isAvailable
                                  ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {item.isAvailable ? "86'd" : 'Restore'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
         MODAL 1: DAILY STOCKTAKE SHEET (PHYSICAL AUDIT)
         ───────────────────────────────────────────────────────────── */}
      {showStocktakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <ClipboardList className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Daily Physical Stocktake Sheet</h3>
                  <p className="text-xs text-slate-400">
                    Enter physical counts to calculate variances and commit atomic batch updates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStocktakeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Only items with <strong>Stock Tracking Enabled</strong> appear on the audit sheet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const filled: Record<string, number> = {};
                    items.filter((i) => i.trackStock).forEach((i) => {
                      filled[i._id] = i.stockQuantity;
                    });
                    setStocktakeDraft(filled);
                  }}
                  className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-[11px] whitespace-nowrap"
                >
                  Fill Expected Values
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] font-black border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Dish Name</th>
                      <th className="py-2.5 px-4 text-center">Expected Stock</th>
                      <th className="py-2.5 px-4 text-center">Physical Count</th>
                      <th className="py-2.5 px-4 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items
                      .filter((i) => i.trackStock)
                      .map((item) => {
                        const expected = item.stockQuantity;
                        const counted = stocktakeDraft[item._id] ?? expected;
                        const diff = counted - expected;

                        return (
                          <tr key={item._id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                              {expected}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                value={stocktakeDraft[item._id] ?? ''}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setStocktakeDraft((p) => ({
                                    ...p,
                                    [item._id]: isNaN(val) ? 0 : Math.max(0, val),
                                  }));
                                }}
                                className="w-20 px-2 py-1.5 border-2 border-slate-200 rounded-xl font-mono text-center font-bold text-xs focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-full ${
                                  diff > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : diff < 0
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {diff > 0 ? `+${diff} Over` : diff < 0 ? `${diff} Short` : 'Exact'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {Object.keys(stocktakeDraft).length} items in audit draft
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStocktakeModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitStocktake}
                  disabled={batchStocktakeMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
                >
                  {batchStocktakeMutation.isPending && <Loader className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Stocktake</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         MODAL 2: LOG FOOD WASTE & SPOILAGE
         ───────────────────────────────────────────────────────────── */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 bg-rose-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <TrendingDown className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Log Food Waste</h3>
                  <p className="text-xs text-rose-300">Deduct spoiled, dropped, or burnt portions.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWasteModal(false)}
                className="p-1.5 rounded-xl text-rose-300 hover:text-white hover:bg-rose-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Item Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Menu Item</label>
                <select
                  value={wasteTargetItem?._id || ''}
                  onChange={(e) => {
                    const matched = items.find((i) => i._id === e.target.value);
                    setWasteTargetItem(matched || null);
                  }}
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.name} ({formatAmount(i.price)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Wasted Portions Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Waste</label>
                <select
                  value={wasteReason}
                  onChange={(e: any) => setWasteReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="SPOILED">Spoiled / Expired</option>
                  <option value="DROPPED">Dropped / Damaged</option>
                  <option value="BURNT">Kitchen Prep / Burnt</option>
                  <option value="RETURNED">Customer Return</option>
                  <option value="OTHER">Other / Spillage</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Optional Notes</label>
                <textarea
                  rows={2}
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  placeholder="e.g. dropped tray during floor shift"
                  className="w-full px-3.5 py-2 border-2 border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowWasteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitWaste}
                disabled={logWasteMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition active:scale-95 shadow-sm"
              >
                {logWasteMutation.isPending && <Loader className="w-3.5 h-3.5 animate-spin" />}
                <span>Record Waste</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         DRAWER: STOCK MOVEMENT & AUDIT HISTORY
         ───────────────────────────────────────────────────────────── */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl border-l border-slate-200">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-slate-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <HistoryIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Stock Movement Log</h3>
                  <p className="text-xs text-slate-400">Complete audit trail of stock adjustments &amp; deductions.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <select
                value={historyActionFilter}
                onChange={(e) => setHistoryActionFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="ORDER_DECREMENT">Order Decrement</option>
                <option value="ORDER_RESTORE">Order Cancel Restoral</option>
                <option value="STOCK_ADJUSTMENT">Manual Adjustment</option>
                <option value="AUTO_86">Auto 86 on Zero</option>
                <option value="BATCH_STOCKTAKE">Batch Stocktake</option>
                <option value="WASTE_LOG">Food Waste</option>
              </select>

              <button
                type="button"
                onClick={() => refetchLogs()}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl bg-white border border-slate-200"
                title="Refresh audit logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drawer Body Logs List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
              {isLoadingLogs ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                  <span className="text-xs">Loading audit logs...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No stock movement logs recorded yet.
                </div>
              ) : (
                logs.map((log) => {
                  return (
                    <div
                      key={log._id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {log.menuItemId?.name || 'Menu Item'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                            log.action === 'ORDER_DECREMENT'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : log.action === 'ORDER_RESTORE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.action === 'WASTE_LOG'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {log.action.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-medium">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {log.previousQuantity ?? '-'} &rarr; <strong>{log.newQuantity ?? '-'}</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          by <strong>{log.actorId?.name || log.actorType}</strong>
                        </span>
                      </div>

                      {log.reason && (
                        <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200/60">
                          {log.reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerInventory;
