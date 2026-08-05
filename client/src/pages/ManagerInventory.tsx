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
} from 'lucide-react';

export const ManagerInventory: React.FC = () => {
  const { user, impersonatedOutlet } = useAuth();
  const { toast } = useToast();
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exactStockInput, setExactStockInput] = useState<Record<string, string>>({});

  const restaurantId =
    impersonatedOutlet?.id ||
    (user as any)?.restaurantId ||
    (typeof user?.restaurants?.[0] === 'object' ? (user?.restaurants?.[0] as any)?.restaurantId : user?.restaurants?.[0]) ||
    '';

  // Fetch Menu Items with stock data
  const { data: menuResponse, isLoading } = useQuery({
    queryKey: ['managerInventory', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/menu/items`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  // Update item stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable, stockQuantity, trackInventory }: { itemId: string; isAvailable?: boolean; stockQuantity?: number; trackInventory?: boolean }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/menu/items/${itemId}`, {
        isAvailable,
        stockQuantity,
        trackInventory,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerInventory', restaurantId] });
      toast('Inventory updated successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update inventory', 'error');
    },
  });

  // Feature flag gate
  if (flagsLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  if (!isEnabled('inventory')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" strokeWidth={1.75} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Inventory Tracking Locked</h3>
          <p className="text-slate-600 max-w-md mx-auto text-sm">
            Inventory management is not included in your current plan. Please upgrade to enable stock tracking and alerts.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const items = menuResponse?.data || [];

  // Filter items
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.category?.name && item.category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const isLowStock = item.trackInventory && item.stockQuantity > 0 && item.stockQuantity <= 5;
    const isOutOfStock = !item.isAvailable || (item.trackInventory && item.stockQuantity <= 0);
    const isInStock = item.isAvailable && (!item.trackInventory || item.stockQuantity > 5);

    const matchesFilter =
      stockFilter === 'ALL' ||
      (stockFilter === 'IN_STOCK' && isInStock) ||
      (stockFilter === 'LOW_STOCK' && isLowStock) ||
      (stockFilter === 'OUT_OF_STOCK' && isOutOfStock);

    return matchesSearch && matchesFilter;
  });

  const totalItems = items.length;
  const inStockCount = items.filter((i: any) => i.isAvailable && (!i.trackInventory || i.stockQuantity > 5)).length;
  const lowStockCount = items.filter((i: any) => i.trackInventory && i.stockQuantity > 0 && i.stockQuantity <= 5).length;
  const outOfStockCount = items.filter((i: any) => !i.isAvailable || (i.trackInventory && i.stockQuantity <= 0)).length;

  const handleAdjustStock = (item: any, delta: number) => {
    const newQty = Math.max(0, (item.stockQuantity || 0) + delta);
    updateStockMutation.mutate({ itemId: item._id, stockQuantity: newQty, isAvailable: newQty > 0 });
  };

  const handleSetStock = (item: any, qty: number) => {
    updateStockMutation.mutate({ itemId: item._id, stockQuantity: qty, isAvailable: qty > 0 });
  };

  const handleSetExactStock = (item: any) => {
    const raw = exactStockInput[item._id];
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) { toast('Enter a valid stock quantity', 'error'); return; }
    handleSetStock(item, qty);
    setExactStockInput((prev) => { const next = { ...prev }; delete next[item._id]; return next; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: '86' | 'available') => {
    const ids = Array.from(selectedIds);
    await Promise.all(
      ids.map((id) =>
        updateStockMutation.mutateAsync({ itemId: id, isAvailable: action === 'available' })
      )
    );
    setSelectedIds(new Set());
    toast(`${ids.length} items updated`, 'success');
  };

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Kitchen & Stock Control</span>
          <h2 className="font-display text-3xl font-bold mt-1">Inventory & Portion Tracking</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Monitor real-time item stock levels, set low-stock warning thresholds, and rapidly replenish stock to prevent ordering out-of-stock menu items.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Catalog Items</span>
            <Package className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{totalItems}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-extrabold uppercase tracking-wider">In-Stock Items</span>
            <CheckCircle2 className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{inStockCount}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Low Stock (&le;5)</span>
            <AlertTriangle className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{lowStockCount}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-rose-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">86'd Out of Stock</span>
            <XCircle className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{outOfStockCount}</h3>
        </div>
      </div>

      {/* Main Stock Table Container */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        {/* Search & Filter controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search item or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold">
                <span>{selectedIds.size} selected</span>
                <button onClick={() => handleBulkAction('available')} className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition">Mark Available</button>
                <button onClick={() => handleBulkAction('86')} className="px-2 py-0.5 bg-red-500 hover:bg-red-400 text-white rounded-lg transition">Mark 86'd</button>
                <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white ml-1">✕</button>
              </div>
            )}
            <select
              value={stockFilter}
              onChange={(e: any) => setStockFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Items</option>
              <option value="IN_STOCK">In-Stock Only</option>
              <option value="LOW_STOCK">Low Stock Warning</option>
              <option value="OUT_OF_STOCK">Out of Stock (86'd)</option>
            </select>
          </div>
        </div>

        {/* Stock Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(filteredItems.map((i: any) => i._id)));
                      else setSelectedIds(new Set());
                    }}
                    className="rounded"
                  />
                </th>
                <th className="py-3 px-4">Menu Item</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Tracking</th>
                <th className="py-3 px-4 text-center">Portions Left</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Quick Replenish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item: any) => {
                const isTracked = item.trackInventory;
                const qty = item.stockQuantity || 0;
                const isLow = isTracked && qty > 0 && qty <= 5;
                const isOut = !item.isAvailable || (isTracked && qty <= 0);
                const isSelected = selectedIds.has(item._id);

                return (
                  <tr key={item._id} className={`hover:bg-slate-50/50 transition ${isSelected ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.name}
                      <span className="block text-[10px] text-slate-400 font-normal">{item.category?.name || 'General'}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                      ₹{item.price}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() =>
                          updateStockMutation.mutate({
                            itemId: item._id,
                            trackInventory: !isTracked,
                          })
                        }
                        className={`text-[9px] font-mono font-extrabold px-2.5 py-1 rounded-xl uppercase transition ${
                          isTracked ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isTracked ? 'TRACKING ON' : 'UNLIMITED'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                      {isTracked ? qty : '∞'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[9px] font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isOut ? "86'D OUT" : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1">
                      {isTracked ? (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleAdjustStock(item, -1)}
                            disabled={updateStockMutation.isPending}
                            className="p-1.5 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item, 1)}
                            disabled={updateStockMutation.isPending}
                            className="p-1.5 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSetStock(item, qty + 20)}
                            disabled={updateStockMutation.isPending}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-sm"
                          >
                            +20
                          </button>
                          {/* Exact stock input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={exactStockInput[item._id] ?? ''}
                              onChange={(e) => setExactStockInput((p) => ({ ...p, [item._id]: e.target.value }))}
                              placeholder="Set"
                              className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500 text-center"
                            />
                            <button
                              onClick={() => handleSetExactStock(item)}
                              disabled={!exactStockInput[item._id] || updateStockMutation.isPending}
                              className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            updateStockMutation.mutate({ itemId: item._id, isAvailable: !item.isAvailable })
                          }
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono transition ${
                            item.isAvailable ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {item.isAvailable ? 'Mark 86 Out' : 'Mark Available'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerInventory;
