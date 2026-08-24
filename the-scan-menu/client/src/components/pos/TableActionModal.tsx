import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  Loader,
  Receipt,
  User,
} from 'lucide-react';
import { Table, TableZone } from '../../services/restaurant.service';

interface TableActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: Table | null;
  allTables: Table[];
  zones: TableZone[];
  onTransfer: (sourceTableId: string, targetTableId: string, reason?: string) => Promise<void>;
  onMerge: (primaryTableId: string, secondaryTableIds: string[]) => Promise<void>;
  isTransferring: boolean;
  isMerging: boolean;
}

type ModalTab = 'OVERVIEW' | 'TRANSFER' | 'MERGE';

export const TableActionModal: React.FC<TableActionModalProps> = ({
  isOpen,
  onClose,
  selectedTable,
  allTables,
  zones,
  onTransfer,
  onMerge,
  isTransferring,
  isMerging,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('OVERVIEW');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');

  if (!isOpen || !selectedTable) return null;

  // Filter available target tables (excluding current table)
  const availableTargetTables = allTables.filter((t) => {
    if (t._id === selectedTable._id) return false;
    const matchesZone =
      zoneFilter === 'ALL' ||
      (typeof t.zoneId === 'object' && t.zoneId?._id === zoneFilter) ||
      t.zoneId === zoneFilter;
    const isFree = !t.activeSession && t.status !== 'OCCUPIED';
    return matchesZone && isFree;
  });

  // Eligible secondary tables to merge
  const mergeCandidateTables = allTables.filter((t) => {
    if (t._id === selectedTable._id) return false;
    const matchesZone =
      zoneFilter === 'ALL' ||
      (typeof t.zoneId === 'object' && t.zoneId?._id === zoneFilter) ||
      t.zoneId === zoneFilter;
    return matchesZone;
  });

  const toggleSecondaryTable = (id: string) => {
    setSelectedSecondaryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) return;
    await onTransfer(selectedTable._id, targetTableId, transferReason);
    onClose();
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSecondaryIds.length === 0) return;
    await onMerge(selectedTable._id, selectedSecondaryIds);
    onClose();
  };

  const session = selectedTable.activeSession;
  const runningTotal = session?.total ? session.total / 100 : 0;

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
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
              {selectedTable.tableNumber}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedTable.displayName || `Table ${selectedTable.tableNumber}`}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {session ? `Active Session (${session.sessionCode || 'Running'})` : 'Active Table'}
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-150 px-6 bg-white gap-2 pt-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'OVERVIEW'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('TRANSFER')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'TRANSFER'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Table
          </button>
          <button
            onClick={() => setActiveTab('MERGE')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'MERGE'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            Merge Tables
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Running Bill</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    ₹{runningTotal.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest Count</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <User className="w-5 h-5 text-slate-400" />
                    {session?.guestCount || 1}
                  </div>
                </div>
              </div>

              {session?.linkedTableIds && session.linkedTableIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-150 text-indigo-900 text-xs">
                  <span className="font-bold flex items-center gap-1.5 mb-1 text-indigo-700">
                    <GitMerge className="w-4 h-4" /> Merged Tables Linked:
                  </span>
                  This session spans multiple tables merged together.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('TRANSFER')}
                  className="flex-1 py-3 px-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-sm flex items-center justify-center gap-2 border border-amber-200 transition-all"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Table
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MERGE')}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm flex items-center justify-center gap-2 border border-indigo-200 transition-all"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge With Table
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER */}
          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Moving this active session to another table will transfer all live orders and update kitchen KDS & POS routes.
                </span>
              </div>

              {/* Zone Filter */}
              {zones.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setZoneFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      zoneFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Zones
                  </button>
                  {zones.map((z) => (
                    <button
                      key={z._id}
                      type="button"
                      onClick={() => setZoneFilter(z._id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        zoneFilter === z._id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Target Table Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Destination Table (Available)
                </label>
                {availableTargetTables.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    No available free tables found in this zone.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {availableTargetTables.map((t) => {
                      const isSelected = targetTableId === t._id;
                      return (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => setTargetTableId(t._id)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-xs ring-2 ring-amber-400/40'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="font-bold text-sm">{t.tableNumber}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-full">
                            {t.displayName || `Table ${t.tableNumber}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Transfer (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guest requested AC section / larger seating"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!targetTableId || isTransferring}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isTransferring ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Confirm Transfer
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MERGE */}
          {activeTab === 'MERGE' && (
            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-indigo-800 text-xs flex items-start gap-2">
                <GitMerge className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <span>
                  Select tables to merge into <strong>Table {selectedTable.tableNumber}</strong>. Their live orders and dining sessions will be combined under this primary bill.
                </span>
              </div>

              {/* Zone Filter */}
              {zones.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setZoneFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      zoneFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Zones
                  </button>
                  {zones.map((z) => (
                    <button
                      key={z._id}
                      type="button"
                      onClick={() => setZoneFilter(z._id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        zoneFilter === z._id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Multi-Table Checkbox Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Tables to Combine ({selectedSecondaryIds.length} selected)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {mergeCandidateTables.map((t) => {
                    const isChecked = selectedSecondaryIds.includes(t._id);
                    const isOccupied = t.activeSession || t.status === 'OCCUPIED';
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => toggleSecondaryTable(t._id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center relative ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-xs ring-2 ring-indigo-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {isChecked && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 absolute top-1.5 right-1.5" />
                        )}
                        <span className="font-bold text-sm">{t.tableNumber}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-full">
                          {isOccupied ? 'Occupied' : 'Free'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={selectedSecondaryIds.length === 0 || isMerging}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isMerging ? <Loader className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                  Merge Tables ({selectedSecondaryIds.length})
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TableActionModal;
