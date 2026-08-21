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
  Printer,
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
  printerConfig?: {
    paperWidth: '80mm' | '58mm' | 'A4';
    templateTheme?: 'classic' | 'modern' | 'compact';
    showLogo?: boolean;
    logoUrl?: string;
    showGstNumber?: boolean;
    gstNumber?: string;
    showFssai?: boolean;
    fssaiNumber?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    showCustomerInfo?: boolean;
    showPaymentMode?: boolean;
    showTaxBreakup?: boolean;
    kotNotes?: string;
    kotShowServerName?: boolean;
    defaultPrintTarget: 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE';
  };
  theme: RestaurantTheme;
}

type TabType =
  | 'general'
  | 'printers'
  | 'payments'
  | 'theme'
  | 'workflow'
  | 'notifications'
  | 'social'
  | 'feature_flags';

export const ManagerSettings: React.FC = () => {
  const { user, activeRestaurantId } = useAuth();
  const { flags, refreshFlags, isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active orders to block workflow changes
  const { data: activeOrdersData } = useQuery({
    queryKey: ['activeOrdersQueue', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('ordering'),
  });
  const hasActiveOrders = activeOrdersData?.success && activeOrdersData.data.length > 0;

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
  
  // Printer & Receipt Design Studio States
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'A4'>('80mm');
  const [templateTheme, setTemplateTheme] = useState<'classic' | 'modern' | 'compact'>('classic');
  const [showLogo, setShowLogo] = useState(true);
  const [receiptLogoUrl, setReceiptLogoUrl] = useState('');
  const [showGstNumber, setShowGstNumber] = useState(true);
  const [receiptGstNumber, setReceiptGstNumber] = useState('');
  const [showFssai, setShowFssai] = useState(true);
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [showPaymentMode, setShowPaymentMode] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [kotNotes, setKotNotes] = useState('');
  const [kotShowServerName, setKotShowServerName] = useState(true);
  const [defaultPrintTarget, setDefaultPrintTarget] = useState<'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE'>('BOTH');
  const [previewReceiptType, setPreviewReceiptType] = useState<'BILL' | 'COUNTER' | 'KOT'>('BILL');
  const [previewPaymentStatus, setPreviewPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');

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
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP'>(() => {
    if (!activeRestaurantId) return 'FIVE_STEP';
    const cached = localStorage.getItem(`pixora_workflow_mode_${activeRestaurantId}`);
    return (cached as any) || 'FIVE_STEP';
  });
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
      setLogoUrl(p.branding?.logoUrl || (p as any)?.logoUrl || '');
      setCoverImageUrl(p.branding?.coverImageUrl || '');

      const printerCfg = (restaurantResponse.data as any)?.printerConfig || (restaurantResponse.data as any)?.settings?.printerConfig;
      if (printerCfg) {
        setPaperWidth(printerCfg.paperWidth || '80mm');
        setTemplateTheme(printerCfg.templateTheme || 'classic');
        setShowLogo(printerCfg.showLogo !== false);
        setReceiptLogoUrl(printerCfg.logoUrl || '');
        setShowGstNumber(printerCfg.showGstNumber !== false);
        setReceiptGstNumber(printerCfg.gstNumber || p.gstNumber || '');
        setShowFssai(printerCfg.showFssai !== false);
        setFssaiNumber(printerCfg.fssaiNumber || '');
        setReceiptHeader(printerCfg.receiptHeader || '');
        setReceiptFooter(printerCfg.receiptFooter || '');
        setShowCustomerInfo(printerCfg.showCustomerInfo !== false);
        setShowPaymentMode(printerCfg.showPaymentMode !== false);
        setShowTaxBreakup(printerCfg.showTaxBreakup !== false);
        setShowPaymentQr(printerCfg.showPaymentQr !== false);
        setUpiId(printerCfg.upiId || (restaurantResponse.data as any)?.settings?.paymentConfig?.upiId || '');
        setKotNotes(printerCfg.kotNotes || '');
        setKotShowServerName(printerCfg.kotShowServerName !== false);
        setDefaultPrintTarget(printerCfg.defaultPrintTarget || 'BOTH');
      } else {
        const settingsObj = (restaurantResponse.data as any)?.settings;
        if (settingsObj) {
          setReceiptHeader(settingsObj.receiptHeader || '');
          setReceiptFooter(settingsObj.receiptFooter || '');
        }
      }

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
      const serverWorkflow = raw.orderWorkflowMode || 'FIVE_STEP';
      setOrderWorkflowMode(serverWorkflow);
      if (activeRestaurantId) {
        localStorage.setItem(`pixora_workflow_mode_${activeRestaurantId}`, serverWorkflow);
      }
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
  }, [restaurantResponse, activeRestaurantId]);

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
        settings: {
          receiptHeader: receiptHeader.trim() || undefined,
          receiptFooter: receiptFooter.trim() || undefined,
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

  const handleSavePrinterSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSectionMutation.mutate({
      sectionName: 'Printer & Receipts Configuration',
      payload: {
        printerConfig: {
          paperWidth,
          templateTheme,
          showLogo,
          logoUrl: receiptLogoUrl.trim() || undefined,
          showGstNumber,
          gstNumber: receiptGstNumber.trim() || undefined,
          showFssai,
          fssaiNumber: fssaiNumber.trim() || undefined,
          receiptHeader: receiptHeader.trim(),
          receiptFooter: receiptFooter.trim(),
          showCustomerInfo,
          showPaymentMode,
          showTaxBreakup,
          showPaymentQr,
          upiId: upiId.trim() || undefined,
          kotNotes: kotNotes.trim(),
          kotShowServerName,
          defaultPrintTarget,
        },
      } as any,
    });
    queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', activeRestaurantId] });
    queryClient.invalidateQueries({ queryKey: ['restaurantProfile', activeRestaurantId] });
    queryClient.invalidateQueries({ queryKey: ['restaurantSettings', activeRestaurantId] });
  };

  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRestaurantId) {
      localStorage.setItem(`pixora_workflow_mode_${activeRestaurantId}`, orderWorkflowMode);
    }
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
    queryClient.invalidateQueries({ queryKey: ['restaurantConfig', activeRestaurantId] });
    queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', activeRestaurantId] });
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
    { id: 'printers', label: 'Printer & Receipts', icon: <Printer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, show: isEnabled('ordering') || isEnabled('pos') },
    { id: 'payments', label: 'Payments & Channels', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('payments') },
    { id: 'theme', label: 'Theme & Branding', icon: <Palette className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('white_label') },
    { id: 'workflow', label: 'Order Workflow', icon: <GitBranch className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('ordering') },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('ordering') || isEnabled('waiter_call') || isEnabled('kds') },
    { id: 'social', label: 'Social Channels', icon: <Globe className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('marketing') || isEnabled('crm') },
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

          {/* TAB: PRINTER & RECEIPTS CONFIGURATION */}
          {activeTab === 'printers' && (
            <form onSubmit={handleSavePrinterSettings} className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-7">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                    <span>Thermal Printer & Receipt Design Studio</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize customer bills, counter receipts, kitchen KOT tickets, logo branding, and tax layouts.
                  </p>
                </div>
              </div>

              {/* ── 1. BRANDING, LOGO & TAX REGISTRATION ──────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-500" />
                    <span>1. Receipt Branding & Tax Identifiers</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Prints at top of receipts</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Logo Configuration */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Receipt Logo</label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showLogo}
                          onChange={(e) => setShowLogo(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span className="font-medium text-[11px]">Print Logo on Bills</span>
                      </label>
                    </div>

                    {showLogo && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={receiptLogoUrl}
                            onChange={(e) => setReceiptLogoUrl(e.target.value)}
                            placeholder={logoUrl || 'https://example.com/logo.png'}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                          />
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setReceiptLogoUrl(logoUrl)}
                              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl transition cursor-pointer whitespace-nowrap"
                            >
                              Use Store Logo
                            </button>
                          )}
                        </div>
                        {(receiptLogoUrl || logoUrl) && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-slate-400">Preview:</span>
                            <img
                              src={receiptLogoUrl || logoUrl}
                              alt="Receipt Logo"
                              className="h-8 max-w-[120px] object-contain bg-white p-1 rounded-lg border border-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* GSTIN & FSSAI Identifiers */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">GSTIN Registration Number</label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showGstNumber}
                            onChange={(e) => setShowGstNumber(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span>Show GSTIN</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={receiptGstNumber}
                        onChange={(e) => setReceiptGstNumber(e.target.value)}
                        placeholder="e.g. 27AAAAA1111A1Z1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white uppercase"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">FSSAI License Number</label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showFssai}
                            onChange={(e) => setShowFssai(e.target.checked)}
                            className="rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span>Show FSSAI</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={fssaiNumber}
                        onChange={(e) => setFssaiNumber(e.target.value)}
                        placeholder="e.g. 10019022009876"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                      />
                    </div>
                  </div>

                  {/* UPI Payment QR Code Configuration */}
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700">Dynamic UPI Payment QR Code</label>
                        <p className="text-[11px] text-slate-500">
                          Automatically generates a scan-and-pay UPI QR code on postpaid & unpaid bills so guests can pay instantly via GPay, PhonePe, Paytm, or BHIM.
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap font-medium">
                        <input
                          type="checkbox"
                          checked={showPaymentQr}
                          onChange={(e) => setShowPaymentQr(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>Print Payment QR</span>
                      </label>
                    </div>

                    {showPaymentQr && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Merchant UPI ID (VPA)
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. yourrestaurant@okhdfcbank or 9876543210@paytm"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Amount is automatically encoded in QR code.</p>
                        </div>
                        <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                          <span className="text-sm">💡</span>
                          <span>
                            <strong>Prepaid vs Postpaid Rules:</strong> If an order is already marked as <strong>PAID</strong>, the bill prints as a <strong>Paid Tax Invoice</strong> without the QR code. If payment is <strong>PENDING / POSTPAID</strong>, the dynamic QR code is printed for fast table-side settlement.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 2. CUSTOMER & COUNTER BILL DESIGN ────────────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-500" />
                  <span>2. Customer & Counter Bill Customization</span>
                </label>

                {/* Template Themes */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Receipt Visual Theme</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'classic', label: 'Classic Thermal', desc: 'Monospace font with classic dashed dividing borders' },
                      { id: 'modern', label: 'Modern Clean', desc: 'Sleek sans-serif typography with minimal solid borders' },
                      { id: 'compact', label: 'Compact Paper-Saver', desc: 'Reduced line height and margins to minimize paper roll usage' },
                    ].map((themeOpt) => {
                      const isSelected = templateTheme === themeOpt.id;
                      return (
                        <button
                          type="button"
                          key={themeOpt.id}
                          onClick={() => setTemplateTheme(themeOpt.id as any)}
                          className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-2xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold text-xs text-slate-900 mb-1">{themeOpt.label}</div>
                          <div className="text-[11px] text-slate-500 leading-snug">{themeOpt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={showTaxBreakup}
                      onChange={(e) => setShowTaxBreakup(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Itemized Tax Breakup (CGST / SGST)</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={showCustomerInfo}
                      onChange={(e) => setShowCustomerInfo(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Customer Name & Phone Number</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={showPaymentMode}
                      onChange={(e) => setShowPaymentMode(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Payment Mode & Paid Status Badge</span>
                  </label>
                </div>

                {/* Header & Footer Custom Messages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Receipt Header Slogan / Greeting
                    </label>
                    <input
                      type="text"
                      value={receiptHeader}
                      onChange={(e) => setReceiptHeader(e.target.value)}
                      placeholder="e.g. Welcome to The Woodfired Bistro!"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Printed directly under restaurant address & tax details.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Receipt Footer Message / Note
                    </label>
                    <input
                      type="text"
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      placeholder="e.g. Thank you for dining with us! Please visit again."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Printed at the very bottom of every customer invoice.</p>
                  </div>
                </div>
              </div>

              {/* ── 3. KITCHEN ORDER TICKET (KOT) DESIGN ────────────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-500" />
                  <span>3. Kitchen Order Ticket (KOT) Customization</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={kotShowServerName}
                        onChange={(e) => setKotShowServerName(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Print Server / Cashier Name on KOT</span>
                    </label>
                    <p className="text-[11px] text-slate-400">Identifies who punched the order for kitchen staff coordination.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Kitchen Staff Note / Prep Instructions
                    </label>
                    <input
                      type="text"
                      value={kotNotes}
                      onChange={(e) => setKotNotes(e.target.value)}
                      placeholder="e.g. ⚠️ Check allergy flags & temperature"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <p className="text-[11px] text-slate-400">Fixed instruction printed at the bottom of every kitchen ticket.</p>
                  </div>
                </div>
              </div>

              {/* ── 4. HARDWARE PAPER FORMAT & CHECKOUT BEHAVIOR ──────────────────── */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-500" />
                  <span>4. Paper Roll Width & Default POS Behavior</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: '80mm', label: '80mm Thermal Paper', desc: 'Standard 3-inch POS printer roll (Epson, TVS, Star, Citizen)', badge: 'Recommended' },
                    { id: '58mm', label: '58mm Mini Thermal', desc: 'Compact 2-inch handheld or Bluetooth printer roll', badge: 'Handheld POS' },
                    { id: 'A4', label: 'Standard A4 Sheet', desc: 'Full-page laser/inkjet printer for formal billing', badge: 'Full Page' },
                  ].map((p) => {
                    const isSelected = paperWidth === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setPaperWidth(p.id as any)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900">{p.label}</span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-slate-700">Default POS Order Placement Action</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'BOTH', label: 'Print Both (KOT + Counter Bill)', sub: 'Kitchen ticket + counter bill in sequence', icon: '🖨️' },
                      { id: 'KITCHEN', label: 'Kitchen Ticket (KOT) Only', sub: 'Sends prep slip to kitchen printer', icon: '🍳' },
                      { id: 'COUNTER', label: 'Counter Bill Only', sub: 'Prints tax invoice for counter cashier', icon: '🧾' },
                      { id: 'NONE', label: 'Do Not Auto-Print', sub: 'Staff manually clicks print when desired', icon: '🚫' },
                    ].map((target) => {
                      const isSelected = defaultPrintTarget === target.id;
                      return (
                        <button
                          type="button"
                          key={target.id}
                          onClick={() => setDefaultPrintTarget(target.id as any)}
                          className={`text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{target.icon}</span>
                            <span className="font-bold text-xs text-slate-900">{target.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{target.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── 5. INTERACTIVE LIVE THERMAL PREVIEW ───────────────────────────── */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      5. Live Thermal Design Preview ({paperWidth})
                    </label>
                    <span className="text-[11px] text-slate-400">Click tabs below to test & preview each receipt design</span>
                  </div>

                  {/* Preview Switcher */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptType('BILL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewReceiptType === 'BILL' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🧾 Customer Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptType('COUNTER')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewReceiptType === 'COUNTER' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📋 Counter Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptType('KOT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        previewReceiptType === 'KOT' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🍳 Kitchen KOT
                    </button>
                  </div>
                </div>

                {/* Sub-selector for Customer Bill: Prepaid vs Postpaid */}
                {previewReceiptType === 'BILL' && (
                  <div className="flex items-center justify-center gap-2 pt-1 pb-2">
                    <span className="text-xs font-semibold text-slate-600">Simulate Bill Condition:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewPaymentStatus('PENDING')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        previewPaymentStatus === 'PENDING'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      💳 Postpaid (Unpaid + Dynamic UPI QR)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPaymentStatus('PAID')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        previewPaymentStatus === 'PAID'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      ✓ Prepaid (Paid Tax Invoice)
                    </button>
                  </div>
                )}

                {/* Thermal Preview Card */}
                <div className="bg-slate-100 p-6 rounded-3xl flex justify-center">
                  <div
                    className={`bg-white p-5 shadow-lg rounded-xl border border-slate-200 leading-tight space-y-2.5 select-none ${
                      templateTheme === 'modern' ? 'font-sans' : 'font-mono'
                    }`}
                    style={{
                      width: paperWidth === '58mm' ? '230px' : paperWidth === '80mm' ? '300px' : '440px',
                      fontSize: paperWidth === '58mm' ? '10px' : '11px',
                    }}
                  >
                    {/* CUSTOMER BILL / COUNTER BILL PREVIEW */}
                    {(previewReceiptType === 'BILL' || previewReceiptType === 'COUNTER') && (
                      <>
                        <div className="text-center border-b border-dashed border-slate-300 pb-2">
                          {showLogo && (receiptLogoUrl || logoUrl) && (
                            <img
                              src={receiptLogoUrl || logoUrl}
                              alt="Logo"
                              className="h-9 mx-auto mb-1.5 object-contain"
                            />
                          )}
                          <div className="font-bold text-sm text-slate-950 uppercase tracking-wide">
                            {name || 'THE WOODFIRED BISTRO'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{address || '456 Gourmet Lane, Mumbai'}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{phone || 'Ph: +91 98765 43210'}</div>
                          {showGstNumber && (receiptGstNumber || gstNumber) && (
                            <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                              GSTIN: {receiptGstNumber || gstNumber || '27AAAAA1111A1Z1'}
                            </div>
                          )}
                          {showFssai && fssaiNumber && (
                            <div className="text-[10px] text-slate-600">FSSAI: {fssaiNumber}</div>
                          )}
                          {receiptHeader && <div className="text-[10px] italic text-amber-800 mt-1">{receiptHeader}</div>}
                          
                          <div className="mt-1.5 inline-block bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                            {previewReceiptType === 'COUNTER'
                              ? 'COUNTER / AUDIT COPY'
                              : previewPaymentStatus === 'PAID'
                              ? 'TAX INVOICE'
                              : 'BILL FOR PAYMENT (PROFORMA)'}
                          </div>
                        </div>

                        <div className="flex justify-between text-[10px] border-b border-slate-200 pb-1 text-slate-700">
                          <div>
                            <span className="font-bold">Order #104 · DINE_IN</span>
                            {showCustomerInfo && <div className="text-slate-500">Guest: Rahul Sharma</div>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold">Table 04</span>
                            <div className="text-slate-400">14-Aug-2026 12:35</div>
                          </div>
                        </div>

                        <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300 text-slate-800">
                          <div className="flex justify-between">
                            <span>2x Margherita Pizza</span>
                            <span className="font-bold">₹898.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span>1x Filter Coffee</span>
                            <span className="font-bold">₹120.00</span>
                          </div>
                        </div>

                        <div className="space-y-1 pt-1 text-[10px]">
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal:</span>
                            <span className="font-bold">₹1,018.00</span>
                          </div>
                          {showTaxBreakup ? (
                            <>
                              <div className="flex justify-between text-slate-600">
                                <span>CGST (2.5%):</span>
                                <span>₹25.45</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>SGST (2.5%):</span>
                                <span>₹25.45</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between text-slate-600">
                              <span>GST (5%):</span>
                              <span>₹50.90</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-slate-950 text-xs pt-1.5 border-t-2 border-slate-900">
                            <span>
                              {previewReceiptType === 'COUNTER' || previewPaymentStatus === 'PAID'
                                ? 'TOTAL PAID:'
                                : 'PAYABLE AMOUNT:'}
                            </span>
                            <span>₹1,068.90</span>
                          </div>
                          {showPaymentMode && (
                            <div
                              className={`text-[10px] font-black text-center mt-1 py-0.5 rounded border ${
                                previewPaymentStatus === 'PAID' || previewReceiptType === 'COUNTER'
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-amber-800 bg-amber-50 border-amber-200'
                              }`}
                            >
                              {previewPaymentStatus === 'PAID' || previewReceiptType === 'COUNTER'
                                ? '✓ PAID (UPI / QR)'
                                : 'STATUS: PAYMENT DUE'}
                            </div>
                          )}
                        </div>

                        {/* UPI Payment QR in Postpaid Customer Bill Preview */}
                        {previewReceiptType === 'BILL' && previewPaymentStatus === 'PENDING' && showPaymentQr && (
                          <div className="text-center border border-dashed border-slate-400 p-2 rounded-lg bg-slate-50 mt-2 space-y-1">
                            <div className="text-[10px] font-black tracking-wider text-slate-900">SCAN & PAY VIA UPI</div>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(
                                `upi://pay?pa=${upiId || 'merchant@upi'}&pn=${name || 'Restaurant'}&am=1068.90&cu=INR&tn=Bill%20104`
                              )}`}
                              alt="UPI QR Code"
                              className="w-24 h-24 mx-auto border border-slate-200 p-1 bg-white rounded"
                            />
                            <div className="text-[9px] font-bold text-slate-700">GPay • PhonePe • Paytm • BHIM</div>
                            <div className="text-[8px] font-mono text-slate-500">UPI ID: {upiId || 'merchant@upi'}</div>
                          </div>
                        )}

                        {/* Counter Copy Signatures */}
                        {previewReceiptType === 'COUNTER' && (
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-400 flex justify-between text-[9px] text-slate-600">
                            <span>Cashier: ___________</span>
                            <span>Sign: ___________</span>
                          </div>
                        )}

                        <div className="text-center border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500 italic">
                          {receiptFooter || 'Thank you for dining with us! Please visit again.'}
                        </div>
                      </>
                    )}

                    {/* KITCHEN KOT PREVIEW (STRICTLY NO LOGO) */}
                    {previewReceiptType === 'KOT' && (
                      <>
                        <div className="text-center border-b-2 border-slate-900 pb-2">
                          <div className="text-[10px] font-black tracking-widest text-slate-900">*** KITCHEN ORDER TICKET ***</div>
                          <div className="font-black text-lg text-slate-950 mt-0.5">ORDER #104</div>
                          <div className="inline-block bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                            DINE-IN • Table 04
                          </div>
                        </div>

                        <div className="flex justify-between text-[10px] border-b border-slate-200 pb-1">
                          <span>Time: 12:35 PM</span>
                          {kotShowServerName && <span>Server: Cashier/Mgr</span>}
                        </div>

                        <div className="space-y-2 py-1 border-b-2 border-slate-900">
                          <div className="flex items-start gap-2">
                            <span className="font-black text-xs">[ 2x ]</span>
                            <div>
                              <div className="font-bold text-xs text-slate-900">Margherita Pizza</div>
                              <div className="text-[9px] text-amber-700 font-bold">* Note: Extra crispy crust</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-black text-xs">[ 1x ]</span>
                            <div>
                              <div className="font-bold text-xs text-slate-900">Filter Coffee</div>
                              <div className="text-[9px] text-slate-500">+ Less sugar</div>
                            </div>
                          </div>
                        </div>

                        {kotNotes && (
                          <div className="p-1.5 bg-slate-100 border-l-2 border-slate-600 text-[9px] italic text-slate-700">
                            {kotNotes}
                          </div>
                        )}

                        <div className="text-center text-[10px] font-bold text-slate-900 pt-1">
                          *** END OF KOT ***
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateSectionMutation.isPending}
                  className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400 cursor-pointer"
                >
                  {updateSectionMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Save className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span>Save Printer & Receipt Design Studio Settings</span>
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

              {hasActiveOrders && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <h5 className="font-bold text-sm">Action Disabled: Active Orders Exist</h5>
                    <p className="text-xs text-rose-600 mt-1 leading-relaxed">
                      You cannot change the order workflow while there are active orders being processed. Please serve or cancel all pending, preparing, or ready orders before changing this setting to prevent state mismatches.
                    </p>
                  </div>
                </div>
              )}

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
                      disabled={hasActiveOrders}
                      onClick={() => !hasActiveOrders && setOrderWorkflowMode(mode.value)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 space-y-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 shadow-md'
                          : hasActiveOrders
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
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
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 mt-2 pt-2 border-t border-slate-100/60">
                        {mode.steps.map((step, i) => (
                          <div key={step} className="flex items-center gap-1 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${mode.colors[i]}`} />
                            <span className="text-[10px] font-bold text-slate-500">{step}</span>
                            {i < mode.steps.length - 1 && <span className="text-[10px] text-slate-300 ml-0.5">›</span>}
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
                      disabled={hasActiveOrders}
                      checked={autoAcceptEnabled}
                      onChange={(e) => !hasActiveOrders && setAutoAcceptEnabled(e.target.checked)}
                      className={`h-4 w-4 rounded text-amber-500 accent-amber-500 border-slate-300 ${hasActiveOrders ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                          disabled={hasActiveOrders}
                          onClick={() => !hasActiveOrders && setAutoAcceptDelay(sec)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                            autoAcceptDelay === sec
                              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                              : hasActiveOrders
                              ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
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
                  disabled={updateSectionMutation.isPending || hasActiveOrders}
                  className={`px-6 py-3 font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md ${
                    hasActiveOrders
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-slate-950 hover:bg-slate-800 text-white disabled:bg-slate-400'
                  }`}
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
