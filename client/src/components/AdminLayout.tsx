import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const currentPath = location.pathname;

  const activeTab = currentPath.startsWith('/admin/dashboard')
    ? 'dashboard'
    : currentPath === '/admin/restaurants/provision'
    ? 'provision'
    : currentPath.startsWith('/admin/restaurants')
    ? 'restaurants'
    : currentPath.startsWith('/admin/subscriptions')
    ? 'subscriptions'
    : currentPath.startsWith('/admin/analytics')
    ? 'analytics'
    : currentPath.startsWith('/admin/feature-flags')
    ? 'feature-flags'
    : currentPath.startsWith('/admin/profile')
    ? 'profile'
    : '';

  const renderHeader = () => (
    <header className="bg-white border-b border-slate-150 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <Shield className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-display tracking-tight text-2xl font-bold text-slate-900 leading-none">
            Pixora SuperAdmin
          </h1>
          <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase tracking-wider">
            Platform Control Center
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/manager/orders')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <Store className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
          <span>Tenant View</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] font-mono">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <span className="text-xs font-extrabold text-slate-900 truncate max-w-[120px]">{user?.name || 'Super Admin'}</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-red-50 transition"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#FAF9F6] text-slate-900 font-sans select-none overflow-hidden">
      {/* ----------------- SIDEBAR (TABLET/DESKTOP) ----------------- */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-150 shrink-0 h-full">
        <div className="p-6 border-b border-slate-150">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-amber-500 shadow-sm">
              <Shield className="w-4.5 h-4.5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-display tracking-tight text-2xl font-bold text-slate-900 leading-none">
                Pixora QR
              </h2>
              <p className="text-[10px] text-amber-600 font-semibold font-mono uppercase tracking-wider mt-0.5">
                SuperAdmin Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            <span>Dashboard</span>
          </button>

          {/* Tenants Directory */}
          <button
            onClick={() => navigate('/admin/restaurants')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
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
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
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
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" strokeWidth={1.75} />
            <span>Subscriptions</span>
          </button>

          {/* Platform Analytics */}
          <button
            onClick={() => navigate('/admin/analytics')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
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
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
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
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
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
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 bg-slate-900 text-amber-500 rounded-xl flex items-center justify-center font-extrabold shrink-0 text-xs">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-extrabold text-slate-900 truncate leading-tight">
                  {user?.name || 'Super Admin'}
                </h4>
                <p className="text-[10px] text-amber-700 truncate font-mono uppercase font-bold tracking-wider mt-0.5">
                  SUPER_ADMIN
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* ----------------- MAIN VIEW WRAPPER ----------------- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {renderHeader()}

        <main className="flex-1 h-0 overflow-y-auto relative p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* ----------------- BOTTOM BAR (MOBILE ONLY) ----------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 flex items-center justify-around px-2 pb-safe z-40 shadow-lg">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'dashboard' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutGrid className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] truncate">Dashboard</span>
        </button>

        <button
          onClick={() => navigate('/admin/restaurants')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'restaurants' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Store className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] truncate">Tenants</span>
        </button>

        <button
          onClick={() => navigate('/admin/restaurants/provision')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'provision' ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <PlusCircle className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] truncate">Provision</span>
        </button>

        <button
          onClick={() => navigate('/admin/subscriptions')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            activeTab === 'subscriptions' ? 'text-slate-950 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <CreditCard className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] truncate">Plans</span>
        </button>

        <button
          onClick={() => setMoreDrawerOpen(!moreDrawerOpen)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
            moreDrawerOpen ? 'text-amber-500 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
          <span className="text-[9px] truncate">More</span>
        </button>
      </nav>

      {/* MOBILE MORE DRAWER */}
      {moreDrawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setMoreDrawerOpen(false)}
          />
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white border-t border-slate-150 rounded-t-3xl shadow-2xl p-4 pb-safe animate-slide-up">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Admin Tools</h3>
              <button onClick={() => setMoreDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { navigate('/admin/analytics'); setMoreDrawerOpen(false); }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border bg-slate-50 border-slate-150 text-slate-700"
              >
                <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold text-center">Analytics</span>
              </button>
              <button
                onClick={() => { navigate('/admin/feature-flags'); setMoreDrawerOpen(false); }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border bg-slate-50 border-slate-150 text-slate-700"
              >
                <ToggleRight className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold text-center">Feature Flags</span>
              </button>
              <button
                onClick={() => { navigate('/admin/profile'); setMoreDrawerOpen(false); }}
                className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border bg-slate-50 border-slate-150 text-slate-700"
              >
                <User className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-bold text-center">Profile</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLayout;
