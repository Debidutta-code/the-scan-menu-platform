import React from 'react';
import { Save, Loader } from 'lucide-react';
import { IdentityFormData } from '../types';

interface IdentityTabProps {
  identityForm: IdentityFormData;
  setIdentityForm: React.Dispatch<React.SetStateAction<IdentityFormData>>;
  onSave: () => void;
  isSaving: boolean;
}

export const IdentityTab: React.FC<IdentityTabProps> = ({
  identityForm,
  setIdentityForm,
  onSave,
  isSaving,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900">Store Profile & Branding</h3>
          <p className="text-xs text-slate-500 mt-0.5">Primary store profile, legal details, timings, and custom theme colors.</p>
        </div>

        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
          <span>Save Profile & Branding</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div>
          <label className="text-[11px] font-bold text-slate-700">Outlet Name *</label>
          <input
            type="text"
            value={identityForm.name}
            onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Unique URL Slug *</label>
          <div className="flex items-center mt-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden px-3 py-2 text-xs">
            <span className="text-slate-400 font-mono">/r/</span>
            <input
              type="text"
              value={identityForm.slug}
              onChange={(e) => setIdentityForm({ ...identityForm, slug: e.target.value })}
              className="w-full bg-transparent font-mono font-bold focus:outline-none ml-1 text-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Store Contact Phone *</label>
          <input
            type="text"
            value={identityForm.phone}
            onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Store Contact Email *</label>
          <input
            type="email"
            value={identityForm.email}
            onChange={(e) => setIdentityForm({ ...identityForm, email: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-bold text-slate-700">Physical Store Address *</label>
          <input
            type="text"
            value={identityForm.address}
            onChange={(e) => setIdentityForm({ ...identityForm, address: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Opening Time</label>
          <input
            type="time"
            value={identityForm.openTime}
            onChange={(e) => setIdentityForm({ ...identityForm, openTime: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Closing Time</label>
          <input
            type="time"
            value={identityForm.closeTime}
            onChange={(e) => setIdentityForm({ ...identityForm, closeTime: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">WhatsApp Notification Number</label>
          <input
            type="text"
            placeholder="+91 9876543210"
            value={identityForm.whatsapp}
            onChange={(e) => setIdentityForm({ ...identityForm, whatsapp: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-3">
          <label className="text-[11px] font-bold text-slate-700">Google Review URL</label>
          <input
            type="text"
            placeholder="https://g.page/r/example/review"
            value={identityForm.googleReviewUrl}
            onChange={(e) => setIdentityForm({ ...identityForm, googleReviewUrl: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-bold text-slate-700">Logo Image URL</label>
          <input
            type="text"
            placeholder="https://example.com/logo.png"
            value={identityForm.logoUrl}
            onChange={(e) => setIdentityForm({ ...identityForm, logoUrl: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Cover Banner Image URL</label>
          <input
            type="text"
            placeholder="https://example.com/cover.jpg"
            value={identityForm.coverImageUrl}
            onChange={(e) => setIdentityForm({ ...identityForm, coverImageUrl: e.target.value })}
            className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Theme Colors */}
        <div>
          <label className="text-[11px] font-bold text-slate-700">Primary Brand Color</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={identityForm.primaryColor}
              onChange={(e) => setIdentityForm({ ...identityForm, primaryColor: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={identityForm.primaryColor}
              onChange={(e) => setIdentityForm({ ...identityForm, primaryColor: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Accent Highlight Color</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={identityForm.accentColor}
              onChange={(e) => setIdentityForm({ ...identityForm, accentColor: e.target.value })}
              className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={identityForm.accentColor}
              onChange={(e) => setIdentityForm({ ...identityForm, accentColor: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
