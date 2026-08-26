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
    <div className="space-y-6">
      {/* ── 1. Global UI Font Size & Scaling ── */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Type className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
              <span>Operations Panel Text & Font Scale</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Control the base font scaling across the entire manager operations dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <button
            type="button"
            onClick={() => setFontScale('SMALL')}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
              fontScale === 'SMALL'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Small (Compact)</span>
              </div>
              {fontScale === 'SMALL' && <Check className="w-4 h-4 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] text-slate-500">
              81.25% scale (~13px base). Optimized for 13–14" laptops to maximize visible tickets.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFontScale('NORMAL')}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
              fontScale === 'NORMAL'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Normal (Standard)</span>
              </div>
              {fontScale === 'NORMAL' && <Check className="w-4 h-4 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] text-slate-500">
              87.5% scale (~14px base). Crisp, standard typography for desktop monitors.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFontScale('LARGE')}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
              fontScale === 'LARGE'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-slate-700" strokeWidth={2} />
                <span className="text-xs font-bold text-slate-900">Large (Comfortable)</span>
              </div>
              {fontScale === 'LARGE' && <Check className="w-4 h-4 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] text-slate-500">
              100% scale (~16px base). Ideal for large screens, tablets, or wall-mounted displays.
            </p>
          </button>
        </div>
      </div>

      {/* ── 2. Order Board Card Density ── */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Kitchen Order Board Density</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default card padding and spacing on the Kitchen Operations and KDS boards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSetDensityMode('COMPACT')}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
              densityMode === 'COMPACT'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Compact Density</span>
              {densityMode === 'COMPACT' && <Check className="w-4 h-4 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] text-slate-500">
              Tight, efficient padding and condensed rows. Fits more orders simultaneously without scrolling.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetDensityMode('COMFORTABLE')}
            className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between gap-3 ${
              densityMode === 'COMFORTABLE'
                ? 'bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Comfortable Density</span>
              {densityMode === 'COMFORTABLE' && <Check className="w-4 h-4 text-amber-600" strokeWidth={2.5} />}
            </div>
            <p className="text-[11px] text-slate-500">
              Spacious cards with relaxed item spacing. Great for touchscreens and quick scanning from a distance.
            </p>
          </button>
        </div>
      </div>

      {/* ── 3. Customer Theme & Branding Colors ── */}
      <form onSubmit={handleSaveTheme} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Digital Menu Customer Branding</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">Customize your digital menu color scheme and customer-facing typography.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Accent Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-12 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Branding Font Family</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Sans-Serif)</option>
            <option value="Instrument Serif">Instrument Serif (Elegant Display Serif)</option>
            <option value="Fraunces">Fraunces (Warm Editorial Serif)</option>
            <option value="JetBrains Mono">JetBrains Mono (Technical Monospace)</option>
          </select>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md disabled:bg-slate-400 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Save className="w-4 h-4" strokeWidth={1.75} />
            )}
            <span>Save Branding Colors</span>
          </button>
        </div>
      </form>
    </div>
  );
};
