import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import {
  Globe,
  Loader,
  Settings,
  X,
  ShieldCheck,
} from 'lucide-react';

export const AdminWhiteLabel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingDomain, setEditingDomain] = useState<any | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [hidePoweredByInput, setHidePoweredByInput] = useState(false);
  const [primaryColorInput, setPrimaryColorInput] = useState('#111827');
  const [secondaryColorInput, setSecondaryColorInput] = useState('#F59E0B');

  // Fetch White Label Domains
  const { data: domainsResponse, isLoading } = useQuery({
    queryKey: ['adminWhiteLabelDomains'],
    queryFn: adminService.getWhiteLabelDomains,
  });

  // Verify DNS mutation
  const verifyDnsMutation = useMutation({
    mutationFn: (restaurantId: string) => adminService.verifyDomainDNS(restaurantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminWhiteLabelDomains'] });
      toast(data?.message || 'DNS verified!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'DNS verification failed', 'error');
    },
  });

  // Save White Label Config mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: any }) =>
      adminService.updateWhiteLabelConfig(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWhiteLabelDomains'] });
      setEditingDomain(null);
      toast('White-label configuration updated successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating white-label config', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const domains = domainsResponse?.data || [];

  const handleEditClick = (item: any) => {
    setEditingDomain(item);
    setCustomDomainInput(item.whiteLabelConfig?.customDomain || '');
    setHidePoweredByInput(item.whiteLabelConfig?.hidePoweredBy || false);
    setPrimaryColorInput(item.whiteLabelConfig?.primaryColor || '#111827');
    setSecondaryColorInput(item.whiteLabelConfig?.secondaryColor || '#F59E0B');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDomain) return;

    updateConfigMutation.mutate({
      restaurantId: editingDomain.restaurantId,
      data: {
        customDomain: customDomainInput.trim() || null,
        hidePoweredBy: hidePoweredByInput,
        primaryColor: primaryColorInput,
        secondaryColor: secondaryColorInput,
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Enterprise Branding & Domains</span>
          <h2 className="font-display text-3xl font-bold mt-1">White-Label & Custom Domains</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Inspect CNAME domain mappings, verify DNS resolution, and configure "Powered by Pixora" branding overrides for enterprise outlets.
          </p>
        </div>
      </div>

      {/* Custom Domains Directory Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Tenant Custom Domain Mappings Directory</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Custom Domain CNAME</th>
                <th className="py-3 px-4">Hide Powered By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {domains.map((item: any) => {
                const config = item.whiteLabelConfig || {};
                const hasDomain = !!config.customDomain;

                return (
                  <tr key={item.restaurantId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.name}
                      <span className="block text-[10px] text-slate-400 font-mono">Slug: {item.slug}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-extrabold text-amber-700">
                      {item.subscriptionPlan}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {hasDomain ? (
                        <span className="text-slate-900 font-bold bg-slate-100 px-2 py-1 rounded">
                          {config.customDomain}
                        </span>
                      ) : (
                        <span className="text-slate-400">None configured</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-extrabold font-mono px-2 py-0.5 rounded ${config.hidePoweredBy ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-500'}`}>
                        {config.hidePoweredBy ? 'HIDDEN' : 'SHOW BRAND'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      {hasDomain && (
                        <button
                          onClick={() => verifyDnsMutation.mutate(item.restaurantId)}
                          disabled={verifyDnsMutation.isPending}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>Verify DNS</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleEditClick(item)}
                        className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
                      >
                        <Settings className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.75} />
                        <span>Configure</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit White Label Modal */}
      {editingDomain && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl font-bold">White-Label Settings ({editingDomain.name})</h3>
              <button onClick={() => setEditingDomain(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Custom CNAME Domain</label>
                <input
                  type="text"
                  placeholder="menu.gourmetbistro.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Point CNAME to `cname.pixoraqr.com`</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Hide "Powered by Pixora" Footer</span>
                <input
                  type="checkbox"
                  checked={hidePoweredByInput}
                  onChange={(e) => setHidePoweredByInput(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Color (Hex)</label>
                  <input
                    type="color"
                    value={primaryColorInput}
                    onChange={(e) => setPrimaryColorInput(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Secondary Color (Hex)</label>
                  <input
                    type="color"
                    value={secondaryColorInput}
                    onChange={(e) => setSecondaryColorInput(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer p-1"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDomain(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {updateConfigMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                  <span>Save Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWhiteLabel;
