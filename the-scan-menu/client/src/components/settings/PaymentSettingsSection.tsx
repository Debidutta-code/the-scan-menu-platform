import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  CreditCard,
  Lock,
  Save,
  Loader,
} from 'lucide-react';

export interface PaymentSettingsSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const PaymentSettingsSection: React.FC<PaymentSettingsSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Payment Methods State
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [activePaymentProvider, setActivePaymentProvider] = useState<'CASH' | 'RAZORPAY'>('CASH');
  const [activePaymentMode, setActivePaymentMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

  const { data: restaurantResponse, isLoading } = useQuery({
    queryKey: ['restaurantProfileInfo', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  useEffect(() => {
    if (restaurantResponse?.success && restaurantResponse?.data) {
      const p = restaurantResponse.data;
      if (p.paymentMethods) {
        setCashEnabled(!!p.paymentMethods.cash);
        setCardEnabled(!!p.paymentMethods.card);
        setUpiEnabled(!!p.paymentMethods.upi);
        setRazorpayEnabled(!!p.paymentMethods.razorpay);
      }
      if (p.razorpayConfig) {
        setRazorpayKeyId(p.razorpayConfig.keyId || '');
        setRazorpayKeySecret(p.razorpayConfig.keySecret || '');
      }
      const paymentConfig = p.settings?.paymentConfig;
      if (paymentConfig) {
        setActivePaymentProvider(paymentConfig.activeProvider || 'CASH');
        setActivePaymentMode(paymentConfig.activeMode || 'POSTPAID');
      }
    }
  }, [restaurantResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Payments & Channels Settings saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating payment settings', 'error');
    },
  });

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEnabled('payments')) {
      try {
        await apiClient.patch(`/restaurants/${targetRestaurantId}/payments/config`, {
          activeProvider: activePaymentProvider,
          activeMode: activePaymentMode,
          razorpayConfig: razorpayEnabled
            ? {
                keyId: razorpayKeyId.trim(),
                keySecret: razorpayKeySecret.trim() || undefined,
                webhookSecret: razorpayWebhookSecret.trim() || undefined,
              }
            : undefined,
        });
      } catch (err: any) {
        console.error('Failed to update payment provider config', err);
      }
    }

    updateMutation.mutate({
      paymentMethods: {
        cash: cashEnabled,
        card: cardEnabled,
        upi: upiEnabled,
        razorpay: razorpayEnabled,
      },
      razorpayConfig: razorpayEnabled
        ? {
            keyId: razorpayKeyId.trim() || undefined,
            keySecret: razorpayKeySecret.trim() || undefined,
          }
        : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSavePayments} className="space-y-6">
      {/* Active Provider & Mode Card */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
              <span>Payment Gateway & Active Modes</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Configure digital gateway providers and customer payment timing.</p>
          </div>
        </div>

        <div className="relative">
          {!isEnabled('payments') && (
            <div className="absolute inset-0 z-10 bg-slate-50/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center border border-slate-200 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Payments Feature Flag Disabled</h3>
              <p className="text-xs text-slate-600 max-w-sm">
                Digital Payment Abstraction is not active on your current restaurant plan.
              </p>
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${!isEnabled('payments') ? 'opacity-30 pointer-events-none filter blur-[1px]' : ''}`}>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                Active Payment Provider
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                value={activePaymentProvider}
                onChange={(e) => setActivePaymentProvider(e.target.value as 'CASH' | 'RAZORPAY')}
              >
                <option value="CASH">Cash (Manual Ledger)</option>
                <option value="RAZORPAY" disabled={!razorpayEnabled}>Razorpay (Digital Gateway)</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Enable Razorpay in channels below to select digital gateway.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                Active Payment Mode
              </label>
              <select
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                value={activePaymentMode}
                onChange={(e) => setActivePaymentMode(e.target.value as 'POSTPAID' | 'PREPAID')}
              >
                <option value="POSTPAID">Postpaid (Pay after dining)</option>
                <option value="PREPAID">Prepaid (Pay upfront before order)</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Determines when customer is prompted for payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Channels & Credentials Card */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-4">
        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
          Accepted Payment Methods & Credentials
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={cashEnabled}
              onChange={(e) => setCashEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Accept Cash</span>
          </label>

          <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={cardEnabled}
              onChange={(e) => setCardEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Accept Card</span>
          </label>

          <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={upiEnabled}
              onChange={(e) => setUpiEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">UPI Payments</span>
          </label>

          <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={razorpayEnabled}
              onChange={(e) => setRazorpayEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
            />
            <span className="text-xs font-bold text-slate-700">Razorpay Gateway</span>
          </label>
        </div>

        {razorpayEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Razorpay Key ID</label>
              <input
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_test_..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Razorpay Key Secret</label>
              <input
                type="password"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                placeholder="Provide new secret to update"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Webhook Secret</label>
              <input
                type="password"
                value={razorpayWebhookSecret}
                onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                placeholder="Provide new webhook secret to update"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Save className="w-4 h-4" strokeWidth={1.75} />
            )}
            <span>Save Payment Settings</span>
          </button>
        </div>
      </div>
    </form>
  );
};
