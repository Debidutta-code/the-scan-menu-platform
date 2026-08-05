import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';
import {
  Globe,
  Loader,
  Eye,
} from 'lucide-react';

export const ManagerWhiteLabel: React.FC = () => {
  const { user, impersonatedOutlet } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const restaurantId =
    impersonatedOutlet?.id ||
    (user as any)?.restaurantId ||
    (typeof user?.restaurants?.[0] === 'object' ? (user?.restaurants?.[0] as any)?.restaurantId : user?.restaurants?.[0]) ||
    '';

  // Fetch White Label Settings
  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['managerWhiteLabel', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}`);
      return res.data;
    },
    enabled: !!restaurantId,
  });

  const [customDomainInput, setCustomDomainInput] = useState('');
  const [hidePoweredByInput, setHidePoweredByInput] = useState(false);
  const [primaryColorInput, setPrimaryColorInput] = useState('#111827');
  const [secondaryColorInput, setSecondaryColorInput] = useState('#F59E0B');

  // Initialize inputs when data arrives
  React.useEffect(() => {
    if (settingsResponse?.data) {
      const set = settingsResponse.data.settings?.whiteLabelConfig || {};
      setCustomDomainInput(set.customDomain || '');
      setHidePoweredByInput(set.hidePoweredBy || false);
      setPrimaryColorInput(set.primaryColor || '#111827');
      setSecondaryColorInput(set.secondaryColor || '#F59E0B');
    }
  }, [settingsResponse]);

  // Update Settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.patch(`/restaurants/${restaurantId}`, {
        settings: {
          whiteLabelConfig: {
            customDomain: data.customDomain || null,
            hidePoweredBy: data.hidePoweredBy,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
          },
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerWhiteLabel', restaurantId] });
      toast('Custom white-label branding updated!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating white-label settings', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const restaurant = settingsResponse?.data || {};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      customDomain: customDomainInput.trim() || null,
      hidePoweredBy: hidePoweredByInput,
      primaryColor: primaryColorInput,
      secondaryColor: secondaryColorInput,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Enterprise Branding Customizer</span>
          <h2 className="font-display text-3xl font-bold mt-1">White-Label & Custom Domain</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Customize your customer dining menu interface with your custom CNAME domain (`menu.yourbrand.com`), custom primary/accent brand colors, and hide the Pixora footer tag.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Configuration Form (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Custom Branding Configuration</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Custom Domain Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Custom CNAME Domain</label>
              <input
                type="text"
                placeholder="menu.yourcafe.com"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Point your domain's CNAME record to <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700">cname.pixoraqr.com</code>
              </p>
            </div>

            {/* Hide Powered By Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Hide "Powered by Pixora" Branding</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Removes the Pixora QR badge from your public customer menu footer.</p>
              </div>
              <input
                type="checkbox"
                checked={hidePoweredByInput}
                onChange={(e) => setHidePoweredByInput(e.target.checked)}
                className="w-5 h-5 accent-amber-500"
              />
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Background / Header Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColorInput}
                    onChange={(e) => setPrimaryColorInput(e.target.value)}
                    className="w-12 h-10 border border-slate-200 rounded-xl cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={primaryColorInput}
                    onChange={(e) => setPrimaryColorInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Accent Button Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColorInput}
                    onChange={(e) => setSecondaryColorInput(e.target.value)}
                    className="w-12 h-10 border border-slate-200 rounded-xl cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={secondaryColorInput}
                    onChange={(e) => setSecondaryColorInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-md"
              >
                {updateMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                <span>Save White-Label Branding</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live UI Preview Pane (1/3 width) */}
        <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Eye className="w-4.5 h-4.5 text-indigo-500" strokeWidth={1.75} />
            <span>Live Customer Menu Preview</span>
          </h3>

          {/* Simulated Mobile Mockup */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50">
            <div style={{ backgroundColor: primaryColorInput }} className="p-4 text-white">
              <span className="text-[9px] font-mono uppercase font-bold text-amber-300">Table #04</span>
              <h4 className="font-display font-bold text-lg leading-tight mt-0.5">{restaurant.name || 'Your Restaurant'}</h4>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <h5 className="font-bold text-slate-900">Woodfired Pizza</h5>
                  <span className="text-[10px] text-slate-400 font-mono">₹450</span>
                </div>
                <button
                  style={{ backgroundColor: secondaryColorInput }}
                  className="px-3 py-1 text-slate-950 font-extrabold rounded-lg text-[10px]"
                >
                  + Add
                </button>
              </div>

              {!hidePoweredByInput && (
                <div className="text-center pt-4 border-t border-slate-200">
                  <span className="text-[9px] text-slate-400 font-mono">Powered by Pixora QR</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManagerWhiteLabel;
