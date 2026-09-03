import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../../hooks/useToast';
import { restaurantService } from '../../services/restaurant.service';
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
import { Button } from '../ui/Button';

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

  const [activePaymentMode, setActivePaymentMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  // Safe Credentials / Display Info
  const [upiId, setUpiId] = useState('');
  const [upiDisplayName, setUpiDisplayName] = useState('');
  const [razorpayStatus, setRazorpayStatus] = useState<'CONNECTED' | 'NOT_CONFIGURED'>('NOT_CONFIGURED');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  // Policy restrictions from Super Admin
  const [prepaidAllowed, setPrepaidAllowed] = useState(true);
  const [postpaidAllowed, setPostpaidAllowed] = useState(true);

  // Priority Method Sorting State
  const [methodOrder, setMethodOrder] = useState<MethodKey[]>(['UPI', 'CASH', 'CARD', 'RAZORPAY']);

  const { data: configResponse, isLoading } = useQuery({
    queryKey: ['restaurantPaymentConfigSafe', targetRestaurantId],
    queryFn: async () => {
      if (!targetRestaurantId) return null;
      return await restaurantService.getPaymentConfig(targetRestaurantId);
    },
    enabled: !!targetRestaurantId,
  });

  useEffect(() => {
    if (configResponse?.data) {
      const cfg = configResponse.data;

      if (cfg.paymentMethods) {
        setCashEnabled(cfg.paymentMethods.cash !== false);
        setCardEnabled(cfg.paymentMethods.card !== false);
        setUpiEnabled(cfg.paymentMethods.upi !== false);
        setRazorpayEnabled(!!cfg.paymentMethods.razorpay);
      }

      if (cfg.manualUpi) {
        setUpiId(cfg.manualUpi.upiId || '');
        setUpiDisplayName(cfg.manualUpi.displayName || '');
      }

      if (cfg.razorpay) {
        setRazorpayStatus(cfg.razorpay.status || 'NOT_CONFIGURED');
        setRazorpayKeyId(cfg.razorpay.keyId || '');
      }

      if (cfg.ordering) {
        setPrepaidAllowed(cfg.ordering.prepaidEnabled !== false);
        setPostpaidAllowed(cfg.ordering.postpaidEnabled !== false);
        setActivePaymentMode(cfg.ordering.activeMode || cfg.activeMode || 'POSTPAID');
      }

      if (cfg.preferredMethodOrder && Array.isArray(cfg.preferredMethodOrder)) {
        setMethodOrder(cfg.preferredMethodOrder);
      }
    }
  }, [configResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!targetRestaurantId) throw new Error('Restaurant ID missing');
      return await restaurantService.updatePaymentConfig(targetRestaurantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurantPaymentConfigSafe', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      toast('Payment configuration saved successfully!', 'success');
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating payment settings', 'error');
    },
  });

  const moveMethod = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...methodOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setMethodOrder(newOrder);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      upiId: upiId.trim(),
      upiDisplayName: upiDisplayName.trim(),
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
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 font-sans select-none">
      {/* ── 1. ACTIVE DINING PAYMENT POLICY ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <CreditCard className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
              <span>Ordering Payment Policy</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose when guest payments are collected for dine-in and counter sessions.
            </p>
          </div>
        </div>

        <div className="relative">
          {!isEnabled('payments') && (
            <div className="absolute inset-0 z-10 bg-slate-50/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center border border-slate-200 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-1.5">
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-0.5">Payments Feature Flag Disabled</h3>
              <p className="text-[11px] text-slate-600 max-w-sm">
                Digital Payment Abstraction is not active on your current restaurant plan.
              </p>
            </div>
          )}

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 ${!isEnabled('payments') ? 'opacity-30 pointer-events-none filter blur-[1px]' : ''}`}>
            {/* POSTPAID OPTION */}
            <button
              type="button"
              disabled={!postpaidAllowed}
              onClick={() => postpaidAllowed && setActivePaymentMode('POSTPAID')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                activePaymentMode === 'POSTPAID'
                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              } ${!postpaidAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Postpaid Mode</span>
                    <span className="text-[9px] font-black uppercase font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                      Dine-in Standard
                    </span>
                  </div>
                  {activePaymentMode === 'POSTPAID' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guests order and enjoy dining immediately. Payment is collected upon requesting the bill or freeing the table.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-150 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{!postpaidAllowed ? 'Disabled by platform admin' : 'Auto-accept orders supported'}</span>
              </div>
            </button>

            {/* PREPAID OPTION */}
            <button
              type="button"
              disabled={!prepaidAllowed}
              onClick={() => prepaidAllowed && setActivePaymentMode('PREPAID')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                activePaymentMode === 'PREPAID'
                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-xs'
                  : 'border-slate-200/80 bg-white hover:border-slate-300'
              } ${!prepaidAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Prepaid Mode</span>
                    <span className="text-[9px] font-black uppercase font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                      QSR / Cafes
                    </span>
                  </div>
                  {activePaymentMode === 'PREPAID' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500" strokeWidth={2.5} />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Guests must pay upfront. Orders will remain in the New column and cannot move to the Kitchen until payment is confirmed.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-150 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{!prepaidAllowed ? 'Disabled by platform admin' : 'Zero unpaid order risk'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. ACCEPTED METHODS & PRIORITY SORTING ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Accepted Payment Methods &amp; Priority Sorting
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Enable channels and use the <span className="font-bold text-slate-700">▲ / ▼ arrows</span> to control which payment option appears first on the order screen.
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full self-start sm:self-auto font-mono">
            Top item is default in settlement
          </span>
        </div>

        {/* Priority Sorted Method Cards */}
        <div className="space-y-2">
          {methodOrder.map((mId, index) => {
            const meta = DEFAULT_METHODS.find((m) => m.id === mId) || DEFAULT_METHODS[0];
            const isChecked = getMethodChecked(meta.key);
            const Icon = meta.icon;
            const isFirst = index === 0;
            const isLast = index === methodOrder.length - 1;

            return (
              <div
                key={meta.id}
                className={`p-2.5 sm:p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs ${
                  isChecked
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-slate-150 bg-slate-50/70 opacity-60'
                }`}
              >
                {/* Left: Checkbox + Icon + Details */}
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={meta.id === 'RAZORPAY' && razorpayStatus !== 'CONNECTED'}
                    onChange={(e) => setMethodChecked(meta.key, e.target.checked)}
                    className={`h-4 w-4 rounded text-amber-500 accent-amber-500 border-slate-300 ${
                      meta.id === 'RAZORPAY' && razorpayStatus !== 'CONNECTED' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  />
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{meta.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                        {meta.badge}
                      </span>
                      {meta.id === 'RAZORPAY' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          razorpayStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {razorpayStatus === 'CONNECTED' ? 'Super Admin Enabled' : 'Requires Super Admin'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{meta.subtitle}</p>
                  </div>
                </div>

                {/* Right: Priority Badge & Sorting Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                    index === 0
                      ? 'bg-amber-500 text-slate-950 font-mono font-black'
                      : 'bg-slate-100 text-slate-600 font-mono'
                  }`}>
                    #{index + 1} {index === 0 ? '• Default' : ''}
                  </span>

                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveMethod(index, 'up')}
                      title="Move Up (Higher Priority)"
                      className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveMethod(index, 'down')}
                      title="Move Down (Lower Priority)"
                      className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. CREDENTIALS CONFIGURATION ── */}
        {upiEnabled && (
          <div className="pt-2">
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3 sm:p-3.5 space-y-2 shadow-2xs">
              <label className="block text-xs font-bold text-slate-900">
                Merchant UPI ID (VPA) <span className="text-amber-600">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. democafe@okhdfcbank"
                  className="w-full sm:max-w-md px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-400 font-mono font-bold text-slate-900 shadow-2xs"
                />
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  Instant scan-and-pay UPI QR codes generated dynamically on customer tables and printed bills.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Razorpay Platform Managed Status Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              <span>Razorpay Online Payment Gateway</span>
            </h5>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              razorpayStatus === 'CONNECTED'
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {razorpayStatus === 'CONNECTED' ? 'CONNECTED • PLATFORM MANAGED' : 'NOT CONFIGURED'}
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {razorpayStatus === 'CONNECTED'
              ? 'Razorpay credentials, webhooks, and regional settlement policies are securely managed by the Platform Super Administrator. Key secrets are encrypted in the server vault.'
              : 'Online card and netbanking payment gateway is not enabled for this outlet. Contact your platform administrator to activate Razorpay integration.'}
          </p>

          {razorpayKeyId && (
            <div className="text-[11px] font-mono text-slate-500 bg-white p-2 rounded-lg border border-slate-200 inline-block">
              Public Key ID: <span className="font-bold text-slate-700">{razorpayKeyId}</span>
            </div>
          )}
        </div>

        {/* ── 4. SUBMIT ACTION ── */}
        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Payment Preferences
          </Button>
        </div>
      </div>
    </form>
  );
};

export default PaymentSettingsSection;
