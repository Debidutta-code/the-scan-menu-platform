import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useFontScale } from '../../hooks/useFontScale';
import apiClient from '../../lib/api';
import {
  Palette,
  Type,
  LayoutGrid,
  Save,
  Loader,
  Laptop,
  Monitor,
  Tv,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface DisplayPreferencesSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const DisplayPreferencesSection: React.FC<DisplayPreferencesSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fontScale, setFontScale } = useFontScale();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Density preference
  const [densityMode, setDensityModeState] = useState<'COMPACT' | 'COMFORTABLE'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manager_orders_density');
      if (saved === 'COMPACT' || saved === 'COMFORTABLE') return saved;
      if (window.innerWidth <= 1440) return 'COMPACT';
    }
    return 'COMPACT';
  });

  const handleSetDensityMode = (mode: 'COMPACT' | 'COMFORTABLE') => {
    setDensityModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manager_orders_density', mode);
      window.dispatchEvent(new CustomEvent('densityModeChanged', { detail: mode }));
    }
    toast(`Board density set to ${mode === 'COMPACT' ? 'Compact' : 'Comfortable'}`, 'success');
  };

  // Theme & Branding Colors
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');

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
      if (p.theme) {
        setPrimaryColor(p.theme.primaryColor || '#111827');
        setSecondaryColor(p.theme.secondaryColor || '#FFFFFF');
        setAccentColor(p.theme.accentColor || '#F59E0B');
        setFontFamily(p.theme.fontFamily || 'Plus Jakarta Sans');
      }
    }
  }, [restaurantResponse]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Display and theme preferences saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating preferences', 'error');
    },
  });

  const handleSaveTheme = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      theme: {
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 font-sans select-none">
      {/* ── 1. Global UI Font Size & Scaling ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Type className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
              <span>Operations Panel Text &amp; Font Scale</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Control the base font scaling across the entire manager operations dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setFontScale('SMALL')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
              fontScale === 'SMALL'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Small (Compact)</span>
              </div>
              {fontScale === 'SMALL' && <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              81.25% scale (~13px base). Optimized for 13–14" laptops to maximize visible tickets.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFontScale('NORMAL')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
              fontScale === 'NORMAL'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Normal (Standard)</span>
              </div>
              {fontScale === 'NORMAL' && <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              87.5% scale (~14px base). Crisp, standard typography for desktop monitors.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFontScale('LARGE')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
              fontScale === 'LARGE'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Large (Comfortable)</span>
              </div>
              {fontScale === 'LARGE' && <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              100% scale (~16px base). Ideal for large screens, tablets, or wall-mounted displays.
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Order Board Card Density ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <LayoutGrid className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span>Kitchen Order Board Density</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure default card padding and spacing on the Kitchen Operations and KDS boards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetDensityMode('COMPACT')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
              densityMode === 'COMPACT'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Compact Density</span>
              {densityMode === 'COMPACT' && <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Tight, efficient padding and condensed rows. Fits more orders simultaneously without scrolling.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetDensityMode('COMFORTABLE')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
              densityMode === 'COMFORTABLE'
                ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-400/20 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Comfortable Density</span>
              {densityMode === 'COMFORTABLE' && <Check className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Spacious cards with relaxed item spacing. Great for touchscreens and quick scanning from a distance.
            </p>
          </button>
        </div>
      </div>

      {/* ── 3. Customer Theme & Branding Colors ── */}
      <form onSubmit={handleSaveTheme} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3.5">
        <div className="border-b border-slate-100 pb-2.5">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Palette className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span>Digital Menu Customer Branding</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Customize your digital menu color scheme and customer-facing typography.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 w-10 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-8 w-10 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Accent Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-8 w-10 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branding Font Family</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-400 font-semibold cursor-pointer"
          >
            <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Sans-Serif)</option>
            <option value="Instrument Serif">Instrument Serif (Elegant Display Serif)</option>
            <option value="Fraunces">Fraunces (Warm Editorial Serif)</option>
            <option value="JetBrains Mono">JetBrains Mono (Technical Monospace)</option>
          </select>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Branding Colors
          </Button>
        </div>
      </form>
    </div>
  );
};
