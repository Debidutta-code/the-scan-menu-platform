import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService, OutletSetupAuditResult } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../lib/api';
import {
  CheckCircle2,
  ShieldAlert,
  Users,
  CreditCard,
  ToggleRight,
  ArrowLeft,
  Loader,
  XCircle,
  Store,
  Save,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Printer,
  TableProperties,
  Plug,
  Plus,
  Eye,
  Key,
  LogIn,
} from 'lucide-react';

type AdminTab =
  | 'checklist'
  | 'identity'
  | 'flags'
  | 'billing'
  | 'tables'
  | 'hardware'
  | 'staff'
  | 'integrations';

export const AdminRestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { impersonateOutlet } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>('checklist');

  // Queries
  const { data: restResponse, isLoading: isLoadingRest } = useQuery({
    queryKey: ['adminRestaurantDetail', id],
    queryFn: () => adminService.getRestaurant(id!),
    enabled: !!id,
  });

  const { data: auditResponse, isLoading: isLoadingAudit } = useQuery({
    queryKey: ['adminSetupAudit', id],
    queryFn: () => adminService.getOutletSetupAudit(id!),
    enabled: !!id,
  });

  const { data: staffResponse } = useQuery({
    queryKey: ['adminStaff', id],
    queryFn: () => managerService.listStaff(id!),
    enabled: !!id,
  });

  const { data: tablesResponse } = useQuery({
    queryKey: ['adminTables', id],
    queryFn: () => managerService.listTables(id!),
    enabled: !!id,
  });

  const { data: flagsResponse } = useQuery({
    queryKey: ['adminFlags', id],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${id}/feature-flags`);
      return res.data;
    },
    enabled: !!id,
  });

  const restaurant = restResponse?.data;
  const audit: OutletSetupAuditResult | undefined = auditResponse?.data;
  const staffList = staffResponse?.data || [];
  const tablesList = tablesResponse?.data || [];
  const flagsList = flagsResponse?.data || [];

  // Form States for Direct SuperAdmin Configuration
  const [identityForm, setIdentityForm] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    gstNumber: '',
    openTime: '09:00',
    closeTime: '23:00',
    whatsapp: '',
    googleReviewUrl: '',
    logoUrl: '',
    coverImageUrl: '',
    primaryColor: '#111827',
    secondaryColor: '#FFFFFF',
    accentColor: '#F59E0B',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });

  const [billingForm, setBillingForm] = useState({
    taxRatePercent: 5,
    cash: true,
    card: true,
    upi: true,
    razorpay: false,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    gstNumber: '',
  });

  const [hardwareForm, setHardwareForm] = useState({
    paperWidth: '80mm' as '80mm' | '58mm' | 'A4',
    templateTheme: 'classic' as 'classic' | 'modern' | 'compact',
    showLogo: true,
    showGstNumber: true,
    showFssai: true,
    fssaiNumber: '',
    receiptHeader: '',
    receiptFooter: 'Thank you for dining with us!',
    showCustomerInfo: true,
    showPaymentMode: true,
    showTaxBreakup: true,
    kotNotes: '',
    defaultPrintTarget: 'BOTH' as 'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE',
  });

  const [integrationForm, setIntegrationForm] = useState({
    provider: 'NONE',
    petpoojaRestId: '',
    petpoojaAppKey: '',
    petpoojaAppSecret: '',
    urbanpiperStoreId: '',
    urbanpiperApiKey: '',
  });

  // Populate forms when restaurant data arrives
  useEffect(() => {
    if (restaurant) {
      setIdentityForm({
        name: restaurant.name || '',
        slug: restaurant.slug || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        description: restaurant.description || '',
        gstNumber: restaurant.gstNumber || '',
        openTime: restaurant.timings?.open || '09:00',
        closeTime: restaurant.timings?.close || '23:00',
        whatsapp: restaurant.whatsapp || '',
        googleReviewUrl: restaurant.googleReviewUrl || '',
        logoUrl: restaurant.logoUrl || restaurant.branding?.logoUrl || '',
        coverImageUrl: restaurant.coverImageUrl || restaurant.branding?.coverImageUrl || '',
        primaryColor: restaurant.theme?.primaryColor || '#111827',
        secondaryColor: restaurant.theme?.secondaryColor || '#FFFFFF',
        accentColor: restaurant.theme?.accentColor || '#F59E0B',
        currency: restaurant.currency || 'INR',
        timezone: restaurant.timezone || 'Asia/Kolkata',
      });

      const pm = restaurant.paymentMethods || { cash: true, card: true, upi: true, razorpay: false };
      setBillingForm({
        taxRatePercent: restaurant.taxRatePercent !== undefined ? restaurant.taxRatePercent : 5,
        cash: pm.cash ?? true,
        card: pm.card ?? true,
        upi: pm.upi ?? true,
        razorpay: pm.razorpay ?? false,
        razorpayKeyId: restaurant.razorpayConfig?.keyId || '',
        razorpayKeySecret: restaurant.razorpayConfig?.keySecret || '',
        gstNumber: restaurant.gstNumber || '',
      });

      if (restaurant.printerConfig) {
        setHardwareForm({
          paperWidth: restaurant.printerConfig.paperWidth || '80mm',
          templateTheme: restaurant.printerConfig.templateTheme || 'classic',
          showLogo: restaurant.printerConfig.showLogo ?? true,
          showGstNumber: restaurant.printerConfig.showGstNumber ?? true,
          showFssai: restaurant.printerConfig.showFssai ?? true,
          fssaiNumber: restaurant.printerConfig.fssaiNumber || '',
          receiptHeader: restaurant.printerConfig.receiptHeader || '',
          receiptFooter: restaurant.printerConfig.receiptFooter || 'Thank you for dining with us!',
          showCustomerInfo: restaurant.printerConfig.showCustomerInfo ?? true,
          showPaymentMode: restaurant.printerConfig.showPaymentMode ?? true,
          showTaxBreakup: restaurant.printerConfig.showTaxBreakup ?? true,
          kotNotes: restaurant.printerConfig.kotNotes || '',
          defaultPrintTarget: restaurant.printerConfig.defaultPrintTarget || 'BOTH',
        });
      }

      if (restaurant.integrationConfig) {
        const ic = restaurant.integrationConfig;
        setIntegrationForm({
          provider: ic.provider || 'NONE',
          petpoojaRestId: ic.config?.restID || '',
          petpoojaAppKey: ic.config?.appKey || '',
          petpoojaAppSecret: ic.config?.appSecret || '',
          urbanpiperStoreId: ic.config?.storeId || '',
          urbanpiperApiKey: ic.config?.apiKey || '',
        });
      }
    }
  }, [restaurant]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => adminService.updateOutletSettings(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Outlet settings updated and audit recalculated successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating outlet settings', 'error');
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async (updatedFlags: any[]) => {
      const res = await apiClient.patch(`/restaurants/${id}/feature-flags`, { flags: updatedFlags });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFlags', id] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      toast('Feature flags updated for outlet!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating feature flags', 'error');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: adminService.suspendRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Restaurant suspended immediately.', 'info');
    },
  });

  const activateMutation = useMutation({
    mutationFn: adminService.activateRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      toast('Restaurant activated.', 'success');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (planKey: string) => {
      const res = await apiClient.patch(`/restaurants/${id}/subscription`, { planKey });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminFlags', id] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', id] });
      toast('Subscription plan updated and feature flags synced!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating subscription plan', 'error');
    },
  });

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      name: identityForm.name,
      slug: identityForm.slug,
      phone: identityForm.phone,
      email: identityForm.email,
      address: identityForm.address,
      description: identityForm.description,
      gstNumber: identityForm.gstNumber,
      logoUrl: identityForm.logoUrl,
      coverImageUrl: identityForm.coverImageUrl,
      currency: identityForm.currency,
      timezone: identityForm.timezone,
      timings: { open: identityForm.openTime, close: identityForm.closeTime },
      googleReviewUrl: identityForm.googleReviewUrl,
      whatsapp: identityForm.whatsapp,
      theme: {
        primaryColor: identityForm.primaryColor,
        secondaryColor: identityForm.secondaryColor,
        accentColor: identityForm.accentColor,
        fontFamily: 'Plus Jakarta Sans',
      },
    });
  };

  const handleSaveBilling = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      taxRatePercent: billingForm.taxRatePercent,
      gstNumber: billingForm.gstNumber,
      paymentMethods: {
        cash: billingForm.cash,
        card: billingForm.card,
        upi: billingForm.upi,
        razorpay: billingForm.razorpay,
      },
      razorpayConfig: {
        keyId: billingForm.razorpayKeyId,
        keySecret: billingForm.razorpayKeySecret,
      },
    });
  };

  const handleSaveHardware = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      printerConfig: {
        paperWidth: hardwareForm.paperWidth,
        templateTheme: hardwareForm.templateTheme,
        showLogo: hardwareForm.showLogo,
        showGstNumber: hardwareForm.showGstNumber,
        showFssai: hardwareForm.showFssai,
        fssaiNumber: hardwareForm.fssaiNumber,
        receiptHeader: hardwareForm.receiptHeader,
        receiptFooter: hardwareForm.receiptFooter,
        showCustomerInfo: hardwareForm.showCustomerInfo,
        showPaymentMode: hardwareForm.showPaymentMode,
        showTaxBreakup: hardwareForm.showTaxBreakup,
        kotNotes: hardwareForm.kotNotes,
        defaultPrintTarget: hardwareForm.defaultPrintTarget,
      },
    });
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    let configData: any = {};
    if (integrationForm.provider === 'PETPOOJA') {
      configData = {
        restID: integrationForm.petpoojaRestId,
        appKey: integrationForm.petpoojaAppKey,
        appSecret: integrationForm.petpoojaAppSecret,
      };
    } else if (integrationForm.provider === 'URBANPIPER') {
      configData = {
        storeId: integrationForm.urbanpiperStoreId,
        apiKey: integrationForm.urbanpiperApiKey,
      };
    }

    updateSettingsMutation.mutate({
      integrationConfig: {
        provider: integrationForm.provider,
        config: configData,
      },
    });
  };

  const handleFlagToggle = (key: string, enabled: boolean) => {
    const updated = flagsList.map((f: any) => (f.key === key ? { ...f, enabled } : f));
    toggleFlagMutation.mutate(updated);
  };

  if (isLoadingRest || isLoadingAudit) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-150 shadow-sm">
        <p className="text-slate-600 font-bold">Restaurant not found.</p>
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Back to Tenants Directory
        </button>
      </div>
    );
  }

  const isSuspended = restaurant.status === 'SUSPENDED';
  const progress = audit?.overallPercentage ?? 0;
  const missingCount = audit?.missingFeatureSetups?.length ?? 0;

  return (
    <div className="w-full space-y-6 font-sans pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to Tenants Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Direct Public Preview */}
          <a
            href={`/r/${restaurant.slug}/menu`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-sm transition"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Public Menu</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Impersonate */}
          <button
            onClick={() => impersonateOutlet({ id: restaurant._id, name: restaurant.name, slug: restaurant.slug })}
            className="px-3.5 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-600" />
            <span>Launch Manager View</span>
          </button>

          {/* Suspend / Activate */}
          {isSuspended ? (
            <button
              onClick={() => activateMutation.mutate(id!)}
              disabled={activateMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activate Outlet</span>
            </button>
          ) : (
            <button
              onClick={() => suspendMutation.mutate(id!)}
              disabled={suspendMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspend Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* Outlet Header Card with Real-time Progress Ring */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-xl shrink-0 shadow-md">
              {restaurant.name?.charAt(0) || 'R'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                  {restaurant.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isSuspended
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isSuspended ? 'Suspended' : restaurant.status || 'Active'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {restaurant.subscription?.planKey || 'ENTERPRISE'}
                </span>
              </div>

              <p className="text-xs text-slate-400 flex flex-wrap items-center gap-3 font-mono">
                <span>Code: {restaurant.code || 'RST-000'}</span>
                <span>•</span>
                <span>Slug: /r/{restaurant.slug}</span>
                <span>•</span>
                <span>{restaurant.address || 'Address not specified'}</span>
              </p>
            </div>
          </div>

          {/* Setup Progress Widget */}
          <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shrink-0">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={progress >= 80 ? 'text-emerald-400' : progress >= 50 ? 'text-amber-400' : 'text-rose-400'}
                  strokeDasharray={`${progress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-display font-extrabold text-xs text-white">
                {progress}%
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Outlet Setup Status</span>
                {audit?.isReadyForService ? (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Ready
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Incomplete
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {audit?.completedSteps} of {audit?.totalSteps} core steps configured
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Missing Requirements Warning Banner */}
      {missingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Setup Action Required for {missingCount} Active Feature{missingCount > 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audit?.missingFeatureSetups.map((item) => (
              <div
                key={item.featureKey}
                className="bg-white border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.featureName}</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                    {item.missingRequirements.join(' • ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.actionTab as AdminTab)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] rounded-xl transition shrink-0 flex items-center gap-1 shadow-xs"
                >
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'checklist', label: 'Setup Audit & Checklist', icon: CheckCircle2 },
          { id: 'identity', label: 'Store Identity & Branding', icon: Store },
          { id: 'flags', label: 'Feature Flags & Matrix', icon: ToggleRight },
          { id: 'billing', label: 'Taxes & Payments Gateways', icon: CreditCard },
          { id: 'tables', label: 'Dining Tables & QR Codes', icon: TableProperties },
          { id: 'hardware', label: 'Hardware & POS Printers', icon: Printer },
          { id: 'staff', label: 'Staff Accounts', icon: Users },
          { id: 'integrations', label: 'External POS Integrations', icon: Plug },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SETUP CHECKLIST & AUDIT */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Comprehensive Setup Audit Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time database verification across all restaurant domains.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Plan:</span>
                <select
                  value={restaurant.subscription?.planKey || 'ENTERPRISE'}
                  onChange={(e) => updatePlanMutation.mutate(e.target.value)}
                  disabled={updatePlanMutation.isPending}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PROFESSIONAL">PROFESSIONAL</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              {audit?.steps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    step.isCompleted
                      ? 'bg-slate-50/60 border-slate-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      {step.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700">
                          Weight: {step.weight}%
                        </span>
                        {step.isRequired && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>

                  {step.actionTab && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(step.actionTab as AdminTab)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span>{step.actionLabel || 'Configure'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STORE IDENTITY & PROFILE */}
      {activeTab === 'identity' && (
        <form onSubmit={handleSaveIdentity} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Store Profile & Identity Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Core legal, contact, and visual branding managed exclusively by SuperAdmin.
              </p>
            </div>
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
            >
              {updateSettingsMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Store Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Restaurant Name *</label>
              <input
                type="text"
                value={identityForm.name}
                onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slug (URL Identifier) *</label>
              <input
                type="text"
                value={identityForm.slug}
                onChange={(e) => setIdentityForm({ ...identityForm, slug: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={identityForm.phone}
                onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={identityForm.email}
                onChange={(e) => setIdentityForm({ ...identityForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Time</label>
              <input
                type="time"
                value={identityForm.openTime}
                onChange={(e) => setIdentityForm({ ...identityForm, openTime: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Time</label>
              <input
                type="time"
                value={identityForm.closeTime}
                onChange={(e) => setIdentityForm({ ...identityForm, closeTime: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency (ISO)</label>
              <input
                type="text"
                value={identityForm.currency}
                onChange={(e) => setIdentityForm({ ...identityForm, currency: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                value={identityForm.timezone}
                onChange={(e) => setIdentityForm({ ...identityForm, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
              <textarea
                rows={2}
                value={identityForm.address}
                onChange={(e) => setIdentityForm({ ...identityForm, address: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Image URL</label>
              <input
                type="text"
                value={identityForm.logoUrl}
                onChange={(e) => setIdentityForm({ ...identityForm, logoUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Banner URL</label>
              <input
                type="text"
                value={identityForm.coverImageUrl}
                onChange={(e) => setIdentityForm({ ...identityForm, coverImageUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Google Review URL</label>
              <input
                type="text"
                value={identityForm.googleReviewUrl}
                onChange={(e) => setIdentityForm({ ...identityForm, googleReviewUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                placeholder="https://g.page/r/..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Business Number</label>
              <input
                type="text"
                value={identityForm.whatsapp}
                onChange={(e) => setIdentityForm({ ...identityForm, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                placeholder="+91..."
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: FEATURE FLAGS & MATRIX */}
      {activeTab === 'flags' && (
        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Outlet Capabilities & Feature Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enabling modules here will trigger setup dependency tracking in the audit engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flagsList.map((flag: any) => {
              const readiness = audit?.featureReadiness?.[flag.key];
              const isEnabled = flag.enabled;
              const isReady = readiness ? readiness.isReady : true;

              return (
                <div
                  key={flag.key}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isEnabled
                      ? isReady
                        ? 'bg-slate-50/80 border-slate-300'
                        : 'bg-amber-50/50 border-amber-300'
                      : 'bg-white border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{flag.name}</span>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleFlagToggle(flag.key, e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{flag.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400">{flag.key}</span>
                    {isEnabled && (
                      <span
                        className={`font-extrabold px-2 py-0.5 rounded-full ${
                          isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {isReady ? 'Ready' : 'Setup Required'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: BILLING, TAXES & GATEWAYS */}
      {activeTab === 'billing' && (
        <form onSubmit={handleSaveBilling} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Taxes & Payment Gateways
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure settlement modes, GST numbers, and payment gateway credentials.
              </p>
            </div>
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
            >
              {updateSettingsMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Billing Settings</span>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={billingForm.taxRatePercent}
                  onChange={(e) => setBillingForm({ ...billingForm, taxRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={billingForm.gstNumber}
                  onChange={(e) => setBillingForm({ ...billingForm, gstNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-3">Accepted Settlement Modes</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'cash', label: 'Cash at Counter' },
                  { key: 'card', label: 'Credit / Debit Card' },
                  { key: 'upi', label: 'Direct UPI QR' },
                  { key: 'razorpay', label: 'Razorpay Online Gateway' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(billingForm as any)[item.key]}
                      onChange={(e) => setBillingForm({ ...billingForm, [item.key]: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Razorpay Gateway Keys */}
            {billingForm.razorpay && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-500" />
                  <span>Razorpay API Credentials (SuperAdmin Managed)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Razorpay Key ID</label>
                    <input
                      type="text"
                      value={billingForm.razorpayKeyId}
                      onChange={(e) => setBillingForm({ ...billingForm, razorpayKeyId: e.target.value })}
                      placeholder="rzp_live_..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Razorpay Key Secret</label>
                    <input
                      type="password"
                      value={billingForm.razorpayKeySecret}
                      onChange={(e) => setBillingForm({ ...billingForm, razorpayKeySecret: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB 5: DINING TABLES */}
      {activeTab === 'tables' && (
        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Dining Tables & QR Tokens ({tablesList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Physical tables mapped to secure token URLs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => impersonateOutlet({ id: restaurant._id, name: restaurant.name, slug: restaurant.slug })}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Manage Tables in Outlet View</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tablesList.map((table: any) => (
              <div
                key={table._id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{table.displayName || `Table ${table.tableNumber}`}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      table.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">#{table.tableNumber}</span>
                  <a
                    href={`/r/${restaurant.slug}/t/${table.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-0.5"
                  >
                    <span>Scan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: HARDWARE & PRINTERS */}
      {activeTab === 'hardware' && (
        <form onSubmit={handleSaveHardware} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Hardware & POS Thermal Printers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receipt width standards, receipt header/footer, and billing print layout.
              </p>
            </div>
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
            >
              {updateSettingsMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Hardware Config</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paper Width</label>
              <select
                value={hardwareForm.paperWidth}
                onChange={(e) => setHardwareForm({ ...hardwareForm, paperWidth: e.target.value as any })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="80mm">80mm (Standard POS Thermal)</option>
                <option value="58mm">58mm (Compact Portable Thermal)</option>
                <option value="A4">A4 (Full Sheet Invoicing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Template Theme</label>
              <select
                value={hardwareForm.templateTheme}
                onChange={(e) => setHardwareForm({ ...hardwareForm, templateTheme: e.target.value as any })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="classic">Classic Clean</option>
                <option value="modern">Modern Bordered</option>
                <option value="compact">Compact Minimalist</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Header Text</label>
              <input
                type="text"
                value={hardwareForm.receiptHeader}
                onChange={(e) => setHardwareForm({ ...hardwareForm, receiptHeader: e.target.value })}
                placeholder="Welcome to our restaurant!"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Text</label>
              <input
                type="text"
                value={hardwareForm.receiptFooter}
                onChange={(e) => setHardwareForm({ ...hardwareForm, receiptFooter: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 7: STAFF ACCOUNTS */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Staff & Manager Accounts ({staffList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff users associated with this restaurant tenant.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {staffList.map((user: any) => (
              <div
                key={user._id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-full uppercase">
                  {user.role || 'STAFF'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <form onSubmit={handleSaveIntegrations} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                External POS Provider Integration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bi-directional sync bridge with Petpooja or UrbanPiper.
              </p>
            </div>
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400"
            >
              {updateSettingsMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Integrations</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">POS Provider</label>
              <select
                value={integrationForm.provider}
                onChange={(e) => setIntegrationForm({ ...integrationForm, provider: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
              >
                <option value="NONE">None (Standalone The Scan Menu Platform)</option>
                <option value="PETPOOJA">Petpooja POS</option>
                <option value="URBANPIPER">UrbanPiper Hub</option>
              </select>
            </div>

            {integrationForm.provider === 'PETPOOJA' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Petpooja Rest ID</label>
                  <input
                    type="text"
                    value={integrationForm.petpoojaRestId}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaRestId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">App Key</label>
                  <input
                    type="text"
                    value={integrationForm.petpoojaAppKey}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppKey: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">App Secret</label>
                  <input
                    type="password"
                    value={integrationForm.petpoojaAppSecret}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppSecret: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminRestaurantDetail;
