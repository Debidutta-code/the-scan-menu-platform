import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  GitMerge,
  Search,
  X,
  CheckCircle2,
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
import { Button } from '../components/ui/Button';

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
    <div className="w-full space-y-3 font-sans select-none pb-24">
      {/* ── PAGE HEADER ───────────────────────────────────────────────────────── */}
      <div className="p-3 md:px-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/manager/tables')}
            className="h-8.5 w-8.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer shrink-0 active:scale-95"
            title="Back to Table Management"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Table Move &amp; Merge Studio
              </h1>
              <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                LIVE
              </span>
            </div>
            <p className="text-slate-500 text-[11px] font-medium mt-0.5">
              Tap tables on the floor plan to transfer sessions or combine bills.
            </p>
          </div>
        </div>

        {/* Mode Switcher & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setMode('TRANSFER');
                handleReset();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                mode === 'TRANSFER'
                  ? 'bg-amber-500 text-white shadow-2xs'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                mode === 'MERGE'
                  ? 'bg-indigo-600 text-white shadow-2xs'
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
            className="h-8.5 w-8.5 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition shadow-2xs cursor-pointer active:scale-95"
            title="Refresh tables"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── STEP GUIDANCE STRIP ─────────────────────────────────────────────────── */}
      <div
        className={`px-3.5 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-all ${
          mode === 'TRANSFER'
            ? 'bg-gradient-to-r from-amber-50/90 to-amber-100/40 border-amber-200 text-amber-950'
            : 'bg-gradient-to-r from-indigo-50/90 to-indigo-100/40 border-indigo-200 text-indigo-950'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
              mode === 'TRANSFER' ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
          >
            {mode === 'TRANSFER' ? (sourceTableId && !targetTableId ? '2' : '1') : '✦'}
          </div>
          <span className="text-xs font-bold">
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
            <span className="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-xs shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Source: Table {sourceTable.tableNumber} ({getCleanDisplayName(sourceTable)})
            </span>
            <button
              onClick={() => {
                setSourceTableId('');
                setTargetTableId('');
              }}
              className="p-1 text-amber-700 hover:bg-amber-200/60 rounded-md transition cursor-pointer"
              title="Clear source"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {mode === 'MERGE' && mergeSelectedIds.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-950 font-bold text-xs shadow-2xs">
              {mergeSelectedIds.length} Tables Selected
            </span>
            <button
              onClick={handleReset}
              className="text-indigo-700 hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
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
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
              activeZoneFilter === null
                ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
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
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                  activeZoneFilter === z._id
                    ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
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
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-400 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── ZONE-WISE TABLE FLOOR GRID ────────────────────────────────────────── */}
      {zoneGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200/80 rounded-2xl text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-2.5">
            <Utensils className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Tables Found</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {searchQuery ? `No tables match "${searchQuery}"` : 'No tables exist in this zone.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {zoneGroups.map((group) => (
            <div
              key={group.zoneId}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden"
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight">
                    {group.zoneName}
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    {group.tables.length}
                  </span>
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-400">
                  {group.tables.filter((t) => isTableOccupied(t)).length} OCCUPIED •{' '}
                  {group.tables.filter((t) => !isTableOccupied(t)).length} FREE
                </div>
              </div>

              {/* Table Cards Grid */}
              <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
                {group.tables.map((table) => {
                  const isOccupied = isTableOccupied(table);
                  const isReserved = table.status === 'RESERVED';

                  // Transfer mode states
                  const isSource = sourceTableId === table._id;
                  const isTarget = targetTableId === table._id;

                  // Merge mode states
                  const isMergeSelected = mergeSelectedIds.includes(table._id);
                  const isMergeDest = mergeDestinationId === table._id;

                  let borderClass = 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs';
                  let ringClass = '';

                  if (mode === 'TRANSFER') {
                    if (isSource) {
                      borderClass = 'border-amber-500 bg-amber-50/90 shadow-xs';
                      ringClass = 'ring-2 ring-amber-400';
                    } else if (isTarget) {
                      borderClass = 'border-emerald-500 bg-emerald-50/90 shadow-xs';
                      ringClass = 'ring-2 ring-emerald-400';
                    } else if (sourceTableId && !isOccupied) {
                      borderClass = 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:shadow-xs';
                    } else if (isOccupied) {
                      borderClass = 'border-amber-400 bg-amber-50/40 hover:border-amber-500 hover:shadow-xs';
                    }
                  } else {
                    // MERGE mode
                    if (isMergeDest) {
                      borderClass = 'border-indigo-600 bg-indigo-50/90 shadow-xs';
                      ringClass = 'ring-2 ring-indigo-500';
                    } else if (isMergeSelected) {
                      borderClass = 'border-indigo-400 bg-indigo-50/40 shadow-2xs';
                    } else if (isOccupied) {
                      borderClass = 'border-slate-300 bg-slate-50/60 hover:border-indigo-300';
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
                      className={`relative p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-95 ${borderClass} ${ringClass}`}
                      style={{ minHeight: '100px' }}
                    >
                      {/* Check badge in Merge mode */}
                      {mode === 'MERGE' && isMergeSelected && (
                        <div className="absolute top-1.5 right-1.5 text-indigo-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Table Number Badge */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shadow-2xs mb-1.5 ${
                          isSource || isMergeDest
                            ? 'bg-slate-950 text-white'
                            : isTarget
                            ? 'bg-emerald-600 text-white'
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
                      <span className="text-[11px] font-bold text-slate-800 truncate w-full leading-tight mb-1">
                        {getCleanDisplayName(table)}
                      </span>

                      {/* Status Badges */}
                      {mode === 'TRANSFER' ? (
                        isSource ? (
                          <span className="text-[9px] font-mono font-bold text-white bg-amber-500 px-1.5 py-0.2 rounded uppercase">
                            SOURCE
                          </span>
                        ) : isTarget ? (
                          <span className="text-[9px] font-mono font-bold text-white bg-emerald-600 px-1.5 py-0.2 rounded uppercase">
                            DEST
                          </span>
                        ) : isOccupied ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded">
                            <span className="w-1 h-1 rounded-full bg-amber-600 animate-ping inline-block mr-0.5" />
                            {table.activeOrderCount
                              ? `${table.activeOrderCount} ORD`
                              : 'OCCUPIED'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            FREE
                          </span>
                        )
                      ) : (
                        isMergeDest ? (
                          <span className="text-[9px] font-mono font-bold text-white bg-indigo-600 px-1.5 py-0.2 rounded uppercase">
                            FINAL SEAT
                          </span>
                        ) : isOccupied ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded">
                            <span className="w-1 h-1 rounded-full bg-amber-600 animate-ping inline-block mr-0.5" />
                            OCCUPIED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-mono">
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              Select Final Seating Table for Merged Group
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Tap the table where everyone will sit
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between active:scale-95 shadow-2xs ${
                    isDest
                      ? 'border-indigo-600 bg-indigo-600 text-white font-bold'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Table {t.tableNumber}</span>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                        isDest ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                      }`}
                    >
                      Keep Party
                    </span>
                  </div>
                  <div className={`text-[11px] mt-0.5 truncate ${isDest ? 'text-indigo-100' : 'text-slate-500'}`}>
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
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between active:scale-95 shadow-2xs ${
                      isDest
                        ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Table {t.tableNumber}</span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                          isDest ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Free Table
                      </span>
                    </div>
                    <div className={`text-[11px] mt-0.5 truncate ${isDest ? 'text-emerald-100' : 'text-slate-500'}`}>
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white px-3.5 sm:px-5 py-2.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Status preview */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
              </div>

              {mode === 'TRANSFER' ? (
                <div className="text-xs font-bold truncate">
                  <span className="text-amber-400">
                    Table {sourceTable?.tableNumber} ({getCleanDisplayName(sourceTable)})
                  </span>
                  <ArrowRight className="inline w-3 h-3 mx-1 text-slate-500" />
                  {targetTable ? (
                    <span className="text-emerald-400">
                      Table {targetTable.tableNumber} ({getCleanDisplayName(targetTable)} •{' '}
                      {getZoneName(targetTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-normal">Tap a free destination table...</span>
                  )}
                </div>
              ) : (
                <div className="text-xs font-bold truncate">
                  <span className="text-indigo-300">
                    {mergeSelectedIds
                      .map((id) => `Table ${tables.find((t) => t._id === id)?.tableNumber}`)
                      .join(' + ')}
                  </span>
                  <ArrowRight className="inline w-3 h-3 mx-1 text-slate-500" />
                  {mergeDestinationTable ? (
                    <span className="text-amber-300">
                      Seat at Table {mergeDestinationTable.tableNumber} ({getZoneName(mergeDestinationTable)})
                    </span>
                  ) : (
                    <span className="text-slate-400 italic font-normal">Pick final seating table</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                onClick={handleReset}
              >
                Reset
              </Button>

              {mode === 'TRANSFER' ? (
                <Button
                  type="button"
                  variant="amber"
                  onClick={handleExecuteTransfer}
                  disabled={!sourceTableId || !targetTableId}
                  isLoading={isBusy}
                  leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                >
                  Confirm Move
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleExecuteMerge}
                  disabled={mergeSelectedIds.length === 0 || !mergeDestinationId}
                  isLoading={isBusy}
                  leftIcon={<GitMerge className="w-3.5 h-3.5" />}
                >
                  Confirm Merge
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTableOperations;
