import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  StoreProfileSection,
  AppInstallSection,
  PrinterStudioSection,
  PaymentSettingsSection,
  ThemeBrandingSection,
  WorkflowAutomationSection,
  NotificationPreferencesSection,
  SocialChannelsSection,
} from '../components/settings';

type TabType =
  | 'general'
  | 'app_install'
  | 'printers'
  | 'payments'
  | 'theme'
  | 'workflow'
  | 'notifications'
  | 'social';

export const ManagerSettings: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<TabType>('general');

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
    { id: 'app_install', label: 'Desktop & Mobile App', icon: <Download className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, badge: 'PWA' },
    { id: 'printers', label: 'Printer & Receipts', icon: <Printer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />, show: isEnabled('ordering') || isEnabled('pos') },
    { id: 'payments', label: 'Payments & Channels', icon: <CreditCard className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('payments') },
    { id: 'theme', label: 'Theme & Branding', icon: <Palette className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('white_label') },
    { id: 'workflow', label: 'Order Workflow', icon: <GitBranch className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('ordering') },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('ordering') || isEnabled('waiter_call') || isEnabled('kds') },
    { id: 'social', label: 'Social Channels', icon: <Globe className="w-4 h-4" strokeWidth={1.75} />, show: isEnabled('marketing') || isEnabled('crm') },
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
        <aside className="w-full md:w-64 bg-white rounded-3xl border border-slate-150 p-2 shadow-sm shrink-0 md:sticky md:top-0">
          <nav className="flex md:flex-col gap-1">
            {filteredTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
          {activeTab === 'general' && <StoreProfileSection restaurantId={activeRestaurantId} />}
          {activeTab === 'app_install' && <AppInstallSection />}
          {activeTab === 'printers' && <PrinterStudioSection restaurantId={activeRestaurantId} />}
          {activeTab === 'payments' && <PaymentSettingsSection restaurantId={activeRestaurantId} />}
          {activeTab === 'theme' && <ThemeBrandingSection restaurantId={activeRestaurantId} />}
          {activeTab === 'workflow' && <WorkflowAutomationSection restaurantId={activeRestaurantId} />}
          {activeTab === 'notifications' && <NotificationPreferencesSection restaurantId={activeRestaurantId} />}
          {activeTab === 'social' && <SocialChannelsSection restaurantId={activeRestaurantId} />}
        </main>
      </div>
    </div>
  );
};

export default ManagerSettings;
