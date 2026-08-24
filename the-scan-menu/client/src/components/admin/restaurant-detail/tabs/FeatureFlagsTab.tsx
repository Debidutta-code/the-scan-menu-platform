import React, { useState, useMemo } from 'react';
import {
  ToggleRight,
  Sparkles,
  Search,
  Filter,
  Layers,
  Utensils,
  CreditCard,
  Printer,
} from 'lucide-react';

interface FeatureFlagsTabProps {
  flagsList: any[];
  onToggleFlag: (flagKey: string, isEnabled: boolean) => void;
  isToggling: boolean;
}

type FlagCategory = 'ALL' | 'ORDERING' | 'PAYMENTS' | 'HARDWARE' | 'MARKETING';

export const FeatureFlagsTab: React.FC<FeatureFlagsTabProps> = ({
  flagsList,
  onToggleFlag,
  isToggling,
}) => {
  const [activeCategory, setActiveCategory] = useState<FlagCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');

  // Categorization mapping
  const categorizeFlag = (key: string): FlagCategory => {
    if (['ordering', 'kds', 'waiter_call', 'table_qr'].some((k) => key.includes(k))) return 'ORDERING';
    if (['payments', 'pos', 'taxes', 'billing', 'wallet'].some((k) => key.includes(k))) return 'PAYMENTS';
    if (['printer', 'hardware', 'kot'].some((k) => key.includes(k))) return 'HARDWARE';
    if (['marketing', 'crm', 'loyalty', 'white_label', 'api_webhooks', 'customer_display'].some((k) => key.includes(k))) return 'MARKETING';
    return 'ORDERING';
  };

  const categorizedFlags = useMemo(() => {
    return flagsList.map((f) => ({
      ...f,
      category: categorizeFlag(f.key || ''),
      isActive: f.enabled === true || f.isEnabled === true,
    }));
  }, [flagsList]);

  // Filtered List
  const filteredFlags = useMemo(() => {
    return categorizedFlags.filter((f) => {
      if (activeCategory !== 'ALL' && f.category !== activeCategory) return false;
      if (statusFilter === 'ENABLED' && !f.isActive) return false;
      if (statusFilter === 'DISABLED' && f.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.key?.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [categorizedFlags, activeCategory, statusFilter, searchQuery]);

  const totalCount = categorizedFlags.length;
  const activeCount = categorizedFlags.filter((f) => f.isActive).length;
  const completionPercentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      {/* Header with Completion Metric */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Feature Capability Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Govern tenant module access and unlock specialized restaurant capabilities.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Matrix Health</span>
            <span className="text-xs font-black text-slate-900">
              {activeCount} of {totalCount} Modules Active
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs font-mono shadow-2xs">
            {completionPercentage}%
          </div>
        </div>
      </div>

      {/* Segmented Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 overflow-x-auto max-w-full">
          {([
            { id: 'ALL', label: 'All Modules', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'ORDERING', label: 'Ordering & KDS', icon: <Utensils className="w-3.5 h-3.5" /> },
            { id: 'PAYMENTS', label: 'Payments & POS', icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: 'HARDWARE', label: 'Hardware & Print', icon: <Printer className="w-3.5 h-3.5" /> },
            { id: 'MARKETING', label: 'Growth & Branding', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ] as const).map((cat) => {
            const isSelected = activeCategory === cat.id;
            const count =
              cat.id === 'ALL'
                ? totalCount
                : categorizedFlags.filter((f) => f.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-900 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium w-44"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ENABLED">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Grid of Flag Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFlags.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-bold text-xs">No matching features found</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Try clearing filters or search keywords.</p>
          </div>
        ) : (
          filteredFlags.map((flag) => {
            const isFlagActive = flag.isActive;
            return (
              <div
                key={flag.key}
                className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isFlagActive
                    ? 'bg-slate-50/80 border-slate-300 shadow-2xs hover:border-slate-400'
                    : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {flag.category}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{flag.name}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFlag(flag.key, !isFlagActive)}
                      disabled={isToggling}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        isFlagActive ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      title={isFlagActive ? 'Click to disable' : 'Click to enable'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-2xs transition-transform ${
                          isFlagActive ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    {flag.description || 'Module capability toggle.'}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 font-semibold truncate max-w-[150px]">{flag.key}</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      isFlagActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isFlagActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
