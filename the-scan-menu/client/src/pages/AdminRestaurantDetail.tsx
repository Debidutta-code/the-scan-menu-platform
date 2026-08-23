import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService, OutletSetupAuditResult, Table, Category, MenuItem, Tax, TableZone, Staff } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import { Loader, AlertTriangle } from 'lucide-react';

// Modular Components
import {
  AdminTab,
  IdentityFormData,
  KitchenFormData,
  CounterFormData,
  CustomerFormData,
  BillingFormData,
  HardwareFormData,
  IntegrationFormData,
} from '../components/admin/restaurant-detail/types';
import { AdminRestaurantHeader } from '../components/admin/restaurant-detail/AdminRestaurantHeader';
import { AdminRestaurantSidebar } from '../components/admin/restaurant-detail/AdminRestaurantSidebar';

// Tabs
import { ChecklistTab } from '../components/admin/restaurant-detail/tabs/ChecklistTab';
import { IdentityTab } from '../components/admin/restaurant-detail/tabs/IdentityTab';
import { FeatureFlagsTab } from '../components/admin/restaurant-detail/tabs/FeatureFlagsTab';
import { KitchenTab } from '../components/admin/restaurant-detail/tabs/KitchenTab';
import { CounterTab } from '../components/admin/restaurant-detail/tabs/CounterTab';
import { CustomerTab } from '../components/admin/restaurant-detail/tabs/CustomerTab';
import { BillingTab } from '../components/admin/restaurant-detail/tabs/BillingTab';
import { TablesTab } from '../components/admin/restaurant-detail/tabs/TablesTab';
import { MenuTab } from '../components/admin/restaurant-detail/tabs/MenuTab';
import { HardwareTab } from '../components/admin/restaurant-detail/tabs/HardwareTab';
import { StaffTab } from '../components/admin/restaurant-detail/tabs/StaffTab';
import { IntegrationsTab } from '../components/admin/restaurant-detail/tabs/IntegrationsTab';

// Modals
import { SingleTableModal, BulkTableModal } from '../components/admin/restaurant-detail/modals/TableModals';
import { ZoneModal } from '../components/admin/restaurant-detail/modals/ZoneModal';
import { AddCategoryModal, AddDishModal } from '../components/admin/restaurant-detail/modals/MenuModals';
import { AddTaxModal } from '../components/admin/restaurant-detail/modals/TaxModal';
import { AddStaffModal, ResetPasswordModal } from '../components/admin/restaurant-detail/modals/StaffModals';

