import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  ToggleRight,
  Store,
  Loader,
  Search,
} from 'lucide-react';

export const AdminFeatureFlags: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);

  // Fetch restaurants
  const { data: restResponse, isLoading: isLoadingRests } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: () => adminService.listRestaurants(1, 100),
  });

  // Fetch target restaurant flags
  const { data: flagsResponse, isLoading: isLoadingFlags } = useQuery({
    queryKey: ['adminTenantFlags', selectedRestId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${selectedRestId}/feature-flags`);
      return res.data;
    },
    enabled: !!selectedRestId,
  });

  // Toggle flag mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ restaurantId, flags }: { restaurantId: string; flags: any[] }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/feature-flags`, { flags });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTenantFlags', selectedRestId] });
      toast('Feature flags updated for tenant!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating feature flags', 'error');
    },
  });

  if (isLoadingRests) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const restaurants = restResponse?.data?.restaurants || [];
  const filteredRestaurants = restaurants.filter((r: any) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentFlags = flagsResponse?.data?.flags || [];

  const handleToggleFlag = (flagKey: string, currentStatus: boolean) => {
    if (!selectedRestId) return;

    const updatedFlags = currentFlags.map((f: any) =>
      f.key === flagKey ? { ...f, enabled: !currentStatus } : f
    );

    toggleMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  return (
    <div className="w-full space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Module Control Matrix</span>
          <h2 className="font-display text-3xl font-bold mt-1">Global Feature Flags</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Inspect and toggle module access (QR Menu, Ordering, KDS, Payments, POS Integration, Webhooks) for any tenant outlet.
          </p>
        </div>
      </div>

      {/* Main Grid: Outlet Selector + Feature Flag Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tenant Selector List (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Store className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
            <span>Select Tenant Outlet</span>
          </h3>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search outlet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
            {filteredRestaurants.map((rest: any) => {
              const isSelected = selectedRestId === rest._id;

              return (
                <button
                  key={rest._id}
                  onClick={() => setSelectedRestId(rest._id)}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                      : 'bg-slate-50/50 border-slate-150 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs leading-tight">{rest.name}</h4>
                    <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                      {rest.subscription?.planKey || 'FREE'}
                    </span>
                  </div>
                  <p className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    Slug: {rest.slug}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Flags Toggle Panel (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
          {!selectedRestId ? (
            <div className="text-center py-20 text-xs text-slate-400">
              Select a tenant outlet on the left to inspect and toggle feature flags.
            </div>
          ) : isLoadingFlags ? (
            <div className="h-64 flex items-center justify-center">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ToggleRight className="w-5 h-5 text-amber-500" strokeWidth={2} />
                  <span>Module Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Toggle active feature modules for this tenant.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentFlags.map((flag: any) => (
                  <div
                    key={flag.key}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                      flag.enabled
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{flag.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{flag.key}</p>
                    </div>

                    <button
                      onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono transition ${
                        flag.enabled
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {flag.enabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminFeatureFlags;
