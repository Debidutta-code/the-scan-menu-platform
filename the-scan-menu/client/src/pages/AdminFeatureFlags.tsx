import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  Store,
  Loader,
  Search,
  Sparkles,
  Flame,
  CreditCard,
  Award,
  Layers,
  QrCode,
  ShoppingBag,
  Bell,
  Tv,
  Boxes,
  Calculator,
  Truck,
  BarChart3,
  Ticket,
  Users,
  Key,
  Terminal,
  Palette,
  RotateCcw,
  Zap,
  SlidersHorizontal,
  Check,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Modules' },
  { id: 'GUEST_EXPERIENCE', label: 'Guest Experience' },
  { id: 'OPERATIONS', label: 'Operations & Kitchen' },
  { id: 'FINANCE', label: 'Finance & Billing' },
  { id: 'MARKETING', label: 'Marketing & Growth' },
  { id: 'INTEGRATIONS', label: 'Integrations & Dev' },
] as const;

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  GUEST_EXPERIENCE: {
    label: 'Guest Experience',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  OPERATIONS: {
    label: 'Operations',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  FINANCE: {
    label: 'Finance & Billing',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  MARKETING: {
    label: 'Marketing & CRM',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  INTEGRATIONS: {
    label: 'Integrations & Dev',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

const FLAG_ICON_MAP: Record<string, any> = {
  qr_menu: QrCode,
  ordering: ShoppingBag,
  waiter_call: Bell,
  customer_display: Tv,
  kds: Flame,
  inventory: Boxes,
  pos: Calculator,
  takeaway: ShoppingBag,
  delivery: Truck,
  payments: CreditCard,
  analytics: BarChart3,
  coupons: Ticket,
  loyalty: Award,
  crm: Users,
  pos_integration: Layers,
  api_webhooks: Key,
  api_access: Terminal,
  white_label: Palette,
};

const FLAG_DEPENDENCIES: Record<string, string[]> = {
  ordering: ['qr_menu'],
  kds: ['ordering', 'qr_menu'],
  customer_display: ['ordering', 'qr_menu'],
  waiter_call: ['qr_menu'],
  takeaway: ['ordering', 'qr_menu'],
  delivery: ['ordering', 'qr_menu'],
  pos: ['ordering', 'qr_menu'],
  payments: ['ordering', 'qr_menu'],
  coupons: ['crm'],
  loyalty: ['crm'],
};

export interface AdminFeatureFlagsProps {
  restaurantId?: string;
  hideRestaurantSelector?: boolean;
}

export const AdminFeatureFlags: React.FC<AdminFeatureFlagsProps> = ({
  restaurantId: propRestaurantId,
  hideRestaurantSelector = false,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [flagSearchTerm, setFlagSearchTerm] = useState('');
  const [selectedRestId, setSelectedRestId] = useState<string | null>(propRestaurantId || null);

  React.useEffect(() => {
    if (propRestaurantId) {
      setSelectedRestId(propRestaurantId);
    }
  }, [propRestaurantId]);

  // Fetch all subscription plans
  const { data: plansResponse } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: adminService.getAllPlans,
  });

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

  // Local state for instant toggling
  const [localFlags, setLocalFlags] = useState<any[]>([]);

  // Sync local state when API data changes
  React.useEffect(() => {
    if (flagsResponse?.data) {
      setLocalFlags(flagsResponse.data);
    }
  }, [flagsResponse?.data]);

  // Toggle/Bulk update flag mutation
  const updateFlagsMutation = useMutation({
    mutationFn: async ({ restaurantId, flags }: { restaurantId: string; flags: any[] }) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}/feature-flags`, { flags });
      return res.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['adminTenantFlags', selectedRestId] });
      const previousFlags = queryClient.getQueryData(['adminTenantFlags', selectedRestId]);
      queryClient.setQueryData(['adminTenantFlags', selectedRestId], { data: variables.flags });
      return { previousFlags };
    },
    onError: (err: any, _variables: any, context: any) => {
      queryClient.setQueryData(['adminTenantFlags', selectedRestId], context?.previousFlags);
      if (context?.previousFlags?.data) {
        setLocalFlags(context.previousFlags.data);
      }
      toast(err.response?.data?.error?.message || 'Error updating feature flags', 'error');
    },
    onSettled: () => {
      // Don't invalidate here to prevent layout shift during rapid toggles.
      // Let the optimistic update stay. A background sync can happen later if needed.
    },
  });

  const { data: singleRestResponse } = useQuery({
    queryKey: ['adminSingleRest', selectedRestId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${selectedRestId}`);
      return res.data;
    },
    enabled: !!selectedRestId,
  });

  if (isLoadingRests && !propRestaurantId) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const restaurants = restResponse?.data?.restaurants || [];
  const plans = plansResponse?.data || [];
  const filteredRestaurants = restaurants;

  const currentFlags = localFlags;
  const selectedRestaurant = restaurants.find((r: any) => r._id === selectedRestId || r.id === selectedRestId);
  const activeRestaurant = selectedRestaurant || singleRestResponse?.data;

  // Filter flags by search
  const filteredFlags = currentFlags.filter((flag: any) => {
    const matchesSearch =
      flag.name?.toLowerCase().includes(flagSearchTerm.toLowerCase()) ||
      flag.key.toLowerCase().includes(flagSearchTerm.toLowerCase()) ||
      flag.description?.toLowerCase().includes(flagSearchTerm.toLowerCase());

    return matchesSearch;
  });

  const activeFlagsCount = currentFlags.filter((f: any) => f.enabled).length;
  const totalFlagsCount = currentFlags.length;
  const activePercentage = totalFlagsCount > 0 ? Math.round((activeFlagsCount / totalFlagsCount) * 100) : 0;

  // Handler: Toggle single flag with Chained Permission Logic
  const handleToggleFlag = (flagKey: string, currentStatus: boolean) => {
    if (!selectedRestId) return;
    const newStatus = !currentStatus;
    
    // Only handle reverse dependencies (disabling children if parent is disabled)
    // Forward dependencies are now strictly enforced via UI (must enable parents manually first)
    const dependenciesToDisable: string[] = [];

    if (newStatus === false) {
      if (flagKey === 'qr_menu') dependenciesToDisable.push('ordering', 'waiter_call', 'kds', 'customer_display', 'takeaway', 'delivery', 'pos', 'payments');
      if (flagKey === 'ordering') dependenciesToDisable.push('kds', 'customer_display', 'takeaway', 'delivery', 'pos', 'payments');
      if (flagKey === 'crm') dependenciesToDisable.push('coupons', 'loyalty');
    }

    const updatedFlags = currentFlags.map((f: any) => {
      if (f.key === flagKey) {
        return { ...f, enabled: newStatus };
      }
      if (dependenciesToDisable.includes(f.key)) {
        return { ...f, enabled: false };
      }
      return f;
    });

    setLocalFlags(updatedFlags);
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 1: Enable All Standard
  const handleEnableAll = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({ ...f, enabled: true }));
    setLocalFlags(updatedFlags);
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 2: Sync with Subscription Plan
  const handleSyncWithPlan = () => {
    if (!selectedRestId || !activeRestaurant || currentFlags.length === 0) return;
    const currentPlanKey = activeRestaurant.subscription?.planKey || 'ENTERPRISE';
    const planDoc = plans.find((p: any) => p.key === currentPlanKey);

    const includedKeys = new Set(planDoc?.includedFeatureKeys || []);
    const updatedFlags = currentFlags.map((f: any) => ({
      ...f,
      enabled: includedKeys.has(f.key),
    }));
    setLocalFlags(updatedFlags);
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 3: Minimal QR Only
  const handleMinimalQrOnly = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({
      ...f,
      enabled: f.key === 'qr_menu',
    }));
    setLocalFlags(updatedFlags);
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 4: Disable All
  const handleDisableAll = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({ ...f, enabled: false }));
    setLocalFlags(updatedFlags);
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  return (
    <div className="w-full space-y-6">
      {!hideRestaurantSelector && (
        <>
          {/* Executive Header Banner */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                  Control Center
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  18 Modules Supported
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold mt-1">Tenant Module Feature Flags</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Granularly grant, revoke, or synchronize feature access (Dine-in Ordering, KDS, Stock Control, Counter POS, Developer APIs) for any restaurant outlet.
              </p>
            </div>
          </div>

          {/* Top Select Outlet */}
          <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Select Outlet</h3>
                <p className="text-[10px] text-slate-400 font-mono">Manage feature flags for a specific tenant</p>
              </div>
            </div>

            <div className="relative w-full md:w-[400px]">
              <select
                value={selectedRestId || ''}
                onChange={(e) => setSelectedRestId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-amber-500 transition-all cursor-pointer shadow-xs"
              >
                <option value="" disabled>-- Choose a Restaurant Outlet --</option>
                {filteredRestaurants.map((rest: any) => (
                  <option key={rest._id} value={rest._id}>
                    {rest.name} ({rest.slug}) - {rest.subscription?.planKey || 'FREE'} {rest.status === 'SUSPENDED' ? '[SUSPENDED]' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Layout: Feature Controls */}
      <div className="w-full bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
        {!selectedRestId ? (
          <div className="text-center py-24 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="font-display text-base font-bold text-slate-900">No Tenant Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please select a restaurant outlet from the top dropdown to inspect and configure its feature flags.
            </p>
          </div>
        ) : isLoadingFlags ? (
          <div className="h-96 flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <>
              {/* Outlet Active Status & Summary Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Name and Slug */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        {activeRestaurant?.name || 'Restaurant Feature Matrix'}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 uppercase tracking-wider">
                        {activeRestaurant?.subscription?.planKey || 'ENTERPRISE'} PLAN
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono">
                      Slug: <span className="font-bold text-slate-700">{activeRestaurant?.slug || selectedRestId}</span>
                    </p>
                  </div>

                  {/* Right: Quick Presets */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleEnableAll}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Enable All
                    </button>
                    <button
                      onClick={handleDisableAll}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 text-red-900 border border-red-200 hover:bg-red-100 transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-red-600" />
                      Disable All
                    </button>
                    <button
                      onClick={handleSyncWithPlan}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      Sync Plan
                    </button>
                    <button
                      onClick={handleMinimalQrOnly}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      QR Only
                    </button>
                  </div>
                </div>

                {/* Progress bar integrated neatly */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-2">
                  <div className="flex flex-col whitespace-nowrap min-w-[140px]">
                    <span className="text-sm font-bold text-slate-900">{activeFlagsCount} of {totalFlagsCount} Modules Active</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">{activePercentage}% Features Enabled</span>
                  </div>
                  <div className="flex-1 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${activePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Active Modules Overview & Search Row */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-800 text-sm">Active Modules Overview</h3>
                  <div className="relative shrink-0 w-full md:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter flags..."
                      value={flagSearchTerm}
                      onChange={(e) => setFlagSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[3rem]">
                  {currentFlags.filter((f: any) => f.enabled).length === 0 ? (
                    <span className="text-xs text-slate-400 font-medium">No active modules for this tenant.</span>
                  ) : (
                    currentFlags.filter((f: any) => f.enabled).map((flag: any) => {
                      const IconComponent = FLAG_ICON_MAP[flag.key] || Layers;
                      return (
                        <div key={`overview-${flag.key}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold shadow-xs">
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{flag.name || flag.key.replace(/_/g, ' ')}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Feature Flags Categories List */}
              {filteredFlags.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-150">
                  No feature modules match your current filter.
                </div>
              ) : (
                <div className="flex flex-col gap-8 mt-2">
                  {CATEGORIES.filter(c => c.id !== 'ALL').map((category) => {
                    const categoryFlags = filteredFlags.filter((f: any) => f.category === category.id);
                    if (categoryFlags.length === 0) return null;
                    const catMeta = CATEGORY_META[category.id] || CATEGORY_META.OPERATIONS;

                    return (
                      <div key={category.id} className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                          <h3 className="font-display font-bold text-lg text-slate-900">{category.label}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                            {categoryFlags.length} Modules
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {categoryFlags.map((flag: any) => {
                            const IconComponent = FLAG_ICON_MAP[flag.key] || Layers;

                            // Calculate dependencies
                            const deps = FLAG_DEPENDENCIES[flag.key] || [];
                            const missingDeps = deps.filter((depKey) => {
                              const depFlag = currentFlags.find((f: any) => f.key === depKey);
                              return !depFlag?.enabled;
                            });
                            const missingDepNames = missingDeps.map(depKey => {
                              const depFlag = currentFlags.find((f: any) => f.key === depKey);
                              return depFlag?.name || depKey.replace(/_/g, ' ');
                            });
                            
                            const isToggleDisabled = !flag.enabled && missingDeps.length > 0;

                            return (
                              <div
                                key={flag.key}
                                className={`p-4 rounded-2xl border transition-all flex flex-col h-full min-h-[11rem] gap-3 ${
                                  flag.enabled
                                    ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                                    : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                                } ${isToggleDisabled ? 'opacity-60 grayscale-[0.2]' : ''}`}
                              >
                                {/* Top: Icon, Title, Key */}
                                <div className="flex items-center gap-3 w-full">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                      flag.enabled
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                        : 'bg-slate-200 text-slate-600 border-slate-300'
                                    }`}
                                  >
                                    <IconComponent className="w-5 h-5" strokeWidth={2} />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <h4 className="font-bold text-[14px] text-slate-900 leading-tight truncate">
                                      {flag.name || flag.key.replace(/_/g, ' ')}
                                    </h4>
                                    <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 truncate">
                                      {flag.key}
                                    </div>
                                  </div>
                                </div>

                                {/* Warning message if dependencies are missing */}
                                {isToggleDisabled && (
                                  <div className="mt-1 flex items-start gap-1.5 p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-amber-800 text-[10px] font-medium w-full">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                                    <span className="leading-tight">
                                      Requires <span className="font-bold text-amber-900">{missingDepNames.join(' & ')}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Bottom: Switch Action */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-auto">
                                  <span className={flag.enabled ? 'text-emerald-700 font-bold text-[10px]' : 'text-slate-500 text-[10px] font-medium'}>
                                    {flag.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                  <button
                                    onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                                    disabled={isToggleDisabled}
                                    className={`flex items-center justify-center gap-1 min-w-[64px] px-3 py-1.5 rounded-lg font-bold font-mono text-[10px] transition shadow-xs border ${
                                      flag.enabled
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent'
                                        : isToggleDisabled
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border-transparent'
                                    }`}
                                  >
                                    {flag.enabled ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>ON</span>
                                      </>
                                    ) : (
                                      <span>OFF</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
};

export default AdminFeatureFlags;
