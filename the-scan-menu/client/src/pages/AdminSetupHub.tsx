import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService, Restaurant } from '../services/restaurant.service';
import {
  CheckCircle2,
  AlertTriangle,
  Settings,
  PlusCircle,
  Search,
  Loader,
  ArrowRight,
} from 'lucide-react';
import apiClient from '../lib/api';

export const AdminSetupHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTION_REQUIRED' | 'READY'>('ALL');

  // Fetch all restaurants
  const { data: restResponse, isLoading: isLoadingRests } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: () => adminService.listRestaurants(1, 100),
  });

  const restaurants: Restaurant[] = restResponse?.data?.restaurants || [];

  // Fetch setup audit summaries for all restaurants
  const { data: auditsData, isLoading: isLoadingAudits } = useQuery({
    queryKey: ['adminAllSetupAudits', restaurants.map((r) => r._id).join(',')],
    queryFn: async () => {
      const results: Record<string, any> = {};
      await Promise.all(
        restaurants.map(async (r) => {
          try {
            const res = await apiClient.get(`/admin/restaurants/${r._id}/setup-audit`);
            results[r._id] = res.data?.data;
          } catch (e) {
            results[r._id] = null;
          }
        })
      );
      return results;
    },
    enabled: restaurants.length > 0,
  });

  const audits = auditsData || {};

  const filteredRestaurants = restaurants.filter((rest) => {
    const audit = audits[rest._id];
    const matchesSearch =
      rest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rest.slug && rest.slug.toLowerCase().includes(searchTerm.toLowerCase()));

    const isReady = audit?.isReadyForService || (audit?.overallPercentage ?? 0) === 100;
    const hasActionRequired = audit && audit.missingFeatureSetups && audit.missingFeatureSetups.length > 0;

    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTION_REQUIRED' && (hasActionRequired || !isReady)) ||
      (filter === 'READY' && isReady);

    return matchesSearch && matchesFilter;
  });

  const totalCount = restaurants.length;
  const readyCount = restaurants.filter((r) => audits[r._id]?.isReadyForService).length;
  const actionRequiredCount = totalCount - readyCount;

  return (
    <div className="w-full space-y-6 font-sans pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-amber-500" strokeWidth={1.75} />
            <span>Outlet Onboarding & Setup Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            SuperAdmin central dashboard to track configuration progress, missing prerequisites, and operational readiness for all outlets.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/restaurants/provision')}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl transition flex items-center gap-2 shadow-sm shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" strokeWidth={2} />
          <span>Provision New Outlet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Outlets</span>
          <h3 className="text-3xl font-black font-mono text-slate-900 mt-2">{totalCount}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Ready for Service (100%)</span>
          </span>
          <h3 className="text-3xl font-black font-mono text-emerald-600 mt-2">{readyCount}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Setup Action Required</span>
          </span>
          <h3 className="text-3xl font-black font-mono text-amber-600 mt-2">{actionRequiredCount}</h3>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-150 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search outlet by name or slug..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: 'ACTION_REQUIRED', label: `Action Required (${actionRequiredCount})` },
            { id: 'READY', label: `Ready for Service (${readyCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Outlet Cards Grid */}
      {isLoadingRests || (restaurants.length > 0 && isLoadingAudits) ? (
        <div className="min-h-[250px] flex items-center justify-center">
          <Loader className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center text-slate-400">
          No outlets match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRestaurants.map((rest) => {
            const audit = audits[rest._id];
            const progress = audit?.overallPercentage ?? 0;
            const missingSetups = audit?.missingFeatureSetups || [];
            const isReady = audit?.isReadyForService;

            return (
              <div
                key={rest._id}
                className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs">
                        {rest.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 leading-tight">{rest.name}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">/r/{rest.slug}</p>
                      </div>
                    </div>

                    {/* Progress Badge */}
                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl shrink-0">
                      <div className="relative w-7 h-7 flex items-center justify-center">
                        <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={progress >= 80 ? 'text-emerald-500' : progress >= 50 ? 'text-amber-500' : 'text-rose-500'}
                            strokeDasharray={`${progress}, 100`}
                            strokeWidth="4"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black text-slate-900">{progress}%</span>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isReady ? 'Ready' : 'Setup Required'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Checklist Pills */}
                  {audit && (
                    <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                        🍽️ {audit.summary.tablesCount} Tables
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                        📂 {audit.summary.categoriesCount} Categories
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                        🍕 {audit.summary.menuItemsCount} Items
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-xl font-medium border ${
                          audit.summary.paymentsConfigured
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        💳 {audit.summary.paymentsConfigured ? 'Payments Active' : 'Payments Incomplete'}
                      </span>
                    </div>
                  )}

                  {/* Missing Feature Alert */}
                  {missingSetups.length > 0 && (
                    <div className="mt-3.5 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Action Required ({missingSetups.length})</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        {missingSetups.map((m: any) => `${m.featureName}: ${m.missingRequirements.join(', ')}`).join(' • ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {audit?.completedSteps || 0} / {audit?.totalSteps || 0} Steps Configured
                  </span>

                  <button
                    onClick={() => navigate(`/admin/restaurants/${rest._id}`)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Open Setup Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSetupHub;
