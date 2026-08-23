import React, { useState } from 'react';
import { Printer, Save, Loader, Store, Palette, Settings, Receipt, QrCode } from 'lucide-react';
import { HardwareFormData, IdentityFormData } from '../types';
import { Restaurant } from '../../../../services/restaurant.service';

interface HardwareTabProps {
  restaurant: Restaurant;
  hardwareForm: HardwareFormData;
  setHardwareForm: React.Dispatch<React.SetStateAction<HardwareFormData>>;
  identityForm: IdentityFormData;
  onSaveHardware: () => void;
  isSavingHardware: boolean;
  onTestPrint: () => void;
}

export const HardwareTab: React.FC<HardwareTabProps> = ({
  restaurant,
  hardwareForm,
  setHardwareForm,
  identityForm,
  onSaveHardware,
  isSavingHardware,
  onTestPrint,
}) => {
  const [previewReceiptType, setPreviewReceiptType] = useState<'BILL' | 'COUNTER' | 'KOT'>('BILL');
  const [previewPaymentStatus, setPreviewPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 min-h-0 overflow-hidden">
      {/* Settings Form Studio (Middle Section - Scrolls Separately) */}
      <div className="flex-1 min-w-0 bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              <span>Thermal Printer & Receipt Design Studio</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize customer bills, counter receipts, kitchen KOT tickets, logo branding, and tax layouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTestPrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Test Print</span>
            </button>

            <button
              type="button"
              onClick={onSaveHardware}
              disabled={isSavingHardware}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              {isSavingHardware ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>Save Printer Config</span>
            </button>
          </div>
        </div>

        {/* ── 1. RECEIPT BRANDING & TAX IDENTIFIERS ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-500" />
              <span>1. Receipt Branding & Tax Identifiers</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Prints at top of receipts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Configuration */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Receipt Logo</label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardwareForm.showLogo}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, showLogo: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-medium text-[11px]">Print Logo on Bills</span>
                </label>
              </div>

              {hardwareForm.showLogo && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={hardwareForm.logoUrl}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, logoUrl: e.target.value })}
                      placeholder={identityForm.logoUrl || 'https://example.com/logo.png'}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                    />
                    {identityForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setHardwareForm({ ...hardwareForm, logoUrl: identityForm.logoUrl })}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-xl transition whitespace-nowrap"
                      >
                        Use Store Logo
                      </button>
                    )}
                  </div>
                  {(hardwareForm.logoUrl || identityForm.logoUrl) && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400">Preview:</span>
                      <img
                        src={hardwareForm.logoUrl || identityForm.logoUrl}
                        alt="Receipt Logo"
                        className="h-8 max-w-[120px] object-contain bg-white p-1 rounded-lg border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GSTIN & FSSAI Identifiers */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">GSTIN Registration Number</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardwareForm.showGstNumber}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, showGstNumber: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Show GSTIN</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={hardwareForm.gstNumber}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, gstNumber: e.target.value })}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white uppercase"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">FSSAI License Number</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hardwareForm.showFssai}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, showFssai: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Show FSSAI</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={hardwareForm.fssaiNumber}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, fssaiNumber: e.target.value })}
                  placeholder="e.g. 10019022009876"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                />
              </div>
            </div>

            {/* UPI Payment QR Code Configuration */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Dynamic UPI Payment QR Code</label>
                  <p className="text-[11px] text-slate-500">
                    Automatically generates a scan-and-pay UPI QR code on postpaid & unpaid bills so guests can pay instantly via GPay, PhonePe, Paytm, or BHIM.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap font-medium">
                  <input
                    type="checkbox"
                    checked={hardwareForm.showPaymentQr}
                    onChange={(e) => setHardwareForm({ ...hardwareForm, showPaymentQr: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Print Payment QR</span>
                </label>
              </div>

              {hardwareForm.showPaymentQr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Merchant UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={hardwareForm.upiId}
                      onChange={(e) => setHardwareForm({ ...hardwareForm, upiId: e.target.value })}
                      placeholder="e.g. yourrestaurant@okhdfcbank or 9876543210@paytm"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Amount is automatically encoded in QR code.</p>
                  </div>
                  <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                    <span className="text-sm">💡</span>
                    <span>
                      <strong>Prepaid vs Postpaid Rules:</strong> If an order is already marked as <strong>PAID</strong>, the bill prints as a <strong>Paid Tax Invoice</strong> without the QR code. If payment is <strong>PENDING / POSTPAID</strong>, the dynamic QR code is printed for fast table-side settlement.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. CUSTOMER & COUNTER BILL CUSTOMIZATION ── */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-500" />
            <span>2. Customer & Counter Bill Customization</span>
          </label>

          {/* Template Themes */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Receipt Visual Theme</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'classic', label: 'Classic Thermal', desc: 'Monospace font with classic dashed dividing borders' },
                { id: 'modern', label: 'Modern Clean', desc: 'Sleek sans-serif typography with minimal solid borders' },
                { id: 'compact', label: 'Compact Paper-Saver', desc: 'Reduced line height and margins to minimize paper roll usage' },
              ].map((themeOpt) => {
                const isSelected = hardwareForm.templateTheme === themeOpt.id;
                return (
                  <button
                    type="button"
                    key={themeOpt.id}
                    onClick={() => setHardwareForm({ ...hardwareForm, templateTheme: themeOpt.id as any })}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 mb-1">{themeOpt.label}</div>
                    <div className="text-[11px] text-slate-500 leading-snug">{themeOpt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hardwareForm.showTaxBreakup}
                onChange={(e) => setHardwareForm({ ...hardwareForm, showTaxBreakup: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Itemized Tax Breakup (CGST / SGST)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hardwareForm.showCustomerInfo}
                onChange={(e) => setHardwareForm({ ...hardwareForm, showCustomerInfo: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Customer Name & Phone Number</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={hardwareForm.showPaymentMode}
                onChange={(e) => setHardwareForm({ ...hardwareForm, showPaymentMode: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Payment Mode & Paid Status Badge</span>
            </label>
          </div>

          {/* Header & Footer Custom Messages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Receipt Header Slogan / Greeting
              </label>
              <input
                type="text"
                value={hardwareForm.receiptHeader}
                onChange={(e) => setHardwareForm({ ...hardwareForm, receiptHeader: e.target.value })}
                placeholder="e.g. Welcome to The Woodfired Bistro!"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed directly under restaurant address & tax details.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Receipt Footer Message / Note
              </label>
              <input
                type="text"
                value={hardwareForm.receiptFooter}
                onChange={(e) => setHardwareForm({ ...hardwareForm, receiptFooter: e.target.value })}
                placeholder="e.g. Thank you for dining with us! Please visit again."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed at the very bottom of every customer invoice.</p>
            </div>
          </div>
        </div>

        {/* ── 3. KITCHEN ORDER TICKET (KOT) CUSTOMIZATION ── */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>3. Kitchen Order Ticket (KOT) Customization</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={hardwareForm.kotShowServerName}
                  onChange={(e) => setHardwareForm({ ...hardwareForm, kotShowServerName: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Print Server / Cashier Name on KOT</span>
              </label>
              <p className="text-[11px] text-slate-400">Identifies who punched the order for kitchen staff coordination.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Kitchen Staff Note / Prep Instructions
              </label>
              <input
                type="text"
                value={hardwareForm.kotNotes}
                onChange={(e) => setHardwareForm({ ...hardwareForm, kotNotes: e.target.value })}
                placeholder="e.g. ⚠️ Check allergy flags & temperature"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400">Fixed instruction printed at the bottom of every kitchen ticket.</p>
            </div>
          </div>
        </div>

        {/* ── 4. PAPER ROLL WIDTH & DEFAULT POS ACTION ── */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-500" />
            <span>4. Paper Roll Width & Default POS Behavior</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: '80mm', label: '80mm Thermal Paper', desc: 'Standard 3-inch POS printer roll (Epson, TVS, Star, Citizen)', badge: 'Recommended' },
              { id: '58mm', label: '58mm Mini Thermal', desc: 'Compact 2-inch handheld or Bluetooth printer roll', badge: 'Handheld POS' },
              { id: 'A4', label: 'Standard A4 Sheet', desc: 'Full-page laser/inkjet printer for formal billing', badge: 'Full Page' },
            ].map((p) => {
              const isSelected = hardwareForm.paperWidth === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setHardwareForm({ ...hardwareForm, paperWidth: p.id as any })}
                  className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{p.label}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-slate-700">Default POS Order Placement Action</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { id: 'BOTH', label: 'Print Both (KOT + Counter Bill)', sub: 'Kitchen ticket + counter bill in sequence', icon: '🖨️' },
                { id: 'KITCHEN', label: 'Kitchen Ticket (KOT) Only', sub: 'Sends prep slip to kitchen printer', icon: '🍳' },
                { id: 'COUNTER', label: 'Counter Bill Only', sub: 'Prints tax invoice for counter cashier', icon: '🧾' },
                { id: 'NONE', label: 'Do Not Auto-Print', sub: 'Staff manually clicks print when desired', icon: '🚫' },
              ].map((target) => {
                const isSelected = hardwareForm.defaultPrintTarget === target.id;
                return (
                  <button
                    type="button"
                    key={target.id}
                    onClick={() => setHardwareForm({ ...hardwareForm, defaultPrintTarget: target.id as any })}
                    className={`text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-base mb-1">{target.icon}</div>
                    <div className="font-bold text-xs text-slate-900 leading-tight">{target.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{target.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Visual Thermal Receipt Canvas Preview (Right Section - Pinned/Fixed) */}
      <div className="w-full xl:w-80 2xl:w-96 shrink-0 bg-white border border-slate-150 rounded-3xl p-5 shadow-sm flex flex-col items-center h-full overflow-y-auto space-y-3">
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-amber-500" />
            <span>Preview ({hardwareForm.paperWidth})</span>
          </span>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
            {hardwareForm.templateTheme.toUpperCase()}
          </span>
        </div>

        {/* 3-Way Preview Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 w-full bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPreviewReceiptType('BILL')}
            className={`py-1 rounded-lg text-[11px] font-bold transition ${
              previewReceiptType === 'BILL' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧾 Customer
          </button>
          <button
            type="button"
            onClick={() => setPreviewReceiptType('COUNTER')}
            className={`py-1 rounded-lg text-[11px] font-bold transition ${
              previewReceiptType === 'COUNTER' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Counter
          </button>
          <button
            type="button"
            onClick={() => setPreviewReceiptType('KOT')}
            className={`py-1 rounded-lg text-[11px] font-bold transition ${
              previewReceiptType === 'KOT' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍳 Kitchen
          </button>
        </div>

        {/* Customer Bill Sub-Simulation Mode: Prepaid vs Postpaid */}
        {previewReceiptType === 'BILL' && (
          <div className="grid grid-cols-2 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setPreviewPaymentStatus('PENDING')}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition text-center ${
                previewPaymentStatus === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              💳 Unpaid + QR
            </button>
            <button
              type="button"
              onClick={() => setPreviewPaymentStatus('PAID')}
              className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition text-center ${
                previewPaymentStatus === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✓ Paid Invoice
            </button>
          </div>
        )}

        {/* Thermal Receipt Paper Canvas */}
        <div
          className={`bg-white border border-slate-300 p-4 rounded-2xl text-slate-900 shadow-md transition-all w-full select-none ${
            hardwareForm.templateTheme === 'modern' ? 'font-sans' : 'font-mono'
          } ${hardwareForm.templateTheme === 'compact' ? 'text-[10px] leading-tight' : 'text-[11px] leading-relaxed'}`}
        >
          {/* ─────────────────────────────────────────────────────────────
              1. CUSTOMER BILL & COUNTER COPY PREVIEWS
             ───────────────────────────────────────────────────────────── */}
          {(previewReceiptType === 'BILL' || previewReceiptType === 'COUNTER') && (
            <>
              {/* Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-slate-400">
                {hardwareForm.showLogo && (hardwareForm.logoUrl || identityForm.logoUrl) && (
                  <img
                    src={hardwareForm.logoUrl || identityForm.logoUrl}
                    alt="Logo"
                    className="h-9 mx-auto mb-1.5 object-contain"
                  />
                )}
                <div className="font-bold text-sm text-slate-950 uppercase tracking-wide">
                  {restaurant.name || 'THE WOODFIRED BISTRO'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{restaurant.address || '456 Gourmet Lane, City'}</div>
                <div className="text-[10px] text-slate-500 font-bold">{restaurant.phone || 'Ph: +91 98765 43210'}</div>
                {hardwareForm.showGstNumber && (hardwareForm.gstNumber || identityForm.gstNumber) && (
                  <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                    GSTIN: {hardwareForm.gstNumber || identityForm.gstNumber || '27AAAAA1111A1Z1'}
                  </div>
                )}
                {hardwareForm.showFssai && hardwareForm.fssaiNumber && (
                  <div className="text-[10px] text-slate-600">FSSAI: {hardwareForm.fssaiNumber}</div>
                )}
                {hardwareForm.receiptHeader && (
                  <div className="text-[10px] italic text-amber-800 mt-1 font-bold">{hardwareForm.receiptHeader}</div>
                )}

                <div className="mt-1.5 inline-block bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                  {previewReceiptType === 'COUNTER'
                    ? 'COUNTER / AUDIT COPY'
                    : previewPaymentStatus === 'PAID'
                    ? 'TAX INVOICE'
                    : 'BILL FOR PAYMENT (PROFORMA)'}
                </div>
              </div>

              {/* Order Meta Info */}
              <div className="py-2 border-b border-slate-200 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>Order #104 · DINE_IN</span>
                  <span>Table 04</span>
                </div>
                <div className="flex justify-between text-slate-500 mt-0.5">
                  {hardwareForm.showCustomerInfo ? <span>Guest: Rahul Sharma</span> : <span>Guest: Dine-in</span>}
                  <span>14-Aug-2026 12:35</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2.5 space-y-1.5 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span>2x Margherita Pizza</span>
                  <span className="font-bold">₹898.00</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Filter Coffee</span>
                  <span className="font-bold">₹120.00</span>
                </div>
              </div>

              {/* Totals & Tax Calculation */}
              <div className="py-2 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">₹1,018.00</span>
                </div>
                {hardwareForm.showTaxBreakup ? (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>CGST (2.5%):</span>
                      <span>₹25.45</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>SGST (2.5%):</span>
                      <span>₹25.45</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-500">
                    <span>GST (5%):</span>
                    <span>₹50.90</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-slate-950 text-xs pt-1.5 border-t-2 border-slate-900">
                  <span>
                    {previewReceiptType === 'COUNTER' || previewPaymentStatus === 'PAID'
                      ? 'TOTAL PAID:'
                      : 'PAYABLE AMOUNT:'}
                  </span>
                  <span>₹1,068.90</span>
                </div>

                {hardwareForm.showPaymentMode && (
                  <div
                    className={`text-[10px] font-black text-center mt-1.5 py-0.5 rounded border ${
                      previewPaymentStatus === 'PAID' || previewReceiptType === 'COUNTER'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-800 bg-amber-50 border-amber-200'
                    }`}
                  >
                    {previewPaymentStatus === 'PAID' || previewReceiptType === 'COUNTER'
                      ? '✓ PAID (UPI / QR)'
                      : 'STATUS: PAYMENT DUE'}
                  </div>
                )}
              </div>

              {/* Dynamic Scan-to-Pay UPI QR Code */}
              {previewReceiptType === 'BILL' && previewPaymentStatus === 'PENDING' && hardwareForm.showPaymentQr && (
                <div className="text-center border border-dashed border-slate-400 p-2 rounded-lg bg-slate-50 mt-2 space-y-1">
                  <div className="text-[10px] font-black tracking-wider text-slate-900 flex items-center justify-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-slate-700" />
                    <span>SCAN & PAY VIA UPI</span>
                  </div>
                  <div className="w-20 h-20 bg-white border border-slate-300 mx-auto rounded-lg flex flex-col items-center justify-center text-slate-400 p-1 shadow-2xs">
                    <QrCode className="w-14 h-14 text-slate-800" />
                  </div>
                  <div className="text-[8px] font-bold text-slate-700">GPay • PhonePe • Paytm • BHIM</div>
                  <div className="text-[8px] font-mono text-slate-500 truncate">
                    UPI: {hardwareForm.upiId || 'merchant@okhdfcbank'}
                  </div>
                </div>
              )}

              {/* Counter Copy Signatures */}
              {previewReceiptType === 'COUNTER' && (
                <div className="mt-2 pt-2 border-t border-dashed border-slate-400 flex justify-between text-[9px] text-slate-600">
                  <span>Cashier: ___________</span>
                  <span>Sign: ___________</span>
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500 italic mt-2">
                {hardwareForm.receiptFooter || 'Thank you for dining with us! Please visit again.'}
              </div>
            </>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. KITCHEN ORDER TICKET (KOT) PREVIEW (NO LOGO, HIGHLIGHTED)
             ───────────────────────────────────────────────────────────── */}
          {previewReceiptType === 'KOT' && (
            <div className="space-y-2">
              <div className="text-center border-b-2 border-slate-900 pb-2">
                <div className="text-[10px] font-black tracking-widest text-slate-900">
                  *** KITCHEN ORDER TICKET ***
                </div>
                <div className="font-black text-lg text-slate-950 mt-0.5">ORDER #104</div>
                <div className="inline-block bg-slate-950 text-white text-[10px] font-bold px-2.5 py-0.5 rounded mt-1">
                  DINE-IN • Table 04
                </div>
              </div>

              <div className="flex justify-between text-[10px] border-b border-slate-200 pb-1">
                <span>Time: 12:35 PM</span>
                {hardwareForm.kotShowServerName && <span className="font-bold">Server: Cashier/Mgr</span>}
              </div>

              <div className="space-y-2 py-1.5 border-b-2 border-slate-900">
                <div className="flex items-start gap-2">
                  <span className="font-black text-xs">[ 2x ]</span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Margherita Pizza</div>
                    <div className="text-[9px] text-amber-800 font-bold">* Note: Extra crispy crust</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-xs">[ 1x ]</span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">Filter Coffee</div>
                    <div className="text-[9px] text-slate-500">+ Less sugar</div>
                  </div>
                </div>
              </div>

              {hardwareForm.kotNotes && (
                <div className="p-1.5 bg-slate-100 border-l-2 border-slate-700 text-[9px] italic text-slate-800 font-medium">
                  {hardwareForm.kotNotes}
                </div>
              )}

              <div className="text-center text-[10px] font-bold text-slate-900 pt-1">
                *** END OF KOT ***
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
