import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import {
  Loader,
  Store,
  X,
} from 'lucide-react';

export const AdminSubscriptions: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);
  const [newPlanKey, setNewPlanKey] = useState<string>('STARTER');

  // Fetch plans
  const { data: plansResponse, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: adminService.getAllPlans,
  });

  // Fetch restaurants
  const { data: restResponse, isLoading: isLoadingRests } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: () => adminService.listRestaurants(1, 100),
  });

  // Assign plan mutation
  const assignMutation = useMutation({
    mutationFn: ({ restaurantId, planKey }: { restaurantId: string; planKey: string }) =>
      adminService.assignPlan(restaurantId, planKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminAnalytics'] });
      setSelectedRestId(null);
      toast('Subscription plan assigned successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error assigning subscription plan', 'error');
    },
  });

  if (isLoadingPlans || isLoadingRests) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const plans = plansResponse?.data || [];
  const restaurants = restResponse?.data?.restaurants || [];

  return (
    <div className="w-full space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Subscription Control Center</span>
          <h2 className="font-display text-3xl font-bold mt-1">Platform Subscription Plans</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Review tier structures, feature inclusions, and assign plan upgrades or downgrades across all restaurant tenants.
          </p>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan: any) => {
          const tenantCount = restaurants.filter(
            (r: any) => r.subscription?.planKey === plan.key || r.subscription?.planType === plan.key
          ).length;

          return (
            <div
              key={plan._id || plan.key}
              className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-slate-950 text-lg">{plan.name}</h3>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {plan.key}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{plan.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Included Features</span>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.includedFeatureKeys?.map((feat: string) => (
                      <span key={feat} className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Active Tenants</span>
                <span className="text-sm font-black font-mono bg-slate-950 text-white px-3 py-1 rounded-xl">
                  {tenantCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tenant Subscription Allocation Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Tenant Subscription Allocations</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restaurants.map((rest: any) => (
                <tr key={rest._id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{rest.name}</span>
                    <span className="block text-[10px] font-mono text-slate-400">Slug: {rest.slug}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[9px] font-extrabold font-mono px-2 py-0.5 rounded ${rest.status !== 'SUSPENDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {rest.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold font-mono text-amber-700">
                      {rest.subscription?.planKey || rest.subscription?.planType || 'FREE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {rest.subscription?.expiresAt ? new Date(rest.subscription.expiresAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedRestId(rest._id);
                        setNewPlanKey(rest.subscription?.planKey || 'STARTER');
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
                    >
                      Change Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Assignment Modal */}
      {selectedRestId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl font-bold">Assign Subscription Plan</h3>
              <button onClick={() => setSelectedRestId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Select Target Plan</label>
              <select
                value={newPlanKey}
                onChange={(e) => setNewPlanKey(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-mono font-bold"
              >
                {plans.map((p: any) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setSelectedRestId(null)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignMutation.isPending}
                onClick={() => assignMutation.mutate({ restaurantId: selectedRestId, planKey: newPlanKey })}
                className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {assignMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
