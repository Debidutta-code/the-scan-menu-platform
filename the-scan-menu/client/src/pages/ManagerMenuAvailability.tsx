import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { apiClient } from '../lib/api';
import { Leaf, Flame, FolderOpen, ToggleLeft, ToggleRight, Lock, Layers, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * ManagerMenuAvailability — STAFF-safe item availability view with Search & All Dishes.
 *
 * This page renders a read-only list of menu categories and their items.
 * Each item exposes only its availability toggle (86-ing), with NO edit,
 * delete, or pricing controls visible. It is intentionally separate from
 * ManagerMenu.tsx which is MANAGER-only.
 */
export const ManagerMenuAvailability: React.FC = () => {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { activeRestaurantId } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const inventoryEnabled = isEnabled('qr_menu');

  // Fetch categories — disabled when flag is off or no restaurantId
  const { data: catResponse, isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/categories`);
      return res.data;
    },
    enabled: !!activeRestaurantId && inventoryEnabled && !flagsLoading,
  });

  const categories: any[] = useMemo(() => catResponse?.data || [], [catResponse]);

  // Fetch all menu items for instant search and seamless category navigation
  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: ['menuItems', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!activeRestaurantId && inventoryEnabled && !flagsLoading,
  });

  const allMenuItems: any[] = useMemo(() => itemsResponse?.data || [], [itemsResponse]);

  // Filtered menu items based on category and search query
  const filteredMenuItems = useMemo(() => {
    let list = allMenuItems;

    if (selectedCatId && selectedCatId !== 'ALL') {
      list = list.filter((item: any) => {
        const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
        return cId === selectedCatId;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item: any) => {
        const catName = typeof item.categoryId === 'object' 
          ? item.categoryId?.name 
          : categories.find((c: any) => c._id === item.categoryId)?.name || '';
        return (
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          catName?.toLowerCase().includes(q) ||
          item.variants?.some((v: any) => v.name?.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [allMenuItems, selectedCatId, searchQuery, categories]);

  // Category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allMenuItems) {
      const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
      if (cId) {
        counts[cId] = (counts[cId] || 0) + 1;
      }
    }
    return counts;
  }, [allMenuItems]);

  // Stats
  const availableCount = useMemo(() => allMenuItems.filter((i) => i.isAvailable).length, [allMenuItems]);
  const unavailableCount = useMemo(() => allMenuItems.filter((i) => !i.isAvailable).length, [allMenuItems]);

  // Optimistic availability toggle — shares cache keys with ManagerMenu.tsx
  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/restaurants/${activeRestaurantId}/menu-items/${id}/availability`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', activeRestaurantId] });
      const previous = queryClient.getQueryData(['menuItems', activeRestaurantId]);
      queryClient.setQueryData(
        ['menuItems', activeRestaurantId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item: any) =>
              item._id === id ? { ...item, isAvailable: !item.isAvailable } : item
            ),
          };
        }
      );
      return { previous };
    },
    onError: (_err: any, _id: string, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['menuItems', activeRestaurantId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', activeRestaurantId] });
    },
  });

  // ── Conditional render gates ──────────────────────────────────────────────

  if (!flagsLoading && !inventoryEnabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-600" strokeWidth={1.75} />
        </div>
        <h1 className="font-display tracking-tight text-3xl font-bold text-slate-900 mb-2">
          Module Unavailable
        </h1>
        <p className="text-slate-500 text-sm">
          The QR Menu module is not enabled for this restaurant.
        </p>
      </div>
    );
  }

  if (flagsLoading || (isLoadingCats && categories.length === 0)) {
    return (
      <div className="w-full space-y-4 font-sans select-none pb-12 animate-pulse">
        <div className="px-4 py-3.5 sm:px-5 border-b border-slate-150 bg-white rounded-2xl shrink-0 space-y-1">
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-3 w-72 bg-slate-100 rounded" />
        </div>
        <div className="flex flex-1 overflow-hidden bg-white rounded-2xl border border-slate-150">
          <aside className="w-48 md:w-56 shrink-0 bg-slate-50 border-r border-slate-150 p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-9 w-full bg-slate-200 rounded-xl" />
            ))}
          </aside>
          <main className="flex-1 p-4 md:p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 w-full bg-slate-100 rounded-2xl" />
            ))}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 font-sans select-none pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 md:px-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs shrink-0">
        <div>
          <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            Item Availability (86'ing)
          </h1>
          <p className="text-slate-500 text-[11px] font-medium mt-0.5">
            Toggle items 86'd or available for live customer orders and KDS.
          </p>
        </div>

        {/* Quick Stats & Global Search */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              {availableCount} Available
            </span>
            {unavailableCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">
                <AlertCircle className="w-3 h-3" />
                {unavailableCount} 86'd
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              id="menu-avail-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, portions..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs min-h-[500px]">
        {/* Category Sidebar */}
        <aside className="w-48 md:w-60 shrink-0 bg-slate-50/80 border-r border-slate-100 overflow-y-auto p-2.5 space-y-1">
          {/* ALL DISHES OPTION */}
          <button
            type="button"
            id="avail-cat-all"
            onClick={() => setSelectedCatId('ALL')}
            className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer active:scale-95 ${
              selectedCatId === 'ALL'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">All Dishes</span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                selectedCatId === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {allMenuItems.length}
            </span>
          </button>

          <div className="my-1 border-t border-slate-200/60" />

          {/* Categories List */}
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-4 text-center">No categories</p>
          ) : (
            categories.map((cat: any) => {
              const count = categoryCounts[cat._id] || 0;
              const isSelected = selectedCatId === cat._id;
              return (
                <button
                  key={cat._id}
                  type="button"
                  id={`avail-cat-${cat._id}`}
                  onClick={() => setSelectedCatId(cat._id)}
                  className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </aside>

        {/* Items Panel */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoadingItems ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-14 w-full bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FolderOpen className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.75} />
              <p className="text-xs font-bold text-slate-600">
                {searchQuery ? `No dishes matching "${searchQuery}"` : 'No items in this category'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-amber-600 font-semibold hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMenuItems.map((item: any) => {
                const catName = typeof item.categoryId === 'object'
                  ? item.categoryId?.name
                  : categories.find((c: any) => c._id === item.categoryId)?.name;

                const hasVariants = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
                const portionText = hasVariants
                  ? `From ₹${item.variants[0]?.price || item.price} • ${item.variants.length} portions`
                  : `₹${item.price}`;

                return (
                  <div
                    key={item._id}
                    className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 transition shadow-2xs ${
                      item.isAvailable
                        ? 'border-slate-200/80 hover:border-slate-300'
                        : 'border-rose-200/70 bg-rose-50/20 opacity-80'
                    }`}
                  >
                    {/* Veg / Non-veg indicator */}
                    <div className="shrink-0">
                      {item.isVegetarian ? (
                        <Leaf className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                      ) : (
                        <Flame className="w-4 h-4 text-rose-500" strokeWidth={2} />
                      )}
                    </div>

                    {/* Dish Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-bold truncate ${item.isAvailable ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          {item.name}
                        </p>
                        {catName && selectedCatId === 'ALL' && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {catName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          {portionText}
                        </span>
                      </div>

                      {!item.isAvailable && (
                        <p className="text-[9px] text-rose-600 font-bold font-mono uppercase tracking-wider mt-0.5">
                          86'd — Unavailable to diners
                        </p>
                      )}
                    </div>

                    {/* Availability Toggle */}
                    <button
                      type="button"
                      id={`avail-toggle-${item._id}`}
                      onClick={() => toggleMutation.mutate(item._id)}
                      disabled={toggleMutation.isPending}
                      aria-label={item.isAvailable ? `Mark ${item.name} unavailable` : `Mark ${item.name} available`}
                      className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 shadow-2xs ${
                        item.isAvailable
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      }`}
                    >
                      {item.isAvailable ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-rose-500" strokeWidth={2} />
                      )}
                      <span>{item.isAvailable ? 'Available' : "86'd"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerMenuAvailability;

