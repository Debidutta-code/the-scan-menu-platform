import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ArrowRightLeft,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  Receipt,
  User,
  MapPin,
  Sparkles,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Table, TableZone } from '../../services/restaurant.service';
import { Button } from '../ui/Button';

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

interface ZoneTableGroup {
  zoneId: string;
  zoneName: string;
  tables: Table[];
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
  const getZoneName = (table?: Table | null): string => {
    if (!table) return 'Main Dining';
    if (table.zoneId && typeof table.zoneId === 'object' && 'name' in table.zoneId) {
      return table.zoneId.name;
    }
    if (typeof table.zoneId === 'string') {
      const found = zones.find((z) => z._id === table.zoneId);
      if (found) return found.name;
    }
    return 'Main Dining';
  };

  // Helper to format table clean display name without redundant "Table X (Table X ...)"
  const getCleanDisplayName = (table?: Table | null): string => {
    if (!table) return '';
    const raw = (table.displayName || '').trim();
    if (!raw) return `Table ${table.tableNumber}`;
    if (raw.toLowerCase() === `table ${table.tableNumber}`.toLowerCase() || raw === table.tableNumber) {
      return `Table ${table.tableNumber}`;
    }
    return raw;
  };

  // Helper to check if a table is occupied
  const isTableOccupied = (table: Table): boolean => {
    return Boolean(
      table.activeSession ||
        table.status === 'OCCUPIED' ||
        (table.activeOrderCount && table.activeOrderCount > 0)
    );
  };

  // Group an array of tables by Zone
  const groupTablesByZone = useCallback(
    (tableList: Table[], filterZoneId: string = 'ALL'): ZoneTableGroup[] => {
      const groups: ZoneTableGroup[] = [];

      // Filter list if specific zone is selected
      const activeList =
        filterZoneId === 'ALL'
          ? tableList
          : tableList.filter((t) => {
              const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
              return tid === filterZoneId;
            });

      // 1. Group by defined zones
      for (const z of zones) {
        if (filterZoneId !== 'ALL' && filterZoneId !== z._id) continue;
        const matching = activeList.filter((t) => {
          const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
          return tid === z._id;
        });
        if (matching.length > 0) {
          groups.push({
            zoneId: z._id,
            zoneName: z.name,
            tables: matching,
          });
        }
      }

      // 2. Group unassigned or general tables
      if (filterZoneId === 'ALL') {
        const unassigned = activeList.filter((t) => {
          const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
          return !tid || !zones.some((z) => z._id === tid);
        });
        if (unassigned.length > 0) {
          groups.push({
            zoneId: 'unassigned',
            zoneName: 'Main Dining / Other',
            tables: unassigned,
          });
        }
      }

      return groups;
    },
    [zones]
  );

