import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
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

export const ManagerInventory: React.FC = () => {
  const { activeRestaurantId = '' } = useAuth();
  const { toast } = useToast();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TRACKED_ONLY'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exactStockInput, setExactStockInput] = useState<Record<string, string>>({});

  const restaurantId = activeRestaurantId;

  // 1. Fetch Categories for Filter
  const { data: categoriesResponse } = useQuery({
    queryKey: ['managerCategories', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/categories`);
      return res.data;
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const categories: CategoryType[] = categoriesResponse?.success ? categoriesResponse.data : [];

  // 2. Fetch Menu Items with stock data
  const { data: menuResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['managerInventory', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  const items: MenuItemType[] = menuResponse?.success ? menuResponse.data : [];

  // 3. Stock Update Mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({
      itemId,
      isAvailable,
      stockQuantity,
      trackStock,
    }: {
      itemId: string;
      isAvailable?: boolean;
      stockQuantity?: number;
      trackStock?: boolean;
    }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/menu-items/${itemId}`, {
        isAvailable,
        stockQuantity,
        trackStock,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      toast(`Updated stock for "${data.data.name}"`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update stock', 'error');
    },
  });

  // Helpers
  const formatAmount = (paise: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
      (paise || 0) / 100
    );

  const getCategoryName = (catId?: { _id: string; name: string } | string) => {
    if (!catId) return 'General';
    if (typeof catId === 'object' && catId.name) return catId.name;
    const matched = categories.find((c) => c._id === catId);
    return matched ? matched.name : 'General';
  };

  const getCategoryId = (catId?: { _id: string; name: string } | string) => {
    if (!catId) return '';
    if (typeof catId === 'object' && catId._id) return catId._id;
    return catId as string;
  };

  // Feature Flag Gate
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

  // Filter Items
  const filteredItems = items.filter((item) => {
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

  // Calculate Metrics
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
    const newQty = Math.max(0, (item.stockQuantity || 0) + delta);
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
      stockQuantity: qty,
      isAvailable: qty > 0,
      trackStock: true,
    });
  };

  const handleSetExactStock = (item: MenuItemType) => {
    const raw = exactStockInput[item._id];
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) {
      toast('Enter a valid stock quantity', 'error');
      return;
    }
    handleSetStock(item, qty);
    setExactStockInput((prev) => {
      const next = { ...prev };
      delete next[item._id];
      return next;
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

  const handleBulkAction = async (action: '86' | 'available') => {
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        updateStockMutation.mutateAsync({
          itemId: id,
          isAvailable: action === 'available',
        })
      )
    );
    setSelectedIds(new Set());
    toast(`${ids.length} items updated`, 'success');
  };

  return (
    <div className="w-full space-y-6 font-sans select-none pb-12">
      {/* ── Top Header Card ── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-wider bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              Kitchen &amp; Stock Control
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
            Inventory &amp; Portion Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Monitor real-time item stock levels, set low-stock warning thresholds, and rapidly replenish stock to prevent ordering out-of-stock menu items.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="relative z-10 flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl transition active:scale-95 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Catalog Items */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Catalog Items</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Package className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-slate-900">{totalItems}</h3>
            <span className="text-[11px] text-slate-400 font-medium">total recipes</span>
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In-Stock Items</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-emerald-600">{inStockCount}</h3>
            <span className="text-[11px] text-emerald-700/70 font-medium">ready to order</span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-amber-600">{lowStockCount}</h3>
            <span className="text-[11px] text-amber-700/70 font-medium">&le; 5 portions left</span>
          </div>
        </div>

        {/* 86'd Out of Stock */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow transition">
          <div className="flex justify-between items-center text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">86'd Out of Stock</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-mono text-rose-600">{outOfStockCount}</h3>
            <span className="text-[11px] text-rose-700/70 font-medium">disabled in menu</span>
          </div>
        </div>
      </div>

      {/* ── Main Stock Control Table Card ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search recipe, dish name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
            />
          </div>

          {/* Filters & Bulk Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock State Filter */}
            <select
              value={stockFilter}
              onChange={(e: any) => setStockFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In-Stock Only</option>
              <option value="LOW_STOCK">Low Stock Alert (&le;5)</option>
              <option value="OUT_OF_STOCK">86'd Out of Stock</option>
              <option value="TRACKED_ONLY">Tracked Items Only</option>
            </select>

            {/* Bulk Action Pill */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm animate-in fade-in">
                <span>{selectedIds.size} selected</span>
                <button
                  onClick={() => handleBulkAction('available')}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-[11px]"
                >
                  Make Available
                </button>
                <button
                  onClick={() => handleBulkAction('86')}
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

        {/* Table Container */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader className="w-8 h-8 animate-spin text-slate-500 mb-2" strokeWidth={2} />
            <span className="text-xs font-semibold">Loading menu items and inventory...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Package className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
            <span className="text-sm font-bold text-slate-700">No menu items found</span>
            <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search term.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
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
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item._id)}
                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                          />
                        </td>

                        {/* Item Name & Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-5 h-5" strokeWidth={1.5} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block leading-tight truncate">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {catName}
                                </span>
                                {item.isVegetarian && (
                                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                    VEG
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {formatAmount(item.price)}
                        </td>

                        {/* Stock Mode Toggle */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() =>
                              updateStockMutation.mutate({
                                itemId: item._id,
                                trackStock: !isTracked,
                                stockQuantity: isTracked ? 0 : 25,
                              })
                            }
                            className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-xl uppercase transition shadow-sm ${
                              isTracked
                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isTracked ? 'TRACKED' : 'UNLIMITED'}
                          </button>
                        </td>

                        {/* Portions Remaining */}
                        <td className="py-3.5 px-4 text-center">
                          {isTracked ? (
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`font-mono text-sm font-black ${
                                  isOut
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-slate-900'
                                }`}
                              >
                                {qty}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">portions</span>
                            </div>
                          ) : (
                            <span className="font-mono text-base font-black text-slate-400">∞</span>
                          )}
                        </td>

                        {/* Live Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                              }`}
                            />
                            {isOut ? "86'D OUT" : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                          </span>
                        </td>

                        {/* Quick Replenish Controls */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isTracked ? (
                              <>
                                <button
                                  onClick={() => handleAdjustStock(item, -1)}
                                  disabled={updateStockMutation.isPending || qty <= 0}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-lg font-bold text-xs transition"
                                  title="Reduce 1"
                                >
                                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => handleAdjustStock(item, 1)}
                                  disabled={updateStockMutation.isPending}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition"
                                  title="Add 1"
                                >
                                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => handleSetStock(item, qty + 20)}
                                  disabled={updateStockMutation.isPending}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg transition shadow-sm"
                                  title="Add +20 portions"
                                >
                                  +20
                                </button>

                                {/* Direct Set Input */}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={exactStockInput[item._id] ?? ''}
                                    onChange={(e) =>
                                      setExactStockInput((p) => ({ ...p, [item._id]: e.target.value }))
                                    }
                                    placeholder="Qty"
                                    className="w-14 px-1.5 py-1 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 text-center font-bold"
                                  />
                                  <button
                                    onClick={() => handleSetExactStock(item)}
                                    disabled={
                                      exactStockInput[item._id] === undefined ||
                                      exactStockInput[item._id] === '' ||
                                      updateStockMutation.isPending
                                    }
                                    className="px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                                  >
                                    Set
                                  </button>
                                </div>
                              </>
                            ) : null}

                            {/* 86 Toggle */}
                            <button
                              onClick={() =>
                                updateStockMutation.mutate({
                                  itemId: item._id,
                                  isAvailable: !item.isAvailable,
                                })
                              }
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm ${
                                item.isAvailable
                                  ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {item.isAvailable ? "Mark 86'd" : 'Restore Item'}
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
    </div>
  );
};

export default ManagerInventory;
