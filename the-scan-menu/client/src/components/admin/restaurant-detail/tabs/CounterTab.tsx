import React from 'react';
import { Monitor, ExternalLink, Save, Loader, ShoppingBag, Sliders } from 'lucide-react';
import { CounterFormData } from '../types';

interface CounterTabProps {
  counterForm: CounterFormData;
  setCounterForm: React.Dispatch<React.SetStateAction<CounterFormData>>;
  onSave: () => void;
  isSaving: boolean;
}

export const CounterTab: React.FC<CounterTabProps> = ({
  counterForm,
  setCounterForm,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-amber-500" />
            <span>Counter POS & Billing Workstation</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure counter cashier behavior, prepaid vs postpaid billing modes, fulfillment channels, and quick checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/counter"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Monitor className="w-3.5 h-3.5 text-slate-600" />
            <span>Launch Counter POS</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
            <span>Save Counter Config</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Billing Mode */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-slate-900 block mb-1">
              Primary Counter Billing Model
            </label>
            <p className="text-[11px] text-slate-500 mb-3">
              Select whether this outlet operates as a Pay-First fast food counter or Traditional Dine-in postpaid billing.
            </p>

            <div className="space-y-2.5">
              {[
                {
                  id: 'HYBRID',
                  title: 'Hybrid Mode (Dine-in Pay Later + Counter Pay First)',
                  desc: 'Customers can dine and pay after meals, or pay immediately at the counter.',
                },
                {
                  id: 'POSTPAID',
                  title: 'Traditional Dine-In (Postpaid)',
                  desc: 'Orders are accumulated onto dining tables; single final bill printed upon checkout.',
                },
                {
                  id: 'PREPAID',
                  title: 'Quick Counter QSR (Prepaid Pay-First)',
                  desc: 'Orders must be paid immediately before kitchen ticket generation (e.g. Cafe/QSR).',
                },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-start gap-3 transition ${
                    counterForm.activeMode === m.id
                      ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="activeMode"
                    value={m.id}
                    checked={counterForm.activeMode === m.id}
                    onChange={(e) => setCounterForm({ ...counterForm, activeMode: e.target.value as any })}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{m.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Fulfillment Channels & Controls */}
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Enabled Fulfillment Channels</span>
            </span>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={counterForm.enableTableOrdering}
                  onChange={(e) => setCounterForm({ ...counterForm, enableTableOrdering: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Dine-In Table Ordering Active</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={counterForm.enableTakeaway}
                  onChange={(e) => setCounterForm({ ...counterForm, enableTakeaway: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Takeaway / Parcel Pickup Channel Active</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={counterForm.enableDelivery}
                  onChange={(e) => setCounterForm({ ...counterForm, enableDelivery: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Delivery / Direct Dispatch Channel Active</span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Counter Checkout Rules</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Minimum Order Value (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={counterForm.minOrderAmount}
                  onChange={(e) => setCounterForm({ ...counterForm, minOrderAmount: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Special Instructions
                </label>
                <label className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={counterForm.allowSpecialInstructions}
                    onChange={(e) => setCounterForm({ ...counterForm, allowSpecialInstructions: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Allow Custom Chef Notes</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
