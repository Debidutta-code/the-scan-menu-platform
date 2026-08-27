import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Printer,
  Save,
  Loader,
  Store,
  Palette,
  Settings,
} from 'lucide-react';
import { PrintOrderModal } from '../PrintOrderModal';
import { PrintOrderData } from '../../utils/printReceipt';

export interface PrinterStudioSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const PrinterStudioSection: React.FC<PrinterStudioSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Store metadata (from Store Profile & Payments)
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeGstNumber, setStoreGstNumber] = useState('');
  const [storeFssaiNumber, setStoreFssaiNumber] = useState('');
  const [storeUpiId, setStoreUpiId] = useState('');

  // Printer & Receipt Design Studio States (Pure Display & Formatting preferences)
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'A4'>('80mm');
  const [templateTheme, setTemplateTheme] = useState<'classic' | 'modern' | 'compact'>('classic');
  const [showLogo, setShowLogo] = useState(true);
  const [showGstNumber, setShowGstNumber] = useState(true);
  const [showFssai, setShowFssai] = useState(true);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [showPaymentMode, setShowPaymentMode] = useState(true);
  const [showTaxBreakup, setShowTaxBreakup] = useState(true);
  const [showPaymentQr, setShowPaymentQr] = useState(true);
  const [kotNotes, setKotNotes] = useState('');
  const [kotShowServerName, setKotShowServerName] = useState(true);
  const [defaultPrintTarget, setDefaultPrintTarget] = useState<'BOTH' | 'KITCHEN' | 'COUNTER' | 'NONE'>('BOTH');
  const [previewReceiptType, setPreviewReceiptType] = useState<'BILL' | 'COUNTER' | 'KOT'>('BILL');
  const [previewPaymentStatus, setPreviewPaymentStatus] = useState<'PENDING' | 'PAID'>('PENDING');

  // Direct Network Thermal Printer States (ESC/POS over TCP)
  const [silentPrintingEnabled, setSilentPrintingEnabled] = useState(false);
  const [kitchenPrinterIp, setKitchenPrinterIp] = useState('');
  const [kitchenPrinterPort, setKitchenPrinterPort] = useState(9100);
  const [counterPrinterIp, setCounterPrinterIp] = useState('');
  const [counterPrinterPort, setCounterPrinterPort] = useState(9100);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  // Test Print modal state
  const [testPrintData, setTestPrintData] = useState<PrintOrderData | null>(null);

  const { data: restaurantResponse, isLoading } = useQuery({
    queryKey: ['restaurantProfileInfo', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  useEffect(() => {
    if (restaurantResponse?.success && restaurantResponse?.data) {
      const p = restaurantResponse.data;
      setStoreName(p.name || '');
      setStoreAddress(p.address || '');
      setStorePhone(p.phone || '');
      setStoreLogoUrl(p.branding?.logoUrl || p.logoUrl || '');
      setStoreGstNumber(p.gstNumber || p.settings?.paymentConfig?.gstNumber || '');
      setStoreFssaiNumber(p.fssaiNumber || p.settings?.paymentConfig?.fssaiNumber || p.printerConfig?.fssaiNumber || '');
      setStoreUpiId(p.upiId || p.settings?.paymentConfig?.upiId || p.paymentMethods?.upiId || p.printerConfig?.upiId || '');

      const printerCfg = p.printerConfig || p.settings?.printerConfig;
      if (printerCfg) {
        setPaperWidth(printerCfg.paperWidth || '80mm');
        setTemplateTheme(printerCfg.templateTheme || 'classic');
        setShowLogo(printerCfg.showLogo !== false);
        setShowGstNumber(printerCfg.showGstNumber !== false);
        setShowFssai(printerCfg.showFssai !== false);
        setReceiptHeader(printerCfg.receiptHeader || '');
        setReceiptFooter(printerCfg.receiptFooter || '');
        setShowCustomerInfo(printerCfg.showCustomerInfo !== false);
        setShowPaymentMode(printerCfg.showPaymentMode !== false);
        setShowTaxBreakup(printerCfg.showTaxBreakup !== false);
        setShowPaymentQr(printerCfg.showPaymentQr !== false);
        setKotNotes(printerCfg.kotNotes || '');
        setKotShowServerName(printerCfg.kotShowServerName !== false);
        setDefaultPrintTarget(printerCfg.defaultPrintTarget || 'BOTH');
        setSilentPrintingEnabled(!!printerCfg.silentPrintingEnabled);
        setKitchenPrinterIp(printerCfg.kitchenPrinterIp || '');
        setKitchenPrinterPort(printerCfg.kitchenPrinterPort || 9100);
        setCounterPrinterIp(printerCfg.counterPrinterIp || '');
        setCounterPrinterPort(printerCfg.counterPrinterPort || 9100);
      } else {
        const settingsObj = p.settings;
        if (settingsObj) {
          setReceiptHeader(settingsObj.receiptHeader || '');
          setReceiptFooter(settingsObj.receiptFooter || '');
        }
      }
    }
  }, [restaurantResponse]);

  const handleTestNetworkPrinter = async (target: 'KITCHEN' | 'COUNTER') => {
    const ip = target === 'KITCHEN' ? kitchenPrinterIp : counterPrinterIp;
    const port = target === 'KITCHEN' ? kitchenPrinterPort : counterPrinterPort;
    if (!ip) {
      toast(`Please enter a valid IP address for the ${target.toLowerCase()} printer first.`, 'error');
      return;
    }
    setIsTestingPrinter(true);
    try {
      const res = await apiClient.post(`/restaurants/${targetRestaurantId}/printers/test`, {
        ipAddress: ip.trim(),
        port: Number(port) || 9100,
      });
      if (res.data?.success) {
        toast(`Test slip sent to ${target.toLowerCase()} printer (${ip}:${port})!`, 'success');
      } else {
        toast(res.data?.message || 'Printer did not respond', 'error');
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || 'Failed to connect to printer on network', 'error');
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Thermal Printer & Receipt Studio settings saved!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating printer settings', 'error');
    },
  });

  const handleSavePrinterSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      printerConfig: {
        paperWidth,
        templateTheme,
        showLogo,
        showGstNumber,
        showFssai,
        receiptHeader: receiptHeader.trim() || undefined,
        receiptFooter: receiptFooter.trim() || undefined,
        showCustomerInfo,
        showPaymentMode,
        showTaxBreakup,
        showPaymentQr,
        kotNotes: kotNotes.trim() || undefined,
        kotShowServerName,
        defaultPrintTarget,
        silentPrintingEnabled,
        kitchenPrinterIp: kitchenPrinterIp.trim() || undefined,
        kitchenPrinterPort: Number(kitchenPrinterPort) || 9100,
        counterPrinterIp: counterPrinterIp.trim() || undefined,
        counterPrinterPort: Number(counterPrinterPort) || 9100,
      },
    });
  };

  const handleTriggerTestPrint = () => {
    setTestPrintData({
      orderNumber: 104,
      orderMode: 'DINE_IN',
      tableId: { displayName: 'Table 4 (Window Side)', tableNumber: '4' },
      createdAt: new Date().toISOString(),
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98765 43210',
      serverName: 'Vikram (Captain)',
      paymentStatus: previewPaymentStatus,
      paymentMethod: previewPaymentStatus === 'PAID' ? 'UPI / QR' : 'PENDING',
      items: [
        {
          name: 'Truffle Mushroom Pizza',
          quantity: 1,
          price: 45000,
          specialInstructions: 'Extra crisp thin crust, light cheese',
          selectedAddOns: [{ name: 'Extra Truffle Oil', price: 6000 }],
        },
        {
          name: 'Classic Cold Brew Tonic',
          quantity: 2,
          price: 18000,
          specialInstructions: 'Less ice',
        },
      ],
      subtotal: 87000,
      tax: 4350,
      taxBreakdown: [
        { name: 'CGST (2.5%)', amount: 2175, percentage: 2.5 },
        { name: 'SGST (2.5%)', amount: 2175, percentage: 2.5 },
      ],
      total: 91350,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSavePrinterSettings} className="space-y-6">
        {/* Header Ribbon */}
        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-amber-500" />
              <span>Thermal Printer & Receipt Design Studio</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Customize customer bills, counter receipts, kitchen KOT tickets, logo branding, and tax layouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTriggerTestPrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Test Print</span>
            </button>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:bg-slate-400 cursor-pointer"
            >
              {updateMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
              <span>Save Printer Config</span>
            </button>
          </div>
        </div>

        {/* ── 1. RECEIPT BRANDING & TAX IDENTIFIERS ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-500" />
              <span>1. Receipt Branding & Tax Identifiers</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Prints at top of receipts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Display Setting */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 block">Receipt Logo</label>
                  <p className="text-[11px] text-slate-500">Prints store logo at the top of customer bills</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-bold text-[11px]">Print Logo on Bills</span>
                </label>
              </div>

              {showLogo && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {storeLogoUrl ? (
                      <img
                        src={storeLogoUrl}
                        alt="Store Logo"
                        className="h-10 max-w-[120px] object-contain bg-white p-1 rounded-xl border border-slate-200 shadow-2xs"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 italic">No logo uploaded</span>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Store Logo</span>
                      <span className="text-[10px] text-slate-400">Configured in Store Profile</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GSTIN & FSSAI Identifiers */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              {/* GSTIN Toggle & Read-only Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">GSTIN Registration Number</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGstNumber}
                      onChange={(e) => setShowGstNumber(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-bold">Show GSTIN</span>
                  </label>
                </div>
                {storeGstNumber ? (
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{storeGstNumber}</span>
                    <span className="text-[10px] text-slate-400">From Store Profile</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>No GSTIN configured</span>
                    <span className="text-[10px] font-bold">Configure in Store Profile</span>
                  </div>
                )}
              </div>

              {/* FSSAI Toggle & Read-only Preview */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">FSSAI License Number</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFssai}
                      onChange={(e) => setShowFssai(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-bold">Show FSSAI</span>
                  </label>
                </div>
                {storeFssaiNumber ? (
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{storeFssaiNumber}</span>
                    <span className="text-[10px] text-slate-400">From Store Profile</span>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>No FSSAI configured</span>
                    <span className="text-[10px] font-bold">Configure in Store Profile</span>
                  </div>
                )}
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
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap font-bold">
                  <input
                    type="checkbox"
                    checked={showPaymentQr}
                    onChange={(e) => setShowPaymentQr(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span>Print Payment QR</span>
                </label>
              </div>

              {showPaymentQr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Merchant UPI ID (VPA)
                    </label>
                    {storeUpiId ? (
                      <div className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-900">{storeUpiId}</span>
                        <span className="text-[10px] text-slate-400">From Payments & Channels</span>
                      </div>
                    ) : (
                      <div className="px-3.5 py-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                        <span>No Merchant UPI ID configured</span>
                        <span className="text-[10px] font-bold">Configure in Payments & Channels</span>
                      </div>
                    )}
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

        {/* ── 2. CUSTOMER & COUNTER BILL DESIGN ────────────────────────────── */}
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
                const isSelected = templateTheme === themeOpt.id;
                return (
                  <button
                    type="button"
                    key={themeOpt.id}
                    onClick={() => setTemplateTheme(themeOpt.id as any)}
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
                checked={showTaxBreakup}
                onChange={(e) => setShowTaxBreakup(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Itemized Tax Breakup (CGST / SGST)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showCustomerInfo}
                onChange={(e) => setShowCustomerInfo(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Customer Name & Phone Number</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showPaymentMode}
                onChange={(e) => setShowPaymentMode(e.target.checked)}
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
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
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
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="e.g. Thank you for dining with us! Please visit again."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">Printed at the very bottom of every customer invoice.</p>
            </div>
          </div>
        </div>

        {/* ── 3. KITCHEN ORDER TICKET (KOT) DESIGN ────────────────────────── */}
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
                  checked={kotShowServerName}
                  onChange={(e) => setKotShowServerName(e.target.checked)}
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
                value={kotNotes}
                onChange={(e) => setKotNotes(e.target.value)}
                placeholder="e.g. ⚠️ Check allergy flags & temperature"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400">Fixed instruction printed at the bottom of every kitchen ticket.</p>
            </div>
          </div>
        </div>

        {/* ── 4. HARDWARE PAPER FORMAT & CHECKOUT BEHAVIOR ──────────────────── */}
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
              const isSelected = paperWidth === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPaperWidth(p.id as any)}
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
                const isSelected = defaultPrintTarget === target.id;
                return (
                  <button
                    type="button"
                    key={target.id}
                    onClick={() => setDefaultPrintTarget(target.id as any)}
                    className={`text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{target.icon}</span>
                      <span className="font-bold text-xs text-slate-900">{target.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{target.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 5. DIRECT NETWORK THERMAL PRINTERS (SILENT ESC/POS OVER TCP) ── */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-500" />
              <span>5. Direct Network Thermal Printers (Silent ESC/POS)</span>
            </label>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              Raw TCP Port 9100
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Configure LAN Ethernet / Wi-Fi thermal printers (Epson, TVS, Star, Citizen, Rongta) to print kitchen KOT slips and customer bills silently without opening browser print dialogues.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={silentPrintingEnabled}
                onChange={(e) => setSilentPrintingEnabled(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Enable Silent Network Thermal Printing</span>
                <span className="text-[11px] text-slate-500 block">
                  Automatically dispatch raw binary ESC/POS data directly to printer IPs on order creation
                </span>
              </div>
            </label>

            {silentPrintingEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                {/* Kitchen Printer */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🍳</span> Kitchen KOT Printer
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestNetworkPrinter('KITCHEN')}
                      disabled={isTestingPrinter || !kitchenPrinterIp}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingPrinter ? 'Testing...' : 'Send Test Slip'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">IP Address</label>
                      <input
                        type="text"
                        value={kitchenPrinterIp}
                        onChange={(e) => setKitchenPrinterIp(e.target.value)}
                        placeholder="192.168.1.105"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Port</label>
                      <input
                        type="number"
                        value={kitchenPrinterPort}
                        onChange={(e) => setKitchenPrinterPort(Number(e.target.value) || 9100)}
                        placeholder="9100"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Counter Printer */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>🧾</span> Counter Receipt Printer
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestNetworkPrinter('COUNTER')}
                      disabled={isTestingPrinter || !counterPrinterIp}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingPrinter ? 'Testing...' : 'Send Test Slip'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">IP Address</label>
                      <input
                        type="text"
                        value={counterPrinterIp}
                        onChange={(e) => setCounterPrinterIp(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Port</label>
                      <input
                        type="number"
                        value={counterPrinterPort}
                        onChange={(e) => setCounterPrinterPort(Number(e.target.value) || 9100)}
                        placeholder="9100"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 6. INTERACTIVE LIVE THERMAL PREVIEW ───────────────────────────── */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                6. Live Thermal Design Preview ({paperWidth})
              </label>
              <span className="text-[11px] text-slate-400">Click tabs below to test & preview each receipt design</span>
            </div>

            {/* Preview Switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewReceiptType('BILL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  previewReceiptType === 'BILL' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧾 Customer Bill
              </button>
              <button
                type="button"
                onClick={() => setPreviewReceiptType('COUNTER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  previewReceiptType === 'COUNTER' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Counter Copy
              </button>
              <button
                type="button"
                onClick={() => setPreviewReceiptType('KOT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  previewReceiptType === 'KOT' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🍳 Kitchen KOT
              </button>
            </div>
          </div>

          {/* Sub-selector for Customer Bill: Prepaid vs Postpaid */}
          {previewReceiptType === 'BILL' && (
            <div className="flex items-center justify-center gap-2 pt-1 pb-2">
              <span className="text-xs font-semibold text-slate-600">Simulate Bill Condition:</span>
              <button
                type="button"
                onClick={() => setPreviewPaymentStatus('PENDING')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  previewPaymentStatus === 'PENDING'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                💳 Postpaid (Unpaid + Dynamic UPI QR)
              </button>
              <button
                type="button"
                onClick={() => setPreviewPaymentStatus('PAID')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  previewPaymentStatus === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                ✓ Prepaid (Paid Tax Invoice)
              </button>
            </div>
          )}

          {/* Thermal Preview Card */}
          <div className="bg-slate-100 p-6 rounded-3xl flex justify-center">
            <div
              className={`bg-white p-5 shadow-lg rounded-xl border border-slate-200 leading-tight space-y-2.5 select-none ${
                templateTheme === 'modern' ? 'font-sans' : 'font-mono'
              }`}
              style={{
                width: paperWidth === '58mm' ? '230px' : paperWidth === '80mm' ? '300px' : '440px',
                fontSize: paperWidth === '58mm' ? '10px' : '11px',
              }}
            >
              {/* CUSTOMER BILL / COUNTER BILL PREVIEW */}
              {(previewReceiptType === 'BILL' || previewReceiptType === 'COUNTER') && (
                <>
                  <div className="text-center border-b border-dashed border-slate-300 pb-2">
                    {showLogo && storeLogoUrl && (
                      <img
                        src={storeLogoUrl}
                        alt="Logo"
                        className="h-9 mx-auto mb-1.5 object-contain"
                      />
                    )}
                    <div className="font-bold text-sm text-slate-950 uppercase tracking-wide">
                      {storeName || 'THE WOODFIRED BISTRO'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{storeAddress || '456 Gourmet Lane, Mumbai'}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{storePhone || 'Ph: +91 98765 43210'}</div>
                    {showGstNumber && storeGstNumber && (
                      <div className="text-[10px] text-slate-700 font-bold mt-0.5">
                        GSTIN: {storeGstNumber}
                      </div>
                    )}
                    {showFssai && storeFssaiNumber && (
                      <div className="text-[10px] text-slate-600 font-bold mt-0.5">FSSAI: {storeFssaiNumber}</div>
                    )}
                    {receiptHeader && <div className="text-[10px] italic text-amber-800 mt-1">{receiptHeader}</div>}
                    
                    <div className="mt-1.5 inline-block bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {previewReceiptType === 'COUNTER'
                        ? 'COUNTER / AUDIT COPY'
                        : previewPaymentStatus === 'PAID'
                        ? 'TAX INVOICE'
                        : 'BILL FOR PAYMENT (PROFORMA)'}
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] border-b border-slate-200 pb-1 text-slate-700">
                    <div>
                      <span className="font-bold">Order #104 · DINE_IN</span>
                      {showCustomerInfo && <div className="text-slate-500">Guest: Rahul Sharma</div>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold">Table 04</span>
                      <div className="text-slate-400">14-Aug-2026 12:35</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-1 border-b border-dashed border-slate-300 text-slate-800">
                    <div className="flex justify-between">
                      <span>2x Margherita Pizza</span>
                      <span className="font-bold">₹898.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Filter Coffee</span>
                      <span className="font-bold">₹120.00</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 text-[10px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-bold">₹1,018.00</span>
                    </div>
                    {showTaxBreakup ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST (2.5%):</span>
                          <span>₹25.45</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST (2.5%):</span>
                          <span>₹25.45</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
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
                    {showPaymentMode && (
                      <div
                        className={`text-[10px] font-black text-center mt-1 py-0.5 rounded border ${
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

                  {/* UPI Payment QR in Postpaid Customer Bill Preview */}
                  {previewReceiptType === 'BILL' && previewPaymentStatus === 'PENDING' && showPaymentQr && (
                    <div className="text-center border border-dashed border-slate-400 p-2 rounded-lg bg-slate-50 mt-2 space-y-1">
                      <div className="text-[10px] font-black tracking-wider text-slate-900">SCAN & PAY VIA UPI</div>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=0&data=${encodeURIComponent(
                          `upi://pay?pa=${storeUpiId || 'merchant@upi'}&pn=${storeName || 'Restaurant'}&am=1068.90&cu=INR&tn=Bill%20104`
                        )}`}
                        alt="UPI QR Code"
                        className="w-24 h-24 mx-auto border border-slate-200 p-1 bg-white rounded"
                      />
                      <div className="text-[9px] font-bold text-slate-700">GPay • PhonePe • Paytm • BHIM</div>
                      <div className="text-[8px] font-mono text-slate-500">UPI ID: {storeUpiId || 'merchant@upi'}</div>
                    </div>
                  )}

                  {/* Counter Copy Signatures */}
                  {previewReceiptType === 'COUNTER' && (
                    <div className="mt-2 pt-2 border-t border-dashed border-slate-400 flex justify-between text-[9px] text-slate-600">
                      <span>Cashier: ___________</span>
                      <span>Sign: ___________</span>
                    </div>
                  )}

                  <div className="text-center border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500 italic">
                    {receiptFooter || 'Thank you for dining with us! Please visit again.'}
                  </div>
                </>
              )}

              {/* KITCHEN KOT PREVIEW (STRICTLY NO LOGO) */}
              {previewReceiptType === 'KOT' && (
                <>
                  <div className="text-center border-b-2 border-slate-900 pb-2">
                    <div className="text-[10px] font-black tracking-widest text-slate-900">*** KITCHEN ORDER TICKET ***</div>
                    <div className="font-black text-lg text-slate-950 mt-0.5">ORDER #104</div>
                    <div className="inline-block bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                      DINE-IN • Table 04
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] border-b border-slate-200 pb-1">
                    <span>Time: 12:35 PM</span>
                    {kotShowServerName && <span>Server: Cashier/Mgr</span>}
                  </div>

                  <div className="space-y-2 py-1 border-b-2 border-slate-900">
                    <div className="flex items-start gap-2">
                      <span className="font-black text-xs">[ 2x ]</span>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Margherita Pizza</div>
                        <div className="text-[9px] text-amber-700 font-bold">* Note: Extra crispy crust</div>
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

                  {kotNotes && (
                    <div className="p-1.5 bg-slate-100 border-l-2 border-slate-600 text-[9px] italic text-slate-700">
                      {kotNotes}
                    </div>
                  )}

                  <div className="text-center text-[10px] font-bold text-slate-900 pt-1">
                    *** END OF KOT ***
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Test Print Order Modal */}
      {testPrintData && (
        <PrintOrderModal
          isOpen={!!testPrintData}
          onClose={() => setTestPrintData(null)}
          order={testPrintData}
          restaurantInfo={{
            name: storeName || 'THE WOODFIRED BISTRO',
            address: storeAddress || '456 Gourmet Lane, Mumbai',
            phone: storePhone || '+91 98765 43210',
            gstNumber: storeGstNumber || '27AAAAA1111A1Z1',
            logoUrl: storeLogoUrl,
            headerMessage: receiptHeader || 'Welcome to The Woodfired Bistro!',
            footerMessage: receiptFooter || 'Thank you for dining with us! Please visit again.',
            printerConfig: {
              paperWidth,
              templateTheme,
              showLogo,
              logoUrl: storeLogoUrl,
              showGstNumber,
              showFssai,
              fssaiNumber: storeFssaiNumber,
              showPaymentQr,
              upiId: storeUpiId,
              showCustomerInfo,
              showPaymentMode,
              showTaxBreakup,
              kotShowServerName,
              kotNotes,
            },
          }}
        />
      )}
    </>
  );
};
