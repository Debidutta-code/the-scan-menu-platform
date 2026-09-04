import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { useSocket } from '../hooks/useSocket';
import { useFontScale } from '../hooks/useFontScale';
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
  Volume2,
  VolumeX,
  Layers,
  Activity,
  RotateCcw,
  Search,
  CheckCheck,
  TrendingUp,
  Printer,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Columns3,
  ChevronLeft,
  ChevronRight,
  Package,
  Timer,
} from 'lucide-react';
import apiClient from '../lib/api';
import { PrintOrderModal } from '../components/PrintOrderModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddOn {
  name: string;
  priceDelta: number;
}

interface KDSComboItem {
  name: string;
  quantity: number;
  categoryName?: string;
}

interface KDSItem {
  menuItemId: string;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  originalPriceSnapshot?: number;
  isCombo?: boolean;
  comboItemsSnapshot?: KDSComboItem[];
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
type KDSLayoutMode = 'KANBAN' | 'GRID';

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

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
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
  const { fontScale, setFontScale } = useFontScale();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Screen Tabs & View Modes
  const [activeTab, setActiveTab] = useState<KDSTab>('STATION');
  const [layoutMode, setLayoutMode] = useState<KDSLayoutMode>('KANBAN');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOrderMode, setSelectedOrderMode] = useState<string>('ALL');
  const [now, setNow] = useState<Date>(new Date());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [recallSearch, setRecallSearch] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const kdsContainerRef = useRef<HTMLDivElement>(null);
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const prevTicketCountRef = useRef<number>(0);

  // Socket setup
  const token = localStorage.getItem('accessToken');
  const { socket, status } = useSocket(token);
  const isConnected = status === 'connected';

  // Live Stopwatch Timer (updates every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

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

  const [printModalOrder, setPrintModalOrder] = useState<KDSTicket | null>(null);

  // Fetch Restaurant Settings for workflowMode
  const { data: restaurantResponse } = useQuery({
    queryKey: ['restaurantProfile', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
    staleTime: 60_000,
  });

  const restaurantInfo = useMemo(
    () => ({
      name: restaurantResponse?.data?.name,
      address: restaurantResponse?.data?.address,
      phone: restaurantResponse?.data?.phone,
      gstNumber: restaurantResponse?.data?.gstNumber,
      logoUrl: restaurantResponse?.data?.branding?.logoUrl,
      currency: restaurantResponse?.data?.currency || 'INR',
      headerMessage: restaurantResponse?.data?.settings?.receiptHeader || 'Welcome!',
      footerMessage: restaurantResponse?.data?.settings?.receiptFooter || 'Thank you for dining with us!',
    }),
    [restaurantResponse]
  );

  const workflowMode: 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP' =
    restaurantResponse?.data?.orderWorkflowMode || 'FIVE_STEP';

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
    mutationFn: async ({
      orderId,
      itemIndex,
      nextStatus,
    }: {
      orderId: string;
      itemIndex: number;
      nextStatus: string;
    }) => {
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
      toast('Ticket bumped and marked served!', 'success');
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
        // If it's a combo, aggregate individual bundle items for the prep line
        if (item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0) {
          item.comboItemsSnapshot.forEach((ci) => {
            const bundleKey = ci.name.toLowerCase().trim();
            const existing = map.get(bundleKey) || {
              name: ci.name,
              totalQuantity: 0,
              pendingQuantity: 0,
              preparingQuantity: 0,
              readyQuantity: 0,
              orders: [],
            };
            const itemStatus = item.itemStatus || 'PENDING';
            const bundleQty = ci.quantity * item.quantity;
            existing.totalQuantity += bundleQty;
            if (itemStatus === 'PENDING') existing.pendingQuantity += bundleQty;
            else if (itemStatus === 'PREPARING') existing.preparingQuantity += bundleQty;
            else if (itemStatus === 'READY') existing.readyQuantity += bundleQty;

            existing.orders.push({
              orderNumber: ticket.orderNumber,
              orderId: ticket._id,
              itemIndex: idx,
              qty: bundleQty,
              status: itemStatus,
            });
            map.set(bundleKey, existing);
          });
        } else {
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
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [tickets]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getTableOrCustomerLabel = (ticket: KDSTicket) => {
    if (ticket.tableId) {
      const rawName = ticket.tableId.displayName || ticket.tableId.tableNumber || 'Table';
      const cleanName = rawName.toString().toLowerCase().startsWith('table') ? rawName : `Table ${rawName}`;
      return (
        <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs">
          <div className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <MapPin className="w-3 h-3" strokeWidth={2.5} />
          </div>
          <span className="truncate">{cleanName}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-xs">
        <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <UserIcon className="w-3 h-3" strokeWidth={2.5} />
        </div>
        <span className="truncate">{ticket.customerName || 'Walk-in Guest'}</span>
      </div>
    );
  };

  const scrollKanban = (direction: 'left' | 'right') => {
    if (!kanbanScrollRef.current) return;
    const amount = 360;
    kanbanScrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Feature Gate
  if (!isEnabled('kds')) {
    return (
      <div className="h-full flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-md">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto">
            <ShieldAlert className="w-8 h-8" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900">Kitchen Display System Locked</h2>
            <p className="text-slate-500 max-w-md mx-auto mt-1 text-xs leading-relaxed">
              The KDS module is gated on your current subscription plan. Please upgrade to unlock commercial kitchen display tickets.
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
      className="h-full flex flex-col min-h-0 overflow-hidden select-none font-sans bg-[#F4F5F7] p-2 sm:p-3 gap-2.5"
    >
      {/* ── Top Header Toolbar ── */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        {/* Left: Branding & Main Tab Switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
              <ChefHat className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display tracking-tight text-base sm:text-lg font-black text-slate-950 leading-none">
                  Kitchen Display
                </h1>
                <span className="flex items-center gap-1 font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {tickets.length} Active
                </span>
              </div>
            </div>
          </div>

          {/* Screen Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('STATION')}
              className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg transition cursor-pointer ${
                activeTab === 'STATION'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.2} />
              <span>Live Tickets</span>
              {tickets.length > 0 && (
                <span className="bg-slate-950 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ALL_DAY')}
              className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg transition cursor-pointer ${
                activeTab === 'ALL_DAY'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.2} />
              <span>Master Prep Tally</span>
              {allDayAggregatedItems.length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {allDayAggregatedItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('RECALL')}
              className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg transition cursor-pointer ${
                activeTab === 'RECALL'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2.2} />
              <span>Recall Bumped</span>
            </button>

            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`flex items-center gap-1.5 px-3 py-1.2 rounded-lg transition cursor-pointer ${
                activeTab === 'ANALYTICS'
                  ? 'bg-white text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.2} />
              <span>Pace &amp; Speed</span>
            </button>
          </div>
        </div>

        {/* Right: Station Filter, View Switcher & Hardware Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'STATION' && (
            <>
              {/* Station Filter */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-xs font-bold px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-2xs"
                >
                  <option value="">All Kitchen Stations ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}

              {/* View Mode Toggle: Kanban vs Grid */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setLayoutMode('KANBAN')}
                  className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                    layoutMode === 'KANBAN'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Expediter Line Kanban View (Horizontal Flow)"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Line Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('GRID')}
                  className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                    layoutMode === 'GRID'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Overview Grid View (TV / Wall Mount)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">TV Grid</span>
                </button>
              </div>
            </>
          )}

          {/* Text Size Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200" title="Font Scale">
            {(['SMALL', 'NORMAL', 'LARGE'] as const).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setFontScale(scale)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  fontScale === scale
                    ? 'bg-white text-slate-950 shadow-2xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {scale === 'SMALL' ? 'A⁻' : scale === 'NORMAL' ? 'A' : 'A⁺'}
              </button>
            ))}
          </div>

          {/* Audio Chime Button */}
          <button
            onClick={() => {
              setAudioEnabled(!audioEnabled);
              if (!audioEnabled) playKitchenBell();
            }}
            className={`p-1.5 px-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer ${
              audioEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={audioEnabled ? 'Kitchen sound chime enabled' : 'Kitchen chime muted'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen TV Mode */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter TV Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Refresh / Sync Button */}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition cursor-pointer shadow-2xs"
            title="Refresh active tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 1: LIVE KITCHEN TICKETS (KANBAN / GRID)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'STATION' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-2">
          {/* Secondary Sub-Bar: Channels Filter & Live Quick Batch Tally Strip */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 bg-white/80 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-2xs">
            {/* Channel Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'DINE_IN', 'TAKEAWAY', 'COUNTER', 'DELIVERY'] as const).map((mode) => {
                const count =
                  mode === 'ALL' ? tickets.length : tickets.filter((t) => t.orderMode === mode).length;
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedOrderMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedOrderMode === mode
                        ? 'bg-slate-950 text-white shadow-xs font-black'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>
                      {mode === 'ALL'
                        ? 'All Orders'
                        : mode === 'DINE_IN'
                        ? 'Dine-In'
                        : mode === 'TAKEAWAY'
                        ? 'Takeaway'
                        : mode === 'COUNTER'
                        ? 'POS'
                        : 'Delivery'}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                        selectedOrderMode === mode ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Batch Tally Collapsible Preview */}
            {allDayAggregatedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.5} />
                  <span className="font-extrabold text-amber-950">Top Prep:</span>
                  <div className="flex items-center gap-1.5 truncate max-w-md">
                    {allDayAggregatedItems.slice(0, 4).map((item, idx) => (
                      <span key={idx} className="font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.2 rounded text-[11px]">
                        {item.totalQuantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                {layoutMode === 'KANBAN' && tickets.length > 3 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollKanban('left')}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollKanban('right')}
                      className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs"
                      title="Scroll Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tickets Viewport */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" strokeWidth={2.5} />
              <span className="text-xs font-bold text-slate-600">Loading active kitchen line...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-slate-300 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-9 h-9" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display text-slate-900">Kitchen Station Clear!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  No pending kitchen tickets. As soon as orders arrive from QR menus, captain POS, or counter checkout, they will ring here instantly.
                </p>
              </div>
            </div>
          ) : layoutMode === 'KANBAN' ? (
            /* ─── KANBAN HORIZONTAL EXPEDITER LINE ─── */
            <div
              ref={kanbanScrollRef}
              className="flex-1 min-h-0 flex flex-row gap-3.5 overflow-x-auto overflow-y-hidden pb-2 items-stretch scroll-smooth custom-scrollbar"
            >
              {tickets.map((ticket) => (
                <KDSTicketCard
                  key={ticket._id}
                  ticket={ticket}
                  now={now}
                  workflowMode={workflowMode}
                  onUpdateItemStatus={(itemIdx, nextStatus) =>
                    updateItemStatusMutation.mutate({
                      orderId: ticket._id,
                      itemIndex: itemIdx,
                      nextStatus,
                    })
                  }
                  onBumpTicket={() => bumpTicketMutation.mutate(ticket._id)}
                  onPrintTicket={() => setPrintModalOrder(ticket)}
                  isUpdating={updateItemStatusMutation.isPending}
                  isBumping={bumpTicketMutation.isPending}
                  className="w-[320px] sm:w-[350px] shrink-0 h-full flex flex-col"
                />
              ))}
            </div>
          ) : (
            /* ─── RESPONSIVE TV OVERVIEW GRID ─── */
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {tickets.map((ticket) => (
                  <KDSTicketCard
                    key={ticket._id}
                    ticket={ticket}
                    now={now}
                    workflowMode={workflowMode}
                    onUpdateItemStatus={(itemIdx, nextStatus) =>
                      updateItemStatusMutation.mutate({
                        orderId: ticket._id,
                        itemIndex: itemIdx,
                        nextStatus,
                      })
                    }
                    onBumpTicket={() => bumpTicketMutation.mutate(ticket._id)}
                    onPrintTicket={() => setPrintModalOrder(ticket)}
                    isUpdating={updateItemStatusMutation.isPending}
                    isBumping={bumpTicketMutation.isPending}
                    className="min-h-[420px] max-h-[560px] flex flex-col"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 2: MASTER ALL-DAY PREP AGGREGATOR
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ALL_DAY' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 overflow-y-auto shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
                <span>Master Batch Prep Tally (All-Day Aggregator)</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total item portions required right now across all active tickets. Helps chefs bulk fire items simultaneously.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl shadow-xs shrink-0 font-mono text-xs font-black">
              <span>TOTAL PORTIONS ON LINE:</span>
              <span className="text-amber-400 text-sm">
                {allDayAggregatedItems.reduce((acc, curr) => acc + curr.totalQuantity, 0)}
              </span>
            </div>
          </div>

          {allDayAggregatedItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" strokeWidth={2} />
              <p className="text-sm font-bold text-slate-700">No active prep items in kitchen!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
              {allDayAggregatedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-400 hover:bg-amber-50/20 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-sm text-slate-950 leading-tight block">{item.name}</span>
                      <span className="font-mono text-base font-black bg-slate-950 text-amber-400 px-3 py-0.5 rounded-xl shadow-inner shrink-0">
                        {item.totalQuantity}x
                      </span>
                    </div>

                    {/* Status distribution badges */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {item.pendingQuantity > 0 && (
                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                          {item.pendingQuantity} Pending
                        </span>
                      )}
                      {item.preparingQuantity > 0 && (
                        <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md border border-indigo-300">
                          {item.preparingQuantity} In Prep
                        </span>
                      )}
                      {item.readyQuantity > 0 && (
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md border border-purple-300">
                          {item.readyQuantity} Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Associated tickets */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="font-bold text-slate-600">On Tickets:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.orders.map((o, oIdx) => (
                        <span
                          key={oIdx}
                          className="bg-white border border-slate-300 text-slate-900 px-1.5 py-0.2 rounded font-black text-[10px]"
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 3: BUMPED TICKETS & RECALL HISTORY
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'RECALL' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 overflow-y-auto shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
                <span>Bumped Ticket History &amp; Instant Recall</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Accidentally bumped a ticket? Recall it back onto the active kitchen line with 1 click.
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16">
              <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" strokeWidth={2.5} />
              <span className="text-xs font-semibold">Loading bumped history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm font-bold text-slate-700">No recently bumped tickets</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredHistory.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black bg-slate-950 text-white px-2.5 py-1 rounded-xl">
                        #{ticket.orderNumber}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800">{getTableOrCustomerLabel(ticket)}</div>

                    <div className="space-y-1 pt-2 border-t border-slate-200/80">
                      {ticket.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600 font-medium">
                          <span className="truncate">{it.nameSnapshot}</span>
                          <span className="font-mono font-bold ml-2">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => recallTicketMutation.mutate(ticket._id)}
                    disabled={recallTicketMutation.isPending}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Recall to Active Line</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SCREEN 4: SPEED & HEALTH METRICS
          ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ANALYTICS' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 overflow-y-auto shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="font-display text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
              <span>Kitchen Pace &amp; Speed of Service</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live telemetry on ticket aging, kitchen throughput, and line efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Active Ticket Load
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-slate-950">{tickets.length}</span>
                <span className="text-xs text-slate-500 font-bold">tickets</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Oldest Active Ticket
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-amber-600">
                  {tickets.length > 0
                    ? `${Math.floor((now.getTime() - new Date(tickets[0].createdAt).getTime()) / 60000)}m`
                    : '0m'}
                </span>
                <span className="text-xs text-slate-500 font-bold">in kitchen</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Portions in Cooking
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-indigo-600">
                  {allDayAggregatedItems.reduce((acc, curr) => acc + curr.preparingQuantity, 0)}
                </span>
                <span className="text-xs text-slate-500 font-bold">dishes firing</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                Sync Status
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-display text-emerald-600">Connected</span>
                <span className="text-xs text-slate-500 font-bold">0ms latency</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Order Modal ────────────────────────────────────────────────── */}
      <PrintOrderModal
        isOpen={!!printModalOrder}
        onClose={() => setPrintModalOrder(null)}
        order={printModalOrder}
        restaurantInfo={restaurantInfo}
      />
    </div>
  );
};

// ─── Sub-Component: Commercial KDS Ticket Card ────────────────────────────────

interface KDSTicketCardProps {
  ticket: KDSTicket;
  now: Date;
  workflowMode: 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP';
  onUpdateItemStatus: (itemIndex: number, nextStatus: string) => void;
  onBumpTicket: () => void;
  onPrintTicket: () => void;
  isUpdating?: boolean;
  isBumping?: boolean;
  className?: string;
}

const KDSTicketCard: React.FC<KDSTicketCardProps> = ({
  ticket,
  now,
  workflowMode,
  onUpdateItemStatus,
  onBumpTicket,
  onPrintTicket,
  isUpdating,
  isBumping,
  className = '',
}) => {
  const elapsedMins = Math.floor((now.getTime() - new Date(ticket.createdAt).getTime()) / 60000);
  const elapsedSecs = Math.floor(((now.getTime() - new Date(ticket.createdAt).getTime()) % 60000) / 1000);
  const timeStr = `${elapsedMins}m ${elapsedSecs < 10 ? '0' : ''}${elapsedSecs}s`;

  const isRush = elapsedMins >= 15;
  const isWarning = elapsedMins >= 8 && !isRush;

  const allItemsServed = ticket.items.every((i) => i.itemStatus === 'SERVED');
  const allItemsReady = ticket.items.every((i) => i.itemStatus === 'READY' || i.itemStatus === 'SERVED');
  const readyCount = ticket.items.filter((i) => i.itemStatus === 'READY' || i.itemStatus === 'SERVED').length;

  const getNextItemStatus = (current?: string) => {
    switch (current) {
      case 'PREPARING':
        return workflowMode === 'THREE_STEP' ? 'SERVED' : 'READY';
      case 'READY':
        return 'SERVED';
      case 'PENDING':
      default:
        return 'PREPARING';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`rounded-2xl flex flex-col bg-white border shadow-xs overflow-hidden select-none transition-all ${
        isRush
          ? 'border-rose-400 ring-2 ring-rose-400/30'
          : isWarning
          ? 'border-amber-400'
          : 'border-slate-200 hover:border-slate-300'
      } ${className}`}
    >
      {/* ── Top Urgency Header Bar ── */}
      <div
        className={`px-3.5 py-2 flex items-center justify-between border-b shrink-0 ${
          isRush
            ? 'bg-rose-500 text-white border-rose-600'
            : isWarning
            ? 'bg-amber-400 text-slate-950 border-amber-500'
            : 'bg-slate-900 text-white border-slate-950'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-base font-black tracking-tight leading-none">
            #{ticket.orderNumber}
          </span>
          {ticket.roundNumber && (
            <span
              className={`font-mono text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                isRush
                  ? 'bg-rose-700 text-white'
                  : isWarning
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-amber-300'
              }`}
            >
              R{ticket.roundNumber}
            </span>
          )}
        </div>

        {/* Live Elapsed Stopwatch */}
        <div className="flex items-center gap-1 font-mono text-xs font-black">
          {isRush ? (
            <span className="flex items-center gap-1 bg-rose-700 px-2 py-0.5 rounded-lg text-white animate-pulse">
              <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{timeStr} RUSH</span>
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded-lg text-slate-950 font-black">
              <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{timeStr}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-300">
              <Timer className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
              <span>{timeStr}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Ticket Metadata: Channel + Table / Customer ── */}
      <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-150 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          {ticket.tableId ? (
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.5} />
              <span className="truncate">
                {ticket.tableId.displayName || ticket.tableId.tableNumber
                  ? `${ticket.tableId.displayName || ticket.tableId.tableNumber}`
                  : 'Table'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
              <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={2.5} />
              <span className="truncate">{ticket.customerName || 'Walk-in Guest'}</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {ticket.orderMode === 'TAKEAWAY' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
              <ShoppingBag className="w-3 h-3" />
              <span>Takeaway</span>
            </span>
          ) : ticket.orderMode === 'COUNTER' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
              <CreditCard className="w-3 h-3" />
              <span>POS</span>
            </span>
          ) : ticket.orderMode === 'DELIVERY' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-200">
              <Package className="w-3 h-3" />
              <span>Delivery</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
              <Utensils className="w-3 h-3" />
              <span>Dine-In</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Customer Note / Special Instructions Banner ── */}
      {ticket.customerNote && (
        <div className="mx-3 mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-extrabold text-amber-950 flex items-start gap-1.5 shrink-0 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
          <span className="leading-tight">"{ticket.customerNote}"</span>
        </div>
      )}

      {/* ── Scrollable Items Checklist Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {ticket.items.map((item, idx) => {
          const statusVal = item.itemStatus || 'PENDING';
          const isDone = statusVal === 'SERVED';
          const isReady = statusVal === 'READY';
          const isPrep = statusVal === 'PREPARING';

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-slate-100/70 border-slate-200 opacity-60'
                  : isReady
                  ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs ring-1 ring-emerald-400/20'
                  : isPrep
                  ? 'bg-indigo-50/90 border-indigo-300 shadow-2xs ring-1 ring-indigo-400/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {/* Quantity Badge & Item Details */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-inner ${
                      isDone
                        ? 'bg-slate-300 text-slate-600'
                        : isReady
                        ? 'bg-emerald-600 text-white'
                        : isPrep
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-amber-300'
                    }`}
                  >
                    {item.quantity}x
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-black leading-snug block break-words ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-950'
                        }`}
                      >
                        {item.nameSnapshot}
                      </span>
                      {item.isCombo && (
                        <span className="text-[9px] font-black uppercase text-amber-950 bg-amber-300 px-1.5 py-0.2 rounded font-mono">
                          COMBO
                        </span>
                      )}
                    </div>

                    {/* Clean Itemized Combo Breakdown */}
                    {item.isCombo && item.comboItemsSnapshot && item.comboItemsSnapshot.length > 0 && (
                      <div className="mt-1.5 p-2 bg-amber-50/90 border border-amber-200 rounded-lg space-y-1">
                        <div className="text-[9px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>Includes ({item.quantity} portions):</span>
                        </div>
                        <div className="space-y-0.5">
                          {item.comboItemsSnapshot.map((ci, cIdx) => (
                            <div
                              key={cIdx}
                              className="flex items-center gap-1.5 text-xs font-bold text-amber-950 leading-tight"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="font-mono font-black text-amber-900">
                                {ci.quantity * item.quantity}x
                              </span>
                              <span className="truncate">{ci.name}</span>
                              {ci.categoryName && (
                                <span className="text-[9px] font-semibold text-amber-700/80">
                                  • {ci.categoryName}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-ons */}
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {item.selectedAddOns.map((addon, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200"
                          >
                            +{addon.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Item-level Special Instructions */}
                    {item.specialInstructions && (
                      <div className="mt-1 p-1.5 bg-amber-100/70 border border-amber-300 rounded-md text-[10px] font-extrabold text-amber-950 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span>"{item.specialInstructions}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tap-to-Advance Status Button */}
                <button
                  type="button"
                  onClick={() => onUpdateItemStatus(idx, getNextItemStatus(statusVal))}
                  disabled={isDone || isUpdating}
                  className={`px-2.5 py-1 text-xs font-black rounded-lg transition shrink-0 flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                    isDone
                      ? 'bg-slate-200 text-slate-500 border border-slate-300'
                      : isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : isPrep
                      ? workflowMode === 'THREE_STEP'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                  }`}
                  title="Click to advance item prep status"
                >
                  {isDone ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" strokeWidth={3} />
                      <span>Done</span>
                    </>
                  ) : isReady ? (
                    <>
                      <Utensils className="w-3 h-3" strokeWidth={2.5} />
                      <span>Serve</span>
                    </>
                  ) : isPrep ? (
                    workflowMode === 'THREE_STEP' ? (
                      <>
                        <Utensils className="w-3 h-3" strokeWidth={2.5} />
                        <span>Serve</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                        <span>Ready</span>
                      </>
                    )
                  ) : (
                    <>
                      <ChefHat className="w-3 h-3" strokeWidth={2.5} />
                      <span>Prep</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pinned Card Footer ── */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onPrintTicket}
          className="h-9 w-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
          title="Print KOT / Kitchen Order Ticket"
        >
          <Printer className="w-4 h-4 text-amber-600" />
        </button>

        <button
          type="button"
          onClick={onBumpTicket}
          disabled={allItemsServed || isBumping}
          className={`flex-1 h-9 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
            allItemsServed
              ? 'bg-slate-200 text-slate-400 border border-slate-300'
              : allItemsReady
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-950 hover:bg-slate-800 text-amber-400'
          }`}
        >
          {isBumping ? (
            <Loader className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <>
              <CheckCircle2
                className={`w-4 h-4 ${allItemsReady ? 'text-white' : 'text-emerald-400'}`}
                strokeWidth={2.5}
              />
              <span>
                {allItemsServed
                  ? 'Ticket Served'
                  : allItemsReady
                  ? 'Serve All (Ready)'
                  : `Bump Order (${readyCount}/${ticket.items.length})`}
              </span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ManagerKDS;
