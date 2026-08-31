import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { useSocket, ConnectionStatus } from '../hooks/useSocket';
import ConnectionIndicator from './ConnectionIndicator';
import PWAInstallPrompt from './PWAInstallPrompt';
import { ScanMenuLogo } from './ScanMenuLogo';
import { getPrimaryManagerRoute } from '../utils/navigation';
import { PosLockScreenModal } from './pos/PosLockScreenModal';
import {
  Lock,
  Receipt,
  CreditCard,
  Bell,
  BookOpen,
  TableProperties,
  Settings,
  BarChart3,
  User,
  Users,
  UserCheck,
  Calculator,
  Flame,
  Code,
  MoreHorizontal,
  X,
  Eye,
  Package,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Tv,
} from 'lucide-react';
import apiClient from '../lib/api';

export const ManagerLayout: React.FC = () => {
  const { user, impersonatedOutlet, activeRestaurantId, exitImpersonation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();

  // Sidebar collapsible state with localStorage persistence
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_sidebar_open');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('manager_sidebar_open', String(next));
      }
      return next;
    });
  }, []);

  // Sound/notification toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manager_sound_chime') !== 'false';
    }
    return true;
  });
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  useEffect(() => {
    const handleSoundChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'boolean') {
        setSoundEnabled(detail);
      }
    };
    window.addEventListener('managerSoundChanged', handleSoundChange);
    return () => window.removeEventListener('managerSoundChanged', handleSoundChange);
  }, []);

  const toggleKioskMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsKioskMode(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsKioskMode(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsKioskMode(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const isStaff = user?.role === 'STAFF';

  // Global Manager PIN Lock State (Always prompts on window reload/initial load, or after 15m idle inactivity)
  const [isPinLocked, setIsPinLocked] = useState<boolean>(true);

  // Long Inactivity Auto-Lock (15 Minutes of zero activity across manager dashboard)
  useEffect(() => {
    if (!activeRestaurantId || isPinLocked) return;

    let timeoutId: any;
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsPinLocked(true);
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [activeRestaurantId, isPinLocked]);

  // Listen to manual lock requests from sub-views (e.g. Counter POS)
  useEffect(() => {
    const handleLockEvent = () => {
      setIsPinLocked(true);
    };

    window.addEventListener('pos:lock', handleLockEvent);
    return () => window.removeEventListener('pos:lock', handleLockEvent);
  }, []);

  // Fetch Live socket status
  const token = localStorage.getItem('accessToken');
  const { socket, status: connectionStatus } = useSocket(token);

  // Active tab tracking by pathname
  const currentPath = location.pathname;
  const isMenuEditorRoute = currentPath.startsWith('/manager/menu/new') || currentPath.includes('/edit');
  const activeTab = currentPath.startsWith('/manager/orders')
    ? 'orders'
    : currentPath.startsWith('/manager/counter')
    ? 'counter'
    : currentPath.startsWith('/manager/kds')
    ? 'kds'
    : currentPath.startsWith('/manager/transactions')
    ? 'transactions'
    : currentPath.startsWith('/manager/waiter-calls')
    ? 'waiter-calls'
    : currentPath.startsWith('/manager/menu/availability')
    ? 'menu-availability'
    : currentPath.startsWith('/manager/menu')
    ? 'menu'
    : currentPath.startsWith('/manager/tables')
    ? 'tables'
    : currentPath.startsWith('/manager/staff')
    ? 'staff'
    : currentPath.startsWith('/manager/customers')
    ? 'customers'
    : currentPath.startsWith('/manager/taxes')
    ? 'taxes'
    : currentPath.startsWith('/manager/settings')
    ? 'settings'
    : currentPath.startsWith('/manager/analytics')
    ? 'analytics'
    : currentPath.startsWith('/manager/inventory')
    ? 'inventory'
    : currentPath.startsWith('/manager/developer')
    ? 'developer'
    : currentPath.startsWith('/manager/profile')
    ? 'profile'
    : '';

  // 1. Fetch Active Orders for count
  const { data: activeOrdersData } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  // 2. Fetch Waiter Calls for count
  const { data: waiterCallsData } = useQuery({
    queryKey: ['waiterCallsQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/waiter-calls?limit=50`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const activeOrdersCount = activeOrdersData?.success ? activeOrdersData.data.length : 0;

  const activeWaiterCallsCount = waiterCallsData?.success
    ? waiterCallsData.data.waiterCalls.filter(
        (c: any) => c.status === 'PENDING' || c.status === 'ACKNOWLEDGED'
      ).length
    : 0;

  // Synthesized chime
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const nowTime = ctx.currentTime;
      playNote(523.25, nowTime, 0.4); // C5
      playNote(659.25, nowTime + 0.15, 0.5); // E5
    } catch (err) {
      console.error('Synthesized sound play failed:', err);
    }
  }, [soundEnabled]);



  // Register live Socket.IO events for global notification/refresh
  useEffect(() => {
    if (!socket || !activeRestaurantId) return;

    socket.emit('join_restaurant', { restaurantId: activeRestaurantId });

    socket.on('order:created', (newOrder: any) => {
      toast(`New Ticket: Order #${newOrder.orderNumber}`, 'success');
      playChime();

      // Trigger desktop notification
      if (Notification.permission === 'granted') {
        new Notification(`New Order #${newOrder.orderNumber}`, {
          body: `Table ${newOrder.tableId?.displayName || 'QR'} placed a new order.`,
          icon: '/favicon.ico',
        });
      }

      // Invalidate active orders query so child views reload
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
    });

    socket.on('order:status_updated', () => {
      // Invalidate both active and served lists
      queryClient.invalidateQueries({ queryKey: ['activeOrdersQueue', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['servedOrdersHistory', activeRestaurantId] });
    });

    socket.on('waiter_call:created', (newCall: any) => {
      toast(`Table ${newCall.tableNumberSnapshot} calls for waiter!`, 'info');
      playChime();

      if (Notification.permission === 'granted') {
        new Notification(`Table ${newCall.tableNumberSnapshot} calls for a waiter!`, {
          body: 'A customer requires floor service assistance.',
          icon: '/favicon.ico',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['waiterCallsQueue', activeRestaurantId] });
    });

    socket.on('waiter_call:resolved', () => {
      queryClient.invalidateQueries({ queryKey: ['waiterCallsQueue', activeRestaurantId] });
    });

    return () => {
      socket.off('order:created');
      socket.off('order:status_updated');
      socket.off('waiter_call:created');
      socket.off('waiter_call:resolved');
    };
  }, [socket, activeRestaurantId, toast, playChime, queryClient]);

  // If STAFF tries to visit MANAGER-only routes, redirect dynamically to allowed route
  useEffect(() => {
    const managerOnlyTabs = [
      'menu',
      'counter',
      'kds',
      'transactions',
      'tables',
      'staff',
      'customers',
      'taxes',
      'settings',
      'analytics',
      'developer',
    ];
    if (isStaff && managerOnlyTabs.includes(activeTab)) {
      const fallback = getPrimaryManagerRoute(isEnabled, user?.role);
      navigate(fallback, { replace: true });
    }
  }, [activeTab, isStaff, isEnabled, user?.role, navigate]);

  const renderHeader = () => (
    <header className="bg-white border-b border-slate-200/80 px-3 md:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-xs shrink-0 z-10">
      <div className="flex items-center gap-2.5">
        {/* Toggle / Expand Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex h-8 w-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 items-center justify-center shadow-2xs cursor-pointer"
          title={isSidebarOpen ? 'Close / Hide Sidebar' : 'Open Sidebar'}
          aria-label={isSidebarOpen ? 'Close / Hide Sidebar' : 'Open Sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-3.5 h-3.5 text-slate-700" strokeWidth={1.75} />
          ) : (
            <PanelLeftOpen className="w-3.5 h-3.5 text-slate-700" strokeWidth={1.75} />
          )}
        </button>

        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-xs">
          <ScanMenuLogo size={16} variant="white" />
        </div>
        <h1 className="font-display tracking-tight text-lg md:text-xl font-bold text-slate-900 leading-none">
          The Scan Menu
        </h1>
        <ConnectionIndicator status={connectionStatus as ConnectionStatus} />
      </div>

      <div className="flex items-center gap-2">
        {/* Global Manager / Staff PIN Lock Chip */}
        <button
          type="button"
          onClick={() => setIsPinLocked(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition cursor-pointer active:scale-95 shadow-2xs"
          title="Lock terminal with PIN or switch user"
        >
          <div className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-[11px] font-bold text-slate-900 truncate max-w-[120px]">
              {user?.name || 'Manager'}
            </span>
            <span className="text-[9px] text-amber-700 font-mono">
              {user?.role === 'SUPER_ADMIN' ? 'Admin' : user?.role === 'MANAGER' ? 'Manager' : 'Staff'} • Lock
            </span>
          </div>
          <Lock className="w-3 h-3 text-amber-600 ml-0.5 shrink-0" />
        </button>

        {/* Kiosk Mode — fullscreen toggle, always visible */}
        <button
          onClick={toggleKioskMode}
          className="h-8 flex items-center gap-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          title="Toggle Fullscreen Kiosk Mode"
        >
          {isKioskMode
            ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
            : <Maximize2 className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />}
          <span>{isKioskMode ? 'Exit Kiosk' : 'Kiosk Mode'}</span>
        </button>
      </div>
    </header>
  );

  return (
    <div className="h-screen flex flex-col bg-[#FAF9F6] text-slate-900 font-sans select-none overflow-hidden">
      <PWAInstallPrompt />
      {impersonatedOutlet && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-extrabold flex items-center justify-between shadow-xs z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>SuperAdmin Impersonation Mode: Currently viewing <strong>{impersonatedOutlet.name}</strong> ({impersonatedOutlet.slug})</span>
          </div>
          <button
            onClick={() => {
              exitImpersonation();
              navigate('/admin/restaurants');
            }}
            className="bg-slate-950 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Exit Impersonation & Return to SuperAdmin
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* ----------------- SIDEBAR (TABLET/DESKTOP) ----------------- */}
      <aside
        className={`hidden md:flex flex-col bg-white shrink-0 h-full transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? 'w-52 md:w-56 border-r border-slate-200/80 opacity-100'
            : 'w-0 border-r-0 opacity-0 pointer-events-none'
        } overflow-hidden`}
      >
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-2xs shrink-0">
              <ScanMenuLogo size={16} variant="white" />
            </div>
            <div>
              <h2 className="font-display tracking-tight text-sm font-bold text-slate-900 leading-none">
                The Scan Menu
              </h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold font-mono mt-0.5">
                Operations Panel
              </p>
            </div>
          </div>

          {/* Close / Collapse Sidebar button */}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            title="Close / Hide Sidebar"
            aria-label="Close / Hide Sidebar"
          >
            <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-none">
          {/* Orders tab */}
          {isEnabled('ordering') && (
            <button
              onClick={() => navigate('/manager/orders')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Orders</span>
              </div>
              <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold font-mono transition-opacity shrink-0 ${
                  activeOrdersCount > 0 ? 'opacity-100' : 'opacity-0'
                } ${
                  activeTab === 'orders' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                }`}>
                  {activeOrdersCount || ' '}
                </span>
            </button>
          )}

          {/* Counter POS tab — visible only for manager/admin if pos module is enabled */}
          {!isStaff && isEnabled('pos') && (
            <button
              onClick={() => navigate('/manager/counter')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'counter'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calculator className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Counter POS</span>
              </div>
            </button>
          )}

          {/* Kitchen (KDS) tab — visible only for manager/admin if KDS module is enabled */}
          {!isStaff && isEnabled('kds') && (
            <button
              onClick={() => navigate('/manager/kds')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Flame className="w-3.5 h-3.5 shrink-0 text-amber-600" strokeWidth={2} />
                <span className="truncate">Kitchen (KDS)</span>
              </div>
            </button>
          )}

          {/* Customer Live Display tab — visible if customer_display module is enabled */}
          {!isStaff && isEnabled('customer_display') && (
            <a
              href={`/r/${(user?.role === 'SUPER_ADMIN' ? impersonatedOutlet?.slug : (user as any)?.restaurants?.[0]?.slug) || 'demo-cafe'}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200/80 transition-all group cursor-pointer"
              title="Open Customer Live Display (TV Queue Screen) in a new tab"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Tv className="w-3.5 h-3.5 shrink-0 text-emerald-600 group-hover:scale-110 transition-transform" strokeWidth={2} />
                <span className="truncate">Live TV Display</span>
              </div>
              <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 uppercase shrink-0">
                TV ↗
              </span>
            </a>
          )}

          {/* Transactions tab (Sidebar) — visible only for manager/admin */}
          {!isStaff && (isEnabled('payments') || isEnabled('pos')) && (
            <button
              onClick={() => navigate('/manager/transactions')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Transactions</span>
              </div>
              {!isEnabled('payments') && (
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </button>
          )}

          {/* Waiter Calls tab */}
          {isEnabled('waiter_call') && (
            <button
              onClick={() => navigate('/manager/waiter-calls')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'waiter-calls'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Waiter Calls</span>
              </div>
              <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold font-mono bg-amber-500 text-slate-950 transition-opacity shrink-0 ${
                  activeWaiterCallsCount > 0 ? 'opacity-100 animate-pulse' : 'opacity-0'
                }`}>
                  {activeWaiterCallsCount || ' '}
                </span>
            </button>
          )}

          {/* Menu tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('qr_menu') && (
            <button
              onClick={() => navigate('/manager/menu')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Menu Management</span>
              </div>
            </button>
          )}

          {/* Inventory & Stock Control tab */}
          {isEnabled('inventory') && (
            <button
              onClick={() => navigate('/manager/inventory')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-3.5 h-3.5 shrink-0 text-amber-500" strokeWidth={1.75} />
                <span className="truncate">Inventory & Stock</span>
              </div>
            </button>
          )}

          {/* Tables tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('qr_menu') && (
            <button
              onClick={() => navigate('/manager/tables')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <TableProperties className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Tables</span>
              </div>
            </button>
          )}

          {/* Staff tab (Manager/Super Admin only) */}
          {!isStaff && (isEnabled('crm') || isEnabled('pos')) && (
            <button
              onClick={() => navigate('/manager/staff')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Staff Management</span>
              </div>
            </button>
          )}

          {/* Customers tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('crm') && (
            <button
              onClick={() => navigate('/manager/customers')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-500" strokeWidth={1.75} />
                <span className="truncate">Customers</span>
              </div>
            </button>
          )}

          {/* Settings tab (Manager/Super Admin only) */}
          {!isStaff && (
            <button
              onClick={() => navigate('/manager/settings')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Settings</span>
              </div>
            </button>
          )}

          {/* Analytics tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('analytics') && (
            <button
              onClick={() => navigate('/manager/analytics')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Analytics & Insights</span>
              </div>
            </button>
          )}

          {/* Developer API & Webhooks tab (Super Admin only) */}
          {user?.role === 'SUPER_ADMIN' && isEnabled('api_webhooks') && (
            <button
              onClick={() => navigate('/manager/developer')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'developer'
                  ? 'bg-slate-950 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">Developer API & Webhooks</span>
              </div>
            </button>
          )}

          {/* Profile tab */}
          <button
            onClick={() => navigate('/manager/profile')}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-950 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Profile</span>
            </div>
          </button>
        </nav>

        {/* User Footnote & Lock Button */}
        <div className="p-2.5 px-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 font-bold shrink-0 text-[11px]">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-extrabold text-slate-900 truncate leading-tight">
                  {user?.name}
                </h4>
                <p className="text-[9px] text-slate-500 truncate font-mono uppercase font-bold tracking-wider">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(`manager_pin_unlocked_${activeRestaurantId}`);
                setIsPinLocked(true);
              }}
              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer shrink-0"
              title="Lock Terminal with PIN"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------- MAIN VIEW WRAPPER ----------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {renderHeader()}

        {/* Active Content Panel */}
        <main
          className={`flex-1 min-h-0 relative ${
            isMenuEditorRoute
              ? 'p-0 overflow-hidden flex flex-col'
              : ['orders', 'counter', 'kds', 'tables', 'menu'].includes(activeTab)
              ? 'p-2 sm:p-2.5 md:p-3 overflow-hidden flex flex-col scrollbar-none'
              : 'p-2.5 sm:p-3 md:p-4 overflow-y-auto scrollbar-none'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* ----------------- BOTTOM BAR (MOBILE ONLY) ----------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 flex items-center justify-around px-2 pb-safe z-40 shadow-lg">
        {/* Orders */}
        {isEnabled('ordering') && (
          <button
            onClick={() => navigate('/manager/orders')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all min-w-0 ${
              activeTab === 'orders' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Receipt className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Orders</span>
            <span className={`absolute top-2 right-1/4 px-1.5 py-0.5 text-[8px] bg-amber-500 text-slate-950 rounded-full font-bold font-mono border border-white transition-opacity ${
                activeOrdersCount > 0 ? 'opacity-100' : 'opacity-0'
              }`}>
                {activeOrdersCount || ' '}
              </span>
          </button>
        )}


        {/* Transactions Bottom Nav (Manager only) */}
        {!isStaff && (isEnabled('payments') || isEnabled('pos')) && (
          <button
            onClick={() => navigate('/manager/transactions')}
            className={`flex flex-col items-center justify-center flex-1 h-full pt-1 pb-1 relative ${
              activeTab === 'transactions' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="relative mb-0.5 mt-0.5">
              <CreditCard className={`w-[18px] h-[18px] min-[375px]:w-5 min-[375px]:h-5 ${activeTab === 'transactions' ? 'fill-amber-50 stroke-amber-500' : ''}`} strokeWidth={activeTab === 'transactions' ? 2 : 1.75} />
              {!isEnabled('payments') && (
                <span className="absolute -top-1 -right-2 bg-slate-100 text-slate-400 rounded-full p-0.5 shadow-sm border border-slate-200">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Payments</span>
          </button>
        )}

        {/* Waiter Calls */}
        {isEnabled('waiter_call') && (
          <button
            onClick={() => navigate('/manager/waiter-calls')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all min-w-0 ${
            activeTab === 'waiter-calls' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Waiter Calls</span>
          <span className={`absolute top-2 right-1/4 px-1.5 py-0.5 text-[8px] bg-amber-500 text-slate-950 rounded-full font-bold font-mono border border-white transition-opacity ${
              activeWaiterCallsCount > 0 ? 'opacity-100 animate-pulse' : 'opacity-0'
            }`}>
              {activeWaiterCallsCount || ' '}
            </span>
        </button>
        )}

        {/* Menu (Manager only) */}
        {!isStaff && isEnabled('qr_menu') && (
          <button
            onClick={() => navigate('/manager/menu')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'menu' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <BookOpen className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Menu</span>
          </button>
        )}

        {/* Tables (Manager only) */}
        {!isStaff && isEnabled('qr_menu') && (
          <button
            onClick={() => navigate('/manager/tables')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'tables' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <TableProperties className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Tables</span>
          </button>
        )}

        {/* Staff (Manager only) */}
        {!isStaff && (isEnabled('crm') || isEnabled('pos')) && (
          <button
            onClick={() => navigate('/manager/staff')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'staff' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Users className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Staff</span>
          </button>
        )}

        {/* Taxes (Manager only) */}
        {!isStaff && isEnabled('ordering') && (
          <button
            onClick={() => navigate('/manager/taxes')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'taxes' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Calculator className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Taxes</span>
          </button>
        )}

        {/* Settings (Manager only) */}
        {!isStaff && (
          <button
            onClick={() => navigate('/manager/settings')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'settings' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Settings className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Settings</span>
          </button>
        )}

        {/* Analytics (Manager only) */}
        {!isStaff && isEnabled('analytics') && (
          <button
            onClick={() => navigate('/manager/analytics')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              activeTab === 'analytics' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Analytics</span>
          </button>
        )}

        {/* Profile */}
        <button
          onClick={() => navigate('/manager/profile')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
            activeTab === 'profile' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <User className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">Profile</span>
        </button>

        {/* More — shows Counter POS, KDS, Developer in a slide-up drawer (Manager / Admin only) */}
        {!isStaff && (
          <button
            id="mobile-more-menu-btn"
            onClick={() => setMoreDrawerOpen((o) => !o)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all min-w-0 ${
              moreDrawerOpen ? 'text-amber-500 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] min-[375px]:text-[10px] truncate w-full text-center leading-none px-0.5">More</span>
          </button>
        )}
      </nav>

      {/* ---- MOBILE "MORE" SLIDE-UP DRAWER ---- */}
      {!isStaff && moreDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setMoreDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white border-t border-slate-150 rounded-t-3xl shadow-2xl p-4 pb-safe animate-slide-up">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">More</h3>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Counter POS */}
              {isEnabled('ordering') && (
                <button
                  id="mobile-more-counter-btn"
                  onClick={() => { navigate('/manager/counter'); setMoreDrawerOpen(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    activeTab === 'counter'
                      ? 'bg-slate-950 border-slate-950 text-white'
                      : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calculator className="w-6 h-6" strokeWidth={1.75} />
                  <span className="text-[10px] font-bold text-center leading-none">Counter POS</span>
                </button>
              )}
              {/* Kitchen */}
              {isEnabled('kds') && (
                <button
                  id="mobile-more-kds-btn"
                  onClick={() => { navigate('/manager/kds'); setMoreDrawerOpen(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    activeTab === 'kds'
                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                      : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Flame className="w-6 h-6 text-amber-500" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-center leading-none">Kitchen</span>
                </button>
              )}
              {/* Live TV Display */}
              {isEnabled('customer_display') && (
                <a
                  href={`/r/${(user?.role === 'SUPER_ADMIN' ? impersonatedOutlet?.slug : (user as any)?.restaurants?.[0]?.slug) || 'demo-cafe'}/display`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-all text-center"
                >
                  <Tv className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                  <span className="text-[10px] font-bold text-center leading-none">TV Display ↗</span>
                </a>
              )}
              {/* Inventory */}
              {isEnabled('inventory') && (
                <button
                  id="mobile-more-inventory-btn"
                  onClick={() => { navigate('/manager/inventory'); setMoreDrawerOpen(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-slate-950 border-slate-950 text-white'
                      : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-6 h-6 text-amber-500" strokeWidth={1.75} />
                  <span className="text-[10px] font-bold text-center leading-none">Inventory</span>
                </button>
              )}
              {/* Developer API — Super Admin only */}
              {user?.role === 'SUPER_ADMIN' && isEnabled('api_webhooks') && (
                <button
                  id="mobile-more-developer-btn"
                  onClick={() => { navigate('/manager/developer'); setMoreDrawerOpen(false); }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                    activeTab === 'developer'
                      ? 'bg-slate-950 border-slate-950 text-white'
                      : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Code className="w-6 h-6" strokeWidth={1.75} />
                  <span className="text-[10px] font-bold text-center leading-none">Developer</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
      </div>

      {/* ── GLOBAL PIN LOCK SCREEN (ON REFRESH / LONG IDLE) ─────────────────── */}
      <PosLockScreenModal
        isOpen={isPinLocked && !!activeRestaurantId}
        restaurantId={activeRestaurantId || ''}
        restaurantName={impersonatedOutlet?.name || (user as any)?.restaurants?.[0]?.name || 'Operations Panel'}
        title="Restaurant Terminal Locked"
        subtitle="Enter your 4-6 digit staff or manager PIN to access dashboard"
        onUnlockSuccess={(unlockedUser) => {
          sessionStorage.setItem(`pos_cashier_${activeRestaurantId}`, JSON.stringify(unlockedUser));
          setIsPinLocked(false);
        }}
      />
    </div>
  );
};

export default ManagerLayout;
