import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ScanMenuLogo } from './ScanMenuLogo';
import {
  Shield,
  LayoutGrid,
  Store,
  PlusCircle,
  CreditCard,
  BarChart3,
  ToggleRight,
  User,
  LogOut,
  MoreHorizontal,
  X,
  Plug,
  Clock,
  Settings,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const currentPath = location.pathname;

  const activeTab = currentPath.startsWith('/admin/dashboard')
    ? 'dashboard'
    : currentPath === '/admin/setup-hub'
    ? 'setup-hub'
    : currentPath === '/admin/restaurants/provision'
    ? 'provision'
    : currentPath.startsWith('/admin/restaurants')
    ? 'restaurants'
    : currentPath.startsWith('/admin/subscriptions')
    ? 'subscriptions'
    : currentPath.startsWith('/admin/pos-integrations')
    ? 'pos-integrations'
    : currentPath.startsWith('/admin/payments')
    ? 'payments'
    : currentPath.startsWith('/admin/audit-logs')
    ? 'audit-logs'
    : currentPath.startsWith('/admin/analytics')
    ? 'analytics'
    : currentPath.startsWith('/admin/feature-flags')
    ? 'feature-flags'
    : currentPath.startsWith('/admin/profile')
    ? 'profile'
    : '';

  const pageTitle =
    activeTab === 'dashboard'
      ? 'Platform Command Center'
      : activeTab === 'setup-hub'
      ? 'Outlet Onboarding & Setup Hub'
      : activeTab === 'restaurants'
      ? 'Tenants Directory'
      : activeTab === 'provision'
      ? 'Provision Outlet Wizard'
      : activeTab === 'subscriptions'
      ? 'Subscription Plans'
      : activeTab === 'pos-integrations'
      ? 'External POS Integrations'
      : activeTab === 'payments'
      ? 'Payment Gateways & Methods'
      : activeTab === 'audit-logs'
      ? 'Global System Audit Logs'
      : activeTab === 'analytics'
      ? 'Platform Analytics'
      : activeTab === 'feature-flags'
      ? 'Global Feature Flags'
      : activeTab === 'profile'
      ? 'Admin Profile'
      : 'SuperAdmin Control Panel';

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#FAF9F6] text-slate-900 font-sans select-none overflow-hidden">
      {/* SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-150 shrink-0 h-full">
        <div className="p-5 border-b border-slate-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <ScanMenuLogo size={24} variant="white" />
            </div>
            <div>
              <h2 className="font-display tracking-tight text-xl font-bold text-slate-900 leading-none">
                The Scan Menu
              </h2>
              <p className="text-[10px] text-amber-600 font-semibold font-mono uppercase tracking-wider mt-1">
                SuperAdmin Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            <span>Dashboard</span>
          </button>

          {/* Outlet Setup & Onboarding Hub */}
          <button
            onClick={() => navigate('/admin/setup-hub')}
            className={`flex items-center justify-between w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'setup-hub'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>Setup Hub</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-amber-400 text-slate-950">
              Audit
            </span>
          </button>

          {/* Tenants Directory */}
          <button
            onClick={() => navigate('/admin/restaurants')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'restaurants'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" strokeWidth={1.75} />
            <span>Tenants Directory</span>
          </button>

          {/* Provision Tenant */}
          <button
            onClick={() => navigate('/admin/restaurants/provision')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'provision'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600" strokeWidth={2} />
            <span>Provision Wizard</span>
          </button>

          {/* Subscriptions */}
          <button
            onClick={() => navigate('/admin/subscriptions')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" strokeWidth={1.75} />
            <span>Subscriptions</span>
          </button>

          {/* POS Integrations Hub */}
          <button
            onClick={() => navigate('/admin/pos-integrations')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'pos-integrations'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Plug className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <span>POS Integrations</span>
          </button>

          {/* Payment Gateways Manager */}
          <button
            onClick={() => navigate('/admin/payments')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
            <span>Payment Gateways</span>
          </button>

          {/* Global System Audit Logs */}
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'audit-logs'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" strokeWidth={1.75} />
            <span>System Audit Logs</span>
          </button>

          {/* Platform Analytics */}
          <button
            onClick={() => navigate('/admin/analytics')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'analytics'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" strokeWidth={1.75} />
            <span>Platform Analytics</span>
          </button>

          {/* Feature Flags Matrix */}
          <button
            onClick={() => navigate('/admin/feature-flags')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'feature-flags'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ToggleRight className="w-4 h-4" strokeWidth={1.75} />
            <span>Feature Flags</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => navigate('/admin/profile')}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" strokeWidth={1.75} />
            <span>Admin Profile</span>
          </button>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-950 text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Desktop Top Header */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-150 px-8 items-center justify-between shrink-0">
          <h1 className="font-display tracking-tight text-xl font-bold text-slate-900">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/restaurants/provision')}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" strokeWidth={2} />
              <span>Provision Outlet</span>
            </button>

            <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg uppercase">
              SUPER_ADMIN
            </span>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="md:hidden h-14 bg-white border-b border-slate-150 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" strokeWidth={2} />
            <span className="font-display text-lg font-bold text-slate-900">{pageTitle}</span>
          </div>

          <button
            onClick={() => setMoreDrawerOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden flex justify-end">
          <div className="w-72 bg-white h-full p-6 space-y-4 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="font-bold text-sm">Navigation Menu</h3>
              <button onClick={() => setMoreDrawerOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto text-xs font-bold">
              <button onClick={() => { navigate('/admin/dashboard'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Dashboard</button>
              <button onClick={() => { navigate('/admin/setup-hub'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 font-extrabold flex items-center justify-between text-amber-700">
                <span>Setup & Onboarding Hub</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono">Audit</span>
              </button>
              <button onClick={() => { navigate('/admin/restaurants'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Tenants Directory</button>
              <button onClick={() => { navigate('/admin/restaurants/provision'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl bg-amber-50 text-amber-900 font-extrabold">Provision Outlet</button>
              <button onClick={() => { navigate('/admin/subscriptions'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Subscriptions</button>
              <button onClick={() => { navigate('/admin/pos-integrations'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">POS Integrations</button>
              <button onClick={() => { navigate('/admin/payments'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Payment Gateways</button>
              <button onClick={() => { navigate('/admin/audit-logs'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">System Audit Logs</button>
              <button onClick={() => { navigate('/admin/analytics'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Platform Analytics</button>
              <button onClick={() => { navigate('/admin/feature-flags'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Feature Flags</button>
              <button onClick={() => { navigate('/admin/profile'); setMoreDrawerOpen(false); }} className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100">Profile</button>
            </div>
            <button onClick={logout} className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-xs">Log Out</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
