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
  Volume2,
  VolumeX,
  BellRing,
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

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

  // Fetch Live socket status
  const token = localStorage.getItem('accessToken');
  const { socket, status: connectionStatus } = useSocket(token);

  // Active tab tracking by pathname
  const currentPath = location.pathname;
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

  // Set alert permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setAlertsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleToggleAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast('Your browser does not support desktop notifications.', 'error');
      return;
    }

    if (Notification.permission === 'granted') {
      setAlertsEnabled(true);
      toast('Alerts are already enabled!', 'success');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setAlertsEnabled(true);
      toast('Desktop alerts successfully enabled!', 'success');
    } else {
      setAlertsEnabled(false);
      toast('Permission denied for desktop alerts.', 'error');
    }
  };

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
    <header className="bg-white border-b border-slate-150 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0 z-10">
      <div className="flex items-center gap-3">
        {/* Toggle / Expand Sidebar Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition active:scale-95 items-center justify-center shadow-2xs"
          title={isSidebarOpen ? 'Close / Hide Sidebar' : 'Open Sidebar'}
          aria-label={isSidebarOpen ? 'Close / Hide Sidebar' : 'Open Sidebar'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-slate-700" strokeWidth={1.75} />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-slate-700" strokeWidth={1.75} />
          )}
        </button>

        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
          <ScanMenuLogo size={20} variant="white" />
        </div>
        <h1 className="font-display tracking-tight text-xl md:text-2xl font-semibold text-slate-900 leading-none">
          The Scan Menu
        </h1>
        <ConnectionIndicator status={connectionStatus as ConnectionStatus} />
      </div>

      <div className="flex items-center gap-2">
        {/* Sound Chime Switcher */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            toast(soundEnabled ? 'Sound notifications muted' : 'Sound notifications enabled', 'info');
          }}
          className={`p-2 rounded-xl border transition-all ${
            soundEnabled
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
          }`}
          title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" strokeWidth={1.75} /> : <VolumeX className="w-4 h-4" strokeWidth={1.75} />}
        </button>

        {/* Push notifications button */}
        <button
          onClick={handleToggleAlerts}
          className={`p-2 rounded-xl border transition-all ${
            alertsEnabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
          }`}
          title={alertsEnabled ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
        >
          <BellRing className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Kiosk Mode — fullscreen toggle, always visible */}
        <button
          onClick={toggleKioskMode}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-95"
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
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-extrabold flex items-center justify-between shadow-sm z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>SuperAdmin Impersonation Mode: Currently viewing <strong>{impersonatedOutlet.name}</strong> ({impersonatedOutlet.slug})</span>
          </div>
          <button
            onClick={() => {
              exitImpersonation();
              navigate('/admin/restaurants');
            }}
            className="bg-slate-950 text-white px-3 py-1 rounded-xl text-[11px] font-bold hover:bg-slate-800 transition"
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
            ? 'w-64 border-r border-slate-150 opacity-100'
            : 'w-0 border-r-0 opacity-0 pointer-events-none'
        } overflow-hidden`}
      >
        <div className="p-4 md:p-5 border-b border-slate-150 flex items-center justify-between min-w-[16rem]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
              <ScanMenuLogo size={24} variant="white" />
            </div>
            <div>
              <h2 className="font-display tracking-tight text-xl font-bold text-slate-900 leading-none">
                The Scan Menu
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold font-mono mt-1">
                Operations Panel
              </p>
            </div>
          </div>

          {/* Close / Collapse Sidebar button */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
            title="Close / Hide Sidebar"
            aria-label="Close / Hide Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-w-[16rem]">
          {/* Orders tab */}
          {isEnabled('ordering') && (
            <button
              onClick={() => navigate('/manager/orders')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'orders'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4" strokeWidth={1.75} />
                <span>Orders</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold font-mono transition-opacity ${
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
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'counter'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-4 h-4" strokeWidth={1.75} />
                <span>Counter POS</span>
              </div>
            </button>
          )}

          {/* Kitchen (KDS) tab — visible only for manager/admin if KDS module is enabled */}
          {!isStaff && isEnabled('kds') && (
            <button
              onClick={() => navigate('/manager/kds')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'kds'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-amber-600" strokeWidth={2} />
                <span>Kitchen (KDS)</span>
              </div>
            </button>
          )}

          {/* Transactions tab (Sidebar) — visible only for manager/admin */}
          {!isStaff && (isEnabled('payments') || isEnabled('pos')) && (
            <button
              onClick={() => navigate('/manager/transactions')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'transactions'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4" strokeWidth={1.75} />
                <span>Transactions</span>
              </div>
              {!isEnabled('payments') && (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          )}

          {/* Waiter Calls tab */}
          {isEnabled('waiter_call') && (
            <button
              onClick={() => navigate('/manager/waiter-calls')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'waiter-calls'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" strokeWidth={1.75} />
                <span>Waiter Calls</span>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold font-mono bg-amber-500 text-slate-950 transition-opacity ${
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
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'menu'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" strokeWidth={1.75} />
              <span>Menu Management</span>
            </button>
          )}

          {/* Inventory & Stock Control tab */}
          {isEnabled('inventory') && (
            <button
              onClick={() => navigate('/manager/inventory')}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                <span>Inventory & Stock</span>
              </div>
            </button>
          )}

          {/* Tables tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('qr_menu') && (
            <button
              onClick={() => navigate('/manager/tables')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'tables'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-4 h-4" strokeWidth={1.75} />
              <span>Tables</span>
            </button>
          )}

          {/* Staff tab (Manager/Super Admin only) */}
          {!isStaff && (isEnabled('crm') || isEnabled('pos')) && (
            <button
              onClick={() => navigate('/manager/staff')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'staff'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" strokeWidth={1.75} />
              <span>Staff Management</span>
            </button>
          )}

          {/* Customers tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('crm') && (
            <button
              onClick={() => navigate('/manager/customers')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'customers'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>Customers</span>
            </button>
          )}

          {/* Taxes tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('ordering') && (
            <button
              onClick={() => navigate('/manager/taxes')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'taxes'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" strokeWidth={1.75} />
              <span>Tax Management</span>
            </button>
          )}

          {/* Settings tab (Manager/Super Admin only) */}
          {!isStaff && (
            <button
              onClick={() => navigate('/manager/settings')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" strokeWidth={1.75} />
              <span>Settings</span>
            </button>
          )}

          {/* Analytics tab (Manager/Super Admin only) */}
          {!isStaff && isEnabled('analytics') && (
            <button
              onClick={() => navigate('/manager/analytics')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.75} />
              <span>Analytics & Insights</span>
            </button>
          )}

          {/* Developer API & Webhooks tab (Super Admin only) */}
          {user?.role === 'SUPER_ADMIN' && isEnabled('api_webhooks') && (
            <button
              onClick={() => navigate('/manager/developer')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'developer'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Code className="w-4 h-4" strokeWidth={1.75} />
              <span>Developer API & Webhooks</span>
            </button>
          )}

          {/* Profile tab */}
          <button
            onClick={() => navigate('/manager/profile')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" strokeWidth={1.75} />
            <span>Profile</span>
          </button>
        </nav>

        {/* User Footnote */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50 min-w-[16rem]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold shrink-0 text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-extrabold text-slate-900 truncate leading-tight">
                {user?.name}
              </h4>
              <p className="text-[10px] text-slate-500 truncate font-mono uppercase font-bold tracking-wider mt-0.5">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ----------------- MAIN VIEW WRAPPER ----------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {renderHeader()}

        {/* Active Content Panel */}
        <main className="flex-1 h-0 overflow-y-auto relative p-6">
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
              {/* KDS */}
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
    </div>
  );
};

export default ManagerLayout;
