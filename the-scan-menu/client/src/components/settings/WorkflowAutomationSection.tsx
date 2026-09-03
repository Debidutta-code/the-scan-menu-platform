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
import { Button } from '../ui/Button';

export interface WorkflowAutomationSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const WorkflowAutomationSection: React.FC<WorkflowAutomationSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId, user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
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

  // Order Workflow & Customer Verification (OTP)
  const [orderWorkflowMode, setOrderWorkflowMode] = useState<'FIVE_STEP' | 'FOUR_STEP' | 'THREE_STEP'>(() => {
    if (!targetRestaurantId) return 'FIVE_STEP';
    const cached = localStorage.getItem(`pixora_workflow_mode_${targetRestaurantId}`);
    return (cached as any) || 'FIVE_STEP';
  });
  const [orderingPaymentPolicy, setOrderingPaymentPolicy] = useState<'PREPAID' | 'POSTPAID'>('POSTPAID');
  const [customerOtpEnabled, setCustomerOtpEnabled] = useState(false);

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
      setCustomerOtpEnabled(Boolean(raw.orderConfig?.customerOtpEnabled ?? raw.customerOtpEnabled ?? false));
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
      toast('Order Workflow & Verification rules saved!', 'success');
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
      customerOtpEnabled,
      orderConfig: {
        customerOtpEnabled,
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
    <form onSubmit={handleSaveWorkflow} className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3.5 font-sans select-none">
      <div className="border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider font-mono">
          <GitBranch className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
          <span>Order Workflow &amp; Verification Rules</span>
        </h4>
        <p className="text-[11px] text-slate-500 mt-0.5">Define order step lifecycle, manual waiter acceptance, and customer SMS verification.</p>
      </div>

      {hasActiveOrders && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <h5 className="font-bold text-xs">Action Disabled: Active Orders Exist</h5>
            <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">
              You cannot change the order workflow while there are active orders being processed. Please serve or cancel all pending, preparing, or ready orders before changing this setting to prevent state mismatches.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
              className={`p-3 rounded-xl border text-left transition space-y-2 cursor-pointer ${
                isSelected
                  ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20 shadow-2xs'
                  : hasActiveOrders
                  ? 'border-slate-200/80 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-bold ${isSelected ? 'text-amber-800' : 'text-slate-900'}`}>
                    {mode.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{mode.desc}</p>
                </div>
                {isSelected && (
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg viewBox="0 0 12 12" className="w-2 h-2 text-white fill-current">
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
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 mt-1.5 pt-1.5 border-t border-slate-100/80">
                {mode.steps.map((step, i) => (
                  <div key={step} className="flex items-center gap-1 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${mode.colors[i]}`} />
                    <span className="text-[9px] font-bold text-slate-500 font-mono">{step}</span>
                    {i < mode.steps.length - 1 && <span className="text-[9px] text-slate-300 ml-0.5 font-mono">›</span>}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Customer Verification (OTP) Config */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
            <span>Customer Phone Verification</span>
          </h5>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
            isSuperAdmin ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {isSuperAdmin ? 'Super Admin Configurable' : 'Platform Managed (Super Admin Only)'}
          </span>
        </div>

        <label className={`flex items-start gap-2.5 p-3 border border-slate-200/80 rounded-xl transition shadow-2xs ${
          isSuperAdmin && !hasActiveOrders ? 'cursor-pointer hover:bg-slate-50' : 'bg-slate-50/70 opacity-80 cursor-not-allowed'
        }`}>
          <div className="mt-0.5">
            <input
              type="checkbox"
              disabled={!isSuperAdmin || hasActiveOrders}
              checked={customerOtpEnabled}
              onChange={(e) => isSuperAdmin && !hasActiveOrders && setCustomerOtpEnabled(e.target.checked)}
              className={`h-4 w-4 rounded text-amber-500 accent-amber-500 border-slate-300 ${
                !isSuperAdmin || hasActiveOrders ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900">Require OTP (SMS PIN) verification for customer orders</p>
              {!isSuperAdmin && (
                <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                  Locked
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
              {customerOtpEnabled
                ? 'Diners must verify their phone number via a 4-digit PIN before placing orders.'
                : 'Diners provide their name and phone number without SMS OTP. Reduces checkout friction and eliminates SMS costs.'}
              {!isSuperAdmin && (
                <span className="block text-[10px] text-slate-400 italic mt-0.5">
                  Contact Platform Super Administrator to toggle this module in the tenant feature flags.
                </span>
              )}
            </p>
          </div>
        </label>

        {/* Operational Notice */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
          <p className="text-[11px] leading-relaxed">
            <strong>Manual Staff Confirmation Active:</strong> All incoming customer orders will arrive in the <span className="font-semibold text-slate-800">Pending Review</span> queue. A waiter or manager must review and explicitly accept them before tickets are sent to the kitchen.
          </p>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="submit"
          disabled={hasActiveOrders}
          isLoading={updateMutation.isPending}
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          Save Workflow Settings
        </Button>
      </div>
    </form>
  );
};