  // Synchronize initial state when modal opens or selectedTable changes
  useEffect(() => {
    if (isOpen) {
      const initialSource =
        selectedTable?._id || allTables.find(isTableOccupied)?._id || allTables[0]?._id || '';
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

  // Occupied tables for source selection (grouped by zone)
  const occupiedTableGroups = useMemo(() => {
    const occupied = allTables.filter((t) => isTableOccupied(t));
    return groupTablesByZone(occupied, 'ALL');
  }, [allTables, groupTablesByZone]);

  // Available free tables for transfer target (grouped by zone)
  const availableTargetTableGroups = useMemo(() => {
    const freeTables = allTables.filter((t) => {
      if (t._id === sourceTableId) return false;
      return !isTableOccupied(t);
    });
    return groupTablesByZone(freeTables, zoneFilter);
  }, [allTables, sourceTableId, zoneFilter, groupTablesByZone]);

  // Merge candidate tables (grouped by zone)
  const mergeCandidateTableGroups = useMemo(() => {
    return groupTablesByZone(allTables, zoneFilter);
  }, [allTables, zoneFilter, groupTablesByZone]);

  // Destination options for merge: Can be one of the selected tables OR free tables grouped by zone
  const mergeDestinationOptions = useMemo(() => {
    const selectedTablesList = allTables.filter((t) => mergeSelectedIds.includes(t._id));
    const freeTablesList = allTables.filter(
      (t) => !mergeSelectedIds.includes(t._id) && !isTableOccupied(t)
    );
    const freeTableGroups = groupTablesByZone(freeTablesList, 'ALL');

    return {
      selectedTables: selectedTablesList,
      freeTableGroups,
      totalFreeCount: freeTablesList.length,
    };
  }, [allTables, mergeSelectedIds, groupTablesByZone]);

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
      if (mergeSelectedIds.length === 0) return;
    }

    try {
      setIsProcessingCombined(true);

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

        if (mergeDestinationId && mergeDestinationId !== primaryId) {
          await onTransfer(
            primaryId,
            mergeDestinationId,
            `Merged tables [${mergeSelectedIds
              .map((id) => allTables.find((t) => t._id === id)?.tableNumber)
              .join(', ')}] relocated`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="bg-white w-full max-w-4xl lg:max-w-5xl rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-black text-sm border border-amber-500/20 shadow-2xs shrink-0 font-mono">
              {currentSourceTable?.tableNumber || '#'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {getCleanDisplayName(currentSourceTable)}
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100/70 text-amber-900 text-[10px] font-bold border border-amber-200/60 font-mono">
                  <MapPin className="w-2.5 h-2.5 text-amber-600" />
                  {getZoneName(currentSourceTable)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTableOccupied(currentSourceTable)
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                {isTableOccupied(currentSourceTable)
                  ? session?.sessionCode
                    ? `Active Session (${session.sessionCode})`
                    : 'Active / Occupied'
                  : 'Free Table'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-150 px-4 bg-white gap-2 pt-1.5">
          {session && (
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Session Overview
            </button>
          )}
          <button
            onClick={() => setActiveTab('TRANSFER')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'TRANSFER'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Single Table
          </button>
          <button
            onClick={() => setActiveTab('MERGE')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'MERGE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            Merge & Relocate Tables
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="max-w-2xl mx-auto space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-150 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Running Total
                  </span>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    ₹{runningTotal.toFixed(2)}
                  </div>
                </div>
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-150 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Guest Count
                  </span>
                  <div className="text-3xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <User className="w-6 h-6 text-slate-400" />
                    {session?.guestCount || 1}
                  </div>
                </div>
              </div>

              {session?.linkedTableIds && session.linkedTableIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-150 text-indigo-950 text-xs">
                  <span className="font-bold flex items-center gap-1.5 mb-1 text-indigo-700 text-sm">
                    <GitMerge className="w-4 h-4" /> Merged Tables Linked:
                  </span>
                  This session currently spans multiple merged tables.
                </div>
              )}

              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('TRANSFER')}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer Table
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MERGE')}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <GitMerge className="w-4 h-4" />
                  Merge & Relocate Tables
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSFER */}
          {activeTab === 'TRANSFER' && (
            <form onSubmit={handleTransferSubmit} className="space-y-5">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">
                  Moving an active table session automatically transfers all live kitchen KDS orders, waiter calls, and counter POS routes to the new destination table.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* 1. SOURCE SELECTION (Grouped by Zone) */}
                <div className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                      Moving From (Occupied Table)
                    </label>
                  </div>

                  {occupiedTableGroups.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 text-center">
                      No active/occupied tables found.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-72 overflow-y-auto p-0.5 pr-1">
                      {occupiedTableGroups.map((group) => (
                        <div key={group.zoneId} className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-bold text-slate-800">{group.zoneName}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.2 rounded-full">
                              {group.tables.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.tables.map((t) => {
                              const isSelected = sourceTableId === t._id;
                              return (
                                <button
                                  key={t._id}
                                  type="button"
                                  onClick={() => setSourceTableId(t._id)}
                                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400/40 shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-sm text-slate-900">
                                      Table {t.tableNumber}
                                    </span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 truncate mt-1">
                                    {getCleanDisplayName(t)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. DESTINATION SELECTION (Grouped by Zone) */}
                <div className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                      Select Destination Table (Available)
                    </label>
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
                            : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
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
                              : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                          }`}
                        >
                          {z.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {availableTargetTableGroups.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs bg-white">
                      No free tables found in this zone.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-72 overflow-y-auto p-0.5 pr-1">
                      {availableTargetTableGroups.map((group) => (
                        <div key={group.zoneId} className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold text-slate-800">{group.zoneName}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.2 rounded-full">
                              {group.tables.length} free
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.tables.map((t) => {
                              const isSelected = targetTableId === t._id;
                              return (
                                <button
                                  key={t._id}
                                  type="button"
                                  onClick={() => setTargetTableId(t._id)}
                                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-xs ring-2 ring-emerald-500/40'
                                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-black text-sm text-slate-900">
                                      Table {t.tableNumber}
                                    </span>
                                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md uppercase">
                                      FREE
                                    </span>
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 truncate mt-1">
                                    {getCleanDisplayName(t)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer Reason & Footer */}
              <div className="pt-2 border-t border-slate-150 flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Transfer (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Guest requested window table / AC section"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium bg-slate-50/50"
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto md:min-w-[280px] self-end">
                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="amber"
                    fullWidth
                    disabled={!sourceTableId || !targetTableId}
                    isLoading={isBusy}
                    leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                  >
                    Confirm Transfer
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: MERGE & RELOCATE (Divided and grouped by Zones) */}
          {activeTab === 'MERGE' && (
            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-indigo-950 text-xs flex items-start gap-2.5">
                <GitMerge className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                <div className="space-y-0.5 leading-relaxed">
                  <span className="font-bold text-indigo-900 block text-xs">
                    Multi-Table Merge & Relocate Studio
                  </span>
                  <span>
                    Combine orders from 2 or more tables into a single bill. Then choose whether the combined group remains at one of the tables or moves to a larger free table.
                  </span>
                </div>
              </div>

              {/* 2-COLUMN DESKTOP LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT COLUMN (7 cols): Step 1: Select Tables to Combine (Divided by Zone) */}
                <div className="lg:col-span-7 p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                      Select Tables to Combine ({mergeSelectedIds.length} Selected)
                    </label>
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
                            : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
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
                              : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                          }`}
                        >
                          {z.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grouped Zone Sections */}
                  <div className="space-y-4 max-h-[380px] overflow-y-auto p-0.5 pr-1">
                    {mergeCandidateTableGroups.map((group) => (
                      <div key={group.zoneId} className="space-y-2 bg-white/70 border border-slate-200/70 rounded-2xl p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          <h4 className="font-bold text-slate-900 text-xs tracking-tight">
                            {group.zoneName}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {group.tables.length} tables
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {group.tables.map((t) => {
                            const isChecked = mergeSelectedIds.includes(t._id);
                            const isOccupied = isTableOccupied(t);
                            return (
                              <button
                                key={t._id}
                                type="button"
                                onClick={() => toggleMergeSelection(t._id)}
                                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                                  isChecked
                                    ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 shadow-xs ring-2 ring-indigo-500/40'
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
                                  <div className="text-xs font-bold text-slate-700 truncate mt-0.5">
                                    {getCleanDisplayName(t)}
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center justify-end">
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
                    ))}
                  </div>
                </div>

                {/* RIGHT COLUMN (5 cols): Step 2: Choose Final Seating Table & Confirm */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                      Final Seating (Destination)
                    </label>

                    {mergeSelectedIds.length === 0 ? (
                      <div className="p-5 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                        Please select tables on the left first.
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto p-0.5 pr-1">
                        {/* Option A: Keep at one of selected tables */}
                        <div>
                          <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1 mb-1.5">
                            <ChevronRight className="w-3 h-3 text-indigo-600" />
                            Option A: Keep at one of selected tables
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mergeDestinationOptions.selectedTables.map((t) => {
                              const isDest = mergeDestinationId === t._id;
                              const zName = getZoneName(t);
                              return (
                                <button
                                  key={t._id}
                                  type="button"
                                  onClick={() => setMergeDestinationId(t._id)}
                                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    isDest
                                      ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                  }`}
                                >
                                  <div className="text-xs font-black">
                                    Table {t.tableNumber}
                                  </div>
                                  <div className={`text-[10px] truncate ${isDest ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {getCleanDisplayName(t)} ({zName})
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Option B: Move to free table grouped by zone */}
                        {mergeDestinationOptions.totalFreeCount > 0 && (
                          <div className="space-y-2 pt-1 border-t border-slate-200">
                            <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 mb-1">
                              <ChevronRight className="w-3 h-3 text-emerald-600" />
                              Option B: Move to an available free table
                            </div>

                            {mergeDestinationOptions.freeTableGroups.map((group) => (
                              <div key={group.zoneId} className="space-y-1.5 bg-white/60 p-2 rounded-xl border border-slate-200/60">
                                <div className="flex items-center gap-1.5 px-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-[11px] font-bold text-slate-700">{group.zoneName}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {group.tables.map((t) => {
                                    const isDest = mergeDestinationId === t._id;
                                    return (
                                      <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => setMergeDestinationId(t._id)}
                                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                          isDest
                                            ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-xs'
                                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                        }`}
                                      >
                                        <div className="text-xs font-black">
                                          Table {t.tableNumber}
                                        </div>
                                        <div className={`text-[10px] truncate ${isDest ? 'text-emerald-100' : 'text-slate-500'}`}>
                                          {getCleanDisplayName(t)}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Real-time Summary Box */}
                  {mergeSelectedIds.length > 0 && mergeDestinationId && (
                    <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs space-y-1 shadow-sm">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Live Merge Preview</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Combining{' '}
                        <span className="text-white font-bold">
                          {mergeSelectedIds
                            .map((id) => {
                              const t = allTables.find((tbl) => tbl._id === id);
                              return `Table ${t?.tableNumber} (${getZoneName(t)})`;
                            })
                            .join(' + ')}
                        </span>{' '}
                        <ArrowRight className="inline w-3 h-3 text-amber-400 mx-0.5" /> Seating at{' '}
                        <span className="text-amber-300 font-bold">
                          Table {allTables.find((t) => t._id === mergeDestinationId)?.tableNumber} (
                          {getZoneName(allTables.find((t) => t._id === mergeDestinationId))})
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      fullWidth
                      disabled={mergeSelectedIds.length === 0 || !mergeDestinationId}
                      isLoading={isBusy}
                      leftIcon={<GitMerge className="w-3.5 h-3.5" />}
                    >
                      Confirm Merge &amp; Seating
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TableActionModal;
