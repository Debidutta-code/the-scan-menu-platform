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
import { Button } from '../ui/Button';

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
    <form onSubmit={handleSaveTheme} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3.5 select-none font-sans">
      <div className="border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
          <Palette className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
          <span>Theme &amp; Customer Interface Colors</span>
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Customize your digital menu color scheme and typography.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600">Primary Color</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-8 w-9 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white shadow-2xs"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600">Secondary Color</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="h-8 w-9 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white shadow-2xs"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600">Accent Color</label>
          <div className="flex gap-1.5 items-center">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-8 w-9 border border-slate-200 rounded-lg cursor-pointer p-0 bg-white shadow-2xs"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branding Font Family</label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-amber-400 font-semibold"
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
          Save Theme &amp; Branding
        </Button>
      </div>
    </form>
  );
};
