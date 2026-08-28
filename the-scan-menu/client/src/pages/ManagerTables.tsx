import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { useToast } from '../hooks/useToast';
import { managerService, Table, TableZone } from '../services/restaurant.service';
import {
  useManagerTables,
  TableFormValues,
  BulkTableFormValues,
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
  MoreVertical,
  ChevronDown,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import apiClient from '../lib/api';
import { PrintOrderModal } from '../components/PrintOrderModal';
import { QrCodeStudioModal } from '../components/QrCodeStudioModal';
import { printOrderTicket, PrintOrderData } from '../utils/printReceipt';
import { generateStandeeCardPng, printStandeeCard } from '../utils/generateStandeeCard';

const tableSchema = z.object({
  tableNumber: z.string().optional(),
  displayName: z.string().optional(),
  zoneId: z.string().optional(),
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
  const navigate = useNavigate();
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
    createZoneMutation,
    editZoneMutation,
    deleteZoneMutation,
  } = useManagerTables(targetRestaurantId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);
  const [activeTableAction, setActiveTableAction] = useState<Table | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<'ACTIONS' | 'QR'>('ACTIONS');
  const [showZoneManager, setShowZoneManager] = useState(false);
  const [isZoneDeleteMode, setIsZoneDeleteMode] = useState(false);
  const [selectedZonesForDelete, setSelectedZonesForDelete] = useState<string[]>([]);
  const [isZoneManagerMoreOpen, setIsZoneManagerMoreOpen] = useState(false);
  const [zoneInlineAddOpen, setZoneInlineAddOpen] = useState(false);
  const [editingZoneInline, setEditingZoneInline] = useState<TableZone | null>(null);
  const [zoneInlineName, setZoneInlineName] = useState('');
  const [activeOrderBlockedAlert, setActiveOrderBlockedAlert] = useState<{
    zoneNames: string[];
    tables: { tableNumber: string; displayName: string; zoneName: string; activeOrderCount: number }[];
  } | null>(null);
  const [deleteZoneConfirmList, setDeleteZoneConfirmList] = useState<TableZone[] | null>(null);

  const [isFormOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
  const [showQrStudio, setShowQrStudio] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [printModalOrder, setPrintModalOrder] = useState<any | null>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [tableSelectionMode, setTableSelectionMode] = useState<'EDIT' | 'DELETE' | null>(null);

  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef<number>(0);

  const handleTablesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const delta = scrollTop - lastScrollTopRef.current;

    // When scrolling down past 30px, smoothly collapse the top header & KPI strip to maximize table grid
    if (delta > 6 && scrollTop > 30) {
      if (!isHeaderCollapsed) {
        setIsHeaderCollapsed(true);
      }
    }
    // When scrolling up or when reaching top, smoothly restore header
    else if (delta < -6 || scrollTop <= 5) {
      if (isHeaderCollapsed) {
        setIsHeaderCollapsed(false);
      }
    }

    lastScrollTopRef.current = scrollTop;
  };

  const addMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const zoneManagerMoreRef = useRef<HTMLDivElement>(null);

  const handleSaveInlineZone = async () => {
    const trimmed = zoneInlineName.trim();
    if (!trimmed) return;

    try {
      if (editingZoneInline) {
        await editZoneMutation.mutateAsync({
          id: editingZoneInline._id,
          data: { name: trimmed },
        });
      } else {
        await createZoneMutation.mutateAsync({
          name: trimmed,
        });
      }
      setZoneInlineName('');
      setZoneInlineAddOpen(false);
      setEditingZoneInline(null);
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  const handleInitiateZoneDelete = () => {
    if (selectedZonesForDelete.length === 0) return;

    // 1. Gather all occupied tables in the selected zones
    const occupiedTables: { tableNumber: string; displayName: string; zoneName: string; activeOrderCount: number }[] = [];
    const targetZones: TableZone[] = [];

    for (const zoneId of selectedZonesForDelete) {
      const zone = zones.find((z) => z._id === zoneId);
      if (zone) targetZones.push(zone);

      const zoneTables = tables.filter((t) => {
        const tid = typeof t.zoneId === 'string' ? t.zoneId : (t.zoneId as any)?._id;
        return tid === zoneId;
      });

      for (const table of zoneTables) {
        const isOccupied = table.status === 'OCCUPIED' || (table.activeOrderCount && table.activeOrderCount > 0);
        if (isOccupied) {
          occupiedTables.push({
            tableNumber: table.tableNumber,
            displayName: table.displayName,
            zoneName: zone?.name || 'Zone',
            activeOrderCount: table.activeOrderCount || 1,
          });
        }
      }
    }

    // 2. If ANY table has active orders, block and show alert
    if (occupiedTables.length > 0) {
      setActiveOrderBlockedAlert({
        zoneNames: targetZones.map((z) => z.name),
        tables: occupiedTables,
      });
      return;
    }

    // 3. Otherwise, show confirmation modal
    setDeleteZoneConfirmList(targetZones);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (zoneManagerMoreRef.current && !zoneManagerMoreRef.current.contains(e.target as Node)) {
        setIsZoneManagerMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: qrData, isLoading: isLoadingQr } = useQuery({
    queryKey: ['tableQr', targetRestaurantId, activeTableAction?._id],
    queryFn: () => managerService.getTableQr(targetRestaurantId!, activeTableAction!._id),
    enabled: !!targetRestaurantId && !!activeTableAction?._id,
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
    if (!qrData?.data || !activeTableAction) return;
    try {
      toast('Generating high-resolution standee card...', 'info');
      const standeeDataUri = await generateStandeeCardPng({
        tableNumber: activeTableAction.tableNumber,
        displayName: activeTableAction.displayName || `Table ${activeTableAction.tableNumber}`,
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
      link.download = `standee-table-${activeTableAction.tableNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('Standee card downloaded!', 'success');
    } catch {
      if (qrData?.data?.pngDataUri) {
        const link = document.createElement('a');
        link.href = qrData.data.pngDataUri;
        link.download = `qr-table-${activeTableAction.tableNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handlePrintQr = async () => {
    if (!qrData?.data || !activeTableAction) return;
    try {
      const standeeDataUri = await generateStandeeCardPng({
        tableNumber: activeTableAction.tableNumber,
        displayName: activeTableAction.displayName || `Table ${activeTableAction.tableNumber}`,
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
      printStandeeCard(standeeDataUri, activeTableAction.tableNumber);
    } catch {
      toast('Failed to prepare print document', 'error');
    }
  };

  // Escape key closes side panel, dropdowns, or selection mode if open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tableSelectionMode) {
          setTableSelectionMode(null);
          return;
        }
        if (
          activeTableAction &&
          !isFormOpen &&
          !isBulkFormOpen &&
          !showZoneManager &&
          !showQrStudio &&
          !printModalOrder
        ) {
          setActiveTableAction(null);
        }
        setIsAddMenuOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tableSelectionMode,
    activeTableAction,
    isFormOpen,
    isBulkFormOpen,
    showZoneManager,
    showQrStudio,
    printModalOrder,
  ]);

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
    <div className="w-full h-full min-h-0 flex flex-col font-sans select-none overflow-hidden pb-1">

      {/* ── Page Header & KPI Strip (Smoothly collapsible on scroll) ─────────── */}
      <div
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isHeaderCollapsed ? 'max-h-0 opacity-0 mb-0 pointer-events-none scale-y-95' : 'max-h-72 opacity-100 mb-2.5 scale-y-100'
        }`}
      >
        <div className="space-y-2.5">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 md:px-5 shadow-xs">
            <div>
              <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Table Management
              </h1>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                Select any table for operational actions — view QR, print bill, reserve, or merge.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Refresh button */}
              <button
                onClick={() => refetchTables()}
                title="Refresh tables"
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
              </button>

              {/* Transfer / Merge Button (Operational) */}
              {isEnabled('ordering') && (
                <button
                  onClick={() => navigate('/manager/tables/operations')}
                  className="h-10 flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-900 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  title="Transfer guest sessions or merge multiple tables"
                >
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" strokeWidth={2} />
                  <span>Transfer / Merge</span>
                </button>
              )}

              {/* Add Table Dropdown */}
              <div className="relative" ref={addMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(!isAddMenuOpen);
                    setIsMoreMenuOpen(false);
                  }}
                  className="h-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  <span>Add Table</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAddMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        setEditingTable(null);
                        tableForm.reset({ tableNumber: '', displayName: '', zoneId: activeZoneFilter || undefined });
                        setIsCreateOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl transition text-left cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-500" strokeWidth={2} />
                      <span>Add Single Table</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        setErrorMsg(null);
                        bulkForm.reset({ count: 10, prefix: '', zoneId: activeZoneFilter || undefined });
                        setIsBulkFormOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl transition text-left cursor-pointer"
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                      <span>Bulk Create Tables</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        setShowZoneManager(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl transition text-left cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                      <span>Manage Zones</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3-Dot More Menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                    setIsAddMenuOpen(false);
                  }}
                  title="More options"
                  className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <MoreVertical className="w-4 h-4" strokeWidth={2} />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setTableSelectionMode(tableSelectionMode === 'EDIT' ? null : 'EDIT');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-amber-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
                      <span>Edit Table Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setTableSelectionMode(tableSelectionMode === 'DELETE' ? null : 'DELETE');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" strokeWidth={1.75} />
                      <span>Delete Table(s)</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setShowQrStudio(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl transition text-left cursor-pointer"
                    >
                      <Palette className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
                      <span>Customize QR Style</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setShowZoneManager(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 rounded-xl transition text-left cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                      <span>Manage Zones</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className={`grid gap-2.5 sm:gap-3 shrink-0 ${isEnabled('ordering') ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
            {[
              { label: 'Total Tables', value: stats.total, icon: Layers, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', show: true },
              { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', show: isEnabled('ordering') },
              { label: 'Occupied', value: stats.occupied, icon: Utensils, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', show: isEnabled('ordering') },
              { label: 'Reserved', value: stats.reserved, icon: Bookmark, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', show: true },
            ].filter(kpi => kpi.show !== false).map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} bg-white shadow-2xs px-3.5 py-2.5 flex items-center gap-3`}>
                <div className={`${bg} ${color} p-2 rounded-xl shrink-0`}>
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className={`text-xl font-extrabold leading-none mt-0.5 ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Controls Row (Toolbar) ────────────────────────────────────────── */}
      <div className="shrink-0 mb-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Status filter pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl flex-wrap shrink-0">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none shrink-0">
            <button
              onClick={() => setActiveZoneFilter(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
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
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition shadow-2xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Selection Mode Active Banner ────────────────────────────────────── */}
      {tableSelectionMode && (
        <div className={`shrink-0 mb-2.5 flex items-center justify-between px-4 py-2.5 rounded-2xl border shadow-xs animate-in fade-in duration-150 ${
          tableSelectionMode === 'DELETE'
            ? 'bg-rose-50/95 backdrop-blur-md border-rose-200 text-rose-950'
            : 'bg-amber-50/95 backdrop-blur-md border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {tableSelectionMode === 'DELETE' ? (
              <>
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span><strong>Delete Table Mode:</strong> Click any table below to delete it. Tables with past orders will be archived.</span>
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>Edit Table Mode:</strong> Click any table below to edit its number, display name, or assigned zone.</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTableSelectionMode(null)}
            className={`px-3 py-1 text-xs font-extrabold rounded-xl border transition shadow-2xs cursor-pointer ${
              tableSelectionMode === 'DELETE'
                ? 'bg-white hover:bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            Exit Mode (Esc)
          </button>
        </div>
      )}

      {/* ── Main Tables Workspace (Split View when Table Selected) ─────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto scrollbar-none pb-6 pr-0.5"
        onScroll={handleTablesScroll}
      >
        <div className="flex flex-col lg:flex-row gap-3 items-start">
          {/* Left Side: Tables Grid */}
          <div className="flex-1 min-w-0 space-y-3.5">
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
            <div className="space-y-3.5">
              {zoneGroupings.map(({ zone, tables: zoneTables }) => (
                <div key={zone._id} className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                  {/* Zone header */}
                  <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">{zone.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                        {zoneTables.length}
                      </span>
                    </div>
                    {zone._id !== 'unassigned' && (
                      <button
                        onClick={() => handleAddTableToZone(zone._id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                        <span>Add table</span>
                      </button>
                    )}
                  </div>

                  {/* Table cards grid: Reflows dynamically when right panel is open */}
                  <div className={`p-3.5 sm:p-4 grid gap-2.5 sm:gap-3 ${
                    activeTableAction
                      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
                  }`}>
                    {zoneTables.map((table) => {
                      const status = getTableStatus(table);
                      const isOccupied = status === 'OCCUPIED';
                      const isReserved = status === 'RESERVED';
                      const isSelected = activeTableAction?._id === table._id;
                      const isInDeleteMode = tableSelectionMode === 'DELETE';
                      const isInEditMode = tableSelectionMode === 'EDIT';

                      return (
                        <button
                          key={table._id}
                          onClick={() => {
                            if (tableSelectionMode === 'DELETE') {
                              if (confirm(`Delete table "${table.displayName}" (Table ${table.tableNumber})? Tables with order history will be soft-archived.`)) {
                                if (activeTableAction?._id === table._id) setActiveTableAction(null);
                                deleteTableMutation.mutate(table._id);
                              }
                              return;
                            }
                            if (tableSelectionMode === 'EDIT') {
                              handleEditClick(table);
                              return;
                            }
                            if (isSelected) {
                              setActiveTableAction(null);
                            } else {
                              setActiveTableAction(table);
                            }
                          }}
                          className={`
                            relative flex flex-col items-center text-center rounded-2xl border-2 p-2.5 sm:p-3 gap-1.5
                            transition-all duration-150 group cursor-pointer select-none active:scale-95
                            ${
                              isInDeleteMode
                                ? 'bg-rose-50/70 border-rose-400 hover:border-rose-600 hover:bg-rose-100/80 hover:shadow-md hover:shadow-rose-100 ring-2 ring-rose-400/20'
                                : isInEditMode
                                ? 'bg-amber-50/70 border-amber-400 hover:border-amber-600 hover:bg-amber-100/80 hover:shadow-md hover:shadow-amber-100 ring-2 ring-amber-400/20'
                                : isSelected
                                ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/30 shadow-md scale-[1.02]'
                                : isOccupied && isEnabled('ordering')
                                ? 'bg-gradient-to-b from-amber-50 to-amber-100/50 border-amber-400 hover:border-amber-500 hover:shadow-md hover:shadow-amber-100'
                                : isReserved
                                ? 'bg-gradient-to-b from-violet-50 to-violet-100/50 border-violet-400 hover:border-violet-500 hover:shadow-md hover:shadow-violet-100'
                                : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md hover:shadow-slate-100'
                            }
                          `}
                        >
                          {/* Selection Mode Icon Badge */}
                          {isInDeleteMode && (
                            <div className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs z-10">
                              <Trash2 className="w-3 h-3" />
                            </div>
                          )}
                          {isInEditMode && (
                            <div className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs z-10">
                              <Edit2 className="w-3 h-3" />
                            </div>
                          )}

                          {/* 1-Click Print Bill button on Occupied Tables */}
                          {!tableSelectionMode && isOccupied && isEnabled('ordering') && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/manager/tables/operations?sourceTableId=${table._id}`);
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

                          {/* Table number badge */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shadow-sm transition-colors
                              ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/20'
                                  : isOccupied && isEnabled('ordering')
                                  ? 'bg-amber-500 text-white'
                                  : isReserved
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
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
        </div>

        {/* Right Side: Table Inspector & Direct QR Viewer Panel */}
        <AnimatePresence mode="wait">
          {activeTableAction && (() => {
            const t = activeTableAction;
            const status = getTableStatus(t);
            const isOccupied = status === 'OCCUPIED';
            const isReserved = status === 'RESERVED';
            const zoneName = zones.find(z => z._id === (typeof t.zoneId === 'object' ? (t.zoneId as any)?._id : t.zoneId))?.name || 'Unassigned Zone';

            return (
              <motion.div
                key={t._id}
                initial={{ opacity: 0, x: 50, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 'auto' }}
                exit={{ opacity: 0, x: 50, width: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full lg:w-96 shrink-0 sticky top-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-10rem)] overflow-hidden"
              >
                {/* Header */}
                <div className={`p-4 border-b border-slate-100 shrink-0 ${
                  isOccupied ? 'bg-amber-50/70' : isReserved ? 'bg-violet-50/70' : 'bg-slate-50/60'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl font-mono font-black text-base flex items-center justify-center shadow-xs shrink-0 ${
                        isOccupied ? 'bg-amber-500 text-white' : isReserved ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white'
                      }`}>
                        {t.tableNumber}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">{t.displayName}</h3>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md truncate">
                            {zoneName}
                          </span>
                          {isOccupied && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                              Occupied
                            </span>
                          )}
                          {isReserved && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-900 bg-violet-200/80 px-2 py-0.5 rounded-md">
                              <Bookmark className="w-2.5 h-2.5" />
                              Reserved
                            </span>
                          )}
                          {!isOccupied && !isReserved && isEnabled('ordering') && (
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTableAction(null)}
                      className="p-1.5 hover:bg-slate-200/60 rounded-xl transition text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                      title="Close panel (Esc)"
                    >
                      <X className="w-5 h-5" strokeWidth={2} />
                    </button>
                  </div>

                  {/* Active orders indicator */}
                  {t.activeOrderCount !== undefined && t.activeOrderCount > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-amber-100/90 border border-amber-300/80 text-amber-950 px-3 py-2 rounded-xl text-xs font-semibold">
                      <Zap className="w-4 h-4 shrink-0 text-amber-600" strokeWidth={2.2} />
                      <span><strong>{t.activeOrderCount}</strong> active ticket{t.activeOrderCount > 1 ? 's' : ''} on floor</span>
                    </div>
                  )}

                  {/* Tabs: Actions vs QR Code */}
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 p-1 rounded-2xl mt-3">
                    <button
                      type="button"
                      onClick={() => setSidePanelTab('ACTIONS')}
                      className={`py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        sidePanelTab === 'ACTIONS'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Quick Actions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidePanelTab('QR')}
                      className={`py-1.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        sidePanelTab === 'QR'
                          ? 'bg-white text-amber-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      <span>QR Standee</span>
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-3">
                  {sidePanelTab === 'ACTIONS' ? (
                    <div className="space-y-2.5">
                      {/* Primary View QR Button */}
                      <button
                        type="button"
                        onClick={() => setSidePanelTab('QR')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" strokeWidth={2} />
                        <span>View QR Code &amp; Standee</span>
                      </button>

                      {/* Occupied Actions */}
                      {isOccupied && isEnabled('ordering') && (
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const tableOrder = await fetchTableConsolidatedOrder(t._id, t.tableNumber, t.displayName);
                              printOrderTicket(tableOrder, restaurantInfo, 'CUSTOMER');
                              toast(`Printing Customer Bill for ${t.displayName}`, 'success');
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <Receipt className="w-4 h-4 text-white" strokeWidth={2} />
                            <span>Print Customer Bill</span>
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
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {clearTablesMutation.isPending ? (
                              <Loader className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2} />
                                <span>Print Bill &amp; Free Table</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/manager/tables/operations?sourceTableId=${t._id}`);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs transition active:scale-95 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" strokeWidth={2} />
                            <span>Transfer / Merge Session</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const tableOrder = await fetchTableConsolidatedOrder(t._id, t.tableNumber, t.displayName);
                              setPrintModalOrder(tableOrder);
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                            <span>More Print Options (KOT / Counter)</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Clear Table ${t.tableNumber}? This will close the active session.`)) {
                                clearTablesMutation.mutate([t._id]);
                              }
                            }}
                            disabled={clearTablesMutation.isPending}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                          >
                            {clearTablesMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Quick Clear Session</>}
                          </button>
                        </div>
                      )}

                      {/* Reserve / Unreserve */}
                      {isReserved ? (
                        <button
                          onClick={() => reserveTablesMutation.mutate({ tableIds: [t._id], reserved: false })}
                          disabled={reserveTablesMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-900 text-xs font-bold transition cursor-pointer"
                        >
                          <Bookmark className="w-4 h-4 text-violet-700" />
                          <span>Unreserve Table</span>
                        </button>
                      ) : !isOccupied ? (
                        <button
                          onClick={() => reserveTablesMutation.mutate({ tableIds: [t._id], reserved: true })}
                          disabled={reserveTablesMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer border border-slate-200"
                        >
                          <Bookmark className="w-4 h-4 text-amber-500" />
                          <span>Reserve Table</span>
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    /* QR Code & Standee Tab */
                    <div className="flex flex-col items-center gap-3">
                      {isLoadingQr ? (
                        <div className="h-48 flex items-center justify-center">
                          <Loader className="w-7 h-7 animate-spin text-amber-500" strokeWidth={1.75} />
                        </div>
                      ) : qrData?.data?.svg ? (
                        <>
                          {/* Standee Preview Card */}
                          <div className="w-full flex flex-col items-center">
                            {qrData.data.qrStyle?.templateTheme === 'minimal' ? (
                              <div
                                className="w-52 rounded-2xl p-3.5 shadow-md flex flex-col items-center text-center relative border border-slate-200"
                                style={{ backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF' }}
                              >
                                <div className="flex items-center justify-between w-full pb-1 mb-1 border-b border-slate-150">
                                  <span className="text-[9px] font-mono font-black uppercase text-slate-800">
                                    {qrData.data.restaurantName || 'DINE-IN'}
                                  </span>
                                  <span
                                    className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                                      color: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                                    }}
                                  >
                                    {t.displayName}
                                  </span>
                                </div>
                                <div className="relative w-36 h-36 flex items-center justify-center p-1">
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
                                <span className="text-[9px] font-bold text-slate-600 mt-1">
                                  {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                                </span>
                              </div>
                            ) : qrData.data.qrStyle?.templateTheme === 'branded' ? (
                              <div
                                className="w-52 rounded-2xl p-3.5 shadow-xl flex flex-col items-center text-center relative border-2"
                                style={{
                                  backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                                  borderColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                                }}
                              >
                                <div
                                  className="w-7 h-1 rounded-full mb-1.5"
                                  style={{ backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                                />
                                <h4
                                  className="font-serif text-xs font-black tracking-tight"
                                  style={{ color: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                                >
                                  {qrData.data.restaurantName || 'Restaurant'}
                                </h4>
                                <p className="text-[8px] text-slate-500 font-semibold mb-1.5">
                                  {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                                </p>
                                <div className="relative w-36 h-36 flex items-center justify-center bg-white p-1.5 rounded-xl border border-slate-200 mb-1.5">
                                  <div
                                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                    dangerouslySetInnerHTML={{ __html: qrData.data.svg }}
                                  />
                                  {qrData.data.qrStyle?.showLogo && qrData.data.restaurantLogo && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-7 h-7 rounded-xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden p-0.5">
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
                                  className="px-2.5 py-0.5 rounded-md text-[8px] font-mono font-black uppercase"
                                  style={{
                                    backgroundColor: (qrData.data.qrStyle?.fgColor || '#0F172A') + '15',
                                    color: qrData.data.qrStyle?.fgColor || '#0F172A',
                                  }}
                                >
                                  {t.displayName}
                                </div>
                              </div>
                            ) : (
                              /* Standee Acrylic Template */
                              <div className="w-52 flex flex-col items-center">
                                <div
                                  className="w-full rounded-3xl p-3.5 shadow-xl flex flex-col items-center text-center relative border backdrop-blur-sm"
                                  style={{
                                    backgroundColor: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                                    borderColor: (qrData.data.qrStyle?.fgColor || '#0F172A') + '25',
                                  }}
                                >
                                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none" />
                                  <div
                                    className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mb-1 shadow-xs"
                                    style={{
                                      backgroundColor: qrData.data.qrStyle?.fgColor || '#0F172A',
                                      color: qrData.data.qrStyle?.bgColor || '#FFFFFF',
                                    }}
                                  >
                                    {t.displayName}
                                  </div>
                                  <h4
                                    className="font-display text-xs font-black tracking-tight leading-tight"
                                    style={{ color: qrData.data.qrStyle?.fgColor || '#0F172A' }}
                                  >
                                    {qrData.data.restaurantName || 'Restaurant'}
                                  </h4>
                                  <p className="text-[8px] text-slate-500 font-bold mb-1.5">
                                    {qrData.data.qrStyle?.cardFrameText || 'Scan to View Menu & Order'}
                                  </p>
                                  <div className="relative w-36 h-36 flex items-center justify-center bg-white p-1.5 rounded-2xl shadow-inner border border-slate-150 mb-1.5">
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
                                  <span className="text-[8px] font-mono font-bold text-slate-500 uppercase">
                                    Point Camera &amp; Scan
                                  </span>
                                </div>
                                <div className="w-[85%] h-2.5 bg-amber-900/80 rounded-b-xl shadow-md -mt-1 border-t border-amber-950/40 relative z-10" />
                                <div className="w-[95%] h-2 bg-black/20 rounded-full blur-xs mt-0.5" />
                              </div>
                            )}
                          </div>

                          {/* URL Bar */}
                          <div className="w-full flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={qrData.data.url}
                              className="flex-1 min-w-0 bg-transparent text-[10px] font-mono text-slate-600 px-2 focus:outline-none select-all truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(qrData.data.url);
                                toast('Table QR link copied to clipboard!', 'success');
                              }}
                              title="Copy link"
                              className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-950 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={qrData.data.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open link in new tab"
                              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          {/* Download & Print Buttons */}
                          <div className="grid grid-cols-2 gap-2 w-full pt-1">
                            <button
                              type="button"
                              onClick={handleDownloadPng}
                              className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Download</span>
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintQr}
                              className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Print Standee</span>
                            </button>
                          </div>

                          {/* Rotate QR Token */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Rotate QR token? The old printed QR link will stop working.')) {
                                regenerateQrMutation.mutate(t._id);
                              }
                            }}
                            disabled={regenerateQrMutation.isPending}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-xl transition border border-rose-100 cursor-pointer"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${regenerateQrMutation.isPending ? 'animate-spin' : ''}`} />
                            <span>Rotate QR Token</span>
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 py-8">Failed to load QR code.</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
        </div>
      </div>

      {/* ── Manage Zones Modal ─────────────────────────────────────────────────── */}
      {showZoneManager && createPortal(
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-[99999] animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowZoneManager(false);
              setIsZoneDeleteMode(false);
              setZoneInlineAddOpen(false);
              setEditingZoneInline(null);
            }
          }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 leading-tight">Manage Zones</h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Floor sections &amp; dining areas</p>
              </div>

              <div className="flex items-center gap-2">
                {/* + Add Zone button */}
                {!isZoneDeleteMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingZoneInline(null);
                      setZoneInlineName('');
                      setZoneInlineAddOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Add Zone</span>
                  </button>
                )}

                {/* 3-Dot More Menu */}
                <div className="relative" ref={zoneManagerMoreRef}>
                  <button
                    type="button"
                    onClick={() => setIsZoneManagerMoreOpen(!isZoneManagerMoreOpen)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition border border-slate-200 cursor-pointer"
                    title="More zone options"
                  >
                    <MoreVertical className="w-4 h-4" strokeWidth={2} />
                  </button>

                  {isZoneManagerMoreOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsZoneManagerMoreOpen(false);
                          setIsZoneDeleteMode(!isZoneDeleteMode);
                          setSelectedZonesForDelete([]);
                          setZoneInlineAddOpen(false);
                          setEditingZoneInline(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition text-left cursor-pointer ${
                          isZoneDeleteMode ? 'text-slate-700 hover:bg-slate-100' : 'text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" strokeWidth={1.75} />
                        <span>{isZoneDeleteMode ? 'Exit Delete Mode' : 'Delete Zone(s)'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Close modal */}
                <button
                  onClick={() => {
                    setShowZoneManager(false);
                    setIsZoneDeleteMode(false);
                    setZoneInlineAddOpen(false);
                    setEditingZoneInline(null);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Delete Selection Mode Banner */}
            {isZoneDeleteMode && (
              <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-rose-950 shrink-0">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Choose zones to delete:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedZonesForDelete.length === zones.length) {
                        setSelectedZonesForDelete([]);
                      } else {
                        setSelectedZonesForDelete(zones.map((z) => z._id));
                      }
                    }}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                  >
                    {selectedZonesForDelete.length === zones.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsZoneDeleteMode(false);
                      setSelectedZonesForDelete([]);
                    }}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-rose-200 px-2 py-0.5 rounded-lg cursor-pointer ml-1"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}

            {/* Inline Add/Edit Form */}
            {(zoneInlineAddOpen || editingZoneInline) && (
              <div className="p-4 bg-amber-50/70 border-b border-amber-200/80 shrink-0 animate-in slide-in-from-top-2 duration-150">
                <p className="text-xs font-bold text-amber-950 mb-2">
                  {editingZoneInline ? `Edit Zone Name` : 'Create New Floor Zone'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Indoor Dining, Rooftop, Patio"
                    value={zoneInlineName}
                    onChange={(e) => setZoneInlineName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineZone();
                      if (e.key === 'Escape') {
                        setZoneInlineAddOpen(false);
                        setEditingZoneInline(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleSaveInlineZone}
                    disabled={createZoneMutation.isPending || editZoneMutation.isPending || !zoneInlineName.trim()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    {createZoneMutation.isPending || editZoneMutation.isPending ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Save</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoneInlineAddOpen(false);
                      setEditingZoneInline(null);
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Zones List */}
            <div className="p-4 sm:p-5 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
              {zones.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Zones Created Yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Click "+ Add Zone" to organize your floor plan.</p>
                </div>
              ) : (
                zones.map((zone) => {
                  const zoneTables = tables.filter((t) => {
                    const tid = typeof t.zoneId === 'string' ? t.zoneId : (t.zoneId as any)?._id;
                    return tid === zone._id;
                  });
                  const occupiedTablesCount = zoneTables.filter(
                    (t) => t.status === 'OCCUPIED' || (t.activeOrderCount && t.activeOrderCount > 0)
                  ).length;
                  const isSelectedForDelete = selectedZonesForDelete.includes(zone._id);

                  return (
                    <div
                      key={zone._id}
                      className={`flex items-center justify-between border rounded-2xl px-4 py-3 transition-all ${
                        isZoneDeleteMode && isSelectedForDelete
                          ? 'bg-rose-50 border-rose-400 shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isZoneDeleteMode ? (
                          <input
                            type="checkbox"
                            checked={isSelectedForDelete}
                            onChange={() => {
                              if (isSelectedForDelete) {
                                setSelectedZonesForDelete(selectedZonesForDelete.filter((id) => id !== zone._id));
                              } else {
                                setSelectedZonesForDelete([...selectedZonesForDelete, zone._id]);
                              }
                            }}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                          />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{zone.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500">
                              {zoneTables.length} table{zoneTables.length === 1 ? '' : 's'}
                            </span>
                            {occupiedTablesCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                {occupiedTablesCount} occupied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side edit button */}
                      {!isZoneDeleteMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingZoneInline(zone);
                            setZoneInlineName(zone.name);
                            setZoneInlineAddOpen(false);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="Edit zone name"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer in Delete Mode */}
            {isZoneDeleteMode && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsZoneDeleteMode(false);
                    setSelectedZonesForDelete([]);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInitiateZoneDelete}
                  disabled={selectedZonesForDelete.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Delete Selected Zone{selectedZonesForDelete.length > 1 ? 's' : ''} ({selectedZonesForDelete.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Active Order Blocked Alert Modal ───────────────────────────────────── */}
      {activeOrderBlockedAlert && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[100000] animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                Cannot Delete Zone: Active Orders Detected
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                The following table(s) currently have active guest orders or open tickets on the floor. You cannot delete a zone while tables inside it are active.
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
              {activeOrderBlockedAlert.tables.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-900">{t.displayName}</span>
                    <span className="text-slate-400 font-mono ml-1.5">(Table #{t.tableNumber})</span>
                    <p className="text-[10px] text-amber-700 font-medium">{t.zoneName}</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                    {t.activeOrderCount} active order{t.activeOrderCount > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500">
              💡 <strong>Tip:</strong> Settle and clear the table bills or transfer these tables to another zone before deleting.
            </p>

            <button
              type="button"
              onClick={() => setActiveOrderBlockedAlert(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              Understood
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Zone Confirmation Modal ─────────────────────────────────────── */}
      {deleteZoneConfirmList && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[100000] animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
              <Trash2 className="w-6 h-6" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                Delete {deleteZoneConfirmList.length === 1 ? `"${deleteZoneConfirmList[0].name}" Zone?` : `${deleteZoneConfirmList.length} Zones?`}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Are you sure you want to delete {deleteZoneConfirmList.map((z) => `"${z.name}"`).join(', ')}?
                All associated tables in these zones will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteZoneConfirmList(null)}
                className="w-1/2 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const zonesToDelete = [...deleteZoneConfirmList];
                  setDeleteZoneConfirmList(null);
                  for (const z of zonesToDelete) {
                    await deleteZoneMutation.mutateAsync(z._id);
                  }
                  setSelectedZonesForDelete([]);
                  setIsZoneDeleteMode(false);
                }}
                disabled={deleteZoneMutation.isPending}
                className="w-1/2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                {deleteZoneMutation.isPending ? <Loader className="w-4 h-4 animate-spin text-white" /> : 'Yes, Delete Zone(s)'}
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
    </div>
  );
};

export default ManagerTables;
