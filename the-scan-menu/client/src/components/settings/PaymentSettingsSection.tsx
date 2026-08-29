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
  QrCode,
  Banknote,
  Globe,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

export interface PaymentSettingsSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

type MethodKey = 'UPI' | 'CASH' | 'CARD' | 'RAZORPAY';

interface PaymentMethodMeta {
  id: MethodKey;
  key: 'upi' | 'cash' | 'card' | 'razorpay';
  name: string;
  subtitle: string;
  icon: React.ElementType;
  badge: string;
}

const DEFAULT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'UPI',
    key: 'upi',
    name: 'UPI Payments (Instant QR)',
    subtitle: 'Dynamic QR code on guest menu, bill prints & table stands',
    icon: QrCode,
    badge: 'Zero MDR / Instant',
  },
  {
    id: 'CASH',
    key: 'cash',
    name: 'Cash (Counter Ledger)',
    subtitle: 'Physical cash received and verified at cash counter',
    icon: Banknote,
    badge: 'Manual Ledger',
  },
  {
    id: 'CARD',
    key: 'card',
    name: 'Card / POS Terminal',
    subtitle: 'EDC swipe/tap machine or external credit/debit card swipe',
    icon: CreditCard,
    badge: 'EDC Terminal',
  },
  {
    id: 'RAZORPAY',
    key: 'razorpay',
    name: 'Razorpay Online Gateway',
    subtitle: 'Credit/Debit cards, Netbanking & UPI via online checkout',
    icon: Globe,
    badge: 'Online Gateway',
  },
];

