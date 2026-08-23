import React from 'react';

interface FeatureFlagsTabProps {
  flagsList: any[];
  onToggleFlag: (flagKey: string, isEnabled: boolean) => void;
  isToggling: boolean;
}

export const FeatureFlagsTab: React.FC<FeatureFlagsTabProps> = ({
  flagsList,
  onToggleFlag,
  isToggling,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
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
                    onClick={() => onToggleFlag(flag.key, !isFlagActive)}
                    disabled={isToggling}
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
  );
};
