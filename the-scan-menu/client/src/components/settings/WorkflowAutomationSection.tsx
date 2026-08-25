import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureFlags } from '../../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/api';
import {
  GitBranch,
  Timer,
  AlertCircle,
  Save,
  Loader,
} from 'lucide-react';

export interface WorkflowAutomationSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const WorkflowAutomationSection: React.FC<WorkflowAutomationSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  // Fetch active orders to block workflow changes during live service
  const { data: activeOrdersData } = useQuery({
    queryKey: ['activeOrdersQueue', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!targetRestaurantId && isEnabled('ordering'),
  });
  const hasActiveOrders = activeOrdersData?.success && activeOrdersData.data.length > 0;

  // Order Workflow & Automation
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP'>(() => {
    if (!targetRestaurantId) return 'FIVE_STEP';
    const cached = localStorage.getItem(`pixora_workflow_mode_${targetRestaurantId}`);
    return (cached as any) || 'FIVE_STEP';
  });
  const [orderingPaymentPolicy, setOrderingPaymentPolicy] = useState<'PREPAID' | 'POSTPAID'>('POSTPAID');
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [autoAcceptDelay, setAutoAcceptDelay] = useState(10);

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
      const raw = restaurantResponse.data;
      const serverWorkflow = raw.orderWorkflowMode || 'FIVE_STEP';
      setOrderWorkflowMode(serverWorkflow);
      if (targetRestaurantId) {
        localStorage.setItem(`pixora_workflow_mode_${targetRestaurantId}`, serverWorkflow);
      }
      const mode = raw.paymentConfig?.activeMode || raw.activeMode || 'POSTPAID';
      setOrderingPaymentPolicy(mode);
      setAutoAcceptEnabled(mode === 'PREPAID' ? false : !!raw.autoAcceptConfig?.enabled);
      setAutoAcceptDelay(raw.autoAcceptConfig?.delaySeconds ?? 10);
    }
  }, [restaurantResponse, targetRestaurantId]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch(`/restaurants/${targetRestaurantId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      if (targetRestaurantId) {
        localStorage.setItem(`pixora_workflow_mode_${targetRestaurantId}`, orderWorkflowMode);
      }
      toast('Order Workflow & Automation rules saved!', 'success');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfileInfo', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantDetail', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating workflow settings', 'error');
    },
  });

  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasActiveOrders) {
      toast('Cannot change workflow while active orders are processing', 'error');
      return;
    }

    updateMutation.mutate({
      orderWorkflowMode,
      activeMode: orderingPaymentPolicy,
      autoAcceptConfig: {
        enabled: orderingPaymentPolicy === 'PREPAID' ? false : autoAcceptEnabled,
        delaySeconds: autoAcceptDelay,
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
    <form onSubmit={handleSaveWorkflow} className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
          <span>Order Workflow & Auto-Accept Rules</span>
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">Define order step lifecycle and auto-dispatch timers.</p>
      </div>

      {hasActiveOrders && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <h5 className="font-bold text-sm">Action Disabled: Active Orders Exist</h5>
            <p className="text-xs text-rose-600 mt-1 leading-relaxed">
              You cannot change the order workflow while there are active orders being processed. Please serve or cancel all pending, preparing, or ready orders before changing this setting to prevent state mismatches.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          {
            value: 'FIVE_STEP',
            label: '5-Step Standard',
            desc: 'New → Accepted → Preparing → Ready → Served',
            steps: ['New', 'Accepted', 'Preparing', 'Ready', 'Served'],
            colors: ['bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-purple-500', 'bg-blue-500'],
          },
          {
            value: 'FOUR_STEP',
            label: '4-Step Kitchen & Ready',
            desc: 'New → Preparing → Ready → Served',
            steps: ['New', 'Preparing', 'Ready', 'Served'],
            colors: ['bg-amber-500', 'bg-indigo-500', 'bg-purple-500', 'bg-blue-500'],
          },
          {
            value: 'THREE_STEP',
            label: '3-Step Express',
            desc: 'New → Preparing → Served',
            steps: ['New', 'Preparing', 'Served'],
            colors: ['bg-amber-500', 'bg-indigo-500', 'bg-blue-500'],
          },
        ] as const).map((mode) => {
          const isSelected = orderWorkflowMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={hasActiveOrders}
              onClick={() => !hasActiveOrders && setOrderWorkflowMode(mode.value)}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 space-y-3 cursor-pointer ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/50 shadow-md'
                  : hasActiveOrders
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-extrabold ${isSelected ? 'text-amber-700' : 'text-slate-800'}`}>
                    {mode.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{mode.desc}</p>
                </div>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white fill-current">
                      <path
                        d="M1.5 6.5l3 3L10.5 3"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 mt-2 pt-2 border-t border-slate-100/60">
                {mode.steps.map((step, i) => (
                  <div key={step} className="flex items-center gap-1 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${mode.colors[i]}`} />
                    <span className="text-[10px] font-bold text-slate-500">{step}</span>
                    {i < mode.steps.length - 1 && <span className="text-[10px] text-slate-300 ml-0.5">›</span>}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ordering Payment Policy Selector */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <GitBranch className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
          <span>Ordering Payment Policy</span>
        </h5>
        <p className="text-xs text-slate-500">Choose when guest payment is verified for dine-in orders.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={hasActiveOrders}
            onClick={() => {
              if (hasActiveOrders) return;
              setOrderingPaymentPolicy('POSTPAID');
            }}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              orderingPaymentPolicy === 'POSTPAID'
                ? 'border-amber-500 bg-amber-50/50 text-slate-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="text-sm font-extrabold text-slate-900 block">POSTPAID Mode</span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Guests pay after dining. Table cannot be freed after service until bill is marked Paid.
            </span>
          </button>

          <button
            type="button"
            disabled={hasActiveOrders}
            onClick={() => {
              if (hasActiveOrders) return;
              setOrderingPaymentPolicy('PREPAID');
              setAutoAcceptEnabled(false);
            }}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              orderingPaymentPolicy === 'PREPAID'
                ? 'border-amber-500 bg-amber-50/50 text-slate-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="text-sm font-extrabold text-slate-900 block">PREPAID Mode</span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Guests pay before cooking starts. Order cannot move to kitchen until payment is verified.
            </span>
          </button>
        </div>
      </div>

      {/* Auto-Accept Automation */}
      <div className={`pt-4 border-t border-slate-100 space-y-4 transition-all ${orderingPaymentPolicy === 'PREPAID' ? 'opacity-40 filter blur-[0.5px] pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <span>Auto-Accept Orders</span>
          </h5>
          {orderingPaymentPolicy === 'PREPAID' && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
              Available only in Postpaid Mode
            </span>
          )}
        </div>

        <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition">
          <div className="mt-0.5">
            <input
              type="checkbox"
              disabled={hasActiveOrders || orderingPaymentPolicy === 'PREPAID'}
              checked={orderingPaymentPolicy !== 'PREPAID' && autoAcceptEnabled}
              onChange={(e) => !hasActiveOrders && orderingPaymentPolicy !== 'PREPAID' && setAutoAcceptEnabled(e.target.checked)}
              className={`h-4 w-4 rounded text-amber-500 accent-amber-500 border-slate-300 ${hasActiveOrders || orderingPaymentPolicy === 'PREPAID' ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Automatically accept new incoming orders</p>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              New orders will be auto-accepted and moved to{' '}
              <strong>{orderWorkflowMode === 'FIVE_STEP' ? 'Accepted' : 'Preparing'}</strong> after delay.
            </p>
          </div>
        </label>

        {autoAcceptEnabled && (
          <div className="ml-1 space-y-3">
            <label className="block text-xs font-semibold text-slate-600">Auto-accept timer delay</label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={hasActiveOrders}
                  onClick={() => !hasActiveOrders && setAutoAcceptDelay(sec)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    autoAcceptDelay === sec
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : hasActiveOrders
                      ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                  }`}
                >
                  {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending || hasActiveOrders}
          className={`px-6 py-3 font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow-md cursor-pointer ${
            hasActiveOrders
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              : 'bg-slate-950 hover:bg-slate-800 text-white disabled:bg-slate-400'
          }`}
        >
          {updateMutation.isPending ? (
            <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
          ) : (
            <Save className="w-4 h-4" strokeWidth={1.75} />
          )}
          <span>Save Workflow Settings</span>
        </button>
      </div>
    </form>
  );
};
