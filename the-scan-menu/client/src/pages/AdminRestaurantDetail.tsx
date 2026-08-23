import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService, OutletSetupAuditResult, Table, Category, MenuItem, Tax, TableZone } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../lib/api';
import {
  CheckCircle2,
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
  LogIn,
  Utensils,
  Sparkles,
  Layers,
  Trash2,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RotateCw,
  Receipt,
} from 'lucide-react';

type AdminTab =
  | 'checklist'
  | 'identity'
  | 'flags'
  | 'billing'
  | 'tables'
  | 'menu'
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const { data: zonesResponse } = useQuery({
    queryKey: ['adminZones', id],
    queryFn: () => managerService.listZones(id!),
    enabled: !!id,
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['adminCategories', id],
    queryFn: () => managerService.listCategories(id!),
    enabled: !!id,
  });

  const { data: menuItemsResponse } = useQuery({
    queryKey: ['adminMenuItems', id],
    queryFn: () => managerService.listMenuItems(id!),
    enabled: !!id,
  });

  const { data: taxesResponse } = useQuery({
    queryKey: ['adminTaxes', id],
    queryFn: () => managerService.listTaxes(id!),
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
  const staffList = useMemo(() => staffResponse?.data || [], [staffResponse?.data]);
  const tablesList: Table[] = useMemo(() => tablesResponse?.data || [], [tablesResponse?.data]);
  const zonesList: TableZone[] = useMemo(() => zonesResponse?.data || [], [zonesResponse?.data]);
  const categoriesList: Category[] = useMemo(() => categoriesResponse?.data || [], [categoriesResponse?.data]);
  const menuItemsList: MenuItem[] = useMemo(() => menuItemsResponse?.data || [], [menuItemsResponse?.data]);
  const taxesList: Tax[] = useMemo(() => taxesResponse?.data || [], [taxesResponse?.data]);
  const flagsList = useMemo(() => flagsResponse?.data || [], [flagsResponse?.data]);

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
    upiId: '',
    upiMerchantName: '',
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

  // Modals state
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showBulkTableModal, setShowBulkTableModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<any>(null);

  // Field states for Modals
  const [singleTableData, setSingleTableData] = useState({ tableNumber: '', displayName: '', zoneId: '' });
  const [bulkTableData, setBulkTableData] = useState({ count: 10, prefix: 'T', zoneId: '' });
  const [zoneData, setZoneData] = useState({ name: '' });
  const [categoryData, setCategoryData] = useState({ name: '', description: '', sortOrder: 0 });
  const [dishData, setDishData] = useState({
    name: '',
    categoryId: '',
    price: 0,
    isVegetarian: true,
    isSpicy: false,
    isChefsSpecial: false,
    description: '',
    imageUrl: '',
  });
  const [taxData, setTaxData] = useState({
    type: 'TAX' as 'TAX' | 'GROUP',
    name: '',
    percentage: 5,
    groupId: '',
  });
  const [staffData, setStaffData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER' as 'MANAGER' | 'WAITER' | 'KITCHEN',
    pin: '',
  });
  const [newPassword, setNewPassword] = useState('');

  // Selected Category filter in Menu tab
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('ALL');

  // Populate forms when restaurant data arrives
  useEffect(() => {
    if (restaurant) {
      const s = restaurant.settings;
      setIdentityForm({
        name: restaurant.name || '',
        slug: restaurant.slug || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        address: restaurant.address || '',
        description: restaurant.description || '',
        gstNumber: s?.paymentConfig?.gstNumber || '',
        openTime: s?.timings?.openTime || '09:00',
        closeTime: s?.timings?.closeTime || '23:00',
        whatsapp: s?.branding?.whatsapp || '',
        googleReviewUrl: s?.branding?.googleReviewUrl || '',
        logoUrl: restaurant.logoUrl || s?.branding?.logoUrl || '',
        coverImageUrl: restaurant.coverImageUrl || s?.branding?.coverImageUrl || '',
        primaryColor: s?.branding?.primaryColor || '#111827',
        secondaryColor: s?.branding?.secondaryColor || '#FFFFFF',
        accentColor: s?.branding?.accentColor || '#F59E0B',
        currency: s?.currency || 'INR',
        timezone: s?.timezone || 'Asia/Kolkata',
      });

      setBillingForm({
        taxRatePercent: s?.paymentConfig?.taxRatePercent ?? 5,
        cash: s?.paymentConfig?.paymentMethods?.cash ?? true,
        card: s?.paymentConfig?.paymentMethods?.card ?? true,
        upi: s?.paymentConfig?.paymentMethods?.upi ?? true,
        razorpay: s?.paymentConfig?.paymentMethods?.razorpay ?? false,
        razorpayKeyId: s?.paymentConfig?.razorpayConfig?.keyId || '',
        razorpayKeySecret: s?.paymentConfig?.razorpayConfig?.keySecret || '',
        upiId: s?.paymentConfig?.upiConfig?.upiId || '',
        upiMerchantName: s?.paymentConfig?.upiConfig?.merchantName || '',
        gstNumber: s?.paymentConfig?.gstNumber || '',
      });

      if (s?.printerConfig) {
        setHardwareForm({
          paperWidth: s.printerConfig.paperWidth || '80mm',
          templateTheme: s.printerConfig.templateTheme || 'classic',
          showLogo: s.printerConfig.showLogo ?? true,
          showGstNumber: s.printerConfig.showGstNumber ?? true,
          showFssai: s.printerConfig.showFssai ?? true,
          fssaiNumber: s.printerConfig.fssaiNumber || '',
          receiptHeader: s.printerConfig.receiptHeader || '',
          receiptFooter: s.printerConfig.receiptFooter || 'Thank you for dining with us!',
          showCustomerInfo: s.printerConfig.showCustomerInfo ?? true,
          showPaymentMode: s.printerConfig.showPaymentMode ?? true,
          showTaxBreakup: s.printerConfig.showTaxBreakup ?? true,
          kotNotes: s.printerConfig.kotNotes || '',
          defaultPrintTarget: s.printerConfig.defaultPrintTarget || 'BOTH',
        });
      }

      if (s?.posIntegration) {
        setIntegrationForm({
          provider: s.posIntegration.provider || 'NONE',
          petpoojaRestId: s.posIntegration.petpooja?.restId || '',
          petpoojaAppKey: s.posIntegration.petpooja?.appKey || '',
          petpoojaAppSecret: s.posIntegration.petpooja?.appSecret || '',
          urbanpiperStoreId: s.posIntegration.urbanpiper?.storeId || '',
          urbanpiperApiKey: s.posIntegration.urbanpiper?.apiKey || '',
        });
      }
    }
  }, [restaurant]);

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', id] });
    queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', id] });
    queryClient.invalidateQueries({ queryKey: ['adminTables', id] });
    queryClient.invalidateQueries({ queryKey: ['adminZones', id] });
    queryClient.invalidateQueries({ queryKey: ['adminCategories', id] });
    queryClient.invalidateQueries({ queryKey: ['adminMenuItems', id] });
    queryClient.invalidateQueries({ queryKey: ['adminTaxes', id] });
    queryClient.invalidateQueries({ queryKey: ['adminStaff', id] });
    queryClient.invalidateQueries({ queryKey: ['adminFlags', id] });
  };

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: any) => adminService.updateOutletSettings(id!, payload),
    onSuccess: (res: any) => {
      invalidateAll();
      toast(res.message || 'Configuration saved successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to save settings', 'error');
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ flagKey, isEnabled }: { flagKey: string; isEnabled: boolean }) => {
      const res = await apiClient.patch(`/restaurants/${id}/feature-flags`, {
        flagKey,
        isEnabled,
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateAll();
      toast('Feature flag updated', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to toggle feature flag', 'error');
    },
  });

  const seedDemoMenuMutation = useMutation({
    mutationFn: () => adminService.seedDemoMenu(id!),
    onSuccess: () => {
      invalidateAll();
      toast('Starter Demo Menu (5 Categories, 12 Dishes) seeded successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to seed menu', 'error');
    },
  });

  const applyTaxPresetMutation = useMutation({
    mutationFn: (preset: 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE') => adminService.applyTaxPreset(id!, preset),
    onSuccess: () => {
      invalidateAll();
      toast('Tax preset applied successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to apply tax preset', 'error');
    },
  });

  // Table actions
  const createTableMutation = useMutation({
    mutationFn: (data: any) => managerService.createTable(id!, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddTableModal(false);
      setSingleTableData({ tableNumber: '', displayName: '', zoneId: '' });
      toast('Table created successfully', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to create table', 'error'),
  });

  const bulkCreateTablesMutation = useMutation({
    mutationFn: (data: any) => managerService.bulkCreateTables(id!, data),
    onSuccess: () => {
      invalidateAll();
      setShowBulkTableModal(false);
      toast('Tables generated successfully', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to bulk generate tables', 'error'),
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) => managerService.deleteTable(id!, tableId),
    onSuccess: () => {
      invalidateAll();
      toast('Table deleted', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to delete table', 'error'),
  });

  const regenerateTableQrMutation = useMutation({
    mutationFn: (tableId: string) => managerService.regenerateTableQr(id!, tableId),
    onSuccess: () => {
      invalidateAll();
      toast('QR token regenerated', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to regenerate token', 'error'),
  });

  // Zone actions
  const createZoneMutation = useMutation({
    mutationFn: (data: any) => managerService.createZone(id!, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddZoneModal(false);
      setZoneData({ name: '' });
      toast('Floor Zone added', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to create zone', 'error'),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => managerService.deleteZone(id!, zoneId),
    onSuccess: () => {
      invalidateAll();
      toast('Zone deleted', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to delete zone', 'error'),
  });

  // Category & Dish actions
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/restaurants/${id}/categories`, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddCategoryModal(false);
      setCategoryData({ name: '', description: '', sortOrder: 0 });
      toast('Menu category created', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to create category', 'error'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (catId: string) => apiClient.delete(`/restaurants/${id}/categories/${catId}`),
    onSuccess: () => {
      invalidateAll();
      toast('Category removed', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to delete category', 'error'),
  });

  const createDishMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(`/restaurants/${id}/menu-items`, { ...data, price: Math.round(data.price * 100) }),
    onSuccess: () => {
      invalidateAll();
      setShowAddDishModal(false);
      setDishData({
        name: '',
        categoryId: '',
        price: 0,
        isVegetarian: true,
        isSpicy: false,
        isChefsSpecial: false,
        description: '',
        imageUrl: '',
      });
      toast('Dish added to menu', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to create dish', 'error'),
  });

  const deleteDishMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.delete(`/restaurants/${id}/menu-items/${itemId}`),
    onSuccess: () => {
      invalidateAll();
      toast('Dish removed', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to delete dish', 'error'),
  });

  // Tax actions
  const createTaxMutation = useMutation({
    mutationFn: (data: any) => managerService.createTax(id!, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddTaxModal(false);
      setTaxData({ type: 'TAX', name: '', percentage: 5, groupId: '' });
      toast('Tax rule created', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to create tax rule', 'error'),
  });

  const deleteTaxMutation = useMutation({
    mutationFn: (taxId: string) => managerService.deleteTax(id!, taxId),
    onSuccess: () => {
      invalidateAll();
      toast('Tax rule deleted', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to delete tax', 'error'),
  });

  // Staff actions
  const createStaffMutation = useMutation({
    mutationFn: (data: any) => managerService.createStaff(id!, data),
    onSuccess: () => {
      invalidateAll();
      setShowAddStaffModal(false);
      setStaffData({ name: '', email: '', password: '', role: 'MANAGER', pin: '' });
      toast('Staff member account created', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to add staff', 'error'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: any) => apiClient.patch(`/admin/restaurants/${id}/staff/${userId}/password`, { password }),
    onSuccess: () => {
      setShowResetPasswordModal(null);
      setNewPassword('');
      toast('Staff credentials updated', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to reset password', 'error'),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: string) => managerService.deleteStaff(id!, staffId),
    onSuccess: () => {
      invalidateAll();
      toast('Staff member removed', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to remove staff', 'error'),
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast('Copied to clipboard', 'info');
  };

  const handleTestPrint = () => {
    window.print();
  };

  // Filtered dishes for Menu tab
  const filteredDishes = useMemo(() => {
    if (selectedMenuCategory === 'ALL') return menuItemsList;
    return menuItemsList.filter((item: any) => item.categoryId === selectedMenuCategory || item.categoryId?._id === selectedMenuCategory);
  }, [menuItemsList, selectedMenuCategory]);

  if (isLoadingRest || isLoadingAudit) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-150">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-slate-900">Restaurant Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested outlet does not exist or has been removed.</p>
        <button
          onClick={() => navigate('/admin/setup-hub')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Setup Hub
        </button>
      </div>
    );
  }

  const progress = audit?.overallPercentage ?? 0;
  const isReady = audit?.isReadyForService ?? false;

  return (
    <div className="w-full space-y-6 font-sans pb-24">
      {/* TOP BREADCRUMB & MASTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/setup-hub')}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-2xl transition text-slate-400 hover:text-white"
            title="Back to Setup Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-2xl shadow-sm shrink-0">
            {restaurant.name?.charAt(0) || 'R'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                {restaurant.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                {restaurant.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Slug: <span className="text-amber-400">/r/{restaurant.slug}</span> • Code: {restaurant.code || 'RST-MAIN'}
            </p>
          </div>
        </div>

        {/* Action Controls & Progress Ring */}
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={progress >= 80 ? 'text-emerald-400' : progress >= 50 ? 'text-amber-400' : 'text-rose-400'}
                  strokeDasharray={`${progress}, 100`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-black">{progress}%</span>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase font-bold text-slate-400">Setup Status</p>
              <p className="text-xs font-bold text-white">{isReady ? 'Ready for Service' : 'Incomplete'}</p>
            </div>
          </div>

          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-800"
          >
            <Eye className="w-4 h-4 text-amber-400" />
            <span>Customer Menu</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={() => impersonateOutlet({ id: restaurant._id, name: restaurant.name, slug: restaurant.slug })}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm"
          >
            <LogIn className="w-4 h-4 text-slate-950" />
            <span>Launch Manager View</span>
          </button>
        </div>
      </div>

      {/* MISSING PREREQUISITES BANNER */}
      {audit && audit.missingFeatureSetups && audit.missingFeatureSetups.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Setup Action Required for {audit.missingFeatureSetups.length} Active Features:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audit.missingFeatureSetups.map((mf, idx) => (
              <div
                key={idx}
                className="bg-white/80 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">{mf.featureName}</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">{mf.missingRequirements.join(' • ')}</p>
                </div>
                <button
                  onClick={() => setActiveTab(mf.actionTab as any)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shrink-0 flex items-center gap-1"
                >
                  <span>{mf.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-COLUMN HUB STUDIO LAYOUT: INTERNAL SUB-SIDEBAR + MAIN CANVAS */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SUB-SIDEBAR */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white border border-slate-150 rounded-3xl p-3.5 shadow-sm space-y-4 sticky top-4">
            {/* Nav Groups */}
            <div className="space-y-3.5 text-xs">
              {/* Group 1: Overview */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Overview & Audit
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('checklist')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'checklist'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 ${activeTab === 'checklist' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Setup Checklist</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'checklist' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {audit?.completedSteps || 0}/{audit?.totalSteps || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 2: Core Store */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Core Configuration
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('identity')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'identity'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className={`w-4 h-4 ${activeTab === 'identity' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Store Identity & Branding</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('flags')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'flags'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ToggleRight className={`w-4 h-4 ${activeTab === 'flags' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Feature Flags</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'flags' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {flagsList.filter((f: any) => f.isEnabled).length} active
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 3: Operations & Menu */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Menu & Floor Layout
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'menu'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Utensils className={`w-4 h-4 ${activeTab === 'menu' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Digital Menu & Catalog</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'menu' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {menuItemsList.length} items
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('tables')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'tables'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TableProperties className={`w-4 h-4 ${activeTab === 'tables' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Dining Tables & Zones</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'tables' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tablesList.length} tables
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 4: Finance & Hardware */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Billing & POS Hardware
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('billing')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'billing'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className={`w-4 h-4 ${activeTab === 'billing' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Taxes & Payments</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('hardware')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'hardware'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Printer className={`w-4 h-4 ${activeTab === 'hardware' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Hardware & POS Printers</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Group 5: Team & Integrations */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Staff & Integrations
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('staff')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'staff'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 ${activeTab === 'staff' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Staff Accounts</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'staff' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {staffList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('integrations')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'integrations'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Plug className={`w-4 h-4 ${activeTab === 'integrations' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>POS Integrations</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Footer Mini Status */}
            <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-500 font-mono uppercase">Readiness</span>
                <span className={isReady ? 'text-emerald-600' : 'text-amber-600'}>
                  {isReady ? 'Ready for Service' : `${progress}% Complete`}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full rounded-full ${
                    progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT CANVAS */}
        <div className="flex-1 min-w-0 w-full">

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SETUP AUDIT & CHECKLIST
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick 1-Click Starters */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase bg-slate-950 text-amber-400 px-2 py-0.5 rounded-md">
                  Fast Onboarding
                </span>
                <h3 className="font-display text-xl font-black mt-2">1-Click Starter Pack</h3>
                <p className="text-xs text-slate-900/80 mt-1 font-medium">
                  Populate a ready-to-test starter menu (5 categories + 12 dishes) and default GST tax group.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => seedDemoMenuMutation.mutate()}
                  disabled={seedDemoMenuMutation.isPending || menuItemsList.length > 0}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {seedDemoMenuMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                  <span>{menuItemsList.length > 0 ? '✓ Menu Catalog Seeded' : 'Seed Starter Menu (12 Dishes)'}</span>
                </button>

                <button
                  onClick={() => applyTaxPresetMutation.mutate('GST_5')}
                  disabled={applyTaxPresetMutation.isPending}
                  className="w-full py-2 bg-white/90 hover:bg-white text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Apply GST 5% (CGST 2.5% + SGST 2.5%)</span>
                </button>
              </div>
            </div>

            {/* Overall Setup Card */}
            <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Setup Score</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black font-mono text-slate-900">{progress}%</h3>
                  <span className="text-xs text-slate-400">completed</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${
                      progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{audit?.completedSteps || 0} of {audit?.totalSteps || 0} Prerequisites Complete</span>
                <span className={`font-bold ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isReady ? '✓ Ready for Service' : '⚠️ Action Needed'}
                </span>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Live Inventory Counts</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Tables</span>
                  <p className="text-lg font-black text-slate-900">{tablesList.length}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Dishes</span>
                  <p className="text-lg font-black text-slate-900">{menuItemsList.length}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Categories</span>
                  <p className="text-lg font-black text-slate-900">{categoriesList.length}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Staff</span>
                  <p className="text-lg font-black text-slate-900">{staffList.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Step Breakdown */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold text-slate-900 mb-4">
              Prerequisite Audit & Verification Checklist
            </h3>

            <div className="divide-y divide-slate-100">
              {audit?.steps.map((step) => (
                <div key={step.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {step.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{step.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                          Weight: {step.weight}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>

                  {step.actionTab && (
                    <button
                      onClick={() => setActiveTab(step.actionTab as any)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition shrink-0 flex items-center gap-1"
                    >
                      <span>{step.actionLabel || 'Configure'}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: STORE IDENTITY & LIVE BRANDING PREVIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Store Profile & Branding</h3>
                <p className="text-xs text-slate-500 mt-0.5">Primary store profile, timings, and custom theme colors.</p>
              </div>

              <button
                onClick={() =>
                  saveSettingsMutation.mutate({
                    name: identityForm.name,
                    slug: identityForm.slug,
                    phone: identityForm.phone,
                    email: identityForm.email,
                    address: identityForm.address,
                    description: identityForm.description,
                    gstNumber: identityForm.gstNumber,
                    timings: { openTime: identityForm.openTime, closeTime: identityForm.closeTime },
                    whatsapp: identityForm.whatsapp,
                    googleReviewUrl: identityForm.googleReviewUrl,
                    logoUrl: identityForm.logoUrl,
                    coverImageUrl: identityForm.coverImageUrl,
                    branding: {
                      primaryColor: identityForm.primaryColor,
                      secondaryColor: identityForm.secondaryColor,
                      accentColor: identityForm.accentColor,
                    },
                    currency: identityForm.currency,
                    timezone: identityForm.timezone,
                  })
                }
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Outlet Name *</label>
                <input
                  type="text"
                  value={identityForm.name}
                  onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Unique URL Slug *</label>
                <div className="flex items-center mt-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden px-3 py-2 text-xs">
                  <span className="text-slate-400 font-mono">/r/</span>
                  <input
                    type="text"
                    value={identityForm.slug}
                    onChange={(e) => setIdentityForm({ ...identityForm, slug: e.target.value })}
                    className="w-full bg-transparent font-mono font-bold focus:outline-none ml-1 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Store Contact Phone *</label>
                <input
                  type="text"
                  value={identityForm.phone}
                  onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Store Contact Email *</label>
                <input
                  type="email"
                  value={identityForm.email}
                  onChange={(e) => setIdentityForm({ ...identityForm, email: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700">Physical Address *</label>
                <input
                  type="text"
                  value={identityForm.address}
                  onChange={(e) => setIdentityForm({ ...identityForm, address: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Opening Time</label>
                <input
                  type="time"
                  value={identityForm.openTime}
                  onChange={(e) => setIdentityForm({ ...identityForm, openTime: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Closing Time</label>
                <input
                  type="time"
                  value={identityForm.closeTime}
                  onChange={(e) => setIdentityForm({ ...identityForm, closeTime: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Logo Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={identityForm.logoUrl}
                  onChange={(e) => setIdentityForm({ ...identityForm, logoUrl: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Cover Banner Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/cover.jpg"
                  value={identityForm.coverImageUrl}
                  onChange={(e) => setIdentityForm({ ...identityForm, coverImageUrl: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Theme Colors */}
              <div>
                <label className="text-[11px] font-bold text-slate-700">Primary Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={identityForm.primaryColor}
                    onChange={(e) => setIdentityForm({ ...identityForm, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={identityForm.primaryColor}
                    onChange={(e) => setIdentityForm({ ...identityForm, primaryColor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Accent Highlight Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={identityForm.accentColor}
                    onChange={(e) => setIdentityForm({ ...identityForm, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={identityForm.accentColor}
                    onChange={(e) => setIdentityForm({ ...identityForm, accentColor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Mobile Customer Menu Preview */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              <span>Customer Mobile Preview</span>
            </span>

            {/* Phone Screen Frame */}
            <div className="w-64 bg-slate-950 rounded-[36px] p-3 shadow-xl border-4 border-slate-800 flex flex-col items-center">
              <div className="w-16 h-4 bg-slate-900 rounded-full mb-2" />

              <div className="w-full bg-white rounded-[24px] overflow-hidden flex flex-col h-[400px]">
                {/* Header Banner */}
                <div
                  className="h-20 w-full relative flex items-center justify-center p-3"
                  style={{ backgroundColor: identityForm.primaryColor }}
                >
                  {identityForm.coverImageUrl && (
                    <img
                      src={identityForm.coverImageUrl}
                      alt="Cover"
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative text-center text-white z-10">
                    <h5 className="font-display font-extrabold text-xs leading-tight">{identityForm.name || 'Store Name'}</h5>
                    <p className="text-[9px] opacity-80 mt-0.5">Scan & Order Direct</p>
                  </div>
                </div>

                {/* Sample Menu Items in Phone */}
                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                  <div className="p-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">Paneer Tikka</span>
                      <p className="text-[9px] text-slate-400 font-mono">₹280</p>
                    </div>
                    <button
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: identityForm.accentColor }}
                    >
                      + ADD
                    </button>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-slate-900">Butter Chicken</span>
                      <p className="text-[9px] text-slate-400 font-mono">₹420</p>
                    </div>
                    <button
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: identityForm.accentColor }}
                    >
                      + ADD
                    </button>
                  </div>
                </div>

                {/* Bottom Bar in Phone */}
                <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[10px] font-bold">
                  <span>Table #1</span>
                  <span className="text-amber-400">View Cart (₹700)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: FEATURE FLAGS MATRIX
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Feature Capability Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SuperAdmin toggle switches to enable or disable specific modules for this tenant. Missing prerequisites will prompt setup alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flagsList.map((flag: any) => (
              <div
                key={flag.key}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  flag.isEnabled ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{flag.name}</span>
                    <button
                      onClick={() => toggleFlagMutation.mutate({ flagKey: flag.key, isEnabled: !flag.isEnabled })}
                      disabled={toggleFlagMutation.isPending}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        flag.isEnabled ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          flag.isEnabled ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{flag.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">{flag.key}</span>
                  <span className={`font-bold ${flag.isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {flag.isEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: TAXES & PAYMENT GATEWAYS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* TAXES SECTION */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Tax Rates & GST Rules</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure GST Groups, CGST/SGST breakdowns, or apply standard 1-click presets.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddTaxModal(true)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Custom Tax</span>
                </button>
              </div>
            </div>

            {/* 1-Click Tax Presets */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">1-Click Presets</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">Quickly apply standard national tax rules</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => applyTaxPresetMutation.mutate('GST_5')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
                >
                  GST 5% (Restaurant Std)
                </button>

                <button
                  onClick={() => applyTaxPresetMutation.mutate('GST_18')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
                >
                  GST 18% (AC/Bar)
                </button>

                <button
                  onClick={() => applyTaxPresetMutation.mutate('VAT_10')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
                >
                  VAT 10%
                </button>

                <button
                  onClick={() => applyTaxPresetMutation.mutate('NONE')}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-xl transition shadow-2xs"
                >
                  Clear (0%)
                </button>
              </div>
            </div>

            {/* Taxes List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {taxesList.map((tax: Tax) => (
                <div
                  key={tax._id}
                  className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-900">{tax.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {tax.type}
                      </span>
                    </div>
                    <p className="text-sm font-black font-mono text-amber-600 mt-1">{tax.percentage}%</p>
                  </div>

                  <button
                    onClick={() => deleteTaxMutation.mutate(tax._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Tax"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {taxesList.length === 0 && (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No custom tax rules configured. Default fallback rate is applied.
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT GATEWAYS SECTION */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Payment Methods & Razorpay Gateway</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure digital checkout gateways, UPI IDs, and cash tenders.</p>
              </div>

              <button
                onClick={() =>
                  saveSettingsMutation.mutate({
                    taxRatePercent: Number(billingForm.taxRatePercent),
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
                    upiConfig: {
                      upiId: billingForm.upiId,
                      merchantName: billingForm.upiMerchantName,
                    },
                  })
                }
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save Billing Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Default Tax Fallback Rate (%)</label>
                <input
                  type="number"
                  value={billingForm.taxRatePercent}
                  onChange={(e) => setBillingForm({ ...billingForm, taxRatePercent: Number(e.target.value) })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">GSTIN / Tax ID Number</label>
                <input
                  type="text"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={billingForm.gstNumber}
                  onChange={(e) => setBillingForm({ ...billingForm, gstNumber: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Accepted Methods */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 mb-2 block">Accepted Tender Modes</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'cash', label: 'Cash at Counter', state: billingForm.cash },
                  { key: 'card', label: 'Credit / Debit Card', state: billingForm.card },
                  { key: 'upi', label: 'Direct UPI QR', state: billingForm.upi },
                  { key: 'razorpay', label: 'Razorpay Online Gateway', state: billingForm.razorpay },
                ].map((m) => (
                  <label
                    key={m.key}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition ${
                      m.state ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={m.state}
                      onChange={(e) => setBillingForm({ ...billingForm, [m.key]: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-900">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Direct UPI Configuration */}
            {billingForm.upi && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>Direct UPI Dynamic QR Settings</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">UPI VPA Address *</label>
                    <input
                      type="text"
                      placeholder="restaurant@upi or 9876543210@paytm"
                      value={billingForm.upiId}
                      onChange={(e) => setBillingForm({ ...billingForm, upiId: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Merchant Display Name</label>
                    <input
                      type="text"
                      placeholder="Restaurant Name on UPI"
                      value={billingForm.upiMerchantName}
                      onChange={(e) => setBillingForm({ ...billingForm, upiMerchantName: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Razorpay Online Gateway Credentials */}
            {billingForm.razorpay && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Razorpay API Credentials</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Razorpay Key ID *</label>
                    <input
                      type="text"
                      placeholder="rzp_live_xxxxxxxxxxxx"
                      value={billingForm.razorpayKeyId}
                      onChange={(e) => setBillingForm({ ...billingForm, razorpayKeyId: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Razorpay Key Secret *</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={billingForm.razorpayKeySecret}
                      onChange={(e) => setBillingForm({ ...billingForm, razorpayKeySecret: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: DINING TABLES & FLOOR ZONES
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'tables' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Dining Tables & Floor Zones ({tablesList.length} Tables)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage physical dining tables, floor zones (AC, Rooftop, Bar), and secure QR scan tokens.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddZoneModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Add Zone</span>
              </button>

              <button
                onClick={() => setShowBulkTableModal(true)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Bulk Generator</span>
              </button>

              <button
                onClick={() => setShowAddTableModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Single Table</span>
              </button>
            </div>
          </div>

          {/* Zones Filter Strip */}
          {zonesList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Zones:</span>
              {zonesList.map((z: any) => (
                <div
                  key={z._id}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <span>{z.name}</span>
                  <button
                    onClick={() => deleteZoneMutation.mutate(z._id)}
                    className="text-slate-400 hover:text-rose-600"
                    title="Delete Zone"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {tablesList.map((table: Table) => (
              <div
                key={table._id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">
                      {table.displayName || `Table ${table.tableNumber}`}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${table.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      title={table.isActive ? 'Active' : 'Inactive'}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{table.tableNumber}</p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <a
                    href={`/r/${restaurant.slug}/t/${table.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Scan</span>
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => regenerateTableQrMutation.mutate(table._id)}
                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                      title="Regenerate QR Token"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTableMutation.mutate(table._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete Table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {tablesList.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                No tables created yet. Click "Bulk Generator" to add 10 tables in one second.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: DIGITAL MENU & CATALOG
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'menu' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Digital Menu & Catalog ({menuItemsList.length} Dishes)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage menu categories, dishes, prices, food tags, and images.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {menuItemsList.length === 0 && (
                <button
                  onClick={() => seedDemoMenuMutation.mutate()}
                  disabled={seedDemoMenuMutation.isPending}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Seed Demo Menu (12 Dishes)</span>
                </button>
              )}

              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Add Category</span>
              </button>

              <button
                onClick={() => setShowAddDishModal(true)}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Dish</span>
              </button>
            </div>
          </div>

          {/* Category Tabs Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMenuCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedMenuCategory === 'ALL'
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Dishes ({menuItemsList.length})
            </button>

            {categoriesList.map((cat: Category) => (
              <div key={cat._id} className="flex items-center">
                <button
                  onClick={() => setSelectedMenuCategory(cat._id)}
                  className={`px-3 py-1.5 rounded-l-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedMenuCategory === cat._id
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={() => deleteCategoryMutation.mutate(cat._id)}
                  className="px-1.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-r-xl text-xs font-bold border-l border-slate-200 transition"
                  title="Delete Category"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDishes.map((dish: MenuItem) => (
              <div
                key={dish._id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                          dish.isVegetarian ? 'border-emerald-600' : 'border-rose-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dish.isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                      </span>
                      <h4 className="font-bold text-xs text-slate-900">{dish.name}</h4>
                    </div>

                    <button
                      onClick={() => deleteDishMutation.mutate(dish._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete Dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {dish.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5">{dish.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-slate-900">
                    ₹{(dish.price / 100).toFixed(0)}
                  </span>

                  <div className="flex items-center gap-1 text-[10px]">
                    {dish.isSpicy && <span className="text-rose-500 font-bold">🌶️ Spicy</span>}
                    {dish.isChefsSpecial && <span className="text-amber-600 font-bold">⭐ Chef's</span>}
                  </div>
                </div>
              </div>
            ))}

            {filteredDishes.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                No dishes found in this category. Click "Add Dish" or "Seed Demo Menu".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 7: HARDWARE & POS THERMAL PRINTERS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Form */}
          <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Thermal Receipt & Hardware Formats</h3>
                <p className="text-xs text-slate-500 mt-0.5">Customize paper width, header disclaimers, GST/FSSAI badges, and KOT routes.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestPrint}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Test Print</span>
                </button>

                <button
                  onClick={() => saveSettingsMutation.mutate({ printerConfig: hardwareForm })}
                  disabled={saveSettingsMutation.isPending}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                  <span>Save Printer Config</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Thermal Paper Width *</label>
                <select
                  value={hardwareForm.paperWidth}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, paperWidth: e.target.value as any })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="80mm">80mm (Standard POS Thermal)</option>
                  <option value="58mm">58mm (Compact Mobile Bluetooth)</option>
                  <option value="A4">A4 (Full Sheet Invoicing)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">FSSAI License Number</label>
                <input
                  type="text"
                  placeholder="e.g. 10020011000123"
                  value={hardwareForm.fssaiNumber}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, fssaiNumber: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Custom Receipt Header</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome to Food Paradise"
                  value={hardwareForm.receiptHeader}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, receiptHeader: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Custom Receipt Footer</label>
                <input
                  type="text"
                  placeholder="e.g. Thank you! Visit again"
                  value={hardwareForm.receiptFooter}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, receiptFooter: e.target.value })}
                  className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Checkbox Toggles */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'showGstNumber', label: 'Show GSTIN on Bill', state: hardwareForm.showGstNumber },
                { key: 'showFssai', label: 'Show FSSAI License', state: hardwareForm.showFssai },
                { key: 'showTaxBreakup', label: 'Itemized Tax Breakdown', state: hardwareForm.showTaxBreakup },
                { key: 'showPaymentMode', label: 'Show Payment Tender', state: hardwareForm.showPaymentMode },
              ].map((t) => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={(hardwareForm as any)[t.key]}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, [t.key]: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visual Thermal Receipt Canvas Preview */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              <span>Thermal Receipt Canvas ({hardwareForm.paperWidth})</span>
            </span>

            {/* Thermal Receipt Paper Canvas */}
            <div
              className={`bg-amber-50/40 border border-dashed border-slate-300 p-5 rounded-2xl text-slate-900 font-mono text-[11px] leading-relaxed shadow-sm transition-all ${
                hardwareForm.paperWidth === '58mm' ? 'w-56' : 'w-72'
              }`}
            >
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <h4 className="font-bold text-sm tracking-tight">{restaurant.name}</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">{restaurant.address || 'Food Street, City'}</p>
                {hardwareForm.showGstNumber && billingForm.gstNumber && (
                  <p className="text-[9px] text-slate-500">GSTIN: {billingForm.gstNumber}</p>
                )}
                {hardwareForm.showFssai && hardwareForm.fssaiNumber && (
                  <p className="text-[9px] text-slate-500">FSSAI: {hardwareForm.fssaiNumber}</p>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px]">
                <div className="flex justify-between">
                  <span>Table #4</span>
                  <span>Invoice #1042</span>
                </div>
                <div className="flex justify-between text-slate-500 mt-0.5">
                  <span>24-Aug-2026</span>
                  <span>14:20 PM</span>
                </div>
              </div>

              <div className="py-3 space-y-1.5 border-b border-dashed border-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>1x Paneer Tikka</span>
                  <span>₹280.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Butter Naan</span>
                  <span>₹160.00</span>
                </div>
              </div>

              <div className="pt-2.5 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹440.00</span>
                </div>
                {hardwareForm.showTaxBreakup && (
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>GST (5%)</span>
                    <span>₹22.00</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-400">
                  <span>GRAND TOTAL</span>
                  <span>₹462.00</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-slate-400 text-center text-[9px] text-slate-500">
                <p>{hardwareForm.receiptFooter}</p>
                <p className="mt-1 font-bold">Scan to Pay via UPI</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 8: STAFF & ACCESS ACCOUNTS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Staff & Manager Accounts ({staffList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign manager credentials, kitchen display staff, or captain PINs for mobile table taking.
              </p>
            </div>

            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Staff Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((member: any) => (
              <div
                key={member._id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-bold text-xs flex items-center justify-center">
                        {(member.userId?.name || member.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          {member.userId?.name || member.name || 'Staff Member'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {member.userId?.email || member.email || 'No email registered'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-100 text-amber-900 uppercase">
                      {member.role}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-slate-400">
                    PIN: {member.pin ? '••••' : 'Not Set'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowResetPasswordModal(member.userId?._id || member.userId)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 transition"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => deleteStaffMutation.mutate(member._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Remove Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {staffList.length === 0 && (
              <div className="col-span-full py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                No staff accounts assigned. Click "Add Staff Account" to assign a Manager.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 9: EXTERNAL POS INTEGRATIONS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">External POS Bridge (Petpooja & UrbanPiper)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-way menu synchronization and live order dispatch into physical POS terminals.
              </p>
            </div>

            <button
              onClick={() =>
                saveSettingsMutation.mutate({
                  integrationConfig: {
                    provider: integrationForm.provider,
                    petpooja: {
                      restId: integrationForm.petpoojaRestId,
                      appKey: integrationForm.petpoojaAppKey,
                      appSecret: integrationForm.petpoojaAppSecret,
                    },
                    urbanpiper: {
                      storeId: integrationForm.urbanpiperStoreId,
                      apiKey: integrationForm.urbanpiperApiKey,
                    },
                  },
                })
              }
              disabled={saveSettingsMutation.isPending}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>Save Integration Bridge</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Select Integration Provider</label>
            <select
              value={integrationForm.provider}
              onChange={(e) => setIntegrationForm({ ...integrationForm, provider: e.target.value })}
              className="w-full sm:w-80 mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="NONE">None (Standalone Cloud Mode)</option>
              <option value="PETPOOJA">Petpooja POS Terminal</option>
              <option value="URBANPIPER">UrbanPiper Hub</option>
            </select>
          </div>

          {integrationForm.provider === 'PETPOOJA' && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <Plug className="w-4 h-4 text-amber-500" />
                <span>Petpooja API Configuration</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Rest ID *</label>
                  <input
                    type="text"
                    value={integrationForm.petpoojaRestId}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaRestId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">App Key *</label>
                  <input
                    type="text"
                    value={integrationForm.petpoojaAppKey}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppKey: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">App Secret *</label>
                  <input
                    type="password"
                    value={integrationForm.petpoojaAppSecret}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppSecret: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Petpooja Inbound Webhook URL:</span>
                  <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                    https://api.thescanmenu.com/api/v1/pos/webhook/petpooja/{restaurant._id}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(`https://api.thescanmenu.com/api/v1/pos/webhook/petpooja/${restaurant._id}`, 'petpooja_webhook')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  {copiedKey === 'petpooja_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'petpooja_webhook' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
         ───────────────────────────────────────────────────────────── */}

      {/* Single Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Dining Table</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Table Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 1, 10, A1"
                  value={singleTableData.tableNumber}
                  onChange={(e) => setSingleTableData({ ...singleTableData, tableNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Table 1, Balcony Corner"
                  value={singleTableData.displayName}
                  onChange={(e) => setSingleTableData({ ...singleTableData, displayName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Floor Zone (Optional)</label>
                <select
                  value={singleTableData.zoneId}
                  onChange={(e) => setSingleTableData({ ...singleTableData, zoneId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">No Zone</option>
                  {zonesList.map((z: any) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddTableModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createTableMutation.mutate(singleTableData)}
                disabled={!singleTableData.tableNumber || createTableMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tables Modal */}
      {showBulkTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Bulk Generate Tables</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">How many tables to generate? (1-50)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bulkTableData.count}
                  onChange={(e) => setBulkTableData({ ...bulkTableData, count: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Table Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. T (creates T1, T2, ... T10)"
                  value={bulkTableData.prefix}
                  onChange={(e) => setBulkTableData({ ...bulkTableData, prefix: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Floor Zone (Optional)</label>
                <select
                  value={bulkTableData.zoneId}
                  onChange={(e) => setBulkTableData({ ...bulkTableData, zoneId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">No Zone</option>
                  {zonesList.map((z: any) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowBulkTableModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkCreateTablesMutation.mutate(bulkTableData)}
                disabled={bulkCreateTablesMutation.isPending}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs"
              >
                Generate {bulkTableData.count} Tables
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Floor Zone</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Zone Name *</label>
              <input
                type="text"
                placeholder="e.g. Ground Floor, AC Dining, Rooftop, Bar"
                value={zoneData.name}
                onChange={(e) => setZoneData({ name: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddZoneModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createZoneMutation.mutate(zoneData)}
                disabled={!zoneData.name || createZoneMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Save Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Menu Category</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Starters, Main Course, Beverages"
                  value={categoryData.name}
                  onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short category description"
                  value={categoryData.description}
                  onChange={(e) => setCategoryData({ ...categoryData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createCategoryMutation.mutate(categoryData)}
                disabled={!categoryData.name || createCategoryMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dish Modal */}
      {showAddDishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Menu Dish</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Dish Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Butter Masala"
                  value={dishData.name}
                  onChange={(e) => setDishData({ ...dishData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Category *</label>
                  <select
                    value={dishData.categoryId}
                    onChange={(e) => setDishData({ ...dishData, categoryId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((cat: Category) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="250"
                    value={dishData.price || ''}
                    onChange={(e) => setDishData({ ...dishData, price: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  placeholder="Ingredients and culinary style"
                  value={dishData.description}
                  onChange={(e) => setDishData({ ...dishData, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/dish.jpg"
                  value={dishData.imageUrl}
                  onChange={(e) => setDishData({ ...dishData, imageUrl: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-emerald-700">
                  <input
                    type="checkbox"
                    checked={dishData.isVegetarian}
                    onChange={(e) => setDishData({ ...dishData, isVegetarian: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Pure Veg</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-700">
                  <input
                    type="checkbox"
                    checked={dishData.isSpicy}
                    onChange={(e) => setDishData({ ...dishData, isSpicy: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Spicy</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-amber-700">
                  <input
                    type="checkbox"
                    checked={dishData.isChefsSpecial}
                    onChange={(e) => setDishData({ ...dishData, isChefsSpecial: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Chef's Special</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setShowAddDishModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createDishMutation.mutate(dishData)}
                disabled={!dishData.name || !dishData.categoryId || createDishMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Add Dish to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tax Modal */}
      {showAddTaxModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Tax Configuration</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Tax Type</label>
                <select
                  value={taxData.type}
                  onChange={(e) => setTaxData({ ...taxData, type: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="TAX">Standalone Tax (e.g. VAT, Service Charge)</option>
                  <option value="GROUP">Tax Group (e.g. GST Group)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Tax Name *</label>
                <input
                  type="text"
                  placeholder="e.g. CGST, SGST, VAT"
                  value={taxData.name}
                  onChange={(e) => setTaxData({ ...taxData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Percentage (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxData.percentage}
                  onChange={(e) => setTaxData({ ...taxData, percentage: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddTaxModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createTaxMutation.mutate(taxData)}
                disabled={!taxData.name || createTaxMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Create Tax
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Add Staff Member</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={staffData.name}
                  onChange={(e) => setStaffData({ ...staffData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  placeholder="staff@restaurant.com"
                  value={staffData.email}
                  onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Login Password *</label>
                <input
                  type="password"
                  placeholder="Temporary password"
                  value={staffData.password}
                  onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Role</label>
                  <select
                    value={staffData.role}
                    onChange={(e) => setStaffData({ ...staffData, role: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="WAITER">Captain / Waiter</option>
                    <option value="KITCHEN">Kitchen Staff</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Captain PIN (4 Digits)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="1234"
                    value={staffData.pin}
                    onChange={(e) => setStaffData({ ...staffData, pin: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => createStaffMutation.mutate(staffData)}
                disabled={!staffData.name || !staffData.email || !staffData.password || createStaffMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900">Reset Staff Password</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-700">New Password *</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate({ userId: showResetPasswordModal, password: newPassword })}
                disabled={!newPassword || resetPasswordMutation.isPending}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRestaurantDetail;
