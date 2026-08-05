import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';
import {
  Plug,
  RefreshCw,
  Loader,
  Store,
  Settings,
  X,
  Search,
} from 'lucide-react';

export const AdminPOSIntegrations: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOutlet, setEditingOutlet] = useState<any | null>(null);
  const [outletIdInput, setOutletIdInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [enabledInput, setEnabledInput] = useState(false);

  // Fetch POS Outlets
  const { data: outletsResponse, isLoading: isLoadingOutlets } = useQuery({
    queryKey: ['adminPOSOutlets'],
    queryFn: adminService.getPOSOutlets,
  });

  // Fetch POS Sync Logs
  const { data: syncLogsResponse, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['adminPOSSyncLogs'],
    queryFn: () => adminService.getPOSSyncLogs(1, 50),
  });

  // Trigger manual sync mutation
  const syncMutation = useMutation({
    mutationFn: (restaurantId: string) => adminService.triggerPOSMenuSync(restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPOSOutlets'] });
      queryClient.invalidateQueries({ queryKey: ['adminPOSSyncLogs'] });
      toast('POS menu catalog sync triggered successfully!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error triggering POS sync', 'error');
    },
  });

  // Save POS Config mutation
  const configMutation = useMutation({
    mutationFn: ({ restaurantId, data }: { restaurantId: string; data: any }) =>
      adminService.updatePOSConfig(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPOSOutlets'] });
      setEditingOutlet(null);
      toast('POS configuration updated!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating POS config', 'error');
    },
  });

  if (isLoadingOutlets || isLoadingLogs) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  const outlets = outletsResponse?.data || [];
  const logs = syncLogsResponse?.data?.logs || [];

  const filteredOutlets = outlets.filter((o: any) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = outlets.filter((o: any) => o.petpoojaConfig?.enabled).length;

  const handleEditClick = (outlet: any) => {
    setEditingOutlet(outlet);
    setOutletIdInput(outlet.petpoojaConfig?.outletId || '');
    setApiKeyInput(outlet.petpoojaConfig?.apiKey || '');
    setEnabledInput(outlet.petpoojaConfig?.enabled || false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOutlet) return;
    configMutation.mutate({
      restaurantId: editingOutlet.restaurantId,
      data: {
        enabled: enabledInput,
        outletId: outletIdInput,
        apiKey: apiKeyInput,
      },
    });
  };

  return (
    <div className="w-full space-y-8">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">Third-Party POS Network</span>
          <h2 className="font-display text-3xl font-bold mt-1">External POS Integrations</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg">
            Manage Petpooja and external POS outlet mappings, trigger manual catalog syncs, and inspect live order relay logs.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-extrabold uppercase tracking-wider">Total Outlets</span>
            <Store className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{outlets.length}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-emerald-600">
            <span className="text-xs font-extrabold uppercase tracking-wider">Connected POS Outlets</span>
            <Plug className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{enabledCount}</h3>
        </div>

        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-indigo-500">
            <span className="text-xs font-extrabold uppercase tracking-wider">POS Sync Events Logged</span>
            <RefreshCw className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-2xl font-black font-mono text-slate-900 mt-2">{logs.length}</h3>
        </div>
      </div>

      {/* Outlets POS Configuration Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Plug className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Connected POS Outlets Matrix</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search outlet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
              <tr>
                <th className="py-3 px-4">Outlet</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Petpooja Outlet ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOutlets.map((outlet: any) => {
                const isEnabled = outlet.petpoojaConfig?.enabled;
                return (
                  <tr key={outlet.restaurantId} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {outlet.name}
                      <span className="block text-[10px] text-slate-400 font-mono">Slug: {outlet.slug}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">Petpooja</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {outlet.petpoojaConfig?.outletId || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full ${isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                        {isEnabled ? 'CONNECTED' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {outlet.petpoojaConfig?.lastSyncAt ? new Date(outlet.petpoojaConfig.lastSyncAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => syncMutation.mutate(outlet.restaurantId)}
                        disabled={syncMutation.isPending}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs transition inline-flex items-center gap-1 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>Sync Now</span>
                      </button>

                      <button
                        onClick={() => handleEditClick(outlet)}
                        className="px-2.5 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
                      >
                        <Settings className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.75} />
                        <span>Config</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POS Sync Audit Logs Table */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
          <span>POS Integration Sync Audit Logs</span>
        </h3>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">No POS sync logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-y border-slate-150">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Operation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Message / Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.provider || 'Petpooja'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{log.operation}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 truncate max-w-xs">
                      {log.errorMessage || JSON.stringify(log.requestPayload || log.responsePayload || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Config Modal */}
      {editingOutlet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl font-bold">Configure POS ({editingOutlet.name})</h3>
              <button onClick={() => setEditingOutlet(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Enable Petpooja Integration</span>
                <input
                  type="checkbox"
                  checked={enabledInput}
                  onChange={(e) => setEnabledInput(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Petpooja Outlet ID</label>
                <input
                  type="text"
                  placeholder="PET_OUTLET_123"
                  value={outletIdInput}
                  onChange={(e) => setOutletIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">API Key / App Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOutlet(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-300 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {configMutation.isPending && <Loader className="w-4 h-4 animate-spin" />}
                  <span>Save Config</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPOSIntegrations;
