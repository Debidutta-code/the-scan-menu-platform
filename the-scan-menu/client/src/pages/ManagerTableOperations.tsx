import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  GitMerge,
  Search,
  X,
  CheckCircle2,
  Loader,
  RefreshCw,
  Sparkles,
  ArrowRight,
  User,
  Utensils,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useManagerTables } from '../hooks/useManagerTables';
import { Table } from '../services/restaurant.service';
import { useToast } from '../hooks/useToast';

type OperationMode = 'TRANSFER' | 'MERGE';

interface ZoneTableGroup {
  zoneId: string;
  zoneName: string;
  tables: Table[];
}

export const ManagerTableOperations: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();

  const {
    tables,
    zones,
    isLoading: isLoadingTables,
    refetchTables,
    transferTableMutation,
    mergeTablesMutation,
  } = useManagerTables(activeRestaurantId);

  // Mode state
  const initialMode = searchParams.get('mode') === 'merge' ? 'MERGE' : 'TRANSFER';
  const initialSourceId = searchParams.get('sourceTableId') || '';

  const [mode, setMode] = useState<OperationMode>(initialMode);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Transfer state
  const [sourceTableId, setSourceTableId] = useState<string>(initialSourceId);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  // Merge state
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>(
    initialSourceId ? [initialSourceId] : []
  );
  const [mergeDestinationId, setMergeDestinationId] = useState<string>(initialSourceId);
  const [isProcessingMerge, setIsProcessingMerge] = useState<boolean>(false);

  // Helpers
  const isTableOccupied = (table?: Table | null): boolean => {
    if (!table) return false;
    return Boolean(
      table.activeSession ||
        table.status === 'OCCUPIED' ||
        (table.activeOrderCount && table.activeOrderCount > 0)
    );
  };

  const getZoneName = useCallback(
    (table?: Table | null): string => {
      if (!table) return 'Main Dining';
      if (table.zoneId && typeof table.zoneId === 'object' && 'name' in table.zoneId) {
        return table.zoneId.name;
      }
      if (typeof table.zoneId === 'string') {
        const found = zones.find((z) => z._id === table.zoneId);
        if (found) return found.name;
      }
      return 'Main Dining';
    },
    [zones]
  );

  const getCleanDisplayName = (table?: Table | null): string => {
    if (!table) return '';
    const raw = (table.displayName || '').trim();
    if (!raw) return `Table ${table.tableNumber}`;
    if (raw.toLowerCase() === `table ${table.tableNumber}`.toLowerCase() || raw === table.tableNumber) {
      return `Table ${table.tableNumber}`;
    }
    return raw;
  };

  // Pre-select if URL params change
  useEffect(() => {
    if (initialSourceId) {
      setSourceTableId(initialSourceId);
      setMergeSelectedIds([initialSourceId]);
      setMergeDestinationId(initialSourceId);
    }
  }, [initialSourceId]);

  // Filtered tables based on search
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase();
    return tables.filter((t) => {
      const numMatch = t.tableNumber.toLowerCase().includes(q);
      const nameMatch = (t.displayName || '').toLowerCase().includes(q);
      const zoneMatch = getZoneName(t).toLowerCase().includes(q);
      const sessionMatch = t.activeSession?.sessionCode?.toLowerCase().includes(q);
      return numMatch || nameMatch || zoneMatch || sessionMatch;
    });
  }, [tables, searchQuery, getZoneName]);

  // Group filtered tables by Zone
  const zoneGroups = useMemo(() => {
    const groups: ZoneTableGroup[] = [];

    // Filter list if specific zone chip is active
    const activeList =
      activeZoneFilter === 'ALL'
        ? filteredTables
        : filteredTables.filter((t) => {
            const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
            return tid === activeZoneFilter;
          });

    // 1. Defined zones
    for (const z of zones) {
      if (activeZoneFilter !== 'ALL' && activeZoneFilter !== z._id) continue;
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

    // 2. Unassigned or general tables
    if (activeZoneFilter === 'ALL') {
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
  }, [filteredTables, zones, activeZoneFilter]);

  // Selected Objects
  const sourceTable = useMemo(
    () => tables.find((t) => t._id === sourceTableId) || null,
    [tables, sourceTableId]
  );
  const targetTable = useMemo(
    () => tables.find((t) => t._id === targetTableId) || null,
    [tables, targetTableId]
  );
  const mergeDestinationTable = useMemo(
    () => tables.find((t) => t._id === mergeDestinationId) || null,
    [tables, mergeDestinationId]
  );

  // Table Selection Handlers for Transfer Mode
  const handleTransferTableClick = (table: Table) => {
    const isOccupied = isTableOccupied(table);

    if (!sourceTableId) {
      if (!isOccupied) {
        toast('Please tap an occupied table first to transfer from.', 'info');
        return;
      }
      setSourceTableId(table._id);
      return;
    }

    // Source is already chosen:
    if (sourceTableId === table._id) {
      // Unselect source
      setSourceTableId('');
      setTargetTableId('');
      return;
    }

    if (isOccupied) {
      // Switch source table
      setSourceTableId(table._id);
      setTargetTableId('');
      toast(`Switched source table to Table ${table.tableNumber}`, 'info');
      return;
    }

    // It's a free table -> Select as target!
    setTargetTableId(table._id);
  };

  // Table Selection Handlers for Merge Mode
  const handleMergeTableClick = (table: Table) => {
    setMergeSelectedIds((prev) => {
      const exists = prev.includes(table._id);
      let next: string[];
      if (exists) {
        next = prev.filter((id) => id !== table._id);
      } else {
        next = [...prev, table._id];
      }

      // Maintain valid merge destination
      if (exists && mergeDestinationId === table._id) {
        setMergeDestinationId(next[0] || '');
      } else if (!exists && !mergeDestinationId) {
        setMergeDestinationId(table._id);
      }

      return next;
    });
  };

  // Reset Actions
  const handleReset = () => {
    setSourceTableId('');
    setTargetTableId('');
    setTransferReason('');
    setMergeSelectedIds([]);
    setMergeDestinationId('');
  };

  // Execute Transfer
  const handleExecuteTransfer = async () => {
    if (!sourceTableId || !targetTableId) return;
    try {
      await transferTableMutation.mutateAsync({
        sourceTableId,
        targetTableId,
        reason: transferReason,
      });
      handleReset();
    } catch {
      // Toast handled by mutation
    }
  };

  // Execute Merge & Relocate
  const handleExecuteMerge = async () => {
    if (mergeSelectedIds.length < 1 || !mergeDestinationId) return;

    try {
      setIsProcessingMerge(true);

      const isDestinationInSelected = mergeSelectedIds.includes(mergeDestinationId);

      if (isDestinationInSelected) {
        // Direct merge into chosen table
        const primaryId = mergeDestinationId;
        const secondaryIds = mergeSelectedIds.filter((id) => id !== primaryId);
        if (secondaryIds.length > 0) {
          await mergeTablesMutation.mutateAsync({
            primaryTableId: primaryId,
            secondaryTableIds: secondaryIds,
          });
        }
      } else {
        // Merge into the first selected table, then transfer to final destination
        const primaryId = mergeSelectedIds[0];
        const secondaryIds = mergeSelectedIds.slice(1);

        if (secondaryIds.length > 0) {
          await mergeTablesMutation.mutateAsync({
            primaryTableId: primaryId,
            secondaryTableIds: secondaryIds,
          });
        }

        if (mergeDestinationId && mergeDestinationId !== primaryId) {
          await transferTableMutation.mutateAsync({
            sourceTableId: primaryId,
            targetTableId: mergeDestinationId,
            reason: `Merged tables [${mergeSelectedIds
              .map((id) => tables.find((t) => t._id === id)?.tableNumber)
              .join(', ')}] relocated`,
          });
        }
      }

      handleReset();
    } finally {
      setIsProcessingMerge(false);
    }
  };

  const isBusy =
    transferTableMutation.isPending || mergeTablesMutation.isPending || isProcessingMerge;

  const totalOccupied = tables.filter((t) => isTableOccupied(t)).length;
  const totalFree = tables.length - totalOccupied;

  return (
    <div className="min-h-screen bg-slate-100/60 pb-36 font-sans">
      {/* ── TOP STICKY HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/manager/tables')}
              className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
              title="Back to Table Management"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Table Move & Merge Studio
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200/70">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Tap tables to quickly move sessions or combine bills in real-time
              </p>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('TRANSFER');
                handleReset();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                mode === 'TRANSFER'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Quick Transfer (Move)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('MERGE');
                handleReset();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                mode === 'MERGE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge & Combine Tables</span>
            </button>
          </div>

          {/* Right: Quick Stats & Refresh */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {totalOccupied} Occupied
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{totalFree} Available</span>
            </div>
            <button
              type="button"
              onClick={() => refetchTables()}
              disabled={isLoadingTables}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Refresh tables status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTables ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── STEPPER GUIDE BANNER ─────────────────────────────────────────────── */}
        <div
          className={`p-4 rounded-3xl border shadow-xs transition-all ${
            mode === 'TRANSFER'
              ? 'bg-amber-50/90 border-amber-200/80 text-amber-950'
              : 'bg-indigo-50/90 border-indigo-200/80 text-indigo-950'
          }`}
        >
          {mode === 'TRANSFER' ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {sourceTableId && !targetTableId ? '2' : '1'}
                </div>
                <div>
                  <h2 className="text-sm font-black text-amber-950">
                    {!sourceTableId
                      ? 'Step 1: Tap the occupied table you want to move'
                      : !targetTableId
                      ? `Step 2: Now tap an available FREE table to move Table ${sourceTable?.tableNumber} to`
                      : `Ready: Moving Table ${sourceTable?.tableNumber} ➔ Table ${targetTable?.tableNumber}`}
                  </h2>
                  <p className="text-xs text-amber-800/90">
                    Live orders, kitchen KDS tickets, and guest dining sessions will transfer seamlessly.
                  </p>
                </div>
              </div>

              {sourceTable && (
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="px-3 py-1 rounded-xl bg-white text-amber-900 font-black text-xs border border-amber-200 shadow-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Selected: Table {sourceTable.tableNumber} ({getCleanDisplayName(sourceTable)})
                  </span>
                  <button
                    onClick={() => {
                      setSourceTableId('');
                      setTargetTableId('');
                    }}
                    className="p-1 rounded-lg text-amber-700 hover:bg-amber-200/60 transition"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-indigo-950">
                    {mergeSelectedIds.length === 0
                      ? 'Step 1: Tap 2 or more tables to combine their dining sessions'
                      : `Step 2: ${mergeSelectedIds.length} tables selected. Choose where the merged group will sit`}
                  </h2>
                  <p className="text-xs text-indigo-800/90">
                    All food items and bills merge into one primary bill.
                  </p>
                </div>
              </div>

              {mergeSelectedIds.length > 0 && (
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="px-3 py-1 rounded-xl bg-white text-indigo-950 font-black text-xs border border-indigo-200 shadow-xs">
                    {mergeSelectedIds.length} Tables Selected
                  </span>
                  <button
                    onClick={handleReset}
                    className="p-1 rounded-lg text-indigo-700 hover:bg-indigo-200/60 transition text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ZONE CHIPS & SEARCH FILTER BAR ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
          {/* Zone Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveZoneFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeZoneFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Zones ({tables.length})
            </button>
            {zones.map((z) => {
              const countInZone = tables.filter((t) => {
                const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
                return tid === z._id;
              }).length;
              return (
                <button
                  key={z._id}
                  type="button"
                  onClick={() => setActiveZoneFilter(z._id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    activeZoneFilter === z._id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {z.name} ({countInZone})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── ZONE-WISE TABLE FLOOR GRID ───────────────────────────────────────── */}
        {zoneGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">No Tables Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? `No tables match "${searchQuery}"` : 'No tables exist in this zone.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {zoneGroups.map((group) => (
              <div
                key={group.zoneId}
                className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden"
              >
                {/* Zone Section Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      {group.zoneName}
                    </h3>
                    <span className="text-[11px] font-extrabold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      {group.tables.length} tables
                    </span>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 hidden sm:block">
                    {group.tables.filter((t) => isTableOccupied(t)).length} Occupied •{' '}
                    {group.tables.filter((t) => !isTableOccupied(t)).length} Free
                  </div>
                </div>

                {/* Table Cards Grid */}
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {group.tables.map((table) => {
                    const isOccupied = isTableOccupied(table);
                    const session = table.activeSession;
                    const runningBill = session?.total ? session.total / 100 : 0;

                    // Transfer mode selection states
                    const isSource = sourceTableId === table._id;
                    const isTarget = targetTableId === table._id;

                    // Merge mode selection states
                    const isMergeSelected = mergeSelectedIds.includes(table._id);
                    const isMergeDest = mergeDestinationId === table._id;

                    let cardStyling = 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs';

                    if (mode === 'TRANSFER') {
                      if (isSource) {
                        cardStyling =
                          'border-amber-500 bg-amber-50/90 ring-4 ring-amber-400/30 shadow-md shadow-amber-500/10';
                      } else if (isTarget) {
                        cardStyling =
                          'border-emerald-500 bg-emerald-50/90 ring-4 ring-emerald-400/30 shadow-md shadow-emerald-500/10';
                      } else if (sourceTableId && !isOccupied) {
                        cardStyling =
                          'border-emerald-300/80 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer';
                      } else if (!sourceTableId && isOccupied) {
                        cardStyling =
                          'border-amber-300/80 bg-white hover:border-amber-500 hover:bg-amber-50/30 cursor-pointer';
                      }
                    } else {
                      // MERGE mode
                      if (isMergeDest) {
                        cardStyling =
                          'border-indigo-600 bg-indigo-50/90 ring-4 ring-indigo-500/30 shadow-md shadow-indigo-600/10';
                      } else if (isMergeSelected) {
                        cardStyling =
                          'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-300/40';
                      }
                    }

                    return (
                      <button
                        key={table._id}
                        type="button"
                        onClick={() =>
                          mode === 'TRANSFER'
                            ? handleTransferTableClick(table)
                            : handleMergeTableClick(table)
                        }
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[140px] relative cursor-pointer ${cardStyling}`}
                      >
                        {/* Top: Table Number + Badges */}
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xl font-black text-slate-900 tracking-tight">
                              {table.tableNumber}
                            </span>

                            {mode === 'TRANSFER' ? (
                              isSource ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase shadow-xs">
                                  SOURCE
                                </span>
                              ) : isTarget ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase shadow-xs">
                                  TARGET
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    isOccupied
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isOccupied ? 'Occupied' : 'Free'}
                                </span>
                              )
                            ) : (
                              <div className="flex items-center gap-1">
                                {isMergeDest && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase">
                                    Final Seat
                                  </span>
                                )}
                                {isMergeSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-xs font-bold text-slate-700 truncate">
                            {getCleanDisplayName(table)}
                          </div>
                        </div>

                        {/* Bottom: Session details or Free status */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-between text-[11px]">
                          {isOccupied ? (
                            <>
                              <span className="font-black text-slate-900">
                                ₹{runningBill.toFixed(0)}
                              </span>
                              <span className="text-slate-500 flex items-center gap-1 font-semibold">
                                <User className="w-3 h-3 text-slate-400" />
                                {session?.guestCount || 1}
                              </span>
                            </>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Ready for seating
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── IN MERGE MODE: STEP 2 FINAL DESTINATION SELECTOR ──────────────────── */}
        {mode === 'MERGE' && mergeSelectedIds.length > 0 && (
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                Choose Final Seating Destination for Combined Group
              </label>
              <span className="text-xs text-slate-400 font-semibold">
                Tap the table where everyone will sit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {/* Option A: One of the selected tables */}
              {mergeSelectedIds.map((id) => {
                const t = tables.find((tbl) => tbl._id === id);
                if (!t) return null;
                const isDest = mergeDestinationId === t._id;
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => setMergeDestinationId(t._id)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isDest
                        ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black">Table {t.tableNumber}</span>
                      <span
                        className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                          isDest ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        Selected Party
                      </span>
                    </div>
                    <div className={`text-xs mt-1 truncate ${isDest ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {getCleanDisplayName(t)} ({getZoneName(t)})
                    </div>
                  </button>
                );
              })}

              {/* Option B: Any available free table */}
              {tables
                .filter((t) => !mergeSelectedIds.includes(t._id) && !isTableOccupied(t))
                .map((t) => {
                  const isDest = mergeDestinationId === t._id;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => setMergeDestinationId(t._id)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isDest
                          ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black">Table {t.tableNumber}</span>
                        <span
                          className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                            isDest ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Free Table
                        </span>
                      </div>
                      <div className={`text-xs mt-1 truncate ${isDest ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {getCleanDisplayName(t)} ({getZoneName(t)})
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* ── STICKY BOTTOM CONFIRMATION DOCK ──────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white px-4 sm:px-6 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Summary Details */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            {mode === 'TRANSFER' ? (
              <div>
                <div className="flex items-center gap-2 flex-wrap text-sm font-black">
                  {sourceTable ? (
                    <span className="text-amber-400">
                      Table {sourceTable.tableNumber} ({getCleanDisplayName(sourceTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Select Source Table...</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  {targetTable ? (
                    <span className="text-emerald-400">
                      Table {targetTable.tableNumber} ({getCleanDisplayName(targetTable)} •{' '}
                      {getZoneName(targetTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Select Free Destination Table...</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sourceTable && targetTable
                    ? 'Ready to relocate orders & guest session'
                    : 'Follow the 2-step click on the floor map above'}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 flex-wrap text-sm font-black">
                  {mergeSelectedIds.length > 0 ? (
                    <span className="text-indigo-300">
                      {mergeSelectedIds
                        .map((id) => `Table ${tables.find((t) => t._id === id)?.tableNumber}`)
                        .join(' + ')}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Select tables to combine...</span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  {mergeDestinationTable ? (
                    <span className="text-amber-300">
                      Seating at Table {mergeDestinationTable.tableNumber} (
                      {getZoneName(mergeDestinationTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Choose destination table</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combines active bills, orders & kitchen tickets under one party.
                </p>
              </div>
            )}
          </div>

          {/* Controls & Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {mode === 'TRANSFER' && sourceTable && targetTable && (
              <input
                type="text"
                placeholder="Reason (e.g. AC seating)"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="hidden lg:block px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48"
              />
            )}

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Reset
            </button>

            {mode === 'TRANSFER' ? (
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={!sourceTableId || !targetTableId || isBusy}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-lg shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-2 transition cursor-pointer min-w-[150px]"
              >
                {isBusy ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Confirm Move
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={mergeSelectedIds.length === 0 || !mergeDestinationId || isBusy}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center justify-center gap-2 transition cursor-pointer min-w-[160px]"
              >
                {isBusy ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4" />
                )}
                Confirm Merge & Seating
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerTableOperations;
