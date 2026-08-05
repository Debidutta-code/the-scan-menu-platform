import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { Loader, Settings, Save, AlertCircle, GitBranch, Timer, ToggleLeft, CreditCard, Lock, RefreshCw, CheckCircle, FileText, Palette } from 'lucide-react';
import apiClient from '../lib/api';

interface RestaurantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

interface RestaurantProfile {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  googleReviewUrl?: string;
  gstNumber?: string;
  whatsapp?: string;
  timings?: {
    open: string;
    close: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  paymentMethods?: {
    cash: boolean;
    card: boolean;
    upi: boolean;
    razorpay: boolean;
  };
  razorpayConfig?: {
    keyId?: string;
    keySecret?: string;
  };
  branding?: {
    logoUrl?: string;
    coverImageUrl?: string;
  };
  notificationPreferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    whatsappNotifications: boolean;
  };
  theme: RestaurantTheme;
}

export const ManagerSettings: React.FC = () => {
  const { user } = useAuth();
  const { flags, refreshFlags, isEnabled } = useFeatureFlags();
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (flags) {
      setLocalFlags(flags);
    }
  }, [flags]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeRestaurantId = user?.restaurants?.[0];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('23:00');

  // Branding URLs & Notification Preferences
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);

  // Social Links
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

  // Payment Methods
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [activePaymentProvider, setActivePaymentProvider] = useState<'CASH' | 'RAZORPAY'>('CASH');
  const [activePaymentMode, setActivePaymentMode] = useState<'POSTPAID' | 'PREPAID'>('POSTPAID');

  // Theme states
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');

  // Order Workflow & Automation
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP'>('FIVE_STEP');
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [autoAcceptDelay, setAutoAcceptDelay] = useState(10);

  // Petpooja Integration State
  const [petpoojaEnabled, setPetpoojaEnabled] = useState(false);
  const [petpoojaAppKey, setPetpoojaAppKey] = useState('');
  const [petpoojaAppSecret, setPetpoojaAppSecret] = useState('');
  const [petpoojaAccessToken, setPetpoojaAccessToken] = useState('');
  const [petpoojaOutletId, setPetpoojaOutletId] = useState('');
  const [petpoojaIsConfigured, setPetpoojaIsConfigured] = useState(false);

  // Fetch Petpooja Integration Config
  const { data: petpoojaConfigData, refetch: refetchPetpoojaConfig } = useQuery({
    queryKey: ['petpoojaConfig', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/integrations/config`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('pos_integration'),
  });

  useEffect(() => {
    if (petpoojaConfigData?.success && petpoojaConfigData?.data) {
      const d = petpoojaConfigData.data;
      setPetpoojaEnabled(d.provider === 'PETPOOJA' && d.enabled);
      setPetpoojaOutletId(d.outletId || '');
      setPetpoojaIsConfigured(!!d.isConfigured);
    }
  }, [petpoojaConfigData]);

  // Petpooja Config Mutation
  const petpoojaMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}/integrations/petpooja/config`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Petpooja POS integration configured successfully!', 'success');
      refetchPetpoojaConfig();
      setPetpoojaAppKey('');
      setPetpoojaAppSecret('');
      setPetpoojaAccessToken('');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating Petpooja configuration', 'error');
    },
  });

  // Menu Sync Mutation
  const syncMenuMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/integrations/petpooja/sync-menu`);
      return res.data;
    },
    onSuccess: () => {
      toast('Petpooja menu synchronization initiated in background!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error initiating menu sync', 'error');
    },
  });

  // Fetch POS Sync Logs
  const { data: syncLogsResponse, isLoading: isLoadingSyncLogs, refetch: refetchSyncLogs } = useQuery({
    queryKey: ['posSyncLogs', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/integrations/sync-logs?limit=10`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('pos_integration'),
  });
  const syncLogs = Array.isArray(syncLogsResponse?.data?.logs) ? syncLogsResponse.data.logs : (Array.isArray(syncLogsResponse?.data) ? syncLogsResponse.data : []);

  // Fetch restaurant details
  const { data: restaurantResponse, isLoading } = useQuery({
    queryKey: ['restaurantProfileInfo', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  // Sync state on load
  useEffect(() => {
    if (restaurantResponse?.success && restaurantResponse?.data) {
      const p: RestaurantProfile = restaurantResponse.data;
      setName(p.name || '');
      setDescription(p.description || '');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setAddress(p.address || '');
      setGoogleReviewUrl(p.googleReviewUrl || '');
      setGstNumber(p.gstNumber || '');
      setWhatsapp(p.whatsapp || '');

      if (p.timings) {
        setOpenTime(p.timings.open || '09:00');
        setCloseTime(p.timings.close || '23:00');
      }

      if (p.socialLinks) {
        setFacebook(p.socialLinks.facebook || '');
        setInstagram(p.socialLinks.instagram || '');
        setTwitter(p.socialLinks.twitter || '');
      }

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

      // Read active provider and mode directly from the raw API response settings block
      // as they are nested inside settings.paymentConfig
      const paymentConfig = (restaurantResponse.data as any)?.settings?.paymentConfig;
      if (paymentConfig) {
        setActivePaymentProvider(paymentConfig.activeProvider || 'CASH');
        setActivePaymentMode(paymentConfig.activeMode || 'POSTPAID');
      }

      if (p.theme) {
        setPrimaryColor(p.theme.primaryColor || '#111827');
        setSecondaryColor(p.theme.secondaryColor || '#FFFFFF');
        setAccentColor(p.theme.accentColor || '#F59E0B');
        setFontFamily(p.theme.fontFamily || 'Plus Jakarta Sans');
      }

      const raw = restaurantResponse.data as any;
      setOrderWorkflowMode(raw.orderWorkflowMode || 'FIVE_STEP');
      setAutoAcceptEnabled(!!(raw.autoAcceptConfig?.enabled));
      setAutoAcceptDelay(raw.autoAcceptConfig?.delaySeconds ?? 10);

      if (raw.branding) {
        setLogoUrl(raw.branding.logoUrl || '');
        setCoverImageUrl(raw.branding.coverImageUrl || '');
      }
      if (raw.notificationPreferences) {
        setEmailNotifications(!!raw.notificationPreferences.emailNotifications);
        setSmsNotifications(!!raw.notificationPreferences.smsNotifications);
        setWhatsappNotifications(!!raw.notificationPreferences.whatsappNotifications);
      }
    }
  }, [restaurantResponse]);

  // Update Settings mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: RestaurantProfile) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Restaurant settings successfully updated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating settings', 'error');
    },
  });


  const updateFlagsMutation = useMutation({
    mutationFn: async (updatedFlags: { key: string; enabled: boolean }[]) => {
      const { data } = await apiClient.patch(`/restaurants/${(user as any)?.restaurantId}/feature-flags`, {
        flags: updatedFlags,
      });
      return data.data;
    },
    onSuccess: () => {
      toast('Feature flags updated successfully!', 'success');
      refreshFlags(); // Refresh context
    },
    onError: (error: any) => {
      toast(error.response?.data?.message || 'Failed to update feature flags', 'error');
    },
  });

  const handleFlagChange = (key: string, enabled: boolean) => {
      setLocalFlags(prev => ({ ...prev, [key]: enabled }));
  };

  const handleSaveFlags = () => {
      const updatedFlagsArray = Object.keys(localFlags).map(key => ({
          key,
          enabled: localFlags[key]
      }));
      updateFlagsMutation.mutate(updatedFlagsArray);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Restaurant Name is required', 'error');
      return;
    }

    const payload: RestaurantProfile = {
      name: name.trim(),
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      googleReviewUrl: googleReviewUrl.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      timings: {
        open: openTime,
        close: closeTime,
      },
      socialLinks: {
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        twitter: twitter.trim(),
      },
      paymentMethods: {
        cash: cashEnabled,
        card: cardEnabled,
        upi: upiEnabled,
        razorpay: razorpayEnabled,
      },
      razorpayConfig: {
        keyId: razorpayKeyId.trim(),
        keySecret: razorpayKeySecret.trim(),
      },
      theme: {
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
      },
      branding: {
        logoUrl: logoUrl.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        googleReviewUrl: googleReviewUrl.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        socialLinks: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          twitter: twitter.trim(),
        },
      },
      notificationPreferences: {
        emailNotifications,
        smsNotifications,
        whatsappNotifications,
      },
      orderWorkflowMode,
      autoAcceptConfig: {
        enabled: autoAcceptEnabled,
        delaySeconds: autoAcceptDelay,
      },
    } as any;

    if (isEnabled('payments')) {
      apiClient.patch(`/restaurants/${activeRestaurantId}/payments/config`, {
        activeProvider: activePaymentProvider,
        activeMode: activePaymentMode,
        razorpayConfig: razorpayEnabled ? {
           keyId: razorpayKeyId,
           keySecret: razorpayKeySecret || undefined,
           webhookSecret: razorpayWebhookSecret || undefined
        } : undefined
      }).catch(err => {
         console.error('Failed to update payment config separately', err);
      });
    }

    updateMutation.mutate(payload);
  };

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3 animate-pulse" />
        <h3 className="font-bold text-slate-800">No Restaurant Configured</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-sans">
      <div>
        <h3 className="font-display text-3xl font-semibold text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-amber-500" strokeWidth={1.75} />
          <span>Restaurant Settings</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Configure physical details, support links, and visual branding variables.
        </p>
      </div>



        {/* Payments Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center space-x-3 text-slate-800">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Payments</h2>
              <p className="text-sm text-slate-500">Configure payment gateways and active modes</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-slate-50 relative">
            {!isEnabled('payments') && (
              <div className="absolute inset-0 z-10 bg-slate-50/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center border-t border-slate-200 rounded-b-xl">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Upgrade Required</h3>
                <p className="text-slate-600 max-w-sm">
                  The Payment Abstraction Framework is not included in your current plan. Please upgrade to unlock digital payments and advanced ledger modes.
                </p>
              </div>
            )}

            <div className={`${!isEnabled('payments') ? 'opacity-30 pointer-events-none filter blur-[1px]' : ''}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                    Active Payment Provider
                  </label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    value={activePaymentProvider}
                    onChange={(e) => setActivePaymentProvider(e.target.value as 'CASH' | 'RAZORPAY')}
                  >
                    <option value="CASH">Cash (Manual Ledger)</option>
                    <option value="RAZORPAY" disabled={!razorpayEnabled}>Razorpay (Digital Gateway)</option>
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Enable Razorpay in the settings below to unlock the digital gateway.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                    Active Payment Mode
                  </label>
                  <select
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    value={activePaymentMode}
                    onChange={(e) => setActivePaymentMode(e.target.value as 'POSTPAID' | 'PREPAID')}
                  >
                    <option value="POSTPAID">Postpaid (Pay after visit)</option>
                    <option value="PREPAID">Prepaid (Pay upfront)</option>
                    <option value="HYBRID" disabled>Hybrid (Open Tab - Coming Soon)</option>
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Determines when the customer is prompted for payment during their visit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Flags Section */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-slate-800">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <ToggleLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Feature Flags</h2>
                  <p className="text-sm text-slate-500">Enable or disable platform features (Super Admin only)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveFlags}
                disabled={updateFlagsMutation.isPending}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {updateFlagsMutation.isPending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Flags
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.keys(localFlags).map((key) => (
                  <label key={key} className="relative flex items-start p-4 cursor-pointer rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={localFlags[key] || false}
                        onChange={(e) => handleFlagChange(key, e.target.checked)}
                        className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <span className="font-medium text-slate-900 block truncate" title={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-slate-500 text-xs mt-1 block font-mono bg-slate-100 px-1 py-0.5 rounded truncate" title={key}>
                        {key}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <span>Core Contact Profiles</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Restaurant Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Woodfired Bistro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Support Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@woodfired.com"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Google Review URL</label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">GST Number</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AAAAA1111A1Z1"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">WhatsApp Contact</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Restaurant Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Serving genuine hand-tossed sourdough pizza in a rustic woodfired furnace..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 font-sans">Physical Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="456 Gourmet Lane, Mumbai, Maharashtra"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cover Image URL</label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <span>Notification Preferences</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Email Alerts</p>
                <p className="text-[10px] text-slate-500">Order summaries & reports</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
                <p className="text-[10px] text-slate-500">Instant SMS dispatch</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={whatsappNotifications}
                onChange={(e) => setWhatsappNotifications(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">WhatsApp Alerts</p>
                <p className="text-[10px] text-slate-500">Order status notifications</p>
              </div>
            </label>
          </div>
        </div>

        {/* Social Links Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <span>Social Media Channels</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Facebook Profile</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/mybistro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instagram Handle</label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/mybistro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Twitter Channel</label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://twitter.com/mybistro"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Payments Channels Config Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <span>Payment Methods & Channels</span>
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
              <span className="text-xs font-bold text-slate-700 font-sans">Razorpay Gateway</span>
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
                  placeholder="Provide new secret to set"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Webhook Secret</label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Provide new secret to set"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Petpooja POS Integration Card */}
        {isEnabled('pos_integration') && (
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                <span>Petpooja POS Integration</span>
              </h4>
              <div className="flex items-center gap-2">
                {petpoojaIsConfigured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Configured
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => syncMenuMutation.mutate()}
                  disabled={syncMenuMutation.isPending || !petpoojaIsConfigured}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncMenuMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync Menu
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={petpoojaEnabled}
                  onChange={(e) => setPetpoojaEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">Enable Petpooja POS Adapter</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Outlet ID / Rest ID</label>
                  <input
                    type="text"
                    value={petpoojaOutletId}
                    onChange={(e) => setPetpoojaOutletId(e.target.value)}
                    placeholder="e.g. rest_12345"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">App Key (Write-Only Secret)</label>
                  <input
                    type="password"
                    value={petpoojaAppKey}
                    onChange={(e) => setPetpoojaAppKey(e.target.value)}
                    placeholder={petpoojaIsConfigured ? '••••••••••••••••' : 'Enter Petpooja App Key'}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">App Secret (Write-Only Secret)</label>
                  <input
                    type="password"
                    value={petpoojaAppSecret}
                    onChange={(e) => setPetpoojaAppSecret(e.target.value)}
                    placeholder={petpoojaIsConfigured ? '••••••••••••••••' : 'Enter Petpooja App Secret'}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Access Token (Write-Only Secret)</label>
                  <input
                    type="password"
                    value={petpoojaAccessToken}
                    onChange={(e) => setPetpoojaAccessToken(e.target.value)}
                    placeholder={petpoojaIsConfigured ? '••••••••••••••••' : 'Enter Petpooja Access Token'}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() =>
                    petpoojaMutation.mutate({
                      enabled: petpoojaEnabled,
                      outletId: petpoojaOutletId,
                      ...(petpoojaAppKey ? { appKey: petpoojaAppKey } : {}),
                      ...(petpoojaAppSecret ? { appSecret: petpoojaAppSecret } : {}),
                      ...(petpoojaAccessToken ? { accessToken: petpoojaAccessToken } : {}),
                      provider: 'PETPOOJA',
                    })
                  }
                  disabled={petpoojaMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {petpoojaMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Petpooja Credentials
                </button>
              </div>

              {/* POS Integration Sync Audit Logs Table */}
              <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                    <span>Recent POS Sync Audit Logs</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => refetchSyncLogs()}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSyncLogs ? 'animate-spin' : ''}`} /> Refresh Logs
                  </button>
                </div>

                {syncLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No integration sync audit logs recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto max-h-48 custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[9px]">
                          <th className="pb-1.5">Timestamp</th>
                          <th className="pb-1.5">Action</th>
                          <th className="pb-1.5">Status</th>
                          <th className="pb-1.5">Message / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {syncLogs.map((log: any, idx: number) => (
                          <tr key={log._id || idx}>
                            <td className="py-1.5 pr-2 text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt || log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-1.5 pr-2 font-bold text-slate-700">{log.action || log.type}</td>
                            <td className="py-1.5 pr-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="py-1.5 text-slate-600 truncate max-w-xs">{log.message || log.errorDetails || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Branding Theme Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <span>Theme & Branding Colors</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Primary Color */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Secondary Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">Accent Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Branding Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Sans-Serif)</option>
              <option value="Instrument Serif">Instrument Serif (Elegant Display Serif)</option>
              <option value="Fraunces">Fraunces (Warm Editorial Serif)</option>
              <option value="JetBrains Mono">JetBrains Mono (Technical Monospace)</option>
              <option value="DM Mono">DM Mono (Clean Monospace)</option>
            </select>
          </div>
        </div>

        {/* Order Workflow & Automation Card */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <GitBranch className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <span>Order Workflow Mode</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              {
                value: 'FIVE_STEP',
                label: '5-Step Standard',
                desc: 'New → Accepted → Preparing → Ready → Served',
                steps: ['New', 'Accepted', 'Preparing', 'Ready', 'Served'],
                colors: ['bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-purple-500', 'bg-blue-500'],
              },
              {
                value: 'FOUR_STEP',
                label: '4-Step Kitchen & Ready',
                desc: 'New → Preparing → Ready → Served',
                steps: ['New', 'Preparing', 'Ready', 'Served'],
                colors: ['bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-blue-500'],
              },
              {
                value: 'THREE_STEP',
                label: '3-Step Express',
                desc: 'New → Preparing → Served',
                steps: ['New', 'Preparing', 'Served'],
                colors: ['bg-amber-500', 'bg-indigo-500', 'bg-blue-500'],
              },
            ] as const).map((mode) => {
              const isSelected = orderWorkflowMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setOrderWorkflowMode(mode.value)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 space-y-3 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-extrabold ${ isSelected ? 'text-amber-700' : 'text-slate-800'}`}>{mode.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{mode.desc}</p>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current"><path d="M1.5 6.5l3 3L10.5 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {mode.steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-6 rounded-full ${mode.colors[i]}`} />
                        <span className="text-[9px] font-bold text-slate-500">{step}</span>
                        {i < mode.steps.length - 1 && <span className="text-[9px] text-slate-300">›</span>}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-Accept Automation */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
              <span>Auto-Accept Orders</span>
            </h4>

            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={autoAcceptEnabled}
                  onChange={(e) => setAutoAcceptEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-500 accent-amber-500 border-slate-300"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Automatically accept new orders</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  New orders will be auto-accepted and moved to{' '}
                  <strong>{orderWorkflowMode === 'FIVE_STEP' ? 'Accepted' : 'Preparing'}</strong>{' '}
                  after the specified delay. Great for busy restaurants.
                </p>
              </div>
            </label>

            {autoAcceptEnabled && (
              <div className="ml-1 space-y-3">
                <label className="block text-xs font-semibold text-slate-600">Auto-accept delay</label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 30, 60, 120].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setAutoAcceptDelay(sec)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        autoAcceptDelay === sec
                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Orders will auto-advance after <strong className="text-slate-600">{autoAcceptDelay < 60 ? `${autoAcceptDelay} seconds` : `${autoAcceptDelay / 60} minute(s)`}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>


        {/* Submit */}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-md disabled:bg-slate-400 active:scale-[0.98]"
        >
          {updateMutation.isPending ? (
            <Loader className="w-5 h-5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="w-5 h-5" strokeWidth={1.75} />
          )}
          <span>Save Configuration Changes</span>
        </button>
      </form>
    </div>
  );
};
export default ManagerSettings;
