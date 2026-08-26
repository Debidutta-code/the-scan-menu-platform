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
  Utensils,
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
    isLoading,
    refetchTables,
    transferTableMutation,
    mergeTablesMutation,
  } = useManagerTables(activeRestaurantId);

  // Mode state
  const initialMode = searchParams.get('mode') === 'merge' ? 'MERGE' : 'TRANSFER';
  const initialSourceId = searchParams.get('sourceTableId') || '';

  const [mode, setMode] = useState<OperationMode>(initialMode);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
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
      table.status === 'OCCUPIED' ||
        (table.activeOrderCount && table.activeOrderCount > 0) ||
        table.activeSession
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

  // Clean Display name preventing duplicate "Table 1 (Table 1 (Terrace))"
  const getCleanDisplayName = (table?: Table | null): string => {
    if (!table) return '';
    const raw = (table.displayName || '').trim();
    const num = table.tableNumber;
    if (!raw || raw === `Table ${num}` || raw === num) {
      return `Table ${num}`;
    }
    const match = raw.match(/^Table\s*\d+\s*\((.*)\)$/i);
    if (match && match[1]) return match[1];
    if (raw.toLowerCase().startsWith(`table ${num.toLowerCase()}`)) {
      const stripped = raw
        .substring(`table ${num}`.length)
        .trim()
        .replace(/^[-:(]+/, '')
        .replace(/[)]+$/, '')
        .trim();
      return stripped || `Table ${num}`;
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
      return numMatch || nameMatch || zoneMatch;
    });
  }, [tables, searchQuery, getZoneName]);

  // Group filtered tables by Zone
  const zoneGroups = useMemo(() => {
    const groups: ZoneTableGroup[] = [];

    // Filter list if specific zone chip is active
    const activeList =
      activeZoneFilter === null
        ? filteredTables
        : filteredTables.filter((t) => {
            const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
            return tid === activeZoneFilter;
          });

    // 1. Defined zones
    for (const z of zones) {
      if (activeZoneFilter !== null && activeZoneFilter !== z._id) continue;
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
    if (activeZoneFilter === null) {
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

    if (sourceTableId === table._id) {
      setSourceTableId('');
      setTargetTableId('');
      return;
    }

    if (isOccupied) {
      setSourceTableId(table._id);
      setTargetTableId('');
      toast(`Source switched to Table ${table.tableNumber}`, 'info');
      return;
    }

    // Selected target table
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

      if (exists && mergeDestinationId === table._id) {
        setMergeDestinationId(next[0] || '');
      } else if (!exists && !mergeDestinationId) {
        setMergeDestinationId(table._id);
      }

      return next;
    });
  };

  const handleReset = () => {
    setSourceTableId('');
    setTargetTableId('');
    setTransferReason('');
    setMergeSelectedIds([]);
    setMergeDestinationId('');
  };

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

  const handleExecuteMerge = async () => {
    if (mergeSelectedIds.length < 1 || !mergeDestinationId) return;

    try {
      setIsProcessingMerge(true);

      const isDestinationInSelected = mergeSelectedIds.includes(mergeDestinationId);

      if (isDestinationInSelected) {
        const primaryId = mergeDestinationId;
        const secondaryIds = mergeSelectedIds.filter((id) => id !== primaryId);
        if (secondaryIds.length > 0) {
          await mergeTablesMutation.mutateAsync({
            primaryTableId: primaryId,
            secondaryTableIds: secondaryIds,
          });
        }
      } else {
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
            reason: `Merged tables relocated`,
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

  return (
    <div className="w-full space-y-5 font-sans pb-28">
      {/* ── PAGE HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/manager/tables')}
            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer shrink-0"
            title="Back to Table Management"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display tracking-tight text-xl sm:text-2xl font-bold text-slate-900">
                Table Move & Merge Studio
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                LIVE
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Tap tables on the floor plan to transfer sessions or combine bills.
            </p>
          </div>
        </div>

        {/* Mode Switcher & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setMode('TRANSFER');
                handleReset();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'TRANSFER'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Quick Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('MERGE');
                handleReset();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'MERGE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Merge Tables</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetchTables()}
            disabled={isLoading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition shadow-xs cursor-pointer"
            title="Refresh tables"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── STEP GUIDANCE STRIP ─────────────────────────────────────────────────── */}
      <div
        className={`px-4 py-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs transition-all ${
          mode === 'TRANSFER'
            ? 'bg-gradient-to-r from-amber-50/90 to-amber-100/40 border-amber-200 text-amber-950'
            : 'bg-gradient-to-r from-indigo-50/90 to-indigo-100/40 border-indigo-200 text-indigo-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-xs text-white shrink-0 ${
              mode === 'TRANSFER' ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
          >
            {mode === 'TRANSFER' ? (sourceTableId && !targetTableId ? '2' : '1') : '✦'}
          </div>
          <span className="text-xs sm:text-sm font-bold">
            {mode === 'TRANSFER'
              ? !sourceTableId
                ? 'Step 1: Tap the occupied table you want to move'
                : !targetTableId
                ? `Step 2: Tap an available free table to move Table ${sourceTable?.tableNumber} to`
                : `Ready to move Table ${sourceTable?.tableNumber} ➔ Table ${targetTable?.tableNumber}`
              : mergeSelectedIds.length === 0
              ? 'Step 1: Tap 2 or more tables to combine their dining sessions'
              : `Step 2: ${mergeSelectedIds.length} tables selected. Choose final seating destination below.`}
          </span>
        </div>

        {/* Selected pill tag */}
        {mode === 'TRANSFER' && sourceTable && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-xs shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Source: Table {sourceTable.tableNumber} ({getCleanDisplayName(sourceTable)})
            </span>
            <button
              onClick={() => {
                setSourceTableId('');
                setTargetTableId('');
              }}
              className="p-1 text-amber-700 hover:bg-amber-200/60 rounded-md transition"
              title="Clear source"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {mode === 'MERGE' && mergeSelectedIds.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-950 font-bold text-xs shadow-2xs">
              {mergeSelectedIds.length} Tables Selected
            </span>
            <button
              onClick={handleReset}
              className="text-indigo-700 hover:underline text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* ── ZONE FILTER CHIPS & SEARCH BAR ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Zone chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveZoneFilter(null)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              activeZoneFilter === null
                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
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
                onClick={() =>
                  setActiveZoneFilter(activeZoneFilter === z._id ? null : z._id)
                }
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  activeZoneFilter === z._id
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                {z.name} ({countInZone})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition shadow-sm"
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

      {/* ── ZONE-WISE TABLE FLOOR GRID ────────────────────────────────────────── */}
      {zoneGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Utensils className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Tables Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {searchQuery ? `No tables match "${searchQuery}"` : 'No tables exist in this zone.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {zoneGroups.map((group) => (
            <div
              key={group.zoneId}
              className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                    {group.zoneName}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {group.tables.length}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-400">
                  {group.tables.filter((t) => isTableOccupied(t)).length} Occupied •{' '}
                  {group.tables.filter((t) => !isTableOccupied(t)).length} Free
                </div>
              </div>

              {/* Table Cards Grid (Identical compact polish to ManagerTables) */}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {group.tables.map((table) => {
                  const isOccupied = isTableOccupied(table);
                  const isReserved = table.status === 'RESERVED';

                  // Transfer mode states
                  const isSource = sourceTableId === table._id;
                  const isTarget = targetTableId === table._id;

                  // Merge mode states
                  const isMergeSelected = mergeSelectedIds.includes(table._id);
                  const isMergeDest = mergeDestinationId === table._id;

                  let borderClass = 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-md';
                  let ringClass = '';

                  if (mode === 'TRANSFER') {
                    if (isSource) {
                      borderClass = 'border-amber-500 bg-amber-50/90 shadow-md shadow-amber-200/50';
                      ringClass = 'ring-3 ring-amber-400';
                    } else if (isTarget) {
                      borderClass = 'border-emerald-500 bg-emerald-50/90 shadow-md shadow-emerald-200/50';
                      ringClass = 'ring-3 ring-emerald-400';
                    } else if (sourceTableId && !isOccupied) {
                      borderClass = 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:shadow-md';
                    } else if (isOccupied) {
                      borderClass = 'border-amber-400 bg-amber-50/40 hover:border-amber-500 hover:shadow-md';
                    }
                  } else {
                    // MERGE mode
                    if (isMergeDest) {
                      borderClass = 'border-indigo-600 bg-indigo-50/90 shadow-md shadow-indigo-200/50';
                      ringClass = 'ring-3 ring-indigo-500';
                    } else if (isMergeSelected) {
                      borderClass = 'border-indigo-400 bg-indigo-50/50 shadow-sm';
                      ringClass = 'ring-2 ring-indigo-300';
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
                      className={`
                        relative flex flex-col items-center text-center rounded-2xl border-2 p-3 gap-1.5
                        transition-all duration-150 hover:-translate-y-0.5 cursor-pointer select-none
                        ${borderClass} ${ringClass}
                      `}
                    >
                      {/* Check badge in Merge mode */}
                      {mode === 'MERGE' && isMergeSelected && (
                        <div className="absolute top-1.5 right-1.5 text-indigo-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Table Number Circle */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shadow-xs ${
                          isSource
                            ? 'bg-amber-500 text-white'
                            : isTarget
                            ? 'bg-emerald-600 text-white'
                            : isMergeDest
                            ? 'bg-indigo-600 text-white'
                            : isOccupied
                            ? 'bg-amber-500 text-white'
                            : isReserved
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {table.tableNumber}
                      </div>

                      {/* Display Name */}
                      <span className="text-[11px] font-bold text-slate-800 truncate w-full leading-tight">
                        {getCleanDisplayName(table)}
                      </span>

                      {/* Status Badges */}
                      {mode === 'TRANSFER' ? (
                        isSource ? (
                          <span className="text-[9px] font-black text-white bg-amber-500 px-1.5 py-0.5 rounded-md leading-none uppercase">
                            SOURCE
                          </span>
                        ) : isTarget ? (
                          <span className="text-[9px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded-md leading-none uppercase">
                            DESTINATION
                          </span>
                        ) : isOccupied ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded-md leading-none">
                            <span className="w-1 h-1 rounded-full bg-amber-600 animate-ping inline-block mr-0.5" />
                            {table.activeOrderCount
                              ? `${table.activeOrderCount} ORDER${table.activeOrderCount > 1 ? 'S' : ''}`
                              : 'OCCUPIED'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md leading-none">
                            FREE
                          </span>
                        )
                      ) : (
                        isMergeDest ? (
                          <span className="text-[9px] font-black text-white bg-indigo-600 px-1.5 py-0.5 rounded-md leading-none uppercase">
                            FINAL SEAT
                          </span>
                        ) : isOccupied ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded-md leading-none">
                            <span className="w-1 h-1 rounded-full bg-amber-600 animate-ping inline-block mr-0.5" />
                            OCCUPIED
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md leading-none">
                            FREE
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MERGE MODE: STEP 2 DESTINATION CHOICES ───────────────────────────── */}
      {mode === 'MERGE' && mergeSelectedIds.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              Select Final Seating Table for Merged Group
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              Tap the table where everyone will sit
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {/* Selected Party options */}
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
                    <span className="text-sm font-bold">Table {t.tableNumber}</span>
                    <span
                      className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                        isDest ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                      }`}
                    >
                      Keep Party
                    </span>
                  </div>
                  <div className={`text-xs mt-1 truncate ${isDest ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {getCleanDisplayName(t)} ({getZoneName(t)})
                  </div>
                </button>
              );
            })}

            {/* Free table options */}
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
                      <span className="text-sm font-bold">Table {t.tableNumber}</span>
                      <span
                        className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
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

      {/* ── FLOATING CLEAN ACTION BAR DOCK ──────────────────────────────────── */}
      {(sourceTableId || mergeSelectedIds.length > 0) && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white px-4 sm:px-6 py-3.5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status preview */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/30">
                <Sparkles className="w-4 h-4" />
              </div>

              {mode === 'TRANSFER' ? (
                <div className="text-xs sm:text-sm font-bold truncate">
                  <span className="text-amber-400">
                    Table {sourceTable?.tableNumber} ({getCleanDisplayName(sourceTable)})
                  </span>
                  <ArrowRight className="inline w-3.5 h-3.5 mx-1.5 text-slate-500" />
                  {targetTable ? (
                    <span className="text-emerald-400">
                      Table {targetTable.tableNumber} ({getCleanDisplayName(targetTable)} •{' '}
                      {getZoneName(targetTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Tap a free destination table...</span>
                  )}
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-bold truncate">
                  <span className="text-indigo-300">
                    {mergeSelectedIds
                      .map((id) => `Table ${tables.find((t) => t._id === id)?.tableNumber}`)
                      .join(' + ')}
                  </span>
                  <ArrowRight className="inline w-3.5 h-3.5 mx-1.5 text-slate-500" />
                  {mergeDestinationTable ? (
                    <span className="text-amber-300">
                      Seat at Table {mergeDestinationTable.tableNumber} ({getZoneName(mergeDestinationTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Pick final seating table</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Reset
              </button>

              {mode === 'TRANSFER' ? (
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={!sourceTableId || !targetTableId || isBusy}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  {isBusy ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  )}
                  Confirm Move
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  disabled={mergeSelectedIds.length === 0 || !mergeDestinationId || isBusy}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-40 flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  {isBusy ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitMerge className="w-3.5 h-3.5" />
                  )}
                  Confirm Merge
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTableOperations;
