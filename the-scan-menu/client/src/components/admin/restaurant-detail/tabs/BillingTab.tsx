import React from 'react';
import { Plus, Trash2, Smartphone, CreditCard, Save, Loader } from 'lucide-react';
import { Tax } from '../../../../services/restaurant.service';
import { BillingFormData } from '../types';

interface BillingTabProps {
  taxesList: Tax[];
  taxGroups: Tax[];
  standaloneTaxes: Tax[];
  getSubTaxes: (groupId: string) => Tax[];
  onOpenAddTaxModal: () => void;
  onApplyTaxPreset: (preset: 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE') => void;
  onDeleteTax: (taxId: string) => void;
  billingForm: BillingFormData;
  setBillingForm: React.Dispatch<React.SetStateAction<BillingFormData>>;
  onSaveBilling: () => void;
  isSavingBilling: boolean;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  taxesList,
  taxGroups,
  standaloneTaxes,
  getSubTaxes,
  onOpenAddTaxModal,
  onApplyTaxPreset,
  onDeleteTax,
  billingForm,
  setBillingForm,
  onSaveBilling,
  isSavingBilling,
}) => {
  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      {/* TAXES SECTION */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">Tax Rates & GST Rules</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure GST Groups, CGST/SGST breakdowns, or apply standard 1-click presets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenAddTaxModal}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Custom Tax</span>
            </button>
          </div>
        </div>

        {/* 1-Click Tax Presets */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">1-Click Presets</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Quickly apply standard national tax rules</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onApplyTaxPreset('GST_5')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
            >
              GST 5% (Restaurant Std)
            </button>

            <button
              onClick={() => onApplyTaxPreset('GST_18')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
            >
              GST 18% (AC/Bar)
            </button>

            <button
              onClick={() => onApplyTaxPreset('VAT_10')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs"
            >
              VAT 10%
            </button>

            <button
              onClick={() => onApplyTaxPreset('NONE')}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-xl transition shadow-2xs"
            >
              Clear (0%)
            </button>
          </div>
        </div>

        {/* Hierarchical Tax Groups & Rules */}
        <div className="space-y-4">
          {taxGroups.map((group) => {
            const subTaxes = getSubTaxes(group._id);
            return (
              <div key={group._id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50/90 px-4 py-3 flex items-center justify-between border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">{group.name}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full">
                      TAX GROUP ({group.percentage}%)
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteTax(group._id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete Tax Group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 divide-y divide-slate-100 bg-white">
                  {subTaxes.map((st) => (
                    <div key={st._id} className="py-2 px-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{st.name}</span>
                      <span className="font-mono font-bold text-slate-900">{st.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Standalone Taxes */}
          {standaloneTaxes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {standaloneTaxes.map((tax) => (
                <div key={tax._id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-extrabold text-xs text-slate-900">{tax.name}</span>
                    <p className="text-sm font-black font-mono text-amber-600 mt-1">{tax.percentage}%</p>
                  </div>
                  <button
                    onClick={() => onDeleteTax(tax._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {taxesList.length === 0 && (
            <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No tax rules configured. Click "GST 5%" above to apply default restaurant tax.
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT GATEWAYS SECTION */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900">Payment Gateways & Tenders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure digital checkout gateways, UPI IDs, and cash tenders.</p>
          </div>

          <button
            onClick={onSaveBilling}
            disabled={isSavingBilling}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSavingBilling ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
            <span>Save Billing Settings</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Default Tax Fallback Rate (%)</label>
            <input
              type="number"
              value={billingForm.taxRatePercent}
              onChange={(e) => setBillingForm({ ...billingForm, taxRatePercent: Number(e.target.value) })}
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">GSTIN / Tax ID Number</label>
            <input
              type="text"
              placeholder="e.g. 29AAAAA0000A1Z5"
              value={billingForm.gstNumber}
              onChange={(e) => setBillingForm({ ...billingForm, gstNumber: e.target.value })}
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        {/* Accepted Methods */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 mb-2 block">Accepted Tender Modes</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'cash', label: 'Cash at Counter', state: billingForm.cash },
              { key: 'card', label: 'Credit / Debit Card', state: billingForm.card },
              { key: 'upi', label: 'Direct UPI QR', state: billingForm.upi },
              { key: 'razorpay', label: 'Razorpay Online Gateway', state: billingForm.razorpay },
            ].map((m) => (
              <label
                key={m.key}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition ${
                  m.state ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={m.state}
                  onChange={(e) => setBillingForm({ ...billingForm, [m.key]: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span className="text-xs font-bold text-slate-900">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Direct UPI Configuration */}
        {billingForm.upi && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>Direct UPI Dynamic QR Settings</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">UPI VPA Address *</label>
                <input
                  type="text"
                  placeholder="restaurant@upi or 9876543210@paytm"
                  value={billingForm.upiId}
                  onChange={(e) => setBillingForm({ ...billingForm, upiId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Merchant Display Name</label>
                <input
                  type="text"
                  placeholder="Restaurant Name on UPI"
                  value={billingForm.upiMerchantName}
                  onChange={(e) => setBillingForm({ ...billingForm, upiMerchantName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Razorpay Online Gateway Credentials */}
        {billingForm.razorpay && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Razorpay API Credentials</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Razorpay Key ID *</label>
                <input
                  type="text"
                  placeholder="rzp_live_xxxxxxxxxxxx"
                  value={billingForm.razorpayKeyId}
                  onChange={(e) => setBillingForm({ ...billingForm, razorpayKeyId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Razorpay Key Secret *</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={billingForm.razorpayKeySecret}
                  onChange={(e) => setBillingForm({ ...billingForm, razorpayKeySecret: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
