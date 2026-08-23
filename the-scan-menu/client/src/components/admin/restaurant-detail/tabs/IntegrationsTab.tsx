import React from 'react';
import { Plug, Save, Loader, Copy, Check } from 'lucide-react';
import { IntegrationFormData } from '../types';
import { Restaurant } from '../../../../services/restaurant.service';

interface IntegrationsTabProps {
  restaurant: Restaurant;
  integrationForm: IntegrationFormData;
  setIntegrationForm: React.Dispatch<React.SetStateAction<IntegrationFormData>>;
  onSaveIntegrations: () => void;
  isSavingIntegrations: boolean;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  restaurant,
  integrationForm,
  setIntegrationForm,
  onSaveIntegrations,
  isSavingIntegrations,
  copiedKey,
  onCopy,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900">External POS Bridge (Petpooja & UrbanPiper)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-way menu synchronization and live order dispatch into physical POS terminals.
          </p>
        </div>

        <button
          onClick={onSaveIntegrations}
          disabled={isSavingIntegrations}
          className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          {isSavingIntegrations ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
          <span>Save Integration Bridge</span>
        </button>
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-700">Select Integration Provider</label>
        <select
          value={integrationForm.provider}
          onChange={(e) => setIntegrationForm({ ...integrationForm, provider: e.target.value })}
          className="w-full sm:w-80 mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
        >
          <option value="NONE">None (Standalone Cloud Mode)</option>
          <option value="PETPOOJA">Petpooja POS Terminal</option>
          <option value="URBANPIPER">UrbanPiper Hub</option>
        </select>
      </div>

      {integrationForm.provider === 'PETPOOJA' && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
            <Plug className="w-4 h-4 text-amber-500" />
            <span>Petpooja API Configuration</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Rest ID *</label>
              <input
                type="text"
                value={integrationForm.petpoojaRestId}
                onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaRestId: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">App Key *</label>
              <input
                type="text"
                value={integrationForm.petpoojaAppKey}
                onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppKey: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">App Secret *</label>
              <input
                type="password"
                value={integrationForm.petpoojaAppSecret}
                onChange={(e) => setIntegrationForm({ ...integrationForm, petpoojaAppSecret: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Webhook Endpoint */}
          <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Petpooja Inbound Webhook URL:</span>
              <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                https://api.thescanmenu.com/api/v1/pos/webhook/petpooja/{restaurant._id}
              </p>
            </div>
            <button
              onClick={() => onCopy(`https://api.thescanmenu.com/api/v1/pos/webhook/petpooja/${restaurant._id}`, 'petpooja_webhook')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              {copiedKey === 'petpooja_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'petpooja_webhook' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
