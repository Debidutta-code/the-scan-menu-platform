import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  Palette,
  Save,
  Loader,
} from 'lucide-react';

export interface ThemeBrandingSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const ThemeBrandingSection: React.FC<ThemeBrandingSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

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
      toast('Theme & Branding settings saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating Theme settings', 'error');
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
    <form onSubmit={handleSaveTheme} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Theme & Customer Interface Colors</span>
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">Customize your digital menu color scheme and typography.</p>
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
          <span>Save Theme & Branding</span>
        </button>
      </div>
    </form>
  );
};
