import React from 'react';
import { Sparkles, Check, CheckCircle2, XCircle, ChevronRight, Loader } from 'lucide-react';
import { OutletSetupAuditResult } from '../../../../services/restaurant.service';
import { AdminTab } from '../types';

interface ChecklistTabProps {
  audit?: OutletSetupAuditResult;
  tablesCount: number;
  menuItemsCount: number;
  categoriesCount: number;
  staffCount: number;
  setActiveTab: (tab: AdminTab) => void;
  onSeedDemoMenu: () => void;
  isSeedingMenu: boolean;
  onApplyTaxPreset: (preset: 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE') => void;
  isApplyingTax: boolean;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  audit,
  tablesCount,
  menuItemsCount,
  categoriesCount,
  staffCount,
  setActiveTab,
  onSeedDemoMenu,
  isSeedingMenu,
  onApplyTaxPreset,
  isApplyingTax,
}) => {
  const progress = audit?.overallPercentage ?? 0;
  const isReady = audit?.isReadyForService ?? false;

  return (
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
              onClick={onSeedDemoMenu}
              disabled={isSeedingMenu || menuItemsCount > 0}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSeedingMenu ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              <span>{menuItemsCount > 0 ? '✓ Menu Catalog Seeded' : 'Seed Starter Menu (12 Dishes)'}</span>
            </button>

            <button
              onClick={() => onApplyTaxPreset('GST_5')}
              disabled={isApplyingTax}
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
              <p className="text-lg font-black text-slate-900">{tablesCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Dishes</span>
              <p className="text-lg font-black text-slate-900">{menuItemsCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Categories</span>
              <p className="text-lg font-black text-slate-900">{categoriesCount}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Staff</span>
              <p className="text-lg font-black text-slate-900">{staffCount}</p>
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
  );
};
