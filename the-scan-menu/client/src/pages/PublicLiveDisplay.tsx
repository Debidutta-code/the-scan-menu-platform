import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import apiClient from '../lib/api';
import config from '../config';
import {
  Flame,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  Utensils,
  Tv,
  RefreshCw,
  ShoppingBag,
  Truck,
  QrCode,
  Moon,
  Sun,
  BellRing,
} from 'lucide-react';

interface DisplayOrder {
  id: string;
  orderNumber: string;
  displayToken: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableName: string | null;
  status: 'PREPARING' | 'READY' | 'SERVED';
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DisplayData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    bannerUrl: string | null;
    currency: string;
  };
  orders: DisplayOrder[];
}

export const PublicLiveDisplay: React.FC = () => {
  const { restaurantSlug: paramSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Determine restaurant slug from path, search param, or default demo
  const targetSlug =
    paramSlug ||
    searchParams.get('restaurant') ||
    searchParams.get('slug') ||
    'demo-cafe';

  // UI States
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('tsm_display_muted') === 'true';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('tsm_display_theme') === 'dark';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [recentlyReadyIds, setRecentlyReadyIds] = useState<Set<string>>(new Set());

  const previousReadyIdsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Keep digital clock live
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Chime Generator (Harmonic pleasant restaurant bell)
  const playReadyChime = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Tone 2: 1320Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 1.6);
    } catch {
      // Audio playback blocked before user gesture
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('tsm_display_muted', String(next));
      if (!next) {
        playReadyChime();
      }
      return next;
    });
  };

  // Toggle Dark Mode
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('tsm_display_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fetch Live Display Data (Zero PII public endpoint)
  const {
    data: displayResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<{ success: boolean; data: DisplayData }>({
    queryKey: ['publicLiveDisplay', targetSlug],
    queryFn: async () => {
      const res = await apiClient.get(`/public/restaurants/${targetSlug}/live-display`);
      return res.data;
    },
    refetchInterval: 15000, // 15s catch-up heartbeat
    retry: 2,
  });

  const displayData = displayResponse?.data;
  const orders = useMemo(() => displayData?.orders || [], [displayData?.orders]);

  // Separate preparing and ready orders
  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === 'PREPARING'),
    [orders]
  );
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'READY'),
    [orders]
  );

  // Detect newly transitioned READY orders to play chime and highlight
  useEffect(() => {
    const currentReadyIds = new Set(readyOrders.map((o) => o.id));
    const newlyReady = readyOrders.filter((o) => !previousReadyIdsRef.current.has(o.id));

    let timer: NodeJS.Timeout | null = null;
    if (newlyReady.length > 0 && previousReadyIdsRef.current.size > 0) {
      playReadyChime();
      setRecentlyReadyIds((prev) => {
        const next = new Set(prev);
        newlyReady.forEach((o) => next.add(o.id));
        return next;
      });

      // Clear highlight after 12s
      timer = setTimeout(() => {
        setRecentlyReadyIds((prev) => {
          const next = new Set(prev);
          newlyReady.forEach((o) => next.delete(o.id));
          return next;
        });
      }, 12000);
    }

    previousReadyIdsRef.current = currentReadyIds;

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [readyOrders, playReadyChime]);

  // Real-Time WebSocket Connection
  useEffect(() => {
    const socket: Socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_display', {
        restaurantSlug: targetSlug,
      });
    });

    socket.on('joined_display', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
    });

    // Real-time updates
    socket.on('display:order_created', () => {
      queryClient.invalidateQueries({ queryKey: ['publicLiveDisplay', targetSlug] });
    });

    socket.on('display:order_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['publicLiveDisplay', targetSlug] });
    });

    return () => {
      socket.disconnect();
    };
  }, [targetSlug, queryClient]);

  // Helper for elapsed time format
  const getElapsedMinutes = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins <= 0) return 'Just now';
    if (mins === 1) return '1m ago';
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return remMins > 0 ? `${hrs}h ${remMins}m ago` : `${hrs}h ago`;
    }
    return `${mins}m ago`;
  };

  // Helper to format table name cleanly without repeating words
  const formatTableName = (tableName: string | null) => {
    if (!tableName || tableName.trim() === '') return 'Dine-In';
    const clean = tableName.trim();
    if (/^\d+$/.test(clean)) {
      return `Table ${clean}`;
    }
    return clean;
  };

  // Render clean, non-wrapping badge for order location/type
  const renderOrderTypeBadge = (order: DisplayOrder) => {
    if (order.orderType === 'TAKEAWAY') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 shadow-xs transition-colors ${
            isDarkMode
              ? 'bg-amber-950/70 border border-amber-500/40 text-amber-300'
              : 'bg-amber-100/90 border border-amber-300 text-amber-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Takeaway</span>
        </span>
      );
    }
    if (order.orderType === 'DELIVERY') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 shadow-xs transition-colors ${
            isDarkMode
              ? 'bg-sky-950/70 border border-sky-500/40 text-sky-300'
              : 'bg-sky-100/90 border border-sky-300 text-sky-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          <span>Delivery</span>
        </span>
      );
    }

    const tableLabel = formatTableName(order.tableName);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 shadow-xs transition-colors ${
          isDarkMode
            ? 'bg-slate-800 border border-slate-700 text-slate-200'
            : 'bg-slate-100 border border-slate-200 text-slate-800'
        }`}
      >
        <Utensils className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{tableLabel}</span>
      </span>
    );
  };

  // Error / Disabled state
  if (isError) {
    const errorData = (error as any)?.response?.data?.error;
    const isFeatureDisabled = errorData?.code === 'FEATURE_DISABLED';

    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans select-none transition-colors duration-300 ${
          isDarkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#FAF9F6] text-slate-900'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg border-2 ${
            isDarkMode
              ? 'bg-amber-950/40 border-amber-600/40 text-amber-400'
              : 'bg-amber-50 border-amber-300 text-amber-600'
          }`}
        >
          <Tv className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">
          {isFeatureDisabled ? 'Live Display Feature Disabled' : 'Display Currently Unavailable'}
        </h1>
        <p
          className={`text-xs max-w-md mb-6 leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {isFeatureDisabled
            ? 'The Customer Live Display module is currently turned off for this restaurant. Contact the store administrator to enable it in Feature Flags.'
            : errorData?.message || 'Unable to connect to the live queue board. Please verify the restaurant link or network.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen h-screen flex flex-col justify-between font-sans select-none overflow-hidden relative transition-colors duration-300 ${
        isDarkMode
          ? 'bg-[#0B0F19] text-slate-100'
          : 'bg-[#F8F9FB] text-slate-900'
      }`}
    >
      {/* Background Ambient Glow for Large Displays */}
      <div
        className={`absolute top-0 left-1/6 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-opacity duration-500 ${
          isDarkMode ? 'bg-amber-500/10' : 'bg-amber-200/20'
        }`}
      />
      <div
        className={`absolute bottom-0 right-1/6 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-opacity duration-500 ${
          isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-200/20'
        }`}
      />

      {/* ==================================================================== */}
      {/* 1. TOP HEADER BAR (Compact, Space-Efficient, TV-Ready)              */}
      {/* ==================================================================== */}
      <header
        className={`px-4 lg:px-6 py-2.5 border-b flex items-center justify-between z-10 shrink-0 backdrop-blur-md transition-colors duration-300 ${
          isDarkMode
            ? 'bg-[#111827]/90 border-slate-800 shadow-md shadow-black/20'
            : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        {/* Left: Compact Restaurant Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          {displayData?.restaurant?.logoUrl ? (
            <img
              src={displayData.restaurant.logoUrl}
              alt={displayData.restaurant.name}
              className={`w-9 h-9 object-cover rounded-xl border shadow-xs shrink-0 ${
                isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-100'
              }`}
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                isDarkMode
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-amber-100 border-amber-300 text-amber-700'
              }`}
            >
              {displayData?.restaurant?.name?.charAt(0) || '🍽️'}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base md:text-lg font-black tracking-tight truncate">
              {displayData?.restaurant?.name || 'Restaurant Live Queue'}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shrink-0 shadow-2xs ${
                isDarkMode
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Queue</span>
            </span>
          </div>
        </div>

        {/* Center: Streamlined Digital Clock & Live Sync */}
        <div className="flex items-center gap-3 px-3 py-1 rounded-xl">
          <div
            className={`text-xl md:text-2xl font-black font-mono tracking-tight leading-none ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <div
            className={`hidden sm:flex items-center gap-2 text-xs font-semibold pl-2 border-l ${
              isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>•</span>
            <span
              className={`flex items-center gap-1 font-bold ${
                socketConnected ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[10px] uppercase tracking-wider font-mono">
                {socketConnected ? 'Live Sync' : 'Connecting'}
              </span>
            </span>
          </div>
        </div>

        {/* Right: Space-Efficient Screen & Audio Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => refetch()}
            className={`p-2 rounded-lg border transition cursor-pointer active:scale-95 shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition cursor-pointer active:scale-95 shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleMute}
            className={`px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
              isMuted
                ? isDarkMode
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-400 hover:bg-rose-900/50'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : isDarkMode
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title={isMuted ? 'Unmute Audio Bell' : 'Mute Audio Bell'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-bold hidden md:inline">
              {isMuted ? 'Muted' : 'Audio Alert'}
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer active:scale-95 shadow-sm"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen TV Mode (F11)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. DUAL COLUMN LIVE DISPLAY BOARD (Maximized Height & Area)         */}
      {/* ==================================================================== */}
      <main className="flex-1 p-3.5 md:p-4 lg:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 min-h-0 overflow-hidden">
        {/* ========================================= */}
        {/* COLUMN 1: PREPARING (IN KITCHEN)          */}
        {/* ========================================= */}
        <section
          className={`flex flex-col rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden transition-colors duration-300 border-2 min-h-0 ${
            isDarkMode
              ? 'bg-[#131B2E]/90 border-amber-500/30'
              : 'bg-amber-50/40 border-amber-200/80'
          }`}
        >
          {/* Column Header */}
          <div
            className={`flex items-center justify-between pb-3 mb-3 border-b shrink-0 ${
              isDarkMode ? 'border-slate-800' : 'border-amber-200/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Flame className="w-5 h-5 animate-pulse text-slate-950" />
              </div>
              <div>
                <h2 className="text-base md:text-lg lg:text-xl font-black uppercase tracking-tight leading-none">
                  Preparing in Kitchen
                </h2>
                <p
                  className={`text-[11px] font-medium mt-0.5 ${
                    isDarkMode ? 'text-amber-400/80' : 'text-amber-800'
                  }`}
                >
                  Fresh dishes being cooked
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-black font-mono px-3 py-1 rounded-lg shadow-2xs ${
                isDarkMode
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {preparingOrders.length} in progress
            </span>
          </div>

          {/* Preparing Orders Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-48 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Loading queue...
                </span>
              </div>
            ) : preparingOrders.length === 0 ? (
              <div
                className={`h-full min-h-[160px] flex flex-col items-center justify-center text-center space-y-2 rounded-xl border-2 border-dashed p-6 ${
                  isDarkMode
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                    : 'bg-white/60 border-amber-200/80 text-slate-400'
                }`}
              >
                <Utensils className="w-8 h-8 opacity-40 text-amber-500" />
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    No Orders in Kitchen
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                    New orders placed by diners will appear here automatically.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 relative overflow-hidden group shadow-sm hover:shadow-md ${
                        isDarkMode
                          ? 'bg-[#182238] border-amber-500/30 hover:border-amber-400'
                          : 'bg-white border-amber-200 hover:border-amber-400'
                      }`}
                    >
                      {/* Top Row: Token & Table/Type Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-3xl lg:text-4xl font-black font-mono tracking-tight transition-colors ${
                            isDarkMode
                              ? 'text-white group-hover:text-amber-400'
                              : 'text-slate-900 group-hover:text-amber-600'
                          }`}
                        >
                          {order.displayToken}
                        </span>
                        {renderOrderTypeBadge(order)}
                      </div>

                      {/* Bottom Info: Time elapsed & items */}
                      <div
                        className={`flex items-center justify-between text-[11px] pt-2.5 border-t ${
                          isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{getElapsedMinutes(order.createdAt)}</span>
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                            isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      {/* Simmering Cooking Pulse Line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20 overflow-hidden">
                        <div className="h-full w-1/3 bg-amber-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>

        {/* ========================================= */}
        {/* COLUMN 2: READY FOR PICKUP / SERVED       */}
        {/* ========================================= */}
        <section
          className={`flex flex-col rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden transition-colors duration-300 border-2 min-h-0 ${
            isDarkMode
              ? 'bg-[#112423]/90 border-emerald-500/30'
              : 'bg-emerald-50/40 border-emerald-200/80'
          }`}
        >
          {/* Column Header */}
          <div
            className={`flex items-center justify-between pb-3 mb-3 border-b shrink-0 ${
              isDarkMode ? 'border-slate-800' : 'border-emerald-200/70'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h2 className="text-base md:text-lg lg:text-xl font-black uppercase tracking-tight leading-none flex items-center gap-1.5">
                  <span>Ready for Pickup</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                </h2>
                <p
                  className={`text-[11px] font-medium mt-0.5 ${
                    isDarkMode ? 'text-emerald-400/80' : 'text-emerald-800'
                  }`}
                >
                  Please collect or await serving
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-black font-mono px-3 py-1 rounded-lg shadow-2xs ${
                isDarkMode
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {readyOrders.length} ready now
            </span>
          </div>

          {/* Ready Orders Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-48 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Loading queue...
                </span>
              </div>
            ) : readyOrders.length === 0 ? (
              <div
                className={`h-full min-h-[160px] flex flex-col items-center justify-center text-center space-y-2 rounded-xl border-2 border-dashed p-6 ${
                  isDarkMode
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                    : 'bg-white/60 border-emerald-200/80 text-slate-400'
                }`}
              >
                <Sparkles className="w-8 h-8 opacity-40 text-emerald-500" />
                <div>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    No Pickup Orders Waiting
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                    Cooked orders ready for collection will be called here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
                <AnimatePresence mode="popLayout">
                  {readyOrders.map((order) => {
                    const isRecentlyReady = recentlyReadyIds.has(order.id);
                    const tableLabel = formatTableName(order.tableName);
                    const locationText =
                      order.orderType === 'TAKEAWAY'
                        ? 'Takeaway Ready'
                        : order.orderType === 'DELIVERY'
                        ? 'Delivery Ready'
                        : tableLabel;

                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className={`p-4 rounded-xl border-2 flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-300 shadow-sm ${
                          isRecentlyReady
                            ? 'border-emerald-400 shadow-xl ring-2 ring-emerald-400/40'
                            : isDarkMode
                            ? 'bg-[#152928] border-emerald-500/40 hover:border-emerald-400 hover:shadow-md'
                            : 'bg-white border-emerald-300 hover:border-emerald-400 hover:shadow-md'
                        }`}
                      >
                        {/* Top Row: Big Calling Token & Table Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-3xl lg:text-4xl font-black font-mono tracking-tight text-emerald-500 drop-shadow-xs">
                            {order.displayToken}
                          </span>
                          {renderOrderTypeBadge(order)}
                        </div>

                        {/* Status calling banner */}
                        <div className="flex items-center justify-between text-xs font-extrabold text-white bg-emerald-600 px-3 py-1.5 rounded-lg shadow-2xs">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-100 font-medium whitespace-nowrap pl-1.5">
                            {getElapsedMinutes(order.updatedAt)}
                          </span>
                        </div>

                        {/* Glowing Emerald Top Highlight Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />

                        {/* Calling Notification Pill for New Orders */}
                        {isRecentlyReady && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
                            <BellRing className="w-2.5 h-2.5" />
                            <span>Calling</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ==================================================================== */}
      {/* 3. BOTTOM TICKER / FOOTER (Slimline Platform Theme)                  */}
      {/* ==================================================================== */}
      <footer
        className={`px-4 lg:px-6 py-2 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2 shrink-0 z-10 shadow-2xs transition-colors duration-300 ${
          isDarkMode
            ? 'bg-[#111827]/90 border-slate-800 text-slate-400'
            : 'bg-white border-slate-200/90 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1 rounded-lg border ${
              isDarkMode
                ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                : 'bg-amber-100 text-amber-700 border-amber-300'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <span
            className={`font-semibold text-xs ${
              isDarkMode ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            Scan the QR code on your table to view our full digital menu & order anytime.
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono font-medium opacity-70">
          <span>The Scan Menu™</span>
          <span>•</span>
          <span>Live Display</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicLiveDisplay;
