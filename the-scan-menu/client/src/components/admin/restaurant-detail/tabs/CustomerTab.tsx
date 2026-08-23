import React from 'react';
import { Tv, ExternalLink, Save, Loader, Palette, Bell } from 'lucide-react';
import { CustomerFormData } from '../types';

interface CustomerTabProps {
  slug: string;
  customerForm: CustomerFormData;
  setCustomerForm: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  onSave: () => void;
  isSaving: boolean;
}

export const CustomerTab: React.FC<CustomerTabProps> = ({
  slug,
  customerForm,
  setCustomerForm,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tv className="w-5 h-5 text-amber-500" />
            <span>Customer Experience & Live Display Configuration</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer-facing digital menu preferences, waiter assistance buttons, and live TV queue display screens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/r/${slug}/display`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5 text-purple-600" />
            <span>Open Live Queue Display</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
            <span>Save Customer Config</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Digital Menu UI Controls */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-500" />
            <span>Mobile Menu UI Preferences</span>
          </span>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.displayItemImages}
                onChange={(e) => setCustomerForm({ ...customerForm, displayItemImages: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Show Dish Photography on Mobile Menu</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.enableDarkMode}
                onChange={(e) => setCustomerForm({ ...customerForm, enableDarkMode: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Enable Sleek Dark Theme by Default for Customers</span>
            </label>

            <div className="pt-2 border-t border-slate-200">
              <label className="text-[11px] font-bold text-slate-600 block">
                Default Interface Language
              </label>
              <select
                value={customerForm.defaultLanguage}
                onChange={(e) => setCustomerForm({ ...customerForm, defaultLanguage: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="en">English (Default)</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="or">Odia (ଓଡ଼ିଆ)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="ar">Arabic (العربية)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Queue Display & Table Assistance */}
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-purple-600" />
            <span>Table Assistance & Public Display Screen</span>
          </span>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.allowWaiterCall}
                onChange={(e) => setCustomerForm({ ...customerForm, allowWaiterCall: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Show "Call Waiter" Assistance Button on Table Menu</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.allowBillRequest}
                onChange={(e) => setCustomerForm({ ...customerForm, allowBillRequest: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Allow Customer to Request Bill directly from Table</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.liveDisplayAudioChime}
                onChange={(e) => setCustomerForm({ ...customerForm, liveDisplayAudioChime: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Play Token Chime when Order is marked "Ready" on Live TV Display</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
