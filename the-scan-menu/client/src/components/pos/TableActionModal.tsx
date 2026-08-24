import React, { useState, useEffect, useMemo } from 'react';
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
  MapPin,
  Sparkles,
  ChevronRight,
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
  const [activeTab, setActiveTab] = useState<ModalTab>('TRANSFER');
  const [sourceTableId, setSourceTableId] = useState<string>('');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  
  // Merge state
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [mergeDestinationId, setMergeDestinationId] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [isProcessingCombined, setIsProcessingCombined] = useState<boolean>(false);

  // Helper to get Zone Name from table
  const getZoneName = (table: Table): string => {
    if (table.zoneId && typeof table.zoneId === 'object' && 'name' in table.zoneId) {
      return table.zoneId.name;
    }
    if (typeof table.zoneId === 'string') {
      const found = zones.find((z) => z._id === table.zoneId);
      if (found) return found.name;
    }
    return 'Main Dining';
  };

  // Helper to check if a table is occupied
  const isTableOccupied = (table: Table): boolean => {
    return Boolean(table.activeSession || table.status === 'OCCUPIED' || (table.activeOrderCount && table.activeOrderCount > 0));
  };

  // Synchronize initial state when modal opens or selectedTable changes
  useEffect(() => {
    if (isOpen) {
      const initialSource = selectedTable?._id || allTables.find(isTableOccupied)?._id || allTables[0]?._id || '';
      setSourceTableId(initialSource);
      setTargetTableId('');
      setTransferReason('');
      setZoneFilter('ALL');
      
      // Default merge selection includes initial source
      if (initialSource) {
        setMergeSelectedIds([initialSource]);
        setMergeDestinationId(initialSource);
      } else {
        setMergeSelectedIds([]);
        setMergeDestinationId('');
      }

      // If opened directly from an active table overview, start on OVERVIEW, otherwise TRANSFER
      if (selectedTable && isTableOccupied(selectedTable)) {
        setActiveTab('OVERVIEW');
      } else {
        setActiveTab('TRANSFER');
      }
    }
  }, [isOpen, selectedTable, allTables]);

  const currentSourceTable = useMemo(() => {
    return allTables.find((t) => t._id === sourceTableId) || selectedTable || allTables[0];
  }, [allTables, sourceTableId, selectedTable]);

  // Occupied tables for source selection
  const occupiedTables = useMemo(() => {
    return allTables.filter((t) => isTableOccupied(t));
  }, [allTables]);

  // Available free tables for transfer target
  const availableTargetTables = useMemo(() => {
    return allTables.filter((t) => {
      if (t._id === sourceTableId) return false;
      const matchesZone =
        zoneFilter === 'ALL' ||
        (typeof t.zoneId === 'object' && t.zoneId?._id === zoneFilter) ||
        t.zoneId === zoneFilter;
      const isFree = !isTableOccupied(t);
      return matchesZone && isFree;
    });
  }, [allTables, sourceTableId, zoneFilter]);

  // Merge candidate tables (filtered by zone)
  const filteredMergeTables = useMemo(() => {
    return allTables.filter((t) => {
      const matchesZone =
        zoneFilter === 'ALL' ||
        (typeof t.zoneId === 'object' && t.zoneId?._id === zoneFilter) ||
        t.zoneId === zoneFilter;
      return matchesZone;
    });
  }, [allTables, zoneFilter]);

  // Destination options for merge: Can be one of the selected tables OR any available free table
  const mergeDestinationOptions = useMemo(() => {
    const selectedTablesList = allTables.filter((t) => mergeSelectedIds.includes(t._id));
    const freeTablesList = allTables.filter(
      (t) => !mergeSelectedIds.includes(t._id) && !isTableOccupied(t)
    );
    return {
      selectedTables: selectedTablesList,
      freeTables: freeTablesList,
    };
  }, [allTables, mergeSelectedIds]);

  const toggleMergeSelection = (id: string) => {
    setMergeSelectedIds((prev) => {
      const isAlreadySelected = prev.includes(id);
      let updated: string[];
      if (isAlreadySelected) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }

      // If current destination was this unselected table, reset destination
      if (isAlreadySelected && mergeDestinationId === id) {
        setMergeDestinationId(updated[0] || '');
      } else if (!isAlreadySelected && !mergeDestinationId) {
        setMergeDestinationId(id);
      }

      return updated;
    });
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTableId || !targetTableId) return;
    await onTransfer(sourceTableId, targetTableId, transferReason);
    onClose();
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeSelectedIds.length < 2 && (!mergeDestinationId || mergeSelectedIds.includes(mergeDestinationId))) {
      // Need at least 2 tables to merge or 1 table moving to a new table
      if (mergeSelectedIds.length === 0) return;
    }

    try {
      setIsProcessingCombined(true);

      // Determine primary table and secondary tables
      const isDestinationInSelected = mergeSelectedIds.includes(mergeDestinationId);
      
      if (isDestinationInSelected) {
        // Simple merge into one of the selected tables
        const primaryId = mergeDestinationId;
        const secondaryIds = mergeSelectedIds.filter((id) => id !== primaryId);
        if (secondaryIds.length > 0) {
          await onMerge(primaryId, secondaryIds);
        }
      } else {
        // Merge into the first selected table, then transfer to the new destination table
        const primaryId = mergeSelectedIds[0];
        const secondaryIds = mergeSelectedIds.slice(1);
        
        if (secondaryIds.length > 0) {
          await onMerge(primaryId, secondaryIds);
        }
        
        // If a separate destination was picked, transfer the merged session there
        if (mergeDestinationId && mergeDestinationId !== primaryId) {
          await onTransfer(
            primaryId,
            mergeDestinationId,
            `Merged tables [${mergeSelectedIds.map((id) => allTables.find((t) => t._id === id)?.tableNumber).join(', ')}] relocated`
          );
        }
      }

      onClose();
    } finally {
      setIsProcessingCombined(false);
    }
  };

  if (!isOpen) return null;

  const session = currentSourceTable?.activeSession;
  const runningTotal = session?.total ? session.total / 100 : 0;
  const isBusy = isTransferring || isMerging || isProcessingCombined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-500/20 shadow-xs">
              {currentSourceTable?.tableNumber || '#'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {currentSourceTable?.displayName || `Table ${currentSourceTable?.tableNumber}`}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[10px] font-bold">
                  <MapPin className="w-2.5 h-2.5 text-slate-500" />
                  {currentSourceTable ? getZoneName(currentSourceTable) : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTableOccupied(currentSourceTable)
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {isTableOccupied(currentSourceTable)
                  ? session?.sessionCode
                    ? `Active Session (${session.sessionCode})`
                    : 'Occupied Session'
                  : 'Available / Empty Table'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-150 px-5 sm:px-6 bg-white gap-2 pt-2">
          {session && (
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Overview
            </button>
          )}
          <button
            onClick={() => setActiveTab('TRANSFER')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
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
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'MERGE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            Merge & Relocate
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Running Bill
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    ₹{runningTotal.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Guest Count
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1.5">
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
                  This session currently spans multiple merged tables.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('TRANSFER')}
                  className="flex-1 py-3 px-4 rounded-2xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs flex items-center justify-center gap-2 border border-amber-200 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  Transfer Table
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MERGE')}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-all cursor-pointer"
                >
                  <GitMerge className="w-4 h-4 text-indigo-600" />
                  Merge With Other Tables
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER */}
          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">
                  Moving an active table session automatically updates all live kitchen KDS orders, waiter calls, and counter POS routes to the new table.
                </span>
              </div>

              {/* 1. SELECT SOURCE TABLE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Moving From (Occupied Table)
                </label>
                {occupiedTables.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No active/occupied tables found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {occupiedTables.map((t) => {
                      const isSelected = sourceTableId === t._id;
                      const zName = getZoneName(t);
                      return (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => setSourceTableId(t._id)}
                          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-400/40 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-slate-900">
                              Table {t.tableNumber}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <div className="mt-1">
                            <div className="text-[11px] font-semibold text-slate-700 truncate">
                              {t.displayName || `Table ${t.tableNumber}`}
                            </div>
                            <div className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded-md mt-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{zName}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. SELECT DESTINATION TABLE */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    2. Select Destination Table (Available)
                  </label>
                </div>

                {/* Zone Filter Chips */}
                {zones.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setZoneFilter('ALL')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        zoneFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
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
                        className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                          zoneFilter === z._id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {z.name}
                      </button>
                    ))}
                  </div>
                )}

                {availableTargetTables.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    No free tables found in this zone.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {availableTargetTables.map((t) => {
                      const isSelected = targetTableId === t._id;
                      const zName = getZoneName(t);
                      return (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => setTargetTableId(t._id)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-xs ring-2 ring-amber-400/40'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-slate-900">
                              Table {t.tableNumber}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              FREE
                            </span>
                          </div>
                          <div className="mt-1">
                            <div className="text-[11px] font-semibold text-slate-700 truncate">
                              {t.displayName || `Table ${t.tableNumber}`}
                            </div>
                            <div className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md mt-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                              <span className="truncate">{zName}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Transfer Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Transfer (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guest requested window table / AC seating"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sourceTableId || !targetTableId || isBusy}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isBusy ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  Confirm Transfer
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MERGE & RELOCATE */}
          {activeTab === 'MERGE' && (
            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-indigo-950 text-xs flex items-start gap-2.5">
                <GitMerge className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold text-indigo-900 block">
                    Combine Multiple Tables into One Bill & Session
                  </span>
                  <span>
                    Select 2 or more tables to combine their orders. You can keep them seated at one of the tables, or move the entire merged party to a larger free table.
                  </span>
                </div>
              </div>

              {/* Zone Filter Chips */}
              {zones.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setZoneFilter('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      zoneFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
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
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                        zoneFilter === z._id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 1: Multi-Table Selection Grid with Clear Zone Badges */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Select Tables to Combine ({mergeSelectedIds.length} Selected)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {filteredMergeTables.map((t) => {
                    const isChecked = mergeSelectedIds.includes(t._id);
                    const isOccupied = isTableOccupied(t);
                    const zName = getZoneName(t);
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => toggleMergeSelection(t._id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs ring-2 ring-indigo-500/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {isChecked && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 absolute top-2 right-2" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-900">
                              Table {t.tableNumber}
                            </span>
                            {isOccupied && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                            {t.displayName || `Table ${t.tableNumber}`}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-bold bg-slate-100/90 px-1.5 py-0.5 rounded-md truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                            {zName}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                              isOccupied
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOccupied ? 'Occupied' : 'Free'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose Final Seating Table */}
              {mergeSelectedIds.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Where will the combined group sit? (Final Destination Table)
                  </label>

                  <div className="space-y-2">
                    {/* Option A: Seat at one of the combined tables */}
                    <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
                      Option A: Keep at one of the selected tables
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mergeDestinationOptions.selectedTables.map((t) => {
                        const isDest = mergeDestinationId === t._id;
                        const zName = getZoneName(t);
                        return (
                          <button
                            key={t._id}
                            type="button"
                            onClick={() => setMergeDestinationId(t._id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isDest
                                ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="text-xs font-black">
                              Table {t.tableNumber} ({t.displayName || 'Selected'})
                            </div>
                            <div className={`text-[10px] mt-0.5 ${isDest ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {zName}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Option B: Move to a larger free table */}
                    {mergeDestinationOptions.freeTables.length > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 mt-3">
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                          Option B: Or move combined party to an available free table
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-0.5">
                          {mergeDestinationOptions.freeTables.map((t) => {
                            const isDest = mergeDestinationId === t._id;
                            const zName = getZoneName(t);
                            return (
                              <button
                                key={t._id}
                                type="button"
                                onClick={() => setMergeDestinationId(t._id)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isDest
                                    ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className="text-xs font-black">
                                  Table {t.tableNumber} ({t.displayName || 'Free'})
                                </div>
                                <div className={`text-[10px] mt-0.5 ${isDest ? 'text-emerald-100' : 'text-slate-500'}`}>
                                  {zName} • Free Table
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Real-time Summary Box */}
              {mergeSelectedIds.length > 0 && mergeDestinationId && (
                <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Merge Summary:</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Combining{' '}
                    <strong className="text-white">
                      {mergeSelectedIds
                        .map((id) => {
                          const t = allTables.find((tbl) => tbl._id === id);
                          return `Table ${t?.tableNumber} (${getZoneName(t || ({} as Table))})`;
                        })
                        .join(' + ')}
                    </strong>{' '}
                    ➔ Final seating at{' '}
                    <strong className="text-amber-300">
                      Table {allTables.find((t) => t._id === mergeDestinationId)?.tableNumber} (
                      {getZoneName(allTables.find((t) => t._id === mergeDestinationId) || ({} as Table))})
                    </strong>
                    . All food orders & active bills will be merged together.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    mergeSelectedIds.length === 0 ||
                    !mergeDestinationId ||
                    isBusy
                  }
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isBusy ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <GitMerge className="w-4 h-4" />
                  )}
                  Confirm Merge & Seating
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
