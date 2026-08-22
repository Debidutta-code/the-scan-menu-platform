import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  CheckCircle,
  ShieldAlert,
  Users,
  CreditCard,
  ToggleRight,
  ArrowLeft,
  Loader,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Settings,
  Store,
  X,
  Save,
  Clock,
  FileText,
  Image,
} from 'lucide-react';

export const AdminRestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    whatsapp: '',
    gstNumber: '',
    openTime: '09:00',
    closeTime: '23:00',
    address: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    googleReviewUrl: '',
  });

  // Fetch tenant profile
  const { data: restResponse, isLoading: isLoadingRest } = useQuery({
    queryKey: ['adminRestaurantDetail', id],
    queryFn: () => adminService.getRestaurant(id!),
    enabled: !!id,
  });

  // Fetch onboarding progress
  const { data: onboardingResponse } = useQuery({
    queryKey: ['adminOnboarding', id],
    queryFn: () => adminService.getOnboardingProgress(id!),
    enabled: !!id,
  });

  // Fetch staff list
  const { data: staffResponse } = useQuery({
    queryKey: ['adminStaff', id],
    queryFn: () => managerService.listStaff(id!),
    enabled: !!id,
  });

  // Fetch feature flags
  const { data: flagsResponse } = useQuery({
    queryKey: ['adminFlags', id],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${id}/feature-flags`);
      return res.data;
    },
    enabled: !!id,
  });

  // Toggle Feature Flag Mutation
  const toggleFlagMutation = useMutation({
    mutationFn: async (updatedFlags: any[]) => {
      const res = await apiClient.patch(`/restaurants/${id}/feature-flags`, { flags: updatedFlags });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFlags', id] });
      queryClient.invalidateQueries({ queryKey: ['adminTenantFlags', id] });
      toast('Feature flags updated for outlet!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating feature flags', 'error');
    },
  });

  // Suspend
  const suspendMutation = useMutation({
    mutationFn: adminService.suspendRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Restaurant suspended immediately.', 'info');
    },
  });

  // Activate
  const activateMutation = useMutation({
    mutationFn: adminService.activateRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Restaurant activated.', 'success');
    },
  });

  // Update Subscription Plan Mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await apiClient.patch(`/restaurants/${id}/subscription`, { planKey });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminFlags', id] });
      queryClient.invalidateQueries({ queryKey: ['adminTenantFlags', id] });
      toast('Subscription plan updated and feature flags synced!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating subscription plan', 'error');
    },
  });

  // Update Store Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => adminService.editRestaurant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Store profile & configuration updated!', 'success');
      setIsConfigOpen(false);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating store profile', 'error');
    },
  });

  const openConfigModal = () => {
    if (!restResponse?.data) return;
    const r = restResponse.data;
    setConfigForm({
      name: r.name || '',
      slug: r.slug || '',
      phone: r.phone || '',
      email: r.email || '',
      whatsapp: r.whatsapp || '',
      gstNumber: r.gstNumber || '',
      openTime: r.timings?.open || '09:00',
      closeTime: r.timings?.close || '23:00',
      address: r.address || '',
      description: r.description || '',
      logoUrl: r.logoUrl || '',
      coverImageUrl: r.coverImageUrl || '',
      googleReviewUrl: r.googleReviewUrl || '',
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.name.trim()) {
      toast('Restaurant Name is required', 'error');
      return;
    }
    updateProfileMutation.mutate({
      name: configForm.name.trim(),
      slug: configForm.slug.trim() || undefined,
      phone: configForm.phone.trim() || undefined,
      email: configForm.email.trim() || undefined,
      whatsapp: configForm.whatsapp.trim() || undefined,
      gstNumber: configForm.gstNumber.trim() || undefined,
      timings: {
        open: configForm.openTime,
        close: configForm.closeTime,
      },
      address: configForm.address.trim() || undefined,
      description: configForm.description.trim() || undefined,
      logoUrl: configForm.logoUrl.trim() || undefined,
      coverImageUrl: configForm.coverImageUrl.trim() || undefined,
      googleReviewUrl: configForm.googleReviewUrl.trim() || undefined,
    });
  };

  if (isLoadingRest) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const restaurant = restResponse?.data;
  const onboarding = onboardingResponse?.data || {};
  const staffMembers = staffResponse?.data || [];
  const flags: any[] = Array.isArray(flagsResponse?.data)
    ? flagsResponse.data
    : flagsResponse?.data?.flags || [];

  if (!restaurant) {
    return (
      <div className="text-center py-16 space-y-4">
        <h3 className="text-lg font-bold text-slate-700">Restaurant Tenant Not Found</h3>
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const isActive = restaurant.status !== 'SUSPENDED' && restaurant.status !== 'ARCHIVED';

  return (
    <div className="w-full space-y-8">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to Tenants Directory</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={openConfigModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition shadow-xs"
          >
            <Settings className="w-4 h-4 text-amber-600" strokeWidth={2} />
            <span>Configure Store Profile</span>
          </button>

          {isActive ? (
            <button
              onClick={() => suspendMutation.mutate(restaurant._id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
            >
              <ShieldAlert className="w-4 h-4" strokeWidth={1.75} />
              <span>Suspend Tenant</span>
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate(restaurant._id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
              <span>Activate Tenant</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tenant Profile Card */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-950 text-amber-500 flex items-center justify-center font-black text-2xl font-mono shadow-md shrink-0">
              {restaurant.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 leading-none">
                  {restaurant.name}
                </h2>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
                >
                  {restaurant.status || (isActive ? 'ACTIVE' : 'SUSPENDED')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Code: <strong className="text-slate-700">{restaurant.code || 'N/A'}</strong> • Slug: <strong className="text-slate-700">{restaurant.slug}</strong>
              </p>
            </div>
          </div>

          {/* Subscription Controls */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Assigned Plan</span>
                <p className="text-xs font-black text-slate-900 font-mono">
                  {restaurant.subscription?.planKey || 'FREE'} ({restaurant.subscription?.status || 'ACTIVE'})
                </p>
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2">
              <select
                value={restaurant.subscription?.planKey || 'FREE'}
                onChange={(e) => updatePlanMutation.mutate(e.target.value)}
                disabled={updatePlanMutation.isPending}
                className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="ENTERPRISE">ENTERPRISE (All 18 Flags)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (9 Flags)</option>
                <option value="STARTER">STARTER (4 Flags)</option>
                <option value="FREE">FREE (QR Menu Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
            <span>{restaurant.phone || 'No phone recorded'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
            <span>{restaurant.email || 'No email recorded'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{restaurant.address || 'No address recorded'}</span>
          </div>
        </div>

        {restaurant.description && (
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* Grid: Onboarding Checklist + Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Onboarding Progress Checklist */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" strokeWidth={2} />
            <span>Tenant Onboarding Progress</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="font-semibold text-slate-700">Restaurant Creation</span>
              {onboarding.restaurantCreated ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Done</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-4 h-4" /> Pending</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="font-semibold text-slate-700">Manager Assigned</span>
              {onboarding.managerCreated ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Done</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-4 h-4" /> Pending</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="font-semibold text-slate-700">Tables Provisioned</span>
              {onboarding.tablesCreated ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Done</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-4 h-4" /> Pending</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="font-semibold text-slate-700">Menu Catalog Imported</span>
              {onboarding.menuImported ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Done</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-4 h-4" /> Pending</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-150">
              <span className="font-semibold text-slate-700">Subscription Plan Assigned</span>
              {onboarding.subscriptionAssigned ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Done</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400"><XCircle className="w-4 h-4" /> Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Staff & Manager Accounts */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.75} />
              <span>Assigned Personnel ({staffMembers.length})</span>
            </h3>
          </div>

          {staffMembers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No staff members assigned to this outlet.</div>
          ) : (
            <div className="space-y-3 max-h-[18rem] overflow-y-auto pr-1">
              {staffMembers.map((member: any) => (
                <div key={member._id} className="p-3 rounded-2xl border border-slate-150 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{member.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{member.email}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[9px] uppercase ${member.role === 'MANAGER' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Feature Flags Active on Tenant */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ToggleRight className="w-4.5 h-4.5 text-amber-500" strokeWidth={2} />
              <span>Active Modules & Feature Flags</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any module to toggle access for this outlet.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/feature-flags')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200"
          >
            Manage Matrix &rarr;
          </button>
        </div>

        {flags.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No feature flags found for this tenant.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {flags.map((flag: any) => (
              <button
                key={flag.key}
                disabled={toggleFlagMutation.isPending}
                onClick={() => {
                  const updated = flags.map((f: any) =>
                    f.key === flag.key ? { ...f, enabled: !f.enabled } : f
                  );
                  toggleFlagMutation.mutate(updated);
                }}
                className={`p-3 rounded-2xl border flex flex-col justify-between text-left transition ${
                  flag.enabled
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60 hover:opacity-90'
                }`}
              >
                <div>
                  <span className="font-bold text-xs line-clamp-1">
                    {flag.name || flag.key.replace(/_/g, ' ')}
                  </span>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{flag.key}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/40">
                  <span className={`text-[9px] font-mono font-bold uppercase ${flag.enabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${flag.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SuperAdmin Store Profile Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Configure Store Profile & Identity
                  </h3>
                  <p className="text-xs text-slate-500">
                    SuperAdmin exclusive store configuration and physical details.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveConfig} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Restaurant Name *</label>
                  <input
                    type="text"
                    required
                    value={configForm.name}
                    onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                    placeholder="e.g. The Woodfired Bistro"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    value={configForm.slug}
                    onChange={(e) => setConfigForm({ ...configForm, slug: e.target.value })}
                    placeholder="e.g. woodfired-bistro"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-slate-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={configForm.phone}
                    onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={configForm.email}
                    onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })}
                    placeholder="contact@woodfired.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp Contact</label>
                  <input
                    type="text"
                    value={configForm.whatsapp}
                    onChange={(e) => setConfigForm({ ...configForm, whatsapp: e.target.value })}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    value={configForm.gstNumber}
                    onChange={(e) => setConfigForm({ ...configForm, gstNumber: e.target.value })}
                    placeholder="27AAAAA1111A1Z1"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Opening Time</span>
                  </label>
                  <input
                    type="time"
                    value={configForm.openTime}
                    onChange={(e) => setConfigForm({ ...configForm, openTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Closing Time</span>
                  </label>
                  <input
                    type="time"
                    value={configForm.closeTime}
                    onChange={(e) => setConfigForm({ ...configForm, closeTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Physical Address</span>
                </label>
                <input
                  type="text"
                  value={configForm.address}
                  onChange={(e) => setConfigForm({ ...configForm, address: e.target.value })}
                  placeholder="456 Gourmet Lane, Mumbai, Maharashtra"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Restaurant Narrative / Description</span>
                </label>
                <textarea
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  placeholder="Serving genuine hand-tossed sourdough pizza in a rustic woodfired furnace..."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-amber-500" />
                    <span>Logo Image URL</span>
                  </label>
                  <input
                    type="url"
                    value={configForm.logoUrl}
                    onChange={(e) => setConfigForm({ ...configForm, logoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cover Banner URL</span>
                  </label>
                  <input
                    type="url"
                    value={configForm.coverImageUrl}
                    onChange={(e) => setConfigForm({ ...configForm, coverImageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Google Review URL</label>
                <input
                  type="url"
                  value={configForm.googleReviewUrl}
                  onChange={(e) => setConfigForm({ ...configForm, googleReviewUrl: e.target.value })}
                  placeholder="https://g.page/r/..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:bg-slate-400"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurantDetail;
