import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  QrCode,
  Palette,
  Save,
  Loader,
  X,
  Check,
  Eye,
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
  { label: 'Charcoal Dark', fg: '#18181B', bg: '#FAFAFA' },
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
  const [cornerStyle, setCornerStyle] = useState<'square' | 'rounded' | 'dots'>('rounded');
  const [cardFrameText, setCardFrameText] = useState('Scan to View Menu & Order');
  const [templateTheme, setTemplateTheme] = useState<'minimal' | 'branded' | 'standee'>('branded');

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
      if (qr.cornerStyle) setCornerStyle(qr.cornerStyle);
      if (qr.cardFrameText) setCardFrameText(qr.cardFrameText);
      if (qr.templateTheme) setTemplateTheme(qr.templateTheme);
    }
  }, [settingsResponse, restaurantLogo]);

  const { data: previewQrData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['previewCustomQr', restaurantId, fgColor, bgColor],
    queryFn: async () => {
      // In manager preview, request with dynamic color query params
      const res = await apiClient.get(
        `/restaurants/${restaurantId}/tables/preview/qr?fgColor=${encodeURIComponent(
          fgColor
        )}&bgColor=${encodeURIComponent(bgColor)}`
      ).catch(() => ({ data: { data: null } }));
      return res.data;
    },
    enabled: isOpen && !!restaurantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        qrCodeStyle: {
          fgColor,
          bgColor,
          showLogo,
          logoUrl: logoUrl.trim() || undefined,
          cornerStyle,
          cardFrameText,
          templateTheme,
        },
      };
      const res = await apiClient.patch(`/restaurants/${restaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('QR Code Style saved! All table QR codes now follow this branding.', 'success');
      queryClient.invalidateQueries({ queryKey: ['tableQr'] });
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to save QR style', 'error');
    },
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left: Customization Controls */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                  QR Code Studio & Branding
                </h3>
                <p className="text-[11px] text-slate-500">
                  Global visual style for all dining table standees
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Color Palettes */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span>QR Foreground Brand Palette</span>
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
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                      style={{ backgroundColor: preset.fg }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-[9px] font-bold text-slate-700 text-center truncate w-full">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Custom HEX Color</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Background</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-6 h-6 rounded-md border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold uppercase focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center Logo Option */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Center Logo Badge</span>
                <span className="text-[11px] text-slate-400">Embed restaurant logo at the center with high error correction</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogo(!showLogo)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  showLogo ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    showLogo ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {showLogo && (
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Logo URL Override</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... (defaults to restaurant logo)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Frame Label & Template */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Card Header Text</label>
              <input
                type="text"
                value={cardFrameText}
                onChange={(e) => setCardFrameText(e.target.value)}
                placeholder="e.g. Scan to View Menu & Order"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Template Style</label>
              <div className="grid grid-cols-3 gap-2">
                {(['branded', 'standee', 'minimal'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemplateTheme(t)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition cursor-pointer ${
                      templateTheme === t
                        ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:bg-slate-400"
            >
              {saveMutation.isPending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Apply & Save QR Style</span>
            </button>
          </div>
        </div>

        {/* Right: Live Standee / Card Preview */}
        <div className="w-full md:w-80 bg-slate-100/70 p-6 md:p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-150 shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Live Table Standee Preview</span>
          </span>

          {/* Modern Standee Card Preview */}
          <div
            className="w-64 rounded-3xl p-5 shadow-xl flex flex-col items-center text-center transition-all duration-300 relative border"
            style={{ backgroundColor: bgColor, borderColor: fgColor + '20' }}
          >
            {/* Header Badge */}
            <div
              className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2"
              style={{ backgroundColor: fgColor + '15', color: fgColor }}
            >
              Table #1
            </div>

            <h4 className="font-display text-sm font-black tracking-tight mb-0.5" style={{ color: fgColor }}>
              {restaurantName || 'Restaurant Name'}
            </h4>
            <p className="text-[10px] text-slate-500 font-medium mb-3">{cardFrameText}</p>

            {/* QR Wrapper with Center Logo */}
            <div className="relative p-2.5 rounded-2xl bg-white border border-slate-150 shadow-xs mb-3">
              <div className="w-36 h-36 flex items-center justify-center">
                {isLoadingPreview ? (
                  <Loader className="w-6 h-6 animate-spin text-amber-500" />
                ) : previewQrData?.data?.svg ? (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: previewQrData.data.svg }}
                  />
                ) : (
                  <div
                    className="w-36 h-36 rounded-xl flex items-center justify-center p-2"
                    style={{ backgroundColor: bgColor }}
                  >
                    <QrCode className="w-28 h-28" style={{ color: fgColor }} />
                  </div>
                )}
              </div>

              {/* Center Logo Shield Overlay */}
              {showLogo && (logoUrl || restaurantLogo) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                    <img
                      src={logoUrl || restaurantLogo}
                      alt="Center Logo"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Prompt */}
            <span
              className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md"
              style={{ backgroundColor: fgColor, color: bgColor }}
            >
              Direct Dine-in Order
            </span>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-4">
            Encodes <code className="text-amber-600 font-mono font-bold">/r/{restaurantSlug || 'outlet'}/t/...</code> for tables.
          </p>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Changes apply to all generated & downloaded table QR standees.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
