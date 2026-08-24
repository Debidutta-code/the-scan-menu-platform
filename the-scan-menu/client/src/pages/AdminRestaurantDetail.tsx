import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, managerService, OutletSetupAuditResult, Table, MenuItem, Staff } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import { Loader } from 'lucide-react';

// Modular Header & Sidebar
import {
  AdminTab,
  CounterFormData,
  CustomerFormData,
  IntegrationFormData,
} from '../components/admin/restaurant-detail/types';
import { AdminRestaurantHeader } from '../components/admin/restaurant-detail/AdminRestaurantHeader';
import { AdminRestaurantSidebar } from '../components/admin/restaurant-detail/AdminRestaurantSidebar';

// Shared Settings Components (Reusing Proven Manager UI)
import {
  StoreProfileSection,
  PrinterStudioSection,
  TaxManagementSection,
  PaymentSettingsSection,
  ThemeBrandingSection,
  WorkflowAutomationSection,
} from '../components/settings';

// Shared Management Views (Reusing Proven Manager UI)
import { ManagerTables } from './ManagerTables';
import { ManagerStaff } from './ManagerStaff';
import { ManagerMenu } from './ManagerMenu';

// Specific SuperAdmin Management Tabs
import { ChecklistTab } from '../components/admin/restaurant-detail/tabs/ChecklistTab';
import { FeatureFlagsTab } from '../components/admin/restaurant-detail/tabs/FeatureFlagsTab';
import { CounterTab } from '../components/admin/restaurant-detail/tabs/CounterTab';
import { CustomerTab } from '../components/admin/restaurant-detail/tabs/CustomerTab';
import { IntegrationsTab } from '../components/admin/restaurant-detail/tabs/IntegrationsTab';

export const AdminRestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const { data: menuItemsResponse } = useQuery({
    queryKey: ['adminMenuItems', id],
    queryFn: () => managerService.listMenuItems(id!),
    enabled: !!id,
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['adminCategories', id],
    queryFn: () => managerService.listCategories(id!),
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
  const categoriesList = useMemo(() => categoriesResponse?.data || [], [categoriesResponse?.data]);
  const menuItemsList: MenuItem[] = useMemo(() => menuItemsResponse?.data || [], [menuItemsResponse?.data]);
  const flagsList = useMemo(() => flagsResponse?.data || [], [flagsResponse?.data]);

  // Form States for Direct SuperAdmin Configuration
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

  const [integrationForm, setIntegrationForm] = useState<IntegrationFormData>({
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
      const s = restaurant.settings;

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
    queryClient.invalidateQueries({ queryKey: ['managerTables', id] });
    queryClient.invalidateQueries({ queryKey: ['managerStaff', id] });
    queryClient.invalidateQueries({ queryKey: ['categories', id] });
    queryClient.invalidateQueries({ queryKey: ['menuItems', id] });
    queryClient.invalidateQueries({ queryKey: ['managerTaxes', id] });
    queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', id] });
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
      toast('Starter Demo Menu seeded successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to seed demo menu', 'error');
    },
  });

  const applyTaxPresetMutation = useMutation({
    mutationFn: (preset: 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE') => adminService.applyTaxPreset(id!, preset),
    onSuccess: () => {
      invalidateAll();
      toast('Tax preset applied successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to apply tax preset', 'error');
    },
  });

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast(`${keyName} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoadingRest || isLoadingAudit) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <span className="text-xs font-mono text-slate-500">Loading outlet configuration...</span>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <h3 className="font-bold text-slate-800 text-lg">Restaurant not found</h3>
        <button
          onClick={() => navigate('/admin/setup-hub')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Return to Setup Hub
        </button>
      </div>
    );
  }

  const activeFlagsCount = flagsList.filter((f: any) => f.isEnabled).length;

  return (
    <div className="w-full space-y-6 font-sans pb-16">
      {/* Header */}
      <AdminRestaurantHeader
        restaurant={restaurant}
        audit={audit}
        setActiveTab={setActiveTab}
      />

      {/* Main Workstation Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Nav */}
        <AdminRestaurantSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          audit={audit}
          activeFlagsCount={activeFlagsCount}
          tablesCount={tablesList.length}
          menuItemsCount={menuItemsList.length}
          staffCount={staffList.length}
          kitchenForm={{ orderWorkflowMode: restaurant.orderWorkflowMode || 'FIVE_STEP' } as any}
          counterForm={counterForm}
          hardwareForm={{ paperWidth: '80mm' } as any}
        />

        {/* Dynamic Tab Workspace */}
        <div className="flex-1 w-full min-w-0">
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
              onApplyTaxPreset={(preset) => applyTaxPresetMutation.mutate(preset)}
              isApplyingTax={applyTaxPresetMutation.isPending}
            />
          )}

          {activeTab === 'identity' && (
            <div className="space-y-6">
              <StoreProfileSection restaurantId={id} isSuperAdminEdit={true} onSaved={invalidateAll} />
              <ThemeBrandingSection restaurantId={id} onSaved={invalidateAll} />
            </div>
          )}

          {activeTab === 'flags' && (
            <FeatureFlagsTab
              flagsList={flagsList}
              onToggleFlag={(key, enabled) => toggleFlagMutation.mutate({ flagKey: key, isEnabled: enabled })}
              isToggling={toggleFlagMutation.isPending}
            />
          )}

          {activeTab === 'kitchen' && (
            <WorkflowAutomationSection restaurantId={id} onSaved={invalidateAll} />
          )}

          {activeTab === 'counter' && (
            <CounterTab
              counterForm={counterForm}
              setCounterForm={setCounterForm}
              onSave={() =>
                saveSettingsMutation.mutate({
                  orderConfig: {
                    enableTableOrdering: counterForm.enableTableOrdering,
                    enableTakeaway: counterForm.enableTakeaway,
                    enableDelivery: counterForm.enableDelivery,
                    minOrderAmount: Number(counterForm.minOrderAmount),
                    allowSpecialInstructions: counterForm.allowSpecialInstructions,
                  },
                  paymentConfig: {
                    activeMode: counterForm.activeMode,
                  },
                })
              }
              isSaving={saveSettingsMutation.isPending}
            />
          )}

          {activeTab === 'customer' && (
            <CustomerTab
              slug={restaurant?.slug || ''}
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

          {activeTab === 'tables' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm">
              <ManagerTables restaurantId={id} />
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm">
              <ManagerMenu restaurantId={id} />
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <TaxManagementSection restaurantId={id} onSaved={invalidateAll} />
              <PaymentSettingsSection restaurantId={id} onSaved={invalidateAll} />
            </div>
          )}

          {activeTab === 'hardware' && (
            <PrinterStudioSection restaurantId={id} onSaved={invalidateAll} />
          )}

          {activeTab === 'staff' && (
            <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm">
              <ManagerStaff restaurantId={id} />
            </div>
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
    </div>
  );
};

export default AdminRestaurantDetail;
