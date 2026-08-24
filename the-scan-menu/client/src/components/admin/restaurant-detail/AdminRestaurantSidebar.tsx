import React from 'react';
import {
  CheckCircle2,
  Store,
  ToggleRight,
  ChefHat,
  Monitor,
  Tv,
  Utensils,
  TableProperties,
  CreditCard,
  Calculator,
  Printer,
  Users,
  Plug,
} from 'lucide-react';
import { AdminTab, KitchenFormData, CounterFormData, HardwareFormData } from './types';
import { OutletSetupAuditResult } from '../../../services/restaurant.service';

interface AdminRestaurantSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  audit?: OutletSetupAuditResult;
  flagsList?: any[];
  tablesCount: number;
  menuItemsCount: number;
  staffCount: number;
  kitchenForm: KitchenFormData;
  counterForm: CounterFormData;
  hardwareForm: HardwareFormData;
}

export const AdminRestaurantSidebar: React.FC<AdminRestaurantSidebarProps> = ({
  activeTab,
  setActiveTab,
  audit,
  flagsList = [],
  tablesCount,
  menuItemsCount,
  staffCount,
  kitchenForm,
  counterForm,
  hardwareForm,
}) => {
  const progress = audit?.overallPercentage ?? 0;
  const isReady = audit?.isReadyForService ?? false;

  // Feature Flag Helper
  const isEnabled = (key: string): boolean => {
    if (!flagsList || flagsList.length === 0) return true; // fallback if flags not loaded yet
    const flag = flagsList.find((f: any) => f.key === key);
    if (!flag) return false;
    return flag.enabled === true || flag.isEnabled === true;
  };

  const activeFlagsCount = flagsList.filter((f: any) => f.enabled === true || f.isEnabled === true).length;

  // Feature flag gates for each section
  const showKitchen = isEnabled('kds') || isEnabled('ordering');
  const showCounter = isEnabled('pos') || isEnabled('ordering');
  const showCustomer = isEnabled('customer_display');
  const hasStationConfigs = showKitchen || showCounter || showCustomer;

  const showMenu = isEnabled('qr_menu');
  const showTables = isEnabled('ordering') || isEnabled('qr_menu') || isEnabled('waiter_call');
  const hasMenuLayout = showMenu || showTables;

  const showTaxes = isEnabled('ordering') || isEnabled('pos') || isEnabled('payments');
  const showPayments = isEnabled('payments') || isEnabled('pos');
  const showHardware = isEnabled('ordering') || isEnabled('pos') || isEnabled('kds');
  const hasBilling = showTaxes || showPayments || showHardware;

  const showIntegrations = isEnabled('pos_integration') || isEnabled('api_access') || isEnabled('api_webhooks');

  return (
    <aside className="w-full lg:w-80 xl:w-[330px] shrink-0 h-full flex flex-col min-h-0">
      <div className="bg-white border border-slate-150 rounded-3xl p-3.5 shadow-sm h-full flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 text-xs">
          {/* Group 1: Overview & Audit (Always Visible) */}
          <div>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
              Overview & Audit
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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

          {/* Group 2: Core Store & Flags (Always Visible) */}
          <div>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
              Core Configuration
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('identity')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                type="button"
                onClick={() => setActiveTab('flags')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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

          {/* Group 3: Station Configurations (Gated by KDS, POS, Customer Display) */}
          {hasStationConfigs && (
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                Station Configurations
              </span>
              <div className="mt-1 space-y-0.5">
                {showKitchen && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('kitchen')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                )}

                {showCounter && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('counter')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                )}

                {showCustomer && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('customer')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                )}
              </div>
            </div>
          )}

          {/* Group 4: Menu & Floor Layout (Gated by QR Menu / Ordering) */}
          {hasMenuLayout && (
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                Menu & Floor Layout
              </span>
              <div className="mt-1 space-y-0.5">
                {showMenu && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('menu')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                      {menuItemsCount} items
                    </span>
                  </button>
                )}

                {showTables && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('tables')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                      {tablesCount} tables
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Group 5: Finance & Hardware (Gated by Payments, POS, Ordering) */}
          {hasBilling && (
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
                Billing & POS Hardware
              </span>
              <div className="mt-1 space-y-0.5">
                {showTaxes && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('taxes')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
                      activeTab === 'taxes'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calculator className={`w-4 h-4 ${activeTab === 'taxes' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Tax Rates & GST</span>
                    </div>
                  </button>
                )}

                {showPayments && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
                      activeTab === 'payments'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className={`w-4 h-4 ${activeTab === 'payments' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Payment Gateways</span>
                    </div>
                  </button>
                )}

                {showHardware && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('hardware')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
                      activeTab === 'hardware'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Printer className={`w-4 h-4 ${activeTab === 'hardware' ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>Thermal POS Printers</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                      {hardwareForm.paperWidth}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Group 6: Team & Integrations */}
          <div>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 px-3">
              Staff & Integrations
            </span>
            <div className="mt-1 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
                  {staffCount}
                </span>
              </button>

              {showIntegrations && (
                <button
                  type="button"
                  onClick={() => setActiveTab('integrations')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold transition text-left cursor-pointer ${
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
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Mini Status */}
        <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-2xl shrink-0 mt-2">
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
  );
};
