import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { managerService, Table, TableZone } from '../services/restaurant.service';
import {
  useManagerTables,
  TableFormValues,
  BulkTableFormValues,
  ZoneFormValues,
} from '../hooks/useManagerTables';
import {
  Plus,
  Edit2,
  Trash2,
  QrCode,
  Download,
  X,
  Loader,
  Printer,
  Search,
  CheckCircle2,
  Bookmark,
  RefreshCw,
  Utensils,
  Layers,
  RotateCw,
  ChevronRight,
} from 'lucide-react';

const tableSchema = z.object({
  tableNumber: z.string().optional(),
  displayName: z.string().optional(),
  zoneId: z.string().optional(),
});

const zoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
});

const bulkTableSchema = z.object({
  count: z.number().min(1, 'Count must be at least 1').max(100, 'Cannot create more than 100 tables at once'),
  prefix: z.string().optional(),
  zoneId: z.string().optional(),
});

export const ManagerTables: React.FC = () => {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();

  const {
    tables,
    zones,
    isLoading,
    refetchTables,
    createTableMutation,
    bulkCreateMutation,
    editTableMutation,
    deleteTableMutation,
    regenerateQrMutation,
    clearTablesMutation,
    reserveTablesMutation,
    createZoneMutation,
    editZoneMutation,
    deleteZoneMutation,
  } = useManagerTables(activeRestaurantId);

  // Local UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);

  // Selected table for Quick Action Modal
  const [activeTableAction, setActiveTableAction] = useState<Table | null>(null);

  // Form & Secondary Modals
  const [isFormOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [showQrModal, setShowQrModal] = useState<Table | null>(null);
  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TableZone | null>(null);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch QR info when QR modal is opened
  const { data: qrData, isLoading: isLoadingQr } = useQuery({
    queryKey: ['tableQr', activeRestaurantId, showQrModal?._id],
    queryFn: () => managerService.getTableQr(activeRestaurantId!, showQrModal!._id),
    enabled: !!activeRestaurantId && !!showQrModal?._id,
  });

  // React Hook Forms
  const tableForm = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
  });

  const bulkForm = useForm<BulkTableFormValues>({
    resolver: zodResolver(bulkTableSchema),
    defaultValues: { count: 10, prefix: '', zoneId: undefined },
  });

  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
  });

  // Calculate table metrics
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter(
      (t) => t.status === 'OCCUPIED' || (t.activeOrderCount && t.activeOrderCount > 0) || t.activeSession
    ).length;
    const reserved = tables.filter((t) => t.status === 'RESERVED').length;
    const available = Math.max(0, total - occupied - reserved);
    return { total, occupied, reserved, available };
  }, [tables]);

  // Filtered tables list based on search & status
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const isOccupied =
          table.status === 'OCCUPIED' || (table.activeOrderCount && table.activeOrderCount > 0) || !!table.activeSession;
        const isReserved = table.status === 'RESERVED';

        if (statusFilter === 'OCCUPIED' && !isOccupied) return false;
        if (statusFilter === 'RESERVED' && !isReserved) return false;
        if (statusFilter === 'AVAILABLE' && (isOccupied || isReserved)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = table.tableNumber.toLowerCase().includes(q);
        const matchesName = table.displayName.toLowerCase().includes(q);
        return matchesNum || matchesName;
      }

      return true;
    });
  }, [tables, statusFilter, searchQuery]);

  // Group filtered tables by Zone (including unassigned)
  const zoneGroupings = useMemo(() => {
    const displayZones = activeZoneFilter
      ? zones.filter((z) => z._id === activeZoneFilter)
      : [...zones, { _id: 'unassigned', name: 'Unassigned Tables', isActive: true } as TableZone];

    return displayZones
      .map((zone) => {
        const isUnassigned = zone._id === 'unassigned';
        const zoneTables = filteredTables.filter((t) => {
          const tableZoneId = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
          if (isUnassigned) {
            return !tableZoneId || !zones.some((z) => z._id === tableZoneId);
          }
          return tableZoneId === zone._id;
        });

        return {
          zone,
          tables: zoneTables,
        };
      })
      .filter((group) => group.tables.length > 0);
  }, [filteredTables, zones, activeZoneFilter]);

  // Submit handlers
  const onSubmitTable = (values: TableFormValues) => {
    setErrorMsg(null);
    if (editingTable) {
      editTableMutation.mutate(
        { id: editingTable._id, data: values },
        { onSuccess: () => setIsCreateOpen(false) }
      );
    } else {
      createTableMutation.mutate(values, { onSuccess: () => setIsCreateOpen(false) });
    }
  };

  const onBulkSubmit = (values: BulkTableFormValues) => {
    setErrorMsg(null);
    bulkCreateMutation.mutate(values, { onSuccess: () => setIsBulkFormOpen(false) });
  };

  const onZoneSubmit = (values: ZoneFormValues) => {
    if (editingZone) {
      editZoneMutation.mutate(
        { id: editingZone._id, data: values },
        { onSuccess: () => setIsZoneFormOpen(false) }
      );
    } else {
      createZoneMutation.mutate(values, { onSuccess: () => setIsZoneFormOpen(false) });
    }
  };

  const handleEditClick = (table: Table) => {
    setEditingTable(table);
    const zId = typeof table.zoneId === 'string' ? table.zoneId : table.zoneId?._id;
    tableForm.reset({
      tableNumber: table.tableNumber,
      displayName: table.displayName,
      zoneId: zId || undefined,
    });
    setIsCreateOpen(true);
  };

  const handleAddTableToZone = (zoneId: string) => {
    setEditingTable(null);
    tableForm.reset({ tableNumber: '', displayName: '', zoneId });
    setIsCreateOpen(true);
  };

  // Download & Print QR
  const handleDownloadPng = () => {
    if (qrData?.data?.pngDataUri && showQrModal) {
      const link = document.createElement('a');
      link.href = qrData.data.pngDataUri;
      link.download = `qr-table-${showQrModal.tableNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintQr = () => {
    if (!qrData?.data?.svg || !showQrModal) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast('Failed to open printing. Please allow popup permissions.', 'error');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - Table ${showQrModal.tableNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
              background-color: #ffffff;
            }
            .container {
              border: 3px solid #111827;
              padding: 40px;
              border-radius: 32px;
              max-width: 320px;
              width: 100%;
            }
            .restaurant-name {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.18em;
              color: #64748b;
              font-weight: 800;
              margin-bottom: 6px;
            }
            .table-title {
              font-size: 28px;
              font-weight: 800;
              color: #111827;
              margin: 0 0 20px 0;
              font-family: 'Instrument Serif', Georgia, serif;
            }
            .qr-wrapper {
              width: 220px;
              height: 220px;
              margin: 0 auto 20px auto;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-wrapper svg {
              width: 100%;
              height: 100%;
            }
            .scan-instructions {
              font-size: 12px;
              color: #111827;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            @media print {
              body { padding: 0; min-height: auto; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="restaurant-name">Scan & Order</div>
            <div class="table-title">Table ${showQrModal.tableNumber}</div>
            <div class="qr-wrapper">${qrData.data.svg}</div>
            <p class="scan-instructions">Place your orders instantly</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!activeRestaurantId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 font-sans">
        <Loader className="w-12 h-12 text-amber-500 mb-4 animate-spin" strokeWidth={1.75} />
        <h2 className="font-display tracking-tight text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1">
          You are currently not associated as a manager with any active restaurant.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  if (!flagsLoading && !isEnabled('qr_menu')) {
    return <Navigate to="/manager/orders" replace />;
  }

  return (
    <div className="w-full space-y-6 font-sans pb-20">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display tracking-tight text-3xl sm:text-4xl font-bold text-slate-900">
            Restaurant Tables & Zones
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Click any table box to open quick actions, manage reservations & clear active sessions
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => refetchTables()}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm"
            title="Refresh tables"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
          </button>

          <button
            onClick={() => {
              setEditingZone(null);
              zoneForm.reset({ name: '' });
              setIsZoneFormOpen(true);
            }}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Zone</span>
          </button>

          <button
            onClick={() => {
              setEditingTable(null);
              tableForm.reset({ tableNumber: '', displayName: '', zoneId: activeZoneFilter || undefined });
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Table</span>
          </button>

          <button
            onClick={() => {
              setErrorMsg(null);
              bulkForm.reset({ count: 10, prefix: '', zoneId: activeZoneFilter || undefined });
              setIsBulkFormOpen(true);
            }}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Bulk Create</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tables</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Available</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{stats.available}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Occupied</p>
            <p className="text-xl font-extrabold text-amber-700 mt-0.5">{stats.occupied}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Utensils className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white border border-purple-100 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Reserved</p>
            <p className="text-xl font-extrabold text-purple-700 mt-0.5">{stats.reserved}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Bookmark className="w-4 h-4" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Zone Selector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'All', count: stats.total },
                { id: 'AVAILABLE', label: 'Available', count: stats.available },
                { id: 'OCCUPIED', label: 'Occupied', count: stats.occupied },
                { id: 'RESERVED', label: 'Reserved', count: stats.reserved },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-semibold ${
                    statusFilter === tab.id ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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

        {/* Zone Pills Filter */}
        {zones.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Zones:</span>
            <button
              onClick={() => setActiveZoneFilter(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeZoneFilter === null
                  ? 'bg-amber-500 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Zones
            </button>
            {zones.map((zone) => (
              <div key={zone._id} className="flex items-center">
                <button
                  onClick={() => setActiveZoneFilter(zone._id)}
                  className={`px-3 py-1 text-xs font-semibold transition ${
                    activeZoneFilter === zone._id
                      ? 'bg-amber-500 text-white font-bold rounded-l-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg'
                  }`}
                >
                  {zone.name}
                </button>
                {activeZoneFilter === zone._id && (
                  <div className="flex items-center bg-amber-600 rounded-r-lg overflow-hidden h-full">
                    <button
                      onClick={() => {
                        setEditingZone(zone);
                        zoneForm.reset({ name: zone.name });
                        setIsZoneFormOpen(true);
                      }}
                      className="p-1 text-white hover:bg-amber-700 transition"
                      title="Edit Zone"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleAddTableToZone(zone._id)}
                      className="p-1 text-white hover:bg-amber-700 transition"
                      title="Add Table to Zone"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete zone "${zone.name}"? ALL tables in this zone will be deleted.`)) {
                          deleteZoneMutation.mutate(zone._id);
                        }
                      }}
                      className="p-1 text-white hover:bg-red-600 transition"
                      title="Delete Zone"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zone-Wise Compact Tables Grid (Seat layout style) */}
      {zoneGroupings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1.75} />
          <h3 className="font-bold text-slate-800 text-lg">No Tables Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? `No tables match "${searchQuery}"` : 'Click "Add Table" to set up your tables.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {zoneGroupings.map(({ zone, tables: zoneTables }) => (
            <div key={zone._id} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              {/* Zone Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{zone.name}</h3>
                  <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    {zoneTables.length} tables
                  </span>
                </div>
                {zone._id !== 'unassigned' && (
                  <button
                    onClick={() => handleAddTableToZone(zone._id)}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Table</span>
                  </button>
                )}
              </div>

              {/* Compact Box Grid (Click box to open Quick Actions) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {zoneTables.map((table) => {
                  const isOccupied =
                    table.status === 'OCCUPIED' ||
                    (table.activeOrderCount && table.activeOrderCount > 0) ||
                    !!table.activeSession;
                  const isReserved = table.status === 'RESERVED';

                  return (
                    <button
                      key={table._id}
                      onClick={() => setActiveTableAction(table)}
                      className={`relative group border-2 rounded-xl p-3 flex flex-col items-center justify-between text-center transition cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                        isOccupied
                          ? 'bg-amber-50/60 border-amber-400 hover:border-amber-500'
                          : isReserved
                          ? 'bg-purple-50/60 border-purple-400 hover:border-purple-500'
                          : 'bg-white border-slate-200 hover:border-amber-400'
                      }`}
                    >
                      {/* Top Status Icon / Tag */}
                      <div className="w-full flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-full font-mono font-bold text-xs flex items-center justify-center shadow-xs ${
                            isOccupied
                              ? 'bg-amber-500 text-white'
                              : isReserved
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {table.tableNumber}
                        </div>

                        {/* Status Compact Tag */}
                        {isOccupied ? (
                          <div className="flex items-center gap-1 text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                            <span>OCCUPIED</span>
                          </div>
                        ) : isReserved ? (
                          <div className="flex items-center gap-0.5 text-[9px] font-extrabold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-300">
                            <Bookmark className="w-2.5 h-2.5 text-purple-700" strokeWidth={2.5} />
                            <span>RES</span>
                          </div>
                        ) : (
                          <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            FREE
                          </div>
                        )}
                      </div>

                      {/* Display Name */}
                      <span
                        className="text-xs font-bold text-slate-900 truncate w-full mb-1"
                        title={table.displayName}
                      >
                        {table.displayName}
                      </span>

                      {/* Sub-info tag if active orders exist */}
                      {isOccupied && table.activeOrderCount !== undefined && table.activeOrderCount > 0 ? (
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-md">
                          ⚡ {table.activeOrderCount} order{table.activeOrderCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-amber-600 transition flex items-center gap-0.5">
                          Actions <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Quick Action Modal (Opened when clicking ANY table box) */}
      {activeTableAction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded-md">
                    #{activeTableAction.tableNumber}
                  </span>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    {activeTableAction.displayName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Status:{' '}
                  <strong className="text-slate-800">
                    {activeTableAction.status === 'OCCUPIED' ||
                    (activeTableAction.activeOrderCount && activeTableAction.activeOrderCount > 0) ||
                    activeTableAction.activeSession
                      ? 'Occupied'
                      : activeTableAction.status === 'RESERVED'
                      ? 'Reserved'
                      : 'Available'}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setActiveTableAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Active order info summary inside modal */}
            {activeTableAction.activeOrderCount !== undefined && activeTableAction.activeOrderCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>{activeTableAction.activeOrderCount} active order(s)</strong> currently in kitchen/service.
                </span>
              </div>
            )}

            {/* Quick Actions List (Matching user screenshot style) */}
            <div className="space-y-2.5">
              {/* Primary Action Button: View QR (Matching screenshot orange button) */}
              <button
                onClick={() => {
                  const target = activeTableAction;
                  setActiveTableAction(null);
                  setShowQrModal(target);
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98]"
              >
                <QrCode className="w-4.5 h-4.5" strokeWidth={2} />
                <span>View QR Code</span>
              </button>

              {/* Clear Table button (if occupied) */}
              {(activeTableAction.status === 'OCCUPIED' ||
                (activeTableAction.activeOrderCount && activeTableAction.activeOrderCount > 0) ||
                activeTableAction.activeSession) && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Clear Table ${activeTableAction.tableNumber}? This will mark it Available and close any active session.`
                      )
                    ) {
                      clearTablesMutation.mutate([activeTableAction._id], {
                        onSuccess: () => setActiveTableAction(null),
                      });
                    }
                  }}
                  disabled={clearTablesMutation.isPending}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  {clearTablesMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Clear Table (Mark Available)</span>
                    </>
                  )}
                </button>
              )}

              {/* Reserve / Unreserve button */}
              {activeTableAction.status === 'RESERVED' ? (
                <button
                  onClick={() => {
                    reserveTablesMutation.mutate(
                      { tableIds: [activeTableAction._id], reserved: false },
                      { onSuccess: () => setActiveTableAction(null) }
                    );
                  }}
                  disabled={reserveTablesMutation.isPending}
                  className="w-full bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Bookmark className="w-4 h-4 text-purple-700" />
                  <span>Unreserve Table</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    reserveTablesMutation.mutate(
                      { tableIds: [activeTableAction._id], reserved: true },
                      { onSuccess: () => setActiveTableAction(null) }
                    );
                  }}
                  disabled={reserveTablesMutation.isPending}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Bookmark className="w-4 h-4 text-slate-600" />
                  <span>Reserve Table</span>
                </button>
              )}

              {/* Secondary Action Row: Edit & Delete (Matching screenshot layout) */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const target = activeTableAction;
                    setActiveTableAction(null);
                    handleEditClick(target);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this table? Tables with order history will be soft-archived.')) {
                      const id = activeTableAction._id;
                      setActiveTableAction(null);
                      deleteTableMutation.mutate(id);
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2.5 rounded-xl transition"
                  title="Delete Table"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {isBulkFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Bulk Create Tables</h2>
              <button
                onClick={() => setIsBulkFormOpen(false)}
                className="p-2 hover:bg-slate-50 rounded-full transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    {...bulkForm.register('count', { valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                    placeholder="e.g. 20"
                  />
                  {bulkForm.formState.errors.count && (
                    <span className="text-xs text-red-500 mt-1 block">{bulkForm.formState.errors.count.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    {...bulkForm.register('prefix')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                    placeholder="e.g. T or Out-"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Zone (Optional)
                  </label>
                  <select
                    {...bulkForm.register('zoneId')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  >
                    <option value="">No Zone (Unassigned)</option>
                    {zones.map((z) => (
                      <option key={z._id} value={z._id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkFormOpen(false)}
                  className="w-1/2 py-2.5 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkCreateMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                >
                  {bulkCreateMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : 'Generate Tables'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Table Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">{editingTable ? 'Edit Table' : 'New Table'}</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={tableForm.handleSubmit(onSubmitTable)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Zone</label>
                <select
                  {...tableForm.register('zoneId')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white font-medium text-slate-800"
                >
                  <option value="">No Zone (Unassigned)</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingTable ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed">
                  ✨ Table number and display name will be <strong>automatically assigned starting from 1</strong> for the selected zone.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Table Number</label>
                    <input
                      type="text"
                      placeholder="1"
                      {...tableForm.register('tableNumber')}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name</label>
                    <input
                      type="text"
                      placeholder="Table 1"
                      {...tableForm.register('displayName')}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending || editTableMutation.isPending}
                  className="w-1/2 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition flex items-center justify-center gap-2"
                >
                  {createTableMutation.isPending || editTableMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : editingTable ? (
                    'Save Changes'
                  ) : (
                    'Auto-Generate Table'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zone Form Modal */}
      {isZoneFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">{editingZone ? 'Edit Zone' : 'New Zone'}</h2>
              <button onClick={() => setIsZoneFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={zoneForm.handleSubmit(onZoneSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Zone Name</label>
                <input
                  type="text"
                  placeholder="e.g. Patio, Main Hall, Rooftop"
                  {...zoneForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {zoneForm.formState.errors.name && (
                  <span className="text-xs text-red-500 mt-1 block">{zoneForm.formState.errors.name.message}</span>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsZoneFormOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createZoneMutation.isPending || editZoneMutation.isPending}
                  className="w-1/2 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                >
                  {createZoneMutation.isPending || editZoneMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : editingZone ? (
                    'Save Zone'
                  ) : (
                    'Create Zone'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Preview Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-4">
              <h3 className="font-display text-xl font-bold">{showQrModal.displayName} QR</h3>
              <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {isLoadingQr ? (
              <div className="h-48 flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
              </div>
            ) : qrData?.data?.svg ? (
              <div className="space-y-4 flex flex-col items-center w-full">
                <div
                  className="w-48 h-48 border border-slate-100 p-2 rounded-2xl flex items-center justify-center shadow-inner"
                  dangerouslySetInnerHTML={{ __html: qrData.data.svg }}
                />

                <p className="text-slate-500 text-[10px] text-center break-all font-mono select-all bg-slate-50 p-2 rounded-xl border border-slate-100 w-full max-w-xs">
                  {qrData.data.url}
                </p>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    onClick={handleDownloadPng}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
                  >
                    <Download className="w-4 h-4" strokeWidth={1.75} />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={handlePrintQr}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
                  >
                    <Printer className="w-4 h-4" strokeWidth={1.75} />
                    <span>Print QR</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Rotate QR token? The old printed QR code link will be invalidated.')) {
                      regenerateQrMutation.mutate(showQrModal._id);
                    }
                  }}
                  disabled={regenerateQrMutation.isPending}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-xl transition border border-rose-100"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${regenerateQrMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Rotate QR Token</span>
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-8">Failed to load QR code.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTables;
