import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  const playReadyChime = () => {
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
  };

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
  }, [readyOrders]);

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
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg">
          <ShoppingBag className="w-3 h-3 text-amber-400" />
          <span>Takeaway</span>
        </span>
      );
    }
    if (order.orderType === 'DELIVERY') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-lg">
          <Truck className="w-3 h-3 text-sky-400" />
          <span>Delivery</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
        <Utensils className="w-3 h-3 text-emerald-400" />
        <span>{order.tableName || 'Dine-In'}</span>
      </span>
    );
  };

  // Error / Disabled state
  if (isError) {
    const errorData = (error as any)?.response?.data?.error;
    const isFeatureDisabled = errorData?.code === 'FEATURE_DISABLED';

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400 shadow-xl shadow-amber-500/5">
          <Tv className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">
          {isFeatureDisabled ? 'Customer Live Display Disabled' : 'Display Unavailable'}
        </h1>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          {isFeatureDisabled
            ? 'The Customer Live Display module is currently disabled for this restaurant. Contact the store administrator to enable it in Feature Flags.'
            : errorData?.message || 'Unable to connect to the restaurant queue board. Please verify the restaurant link.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-between font-sans select-none overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ==================================================================== */}
      {/* 1. TOP HEADER BAR                                                    */}
      {/* ==================================================================== */}
      <header className="px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-10 shrink-0">
        {/* Left: Restaurant Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          {displayData?.restaurant?.logoUrl ? (
            <img
              src={displayData.restaurant.logoUrl}
              alt={displayData.restaurant.name}
              className="w-11 h-11 object-cover rounded-2xl border border-slate-700/80 shadow-md shrink-0 bg-slate-900"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-base shrink-0">
              {displayData?.restaurant?.name?.charAt(0) || '🍽️'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white truncate">
                {displayData?.restaurant?.name || 'Restaurant Live Queue'}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Kitchen Display</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden md:block">
              Real-time order preparation & collection status
            </p>
          </div>
        </div>

        {/* Center: Live Digital Clock & Connection Status */}
        <div className="flex flex-col items-center justify-center px-4">
          <div className="text-xl md:text-2xl font-black font-mono tracking-wider text-white">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-slate-600">•</span>
            <span
              className={`flex items-center gap-1 ${
                socketConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-[9px]">{socketConnected ? 'Live Sync' : 'Reconnecting'}</span>
            </span>
          </div>
        </div>

        {/* Right: Controls (Mute, Fullscreen, Refresh) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/50'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
            }`}
            title={isMuted ? 'Unmute Ready Alert Chime' : 'Mute Ready Alert Chime'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-xs font-bold hidden lg:inline">
              {isMuted ? 'Muted' : 'Audio Alert'}
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen TV Mode (F11)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. DUAL COLUMN LIVE BOARD                                            */}
      {/* ==================================================================== */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 min-h-0 overflow-y-auto">
        {/* ========================================= */}
        {/* COLUMN 1: PREPARING (IN KITCHEN)          */}
        {/* ========================================= */}
        <section className="flex flex-col bg-slate-900/40 border border-amber-500/20 rounded-3xl p-5 md:p-6 backdrop-blur-sm relative overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Flame className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>Preparing in Kitchen</span>
                </h2>
                <p className="text-xs text-slate-400">Fresh dishes being cooked right now</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl">
              {preparingOrders.length} in progress
            </span>
          </div>

          {/* Body Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs font-bold">Loading active queue...</span>
              </div>
            ) : preparingOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                <Utensils className="w-8 h-8 opacity-30 text-amber-400" />
                <p className="text-sm font-bold text-slate-400">No Orders in Kitchen</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  New orders will automatically appear here as soon as guests place them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.25 }}
                      className="p-4 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-amber-500/30 shadow-lg flex flex-col justify-between space-y-3 relative group overflow-hidden"
                    >
                      {/* Top Row: Token & Type */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white group-hover:text-amber-300 transition">
                          {order.displayToken}
                        </span>
                        {renderOrderTypeBadge(order)}
                      </div>

                      {/* Bottom Info: Time elapsed & items */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{getElapsedMinutes(order.createdAt)}</span>
                        </span>
                        <span className="font-mono text-slate-400 font-bold">
                          {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Simmering Kitchen Pulse line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20 overflow-hidden">
                        <div className="h-full w-1/2 bg-amber-400 animate-[marquee_2s_linear_infinite]" />
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
        <section className="flex flex-col bg-slate-900/40 border border-emerald-500/30 rounded-3xl p-5 md:p-6 backdrop-blur-sm relative overflow-hidden shadow-2xl shadow-emerald-950/20">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <span>Ready for Pickup</span>
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                </h2>
                <p className="text-xs text-slate-400">Order is ready • Please collect or await table serving</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl">
              {readyOrders.length} ready now
            </span>
          </div>

          {/* Body Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-bold">Loading active queue...</span>
              </div>
            ) : readyOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                <Sparkles className="w-8 h-8 opacity-30 text-emerald-400" />
                <p className="text-sm font-bold text-slate-400">No Pickup Orders Waiting</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Cooked orders ready for collection or delivery will be called here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                        className={`p-4 rounded-2xl border shadow-xl flex flex-col justify-between space-y-3 relative overflow-hidden transition-all duration-500 ${
                          isRecentlyReady
                            ? 'bg-gradient-to-b from-emerald-900/90 to-emerald-950/90 border-emerald-400 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                            : 'bg-gradient-to-b from-emerald-950/50 to-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
                        }`}
                      >
                        {/* Top Row: Big Calling Token */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-emerald-300 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]">
                            {order.displayToken}
                          </span>
                          {renderOrderTypeBadge(order)}
                        </div>

                        {/* Status calling bar */}
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>{order.tableName ? `Table: ${order.tableName}` : 'Ready at Counter'}</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-300/80 font-normal">
                            {getElapsedMinutes(order.updatedAt)}
                          </span>
                        </div>

                        {/* Glowing Bottom Ambient line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
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
      {/* 3. BOTTOM TICKER / PROMOTIONAL FOOTER                                */}
      {/* ==================================================================== */}
      <footer className="px-6 py-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="font-semibold text-slate-300">
            📱 Scan the QR code on your table to view our full menu & place orders directly.
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500 text-[11px] font-mono">
          <span>Powered by The Scan Menu™</span>
          <span>•</span>
          <span className="text-slate-400">1080p/4K TV Ready</span>
        </div>
      </footer>
    </div>
  );
};

export default PublicLiveDisplay;
