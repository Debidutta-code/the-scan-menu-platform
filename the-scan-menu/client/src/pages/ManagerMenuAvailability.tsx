import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { apiClient } from '../lib/api';
import { Leaf, Flame, FolderOpen, ToggleLeft, ToggleRight, Lock } from 'lucide-react';

/**
 * ManagerMenuAvailability — STAFF-safe item availability view.
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

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

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

  // Auto-select first category whenever the list changes
  useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0]._id);
    }
  }, [categories, selectedCatId]);

  // Fetch items for the selected category
  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: ['menuItems', activeRestaurantId, selectedCatId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${activeRestaurantId}/menu-items?categoryId=${selectedCatId}`
      );
      return res.data;
    },
    enabled: !!activeRestaurantId && !!selectedCatId && inventoryEnabled,
  });

  const menuItems: any[] = itemsResponse?.data || [];

  // Optimistic availability toggle — shares cache keys with ManagerMenu.tsx
  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/restaurants/${activeRestaurantId}/menu-items/${id}/availability`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', activeRestaurantId, selectedCatId] });
      const previous = queryClient.getQueryData(['menuItems', activeRestaurantId, selectedCatId]);
      queryClient.setQueryData(
        ['menuItems', activeRestaurantId, selectedCatId],
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
        queryClient.setQueryData(['menuItems', activeRestaurantId, selectedCatId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', activeRestaurantId, selectedCatId] });
    },
  });

  // ── Conditional render gates (all hooks are above this point) ──────────────

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

  if (flagsLoading || isLoadingCats) {
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
      <div className="p-3 md:px-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs shrink-0">
        <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
          Item Availability (86'ing)
        </h1>
        <p className="text-slate-500 text-[11px] font-medium mt-0.5">
          Toggle items 86'd or available. Select a category below.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs min-h-[500px]">
        {/* Category Sidebar */}
        <aside className="w-48 md:w-56 shrink-0 bg-slate-50/80 border-r border-slate-100 overflow-y-auto p-2.5 space-y-1">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-4 text-center">No categories</p>
          ) : (
            categories.map((cat: any) => (
              <button
                key={cat._id}
                id={`avail-cat-${cat._id}`}
                onClick={() => setSelectedCatId(cat._id)}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left transition cursor-pointer active:scale-95 ${
                  selectedCatId === cat._id
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{cat.name}</span>
              </button>
            ))
          )}
        </aside>

        {/* Items Panel */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4">
          {isLoadingItems ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-12 w-full bg-slate-100 rounded-xl" />
              ))}
            </div>
          ) : menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FolderOpen className="w-8 h-8 text-slate-200 mb-2" strokeWidth={1.75} />
              <p className="text-xs text-slate-400">No items in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item: any) => (
                <div
                  key={item._id}
                  className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 transition shadow-2xs ${
                    item.isAvailable
                      ? 'border-slate-200/80'
                      : 'border-rose-100 bg-rose-50/30 opacity-70'
                  }`}
                >
                  {/* Veg / Non-veg indicator */}
                  <div className="shrink-0">
                    {item.isVegetarian ? (
                      <Leaf className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                    ) : (
                      <Flame className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${item.isAvailable ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {item.name}
                    </p>
                    {!item.isAvailable && (
                      <p className="text-[9px] text-rose-500 font-bold font-mono uppercase tracking-wider mt-0.2">
                        86'd — Unavailable
                      </p>
                    )}
                  </div>

                  {/* Availability Toggle */}
                  <button
                    id={`avail-toggle-${item._id}`}
                    onClick={() => toggleMutation.mutate(item._id)}
                    disabled={toggleMutation.isPending}
                    aria-label={item.isAvailable ? `Mark ${item.name} unavailable` : `Mark ${item.name} available`}
                    className={`shrink-0 flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 shadow-2xs ${
                      item.isAvailable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    {item.isAvailable ? (
                      <ToggleRight className="w-3.5 h-3.5" strokeWidth={2} />
                    ) : (
                      <ToggleLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                    <span>{item.isAvailable ? 'Available' : "86'd"}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerMenuAvailability;
