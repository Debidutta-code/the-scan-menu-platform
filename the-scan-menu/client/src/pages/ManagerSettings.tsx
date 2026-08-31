import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import {
  Settings,
  GitBranch,
  CreditCard,
  Palette,
  Store,
  Bell,
  Globe,
  ChevronRight,
  Printer,
  Download,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import {
  StoreProfileSection,
  TaxManagementSection,
  AppInstallSection,
  PrinterStudioSection,
  PaymentSettingsSection,
  DisplayPreferencesSection,
  WorkflowAutomationSection,
  NotificationPreferencesSection,
  SocialChannelsSection,
} from '../components/settings';

type TabType =
  | 'general'
  | 'taxes'
  | 'payments'
  | 'printers'
  | 'workflow'
  | 'display'
  | 'notifications'
  | 'app_install'
  | 'social';

export const ManagerSettings: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as TabType;
  const initialTab: TabType = (tabParam && [
    'general',
    'taxes',
    'payments',
    'printers',
    'workflow',
    'display',
    'notifications',
    'app_install',
    'social',
  ].includes(tabParam)) ? tabParam : 'general';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const currentTabParam = searchParams.get('tab') as TabType;
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [searchParams, activeTab]);

  const handleTabSelect = (tabId: TabType) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3 animate-pulse" />
        <h3 className="font-bold text-slate-800">No Restaurant Configured</h3>
      </div>
    );
  }

  const tabsNav: { id: TabType; label: string; icon: React.ReactNode; badge?: string; show?: boolean }[] = [
    { id: 'general', label: 'Store Profile', icon: <Store className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'taxes', label: 'Taxes & GST Rules', icon: <Calculator className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, show: isEnabled('ordering') },
    { id: 'payments', label: 'Payments & Channels', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('payments') },
    { id: 'printers', label: 'Printer & Receipts', icon: <Printer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, show: isEnabled('ordering') || isEnabled('pos') },
    { id: 'workflow', label: 'Order Workflow', icon: <GitBranch className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('ordering') },
    { id: 'display', label: 'Display & Interface', icon: <Palette className="w-4 h-4 text-amber-500" strokeWidth={1.75} /> },
    { id: 'notifications', label: 'Notifications & Audio', icon: <Bell className="w-4 h-4 text-amber-500" strokeWidth={1.75} /> },
    { id: 'app_install', label: 'Desktop & Mobile App', icon: <Download className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, badge: 'PWA' },
    { id: 'social', label: 'Social Channels', icon: <Globe className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('marketing') || isEnabled('crm') },
  ];

  const filteredTabs = tabsNav.filter((t) => t.show !== false);

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 font-sans select-none pb-8">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 md:px-5 shadow-xs shrink-0">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <span>Restaurant Operations Settings</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Manage store profile, tax rules, payment gateways, thermal printers, notifications, and workflow automation.
          </p>
        </div>
      </div>

      {/* Main Tabbed Grid Layout */}
      <div className="flex flex-col md:flex-row gap-3.5 sm:gap-4 items-start">
        {/* ----------------- SIDEBAR SUB-NAVIGATION ----------------- */}
        <aside className="w-full md:w-56 bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs shrink-0 md:sticky md:top-2">
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible scrollbar-none">
            {filteredTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 md:shrink ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tab.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3 h-3 transition-transform hidden md:block ${
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
          {activeTab === 'general' && <StoreProfileSection restaurantId={activeRestaurantId} />}
          {activeTab === 'taxes' && <TaxManagementSection restaurantId={activeRestaurantId} />}
          {activeTab === 'payments' && <PaymentSettingsSection restaurantId={activeRestaurantId} />}
          {activeTab === 'printers' && <PrinterStudioSection restaurantId={activeRestaurantId} />}
          {activeTab === 'workflow' && <WorkflowAutomationSection restaurantId={activeRestaurantId} />}
          {activeTab === 'display' && <DisplayPreferencesSection restaurantId={activeRestaurantId} />}
          {activeTab === 'notifications' && <NotificationPreferencesSection restaurantId={activeRestaurantId} />}
          {activeTab === 'app_install' && <AppInstallSection />}
          {activeTab === 'social' && <SocialChannelsSection restaurantId={activeRestaurantId} />}
        </main>
      </div>
    </div>
  );
};

export default ManagerSettings;
