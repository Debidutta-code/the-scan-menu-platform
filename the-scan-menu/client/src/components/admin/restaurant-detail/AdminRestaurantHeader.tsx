import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, ExternalLink, LogIn, AlertTriangle, ChevronRight } from 'lucide-react';
import { Restaurant, OutletSetupAuditResult } from '../../../services/restaurant.service';
import { useAuth } from '../../../hooks/useAuth';
import { AdminTab } from './types';

interface AdminRestaurantHeaderProps {
  restaurant: Restaurant;
  audit?: OutletSetupAuditResult;
  setActiveTab: (tab: AdminTab) => void;
}

export const AdminRestaurantHeader: React.FC<AdminRestaurantHeaderProps> = ({
  restaurant,
  audit,
  setActiveTab,
}) => {
  const navigate = useNavigate();
  const { impersonateOutlet } = useAuth();

  const progress = audit?.overallPercentage ?? 0;
  const isReady = audit?.isReadyForService ?? false;

  return (
    <div className="space-y-4">
      {/* TOP MASTER BAR */}
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
                {(restaurant as any).status || (restaurant.isActive ? 'ACTIVE' : 'INACTIVE')}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Slug: <span className="text-amber-400">/r/{restaurant.slug}</span> • Code: {(restaurant as any).code || 'RST-MAIN'}
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
    </div>
  );
};
