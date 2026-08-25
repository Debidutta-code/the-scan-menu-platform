import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Award,
  Sliders,
  Check,
  Save,
  Loader,
  Globe,
  Store,
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import apiClient from '../lib/api';

export const AdminLoyalty: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loyaltyForm, setLoyaltyForm] = useState({
    mode: 'GLOBAL' as 'GLOBAL' | 'OUTLET_WISE',
    enabled: true,
    earningMode: 'PERCENTAGE' as 'PERCENTAGE' | 'SPEND_RATIO' | 'FIXED_PER_ORDER',
    earnPercentage: 50,
    spendRatioPaise: 1000,
    fixedPointsPerOrder: 50,
    validityDays: 7,
    pointValuePaise: 50,
    maxRedemptionPercentPerOrder: 50,
    minPointsToRedeem: 50,
  });

  // Fetch Global Platform Settings
  const { isLoading } = useQuery({
    queryKey: ['adminPlatformSettings'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/platform-settings');
      if (res.data?.data?.loyalty) {
        setLoyaltyForm((prev) => ({ ...prev, ...res.data.data.loyalty }));
      }
      return res.data;
    },
  });

  // Update Global Loyalty Policy Mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch('/admin/platform-settings/loyalty', payload);
      return res.data;
    },
    onSuccess: () => {
      toast('Global Loyalty Program settings updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPlatformSettings'] });
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to update global loyalty policy', 'error');
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <Helmet>
        <title>Loyalty Program Control Console | SuperAdmin</title>
      </Helmet>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Platform Architecture Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 font-mono">
                {loyaltyForm.mode} MODE
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-white mt-1">Loyalty Program Control Console</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              SuperAdmin centralized control panel for managing platform-wide customer rewards and distribution rules.
            </p>
          </div>
        </div>

        <button
          onClick={() => updatePolicyMutation.mutate(loyaltyForm)}
          disabled={updatePolicyMutation.isPending}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          {updatePolicyMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Global Loyalty Policy</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Architecture Mode Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                1. Select Platform Loyalty Architecture Mode
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose whether loyalty points follow a single central global policy or are configured outlet-by-outlet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GLOBAL MODE */}
              <div
                onClick={() => setLoyaltyForm((prev) => ({ ...prev, mode: 'GLOBAL' }))}
                className={`p-5 rounded-2xl border cursor-pointer transition space-y-2 ${
                  loyaltyForm.mode === 'GLOBAL'
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-600" />
                    <span>GLOBAL Loyalty Mode (Recommended)</span>
                  </span>
                  {loyaltyForm.mode === 'GLOBAL' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs text-slate-600">
                  All restaurant outlets automatically inherit this global loyalty policy. Customer points are accumulated and redeemable platform-wide.
                </p>
              </div>

              {/* OUTLET_WISE MODE */}
              <div
                onClick={() => setLoyaltyForm((prev) => ({ ...prev, mode: 'OUTLET_WISE' }))}
                className={`p-5 rounded-2xl border cursor-pointer transition space-y-2 ${
                  loyaltyForm.mode === 'OUTLET_WISE'
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                  <span className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>OUTLET-WISE Loyalty Mode</span>
                  </span>
                  {loyaltyForm.mode === 'OUTLET_WISE' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs text-slate-600">
                  SuperAdmin toggles loyalty feature per tenant in Setup Hub / Feature Flags. Enabled outlets configure local earn rates.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  <span>Global Loyalty Distribution & Validity Settings</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure points distribution rules, 7-day validity expiration window, and checkout discount limits.
                </p>
              </div>
            </div>

            {/* Global Program Toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="font-bold text-sm text-slate-900 block">Enable Platform Loyalty System</span>
                <span className="text-xs text-slate-500">Allow customers to earn and redeem points on menu orders</span>
              </div>
              <button
                type="button"
                onClick={() => setLoyaltyForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  loyaltyForm.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    loyaltyForm.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Earning Mode Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">
                2. Points Earning Distribution System
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setLoyaltyForm((prev) => ({ ...prev, earningMode: 'PERCENTAGE' }))}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    loyaltyForm.earningMode === 'PERCENTAGE'
                      ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                    <span>Percentage of Spend</span>
                    {loyaltyForm.earningMode === 'PERCENTAGE' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Diners earn a % of order total as points (e.g. 50% points on ₹420 = 210 pts).
                  </p>
                </div>

                <div
                  onClick={() => setLoyaltyForm((prev) => ({ ...prev, earningMode: 'SPEND_RATIO' }))}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    loyaltyForm.earningMode === 'SPEND_RATIO'
                      ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                    <span>Spend Ratio (₹ per Point)</span>
                    {loyaltyForm.earningMode === 'SPEND_RATIO' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Diners earn 1 point per ₹X spent on orders (e.g. 1 pt per ₹10).
                  </p>
                </div>

                <div
                  onClick={() => setLoyaltyForm((prev) => ({ ...prev, earningMode: 'FIXED_PER_ORDER' }))}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    loyaltyForm.earningMode === 'FIXED_PER_ORDER'
                      ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                    <span>Fixed Flat Points</span>
                    {loyaltyForm.earningMode === 'FIXED_PER_ORDER' && <Check className="w-4 h-4 text-amber-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Diners earn a flat number of points per completed order.</p>
                </div>
              </div>
            </div>

            {/* Dynamic Inputs */}
            {loyaltyForm.earningMode === 'PERCENTAGE' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800">Earn Percentage (% of Order Total)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={loyaltyForm.earnPercentage}
                    onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, earnPercentage: Number(e.target.value) }))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600">% (Example: spent ₹420 with 50% = 210 points earned)</span>
                </div>
              </div>
            )}

            {loyaltyForm.earningMode === 'SPEND_RATIO' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800">Spend Amount in ₹ per 1 Point</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={loyaltyForm.spendRatioPaise / 100}
                    onChange={(e) =>
                      setLoyaltyForm((prev) => ({ ...prev, spendRatioPaise: Number(e.target.value) * 100 }))
                    }
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600">₹ spent = 1 point earned</span>
                </div>
              </div>
            )}

            {loyaltyForm.earningMode === 'FIXED_PER_ORDER' && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800">Fixed Points per Order</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={loyaltyForm.fixedPointsPerOrder}
                    onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, fixedPointsPerOrder: Number(e.target.value) }))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600">points awarded per completed order</span>
                </div>
              </div>
            )}

            {/* Validity & Expiry Days */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">
                3. Points Expiry & Validity Window
              </label>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800">Validity Period (Days)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={loyaltyForm.validityDays}
                    onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, validityDays: Number(e.target.value) }))}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600">days (Set to 7 for 7-day expiry, or 0 for Never Expire)</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  ⚠️ Points unredeemed past this validity window are automatically expired and deducted from customer balance.
                </p>
              </div>
            </div>

            {/* Checkout Redemption Limits */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">
                4. Next Order Checkout Redemption Limits
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Max Bill Discount Cap (%)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={loyaltyForm.maxRedemptionPercentPerOrder}
                    onChange={(e) =>
                      setLoyaltyForm((prev) => ({ ...prev, maxRedemptionPercentPerOrder: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    Max % of bill total payable via points (e.g. 50% max discount).
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800">Point Cash Value (Paise per point)</label>
                  <input
                    type="number"
                    min="1"
                    value={loyaltyForm.pointValuePaise}
                    onChange={(e) => setLoyaltyForm((prev) => ({ ...prev, pointValuePaise: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-bold bg-white"
                  />
                  <span className="text-[11px] text-slate-500 block">50 paise = ₹0.50 per point. 100 paise = ₹1.00 per point.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoyalty;
