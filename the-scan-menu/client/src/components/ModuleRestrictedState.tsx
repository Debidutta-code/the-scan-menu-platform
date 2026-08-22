import React from 'react';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModuleRestrictedStateProps {
  featureName: string;
  featureKey?: string;
  description?: string;
}

export const ModuleRestrictedState: React.FC<ModuleRestrictedStateProps> = ({
  featureName,
  featureKey,
  description,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-6 shadow-sm">
        <Lock className="w-8 h-8" strokeWidth={2} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-3">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        <span>Module Inactive {featureKey ? `(${featureKey})` : ''}</span>
      </div>

      <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">
        {featureName} is Not Enabled
      </h2>

      <p className="text-sm text-slate-500 max-w-md mb-8">
        {description ||
          `This module is currently deactivated for this restaurant outlet or not included in your active subscription tier. Please contact your platform administrator to activate it.`}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
        <button
          onClick={() => navigate('/manager/settings')}
          className="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
        >
          <span>Outlet Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ModuleRestrictedState;
