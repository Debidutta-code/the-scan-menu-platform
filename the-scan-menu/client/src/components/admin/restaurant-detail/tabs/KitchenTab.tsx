import React from 'react';
import { ChefHat, Monitor, ExternalLink, Save, Loader, Clock, Volume2 } from 'lucide-react';
import { KitchenFormData } from '../types';

interface KitchenTabProps {
  kitchenForm: KitchenFormData;
  setKitchenForm: React.Dispatch<React.SetStateAction<KitchenFormData>>;
  onSave: () => void;
  isSaving: boolean;
}

export const KitchenTab: React.FC<KitchenTabProps> = ({
  kitchenForm,
  setKitchenForm,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-amber-500" />
            <span>Kitchen & KDS Engine Configuration</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure order preparation pipeline, auto-acceptance delays, kitchen station bump rules, and audio chimes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/kds"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Monitor className="w-3.5 h-3.5 text-amber-600" />
            <span>Launch KDS Screen</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
            <span>Save Kitchen Config</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline Mode */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-900 block mb-1">
              Order Fulfillment Pipeline (Workflow Mode)
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Determines the lifecycle steps every order passes through from kitchen preparation to guest serving.
            </p>

            <div className="space-y-2.5">
              {[
                {
                  id: 'FIVE_STEP',
                  title: 'Five-Step Standard Dine-In',
                  desc: 'Received ➔ Confirmed ➔ In Preparation ➔ Ready for Pickup ➔ Served',
                },
                {
                  id: 'FOUR_STEP',
                  title: 'Four-Step Fast Casual',
                  desc: 'Received ➔ Preparing ➔ Ready for Pickup ➔ Served',
                },
                {
                  id: 'THREE_STEP',
                  title: 'Three-Step Express Counter',
                  desc: 'Received ➔ In Kitchen ➔ Order Fulfilled',
                },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    kitchenForm.orderWorkflowMode === mode.id
                      ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="orderWorkflowMode"
                    value={mode.id}
                    checked={kitchenForm.orderWorkflowMode === mode.id}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, orderWorkflowMode: e.target.value as any })}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{mode.title}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Auto Accept & Kitchen Display Alerts */}
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Automated Order Confirmation</span>
            </span>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={kitchenForm.autoAcceptEnabled}
                onChange={(e) => setKitchenForm({ ...kitchenForm, autoAcceptEnabled: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Automatically accept incoming customer orders</span>
            </label>

            {kitchenForm.autoAcceptEnabled && (
              <div className="pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Auto-Accept Delay (Seconds)
                </label>
                <select
                  value={kitchenForm.autoAcceptDelaySeconds}
                  onChange={(e) => setKitchenForm({ ...kitchenForm, autoAcceptDelaySeconds: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value={0}>0s (Instant Acceptance)</option>
                  <option value={30}>30 Seconds Delay</option>
                  <option value={60}>60 Seconds Delay</option>
                  <option value={120}>2 Minutes Delay</option>
                </select>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-purple-600" />
              <span>Kitchen Sound Alerts & Bump Thresholds</span>
            </span>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kitchenForm.kdsSoundAlerts}
                  onChange={(e) => setKitchenForm({ ...kitchenForm, kdsSoundAlerts: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Play Audio Chime when new ticket arrives on KDS</span>
              </label>

              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-600">
                  Preparation Warning Threshold (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={kitchenForm.prepWarningThresholdMinutes}
                  onChange={(e) => setKitchenForm({ ...kitchenForm, prepWarningThresholdMinutes: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Tickets turn red when preparation time exceeds this duration.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
