import React from 'react';
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
} from 'lucide-react';

export const AdminRestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const flags = flagsResponse?.data?.flags || [];

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

          {/* Subscription Badge */}
          {restaurant.subscription && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Subscription Plan</span>
                <p className="text-xs font-black text-slate-900 font-mono">
                  {restaurant.subscription.planKey || restaurant.subscription.planType} ({restaurant.subscription.status})
                </p>
              </div>
            </div>
          )}
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
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <ToggleRight className="w-4.5 h-4.5 text-indigo-500" strokeWidth={1.75} />
          <span>Active Modules & Feature Flags</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {flags.map((flag: any) => (
            <div
              key={flag.key}
              className={`p-3 rounded-2xl border flex flex-col justify-between text-xs ${
                flag.enabled
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <span className="font-bold">{flag.name}</span>
              <span className="text-[9px] font-mono font-semibold uppercase mt-2">
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRestaurantDetail;
