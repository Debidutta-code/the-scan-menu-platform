import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  X,
  Lock,
  Unlock,
  Banknote,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Loader,
  Plus,
} from 'lucide-react';
import apiClient from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { printShiftReport, formatINR } from '../../utils/printShiftReport';

interface ShiftManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantInfo?: { name?: string; address?: string; phone?: string };
}

type ModalView = 'DASHBOARD' | 'PETTY_CASH' | 'CLOSE_SHIFT' | 'OPEN_SHIFT';

export const ShiftManagementModal: React.FC<ShiftManagementModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  restaurantInfo,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ModalView>('DASHBOARD');

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState('1000');
  const [openNotes, setOpenNotes] = useState('');

  // Petty Cash Form State
  const [pettyType, setPettyType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [pettyAmount, setPettyAmount] = useState('');
  const [pettyCategory, setPettyCategory] = useState<string>('SUPPLIES');
  const [pettyReason, setPettyReason] = useState('');

  // Close Shift Form State
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Fetch Current Active Shift
  const { data: shiftData, isLoading } = useQuery({
    queryKey: ['currentShift', restaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${restaurantId}/shifts/current`);
      return res.data;
    },
    enabled: isOpen && !!restaurantId,
    refetchInterval: 10000,
  });

  const currentShift = shiftData?.data || null;

  // Open Shift Mutation
  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/restaurants/${restaurantId}/shifts/open`, {
        openingFloat: parseFloat(openingFloat) || 0,
        notes: openNotes,
      });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['currentShift', restaurantId] });
      toast(res.message || 'Shift opened successfully!', 'success');
      setView('DASHBOARD');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to open shift', 'error');
    },
  });

  // Petty Cash Mutation
  const pettyCashMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/restaurants/${restaurantId}/shifts/${currentShift._id}/petty-cash`, {
        type: pettyType,
        amount: parseFloat(pettyAmount),
        category: pettyCategory,
        reason: pettyReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentShift', restaurantId] });
      toast(`Petty cash ${pettyType === 'CASH_IN' ? 'added' : 'deducted'} successfully!`, 'success');
      setPettyAmount('');
      setPettyReason('');
      setView('DASHBOARD');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to record petty cash', 'error');
    },
  });

  // Close Shift Mutation
  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/restaurants/${restaurantId}/shifts/${currentShift._id}/close`, {
        actualCashCounted: parseFloat(countedCash) || 0,
        notes: closeNotes,
      });
      return res.data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['currentShift', restaurantId] });
      toast('Shift closed and reconciled successfully!', 'success');

      // Fetch Z-Report and trigger print
      try {
        const zReportRes = await apiClient.get(`/restaurants/${restaurantId}/shifts/${currentShift._id}/z-report`);
        if (zReportRes.data?.data) {
          printShiftReport(zReportRes.data.data, restaurantInfo);
        }
      } catch (printErr) {
        console.error('Failed to auto-print Z-Report:', printErr);
      }

      onClose();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to close shift', 'error');
    },
  });

  // Handle Print X-Report
  const handlePrintXReport = async () => {
    try {
      const res = await apiClient.get(`/restaurants/${restaurantId}/shifts/reports/x-report`);
      if (res.data?.data) {
        printShiftReport(res.data.data, restaurantInfo);
        toast('X-Report sent to printer', 'success');
      }
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Failed to print X-Report', 'error');
    }
  };

  if (!isOpen) return null;

  const expectedInDrawer = currentShift ? currentShift.expectedCashInDrawer / 100 : 0;
  const countedNum = parseFloat(countedCash) || 0;
  const discrepancy = countedCash ? countedNum - expectedInDrawer : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
              currentShift ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <Banknote className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {currentShift ? `Shift #${currentShift.shiftNumber}` : 'Cash Drawer / Shift'}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {currentShift ? `Active since ${new Date(currentShift.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'No active shift open'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
              Loading shift status…
            </div>
          ) : !currentShift ? (
            /* NO ACTIVE SHIFT: OPEN SHIFT VIEW */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  The cash drawer is currently closed. Opening a shift tracks initial cash float, sales tenders, and cash expenses for the day.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Opening Cash Float (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="1000"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Opening Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Shift Cashier Float"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => openShiftMutation.mutate()}
                disabled={openShiftMutation.isPending}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {openShiftMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Start Shift & Open Drawer
              </button>
            </div>
          ) : view === 'DASHBOARD' ? (
            /* VIEW 1: ACTIVE SHIFT DASHBOARD */
            <div className="space-y-5">
              {/* Primary Drawer Cash Metric */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Cash In Drawer</span>
                <div className="text-3xl font-black mt-1 font-display tracking-tight text-emerald-400">
                  {formatINR(currentShift.expectedCashInDrawer)}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Opening Float</span>
                    <span className="font-bold">{formatINR(currentShift.openingFloat)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">(+) Cash Sales</span>
                    <span className="font-bold text-emerald-400">+{formatINR(currentShift.cashSales)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Net Petty Move</span>
                    <span className="font-bold text-amber-400">
                      {currentShift.cashIn - currentShift.cashOut >= 0 ? '+' : ''}
                      {formatINR(currentShift.cashIn - currentShift.cashOut)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cash</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{formatINR(currentShift.cashSales)}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Card</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{formatINR(currentShift.cardSales)}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">UPI / QR</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{formatINR(currentShift.upiSales)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setView('PETTY_CASH')}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200/80 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add / Drop Petty Cash
                  </span>
                  <span className="text-[11px] text-amber-600 font-normal">Petty Expenses, Float Top-up</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintXReport}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print X-Report
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Mid-shift audit receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setView('CLOSE_SHIFT')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> End Shift & Reconcile Day (Z-Report)
                </button>
              </div>
            </div>
          ) : view === 'PETTY_CASH' ? (
            /* VIEW 2: PETTY CASH FORM */
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPettyType('CASH_OUT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    pettyType === 'CASH_OUT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cash Out (Expense)
                </button>
                <button
                  type="button"
                  onClick={() => setPettyType('CASH_IN')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    pettyType === 'CASH_IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cash In (Deposit / Float)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={pettyAmount}
                  onChange={(e) => setPettyAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={pettyCategory}
                  onChange={(e) => setPettyCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                >
                  <option value="SUPPLIES">Emergency Supplies / Groceries</option>
                  <option value="VENDOR_PAYOUT">Vendor / Delivery Payout</option>
                  <option value="REFUND">Customer Cash Refund</option>
                  <option value="STAFF_ADVANCE">Staff Meal / Advance</option>
                  <option value="FLOAT_TOPUP">Float Top-Up</option>
                  <option value="OTHER">Other Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  value={pettyReason}
                  onChange={(e) => setPettyReason(e.target.value)}
                  placeholder="e.g. Purchased 2 packets of milk from local dairy"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView('DASHBOARD')}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => pettyCashMutation.mutate()}
                  disabled={!pettyAmount || !pettyReason || pettyCashMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pettyCashMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Movement
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 3: CLOSE SHIFT & RECONCILE */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Expected Cash In Drawer:</span>
                  <span className="font-bold text-slate-900">{formatINR(currentShift.expectedCashInDrawer)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Cash Counted (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Enter total counted notes & coins"
                  className="w-full px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {countedCash && (
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                  discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : discrepancy > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="font-semibold">
                    {discrepancy === 0 ? 'Exact Match (No Discrepancy)' : discrepancy > 0 ? 'Over Cash (Excess)' : 'Short Cash (Deficit)'}
                  </span>
                  <span className="font-bold text-sm">
                    {discrepancy >= 0 ? '+' : ''}₹{discrepancy.toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Closing Notes (Optional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. ₹50 short due to rounding off change"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView('DASHBOARD')}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => closeShiftMutation.mutate()}
                  disabled={!countedCash || closeShiftMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {closeShiftMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Close & Print Z-Report
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShiftManagementModal;
