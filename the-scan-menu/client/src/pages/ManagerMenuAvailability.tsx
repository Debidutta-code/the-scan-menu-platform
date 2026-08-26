import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { apiClient } from '../lib/api';
import { Leaf, Flame, Loader, FolderOpen, ToggleLeft, ToggleRight, Lock } from 'lucide-react';

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
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans select-none pb-12">
      {/* Page Header */}
      <div className="px-4 py-3.5 sm:px-5 border-b border-slate-150 bg-white rounded-2xl shrink-0">
        <h1 className="font-display tracking-tight text-xl sm:text-2xl font-bold text-slate-900 leading-none">
          Item Availability (86'ing)
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Toggle items 86'd or available. Select a category below.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category Sidebar */}
        <aside className="w-48 md:w-56 shrink-0 bg-slate-50 border-r border-slate-150 overflow-y-auto p-3 space-y-1">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-4 text-center">No categories</p>
          ) : (
            categories.map((cat: any) => (
              <button
                key={cat._id}
                id={`avail-cat-${cat._id}`}
                onClick={() => setSelectedCatId(cat._id)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all ${
                  selectedCatId === cat._id
                    ? 'bg-slate-950 text-white shadow-sm'
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoadingItems ? (
            <div className="flex items-center justify-center h-40">
              <Loader className="w-6 h-6 animate-spin text-slate-400" strokeWidth={1.75} />
            </div>
          ) : menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FolderOpen className="w-10 h-10 text-slate-200 mb-3" strokeWidth={1.75} />
              <p className="text-sm text-slate-400">No items in this category</p>
            </div>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item: any) => (
                <div
                  key={item._id}
                  className={`flex items-center gap-4 bg-white border rounded-2xl px-4 py-3 transition-all ${
                    item.isAvailable
                      ? 'border-slate-150 shadow-sm'
                      : 'border-red-100 bg-red-50/40 opacity-60'
                  }`}
                >
                  {/* Veg / Non-veg indicator */}
                  <div className="shrink-0">
                    {item.isVegetarian ? (
                      <Leaf className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                    ) : (
                      <Flame className="w-4 h-4 text-red-400" strokeWidth={1.75} />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${item.isAvailable ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                      {item.name}
                    </p>
                    {!item.isAvailable && (
                      <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mt-0.5">
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
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      item.isAvailable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {item.isAvailable ? (
                      <ToggleRight className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <ToggleLeft className="w-4 h-4" strokeWidth={2} />
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
