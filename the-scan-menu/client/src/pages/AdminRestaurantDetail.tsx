import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService, OutletSetupAuditResult, Table, Category, MenuItem, Tax, TableZone, Staff } from '../services/restaurant.service';
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
  EyeOff,
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
  KeyRound,
  ChefHat,
  Monitor,
  Tv,
  Bell,
  Sliders,
  ShoppingBag,
  Volume2,
  Clock,
  Palette,
  Settings,
} from 'lucide-react';

type AdminTab =
  | 'checklist'
  | 'identity'
  | 'flags'
  | 'kitchen'
  | 'counter'
  | 'customer'
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
  const [revealPinForId, setRevealPinForId] = useState<string | null>(null);

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
  const staffList: Staff[] = useMemo(() => staffResponse?.data || [], [staffResponse?.data]);
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

  // Kitchen Configuration Form State
  const [kitchenForm, setKitchenForm] = useState({
    orderWorkflowMode: 'FIVE_STEP' as 'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP',
    autoAcceptEnabled: false,
    autoAcceptDelaySeconds: 0,
    kdsSoundAlerts: true,
    prepWarningThresholdMinutes: 15,
    autoKotPrintOnBump: false,
  });

  // Counter POS Configuration Form State
  const [counterForm, setCounterForm] = useState({
    activeMode: 'HYBRID' as 'PREPAID' | 'POSTPAID' | 'HYBRID',
    enableTableOrdering: true,
    enableTakeaway: true,
    enableDelivery: false,
    minOrderAmount: 0,
    allowSpecialInstructions: true,
    quickCashButtons: true,
    autoPrintOnCheckout: true,
  });

  // Customer Experience & Live Display Form State
  const [customerForm, setCustomerForm] = useState({
    displayItemImages: true,
    enableDarkMode: false,
    defaultLanguage: 'en',
    allowWaiterCall: true,
    allowBillRequest: true,
    showEstimatedPrepTime: true,
    liveDisplayAudioChime: true,
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

  // Full-featured Hardware & Thermal Receipt Studio State
  const [hardwareForm, setHardwareForm] = useState({
    paperWidth: '80mm' as '80mm' | '58mm' | 'A4',
    templateTheme: 'classic' as 'classic' | 'modern' | 'compact',
    showLogo: true,
    logoUrl: '',
    showGstNumber: true,
    gstNumber: '',
    showFssai: true,
    fssaiNumber: '',
    showPaymentQr: true,
    upiId: '',
    receiptHeader: '',
    receiptFooter: 'Thank you for dining with us! Please visit again.',
    showCustomerInfo: true,
    showPaymentMode: true,
    showTaxBreakup: true,
    kotShowServerName: true,
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
    role: 'MANAGER' as 'MANAGER' | 'STAFF',
    pin: '',
    isActive: true,
  });
  const [newPassword, setNewPassword] = useState('');

  // Selected Category filter in Menu tab
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('ALL');

  // Populate forms when restaurant data arrives
  useEffect(() => {
    if (restaurant) {
      const s = restaurant.settings;
      const primaryLogo = restaurant.logoUrl || s?.branding?.logoUrl || s?.theme?.logoUrl || '';

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
        logoUrl: primaryLogo,
        coverImageUrl: restaurant.coverImageUrl || s?.branding?.coverImageUrl || s?.theme?.coverImageUrl || '',
        primaryColor: s?.branding?.primaryColor || s?.theme?.primaryColor || '#111827',
        secondaryColor: s?.branding?.secondaryColor || s?.theme?.secondaryColor || '#FFFFFF',
        accentColor: s?.branding?.accentColor || s?.theme?.accentColor || '#F59E0B',
        currency: s?.currency || 'INR',
        timezone: s?.timezone || 'Asia/Kolkata',
      });

      setKitchenForm({
        orderWorkflowMode: s?.workflow?.orderWorkflowMode || 'FIVE_STEP',
        autoAcceptEnabled: s?.workflow?.autoAcceptConfig?.enabled ?? false,
        autoAcceptDelaySeconds: s?.workflow?.autoAcceptConfig?.delaySeconds ?? 0,
        kdsSoundAlerts: true,
        prepWarningThresholdMinutes: 15,
        autoKotPrintOnBump: false,
      });

      setCounterForm({
        activeMode: s?.paymentConfig?.activeMode || 'HYBRID',
        enableTableOrdering: s?.orderConfig?.enableTableOrdering ?? true,
        enableTakeaway: s?.orderConfig?.enableTakeaway ?? true,
        enableDelivery: s?.orderConfig?.enableDelivery ?? false,
        minOrderAmount: s?.orderConfig?.minOrderAmount || 0,
        allowSpecialInstructions: s?.orderConfig?.allowSpecialInstructions ?? true,
        quickCashButtons: true,
        autoPrintOnCheckout: true,
      });

      setCustomerForm({
        displayItemImages: s?.uiSettings?.displayItemImages ?? true,
        enableDarkMode: s?.uiSettings?.enableDarkMode ?? false,
        defaultLanguage: s?.uiSettings?.defaultLanguage || 'en',
        allowWaiterCall: true,
        allowBillRequest: true,
        showEstimatedPrepTime: true,
        liveDisplayAudioChime: true,
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

      setHardwareForm({
        paperWidth: s?.printerConfig?.paperWidth || '80mm',
        templateTheme: s?.printerConfig?.templateTheme || 'classic',
        showLogo: s?.printerConfig?.showLogo ?? true,
        logoUrl: s?.printerConfig?.logoUrl || primaryLogo,
        showGstNumber: s?.printerConfig?.showGstNumber ?? true,
        gstNumber: s?.printerConfig?.gstNumber || s?.paymentConfig?.gstNumber || '',
        showFssai: s?.printerConfig?.showFssai ?? true,
        fssaiNumber: s?.printerConfig?.fssaiNumber || '',
        showPaymentQr: s?.printerConfig?.showPaymentQr ?? true,
        upiId: s?.printerConfig?.upiId || s?.paymentConfig?.upiConfig?.upiId || '',
        receiptHeader: s?.printerConfig?.receiptHeader || '',
        receiptFooter: s?.printerConfig?.receiptFooter || 'Thank you for dining with us! Please visit again.',
        showCustomerInfo: s?.printerConfig?.showCustomerInfo ?? true,
        showPaymentMode: s?.printerConfig?.showPaymentMode ?? true,
        showTaxBreakup: s?.printerConfig?.showTaxBreakup ?? true,
        kotShowServerName: s?.printerConfig?.kotShowServerName ?? true,
        kotNotes: s?.printerConfig?.kotNotes || '',
        defaultPrintTarget: s?.printerConfig?.defaultPrintTarget || 'BOTH',
      });

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
        flags: [{ key: flagKey, enabled: isEnabled }],
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
      setStaffData({ name: '', email: '', password: '', role: 'MANAGER', pin: '', isActive: true });
      toast('Staff member account created', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to add staff', 'error'),
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: any }) => managerService.updateStaff(id!, staffId, data),
    onSuccess: () => {
      invalidateAll();
      toast('Staff member updated', 'success');
    },
    onError: (err: any) => toast(err.response?.data?.error?.message || 'Failed to update staff', 'error'),
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

  // Tax Groups and Standalone Taxes breakdown
  const taxGroups = useMemo(() => taxesList.filter((t) => t.type === 'GROUP'), [taxesList]);
  const standaloneTaxes = useMemo(() => taxesList.filter((t) => t.type === 'TAX' && !t.groupId), [taxesList]);
  const getSubTaxes = (groupId: string) =>
    taxesList.filter((t) => t.type === 'TAX' && (typeof t.groupId === 'string' ? t.groupId === groupId : (t.groupId as any)?._id === groupId));

  // Active flags count calculation
  const activeFlagsCount = useMemo(() => {
    return flagsList.filter((f: any) => f.enabled === true || f.isEnabled === true).length;
  }, [flagsList]);

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
                      <span>Feature Flags Matrix</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        activeTab === 'flags' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {activeFlagsCount} active
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 3: Station Configurations (Kitchen, Counter, Customer) */}
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                  Station Configurations
                </span>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => setActiveTab('kitchen')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'kitchen'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChefHat className={`w-4 h-4 ${activeTab === 'kitchen' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Kitchen & KDS Engine</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                      {kitchenForm.orderWorkflowMode.replace('_', ' ')}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('counter')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'counter'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Monitor className={`w-4 h-4 ${activeTab === 'counter' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Counter POS Workstation</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">
                      {counterForm.activeMode}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('customer')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left ${
                      activeTab === 'customer'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tv className={`w-4 h-4 ${activeTab === 'customer' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Customer & Live Display</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Group 4: Menu & Floor Layout */}
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

              {/* Group 5: Finance & Hardware */}
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
                      <span>Thermal Printer Studio</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                      {hardwareForm.paperWidth}
                    </span>
                  </button>
                </div>
              </div>

              {/* Group 6: Team & Integrations */}
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
          TAB 2: STORE IDENTITY & BRANDING
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'identity' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">Store Profile & Branding</h3>
              <p className="text-xs text-slate-500 mt-0.5">Primary store profile, legal details, timings, and custom theme colors.</p>
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
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>Save Profile & Branding</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Outlet Name *</label>
              <input
                type="text"
                value={identityForm.name}
                onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-amber-500 focus:outline-none"
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

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700">Physical Store Address *</label>
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
              <label className="text-[11px] font-bold text-slate-700">WhatsApp Notification Number</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={identityForm.whatsapp}
                onChange={(e) => setIdentityForm({ ...identityForm, whatsapp: e.target.value })}
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-slate-700">Google Review URL</label>
              <input
                type="text"
                placeholder="https://g.page/r/example/review"
                value={identityForm.googleReviewUrl}
                onChange={(e) => setIdentityForm({ ...identityForm, googleReviewUrl: e.target.value })}
                className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
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
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: FEATURE FLAGS MATRIX
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display text-xl font-bold text-slate-900">Feature Capability Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              SuperAdmin switches to enable or disable specific modules for this tenant. Missing prerequisites will prompt setup alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flagsList.map((flag: any) => {
              const isFlagActive = flag.enabled === true || flag.isEnabled === true;
              return (
                <div
                  key={flag.key}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isFlagActive ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{flag.name}</span>
                      <button
                        onClick={() => toggleFlagMutation.mutate({ flagKey: flag.key, isEnabled: !isFlagActive })}
                        disabled={toggleFlagMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isFlagActive ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isFlagActive ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{flag.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">{flag.key}</span>
                    <span className={`font-bold ${isFlagActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {isFlagActive ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: KITCHEN & KDS ENGINE CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'kitchen' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-500" />
                <span>Kitchen & KDS Engine Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure order preparation pipeline, auto-acceptance delays, kitchen station bump rules, and audio chimes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/kds"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5 text-amber-600" />
                <span>Launch KDS Screen</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <button
                onClick={() =>
                  saveSettingsMutation.mutate({
                    orderWorkflowMode: kitchenForm.orderWorkflowMode,
                    autoAcceptConfig: {
                      enabled: kitchenForm.autoAcceptEnabled,
                      delaySeconds: Number(kitchenForm.autoAcceptDelaySeconds),
                    },
                  })
                }
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save Kitchen Config</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline Mode */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">
                  Order Fulfillment Pipeline (Workflow Mode)
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Determines the lifecycle steps every order passes through from kitchen preparation to guest serving.
                </p>

                <div className="space-y-2.5">
                  {[
                    {
                      id: 'FIVE_STEP',
                      title: 'Five-Step Standard Dine-In',
                      desc: 'Received ➔ Confirmed ➔ In Preparation ➔ Ready for Pickup ➔ Served',
                    },
                    {
                      id: 'FOUR_STEP',
                      title: 'Four-Step Fast Casual',
                      desc: 'Received ➔ Preparing ➔ Ready for Pickup ➔ Served',
                    },
                    {
                      id: 'THREE_STEP',
                      title: 'Three-Step Express Counter',
                      desc: 'Received ➔ In Kitchen ➔ Order Fulfilled',
                    },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                        kitchenForm.orderWorkflowMode === mode.id
                          ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="orderWorkflowMode"
                        value={mode.id}
                        checked={kitchenForm.orderWorkflowMode === mode.id}
                        onChange={(e) => setKitchenForm({ ...kitchenForm, orderWorkflowMode: e.target.value as any })}
                        className="mt-0.5 text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{mode.title}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{mode.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto Accept & Kitchen Display Alerts */}
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Automated Order Confirmation</span>
                </span>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kitchenForm.autoAcceptEnabled}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, autoAcceptEnabled: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Automatically accept incoming customer orders</span>
                </label>

                {kitchenForm.autoAcceptEnabled && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      Auto-Accept Delay (Seconds)
                    </label>
                    <select
                      value={kitchenForm.autoAcceptDelaySeconds}
                      onChange={(e) => setKitchenForm({ ...kitchenForm, autoAcceptDelaySeconds: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value={0}>0s (Instant Acceptance)</option>
                      <option value={30}>30 Seconds Delay</option>
                      <option value={60}>60 Seconds Delay</option>
                      <option value={120}>2 Minutes Delay</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-purple-600" />
                  <span>Kitchen Sound Alerts & Bump Thresholds</span>
                </span>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kitchenForm.kdsSoundAlerts}
                      onChange={(e) => setKitchenForm({ ...kitchenForm, kdsSoundAlerts: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Play Audio Chime when new ticket arrives on KDS</span>
                  </label>

                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-600">
                      Preparation Warning Threshold (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={kitchenForm.prepWarningThresholdMinutes}
                      onChange={(e) => setKitchenForm({ ...kitchenForm, prepWarningThresholdMinutes: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Tickets turn red when preparation time exceeds this duration.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: COUNTER POS & BILLING WORKSTATION CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'counter' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-amber-500" />
                <span>Counter POS & Billing Workstation</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure counter cashier behavior, prepaid vs postpaid billing modes, fulfillment channels, and quick checkout.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/counter"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Monitor className="w-3.5 h-3.5 text-slate-600" />
                <span>Launch Counter POS</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <button
                onClick={() =>
                  saveSettingsMutation.mutate({
                    activeMode: counterForm.activeMode,
                    orderConfig: {
                      enableTableOrdering: counterForm.enableTableOrdering,
                      enableTakeaway: counterForm.enableTakeaway,
                      enableDelivery: counterForm.enableDelivery,
                      minOrderAmount: Number(counterForm.minOrderAmount),
                      allowSpecialInstructions: counterForm.allowSpecialInstructions,
                    },
                  })
                }
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save Counter Config</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Mode */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-900 block mb-1">
                  Primary Counter Billing Model
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Select whether this outlet operates as a Pay-First fast food counter or Traditional Dine-in postpaid billing.
                </p>

                <div className="space-y-2.5">
                  {[
                    {
                      id: 'HYBRID',
                      title: 'Hybrid Mode (Dine-in Pay Later + Counter Pay First)',
                      desc: 'Customers can dine and pay after meals, or pay immediately at the counter.',
                    },
                    {
                      id: 'POSTPAID',
                      title: 'Traditional Dine-In (Postpaid)',
                      desc: 'Orders are accumulated onto dining tables; single final bill printed upon checkout.',
                    },
                    {
                      id: 'PREPAID',
                      title: 'Quick Counter QSR (Prepaid Pay-First)',
                      desc: 'Orders must be paid immediately before kitchen ticket generation (e.g. Cafe/QSR).',
                    },
                  ].map((m) => (
                    <label
                      key={m.id}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                        counterForm.activeMode === m.id
                          ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="activeMode"
                        value={m.id}
                        checked={counterForm.activeMode === m.id}
                        onChange={(e) => setCounterForm({ ...counterForm, activeMode: e.target.value as any })}
                        className="mt-0.5 text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{m.title}</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Fulfillment Channels & Controls */}
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>Enabled Fulfillment Channels</span>
                </span>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={counterForm.enableTableOrdering}
                      onChange={(e) => setCounterForm({ ...counterForm, enableTableOrdering: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Dine-In Table Ordering Active</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={counterForm.enableTakeaway}
                      onChange={(e) => setCounterForm({ ...counterForm, enableTakeaway: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Takeaway / Parcel Pickup Channel Active</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={counterForm.enableDelivery}
                      onChange={(e) => setCounterForm({ ...counterForm, enableDelivery: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Delivery / Direct Dispatch Channel Active</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-slate-600" />
                  <span>Counter Checkout Rules</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                      Minimum Order Value (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={counterForm.minOrderAmount}
                      onChange={(e) => setCounterForm({ ...counterForm, minOrderAmount: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                      Special Instructions
                    </label>
                    <label className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={counterForm.allowSpecialInstructions}
                        onChange={(e) => setCounterForm({ ...counterForm, allowSpecialInstructions: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Allow Custom Chef Notes</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 6: CUSTOMER EXPERIENCE & LIVE QUEUE DISPLAY CONFIGURATION
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'customer' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-500" />
                <span>Customer Experience & Live Display Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage customer-facing digital menu preferences, waiter assistance buttons, and live TV queue display screens.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/r/${restaurant.slug}/display`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Tv className="w-3.5 h-3.5 text-purple-600" />
                <span>Open Live Queue Display</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <button
                onClick={() =>
                  saveSettingsMutation.mutate({
                    uiSettings: {
                      displayItemImages: customerForm.displayItemImages,
                      enableDarkMode: customerForm.enableDarkMode,
                      defaultLanguage: customerForm.defaultLanguage,
                    },
                  })
                }
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                <span>Save Customer Config</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Digital Menu UI Controls */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-500" />
                <span>Mobile Menu UI Preferences</span>
              </span>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.displayItemImages}
                    onChange={(e) => setCustomerForm({ ...customerForm, displayItemImages: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Show Dish Photography on Mobile Menu</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.enableDarkMode}
                    onChange={(e) => setCustomerForm({ ...customerForm, enableDarkMode: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Enable Sleek Dark Theme by Default for Customers</span>
                </label>

                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Default Interface Language
                  </label>
                  <select
                    value={customerForm.defaultLanguage}
                    onChange={(e) => setCustomerForm({ ...customerForm, defaultLanguage: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="en">English (Default)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="or">Odia (ଓଡ଼ିଆ)</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="fr">French (Français)</option>
                    <option value="ar">Arabic (العربية)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Queue Display & Table Assistance */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-purple-600" />
                <span>Table Assistance & Public Display Screen</span>
              </span>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.allowWaiterCall}
                    onChange={(e) => setCustomerForm({ ...customerForm, allowWaiterCall: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Show "Call Waiter" Assistance Button on Table Menu</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.allowBillRequest}
                    onChange={(e) => setCustomerForm({ ...customerForm, allowBillRequest: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Allow Customer to Request Bill directly from Table</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customerForm.liveDisplayAudioChime}
                    onChange={(e) => setCustomerForm({ ...customerForm, liveDisplayAudioChime: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Play Token Chime when Order is marked "Ready" on Live TV Display</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 7: TAXES & PAYMENT GATEWAYS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* TAXES SECTION */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">Tax Rates & GST Rules</h3>
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

            {/* Hierarchical Tax Groups & Rules */}
            <div className="space-y-4">
              {taxGroups.map((group) => {
                const subTaxes = getSubTaxes(group._id);
                return (
                  <div key={group._id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-50/90 px-4 py-3 flex items-center justify-between border-b border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{group.name}</span>
                        <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full">
                          TAX GROUP ({group.percentage}%)
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTaxMutation.mutate(group._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Tax Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 divide-y divide-slate-100 bg-white">
                      {subTaxes.map((st) => (
                        <div key={st._id} className="py-2 px-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{st.name}</span>
                          <span className="font-mono font-bold text-slate-900">{st.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Standalone Taxes */}
              {standaloneTaxes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {standaloneTaxes.map((tax) => (
                    <div key={tax._id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="font-extrabold text-xs text-slate-900">{tax.name}</span>
                        <p className="text-sm font-black font-mono text-amber-600 mt-1">{tax.percentage}%</p>
                      </div>
                      <button
                        onClick={() => deleteTaxMutation.mutate(tax._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {taxesList.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No tax rules configured. Click "GST 5%" above to apply default restaurant tax.
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT GATEWAYS SECTION */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">Payment Gateways & Tenders</h3>
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
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
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
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition ${
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
          TAB 8: DINING TABLES & FLOOR ZONES
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'tables' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">
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
          TAB 9: DIGITAL MENU & CATALOG
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'menu' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">
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
          TAB 10: THERMAL PRINTER & RECEIPT DESIGN STUDIO (100% PARITY)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Settings Form Studio */}
          <div className="xl:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-500" />
                  <span>Thermal Printer & Receipt Design Studio</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize customer bills, counter receipts, kitchen KOT tickets, logo branding, and tax layouts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Test Print</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    saveSettingsMutation.mutate({
                      printerConfig: hardwareForm,
                      gstNumber: hardwareForm.gstNumber,
                      upiConfig: { upiId: hardwareForm.upiId },
                    })
                  }
                  disabled={saveSettingsMutation.isPending}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  {saveSettingsMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                  <span>Save Printer Config</span>
                </button>
              </div>
            </div>

            {/* ── 1. RECEIPT BRANDING & TAX IDENTIFIERS ── */}
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
                        checked={hardwareForm.showLogo}
                        onChange={(e) => setHardwareForm({ ...hardwareForm, showLogo: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span className="font-medium text-[11px]">Print Logo on Bills</span>
                    </label>
                  </div>

                  {hardwareForm.showLogo && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={hardwareForm.logoUrl}
                          onChange={(e) => setHardwareForm({ ...hardwareForm, logoUrl: e.target.value })}
                          placeholder={identityForm.logoUrl || 'https://example.com/logo.png'}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                        />
                        {identityForm.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setHardwareForm({ ...hardwareForm, logoUrl: identityForm.logoUrl })}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl transition whitespace-nowrap"
                          >
                            Use Store Logo
                          </button>
                        )}
                      </div>
                      {(hardwareForm.logoUrl || identityForm.logoUrl) && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-slate-400">Preview:</span>
                          <img
                            src={hardwareForm.logoUrl || identityForm.logoUrl}
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
                          checked={hardwareForm.showGstNumber}
                          onChange={(e) => setHardwareForm({ ...hardwareForm, showGstNumber: e.target.checked })}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>Show GSTIN</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={hardwareForm.gstNumber}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, gstNumber: e.target.value })}
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
                          checked={hardwareForm.showFssai}
                          onChange={(e) => setHardwareForm({ ...hardwareForm, showFssai: e.target.checked })}
                          className="rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>Show FSSAI</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={hardwareForm.fssaiNumber}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, fssaiNumber: e.target.value })}
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
                        checked={hardwareForm.showPaymentQr}
                        onChange={(e) => setHardwareForm({ ...hardwareForm, showPaymentQr: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>Print Payment QR</span>
                    </label>
                  </div>

                  {hardwareForm.showPaymentQr && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Merchant UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          value={hardwareForm.upiId}
                          onChange={(e) => setHardwareForm({ ...hardwareForm, upiId: e.target.value })}
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

            {/* ── 2. CUSTOMER & COUNTER BILL CUSTOMIZATION ── */}
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
                    const isSelected = hardwareForm.templateTheme === themeOpt.id;
                    return (
                      <button
                        type="button"
                        key={themeOpt.id}
                        onClick={() => setHardwareForm({ ...hardwareForm, templateTheme: themeOpt.id as any })}
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
                    checked={hardwareForm.showTaxBreakup}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, showTaxBreakup: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Itemized Tax Breakup (CGST / SGST)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={hardwareForm.showCustomerInfo}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, showCustomerInfo: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Customer Name & Phone Number</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={hardwareForm.showPaymentMode}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, showPaymentMode: e.target.checked })}
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
                    value={hardwareForm.receiptHeader}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, receiptHeader: e.target.value })}
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
                    value={hardwareForm.receiptFooter}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, receiptFooter: e.target.value })}
                    placeholder="e.g. Thank you for dining with us! Please visit again."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed at the very bottom of every customer invoice.</p>
                </div>
              </div>
            </div>

            {/* ── 3. KITCHEN ORDER TICKET (KOT) CUSTOMIZATION ── */}
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
                      checked={hardwareForm.kotShowServerName}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, kotShowServerName: e.target.checked })}
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
                    value={hardwareForm.kotNotes}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, kotNotes: e.target.value })}
                    placeholder="e.g. ⚠️ Check allergy flags & temperature"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">Fixed instruction printed at the bottom of every kitchen ticket.</p>
                </div>
              </div>
            </div>

            {/* ── 4. PAPER ROLL WIDTH & DEFAULT POS ACTION ── */}
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
                  const isSelected = hardwareForm.paperWidth === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setHardwareForm({ ...hardwareForm, paperWidth: p.id as any })}
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
                    const isSelected = hardwareForm.defaultPrintTarget === target.id;
                    return (
                      <button
                        type="button"
                        key={target.id}
                        onClick={() => setHardwareForm({ ...hardwareForm, defaultPrintTarget: target.id as any })}
                        className={`text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-base mb-1">{target.icon}</div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">{target.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{target.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Visual Thermal Receipt Canvas Preview */}
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col items-center sticky top-4">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              <span>Live Receipt Canvas ({hardwareForm.paperWidth})</span>
            </span>

            {/* Thermal Receipt Paper Canvas */}
            <div
              className={`bg-white border border-slate-300 p-5 rounded-2xl text-slate-900 shadow-md transition-all ${
                hardwareForm.templateTheme === 'modern' ? 'font-sans' : 'font-mono'
              } ${hardwareForm.templateTheme === 'compact' ? 'text-[10px] leading-tight' : 'text-[11px] leading-relaxed'} ${
                hardwareForm.paperWidth === '58mm' ? 'w-56' : 'w-72'
              }`}
            >
              {/* Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                {hardwareForm.showLogo && (hardwareForm.logoUrl || identityForm.logoUrl) && (
                  <img
                    src={hardwareForm.logoUrl || identityForm.logoUrl}
                    alt="Logo"
                    className="h-10 mx-auto mb-2 object-contain"
                  />
                )}
                <h4 className="font-bold text-sm tracking-tight">{restaurant.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{restaurant.address || 'Food Street, City'}</p>
                {hardwareForm.receiptHeader && (
                  <p className="text-[10px] font-bold text-slate-700 italic mt-1">{hardwareForm.receiptHeader}</p>
                )}
                {hardwareForm.showGstNumber && hardwareForm.gstNumber && (
                  <p className="text-[9px] text-slate-500 mt-0.5">GSTIN: {hardwareForm.gstNumber}</p>
                )}
                {hardwareForm.showFssai && hardwareForm.fssaiNumber && (
                  <p className="text-[9px] text-slate-500">FSSAI: {hardwareForm.fssaiNumber}</p>
                )}
              </div>

              {/* Order Info */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>Table #4</span>
                  <span>Invoice #1042</span>
                </div>
                <div className="flex justify-between text-slate-500 mt-0.5">
                  <span>24-Aug-2026</span>
                  <span>14:20 PM</span>
                </div>
                {hardwareForm.showCustomerInfo && (
                  <div className="text-slate-500 mt-0.5">
                    <span>Guest: John Doe (+91 98765 43210)</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-3 space-y-1.5 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>1x Paneer Tikka</span>
                  <span>₹280.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Butter Naan</span>
                  <span>₹160.00</span>
                </div>
              </div>

              {/* Totals & Tax */}
              <div className="pt-2.5 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹440.00</span>
                </div>
                {hardwareForm.showTaxBreakup && (
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>CGST (2.5%) + SGST (2.5%)</span>
                    <span>₹22.00</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-400">
                  <span>GRAND TOTAL</span>
                  <span>₹462.00</span>
                </div>
                {hardwareForm.showPaymentMode && (
                  <div className="flex justify-between text-[10px] text-emerald-700 font-bold pt-0.5">
                    <span>Payment: UPI QR</span>
                    <span>[PENDING SETTLEMENT]</span>
                  </div>
                )}
              </div>

              {/* Dynamic Payment QR */}
              {hardwareForm.showPaymentQr && (
                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-400 text-center">
                  <div className="w-20 h-20 bg-slate-100 border border-slate-300 mx-auto rounded-lg flex flex-col items-center justify-center text-slate-400 p-1">
                    <QrCode className="w-10 h-10 text-slate-700" />
                    <span className="text-[8px] text-slate-600 font-bold">SCAN TO PAY</span>
                  </div>
                  <p className="text-[9px] font-mono text-slate-500 mt-1">
                    {hardwareForm.upiId || 'merchant@upi'}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-400 text-center text-[9px] text-slate-500">
                <p>{hardwareForm.receiptFooter}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 11: STAFF & ACCESS ACCOUNTS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Staff & Manager Accounts ({staffList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign manager credentials, kitchen display staff, or captain PINs for mobile table taking.
              </p>
            </div>

            <button
              onClick={() => {
                setStaffData({ name: '', email: '', password: '', role: 'MANAGER', pin: '', isActive: true });
                setShowAddStaffModal(true);
              }}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Staff Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((member: Staff) => (
              <div
                key={member._id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-slate-900 text-amber-400 font-extrabold text-sm flex items-center justify-center shadow-2xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{member.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">{member.email}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-100 text-amber-900 uppercase">
                      {member.role}
                    </span>
                  </div>

                  {/* PIN & Status display */}
                  <div className="mt-3 flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] font-mono">
                        PIN: {revealPinForId === member._id ? member.pin || 'None' : member.pin ? '••••' : 'None'}
                      </span>
                    </div>

                    {member.pin && (
                      <button
                        onClick={() => setRevealPinForId(revealPinForId === member._id ? null : member._id)}
                        className="text-slate-400 hover:text-slate-700"
                        title={revealPinForId === member._id ? 'Hide PIN' : 'Reveal PIN'}
                      >
                        {revealPinForId === member._id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => updateStaffMutation.mutate({ staffId: member._id, data: { isActive: !member.isActive } })}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      member.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {member.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowResetPasswordModal(member._id)}
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
                No staff accounts assigned. Click "Add Staff Account" to create a Manager.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 12: EXTERNAL POS INTEGRATIONS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">External POS Bridge (Petpooja & UrbanPiper)</h3>
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
              className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
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

              {taxData.type === 'TAX' && taxGroups.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Parent Tax Group (Optional)</label>
                  <select
                    value={taxData.groupId}
                    onChange={(e) => setTaxData({ ...taxData, groupId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="">None (Standalone)</option>
                    {taxGroups.map((g) => (
                      <option key={g._id} value={g._id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
            <h3 className="font-display text-lg font-bold text-slate-900">Add Staff Account</h3>

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
                    <option value="STAFF">Captain / Waiter</option>
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
