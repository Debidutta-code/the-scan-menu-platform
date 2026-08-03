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
  const { user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeRestaurantId = user?.restaurants?.[0];

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
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500 text-white animate-pulse flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" /> {elapsedMins}m AGED
        </span>
      );
    }
    if (elapsedMins >= 5) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500 text-white flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {elapsedMins}m
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500 text-white flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> {elapsedMins}m
      </span>
    );
  };

  if (!isEnabled('kds')) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold font-display">Kitchen Display System Locked</h2>
        <p className="text-slate-400 max-w-md mt-2 text-sm">
          KDS module is gated on your plan. Please upgrade to Enterprise or enable the KDS add-on in Manager Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top KDS Bar ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Flame className="w-6 h-6 text-amber-500" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold tracking-tight text-white flex items-center gap-2">
              Kitchen Display (KDS)
            </h1>
            <p className="text-xs text-slate-400 font-medium">Real-time station prep tickets</p>
          </div>
        </div>

        {/* Filters & Socket Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Station / Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
            >
              <option value="">All Stations / Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {/* Socket Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 border border-slate-700">
            {isConnected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400">Live Socket</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-400">Reconnecting...</span>
              </>
            )}
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="ml-1 p-1 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Mode Filter */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            {['ALL', 'DINE_IN', 'TAKEAWAY', 'DELIVERY', 'COUNTER'].map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedOrderMode(mode)}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedOrderMode === mode ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main KDS Grid ── */}
      <main className="flex-1 p-6 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="h-96 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-lg font-bold text-slate-300">Kitchen Clear!</h3>
            <p className="text-xs text-slate-500 mt-1">No pending preparation tickets right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tickets.map((ticket) => {
              const allServed = ticket.items.every((i) => i.itemStatus === 'SERVED');

              return (
                <div
                  key={ticket._id}
                  className={`bg-slate-900 border ${
                    allServed ? 'border-emerald-500/50 opacity-75' : 'border-slate-800'
                  } rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden`}
                >
                  {/* Top Ticket Line */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-mono font-black bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl">
                          #{ticket.orderNumber}
                        </span>
                        <span className="text-xs font-extrabold uppercase px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                          {ticket.orderMode}
                        </span>
                      </div>
                      {getAgingBadge(ticket.createdAt)}
                    </div>

                    {/* Table / Customer Details */}
                    <div className="text-xs font-semibold text-slate-400">
                      {ticket.tableId ? (
                        <span className="text-amber-400 font-extrabold text-sm">
                          📍 Table {ticket.tableId.displayName || ticket.tableId.tableNumber}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">
                          👤 {ticket.customerName || 'Walk-in'} {ticket.customerPhone ? `(${ticket.customerPhone})` : ''}
                        </span>
                      )}
                      {ticket.roundNumber && (
                        <span className="ml-2 font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          R{ticket.roundNumber}
                        </span>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="space-y-3 pt-2 border-t border-slate-800">
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
                                ? 'bg-slate-950/60 border-slate-850 text-slate-500 opacity-60'
                                : isReady
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                : isPrep
                                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                                : 'bg-slate-800/60 border-slate-700/80 text-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-sm font-extrabold block">
                                  {item.nameSnapshot}{' '}
                                  <span className="font-mono text-amber-400 font-black ml-1 text-base">
                                    x{item.quantity}
                                  </span>
                                </span>

                                {/* Add-ons */}
                                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                                    + {item.selectedAddOns.map((a) => a.name).join(', ')}
                                  </div>
                                )}

                                {/* Special Instructions */}
                                {item.specialInstructions && (
                                  <div className="mt-1.5 p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>{item.specialInstructions}</span>
                                  </div>
                                )}
                              </div>

                              {/* Item Action Button (Large Touch Target) */}
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
                                className={`px-3 py-2 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 ${
                                  isDone
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : isReady
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
                                    : isPrep
                                    ? 'bg-purple-500 hover:bg-purple-400 text-white'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold'
                                }`}
                              >
                                {isDone ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Served
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

                  {/* Ticket Footer / Bump Button */}
                  <div className="pt-4 border-t border-slate-800 mt-4">
                    <button
                      type="button"
                      onClick={() => bumpTicketMutation.mutate(ticket._id)}
                      disabled={allServed || bumpTicketMutation.isPending}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Bump Entire Ticket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManagerKDS;
