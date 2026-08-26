import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import {
  Code,
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Lock,
  Loader,
  AlertTriangle,
  Send,
  Eye,
} from 'lucide-react';
import apiClient from '../lib/api';

interface ApiKeyItem {
  _id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
  isActive: boolean;
}

interface WebhookLog {
  _id: string;
  event: string;
  responseStatus?: number;
  errorMessage?: string;
  deliveredAt: string;
}

interface WebhookItem {
  _id: string;
  targetUrl: string;
  events: string[];
  secret: string;
  failureCount: number;
  isActive: boolean;
  deliveryLogs?: WebhookLog[];
  createdAt: string;
}

export const ManagerDeveloper: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modals state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['menu:read', 'orders:read']);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['order.created', 'order.status_updated']);

  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<WebhookLog[] | null>(null);

  // Fetch API Keys
  const { data: keysResponse, isLoading: isLoadingKeys } = useQuery({
    queryKey: ['apiKeys', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/developer/api-keys`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('api_webhooks'),
  });

  // Fetch Webhooks
  const { data: webhooksResponse, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ['webhooks', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/developer/webhooks`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEnabled('api_webhooks'),
  });

  // Create Key Mutation
  const createKeyMutation = useMutation({
    mutationFn: async (payload: { name: string; scopes: string[] }) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/developer/api-keys`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data.rawKey) {
        setCreatedRawKey(data.data.rawKey);
        queryClient.invalidateQueries({ queryKey: ['apiKeys', activeRestaurantId] });
      }
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating API key', 'error');
    },
  });

  // Revoke Key Mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await apiClient.delete(`/restaurants/${activeRestaurantId}/developer/api-keys/${keyId}`);
      return res.data;
    },
    onSuccess: () => {
      toast('API Key revoked successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['apiKeys', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error revoking API key', 'error');
    },
  });

  // Create Webhook Mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (payload: { targetUrl: string; events: string[] }) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/developer/webhooks`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Webhook subscription created successfully', 'success');
      setShowWebhookModal(false);
      setTargetUrl('');
      queryClient.invalidateQueries({ queryKey: ['webhooks', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating webhook subscription', 'error');
    },
  });

  // Delete Webhook Mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await apiClient.delete(`/restaurants/${activeRestaurantId}/developer/webhooks/${webhookId}`);
      return res.data;
    },
    onSuccess: () => {
      toast('Webhook subscription deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['webhooks', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting webhook', 'error');
    },
  });

  // Test Ping Webhook Mutation
  const pingWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await apiClient.post(`/restaurants/${activeRestaurantId}/developer/webhooks/${webhookId}/test`);
      return res.data;
    },
    onSuccess: () => {
      toast('Test webhook ping dispatched', 'success');
      queryClient.invalidateQueries({ queryKey: ['webhooks', activeRestaurantId] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error testing webhook', 'error');
    },
  });

  if (!isEnabled('api_webhooks')) {
    return (
      <div className="w-full space-y-8 font-sans">
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Developer API & Webhooks Gated</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            API key generation, OpenAPI access, and HMAC outgoing webhooks are available on Professional & Enterprise tiers.
          </p>
        </div>
      </div>
    );
  }

  const apiKeys: ApiKeyItem[] = keysResponse?.data || [];
  const webhooks: WebhookItem[] = webhooksResponse?.data || [];

  return (
    <div className="w-full space-y-4 font-sans select-none pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <span>Developer Portal & Webhooks</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage third-party API keys and configure HMAC-SHA256 signed event webhooks.
          </p>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">API Keys</h3>
          </div>
          <button
            onClick={() => {
              setKeyName('');
              setCreatedRawKey(null);
              setShowKeyModal(true);
            }}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Generate New API Key</span>
          </button>
        </div>

        {isLoadingKeys ? (
          <div className="p-8 text-center">
            <Loader className="w-6 h-6 animate-spin text-amber-500 mx-auto" strokeWidth={1.75} />
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No API keys generated yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {apiKeys.map((key) => (
              <div key={key._id} className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{key.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] rounded-md">
                      {key.keyPrefix}
                    </span>
                    {!key.isActive && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Scopes: {key.scopes.join(', ')}</span>
                    <span>•</span>
                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {key.isActive && (
                  <button
                    onClick={() => revokeKeyMutation.mutate(key._id)}
                    disabled={revokeKeyMutation.isPending}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Outgoing Webhooks</h3>
          </div>
          <button
            onClick={() => setShowWebhookModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Webhook Subscription</span>
          </button>
        </div>

        {isLoadingWebhooks ? (
          <div className="p-8 text-center">
            <Loader className="w-6 h-6 animate-spin text-indigo-500 mx-auto" strokeWidth={1.75} />
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No webhooks configured.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {webhooks.map((sub) => (
              <div key={sub._id} className="py-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono font-bold text-slate-800">{sub.targetUrl}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Events: {sub.events.join(', ')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => pingWebhookMutation.mutate(sub._id)}
                      disabled={pingWebhookMutation.isPending}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ping</span>
                    </button>
                    {sub.deliveryLogs && sub.deliveryLogs.length > 0 && (
                      <button
                        onClick={() => setSelectedWebhookLogs(sub.deliveryLogs || [])}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Logs</span>
                      </button>
                    )}
                    <button
                      onClick={() => deleteWebhookMutation.mutate(sub._id)}
                      disabled={deleteWebhookMutation.isPending}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg">
                  <span>Secret: {sub.secret.substring(0, 14)}...</span>
                  <span>Failures: {sub.failureCount}</span>
                  <span>Status: {sub.isActive ? 'Active' : 'Disabled (High Failures)'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">Generate New API Key</h3>

            {createdRawKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Copy your API key now. <strong>It will never be shown again!</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Your Secret API Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdRawKey}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdRawKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowKeyModal(false)}
                  className="w-full py-3 bg-slate-950 text-white font-bold text-xs rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Key Description Name</label>
                  <input
                    type="text"
                    placeholder="e.g., ERP System Integration"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Scope Entitlements</label>
                  <div className="space-y-2">
                    {[
                      { id: 'menu:read', label: 'menu:read (Read menu catalog)' },
                      { id: 'orders:read', label: 'orders:read (Read orders)' },
                      { id: 'orders:write', label: 'orders:write (Create orders)' },
                      { id: 'webhooks:manage', label: 'webhooks:manage (Manage webhooks)' },
                    ].map((scope) => (
                      <label key={scope.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                            }
                          }}
                          className="rounded text-amber-500"
                        />
                        <span>{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowKeyModal(false)}
                    className="w-1/2 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createKeyMutation.mutate({ name: keyName, scopes: selectedScopes })}
                    disabled={!keyName || createKeyMutation.isPending}
                    className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl disabled:bg-slate-300"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">Add Webhook Subscription</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://yourserver.com/api/webhooks"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Trigger Events</label>
                <div className="space-y-2">
                  {[
                    { id: 'order.created', label: 'order.created (New order placed)' },
                    { id: 'order.status_updated', label: 'order.status_updated (Order status changed)' },
                    { id: 'inventory.low_stock', label: 'inventory.low_stock (Stock below threshold / 86d)' },
                    { id: 'table_session.closed', label: 'table_session.closed (Table session paid/closed)' },
                  ].map((evt) => (
                    <label key={evt.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents([...selectedEvents, evt.id]);
                          } else {
                            setSelectedEvents(selectedEvents.filter((ev) => ev !== evt.id));
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWebhookModal(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createWebhookMutation.mutate({ targetUrl, events: selectedEvents })}
                  disabled={!targetUrl || createWebhookMutation.isPending}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:bg-slate-300"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Delivery Logs Drawer/Modal */}
      {selectedWebhookLogs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Webhook Delivery Logs</h3>
              <button
                onClick={() => setSelectedWebhookLogs(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedWebhookLogs.map((log, idx) => (
                <div key={log._id || idx} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.event}</span>
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded ${
                        log.responseStatus && log.responseStatus < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      HTTP {log.responseStatus || 'FAILED'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px]">{new Date(log.deliveredAt).toLocaleString()}</p>
                  {log.errorMessage && <p className="text-red-600 font-mono text-[11px]">{log.errorMessage}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDeveloper;
