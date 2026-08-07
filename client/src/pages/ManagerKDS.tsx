import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import { Loader, Clock, CheckCircle2, Flame, RefreshCw, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import apiClient from '../lib/api';

interface AddOn {
  name: string;
  priceDelta: number;
}

interface KDSItem {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  selectedAddOns: AddOn[];
  specialInstructions?: string;
  itemStatus?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  servedAt?: string;
}

interface KDSTicket {
  _id: string;
  restaurantId: string;
  tableId?: { displayName?: string; tableNumber?: string } | any;
  orderMode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER';
  orderNumber: number;
  roundNumber?: number;
  items: KDSItem[];
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  createdAt: string;
}

interface CategoryOption {
  _id: string;
  name: string;
}

export const ManagerKDS: React.FC = () => {
  const { user, impersonatedOutlet } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeRestaurantId = impersonatedOutlet?.id || user?.restaurants?.[0] || '';

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOrderMode, setSelectedOrderMode] = useState<string>('ALL');
  const [now, setNow] = useState<Date>(new Date());

  // Socket setup
  const token = localStorage.getItem('accessToken');
  const { socket, status } = useSocket(token);
  const isConnected = status === 'connected';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Categories for Station filter
  const { data: categoriesResponse } = useQuery({
    queryKey: ['kdsCategories', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/categories`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('kds'),
  });

  const categories: CategoryOption[] = categoriesResponse?.success ? categoriesResponse.data : [];

  // Fetch Active KDS Tickets
  const {
    data: ticketsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['kdsTickets', activeRestaurantId, selectedCategory, selectedOrderMode],
    queryFn: async () => {
      const modeParam = selectedOrderMode !== 'ALL' ? `&orderMode=${selectedOrderMode}` : '';
      const catParam = selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/kds/tickets?${catParam}${modeParam}`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('kds'),
    refetchInterval: isConnected ? false : 10000,
  });

  const tickets: KDSTicket[] = ticketsResponse?.success ? ticketsResponse.data : [];

  // Socket real-time invalidation
  useEffect(() => {
    if (!socket || !activeRestaurantId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['kdsTickets', activeRestaurantId] });
    };

    socket.on('order:created', invalidate);
    socket.on('order:item_status_updated', invalidate);
    socket.on('order:status_updated', invalidate);

    return () => {
      socket.off('order:created', invalidate);
      socket.off('order:item_status_updated', invalidate);
      socket.off('order:status_updated', invalidate);
    };
  }, [socket, activeRestaurantId, queryClient]);

  // Update Item Status Mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ orderId, itemIndex, nextStatus }: { orderId: string; itemIndex: number; nextStatus: string }) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}/kds/tickets/${orderId}/items/${itemIndex}/status`, {
        itemStatus: nextStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kdsTickets', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update item status', 'error');
    },
  });

  // Bump Ticket Mutation
  const bumpTicketMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/kds/tickets/${orderId}/bump`);
      return res.data;
    },
    onSuccess: () => {
      toast('Ticket bumped and served!', 'success');
      queryClient.invalidateQueries({ queryKey: ['kdsTickets', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to bump ticket', 'error');
    },
  });

  // Helper for item status progression
  const getNextItemStatus = (current?: string) => {
    switch (current) {
      case 'PREPARING':
        return 'READY';
      case 'READY':
        return 'SERVED';
      case 'PENDING':
      default:
        return 'PREPARING';
    }
  };

  // Helper for item button labels
  const getItemButtonLabel = (current?: string) => {
    switch (current) {
      case 'PREPARING':
        return 'Mark Ready';
      case 'READY':
        return 'Serve Item';
      case 'PENDING':
      default:
        return 'Start Prep';
    }
  };

  // Elapsed time styling
  const getAgingBadge = (createdAtStr: string) => {
    const elapsedMins = Math.floor((now.getTime() - new Date(createdAtStr).getTime()) / 60000);

    if (elapsedMins >= 15) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 border border-rose-200 text-rose-600 animate-pulse flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" /> {elapsedMins}m AGED
        </span>
      );
    }
    if (elapsedMins >= 5) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {elapsedMins}m
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> {elapsedMins}m
      </span>
    );
  };

  if (!isEnabled('kds')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
            <ShieldAlert className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900">Kitchen Display System Locked</h2>
            <p className="text-slate-500 max-w-md mx-auto mt-1 text-xs leading-relaxed">
              The KDS module is gated on your current subscription plan. Please upgrade to unlock kitchen display tickets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      {/* ── Top Header & Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-display tracking-tight text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-8 h-8 text-amber-500" strokeWidth={1.75} />
            <span>Kitchen Display (KDS)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time station prep tickets & automated kitchen workflow.</p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Station / Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="">All Stations / Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {/* Socket Live Indicator */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 shadow-sm">
            {isConnected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-mono text-[11px]">Live Socket</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-700 font-mono text-[11px]">Connecting...</span>
              </>
            )}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="ml-1 p-1 hover:bg-slate-100 rounded transition text-slate-400 hover:text-slate-700"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Order Mode Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {['ALL', 'DINE_IN', 'TAKEAWAY', 'COUNTER'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedOrderMode(mode)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  selectedOrderMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tickets Grid ── */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center space-y-3 shadow-sm flex flex-col items-center justify-center min-h-[360px]">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Kitchen Clear!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No active prep tickets in queue right now. New orders will appear here automatically in real time.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tickets.map((ticket) => {
            const allServed = ticket.items.every((i) => i.itemStatus === 'SERVED');

            return (
              <div
                key={ticket._id}
                className={`bg-white border ${
                  allServed ? 'border-emerald-300 bg-emerald-50/30 opacity-75' : 'border-slate-200'
                } rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition relative overflow-hidden`}
              >
                {/* Header Row */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-extrabold bg-slate-950 text-white px-3 py-1 rounded-xl">
                        #{ticket.orderNumber}
                      </span>
                      <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                        {ticket.orderMode.replace('_', ' ')}
                      </span>
                    </div>
                    {getAgingBadge(ticket.createdAt)}
                  </div>

                  {/* Table / Customer Details */}
                  <div className="text-xs font-semibold text-slate-600 border-b border-slate-100 pb-3">
                    {ticket.tableId ? (
                      <span className="text-amber-600 font-bold text-sm flex items-center gap-1">
                        📍 Table {ticket.tableId.displayName || ticket.tableId.tableNumber}
                      </span>
                    ) : (
                      <span className="text-slate-800 font-bold flex items-center gap-1">
                        👤 {ticket.customerName || 'Walk-in'} {ticket.customerPhone ? `(${ticket.customerPhone})` : ''}
                      </span>
                    )}
                    {ticket.roundNumber && (
                      <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        Round {ticket.roundNumber}
                      </span>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    {ticket.items.map((item, idx) => {
                      const statusVal = item.itemStatus || 'PENDING';
                      const isDone = statusVal === 'SERVED';
                      const isReady = statusVal === 'READY';
                      const isPrep = statusVal === 'PREPARING';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition ${
                            isDone
                              ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                              : isReady
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : isPrep
                              ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                              : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <span className="text-xs font-extrabold text-slate-900 block truncate">
                                {item.nameSnapshot}
                                <span className="font-mono text-amber-600 font-bold ml-1.5 bg-amber-100 px-1.5 py-0.5 rounded-lg text-xs">
                                  x{item.quantity}
                                </span>
                              </span>

                              {/* Add-ons */}
                              {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                <div className="text-[11px] text-slate-500 font-medium">
                                  + {item.selectedAddOns.map((a) => a.name).join(', ')}
                                </div>
                              )}

                              {/* Special Instructions */}
                              {item.specialInstructions && (
                                <div className="mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-800 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{item.specialInstructions}</span>
                                </div>
                              )}
                            </div>

                            {/* Item Action Button */}
                            <button
                              type="button"
                              onClick={() =>
                                updateItemStatusMutation.mutate({
                                  orderId: ticket._id,
                                  itemIndex: idx,
                                  nextStatus: getNextItemStatus(statusVal),
                                })
                              }
                              disabled={isDone || updateItemStatusMutation.isPending}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 ${
                                isDone
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isReady
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm'
                                  : isPrep
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm'
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
                              }`}
                            >
                              {isDone ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Served
                                </>
                              ) : (
                                getItemButtonLabel(statusVal)
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bump Ticket Footer Button */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => bumpTicketMutation.mutate(ticket._id)}
                    disabled={allServed || bumpTicketMutation.isPending}
                    className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-extrabold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Bump Entire Ticket</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagerKDS;
