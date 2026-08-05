import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/restaurant.service';
import {
  Store,
  ShieldAlert,
  TrendingUp,
  CreditCard,
  PlusCircle,
  BarChart3,
  ToggleRight,
  Layers,
  Loader,
  ArrowUpRight,
  DollarSign,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch basic stats
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminService.getPlatformStats,
  });

  // Fetch platform analytics
  const { data: analyticsResponse, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: adminService.getPlatformAnalytics,
  });

  if (isLoadingStats || isLoadingAnalytics) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const stats = statsResponse?.data || {
    totalRestaurants: 0,
    activeRestaurants: 0,
    suspendedRestaurants: 0,
    totalOrders: 0,
    activityFeed: [],
  };

  const analytics = analyticsResponse?.data || {
    totalRevenue: 0,
    dailyTrend: [],
    topRestaurants: [],
    planDistribution: { FREE: 0, STARTER: 0, PROFESSIONAL: 0, ENTERPRISE: 0 },
  };

  const formattedGMV = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(analytics.totalRevenue / 100);

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Platform Command Center</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mt-1">Platform Overview</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Monitor real-time GMV, active tenants, subscription distribution, and platform system health across all dining outlets.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/restaurants/provision')}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition shadow-md shrink-0"
        >
          <PlusCircle className="w-4 h-4" strokeWidth={2} />
          <span>Provision New Tenant</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Total Platform GMV</span>
            <DollarSign className="w-5 h-5 text-emerald-500" strokeWidth={2} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formattedGMV}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Non-cancelled orders sum</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Tenants</span>
            <Store className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{stats.totalRestaurants}</h3>
          <p className="text-[10px] text-emerald-600 font-bold mt-1">{stats.activeRestaurants} Active & Trial</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Suspended Outlets</span>
            <ShieldAlert className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{stats.suspendedRestaurants}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Immediate access blocked</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-indigo-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Platform Orders</span>
            <TrendingUp className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{stats.totalOrders}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Lifetime tickets generated</p>
        </div>
      </div>

      {/* Middle Row: Quick Actions + Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick Action Shortcuts (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Admin Operations</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate('/admin/restaurants')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 bg-slate-50 hover:bg-slate-100 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <Store className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Manage Outlets</h4>
                  <p className="text-[10px] text-slate-400">Search, suspend, or edit tenants</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
            </button>

            <button
              onClick={() => navigate('/admin/subscriptions')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 bg-slate-50 hover:bg-slate-100 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Subscription Plans</h4>
                  <p className="text-[10px] text-slate-400">Assign & review tenant plans</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
            </button>

            <button
              onClick={() => navigate('/admin/analytics')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 bg-slate-50 hover:bg-slate-100 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Cross-Tenant Analytics</h4>
                  <p className="text-[10px] text-slate-400">GMV & order volume trends</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
            </button>

            <button
              onClick={() => navigate('/admin/feature-flags')}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-150 bg-slate-50 hover:bg-slate-100 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <ToggleRight className="w-4.5 h-4.5 text-slate-600" strokeWidth={1.75} />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">Feature Flags Matrix</h4>
                  <p className="text-[10px] text-slate-400">Global module toggles</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
            </button>
          </div>
        </div>

        {/* Subscription Plan Distribution (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900">Plan Distribution</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">FREE</span>
              <span className="px-2.5 py-1 text-xs font-black font-mono bg-slate-200 text-slate-800 rounded-xl">
                {analytics.planDistribution.FREE || 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">STARTER</span>
              <span className="px-2.5 py-1 text-xs font-black font-mono bg-amber-200 text-amber-950 rounded-xl">
                {analytics.planDistribution.STARTER || 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">PROFESSIONAL</span>
              <span className="px-2.5 py-1 text-xs font-black font-mono bg-indigo-200 text-indigo-950 rounded-xl">
                {analytics.planDistribution.PROFESSIONAL || 0}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">ENTERPRISE</span>
              <span className="px-2.5 py-1 text-xs font-black font-mono bg-purple-200 text-purple-950 rounded-xl">
                {analytics.planDistribution.ENTERPRISE || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Feed (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>Live Activity Feed</span>
            </h3>
          </div>
          {stats.activityFeed.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No recent platform activity.</div>
          ) : (
            <div className="space-y-3 max-h-[16rem] overflow-y-auto pr-1">
              {stats.activityFeed.map((act: any, idx: number) => (
                <div key={idx} className="flex gap-2.5 text-xs">
                  <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${act.type === 'RESTAURANT_CREATED' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-slate-700 leading-snug">{act.message}</p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
