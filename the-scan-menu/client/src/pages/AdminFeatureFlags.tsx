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

export const AdminFeatureFlags: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [flagSearchTerm, setFlagSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);

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

  // Toggle/Bulk update flag mutation
  const updateFlagsMutation = useMutation({
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
  const plans = plansResponse?.data || [];
  const filteredRestaurants = restaurants.filter((r: any) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentFlags: any[] = Array.isArray(flagsResponse?.data) ? flagsResponse.data : [];
  const selectedRestaurant = restaurants.find((r: any) => r._id === selectedRestId);

  // Filter flags by search and category
  const filteredFlags = currentFlags.filter((flag: any) => {
    const matchesSearch =
      flag.name?.toLowerCase().includes(flagSearchTerm.toLowerCase()) ||
      flag.key.toLowerCase().includes(flagSearchTerm.toLowerCase()) ||
      flag.description?.toLowerCase().includes(flagSearchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || flag.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeFlagsCount = currentFlags.filter((f: any) => f.enabled).length;
  const totalFlagsCount = currentFlags.length;
  const activePercentage = totalFlagsCount > 0 ? Math.round((activeFlagsCount / totalFlagsCount) * 100) : 0;

  // Handler: Toggle single flag with Chained Permission Logic
  const handleToggleFlag = (flagKey: string, currentStatus: boolean) => {
    if (!selectedRestId) return;
    const newStatus = !currentStatus;
    
    // Chain rules
    let dependenciesToEnable: string[] = [];
    if (newStatus === true) {
      if (flagKey === 'ordering') dependenciesToEnable.push('qr_menu');
      if (flagKey === 'kds') dependenciesToEnable.push('ordering', 'qr_menu');
      if (flagKey === 'customer_display') dependenciesToEnable.push('ordering', 'qr_menu');
      if (flagKey === 'waiter_call') dependenciesToEnable.push('qr_menu');
      if (flagKey === 'takeaway') dependenciesToEnable.push('ordering', 'qr_menu');
      if (flagKey === 'delivery') dependenciesToEnable.push('ordering', 'qr_menu');
      if (flagKey === 'pos') dependenciesToEnable.push('ordering', 'qr_menu');
      if (flagKey === 'coupons') dependenciesToEnable.push('crm');
      if (flagKey === 'loyalty') dependenciesToEnable.push('crm');
    }

    const updatedFlags = currentFlags.map((f: any) => {
      if (f.key === flagKey) {
        return { ...f, enabled: newStatus };
      }
      if (dependenciesToEnable.includes(f.key)) {
        return { ...f, enabled: true };
      }
      return f;
    });

    if (dependenciesToEnable.length > 0) {
      toast(`Enabled dependencies automatically`, 'info');
    }

    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 1: Enable All (Enterprise/Demo Mode)
  const handleEnableAll = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({ ...f, enabled: true }));
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 2: Sync with Assigned Subscription Plan
  const handleSyncWithPlan = () => {
    if (!selectedRestId || !selectedRestaurant || currentFlags.length === 0) return;
    const currentPlanKey = selectedRestaurant.subscription?.planKey || 'ENTERPRISE';
    const planDoc = plans.find((p: any) => p.key === currentPlanKey);

    const includedKeys = new Set(planDoc?.includedFeatureKeys || []);
    const updatedFlags = currentFlags.map((f: any) => ({
      ...f,
      enabled: includedKeys.has(f.key),
    }));

    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 3: Minimal QR Only
  const handleMinimalQrOnly = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({
      ...f,
      enabled: f.key === 'qr_menu',
    }));
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  // Preset 4: Disable All
  const handleDisableAll = () => {
    if (!selectedRestId || currentFlags.length === 0) return;
    const updatedFlags = currentFlags.map((f: any) => ({ ...f, enabled: false }));
    updateFlagsMutation.mutate({ restaurantId: selectedRestId, flags: updatedFlags });
  };

  return (
    <div className="w-full space-y-8">
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

      {/* Main Layout: Left Outlet Selector + Right Feature Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Outlet Selector (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-500" strokeWidth={2} />
              <span>Select Outlet</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              {filteredRestaurants.length} outlets
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search outlet name or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Outlets List */}
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {filteredRestaurants.map((rest: any) => {
              const isSelected = selectedRestId === rest._id;
              const isSuspended = rest.status === 'SUSPENDED';

              return (
                <button
                  key={rest._id}
                  onClick={() => setSelectedRestId(rest._id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition relative ${
                    isSelected
                      ? 'bg-slate-950 border-slate-950 text-white shadow-md'
                      : 'bg-slate-50/70 border-slate-150 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-xs leading-snug line-clamp-1">{rest.name}</h4>
                    <span
                      className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded uppercase shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rest.subscription?.planKey || 'FREE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/20 text-[10px] font-mono">
                    <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>
                      {rest.slug}
                    </span>
                    {isSuspended ? (
                      <span className="text-red-400 font-bold">SUSPENDED</span>
                    ) : (
                      <span className={isSelected ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Module Control Matrix (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          {!selectedRestId ? (
            <div className="text-center py-24 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">No Tenant Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Please select a restaurant outlet from the left sidebar to inspect and configure its feature flags.
              </p>
            </div>
          ) : isLoadingFlags ? (
            <div className="h-96 flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* Outlet Active Status & Summary Header */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {selectedRestaurant?.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-slate-800 uppercase">
                        {selectedRestaurant?.subscription?.planKey || 'FREE'} PLAN
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Slug: <span className="font-bold text-slate-700">{selectedRestaurant?.slug}</span>
                    </p>
                  </div>

                  {/* Active Count Metric */}
                  <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto shadow-xs">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {activeFlagsCount} of {totalFlagsCount} Active
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {activePercentage}% Enabled
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold font-mono text-xs">
                      {activePercentage}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${activePercentage}%` }}
                  />
                </div>

                {/* 1-Click Quick Action Presets */}
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>1-Tap Presets:</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleEnableAll}
                      disabled={updateFlagsMutation.isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Enable All (Demo Mode)</span>
                    </button>

                    <button
                      onClick={handleDisableAll}
                      disabled={updateFlagsMutation.isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-900 border border-red-200 hover:bg-red-100 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-red-600" />
                      <span>Disable All</span>
                    </button>

                    <button
                      onClick={handleSyncWithPlan}
                      disabled={updateFlagsMutation.isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sync with {selectedRestaurant?.subscription?.planKey || 'Plan'}</span>
                    </button>

                    <button
                      onClick={handleMinimalQrOnly}
                      disabled={updateFlagsMutation.isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Minimal (QR Only)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          isSelected
                            ? 'bg-slate-950 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search Feature Flags */}
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

              {/* Feature Flags List */}
              {filteredFlags.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-150">
                  No feature modules match your current filter.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredFlags.map((flag: any) => {
                    const IconComponent = FLAG_ICON_MAP[flag.key] || Layers;
                    const catMeta = CATEGORY_META[flag.category] || CATEGORY_META.OPERATIONS;

                    return (
                      <div
                        key={flag.key}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          flag.enabled
                            ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* Left: Icon, Title, Description, Category */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              flag.enabled
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" strokeWidth={2} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                {flag.name || flag.key.replace(/_/g, ' ')}
                              </h4>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${catMeta.bg} ${catMeta.color} ${catMeta.border}`}>
                                {catMeta.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                              {flag.description || 'Module functionality for restaurant operations.'}
                            </p>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Key: {flag.key}
                            </div>
                          </div>
                        </div>

                        {/* Right: Switch Action */}
                        <div className="flex items-center gap-4 shrink-0 self-end md:self-auto w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/60 justify-between md:justify-end">
                          <span className={flag.enabled ? 'text-emerald-700 font-bold text-xs' : 'text-slate-500 text-xs font-medium'}>
                            {flag.enabled ? 'Module Enabled' : 'Module Disabled'}
                          </span>
                          <button
                            onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                            disabled={updateFlagsMutation.isPending}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold font-mono text-[11px] transition shadow-xs ${
                              flag.enabled
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {flag.enabled ? (
                              <>
                                <Check className="w-4 h-4" />
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFeatureFlags;
