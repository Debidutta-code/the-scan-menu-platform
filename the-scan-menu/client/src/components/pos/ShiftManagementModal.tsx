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
import { Button } from '../ui/Button';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-2xs ${
              currentShift ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <Banknote className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {currentShift ? `Shift #${currentShift.shiftNumber}` : 'Cash Drawer / Shift'}
              </h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${currentShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {currentShift ? `Active since ${new Date(currentShift.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'No active shift open'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader className="w-5 h-5 animate-spin text-amber-500" />
              <span>Loading shift status…</span>
            </div>
          ) : !currentShift ? (
            /* NO ACTIVE SHIFT: OPEN SHIFT VIEW */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span className="text-[11px] leading-relaxed">
                  The cash drawer is currently closed. Opening a shift tracks initial cash float, sales tenders, and cash expenses for the day.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Opening Cash Float (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="1000"
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-400 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Opening Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Shift Cashier Float"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>

              <Button
                type="button"
                variant="emerald"
                fullWidth
                onClick={() => openShiftMutation.mutate()}
                isLoading={openShiftMutation.isPending}
                leftIcon={<Unlock className="w-3.5 h-3.5" />}
              >
                Start Shift &amp; Open Drawer
              </Button>
            </div>
          ) : view === 'DASHBOARD' ? (
            /* VIEW 1: ACTIVE SHIFT DASHBOARD */
            <div className="space-y-3">
              {/* Primary Drawer Cash Metric */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xs">
                <span className="text-[10px] font-bold text-slate-300 uppercase font-mono tracking-wider">Live Cash In Drawer</span>
                <div className="text-2xl sm:text-3xl font-black mt-0.5 font-mono tracking-tight text-emerald-400">
                  {formatINR(currentShift.expectedCashInDrawer)}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-mono">Opening Float</span>
                    <span className="font-bold font-mono text-xs">{formatINR(currentShift.openingFloat)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-mono">(+) Cash Sales</span>
                    <span className="font-bold font-mono text-xs text-emerald-400">+{formatINR(currentShift.cashSales)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-mono">Net Petty Move</span>
                    <span className="font-bold font-mono text-xs text-amber-400">
                      {currentShift.cashIn - currentShift.cashOut >= 0 ? '+' : ''}
                      {formatINR(currentShift.cashIn - currentShift.cashOut)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Cash</span>
                  <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">{formatINR(currentShift.cashSales)}</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Card</span>
                  <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">{formatINR(currentShift.cardSales)}</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center shadow-2xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">UPI / QR</span>
                  <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">{formatINR(currentShift.upiSales)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="amber"
                    onClick={() => setView('PETTY_CASH')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Petty Cash Entry
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrintXReport}
                    leftIcon={<Printer className="w-3.5 h-3.5 text-slate-600" />}
                  >
                    Print X-Report
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  onClick={() => setView('CLOSE_SHIFT')}
                  leftIcon={<Lock className="w-3.5 h-3.5" />}
                >
                  End Shift &amp; Close Drawer (Z-Report)
                </Button>
              </div>
            </div>
          ) : view === 'PETTY_CASH' ? (
            /* VIEW 2: PETTY CASH FORM */
            <div className="space-y-3">
              <div className="flex gap-1.5 p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPettyType('CASH_OUT')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pettyType === 'CASH_OUT'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cash Out (Expense)
                </button>
                <button
                  type="button"
                  onClick={() => setPettyType('CASH_IN')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pettyType === 'CASH_IN'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cash In (Deposit / Float)
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={pettyAmount}
                  onChange={(e) => setPettyAmount(e.target.value)}
                  placeholder="250"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Category
                </label>
                <select
                  value={pettyCategory}
                  onChange={(e) => setPettyCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-400 bg-white shadow-2xs"
                >
                  <option value="GROCERY_DAIRY">Grocery / Dairy / Urgent Supplies</option>
                  <option value="MAINTENANCE">Repairs &amp; Maintenance</option>
                  <option value="STAFF_ADVANCE">Staff Meal / Advance</option>
                  <option value="FLOAT_TOPUP">Float Top-Up</option>
                  <option value="OTHER">Other Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Reason / Description
                </label>
                <input
                  type="text"
                  value={pettyReason}
                  onChange={(e) => setPettyReason(e.target.value)}
                  placeholder="e.g. Purchased 2 packets of milk from local dairy"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setView('DASHBOARD')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="amber"
                  fullWidth
                  onClick={() => pettyCashMutation.mutate()}
                  disabled={!pettyAmount || !pettyReason}
                  isLoading={pettyCashMutation.isPending}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Save Movement
                </Button>
              </div>
            </div>
          ) : (
            /* VIEW 3: CLOSE SHIFT & RECONCILE */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 shadow-2xs">
                <div className="flex justify-between text-slate-600 font-mono">
                  <span>Expected Cash In Drawer:</span>
                  <span className="font-bold text-slate-900">{formatINR(currentShift.expectedCashInDrawer)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Physical Cash Counted (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Enter total counted notes & coins"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>

              {countedCash && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between font-mono shadow-2xs ${
                  discrepancy === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : discrepancy > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <span className="font-bold text-[11px]">
                    {discrepancy === 0 ? 'Exact Match (No Discrepancy)' : discrepancy > 0 ? 'Over Cash (Excess)' : 'Short Cash (Deficit)'}
                  </span>
                  <span className="font-black text-xs">
                    {discrepancy >= 0 ? '+' : ''}₹{discrepancy.toFixed(2)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Closing Notes (Optional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. ₹50 short due to rounding off change"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-400 shadow-2xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setView('DASHBOARD')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  onClick={() => closeShiftMutation.mutate()}
                  disabled={!countedCash}
                  isLoading={closeShiftMutation.isPending}
                  leftIcon={<Lock className="w-3.5 h-3.5" />}
                >
                  Close &amp; Print Z-Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShiftManagementModal;
