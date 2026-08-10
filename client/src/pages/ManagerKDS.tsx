import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import {
  Loader,
  Clock,
  CheckCircle2,
  Flame,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Check,
  MapPin,
  User as UserIcon,
  ChefHat,
  Sparkles,
  Utensils,
  ShoppingBag,
  CreditCard,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Layers,
  Activity,
  RotateCcw,
  Search,
  CheckCheck,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react';
import apiClient from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  updatedAt?: string;
}

interface CategoryOption {
  _id: string;
  name: string;
}

type KDSTab = 'STATION' | 'ALL_DAY' | 'RECALL' | 'ANALYTICS';

// ─── Web Audio API Chime ──────────────────────────────────────────────────────

const playKitchenBell = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.24); // D6

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio autoplay restrictions — silently ignore
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ManagerKDS: React.FC = () => {
  const { activeRestaurantId = '' } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Screen Tabs
  const [activeTab, setActiveTab] = useState<KDSTab>('STATION');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOrderMode, setSelectedOrderMode] = useState<string>('ALL');
  const [now, setNow] = useState<Date>(new Date());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [highContrastDark, setHighContrastDark] = useState<boolean>(false);
  const [recallSearch, setRecallSearch] = useState<string>('');

  const kdsContainerRef = useRef<HTMLDivElement>(null);
  const prevTicketCountRef = useRef<number>(0);

  // Socket setup
  const token = localStorage.getItem('accessToken');
  const { socket, status } = useSocket(token);
  const isConnected = status === 'connected';

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 1. Fetch Categories for Station filter
  const { data: categoriesResponse } = useQuery({
    queryKey: ['kdsCategories', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/categories`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('kds'),
  });

  const categories: CategoryOption[] = categoriesResponse?.success ? categoriesResponse.data : [];

  // 2. Fetch Active KDS Tickets
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

  const tickets: KDSTicket[] = useMemo(() => {
    return ticketsResponse?.success ? ticketsResponse.data : [];
  }, [ticketsResponse]);

  // Sound chime when new tickets arrive
  useEffect(() => {
    if (tickets.length > prevTicketCountRef.current && prevTicketCountRef.current > 0) {
      if (audioEnabled) {
        playKitchenBell();
      }
    }
    prevTicketCountRef.current = tickets.length;
  }, [tickets.length, audioEnabled]);

  // 3. Fetch Bumped Tickets History for Recall Screen
  const { data: historyResponse, isFetching: isFetchingHistory } = useQuery({
    queryKey: ['kdsHistory', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/kds/history?limit=30`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('kds') && activeTab === 'RECALL',
    refetchInterval: 15000,
  });

  const historyTickets: KDSTicket[] = useMemo(() => {
    return historyResponse?.success ? historyResponse.data : [];
  }, [historyResponse]);

  // Socket real-time invalidation
  useEffect(() => {
    if (!socket || !activeRestaurantId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['kdsTickets', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['kdsHistory', activeRestaurantId] });
    };

    socket.on('order:created', () => {
      invalidate();
      if (audioEnabled) playKitchenBell();
    });
    socket.on('order:item_status_updated', invalidate);
    socket.on('order:status_updated', invalidate);

    return () => {
      socket.off('order:created', invalidate);
      socket.off('order:item_status_updated', invalidate);
      socket.off('order:status_updated', invalidate);
    };
  }, [socket, activeRestaurantId, queryClient, audioEnabled]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Update Item Status Mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ orderId, itemIndex, nextStatus }: { orderId: string; itemIndex: number; nextStatus: string }) => {
      const res = await apiClient.patch(
        `/restaurants/${activeRestaurantId}/kds/tickets/${orderId}/items/${itemIndex}/status`,
        { itemStatus: nextStatus }
      );
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
      queryClient.invalidateQueries({ queryKey: ['kdsHistory', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to bump ticket', 'error');
    },
  });

  // Recall Bumped Ticket Mutation
  const recallTicketMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/kds/tickets/${orderId}/recall`);
      return res.data;
    },
    onSuccess: () => {
      toast('Ticket recalled to active kitchen line!', 'success');
      queryClient.invalidateQueries({ queryKey: ['kdsTickets', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['kdsHistory', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to recall ticket', 'error');
    },
  });

  // ─── Computed All-Day Prep Aggregator ──────────────────────────────────────

  const allDayAggregatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalQuantity: number;
        pendingQuantity: number;
        preparingQuantity: number;
        readyQuantity: number;
        orders: { orderNumber: number; orderId: string; itemIndex: number; qty: number; status: string }[];
      }
    >();

    tickets.forEach((ticket) => {
      ticket.items.forEach((item, idx) => {
        const key = item.nameSnapshot.toLowerCase().trim();
        const existing = map.get(key) || {
          name: item.nameSnapshot,
          totalQuantity: 0,
          pendingQuantity: 0,
          preparingQuantity: 0,
          readyQuantity: 0,
          orders: [],
        };

        const itemStatus = item.itemStatus || 'PENDING';
        existing.totalQuantity += item.quantity;
        if (itemStatus === 'PENDING') existing.pendingQuantity += item.quantity;
        else if (itemStatus === 'PREPARING') existing.preparingQuantity += item.quantity;
        else if (itemStatus === 'READY') existing.readyQuantity += item.quantity;

        existing.orders.push({
          orderNumber: ticket.orderNumber,
          orderId: ticket._id,
          itemIndex: idx,
          qty: item.quantity,
          status: itemStatus,
        });

        map.set(key, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [tickets]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

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

  const getAgingBadge = (createdAtStr: string) => {
    const elapsedMins = Math.floor((now.getTime() - new Date(createdAtStr).getTime()) / 60000);

    if (elapsedMins >= 15) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-rose-50 border border-rose-200 text-rose-600 animate-pulse flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" strokeWidth={2} /> {elapsedMins}m AGED
        </span>
      );
    }
    if (elapsedMins >= 5) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" strokeWidth={2} /> {elapsedMins}m
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" strokeWidth={2} /> {elapsedMins}m
      </span>
    );
  };

  const getOrderModeBadge = (mode: string) => {
    switch (mode) {
      case 'TAKEAWAY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <ShoppingBag className="w-3 h-3" strokeWidth={2} />
            <span>Takeaway</span>
          </span>
        );
      case 'COUNTER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
            <CreditCard className="w-3 h-3" strokeWidth={2} />
            <span>POS</span>
          </span>
        );
      case 'DINE_IN':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Utensils className="w-3 h-3" strokeWidth={2} />
            <span>Dine-In</span>
          </span>
        );
    }
  };

  const getTableOrCustomerLabel = (ticket: KDSTicket) => {
    if (ticket.tableId) {
      const rawName = ticket.tableId.displayName || ticket.tableId.tableNumber || 'Table';
      const cleanName = rawName.toString().toLowerCase().startsWith('table') ? rawName : `Table ${rawName}`;
      return (
        <span className="font-extrabold text-xs flex items-center gap-1 text-slate-900">
          <MapPin className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
          <span className="truncate">{cleanName}</span>
        </span>
      );
    }
    return (
      <span className="font-bold text-xs flex items-center gap-1 text-slate-800 truncate">
        <UserIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
        <span className="truncate">{ticket.customerName || 'Walk-in Guest'}</span>
      </span>
    );
  };

  // Feature Gate
  if (!isEnabled('kds')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
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

  // Filtered History for Recall screen
  const filteredHistory = historyTickets.filter((t) => {
    if (!recallSearch.trim()) return true;
    const query = recallSearch.toLowerCase();
    const orderNumStr = `#${t.orderNumber}`;
    const tableStr = (t.tableId?.displayName || t.tableId?.tableNumber || '').toLowerCase();
    const guestStr = (t.customerName || '').toLowerCase();
    return orderNumStr.includes(query) || tableStr.includes(query) || guestStr.includes(query);
  });

  return (
    <div
      ref={kdsContainerRef}
      className={`w-full space-y-5 font-sans select-none pb-12 transition-colors duration-200 ${
        highContrastDark ? 'bg-slate-950 text-white min-h-screen p-4 rounded-3xl' : ''
      }`}
    >
      {/* ── Top Kitchen Navigation & Controls ── */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 md:px-6 rounded-2xl border shadow-sm ${
          highContrastDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
        }`}
      >
        {/* Title and View Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-inner">
              <ChefHat className="w-5 h-5 text-amber-400" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display tracking-tight text-lg font-bold leading-tight">Kitchen Operations (KDS)</h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{tickets.length} active ticket{tickets.length === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          {/* Screen Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold ml-0 sm:ml-4">
            <button
              onClick={() => setActiveTab('STATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'STATION'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Station View</span>
              {tickets.length > 0 && (
                <span className="bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ALL_DAY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'ALL_DAY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              <span>All-Day Prep Tally</span>
              {allDayAggregatedItems.length > 0 && (
                <span className="bg-amber-100 text-amber-900 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {allDayAggregatedItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('RECALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'RECALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2} />
              <span>Recall Bumped</span>
            </button>

            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'ANALYTICS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} />
              <span>Kitchen Health</span>
            </button>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Station / Category Filter */}
          {activeTab === 'STATION' && categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
            >
              <option value="">All Stations ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playKitchenBell();
            }}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
              audioEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
            title={audioEnabled ? 'Kitchen audio alert enabled' : 'Muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Dark OLED Mode Toggle */}
          <button
            onClick={() => setHighContrastDark(!highContrastDark)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-sm"
            title="Toggle High-Contrast Kitchen Theme"
          >
            {highContrastDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Fullscreen Kiosk Mode */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-95"
            title="Toggle Kitchen Fullscreen Kiosk"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Kiosk' : 'Kiosk Mode'}</span>
          </button>

          {/* Socket Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-0.5 hover:bg-slate-200 rounded transition text-slate-500"
              title="Refresh"
            >
              <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 1: ACTIVE STATION TICKETS (GRID / CARD MODE)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'STATION' && (
        <div className="space-y-4">
          {/* Order Mode Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {['ALL', 'DINE_IN', 'TAKEAWAY', 'COUNTER'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedOrderMode(mode)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedOrderMode === mode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'ALL' ? 'All Channels' : mode === 'DINE_IN' ? 'Dine-In' : mode === 'TAKEAWAY' ? 'Takeaway' : 'POS'}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono font-bold">
              Showing {tickets.length} active ticket{tickets.length === 1 ? '' : 's'}
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Loader className="w-8 h-8 animate-spin text-slate-500 mb-2" strokeWidth={2} />
              <span className="text-xs font-semibold">Loading kitchen tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-sm flex flex-col items-center justify-center min-h-[360px]">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-9 h-9" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-display">Kitchen Station Clear!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active tickets in queue. Incoming orders from QR menu, waiter calls, or counter POS will ring here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tickets.map((ticket) => {
                const allServed = ticket.items.every((i) => i.itemStatus === 'SERVED');

                return (
                  <motion.div
                    key={ticket._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden border ${
                      allServed
                        ? 'border-emerald-300 bg-emerald-50/30 opacity-75'
                        : highContrastDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono font-black bg-slate-950 text-white px-3 py-1 rounded-xl shadow-inner">
                            #{ticket.orderNumber}
                          </span>
                          {getOrderModeBadge(ticket.orderMode)}
                        </div>
                        {getAgingBadge(ticket.createdAt)}
                      </div>

                      {/* Table / Customer Details */}
                      <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-150 pb-3">
                        {getTableOrCustomerLabel(ticket)}

                        {ticket.roundNumber && (
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 font-black">
                            Round {ticket.roundNumber}
                          </span>
                        )}
                      </div>

                      {/* Customer General Note */}
                      {ticket.customerNote && (
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 italic font-medium">
                          "{ticket.customerNote}"
                        </div>
                      )}

                      {/* Items List */}
                      <div className="space-y-2.5">
                        {ticket.items.map((item, idx) => {
                          const statusVal = item.itemStatus || 'PENDING';
                          const isDone = statusVal === 'SERVED';
                          const isReady = statusVal === 'READY';
                          const isPrep = statusVal === 'PREPARING';

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-2xl border transition-all ${
                                isDone
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                  : isReady
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs'
                                  : isPrep
                                  ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                {/* Prominent High-Visibility Quantity Pill & Name */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-inner ${
                                      isDone
                                        ? 'bg-slate-200 text-slate-500'
                                        : isReady
                                        ? 'bg-emerald-600 text-white'
                                        : isPrep
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-900 text-white'
                                    }`}
                                  >
                                    {item.quantity}x
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={`text-xs font-bold leading-tight block break-words ${
                                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                                      }`}
                                    >
                                      {item.nameSnapshot}
                                    </span>

                                    {/* Add-ons */}
                                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                        + {item.selectedAddOns.map((a) => a.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
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
                                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 shadow-sm active:scale-95 ${
                                    isDone
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : isReady
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : isPrep
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                                  }`}
                                >
                                  {isDone ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                                      <span>Done</span>
                                    </>
                                  ) : isReady ? (
                                    <>
                                      <Utensils className="w-3.5 h-3.5" strokeWidth={2} />
                                      <span>Serve</span>
                                    </>
                                  ) : isPrep ? (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                                      <span>Ready</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChefHat className="w-3.5 h-3.5" strokeWidth={2} />
                                      <span>Prep</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Special Instructions callout */}
                              {item.specialInstructions && (
                                <div className="mt-2 ml-10.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-900 flex items-start gap-1.5 italic">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                                  <span>"{item.specialInstructions}"</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bump Ticket Footer Button */}
                    <div className="pt-4 border-t border-slate-150 mt-4">
                      <button
                        type="button"
                        onClick={() => bumpTicketMutation.mutate(ticket._id)}
                        disabled={allServed || bumpTicketMutation.isPending}
                        className="w-full py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 active:scale-98"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                        <span>Bump Entire Ticket</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 2: ALL-DAY PREP AGGREGATOR / EXPEDITER TALLY
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ALL_DAY' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  <span>All-Day Cooking Aggregator &amp; Master Tally</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Total portions required right now across all active tickets. Helps chefs fire bulk orders together.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Total Items in Queue:</span>
                <span className="font-mono font-black text-sm text-slate-950 bg-white px-2.5 py-0.5 rounded-xl shadow-inner">
                  {allDayAggregatedItems.reduce((acc, curr) => acc + curr.totalQuantity, 0)} portions
                </span>
              </div>
            </div>

            {allDayAggregatedItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" strokeWidth={2} />
                <p className="text-sm font-bold text-slate-700">No active prep items in kitchen!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allDayAggregatedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col justify-between gap-3 shadow-xs hover:border-amber-400 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 block">{item.name}</span>
                        <span className="font-mono text-base font-black bg-slate-900 text-amber-400 px-3 py-1 rounded-xl shadow-inner shrink-0">
                          {item.totalQuantity}x
                        </span>
                      </div>

                      {/* Status distribution badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {item.pendingQuantity > 0 && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            {item.pendingQuantity} Pending
                          </span>
                        )}
                        {item.preparingQuantity > 0 && (
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                            {item.preparingQuantity} In Prep
                          </span>
                        )}
                        {item.readyQuantity > 0 && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            {item.readyQuantity} Ready
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Associated tickets */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Across Tickets:</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.orders.map((o, oIdx) => (
                          <span
                            key={oIdx}
                            className="bg-white border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-black text-[11px]"
                          >
                            #{o.orderNumber} ({o.qty})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 3: BUMPED TICKETS & RECALL HISTORY
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'RECALL' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-500" strokeWidth={2} />
                <span>Bumped Ticket History &amp; Instant Recall</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Accidentally bumped a ticket? Recall it back onto the active kitchen board with 1 click.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search ticket # or table..."
                value={recallSearch}
                onChange={(e) => setRecallSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
              />
            </div>
          </div>

          {isFetchingHistory && historyTickets.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader className="w-8 h-8 animate-spin text-slate-500 mb-2" strokeWidth={2} />
              <span className="text-xs font-semibold">Loading bumped history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm font-bold text-slate-700">No recently bumped tickets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black bg-slate-900 text-white px-3 py-1 rounded-xl">
                        #{ticket.orderNumber}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Served at {new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800">
                      {getTableOrCustomerLabel(ticket)}
                    </div>

                    {/* Items preview */}
                    <div className="space-y-1 pt-2 border-t border-slate-200/80">
                      {ticket.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600">
                          <span>{it.nameSnapshot}</span>
                          <span className="font-mono font-bold">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => recallTicketMutation.mutate(ticket._id)}
                    disabled={recallTicketMutation.isPending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Recall to Active Line</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 4: KITCHEN HEALTH & SPEED METRICS
          ══════════════════════════════════════════════ */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Active Ticket Load
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-slate-900">{tickets.length}</span>
                <span className="text-xs text-slate-400 font-medium">tickets</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Oldest Active Wait
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-amber-600">
                  {tickets.length > 0
                    ? `${Math.floor((now.getTime() - new Date(tickets[0].createdAt).getTime()) / 60000)}m`
                    : '0m'}
                </span>
                <span className="text-xs text-slate-400 font-medium">since fired</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Portions in Cooking
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-indigo-600">
                  {allDayAggregatedItems.reduce((acc, curr) => acc + curr.preparingQuantity, 0)}
                </span>
                <span className="text-xs text-slate-400 font-medium">dishes on stove</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Station Pace
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-display text-emerald-600">Optimal</span>
                <span className="text-xs text-slate-400 font-medium">real-time sync</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerKDS;
