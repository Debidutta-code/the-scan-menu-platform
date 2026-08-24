import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Receipt,
  Search,
  CheckCircle2,
  Bookmark,
  RefreshCw,
  Utensils,
  Layers,
  RotateCw,
  Settings2,
  LayoutGrid,
  Zap,
  Copy,
  ExternalLink,
  Palette,
  ArrowRightLeft,
} from 'lucide-react';
import apiClient from '../lib/api';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { QrCodeStudioModal } from '../components/QrCodeStudioModal';
import { TableActionModal } from '../components/pos/TableActionModal';
import { printOrderTicket, PrintOrderData } from '../utils/printReceipt';
import { generateStandeeCardPng, printStandeeCard } from '../utils/generateStandeeCard';

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

// ─── Status helpers ────────────────────────────────────────────────────────────

function getTableStatus(table: Table): 'OCCUPIED' | 'RESERVED' | 'AVAILABLE' {
  const isOccupied =
    table.status === 'OCCUPIED' ||
    (table.activeOrderCount && table.activeOrderCount > 0) ||
    !!table.activeSession;
  if (isOccupied) return 'OCCUPIED';
  if (table.status === 'RESERVED') return 'RESERVED';
  return 'AVAILABLE';
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface ManagerTablesProps {
  restaurantId?: string;
}

export const ManagerTables: React.FC<ManagerTablesProps> = ({ restaurantId }) => {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const { activeRestaurantId, user } = useAuth();
  const { toast } = useToast();

  const targetRestaurantId = restaurantId || activeRestaurantId;

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
    transferTableMutation,
    mergeTablesMutation,
    createZoneMutation,
    editZoneMutation,
    deleteZoneMutation,
  } = useManagerTables(targetRestaurantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
  const [activeTableAction, setActiveTableAction] = useState<Table | null>(null);
  const [showTableOperationsModal, setShowTableOperationsModal] = useState<Table | null>(null);
  const [showZoneManager, setShowZoneManager] = useState(false);

  const [isFormOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [showQrModal, setShowQrModal] = useState<Table | null>(null);
  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TableZone | null>(null);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [showQrStudio, setShowQrStudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);

  const { data: qrData, isLoading: isLoadingQr } = useQuery({
    queryKey: ['tableQr', targetRestaurantId, showQrModal?._id],
    queryFn: () => managerService.getTableQr(targetRestaurantId!, showQrModal!._id),
    enabled: !!targetRestaurantId && !!showQrModal?._id,
  });

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurantProfilePrint', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  const { data: activeOrdersResponse } = useQuery({
    queryKey: ['activeOrdersForTables', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/orders/active`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
    refetchInterval: 10000,
  });

  const restaurantInfo = useMemo(() => ({
    name: restaurantData?.data?.name,
    slug: restaurantData?.data?.slug,
    address: restaurantData?.data?.address,
    phone: restaurantData?.data?.phone,
    gstNumber: restaurantData?.data?.gstNumber,
    logoUrl: restaurantData?.data?.branding?.logoUrl || restaurantData?.data?.logoUrl,
    currency: restaurantData?.data?.currency || 'INR',
    settings: restaurantData?.data?.settings,
    printerConfig: restaurantData?.data?.printerConfig || restaurantData?.data?.settings?.printerConfig,
    headerMessage: restaurantData?.data?.settings?.receiptHeader || 'Welcome!',
    footerMessage: restaurantData?.data?.settings?.receiptFooter || 'Thank you for dining with us!',
  }), [restaurantData]);

  const fetchTableConsolidatedOrder = async (
    tableId: string,
    tableNumber: string,
    displayName?: string
  ): Promise<PrintOrderData> => {
    let tableOrders: any[] = [];
    try {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/tables/${tableId}/orders`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        tableOrders = res.data.data;
      }
    } catch {
      // Fallback to activeOrdersResponse
      const ordersList: any[] = activeOrdersResponse?.data || [];
      tableOrders = ordersList.filter((o) => {
        const tId = typeof o.tableId === 'string' ? o.tableId : o.tableId?._id;
        return tId === tableId;
      });
    }

    const combinedItems: any[] = [];
    let combinedSubtotal = 0;
    let combinedTax = 0;
    let combinedTotal = 0;

    tableOrders.forEach((ord) => {
      ord.items?.forEach((it: any) => combinedItems.push(it));
      combinedSubtotal += ord.subtotal || 0;
      combinedTax += ord.tax || 0;
      combinedTotal += ord.total || (ord.subtotal || 0) + (ord.tax || 0);
    });

    const allPaid = tableOrders.every((o) => o.paymentStatus === 'PAID') && tableOrders.length > 0;

    return {
      orderNumber: tableOrders[0]?.orderNumber || parseInt(tableNumber, 10) || 1,
      orderMode: 'DINE_IN',
      tableName: displayName || `Table ${tableNumber}`,
      createdAt: tableOrders[0]?.createdAt || new Date().toISOString(),
      customerName: tableOrders[0]?.customerName || 'Dine-In Guest',
      customerPhone: tableOrders[0]?.customerPhone,
      items: combinedItems.length > 0 ? combinedItems : [
        { nameSnapshot: `${displayName || `Table ${tableNumber}`} Dining Service`, unitPriceSnapshot: combinedTotal || 0, quantity: 1 }
      ],
      subtotal: combinedSubtotal,
      tax: combinedTax,
      total: combinedTotal,
      paymentStatus: allPaid ? 'PAID' : 'PENDING',
    };
  };

  const tableForm = useForm<TableFormValues>({ resolver: zodResolver(tableSchema) });
  const bulkForm = useForm<BulkTableFormValues>({
    resolver: zodResolver(bulkTableSchema),
    defaultValues: { count: 10, prefix: '', zoneId: undefined },
  });
  const zoneForm = useForm<ZoneFormValues>({ resolver: zodResolver(zoneSchema) });

  // ── Computed Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => getTableStatus(t) === 'OCCUPIED').length;
    const reserved = tables.filter((t) => getTableStatus(t) === 'RESERVED').length;
    const available = Math.max(0, total - occupied - reserved);
    return { total, occupied, reserved, available };
  }, [tables]);

  // ── Filtered & Grouped ──────────────────────────────────────────────────────
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const status = getTableStatus(table);
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!table.tableNumber.toLowerCase().includes(q) && !table.displayName.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [tables, statusFilter, searchQuery]);

  const zoneGroupings = useMemo(() => {
    const displayZones = activeZoneFilter
      ? zones.filter((z) => z._id === activeZoneFilter)
      : [...zones, { _id: 'unassigned', name: 'Unassigned', isActive: true } as TableZone];

    return displayZones
      .map((zone) => {
        const isUnassigned = zone._id === 'unassigned';
        const zoneTables = filteredTables.filter((t) => {
          const tableZoneId = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
          return isUnassigned
            ? !tableZoneId || !zones.some((z) => z._id === tableZoneId)
            : tableZoneId === zone._id;
        });
        return { zone, tables: zoneTables };
      })
      .filter((g) => g.tables.length > 0);
  }, [filteredTables, zones, activeZoneFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onSubmitTable = (values: TableFormValues) => {
    setErrorMsg(null);
    if (editingTable) {
      editTableMutation.mutate({ id: editingTable._id, data: values }, { onSuccess: () => setIsCreateOpen(false) });
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
      editZoneMutation.mutate({ id: editingZone._id, data: values }, { onSuccess: () => setIsZoneFormOpen(false) });
    } else {
      createZoneMutation.mutate(values, { onSuccess: () => setIsZoneFormOpen(false) });
    }
  };

  const handleEditClick = (table: Table) => {
    setEditingTable(table);
    const zId = typeof table.zoneId === 'string' ? table.zoneId : table.zoneId?._id;
    tableForm.reset({ tableNumber: table.tableNumber, displayName: table.displayName, zoneId: zId || undefined });
    setIsCreateOpen(true);
  };

  const handleAddTableToZone = (zoneId: string) => {
    setEditingTable(null);
    tableForm.reset({ tableNumber: '', displayName: '', zoneId });
    setIsCreateOpen(true);
  };

  const handleDownloadPng = async () => {
    if (!qrData?.data || !showQrModal) return;
    try {
      toast('Generating high-resolution standee card...', 'info');
      const standeeDataUri = await generateStandeeCardPng({
        tableNumber: showQrModal.tableNumber,
        displayName: showQrModal.displayName || `Table ${showQrModal.tableNumber}`,
        restaurantName: qrData.data.restaurantName || restaurantInfo.name || 'Restaurant',
        url: qrData.data.url,
        logoUrl: qrData.data.restaurantLogo || qrData.data.qrStyle?.logoUrl,
        fgColor: qrData.data.qrStyle?.fgColor || '#0F172A',
        bgColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
        showLogo: qrData.data.qrStyle?.showLogo !== false,
        cardFrameText: qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order',
        templateTheme: qrData.data.qrStyle?.templateTheme || 'standee',
        errorCorrectionLevel: 'H',
      });

      const link = document.createElement('a');
      link.href = standeeDataUri;
      link.download = `standee-table-${showQrModal.tableNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('Standee card downloaded!', 'success');
    } catch {
      if (qrData?.data?.pngDataUri) {
        const link = document.createElement('a');
        link.href = qrData.data.pngDataUri;
        link.download = `qr-table-${showQrModal.tableNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handlePrintQr = async () => {
    if (!qrData?.data || !showQrModal) return;
    try {
      const standeeDataUri = await generateStandeeCardPng({
        tableNumber: showQrModal.tableNumber,
        displayName: showQrModal.displayName || `Table ${showQrModal.tableNumber}`,
        restaurantName: qrData.data.restaurantName || restaurantInfo.name || 'Restaurant',
        url: qrData.data.url,
        logoUrl: qrData.data.restaurantLogo || qrData.data.qrStyle?.logoUrl,
        fgColor: qrData.data.qrStyle?.fgColor || '#0F172A',
        bgColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
        showLogo: qrData.data.qrStyle?.showLogo !== false,
        cardFrameText: qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order',
        templateTheme: qrData.data.qrStyle?.templateTheme || 'standee',
        errorCorrectionLevel: 'H',
      });
      printStandeeCard(standeeDataUri, showQrModal.tableNumber);
    } catch {
      toast('Failed to prepare print document', 'error');
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!activeRestaurantId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 font-sans">
        <Loader className="w-10 h-10 text-amber-500 mb-4 animate-spin" strokeWidth={1.75} />
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-sm mt-1">Contact a Super Admin to get assigned.</p>
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

  if (!restaurantId && user?.role !== 'SUPER_ADMIN' && !flagsLoading && !isEnabled('qr_menu')) {
    return <Navigate to="/manager/orders" replace />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6 font-sans pb-16">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display tracking-tight text-3xl sm:text-4xl font-bold text-slate-900">
            Table Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tap a table to open quick actions — clear, reserve, view QR, or edit.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => refetchTables()}
            title="Refresh"
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setShowZoneManager(true)}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition shadow-sm cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Manage Zones
          </button>
          <button
            type="button"
            onClick={() => setShowQrStudio(true)}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
            <span>Manage QR Code Style</span>
          </button>
          {isEnabled('ordering') && (
            <button
              onClick={() => {
                const firstOccupied = tables.find((t) => getTableStatus(t) === 'OCCUPIED') || tables[0] || null;
                setShowTableOperationsModal(firstOccupied);
              }}
              className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Transfer guest sessions or merge multiple tables"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
              <span>Transfer / Merge</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingTable(null);
              tableForm.reset({ tableNumber: '', displayName: '', zoneId: activeZoneFilter || undefined });
              setIsCreateOpen(true);
            }}
            className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Table
          </button>
          <button
            onClick={() => {
              setErrorMsg(null);
              bulkForm.reset({ count: 10, prefix: '', zoneId: activeZoneFilter || undefined });
              setIsBulkFormOpen(true);
            }}
            className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            <LayoutGrid className="w-3.5 h-3.5" strokeWidth={2} />
            Bulk Create
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className={`grid gap-3 ${isEnabled('ordering') ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
        {[
          { label: 'Total Tables', value: stats.total, icon: Layers, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', show: true },
          { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', show: isEnabled('ordering') },
          { label: 'Occupied', value: stats.occupied, icon: Utensils, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', show: isEnabled('ordering') },
          { label: 'Reserved', value: stats.reserved, icon: Bookmark, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', show: true },
        ].filter(kpi => kpi.show !== false).map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} bg-white shadow-sm p-4 flex items-center gap-3`}>
            <div className={`${bg} ${color} p-2.5 rounded-xl`}>
              <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className={`text-2xl font-extrabold mt-0.5 ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls Row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl flex-wrap">
          {(
            [
              { id: 'ALL', label: 'All', count: stats.total, show: true },
              { id: 'AVAILABLE', label: 'Available', count: stats.available, show: isEnabled('ordering') },
              { id: 'OCCUPIED', label: 'Occupied', count: stats.occupied, show: isEnabled('ordering') },
              { id: 'RESERVED', label: 'Reserved', count: stats.reserved, show: true },
            ] as const
          ).filter(tab => tab.show !== false).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setActiveZoneFilter(null)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                activeZoneFilter === null
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              All Zones
            </button>
            {zones.map((z) => (
              <button
                key={z._id}
                onClick={() => setActiveZoneFilter(activeZoneFilter === z._id ? null : z._id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  activeZoneFilter === z._id
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                {z.name}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative sm:ml-auto min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search tables…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Zone-wise Table Grid ───────────────────────────────────────────────── */}
      {zoneGroupings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <QrCode className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Tables Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {searchQuery ? `No tables match "${searchQuery}"` : 'Click "Add Table" to create your first table.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {zoneGroupings.map(({ zone, tables: zoneTables }) => (
            <div key={zone._id} className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
              {/* Zone header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">{zone.name}</h3>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {zoneTables.length}
                  </span>
                </div>
                {zone._id !== 'unassigned' && (
                  <button
                    onClick={() => handleAddTableToZone(zone._id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3 h-3" strokeWidth={2.5} />
                    Add table
                  </button>
                )}
              </div>

              {/* Table cards grid */}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {zoneTables.map((table) => {
                  const status = getTableStatus(table);
                  const isOccupied = status === 'OCCUPIED';
                  const isReserved = status === 'RESERVED';

                  return (
                    <button
                      key={table._id}
                      onClick={() => setActiveTableAction(table)}
                      className={`
                        relative flex flex-col items-center text-center rounded-2xl border-2 p-3 gap-1.5
                        transition-all duration-150 hover:-translate-y-0.5 group cursor-pointer select-none
                        ${isOccupied && isEnabled('ordering')
                          ? 'bg-gradient-to-b from-amber-50 to-amber-100/50 border-amber-400 hover:border-amber-500 hover:shadow-md hover:shadow-amber-100'
                          : isReserved
                          ? 'bg-gradient-to-b from-violet-50 to-violet-100/50 border-violet-400 hover:border-violet-500 hover:shadow-md hover:shadow-violet-100'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md hover:shadow-slate-100'
                        }
                      `}
                    >
                      {/* 1-Click Print Bill button on Occupied Tables */}
                      {isOccupied && isEnabled('ordering') && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTableOperationsModal(table);
                            }}
                            className="absolute top-1.5 left-1.5 p-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition shadow-2xs cursor-pointer z-10"
                            title={`Transfer or Merge Table (${table.displayName})`}
                          >
                            <ArrowRightLeft className="w-3 h-3" strokeWidth={2} />
                          </button>

                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const tableOrder = await fetchTableConsolidatedOrder(table._id, table.tableNumber, table.displayName);
                              printOrderTicket(tableOrder, restaurantInfo, 'CUSTOMER');
                              toast(`Printed Customer Bill for ${table.displayName}`, 'success');
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 transition shadow-2xs cursor-pointer z-10"
                            title={`1-Click Print Customer Bill (${table.displayName})`}
                          >
                            <Receipt className="w-3 h-3" strokeWidth={2} />
                          </button>
                        </>
                      )}

                      {/* Table number circle */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shadow-sm
                          ${isOccupied && isEnabled('ordering') ? 'bg-amber-500 text-white' : isReserved ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-800'}`}
                      >
                        {table.tableNumber}
                      </div>

                      {/* Display name */}
                      <span className="text-[11px] font-bold text-slate-800 truncate w-full leading-tight" title={table.displayName}>
                        {table.displayName}
                      </span>

                      {/* Status badge */}
                      {isOccupied && isEnabled('ordering') ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded-md leading-none">
                          <span className="w-1 h-1 rounded-full bg-amber-600 animate-ping inline-block mr-0.5" />
                          {table.activeOrderCount ? `${table.activeOrderCount} ORDER${table.activeOrderCount > 1 ? 'S' : ''}` : 'OCCUPIED'}
                        </span>
                      ) : isReserved ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-violet-900 bg-violet-200/60 px-1.5 py-0.5 rounded-md leading-none">
                          <Bookmark className="w-2 h-2" strokeWidth={2.5} />
                          RESERVED
                        </span>
                      ) : isEnabled('ordering') ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md leading-none">
                          FREE
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Action Modal ─────────────────────────────────────────────────── */}
      {activeTableAction && (() => {
        const t = activeTableAction;
        const status = getTableStatus(t);
        const isOccupied = status === 'OCCUPIED';
        const isReserved = status === 'RESERVED';

        return (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setActiveTableAction(null); }}
          >
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              {/* Modal handle bar (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Header */}
              <div
                className={`px-5 pt-4 pb-4 border-b border-slate-100 ${
                  isOccupied ? 'bg-amber-50' : isReserved ? 'bg-violet-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl font-mono font-extrabold text-base flex items-center justify-center shadow-sm
                        ${isOccupied ? 'bg-amber-500 text-white' : isReserved ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white'}`}
                    >
                      {t.tableNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">{t.displayName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isOccupied && isEnabled('ordering') && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Occupied
                          </span>
                        )}
                        {isReserved && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold text-violet-900 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                            <Bookmark className="w-2.5 h-2.5" />
                            Reserved
                          </span>
                        )}
                        {!isOccupied && !isReserved && isEnabled('ordering') && (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveTableAction(null)} className="p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Active orders banner inside header */}
                {t.activeOrderCount !== undefined && t.activeOrderCount > 0 && (
                  <div className="mt-3 flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" strokeWidth={2} />
                    <span><strong>{t.activeOrderCount}</strong> active order{t.activeOrderCount > 1 ? 's' : ''} in kitchen / service</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 space-y-2.5">
                {/* View QR – primary amber */}
                <button
                  onClick={() => { setActiveTableAction(null); setShowQrModal(t); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition active:scale-[0.98]"
                >
                  <QrCode className="w-5 h-5" strokeWidth={1.75} />
                  View QR Code
                </button>

                {/* Print Bill & Clear options for occupied table */}
                {isOccupied && isEnabled('ordering') && (
                  <div className="space-y-2 pb-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const tableOrder = await fetchTableConsolidatedOrder(t._id, t.tableNumber, t.displayName);
                        printOrderTicket(tableOrder, restaurantInfo, 'CUSTOMER');
                        toast(`Printing Customer Bill for ${t.displayName}`, 'success');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98] cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-white" strokeWidth={2} />
                      Print Customer Bill
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const tableOrder = await fetchTableConsolidatedOrder(t._id, t.tableNumber, t.displayName);
                        printOrderTicket(tableOrder, restaurantInfo, 'CUSTOMER');
                        clearTablesMutation.mutate([t._id], {
                          onSuccess: () => {
                            setActiveTableAction(null);
                            toast(`${t.displayName} bill printed and table cleared!`, 'success');
                          },
                        });
                      }}
                      disabled={clearTablesMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {clearTablesMutation.isPending ? (
                        <Loader className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <>
                          <Printer className="w-4 h-4 text-white" strokeWidth={2} />
                          <span>Print Bill &amp; Free Table</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const target = t;
                        setActiveTableAction(null);
                        setShowTableOperationsModal(target);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-[0.98] cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                      <span>Transfer / Merge Table Session</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const tableOrder = await fetchTableConsolidatedOrder(t._id, t.tableNumber, t.displayName);
                        setPrintModalOrder(tableOrder);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-[0.98] cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                      <span>More Print Options (KOT / Counter)</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {/* Clear table */}
                  {isOccupied && (
                    <button
                      onClick={() => {
                        if (confirm(`Clear Table ${t.tableNumber}? This will close the active session.`)) {
                          clearTablesMutation.mutate([t._id], { onSuccess: () => setActiveTableAction(null) });
                        }
                      }}
                      disabled={clearTablesMutation.isPending}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                    >
                      {clearTablesMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Quick Clear</>}
                    </button>
                  )}

                  {/* Reserve / Unreserve */}
                  {isReserved ? (
                    <button
                      onClick={() => reserveTablesMutation.mutate({ tableIds: [t._id], reserved: false }, { onSuccess: () => setActiveTableAction(null) })}
                      disabled={reserveTablesMutation.isPending}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-bold transition"
                    >
                      <Bookmark className="w-4 h-4" /> Unreserve
                    </button>
                  ) : (
                    <button
                      onClick={() => reserveTablesMutation.mutate({ tableIds: [t._id], reserved: true }, { onSuccess: () => setActiveTableAction(null) })}
                      disabled={reserveTablesMutation.isPending}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                    >
                      <Bookmark className="w-4 h-4" /> Reserve
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => { setActiveTableAction(null); handleEditClick(t); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={1.75} /> Edit Details
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this table? Tables with order history will be soft-archived.')) {
                        const id = t._id;
                        setActiveTableAction(null);
                        deleteTableMutation.mutate(id);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-100"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Zone Manager Slide-over ────────────────────────────────────────────── */}
      {showZoneManager && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[99999] animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowZoneManager(false); }}
        >
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900">Manage Zones</h2>
              <button onClick={() => setShowZoneManager(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {zones.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">No zones yet. Create your first zone below.</p>
              )}
              {zones.map((zone) => (
                <div key={zone._id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{zone.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tables.filter((t) => {
                        const tid = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
                        return tid === zone._id;
                      }).length} tables
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingZone(zone); zoneForm.reset({ name: zone.name }); setIsZoneFormOpen(true); setShowZoneManager(false); }}
                      className="p-2 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl transition cursor-pointer"
                      title="Edit zone"
                    >
                      <Edit2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete zone "${zone.name}"? ALL tables in this zone will be deleted.`)) deleteZoneMutation.mutate(zone._id); }}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                      title="Delete zone"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => { setEditingZone(null); zoneForm.reset({ name: '' }); setIsZoneFormOpen(true); setShowZoneManager(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Create New Zone
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Bulk Create Modal ──────────────────────────────────────────────────── */}
      {isBulkFormOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900">Bulk Create Tables</h2>
              <button onClick={() => setIsBulkFormOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="p-6 space-y-5">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{errorMsg}</div>}

              {[
                { label: 'Quantity', field: 'count', type: 'number', placeholder: 'e.g. 20' },
                { label: 'Prefix (Optional)', field: 'prefix', type: 'text', placeholder: 'e.g. T or Out-' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type={type}
                    {...(type === 'number'
                      ? bulkForm.register('count', { valueAsNumber: true })
                      : bulkForm.register('prefix' as any)
                    )}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  {bulkForm.formState.errors.count && field === 'count' && (
                    <p className="text-xs text-red-500 mt-1">{bulkForm.formState.errors.count.message}</p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone (Optional)</label>
                <select
                  {...bulkForm.register('zoneId')}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                >
                  <option value="">No Zone (Unassigned)</option>
                  {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsBulkFormOpen(false)} className="w-1/2 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl transition border border-slate-200 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={bulkCreateMutation.isPending} className="w-1/2 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer">
                  {bulkCreateMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : 'Generate Tables'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Create / Edit Table Modal ──────────────────────────────────────────── */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900">{editingTable ? 'Edit Table' : 'New Table'}</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={tableForm.handleSubmit(onSubmitTable)} className="p-6 space-y-4">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{errorMsg}</div>}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone</label>
                <select {...tableForm.register('zoneId')} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white text-slate-800">
                  <option value="">No Zone (Unassigned)</option>
                  {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>

              {!editingTable ? (
                <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl text-xs text-amber-900 leading-relaxed">
                  ✨ Table number and display name will be <strong>auto-assigned</strong> starting from 1 for the selected zone.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Table Number</label>
                    <input type="text" placeholder="e.g. 1" {...tableForm.register('tableNumber')} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Display Name</label>
                    <input type="text" placeholder="e.g. Table 1" {...tableForm.register('displayName')} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="w-1/2 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl transition border border-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" disabled={createTableMutation.isPending || editTableMutation.isPending} className="w-1/2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer">
                  {createTableMutation.isPending || editTableMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : editingTable ? 'Save Changes' : 'Auto-Generate Table'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Zone Form Modal ────────────────────────────────────────────────────── */}
      {isZoneFormOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900">{editingZone ? 'Edit Zone' : 'New Zone'}</h2>
              <button onClick={() => setIsZoneFormOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={zoneForm.handleSubmit(onZoneSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Zone Name</label>
                <input type="text" placeholder="e.g. Patio, Main Hall, Rooftop" {...zoneForm.register('name')} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
                {zoneForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{zoneForm.formState.errors.name.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsZoneFormOpen(false)} className="w-1/2 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-2xl transition border border-slate-200 cursor-pointer">Cancel</button>
                <button type="submit" disabled={createZoneMutation.isPending || editZoneMutation.isPending} className="w-1/2 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer">
                  {createZoneMutation.isPending || editZoneMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : editingZone ? 'Save Zone' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── QR Code Modal ─────────────────────────────────────────────────────── */}
      {showQrModal && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">{showQrModal.displayName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Dine-in Table Standee QR</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              {isLoadingQr ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
                </div>
              ) : qrData?.data?.svg ? (
                <>
                  {/* Realistic Standee/Card Display */}
                  <div className="w-full flex flex-col items-center">
                    {qrData.data.qrStyle?.templateTheme === 'minimal' ? (
                      /* Minimal Template */
                      <div
                        className="w-56 rounded-2xl p-4 shadow-md flex flex-col items-center text-center relative border border-slate-200"
                        style={{ backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF' }}
                      >
                        <div className="flex items-center justify-between w-full pb-1.5 mb-1.5 border-b border-slate-150">
                          <span className="text-[10px] font-mono font-black uppercase text-slate-800">
                            {qrData.data.restaurantName || 'DINE-IN'}
                          </span>
                          <span
                            className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                              color: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                            }}
                          >
                            {showQrModal.displayName}
                          </span>
                        </div>
                        <div className="relative w-44 h-44 flex items-center justify-center p-1">
                          <div
                            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: qrData.data.svg }}
                          />
                          {qrData.data.qrStyle?.showLogo && qrData.data.restaurantLogo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                                <img
                                  src={qrData.data.restaurantLogo}
                                  alt="Logo"
                                  className="w-full h-full object-contain rounded-lg"
                                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 mt-1">
                          {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                        </span>
                      </div>
                    ) : qrData.data.qrStyle?.templateTheme === 'branded' ? (
                      /* Branded Template */
                      <div
                        className="w-56 rounded-2xl p-4 shadow-xl flex flex-col items-center text-center relative border-2"
                        style={{
                          backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                          borderColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                        }}
                      >
                        <div
                          className="w-8 h-1 rounded-full mb-2"
                          style={{ backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                        />
                        <h4
                          className="font-serif text-sm font-black tracking-tight"
                          style={{ color: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                        >
                          {qrData.data.restaurantName || 'Restaurant'}
                        </h4>
                        <p className="text-[9px] text-slate-500 font-semibold mb-2">
                          {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                        </p>
                        <div className="relative w-40 h-40 flex items-center justify-center bg-white p-2 rounded-xl border border-slate-200 mb-2">
                          <div
                            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                            dangerouslySetInnerHTML={{ __html: qrData.data.svg }}
                          />
                          {qrData.data.qrStyle?.showLogo && qrData.data.restaurantLogo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                                <img
                                  src={qrData.data.restaurantLogo}
                                  alt="Logo"
                                  className="w-full h-full object-contain rounded-lg"
                                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div
                          className="px-3 py-0.5 rounded-md text-[9px] font-mono font-black uppercase"
                          style={{
                            backgroundColor: (qrData.data.qrStyle?.fgColor || '#0F172A') + '15',
                            color: qrData.data.qrStyle?.fgColor || '#0F172A',
                          }}
                        >
                          {showQrModal.displayName}
                        </div>
                      </div>
                    ) : (
                      /* Standee Acrylic Template */
                      <div className="w-56 flex flex-col items-center">
                        <div
                          className="w-full rounded-3xl p-4 shadow-xl flex flex-col items-center text-center relative border backdrop-blur-sm"
                          style={{
                            backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                            borderColor: (qrData.data.qrStyle?.fgColor || '#0F172A') + '25',
                          }}
                        >
                          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none" />
                          <div
                            className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1.5 shadow-xs"
                            style={{
                              backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                              color: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                            }}
                          >
                            {showQrModal.displayName}
                          </div>
                          <h4
                            className="font-display text-xs font-black tracking-tight leading-tight"
                            style={{ color: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                          >
                            {qrData.data.restaurantName || 'Restaurant'}
                          </h4>
                          <p className="text-[9px] text-slate-500 font-bold mb-2">
                            {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                          </p>
                          <div className="relative w-40 h-40 flex items-center justify-center bg-white p-2 rounded-2xl shadow-inner border border-slate-150 mb-2">
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: qrData.data.svg }}
                            />
                            {qrData.data.qrStyle?.showLogo && qrData.data.restaurantLogo && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-9 h-9 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
                                  <img
                                    src={qrData.data.restaurantLogo}
                                    alt="Logo"
                                    className="w-full h-full object-contain rounded-lg"
                                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-slate-500 uppercase">
                            Point Camera & Scan
                          </span>
                        </div>
                        <div className="w-[85%] h-3 bg-amber-900/80 rounded-b-xl shadow-md -mt-1 border-t border-amber-950/40 relative z-10" />
                        <div className="w-[95%] h-2.5 bg-black/20 rounded-full blur-xs mt-0.5" />
                      </div>
                    )}
                  </div>

                  {/* URL Bar with Copy & Open In New Tab Buttons */}
                  <div className="w-full flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                    <input
                      type="text"
                      readOnly
                      value={qrData.data.url}
                      className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-slate-600 px-2 focus:outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrData.data.url);
                        toast('Table QR link copied to clipboard!', 'success');
                      }}
                      title="Copy link"
                      className="p-2 hover:bg-white text-slate-600 hover:text-slate-950 rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200 cursor-pointer shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={qrData.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open link in new tab"
                      className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition shadow-2xs cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" strokeWidth={1.75} /> Download PNG
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintQr}
                      className="flex items-center justify-center gap-1.5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-sm"
                    >
                      <Printer className="w-4 h-4" strokeWidth={1.75} /> Print QR
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Rotate QR token? The old printed QR link will stop working.')) {
                        regenerateQrMutation.mutate(showQrModal._id);
                      }
                    }}
                    disabled={regenerateQrMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-2xl transition border border-rose-100 cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${regenerateQrMutation.isPending ? 'animate-spin' : ''}`} />
                    Rotate QR Token
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-400 py-8">Failed to load QR code.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Print Order Modal ────────────────────────────────────────────────── */}
      <PrintOrderModal
        isOpen={!!printModalOrder}
        onClose={() => setPrintModalOrder(null)}
        order={printModalOrder}
        restaurantInfo={restaurantInfo}
      />

      {/* ── QR Code Studio & Style Customizer Modal ─────────────────────────── */}
      <QrCodeStudioModal
        isOpen={showQrStudio}
        onClose={() => setShowQrStudio(false)}
        restaurantId={targetRestaurantId!}
        restaurantSlug={restaurantInfo.slug}
        restaurantName={restaurantInfo.name}
        restaurantLogo={restaurantInfo.logoUrl}
      />

      {/* ── Table Action Modal (Overview, Transfer, Merge) ────────────────────── */}
      <TableActionModal
        isOpen={!!showTableOperationsModal}
        onClose={() => setShowTableOperationsModal(null)}
        selectedTable={showTableOperationsModal}
        allTables={tables}
        zones={zones}
        onTransfer={async (sourceTableId, targetTableId, reason) => {
          await transferTableMutation.mutateAsync({ sourceTableId, targetTableId, reason });
        }}
        onMerge={async (primaryTableId, secondaryTableIds) => {
          await mergeTablesMutation.mutateAsync({ primaryTableId, secondaryTableIds });
        }}
        isTransferring={transferTableMutation.isPending}
        isMerging={mergeTablesMutation.isPending}
      />
    </div>
  );
};

export default ManagerTables;
