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

  // Web Audio Chime Generator (Harmonic two-tone restaurant bell)
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
        // Unlock audio context on user click
        playReadyChime();
      }
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

    if (newlyReady.length > 0 && previousReadyIdsRef.current.size > 0) {
      playReadyChime();
      setRecentlyReadyIds((prev) => {
        const next = new Set(prev);
        newlyReady.forEach((o) => next.add(o.id));
        return next;
      });

      // Clear highlight after 10s
      setTimeout(() => {
        setRecentlyReadyIds((prev) => {
          const next = new Set(prev);
          newlyReady.forEach((o) => next.delete(o.id));
          return next;
        });
      }, 10000);
    }

    previousReadyIdsRef.current = currentReadyIds;
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
    if (mins <= 0) return 'Just Now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  };

  // Helper for order type icon/badge
  const renderOrderTypeBadge = (order: DisplayOrder) => {
    if (order.orderType === 'TAKEAWAY') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shadow-2xs">
          <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
          <span>Takeaway</span>
        </span>
      );
    }
    if (order.orderType === 'DELIVERY') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-sky-900 bg-sky-100 border border-sky-300 px-3 py-1 rounded-xl shadow-2xs">
          <Truck className="w-3.5 h-3.5 text-sky-700" />
          <span>Delivery</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
        <Utensils className="w-3.5 h-3.5 text-slate-600" />
        <span>{order.tableName || 'Dine-In'}</span>
      </span>
    );
  };

  // Error / Disabled state
  if (isError) {
    const errorData = (error as any)?.response?.data?.error;
    const isFeatureDisabled = errorData?.code === 'FEATURE_DISABLED';

    return (
      <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-5 text-amber-600 shadow-md">
          <Tv className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2 text-slate-900">
          {isFeatureDisabled ? 'Customer Live Display Disabled' : 'Display Unavailable'}
        </h1>
        <p className="text-slate-500 text-sm max-w-md mb-6 leading-relaxed">
          {isFeatureDisabled
            ? 'The Customer Live Display module is currently disabled for this restaurant. Contact the store administrator to enable it in Feature Flags.'
            : errorData?.message || 'Unable to connect to the restaurant queue board. Please verify the restaurant link.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col justify-between font-sans select-none overflow-hidden relative">
      {/* Subtle Background Ambience */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* ==================================================================== */}
      {/* 1. TOP HEADER BAR (Clean Light Platform Aesthetic)                  */}
      {/* ==================================================================== */}
      <header className="px-6 py-4 bg-white border-b border-slate-200/90 shadow-xs flex items-center justify-between z-10 shrink-0">
        {/* Left: Restaurant Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          {displayData?.restaurant?.logoUrl ? (
            <img
              src={displayData.restaurant.logoUrl}
              alt={displayData.restaurant.name}
              className="w-12 h-12 object-cover rounded-2xl border-2 border-slate-200 shadow-sm shrink-0 bg-slate-100"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 font-black text-lg shrink-0 shadow-sm">
              {displayData?.restaurant?.name?.charAt(0) || '🍽️'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 truncate">
                {displayData?.restaurant?.name || 'Restaurant Live Queue'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Kitchen Queue</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate hidden md:block mt-0.5">
              Real-time kitchen order preparation & pickup tracking
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock & Connection Status */}
        <div className="flex flex-col items-center justify-center px-4">
          <div className="text-2xl md:text-3xl font-black font-mono tracking-tight text-slate-900">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5">
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span
              className={`flex items-center gap-1.5 font-bold ${
                socketConnected ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] uppercase tracking-wider">{socketConnected ? 'Live Sync' : 'Reconnecting'}</span>
            </span>
          </div>
        </div>

        {/* Right: Controls (Mute, Fullscreen, Refresh) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer active:scale-95 shadow-2xs"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          <button
            onClick={toggleMute}
            className={`px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95 ${
              isMuted
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title={isMuted ? 'Unmute Ready Alert Chime' : 'Mute Ready Alert Chime'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            <span className="text-xs font-extrabold hidden lg:inline">
              {isMuted ? 'Muted' : 'Audio Alert'}
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer active:scale-95 shadow-sm"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen TV Mode (F11)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. DUAL COLUMN LIVE BOARD (Warm Light Theme)                         */}
      {/* ==================================================================== */}
      <main className="flex-1 p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-y-auto">
        {/* ========================================= */}
        {/* COLUMN 1: PREPARING (IN KITCHEN)          */}
        {/* ========================================= */}
        <section className="flex flex-col bg-amber-50/50 border-2 border-amber-200/80 rounded-3xl p-6 shadow-xs relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-amber-200/80 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Preparing in Kitchen</span>
                </h2>
                <p className="text-xs text-amber-800 font-medium">Fresh dishes being cooked right now</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-xl shadow-2xs">
              {preparingOrders.length} in progress
            </span>
          </div>

          {/* Body Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
                <span className="text-xs font-bold text-slate-600">Loading active queue...</span>
              </div>
            ) : preparingOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-3 bg-white/60 rounded-2xl border-2 border-dashed border-amber-200/80 p-6">
                <Utensils className="w-9 h-9 opacity-40 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-slate-700">No Orders Currently in Kitchen</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    New orders placed by diners will automatically appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.25 }}
                      className="p-5 rounded-2xl bg-white border-2 border-amber-200/90 hover:border-amber-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden group"
                    >
                      {/* Top Row: Token & Type */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">
                          {order.displayToken}
                        </span>
                        {renderOrderTypeBadge(order)}
                      </div>

                      {/* Bottom Info: Time elapsed & items */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{getElapsedMinutes(order.createdAt)}</span>
                        </span>
                        <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                          {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Simmering Kitchen Pulse line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-100 overflow-hidden">
                        <div className="h-full w-1/3 bg-amber-500 animate-[marquee_2s_linear_infinite]" />
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
        <section className="flex flex-col bg-emerald-50/50 border-2 border-emerald-200/80 rounded-3xl p-6 shadow-xs relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-emerald-200/80 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Ready for Pickup</span>
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                </h2>
                <p className="text-xs text-emerald-800 font-medium">Order is ready • Please collect or await table serving</p>
              </div>
            </div>
            <span className="text-xs font-black font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 px-3.5 py-1.5 rounded-xl shadow-2xs">
              {readyOrders.length} ready now
            </span>
          </div>

          {/* Body Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
                <span className="text-xs font-bold text-slate-600">Loading active queue...</span>
              </div>
            ) : readyOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-3 bg-white/60 rounded-2xl border-2 border-dashed border-emerald-200/80 p-6">
                <Sparkles className="w-9 h-9 opacity-40 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-slate-700">No Pickup Orders Waiting</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Cooked orders ready for collection or delivery will be called here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {readyOrders.map((order) => {
                    const isRecentlyReady = recentlyReadyIds.has(order.id);
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        className={`p-5 rounded-2xl bg-white border-2 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-500 ${
                          isRecentlyReady
                            ? 'border-emerald-500 shadow-xl ring-4 ring-emerald-400/30'
                            : 'border-emerald-300 shadow-md hover:border-emerald-400 hover:shadow-lg'
                        }`}
                      >
                        {/* Top Row: Big Calling Token & Type */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-emerald-600 drop-shadow-xs">
                            {order.displayToken}
                          </span>
                          {renderOrderTypeBadge(order)}
                        </div>

                        {/* Status calling bar */}
                        <div className="flex items-center justify-between text-xs font-extrabold text-white bg-emerald-600 px-3.5 py-2 rounded-xl shadow-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            <span>{order.tableName ? `Table: ${order.tableName}` : 'Ready at Counter'}</span>
                          </span>
                          <span className="text-[11px] font-mono text-emerald-100 font-medium">
                            {getElapsedMinutes(order.updatedAt)}
                          </span>
                        </div>

                        {/* Top Glowing Emerald line */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
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
      {/* 3. BOTTOM TICKER / FOOTER (Warm Platform Theme)                      */}
      {/* ==================================================================== */}
      <footer className="px-6 py-3.5 bg-white border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-300">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-xs md:text-sm">
            Scan the QR code on your table to view our full digital menu & order anytime.
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs font-mono font-medium">
          <span>The Scan Menu™</span>
          <span>•</span>
          <span className="text-slate-500">Live Kitchen Display</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicLiveDisplay;