export const AdminRestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [identityForm, setIdentityForm] = useState<IdentityFormData>({
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

  const [kitchenForm, setKitchenForm] = useState<KitchenFormData>({
    orderWorkflowMode: 'FIVE_STEP',
    autoAcceptEnabled: false,
    autoAcceptDelaySeconds: 0,
    kdsSoundAlerts: true,
    prepWarningThresholdMinutes: 15,
    autoKotPrintOnBump: false,
  });

  const [counterForm, setCounterForm] = useState<CounterFormData>({
    activeMode: 'HYBRID',
    enableTableOrdering: true,
    enableTakeaway: true,
    enableDelivery: false,
    minOrderAmount: 0,
    allowSpecialInstructions: true,
    quickCashButtons: true,
    autoPrintOnCheckout: true,
  });

  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    displayItemImages: true,
    enableDarkMode: false,
    defaultLanguage: 'en',
    allowWaiterCall: true,
    allowBillRequest: true,
    showEstimatedPrepTime: true,
    liveDisplayAudioChime: true,
  });

  const [billingForm, setBillingForm] = useState<BillingFormData>({
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

  const [hardwareForm, setHardwareForm] = useState<HardwareFormData>({
    paperWidth: '80mm',
    templateTheme: 'classic',
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
    defaultPrintTarget: 'BOTH',
  });

  const [integrationForm, setIntegrationForm] = useState<IntegrationFormData>({
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

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-4 font-sans overflow-hidden">
      {/* MASTER TOP HEADER & AUDIT BAR */}
      <div className="shrink-0">
        <AdminRestaurantHeader
          restaurant={restaurant}
          audit={audit}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* 2-COLUMN HUB STUDIO: SUB-SIDEBAR + ACTIVE TAB CANVAS */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <AdminRestaurantSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          audit={audit}
          activeFlagsCount={activeFlagsCount}
          tablesCount={tablesList.length}
          menuItemsCount={menuItemsList.length}
          staffCount={staffList.length}
          kitchenForm={kitchenForm}
          counterForm={counterForm}
          hardwareForm={hardwareForm}
        />

        <div className="flex-1 min-w-0 h-full flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'checklist' && (
            <ChecklistTab
              audit={audit}
              tablesCount={tablesList.length}
              menuItemsCount={menuItemsList.length}
              categoriesCount={categoriesList.length}
              staffCount={staffList.length}
              setActiveTab={setActiveTab}
              onSeedDemoMenu={() => seedDemoMenuMutation.mutate()}
              isSeedingMenu={seedDemoMenuMutation.isPending}
              onApplyTaxPreset={(p) => applyTaxPresetMutation.mutate(p)}
              isApplyingTax={applyTaxPresetMutation.isPending}
            />
          )}

          {activeTab === 'identity' && (
            <IdentityTab
              identityForm={identityForm}
              setIdentityForm={setIdentityForm}
              onSave={() =>
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
              isSaving={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'flags' && (
            <FeatureFlagsTab
              flagsList={flagsList}
              onToggleFlag={(key, val) => toggleFlagMutation.mutate({ flagKey: key, isEnabled: val })}
              isToggling={toggleFlagMutation.isPending}
            />
          )}

          {activeTab === 'kitchen' && (
            <KitchenTab
              kitchenForm={kitchenForm}
              setKitchenForm={setKitchenForm}
              onSave={() =>
                saveSettingsMutation.mutate({
                  orderWorkflowMode: kitchenForm.orderWorkflowMode,
                  autoAcceptConfig: {
                    enabled: kitchenForm.autoAcceptEnabled,
                    delaySeconds: Number(kitchenForm.autoAcceptDelaySeconds),
                  },
                })
              }
              isSaving={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'counter' && (
            <CounterTab
              counterForm={counterForm}
              setCounterForm={setCounterForm}
              onSave={() =>
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
              isSaving={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'customer' && (
            <CustomerTab
              slug={restaurant.slug}
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              onSave={() =>
                saveSettingsMutation.mutate({
                  uiSettings: {
                    displayItemImages: customerForm.displayItemImages,
                    enableDarkMode: customerForm.enableDarkMode,
                    defaultLanguage: customerForm.defaultLanguage,
                  },
                })
              }
              isSaving={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'billing' && (
            <BillingTab
              taxesList={taxesList}
              taxGroups={taxGroups}
              standaloneTaxes={standaloneTaxes}
              getSubTaxes={getSubTaxes}
              onOpenAddTaxModal={() => setShowAddTaxModal(true)}
              onApplyTaxPreset={(p) => applyTaxPresetMutation.mutate(p)}
              onDeleteTax={(tId) => deleteTaxMutation.mutate(tId)}
              billingForm={billingForm}
              setBillingForm={setBillingForm}
              onSaveBilling={() =>
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
              isSavingBilling={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'tables' && (
            <TablesTab
              restaurant={restaurant}
              tablesList={tablesList}
              zonesList={zonesList}
              onOpenAddTableModal={() => setShowAddTableModal(true)}
              onOpenBulkTableModal={() => setShowBulkTableModal(true)}
              onOpenAddZoneModal={() => setShowAddZoneModal(true)}
              onDeleteZone={(zId) => deleteZoneMutation.mutate(zId)}
              onDeleteTable={(tId) => deleteTableMutation.mutate(tId)}
              onRegenerateTableQr={(tId) => regenerateTableQrMutation.mutate(tId)}
            />
          )}

          {activeTab === 'menu' && (
            <MenuTab
              menuItemsList={menuItemsList}
              categoriesList={categoriesList}
              filteredDishes={filteredDishes}
              selectedMenuCategory={selectedMenuCategory}
              setSelectedMenuCategory={setSelectedMenuCategory}
              onOpenAddCategoryModal={() => setShowAddCategoryModal(true)}
              onOpenAddDishModal={() => setShowAddDishModal(true)}
              onSeedDemoMenu={() => seedDemoMenuMutation.mutate()}
              isSeedingMenu={seedDemoMenuMutation.isPending}
              onDeleteCategory={(cId) => deleteCategoryMutation.mutate(cId)}
              onDeleteDish={(dId) => deleteDishMutation.mutate(dId)}
            />
          )}

          {activeTab === 'hardware' && (
            <HardwareTab
              restaurant={restaurant}
              hardwareForm={hardwareForm}
              setHardwareForm={setHardwareForm}
              identityForm={identityForm}
              onSaveHardware={() =>
                saveSettingsMutation.mutate({
                  printerConfig: hardwareForm,
                  gstNumber: hardwareForm.gstNumber,
                  upiConfig: { upiId: hardwareForm.upiId },
                })
              }
              isSavingHardware={saveSettingsMutation.isPending}
              onTestPrint={handleTestPrint}
            />
          )}

          {activeTab === 'staff' && (
            <StaffTab
              staffList={staffList}
              revealPinForId={revealPinForId}
              setRevealPinForId={setRevealPinForId}
              onOpenAddStaffModal={() => {
                setStaffData({ name: '', email: '', password: '', role: 'MANAGER', pin: '', isActive: true });
                setShowAddStaffModal(true);
              }}
              onToggleStaffStatus={(sId, status) => updateStaffMutation.mutate({ staffId: sId, data: { isActive: !status } })}
              onOpenResetPasswordModal={(uId) => setShowResetPasswordModal(uId)}
              onDeleteStaff={(sId) => deleteStaffMutation.mutate(sId)}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab
              restaurant={restaurant}
              integrationForm={integrationForm}
              setIntegrationForm={setIntegrationForm}
              onSaveIntegrations={() =>
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
              isSavingIntegrations={saveSettingsMutation.isPending}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>

      {/* MODALS */}
      <SingleTableModal
        isOpen={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        singleTableData={singleTableData}
        setSingleTableData={setSingleTableData}
        onSubmit={() => createTableMutation.mutate(singleTableData)}
        isSubmitting={createTableMutation.isPending}
        zonesList={zonesList}
      />

      <BulkTableModal
        isOpen={showBulkTableModal}
        onClose={() => setShowBulkTableModal(false)}
        bulkTableData={bulkTableData}
        setBulkTableData={setBulkTableData}
        onSubmit={() => bulkCreateTablesMutation.mutate(bulkTableData)}
        isSubmitting={bulkCreateTablesMutation.isPending}
        zonesList={zonesList}
      />

      <ZoneModal
        isOpen={showAddZoneModal}
        onClose={() => setShowAddZoneModal(false)}
        zoneData={zoneData}
        setZoneData={setZoneData}
        onSubmit={() => createZoneMutation.mutate(zoneData)}
        isSubmitting={createZoneMutation.isPending}
      />

      <AddCategoryModal
        isOpen={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        categoryData={categoryData}
        setCategoryData={setCategoryData}
        onSubmit={() => createCategoryMutation.mutate(categoryData)}
        isSubmitting={createCategoryMutation.isPending}
      />

      <AddDishModal
        isOpen={showAddDishModal}
        onClose={() => setShowAddDishModal(false)}
        dishData={dishData}
        setDishData={setDishData}
        onSubmit={() => createDishMutation.mutate(dishData)}
        isSubmitting={createDishMutation.isPending}
        categoriesList={categoriesList}
      />

      <AddTaxModal
        isOpen={showAddTaxModal}
        onClose={() => setShowAddTaxModal(false)}
        taxData={taxData}
        setTaxData={setTaxData}
        onSubmit={() => createTaxMutation.mutate(taxData)}
        isSubmitting={createTaxMutation.isPending}
        taxGroups={taxGroups}
      />

      <AddStaffModal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        staffData={staffData}
        setStaffData={setStaffData}
        onSubmit={() => createStaffMutation.mutate(staffData)}
        isSubmitting={createStaffMutation.isPending}
      />

      <ResetPasswordModal
        isOpen={!!showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(null);
          setNewPassword('');
        }}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSubmit={() => resetPasswordMutation.mutate({ userId: showResetPasswordModal, password: newPassword })}
        isSubmitting={resetPasswordMutation.isPending}
      />
    </div>
  );
};

export default AdminRestaurantDetail;
