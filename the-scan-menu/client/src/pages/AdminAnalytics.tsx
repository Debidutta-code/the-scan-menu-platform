import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import {
  DollarSign,
  Calendar,
  Loader,
  Trophy,
} from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const { data: analyticsResponse, isLoading } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: adminService.getPlatformAnalytics,
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const analytics = analyticsResponse?.data || {
    totalRevenue: 0,
    dailyTrend: [],
    topRestaurants: [],
    planDistribution: {},
  };

  const formattedGMV = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(analytics.totalRevenue / 100);

  return (
    <div className="w-full space-y-8 font-sans">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Cross-Tenant Intelligence</span>
          <h2 className="font-display text-3xl font-bold mt-1">Platform Analytics</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Aggregated gross merchandise value (GMV), 30-day transaction volume, and top performing restaurant leaderboards.
          </p>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Platform Lifetime GMV</span>
            <DollarSign className="w-5 h-5 text-emerald-500" strokeWidth={2} />
          </div>
          <h3 className="text-3xl font-black font-mono text-slate-900 mt-3">{formattedGMV}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Calculated across all non-cancelled transactions</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Top Performing Outlets</span>
            <Trophy className="w-5 h-5 text-amber-500" strokeWidth={2} />
          </div>
          <h3 className="text-3xl font-black font-mono text-slate-900 mt-3">{analytics.topRestaurants.length} Outlets</h3>
          <p className="text-[10px] text-slate-400 mt-1">Leading revenue generators</p>
        </div>
      </div>

      {/* Grid: Top Restaurants Leaderboard + 30-Day Daily Revenue Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leaderboard */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" strokeWidth={2} />
            <span>Top Performing Outlets</span>
          </h3>

          {analytics.topRestaurants.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No sales data logged yet.</div>
          ) : (
            <div className="space-y-3">
              {analytics.topRestaurants.map((item: any, idx: number) => {
                const itemGMV = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(item.totalRevenue / 100);

                return (
                  <div key={item._id} className="p-3.5 rounded-2xl border border-slate-150 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 font-mono font-extrabold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">Code: {item.code || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-emerald-600 block">{itemGMV}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{item.totalOrders} orders</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 30-Day Daily Sales Breakdown */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
            <span>30-Day Daily Sales Log</span>
          </h3>

          {analytics.dailyTrend.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No daily sales logs found in past 30 days.</div>
          ) : (
            <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
              {analytics.dailyTrend.map((day: any) => {
                const dayGMV = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(day.revenue / 100);

                return (
                  <div key={day._id} className="p-3 rounded-2xl border border-slate-150 bg-slate-50 flex items-center justify-between text-xs">
                    <span className="font-bold font-mono text-slate-700">{day._id}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 font-mono text-[11px]">{day.orders} orders</span>
                      <span className="font-extrabold font-mono text-slate-900">{dayGMV}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminAnalytics;