export const PaymentSettingsSection: React.FC<PaymentSettingsSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Active Payment Mode State
  const [activePaymentMode, setActivePaymentMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

  // Payment Methods Enabled State
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  // Credentials State
  const [upiId, setUpiId] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');

  // Priority Method Sorting State
  const [methodOrder, setMethodOrder] = useState<MethodKey[]>(['UPI', 'CASH', 'CARD', 'RAZORPAY']);

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
        setCashEnabled(p.paymentMethods.cash !== false);
        setCardEnabled(p.paymentMethods.card !== false);
        setUpiEnabled(p.paymentMethods.upi !== false);
        setRazorpayEnabled(!!p.paymentMethods.razorpay);
      }

      const paymentConfig = p.paymentConfig || p.settings?.paymentConfig;
      if (paymentConfig) {
        setActivePaymentMode(paymentConfig.activeMode || p.activeMode || 'POSTPAID');
        setUpiId(paymentConfig.upiId || p.upiId || p.printerConfig?.upiId || '');
        if (paymentConfig.preferredMethodOrder && Array.isArray(paymentConfig.preferredMethodOrder) && paymentConfig.preferredMethodOrder.length > 0) {
          setMethodOrder(paymentConfig.preferredMethodOrder);
        }
      } else {
        if (p.activeMode) setActivePaymentMode(p.activeMode);
        setUpiId(p.upiId || p.printerConfig?.upiId || '');
        if (p.preferredMethodOrder && Array.isArray(p.preferredMethodOrder) && p.preferredMethodOrder.length > 0) {
          setMethodOrder(p.preferredMethodOrder);
        }
      }

      if (p.razorpayConfig) {
        setRazorpayKeyId(p.razorpayConfig.keyId || '');
        setRazorpayKeySecret(p.razorpayConfig.keySecret || '');
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

  const moveMethod = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= methodOrder.length) return;
    const newOrder = [...methodOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIdx, 0, moved);
    setMethodOrder(newOrder);
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEnabled('payments')) {
      try {
        await apiClient.patch(`/restaurants/${targetRestaurantId}/payments/config`, {
          activeProvider: razorpayEnabled ? 'RAZORPAY' : 'CASH',
          activeMode: activePaymentMode,
          preferredMethodOrder: methodOrder,
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
      activeMode: activePaymentMode,
      activeProvider: razorpayEnabled ? 'RAZORPAY' : 'CASH',
      preferredMethodOrder: methodOrder,
      paymentMethods: {
        cash: cashEnabled,
        card: cardEnabled,
        upi: upiEnabled,
        razorpay: razorpayEnabled,
      },
      upiId: upiEnabled && upiId.trim() ? upiId.trim() : undefined,
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

  const getMethodChecked = (key: 'upi' | 'cash' | 'card' | 'razorpay') => {
    if (key === 'upi') return upiEnabled;
    if (key === 'cash') return cashEnabled;
    if (key === 'card') return cardEnabled;
    if (key === 'razorpay') return razorpayEnabled;
    return false;
  };

  const setMethodChecked = (key: 'upi' | 'cash' | 'card' | 'razorpay', val: boolean) => {
    if (key === 'upi') setUpiEnabled(val);
    if (key === 'cash') setCashEnabled(val);
    if (key === 'card') setCardEnabled(val);
    if (key === 'razorpay') setRazorpayEnabled(val);
  };

  return (
    <form onSubmit={handleSavePayments} className="space-y-6">
      {/* ── 1. ACTIVE DINING PAYMENT POLICY ── */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              <span>Ordering Payment Policy</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose when guest payments are collected for dine-in and counter sessions.
            </p>
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

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isEnabled('payments') ? 'opacity-30 pointer-events-none filter blur-[1px]' : ''}`}>
            {/* POSTPAID OPTION */}
            <button
              type="button"
              onClick={() => setActivePaymentMode('POSTPAID')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                activePaymentMode === 'POSTPAID'
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Postpaid Mode</span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Dine-in Standard
                    </span>
                  </div>
                  {activePaymentMode === 'POSTPAID' && (
                    <CheckCircle2 className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guests order and enjoy dining immediately. Payment is collected upon requesting the bill or freeing the table.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Auto-accept orders supported</span>
              </div>
            </button>

            {/* PREPAID OPTION */}
            <button
              type="button"
              onClick={() => setActivePaymentMode('PREPAID')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                activePaymentMode === 'PREPAID'
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Prepaid Mode</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      QSR / Cafes / Fast Casual
                    </span>
                  </div>
                  {activePaymentMode === 'PREPAID' && (
                    <CheckCircle2 className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guests must pay upfront. Orders will remain in the New column and cannot move to the Kitchen until payment is confirmed.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Zero unpaid order risk</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. ACCEPTED METHODS & PRIORITY SORTING ── */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Accepted Payment Methods & Priority Sorting
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable channels and use the <span className="font-semibold text-slate-700">▲ / ▼ arrows</span> to control which payment option appears first on the order screen.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
            Top item is default in settlement popup
          </span>
        </div>

        {/* Priority Sorted Method Cards */}
        <div className="space-y-2.5">
          {methodOrder.map((mId, index) => {
            const meta = DEFAULT_METHODS.find((m) => m.id === mId) || DEFAULT_METHODS[0];
            const isChecked = getMethodChecked(meta.key);
            const Icon = meta.icon;
            const isFirst = index === 0;
            const isLast = index === methodOrder.length - 1;

            return (
              <div
                key={meta.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isChecked
                    ? 'border-slate-250 bg-white hover:border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                    : 'border-slate-150 bg-slate-50/70 opacity-60'
                }`}
              >
                {/* Left: Checkbox + Icon + Details */}
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setMethodChecked(meta.key, e.target.checked)}
                    className="h-4.5 w-4.5 rounded text-amber-500 accent-amber-500 border-slate-300 cursor-pointer"
                  />
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{meta.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {meta.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{meta.subtitle}</p>
                  </div>
                </div>

                {/* Right: Priority Badge & Sorting Controls */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    index === 0
                      ? 'bg-amber-500 text-slate-950 font-mono'
                      : 'bg-slate-100 text-slate-600 font-mono'
                  }`}>
                    #{index + 1} {index === 0 ? '• Default' : ''}
                  </span>

                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveMethod(index, 'UP')}
                      title="Move Up (Higher Priority)"
                      className="p-1 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveMethod(index, 'DOWN')}
                      title="Move Down (Lower Priority)"
                      className="p-1 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. CREDENTIALS CONFIGURATION ── */}
        {upiEnabled && (
          <div className="pt-3">
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xs">
              <label className="block text-xs font-bold text-slate-900">
                Merchant UPI ID (VPA) <span className="text-amber-600">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. democafe@okhdfcbank"
                  className="w-full sm:max-w-md px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono font-bold text-slate-900 shadow-2xs"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  Instant scan-and-pay UPI QR codes generated dynamically on customer tables and printed bills.
                </span>
              </div>
            </div>
          </div>
        )}

        {razorpayEnabled && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Razorpay Gateway API Keys</span>
              </h5>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                Test & Live Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Key ID</label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Key Secret</label>
                <input
                  type="password"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder="Enter secret"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Webhook Secret</label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Enter webhook secret"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono shadow-2xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 4. SUBMIT ACTION ── */}
        <div className="pt-3 flex justify-end">
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

export default PaymentSettingsSection;
