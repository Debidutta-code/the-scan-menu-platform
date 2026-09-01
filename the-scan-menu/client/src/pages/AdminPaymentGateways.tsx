import React, { useState } from 'react';
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
  Settings,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Search,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const AdminPaymentGateways: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<any | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Configuration Form State for selected restaurant
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [manualUpiEnabled, setManualUpiEnabled] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [upiDisplayName, setUpiDisplayName] = useState('');

  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [prepaidEnabled, setPrepaidEnabled] = useState(true);
  const [postpaidEnabled, setPostpaidEnabled] = useState(true);
  const [activeMode, setActiveMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

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

  // Fetch Payment Audit Logs
  const { data: auditLogsResponse } = useQuery({
    queryKey: ['adminPaymentAuditLogs'],
    queryFn: () => adminService.getAuditLogs({ limit: 10, action: 'PAYMENT' }),
  });

  // Save Configuration Mutation
  const saveConfigMutation = useMutation({
    mutationFn: async ({ restaurantId, payload }: { restaurantId: string; payload: any }) => {
      return await adminService.updateRestaurantPaymentConfig(restaurantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTenantPaymentConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['adminPaymentOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminPaymentAuditLogs'] });
      toast('Restaurant payment configuration updated successfully!', 'success');
      setShowConfigModal(false);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to save payment configuration', 'error');
    },
  });

  // Test Razorpay Credentials Mutation
  const testRazorpayMutation = useMutation({
    mutationFn: async ({ restaurantId, keyId, keySecret }: { restaurantId: string; keyId?: string; keySecret?: string }) => {
      return await adminService.testRazorpayCredentials(restaurantId, { keyId, keySecret });
    },
    onSuccess: () => {
      toast('Razorpay authentication credentials verified successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Razorpay connection test failed', 'error');
    },
  });

  const handleOpenConfigModal = async (outlet: any) => {
    setSelectedOutlet(outlet);
    try {
      const res = await adminService.getRestaurantPaymentConfig(outlet.restaurantId);
      const data = res?.data || {};

      setCashEnabled(data.paymentMethods?.cash ?? true);
      setCardEnabled(data.paymentMethods?.card ?? true);
      setManualUpiEnabled(data.manualUpi?.enabled ?? true);
      setUpiId(data.manualUpi?.upiId || '');
      setUpiDisplayName(data.manualUpi?.displayName || outlet.name || '');

      setRazorpayEnabled(data.razorpay?.enabled ?? false);
      setRazorpayKeyId(data.razorpay?.keyId || '');
      setRazorpayKeySecret('');
      setRazorpayWebhookSecret('');

      setPrepaidEnabled(data.ordering?.prepaidEnabled ?? true);
      setPostpaidEnabled(data.ordering?.postpaidEnabled ?? true);
      setActiveMode(data.ordering?.activeMode || 'POSTPAID');

      setShowConfigModal(true);
    } catch (e: any) {
      toast('Could not fetch restaurant payment details', 'error');
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;

    const payload: any = {
      manualUpi: {
        enabled: manualUpiEnabled,
        upiId: upiId.trim(),
        displayName: upiDisplayName.trim(),
      },
      razorpay: {
        enabled: razorpayEnabled,
        keyId: razorpayKeyId.trim(),
        keySecret: razorpayKeySecret.trim() || undefined,
        webhookSecret: razorpayWebhookSecret.trim() || undefined,
      },
      ordering: {
        prepaidEnabled,
        postpaidEnabled,
        activeMode,
      },
      paymentMethods: {
        cash: cashEnabled,
        card: cardEnabled,
        upi: manualUpiEnabled,
        razorpay: razorpayEnabled,
      },
      activeProvider: razorpayEnabled ? 'RAZORPAY' : 'CASH',
    };

    saveConfigMutation.mutate({
      restaurantId: selectedOutlet.restaurantId,
      payload,
    });
  };

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
  };

  const configs = configsResponse?.data || [];
  const filteredConfigs = configs.filter((c: any) =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const auditLogs = auditLogsResponse?.data?.logs || [];

  const formatVolume = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val / 100);

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Platform Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
            Platform Operations • Super Admin Only
          </span>
          <h2 className="font-display text-3xl font-bold mt-1">Restaurant Payment Configuration</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Configure merchant payment gateways, Razorpay API credentials, Zero-Fee Manual UPI accounts, and dining settlement policies for all tenant outlets.
          </p>
        </div>
      </div>

      {/* Payment Volume Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-extrabold uppercase tracking-wider font-mono">Cash Total</span>
            <Banknote className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.CASH?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.CASH?.orderCount || 0} Cash Checkouts</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center text-indigo-500">
            <span className="text-xs font-extrabold uppercase tracking-wider font-mono">Card / POS</span>
            <CreditCard className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.CARD?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.CARD?.orderCount || 0} Card Checkouts</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center text-purple-500">
            <span className="text-xs font-extrabold uppercase tracking-wider font-mono">Manual UPI</span>
            <Smartphone className="w-5 h-5 text-purple-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.UPI?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.UPI?.orderCount || 0} Direct Scans</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center text-amber-500">
            <span className="text-xs font-extrabold uppercase tracking-wider font-mono">Razorpay Gateway</span>
            <Shield className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-3">{formatVolume(overview.methodStats.RAZORPAY?.totalVolume || 0)}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">{overview.methodStats.RAZORPAY?.orderCount || 0} Verified Online Orders</p>
        </div>
      </div>

      {/* Outlets List & Configuration Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              <span>Tenant Outlets Payment Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click <span className="font-semibold text-slate-700">"Configure"</span> on any restaurant to manage Razorpay credentials, Manual UPI IDs, and order settlement flow.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search restaurant..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4 text-center">Manual UPI</th>
                <th className="py-3 px-4 text-center">Razorpay Gateway</th>
                <th className="py-3 px-4 text-center">Cash On Table</th>
                <th className="py-3 px-4 text-center">POS Card</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConfigs.map((config: any) => {
                const isUpi = config.paymentGateways?.upiEnabled ?? true;
                const isRzp = config.paymentGateways?.razorpayEnabled ?? false;
                const isCash = config.paymentGateways?.cashEnabled ?? true;
                const isCard = config.paymentGateways?.cardEnabled ?? true;

                return (
                  <tr key={config.restaurantId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {config.name}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">Slug: {config.slug}</span>
                    </td>

                    {/* UPI */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase ${
                        isUpi ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isUpi ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>

                    {/* Razorpay */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase ${
                        isRzp ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isRzp ? 'CONNECTED' : 'DISABLED'}
                      </span>
                    </td>

                    {/* Cash */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase ${
                        isCash ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCash ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>

                    {/* Card */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase ${
                        isCard ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCard ? 'ACTIVE' : 'OFF'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(config)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-400" />
                        <span>Configure</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Configuration Audit Trail */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              <span>Recent Payment Configuration Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Platform security log capturing payment mode updates, credentials alterations, and staff manual verifications.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Restaurant</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-mono">
                    No payment configuration audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.actorName || 'System'}
                      <span className="block text-[10px] text-slate-400 font-mono">{log.actorRole || 'SUPER_ADMIN'}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.restaurantName || log.restaurantId || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super Admin Modal: Comprehensive Payment Configuration */}
      {showConfigModal && selectedOutlet && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <Shield className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
                    {selectedOutlet.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Payment Gateway &amp; Provider Configuration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveConfig} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* 1. Dining Ordering Mode Policies */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Allowed Dining Ordering Modes</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition">
                    <input
                      type="checkbox"
                      checked={prepaidEnabled}
                      onChange={(e) => setPrepaidEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Prepaid Ordering</span>
                      <span className="text-[10px] text-slate-500 block">Customer pays before kitchen preparation</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition">
                    <input
                      type="checkbox"
                      checked={postpaidEnabled}
                      onChange={(e) => setPostpaidEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Postpaid Ordering</span>
                      <span className="text-[10px] text-slate-500 block">Pay at bill time / table release</span>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">Default Active Mode:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveMode('POSTPAID')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                        activeMode === 'POSTPAID' ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      POSTPAID
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMode('PREPAID')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                        activeMode === 'PREPAID' ? 'bg-amber-500 text-slate-950' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      PREPAID
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Manual UPI Configuration */}
              <div className="bg-white border border-purple-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Manual Direct UPI</h4>
                      <p className="text-[10px] text-slate-500">Zero transaction fee • Manually verified by staff</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualUpiEnabled}
                      onChange={(e) => setManualUpiEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {manualUpiEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Merchant UPI ID (VPA) *</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. restaurant@okhdfcbank"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payee Display Name</label>
                      <input
                        type="text"
                        value={upiDisplayName}
                        onChange={(e) => setUpiDisplayName(e.target.value)}
                        placeholder="e.g. XYZ Cafe & Kitchen"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Razorpay Gateway Configuration */}
              <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Razorpay Merchant Gateway</h4>
                      <p className="text-[10px] text-slate-500">
                        Configured strictly by Super Admin • Secrets encrypted in server vault
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={razorpayEnabled}
                      onChange={(e) => setRazorpayEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {razorpayEnabled && (
                  <div className="space-y-3 pt-2 border-t border-amber-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Razorpay Key ID *</label>
                      <input
                        type="text"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        placeholder="rzp_live_... or rzp_test_..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">Key Secret</label>
                          <button
                            type="button"
                            onClick={() => setShowKeySecret(!showKeySecret)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {showKeySecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showKeySecret ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showKeySecret ? 'text' : 'password'}
                          value={razorpayKeySecret}
                          onChange={(e) => setRazorpayKeySecret(e.target.value)}
                          placeholder="Enter new secret to update"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700">Webhook Secret (Optional)</label>
                          <button
                            type="button"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {showWebhookSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showWebhookSecret ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={razorpayWebhookSecret}
                          onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                          placeholder="Enter webhook secret"
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700" />
                        <span className="text-[11px] text-amber-900 font-medium">
                          Secrets are AES-256 encrypted and never revealed to restaurant managers or staff.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          testRazorpayMutation.mutate({
                            restaurantId: selectedOutlet.restaurantId,
                            keyId: razorpayKeyId || undefined,
                            keySecret: razorpayKeySecret || undefined,
                          })
                        }
                        disabled={testRazorpayMutation.isPending}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0 font-mono shadow-2xs"
                      >
                        {testRazorpayMutation.isPending ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Other Standard Payment Channels */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Additional Physical Payment Channels
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={cashEnabled}
                      onChange={(e) => setCashEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Cash at Counter</span>
                      <span className="text-[10px] text-slate-500 block">Physical cash ledger</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={cardEnabled}
                      onChange={(e) => setCardEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Card / POS Reader</span>
                      <span className="text-[10px] text-slate-500 block">External EDC terminal swipe</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfigModal(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saveConfigMutation.isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentGateways;
