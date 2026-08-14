import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import {
  CreditCard,
  Loader,
  Store,
  Shield,
  Smartphone,
  Banknote,
} from 'lucide-react';

export const AdminPaymentGateways: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Payment Overview
  const { data: overviewResponse, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['adminPaymentOverview'],
    queryFn: adminService.getPaymentOverview,
  });

  // Fetch Tenant Payment Configs
  const { data: configsResponse, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['adminTenantPaymentConfigs'],
    queryFn: adminService.getTenantPaymentConfigs,
  });

  // Toggle Tenant Payment Methods mutation
  const toggleMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: any }) =>
      adminService.updateTenantPaymentMethods(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTenantPaymentConfigs'] });
      toast('Tenant payment gateways updated successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating payment methods', 'error');
    },
  });

  if (isLoadingOverview || isLoadingConfigs) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const overview = overviewResponse?.data || {
    methodStats: {
      CASH: { totalVolume: 0, orderCount: 0 },
      CARD: { totalVolume: 0, orderCount: 0 },
      UPI: { totalVolume: 0, orderCount: 0 },
      RAZORPAY: { totalVolume: 0, orderCount: 0 },
    },
    razorpayGatewayStatus: 'ACTIVE',
    platformFeePercentage: 0.0,
  };

  const configs = configsResponse?.data || [];

  const formatVolume = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val / 100);

  const handleToggleMethod = (outlet: any, methodKey: string, currentValue: boolean) => {
    const updated = {
      cashEnabled: outlet.paymentGateways?.cashEnabled ?? true,
      cardEnabled: outlet.paymentGateways?.cardEnabled ?? true,
      upiEnabled: outlet.paymentGateways?.upiEnabled ?? true,
      razorpayEnabled: outlet.paymentGateways?.razorpayEnabled ?? true,
      [methodKey]: !currentValue,
    };

    toggleMutation.mutate({
      restaurantId: outlet.restaurantId,
      data: updated,
    });
  };

  return (
    <div className="w-full space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Financial Operations</span>
          <h2 className="font-display text-3xl font-bold mt-1">Payment Gateways & Methods</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Monitor platform payment volume split across Cash, Card, UPI, and Razorpay Online, and configure gateway access per tenant.
          </p>
        </div>
      </div>

      {/* Payment Volume Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-extrabold uppercase tracking-wider">Cash Volume</span>
            <Banknote className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.CASH?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.CASH?.orderCount || 0} Cash Checkouts</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-indigo-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Card Volume</span>
            <CreditCard className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.CARD?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.CARD?.orderCount || 0} Card Checkouts</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-purple-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">UPI Direct</span>
            <Smartphone className="w-5 h-5 text-purple-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.UPI?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.UPI?.orderCount || 0} Instant Scans</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">Razorpay Online</span>
            <Shield className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.RAZORPAY?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.RAZORPAY?.orderCount || 0} Online Gateway Orders</p>
        </div>
      </div>

      {/* Tenant Payment Configuration Matrix Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Tenant Payment Gateways Enablement Matrix</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4 text-center">Cash On Table</th>
                <th className="py-3 px-4 text-center">POS Card Reader</th>
                <th className="py-3 px-4 text-center">UPI Dynamic QR</th>
                <th className="py-3 px-4 text-center">Razorpay Online</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {configs.map((config: any) => (
                <tr key={config.restaurantId} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {config.name}
                    <span className="block text-[10px] text-slate-400 font-mono">Slug: {config.slug}</span>
                  </td>

                  {/* Cash */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleMethod(config, 'cashEnabled', config.paymentGateways?.cashEnabled ?? true)}
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1 rounded-xl font-mono font-bold text-[10px] uppercase transition ${
                        (config.paymentGateways?.cashEnabled ?? true)
                          ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {(config.paymentGateways?.cashEnabled ?? true) ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>

                  {/* Card */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleMethod(config, 'cardEnabled', config.paymentGateways?.cardEnabled ?? true)}
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1 rounded-xl font-mono font-bold text-[10px] uppercase transition ${
                        (config.paymentGateways?.cardEnabled ?? true)
                          ? 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {(config.paymentGateways?.cardEnabled ?? true) ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>

                  {/* UPI */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleMethod(config, 'upiEnabled', config.paymentGateways?.upiEnabled ?? true)}
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1 rounded-xl font-mono font-bold text-[10px] uppercase transition ${
                        (config.paymentGateways?.upiEnabled ?? true)
                          ? 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {(config.paymentGateways?.upiEnabled ?? true) ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>

                  {/* Razorpay */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleMethod(config, 'razorpayEnabled', config.paymentGateways?.razorpayEnabled ?? true)}
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1 rounded-xl font-mono font-bold text-[10px] uppercase transition ${
                        (config.paymentGateways?.razorpayEnabled ?? true)
                          ? 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {(config.paymentGateways?.razorpayEnabled ?? true) ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentGateways;
