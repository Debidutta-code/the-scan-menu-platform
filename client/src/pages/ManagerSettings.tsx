import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import {
  Loader,
  Settings,
  Save,
  AlertCircle,
  GitBranch,
  Timer,
  ToggleLeft,
  CreditCard,
  Lock,
  Palette,
  Store,
  Bell,
  Globe,
  ChevronRight,
} from 'lucide-react';
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

type TabType =
  | 'general'
  | 'payments'
  | 'theme'
  | 'workflow'
  | 'notifications'
  | 'social'
  | 'feature_flags';

export const ManagerSettings: React.FC = () => {
  const { user } = useAuth();
  const { flags, refreshFlags, isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const activeRestaurantId = user?.restaurants?.[0];

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (flags) {
      setLocalFlags(flags);
    }
  }, [flags]);

  // General Store Profile State
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
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Notification Preferences State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);

  // Social Links State
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

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

  // Theme states
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');

  // Order Workflow & Automation
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP'>('FIVE_STEP');
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [autoAcceptDelay, setAutoAcceptDelay] = useState(10);

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
      setAutoAcceptEnabled(!!raw.autoAcceptConfig?.enabled);
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

  // Patch mutation helper with custom section success message
  const updateSectionMutation = useMutation({
    mutationFn: async ({ payload, sectionName }: { payload: Partial<RestaurantProfile>; sectionName: string }) => {
      const res = await apiClient.patch(`/restaurants/${activeRestaurantId}`, payload);
      return { data: res.data, sectionName };
    },
    onSuccess: (result) => {
      toast(`${result.sectionName} updated successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating settings section', 'error');
    },
  });

  // Feature flags mutation
  const updateFlagsMutation = useMutation({
    mutationFn: async (updatedFlags: { key: string; enabled: boolean }[]) => {
      const { data } = await apiClient.patch(`/restaurants/${(user as any)?.restaurantId}/feature-flags`, {
        flags: updatedFlags,
      });
      return data.data;
    },
    onSuccess: () => {
      toast('Feature flags updated successfully!', 'success');
      refreshFlags();
    },
    onError: (error: any) => {
      toast(error.response?.data?.message || 'Failed to update feature flags', 'error');
    },
  });

  // Individual Section Submit Handlers
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Restaurant Name is required', 'error');
      return;
    }
    updateSectionMutation.mutate({
      sectionName: 'General Store Profile',
      payload: {
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
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          coverImageUrl: coverImageUrl.trim() || undefined,
        },
      } as any,
    });
  };

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEnabled('payments')) {
      try {
        await apiClient.patch(`/restaurants/${activeRestaurantId}/payments/config`, {
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

    updateSectionMutation.mutate({
      sectionName: 'Payments & Channels Settings',
      payload: {
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
      } as any,
    });
  };

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    updateSectionMutation.mutate({
      sectionName: 'Theme & Branding Colors',
      payload: {
        theme: {
          primaryColor,
          secondaryColor,
          accentColor,
          fontFamily,
        },
      } as any,
    });
  };

  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    updateSectionMutation.mutate({
      sectionName: 'Order Workflow & Automation',
      payload: {
        orderWorkflowMode,
        autoAcceptConfig: {
          enabled: autoAcceptEnabled,
          delaySeconds: autoAcceptDelay,
        },
      } as any,
    });
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    updateSectionMutation.mutate({
      sectionName: 'Notification Preferences',
      payload: {
        notificationPreferences: {
          emailNotifications,
          smsNotifications,
          whatsappNotifications,
        },
      } as any,
    });
  };

  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    updateSectionMutation.mutate({
      sectionName: 'Social Media Channels',
      payload: {
        socialLinks: {
          facebook: facebook.trim(),
          instagram: instagram.trim(),
          twitter: twitter.trim(),
        },
      } as any,
    });
  };

  const handleFlagChange = (key: string, enabled: boolean) => {
    setLocalFlags((prev) => ({ ...prev, [key]: enabled }));
  };

  const handleSaveFlags = () => {
    const updatedFlagsArray = Object.keys(localFlags).map((key) => ({
      key,
      enabled: localFlags[key],
    }));
    updateFlagsMutation.mutate(updatedFlagsArray);
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

  const tabsNav: { id: TabType; label: string; icon: React.ReactNode; badge?: string; show?: boolean }[] = [
    { id: 'general', label: 'Store Profile', icon: <Store className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'payments', label: 'Payments & Channels', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'theme', label: 'Theme & Branding', icon: <Palette className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'workflow', label: 'Order Workflow', icon: <GitBranch className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'social', label: 'Social Channels', icon: <Globe className="w-4 h-4" strokeWidth={1.75} /> },
    {
      id: 'feature_flags',
      label: 'Feature Flags',
      icon: <ToggleLeft className="w-4 h-4 text-indigo-500" strokeWidth={1.75} />,
      badge: 'SuperAdmin',
      show: user?.role === 'SUPER_ADMIN',
    },
  ];

  const filteredTabs = tabsNav.filter((t) => t.show !== false);

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Page Title Header */}
      <div>
        <h3 className="font-display text-3xl font-semibold text-slate-900 flex items-center gap-2">
          <Settings className="w-8 h-8 text-amber-500" strokeWidth={1.75} />
          <span>Restaurant Operations Settings</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Manage store information, payment channels, workflow automation, and visual theme variables.
        </p>
      </div>

      {/* Main Tabbed Grid Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ----------------- SIDEBAR SUB-NAVIGATION ----------------- */}
        <aside className="w-full md:w-64 bg-white rounded-3xl border border-slate-150 p-2 shadow-sm shrink-0 overflow-x-auto">
          <nav className="flex md:flex-col gap-1">
            {filteredTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tab.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                          isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform hidden md:block ${
                        isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-300'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ----------------- TAB CONTENT AREA ----------------- */}
        <main className="flex-1 w-full min-w-0">
          {/* TAB 1: GENERAL STORE PROFILE */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                    <span>Store Profile & Physical Details</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Core restaurant information displayed to customers and invoices.</p>
                </div>
              </div>

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

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save General Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PAYMENTS & CHANNELS */}
          {activeTab === 'payments' && (
            <form onSubmit={handleSavePayments} className="space-y-6">
              {/* Active Provider & Mode Card */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
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
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
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
                    disabled={updateSectionMutation.isPending}
                    className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                  >
                    {updateSectionMutation.isPending ? (
                      <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Save className="w-4 h-4" strokeWidth={1.75} />
                    )}
                    <span>Save Payment Settings</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: THEME & BRANDING */}
          {activeTab === 'theme' && (
            <form onSubmit={handleSaveTheme} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <span>Theme & Customer Interface Colors</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Customize your digital menu color scheme and typography.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                      className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

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
                      className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

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
                      className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Branding Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Sans-Serif)</option>
                  <option value="Instrument Serif">Instrument Serif (Elegant Display Serif)</option>
                  <option value="Fraunces">Fraunces (Warm Editorial Serif)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Technical Monospace)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save Theme & Branding</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ORDER WORKFLOW */}
          {activeTab === 'workflow' && (
            <form onSubmit={handleSaveWorkflow} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <span>Order Workflow & Auto-Accept Rules</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Define order step lifecycle and auto-dispatch timers.</p>
              </div>

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
                          <p className={`text-sm font-extrabold ${isSelected ? 'text-amber-700' : 'text-slate-800'}`}>
                            {mode.label}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{mode.desc}</p>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
                              <path
                                d="M1.5 6.5l3 3L10.5 3"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
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
                <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                  <span>Auto-Accept Orders</span>
                </h5>

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
                    <p className="text-sm font-bold text-slate-800">Automatically accept new incoming orders</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                      New orders will be auto-accepted and moved to{' '}
                      <strong>{orderWorkflowMode === 'FIVE_STEP' ? 'Accepted' : 'Preparing'}</strong> after delay.
                    </p>
                  </div>
                </label>

                {autoAcceptEnabled && (
                  <div className="ml-1 space-y-3">
                    <label className="block text-xs font-semibold text-slate-600">Auto-accept timer delay</label>
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
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save Workflow Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <span>Notification Preferences</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Toggle alert channels for new orders, summaries, and receipts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">Email Alerts</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Order summaries & daily shift reports</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={smsNotifications}
                    onChange={(e) => setSmsNotifications(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">SMS Alerts</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Instant SMS dispatch notifications</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={whatsappNotifications}
                    onChange={(e) => setWhatsappNotifications(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">WhatsApp Alerts</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time WhatsApp customer alerts</p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save Notification Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 6: SOCIAL CHANNELS */}
          {activeTab === 'social' && (
            <form onSubmit={handleSaveSocial} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                  <span>Social Media Channels</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Links displayed on customer digital menus.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Facebook Profile</label>
                  <input
                    type="text"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/mybistro"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Instagram Handle</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/mybistro"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Twitter / X Channel</label>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/mybistro"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save Social Channels</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: FEATURE FLAGS (SUPER ADMIN ONLY) */}
          {activeTab === 'feature_flags' && user?.role === 'SUPER_ADMIN' && (
            <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ToggleLeft className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
                    <span>Restaurant Feature Flags (Super Admin)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">Granularly enable or disable platform capabilities for this outlet.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveFlags}
                  disabled={updateFlagsMutation.isPending}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {updateFlagsMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Flags</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(localFlags).map((key) => (
                  <label
                    key={key}
                    className="relative flex items-start p-4 cursor-pointer rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={localFlags[key] || false}
                        onChange={(e) => handleFlagChange(key, e.target.checked)}
                        className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <div className="ml-3 text-xs">
                      <span className="font-bold text-slate-900 block truncate" title={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      <span className="text-slate-500 text-[10px] mt-0.5 block font-mono bg-slate-100 px-1.5 py-0.5 rounded truncate">
                        {key}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ManagerSettings;
