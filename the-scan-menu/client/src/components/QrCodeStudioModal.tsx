import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import { ImageUploader } from './ImageUploader';
import { Button } from './ui/Button';
import {
  QrCode,
  Palette,
  Save,
  Loader,
  X,
  Check,
  Eye,
  UploadCloud,
  Shield,
  Layers,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';

export interface QrCodeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantSlug?: string;
  restaurantName?: string;
  restaurantLogo?: string;
}

const COLOR_PRESETS = [
  { label: 'Obsidian Slate', fg: '#0F172A', bg: '#FFFFFF' },
  { label: 'Amber Flame', fg: '#D97706', bg: '#FFFFFF' },
  { label: 'Royal Indigo', fg: '#4338CA', bg: '#FFFFFF' },
  { label: 'Emerald Forest', fg: '#047857', bg: '#FFFFFF' },
  { label: 'Crimson Rose', fg: '#BE123C', bg: '#FFFFFF' },
  { label: 'Coffee Roast', fg: '#78350F', bg: '#FAF9F6' },
  { label: 'Midnight Blue', fg: '#1E3A8A', bg: '#FFFFFF' },
  { label: 'Deep Charcoal', fg: '#18181B', bg: '#FAFAFA' },
];

export const QrCodeStudioModal: React.FC<QrCodeStudioModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantSlug,
  restaurantName,
  restaurantLogo,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fgColor, setFgColor] = useState('#0F172A');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [showLogo, setShowLogo] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [showCustomUploader, setShowCustomUploader] = useState(false);
  const [cardFrameText, setCardFrameText] = useState('Scan to View Menu & Order');
  const [templateTheme, setTemplateTheme] = useState<'standee' | 'branded' | 'minimal'>('standee');
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<'M' | 'Q' | 'H'>('H');
  const [realQrSvg, setRealQrSvg] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  // Fetch current restaurant settings
  const { data: settingsResponse } = useQuery({
    queryKey: ['restaurantQrSettings', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}`);
      return res.data;
    },
    enabled: isOpen && !!restaurantId,
  });

  useEffect(() => {
    if (settingsResponse?.data) {
      const s = settingsResponse.data;
      const qr = s.qrCodeStyle || {};
      if (qr.fgColor) setFgColor(qr.fgColor);
      if (qr.bgColor) setBgColor(qr.bgColor);
      if (qr.showLogo !== undefined) setShowLogo(qr.showLogo);
      setLogoUrl(qr.logoUrl || s.branding?.logoUrl || s.logoUrl || restaurantLogo || '');
      if (qr.cardFrameText) setCardFrameText(qr.cardFrameText);
      if (qr.templateTheme) setTemplateTheme(qr.templateTheme);
      if (qr.errorCorrectionLevel) setErrorCorrectionLevel(qr.errorCorrectionLevel);
    }
  }, [settingsResponse, restaurantLogo]);

  // Real, Authentic QR Generation
  const previewSampleUrl = useMemo(() => {
    const slug = restaurantSlug || 'demo';
    return `https://app.thescanmenu.com/r/${slug}/t/sample-table-01`;
  }, [restaurantSlug]);

  useEffect(() => {
    let isCancelled = false;
    setIsGeneratingQr(true);

    QRCode.toString(
      previewSampleUrl,
      {
        type: 'svg',
        errorCorrectionLevel: errorCorrectionLevel,
        margin: templateTheme === 'minimal' ? 0 : 1,
        color: {
          dark: fgColor || '#0F172A',
          light: templateTheme === 'minimal' ? '#00000000' : bgColor || '#FFFFFF',
        },
      },
      (err, svg) => {
        if (!isCancelled) {
          setIsGeneratingQr(false);
          if (!err && svg) {
            setRealQrSvg(svg);
          }
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [previewSampleUrl, fgColor, bgColor, errorCorrectionLevel, templateTheme]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        qrCodeStyle: {
          fgColor,
          bgColor,
          showLogo,
          logoUrl: logoUrl.trim() || undefined,
          cardFrameText,
          templateTheme,
          errorCorrectionLevel,
        },
      };
      const res = await apiClient.patch(`/restaurants/${restaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('QR Code Style & Standee Template saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['tableQr'] });
      queryClient.invalidateQueries({ queryKey: ['restaurantQrSettings', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurantProfilePrint', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to save QR style', 'error');
    },
  });

  const activeLogoSrc = logoUrl || restaurantLogo || '';

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-5 z-[99999] overflow-y-auto select-none font-sans">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row max-h-[92vh]">
        {/* Left Pane: Controls & Customization */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                  Table QR Code &amp; Standee Studio
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Configure brand aesthetics, error complexity, center logo, and standee templates
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Standee Template Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Standee Visual Template</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: 'standee',
                  name: 'Acrylic Standee',
                  desc: '3D Table tent with wooden/acrylic base and CTA',
                  badge: 'Popular',
                },
                {
                  id: 'branded',
                  name: 'Branded Card',
                  desc: 'Hospitality placard with gold border & logo header',
                  badge: 'Luxury',
                },
                {
                  id: 'minimal',
                  name: 'Minimalist Tag',
                  desc: 'Stark modern focus on high-speed scannability',
                  badge: 'Clean',
                },
              ].map((tpl) => {
                const isSelected = templateTheme === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateTheme(tpl.id as any)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between shadow-2xs ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-display font-bold text-xs text-slate-900">{tpl.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">{tpl.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="mt-1.5 flex items-center gap-1 text-amber-800 font-bold text-[10px] font-mono">
                        <Check className="w-3 h-3" strokeWidth={3} />
                        <span>Active</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Color Palettes */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-500" />
              <span>2. Brand Color Palette</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = fgColor.toLowerCase() === preset.fg.toLowerCase();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setFgColor(preset.fg);
                      setBgColor(preset.bg);
                    }}
                    className={`p-2.5 rounded-2xl border transition flex flex-col items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                      style={{ backgroundColor: preset.fg }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-[9px] font-bold text-slate-700 text-center truncate w-full">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom HEX Colors */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1">
                  QR Pattern Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold uppercase focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                <label className="block text-[10px] font-mono text-slate-500 uppercase font-bold mb-1">
                  Card Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold uppercase focus:outline-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. QR Matrix Complexity / Error Correction */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>3. QR Matrix Density & Error Correction</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  id: 'M',
                  name: 'Standard (15%)',
                  detail: 'Medium density, fast scan',
                },
                {
                  id: 'Q',
                  name: 'High (25%)',
                  detail: 'Crisp balanced density',
                },
                {
                  id: 'H',
                  name: 'Maximum (30%)',
                  detail: 'Dense matrix with Logo Shield',
                },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setErrorCorrectionLevel(lvl.id as any)}
                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    errorCorrectionLevel === lvl.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-extrabold">{lvl.name}</span>
                  <span className={`block text-[9px] mt-0.5 ${errorCorrectionLevel === lvl.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {lvl.detail}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Center Logo Shield & Local Upload */}
          <div className="space-y-3 pt-2 border-t border-slate-150">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Center Logo Shield</span>
                <span className="text-[11px] text-slate-500">
                  Embed restaurant brand logo at the center of the QR matrix
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogo(!showLogo)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  showLogo ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                    showLogo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {showLogo && (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Selected Center Logo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomUploader(!showCustomUploader)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{showCustomUploader ? 'Hide Local Uploader' : 'Upload From Device / Cloudinary'}</span>
                  </button>
                </div>

                {/* Live Logo Preview and URL input */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                    {activeLogoSrc ? (
                      <img
                        src={activeLogoSrc}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... (or choose via uploader)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {showCustomUploader && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-600 mb-2">Upload Logo File Directly</p>
                    <ImageUploader
                      restaurantId={restaurantId}
                      value={logoUrl}
                      onChange={(url) => {
                        setLogoUrl(url);
                        toast('Logo uploaded and attached to QR style!', 'success');
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Card Header Text */}
          <div className="space-y-1.5 pt-2 border-t border-slate-150">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              5. Standee Call-To-Action Header
            </label>
            <input
              type="text"
              value={cardFrameText}
              onChange={(e) => setCardFrameText(e.target.value)}
              placeholder="e.g. Scan to View Menu &amp; Order"
              className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-400 shadow-2xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-slate-150">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
              leftIcon={<Save className="w-3.5 h-3.5 text-amber-400" />}
            >
              Save Template &amp; Styling
            </Button>
          </div>
        </div>

        {/* Right Pane: Ultra-Realistic Live Standee 3D Mockup */}
        <div className="w-full lg:w-[380px] bg-slate-100/90 p-6 md:p-8 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-200 shrink-0 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-mono uppercase font-black text-slate-600 tracking-wider">
              Realistic Tabletop Preview
            </span>
          </div>

          {/* 3D Standee Container */}
          <div className="relative flex flex-col items-center select-none w-full max-w-[280px]">
            {/* TEMPLATE 1: ACRYLIC STANDEE */}
            {templateTheme === 'standee' && (
              <div className="w-full flex flex-col items-center">
                {/* Acrylic Plaque */}
                <div
                  className="w-full rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center relative border transition-all duration-300 backdrop-blur-sm"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: fgColor + '25',
                    boxShadow: `0 20px 35px -10px ${fgColor}30, 0 1px 3px rgba(0,0,0,0.1)`,
                  }}
                >
                  {/* Glossy Acrylic Sheen Overlay */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none" />

                  {/* Header Pill */}
                  <div
                    className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 shadow-xs"
                    style={{ backgroundColor: fgColor, color: bgColor }}
                  >
                    TABLE #1
                  </div>

                  <h4 className="font-display text-sm font-black tracking-tight leading-tight" style={{ color: fgColor }}>
                    {restaurantName || 'Restaurant Name'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 mb-3">{cardFrameText}</p>

                  {/* High-Resolution Scannable QR */}
                  <div className="relative p-2.5 rounded-2xl bg-white border border-slate-150 shadow-inner mb-3">
                    <div className="w-40 h-40 flex items-center justify-center">
                      {isGeneratingQr ? (
                        <Loader className="w-6 h-6 animate-spin text-amber-500" />
                      ) : realQrSvg ? (
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: realQrSvg }}
                        />
                      ) : (
                        <QrCode className="w-32 h-32 text-slate-400" />
                      )}
                    </div>

                    {/* Center Logo Shield */}
                    {showLogo && activeLogoSrc && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                          <img
                            src={activeLogoSrc}
                            alt="Logo"
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Standee Footer Note */}
                  <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    <Smartphone className="w-3 h-3 text-amber-600" />
                    <span>Point Camera & Scan</span>
                  </div>
                </div>

                {/* Standee Wooden Base */}
                <div className="w-[85%] h-4 bg-amber-900/80 rounded-b-xl shadow-lg -mt-1 border-t border-amber-950/40 relative z-10" />
                {/* Tabletop Shadow */}
                <div className="w-[95%] h-3 bg-black/20 rounded-full blur-xs mt-0.5" />
              </div>
            )}

            {/* TEMPLATE 2: BRANDED CARD */}
            {templateTheme === 'branded' && (
              <div className="w-full flex flex-col items-center">
                <div
                  className="w-full rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center relative border-2 transition-all duration-300"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: fgColor,
                    boxShadow: `0 15px 30px -10px ${fgColor}25`,
                  }}
                >
                  {/* Gold/Brand Top Accent */}
                  <div className="w-12 h-1 rounded-full mb-3" style={{ backgroundColor: fgColor }} />

                  {/* Logo or Restaurant Name */}
                  {activeLogoSrc ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden mb-1 flex items-center justify-center">
                      <img src={activeLogoSrc} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : null}

                  <h4 className="font-serif text-base font-black tracking-tight" style={{ color: fgColor }}>
                    {restaurantName || 'Restaurant Name'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-semibold mb-3">{cardFrameText}</p>

                  {/* QR Pattern */}
                  <div className="relative p-2 rounded-xl bg-white border border-slate-200 mb-3">
                    <div className="w-40 h-40 flex items-center justify-center">
                      {isGeneratingQr ? (
                        <Loader className="w-6 h-6 animate-spin text-amber-500" />
                      ) : realQrSvg ? (
                        <div
                          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: realQrSvg }}
                        />
                      ) : (
                        <QrCode className="w-32 h-32 text-slate-400" />
                      )}
                    </div>

                    {showLogo && activeLogoSrc && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                          <img
                            src={activeLogoSrc}
                            alt="Logo"
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="px-3 py-1 rounded-md text-[9px] font-mono font-black uppercase tracking-wider"
                    style={{ backgroundColor: fgColor + '15', color: fgColor }}
                  >
                    DINING TABLE #1
                  </div>
                </div>
                <div className="w-[90%] h-3 bg-black/15 rounded-full blur-xs mt-1" />
              </div>
            )}

            {/* TEMPLATE 3: MINIMAL */}
            {templateTheme === 'minimal' && (
              <div className="w-full flex flex-col items-center">
                <div
                  className="w-full rounded-2xl p-5 shadow-xl flex flex-col items-center text-center relative border border-slate-200 transition-all duration-300"
                  style={{ backgroundColor: bgColor }}
                >
                  <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-slate-150">
                    <span className="text-[10px] font-mono font-black uppercase" style={{ color: fgColor }}>
                      {restaurantName || 'MENU'}
                    </span>
                    <span
                      className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: fgColor, color: bgColor }}
                    >
                      #01
                    </span>
                  </div>

                  {/* Clean QR */}
                  <div className="w-44 h-44 flex items-center justify-center relative my-1">
                    {isGeneratingQr ? (
                      <Loader className="w-6 h-6 animate-spin text-amber-500" />
                    ) : realQrSvg ? (
                      <div
                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: realQrSvg }}
                      />
                    ) : (
                      <QrCode className="w-36 h-36 text-slate-400" />
                    )}

                    {showLogo && activeLogoSrc && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                          <img
                            src={activeLogoSrc}
                            alt="Logo"
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-slate-600 mt-2">{cardFrameText}</p>
                </div>
                <div className="w-[90%] h-3 bg-black/15 rounded-full blur-xs mt-1" />
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-5 font-mono">
            100% Real Scannable QR Matrix ({errorCorrectionLevel === 'H' ? 'Level H - 30%' : errorCorrectionLevel === 'Q' ? 'Level Q - 25%' : 'Level M - 15%'})
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default QrCodeStudioModal;
