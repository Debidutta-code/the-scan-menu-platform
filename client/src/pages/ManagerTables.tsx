import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { managerService, Table, TableZone } from '../services/restaurant.service';
import { Plus, Edit2, Trash2, QrCode, Download, X, Loader, HelpCircle, Printer } from 'lucide-react';

const tableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required'),
  displayName: z.string().min(1, 'Display name is required'),
  zoneId: z.string().optional(),
});

type TableFormValues = z.infer<typeof tableSchema>;

const zoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required'),
});
type ZoneFormValues = z.infer<typeof zoneSchema>;

export const ManagerTables: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [showQrModal, setShowQrModal] = useState<Table | null>(null);
  const [confirmRegenTable, setConfirmRegenTable] = useState<Table | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<TableZone | null>(null);
  const [activeZoneFilter, setActiveZoneFilter] = useState<string | null>(null);

  // Active restaurant ID for this manager (from useAuth list)
  const activeRestaurantId = user?.restaurants?.[0];

  // Fetch tables list
  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['managerTables', activeRestaurantId],
    queryFn: () => managerService.listTables(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });

  const tables: Table[] = tablesData?.data || [];

  // Fetch zones list
  const { data: zonesData } = useQuery({
    queryKey: ['managerZones', activeRestaurantId],
    queryFn: () => managerService.listZones(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });
  const zones: TableZone[] = zonesData?.data || [];

  // Fetch QR info when QR modal is opened
  const { data: qrData, isLoading: isLoadingQr } = useQuery({
    queryKey: ['tableQr', activeRestaurantId, showQrModal?._id],
    queryFn: () => managerService.getTableQr(activeRestaurantId!, showQrModal!._id),
    enabled: !!activeRestaurantId && !!showQrModal?._id,
  });

  // Create table
  const createMutation = useMutation({
    mutationFn: (data: TableFormValues) => managerService.createTable(activeRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
      setIsCreateOpen(false);
      tableForm.reset();
      toast('Table successfully created!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error creating table');
    },
  });

  // Edit table
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      managerService.editTable(activeRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
      setIsCreateOpen(false);
      setEditingTable(null);
      tableForm.reset();
      toast('Table details successfully saved!', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error editing table');
    },
  });

  // Delete table
  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteTable(activeRestaurantId!, id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
      if (res.data?.archived) {
        toast('Table has active order history; successfully soft-archived and deactivated.', 'info');
      } else {
        toast('Table successfully deleted.', 'success');
      }
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting table', 'error');
    },
  });

  // Regenerate table QR
  const regenerateMutation = useMutation({
    mutationFn: (id: string) => managerService.regenerateTableQr(activeRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
      setConfirmRegenTable(null);
      toast('QR code rotated and successfully updated.', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error rotating QR token', 'error');
    },
  });

  const tableForm = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
  });

  const onSubmit = (values: TableFormValues) => {
    setErrorMsg(null);
    if (editingTable) {
      editMutation.mutate({ id: editingTable._id, data: values });
    } else {
      createMutation.mutate(values);
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

  // Zone mutations
  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
  });

  const createZoneMutation = useMutation({
    mutationFn: (data: ZoneFormValues) => managerService.createZone(activeRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerZones', activeRestaurantId] });
      setIsZoneFormOpen(false);
      zoneForm.reset();
      toast('Zone created successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating zone', 'error');
    },
  });

  const editZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TableZone> }) =>
      managerService.updateZone(activeRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerZones', activeRestaurantId] });
      setIsZoneFormOpen(false);
      setEditingZone(null);
      zoneForm.reset();
      toast('Zone updated successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating zone', 'error');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => managerService.deleteZone(activeRestaurantId!, zoneId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['managerZones', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
      if (activeZoneFilter === variables) setActiveZoneFilter(null);
      toast('Zone and associated tables deleted successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting zone', 'error');
    },
  });

  const onZoneSubmit = (values: ZoneFormValues) => {
    if (editingZone) {
      editZoneMutation.mutate({ id: editingZone._id, data: values });
    } else {
      createZoneMutation.mutate(values);
    }
  };

  const handleAddTableToZone = (zoneId: string) => {
    setEditingTable(null);
    tableForm.reset({ tableNumber: '', displayName: '', zoneId });
    setIsCreateOpen(true);
  };

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

  // Browser-native printing stylesheet layout
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
              body {
                padding: 0;
                min-height: auto;
              }
              .container {
                border: none;
              }
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
        <Loader className="w-12 h-12 text-amber-500 mb-4 animate-pulse" strokeWidth={1.75} />
        <h2 className="font-display text-2xl font-bold text-slate-800">No Restaurant Assigned</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1">
          You are currently not associated as a manager with any restaurant. Please contact a Super Admin to get assigned.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">
            Restaurant Tables & Zones
          </h1>
          <p className="text-slate-500 text-sm">Create table zones and manage secure physical QR placements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingZone(null);
              zoneForm.reset({ name: '' });
              setIsZoneFormOpen(true);
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
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
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Zones Filter */}
      {zones.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveZoneFilter(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeZoneFilter === null
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Tables
          </button>
          {zones.map((zone) => (
            <div key={zone._id} className="flex items-center">
              <button
                onClick={() => setActiveZoneFilter(zone._id)}
                className={`px-4 py-2 rounded-l-xl text-sm font-semibold border transition-colors ${
                  activeZoneFilter === zone._id
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 border-r-0'
                }`}
              >
                {zone.name}
              </button>
              {activeZoneFilter === zone._id && (
                 <div className="flex items-center border border-amber-500 bg-amber-50 rounded-r-xl overflow-hidden h-full">
                    <button
                      onClick={() => {
                         setEditingZone(zone);
                         zoneForm.reset({ name: zone.name });
                         setIsZoneFormOpen(true);
                      }}
                      className="p-2 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Edit Zone"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAddTableToZone(zone._id)}
                      className="p-2 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Add Table to Zone"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the zone "${zone.name}"? ALL TABLES IN THIS ZONE WILL BE DELETED.`)) {
                          deleteZoneMutation.mutate(zone._id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete Zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Movie Hall Seats style list of Tables */}
      {tables.filter(t => !activeZoneFilter || (typeof t.zoneId === 'string' ? t.zoneId === activeZoneFilter : t.zoneId?._id === activeZoneFilter)).length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 border border-slate-150 rounded-2xl">
          <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-3 animate-pulse" strokeWidth={1.75} />
          <h3 className="font-bold text-slate-700">No Tables Configured</h3>
          <p className="text-xs text-slate-400 mt-1">Click "Add Table" to set up your first table QR.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(activeZoneFilter
              ? [zones.find(z => z._id === activeZoneFilter), { _id: null, name: 'Unassigned' }]
              : [...zones, { _id: null, name: 'Unassigned' }])
            .filter(zone => zone) // Handle undefined from find
            .map(zone => {
              const zoneTables = tables.filter(t => {
                const tableZoneId = typeof t.zoneId === 'string' ? t.zoneId : t.zoneId?._id;
                return zone!._id === null
                  ? (!tableZoneId || !zones.some(z => z._id === tableZoneId))
                  : tableZoneId === zone!._id;
              });

              if (zoneTables.length === 0) return null;

              return (
                <div key={zone!._id || 'unassigned'} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                    {zone!.name}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {zoneTables.map(table => (
                      <div
                        key={table._id}
                        className={`relative group bg-white border-2 rounded-xl p-3 flex flex-col items-center text-center hover:shadow-md transition cursor-default
                          ${table.isActive ? 'border-amber-400/50 hover:border-amber-500' : 'border-slate-200 opacity-60'}
                        `}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                           <span className="font-bold text-slate-700 text-sm">{table.tableNumber}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate w-full" title={table.displayName}>
                          {table.displayName}
                        </span>

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2 p-2 border-2 border-primary">
                          <button
                            onClick={() => setShowQrModal(table)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition"
                          >
                            <QrCode className="w-3 h-3" /> View QR
                          </button>
                          <div className="flex w-full gap-1">
                            <button
                               onClick={() => handleEditClick(table)}
                               className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1.5 rounded-lg transition"
                            >
                               Edit
                            </button>
                            <button
                               onClick={() => {
                                 if (confirm('Are you sure you want to delete this table? Tables with order history will be soft-archived.')) {
                                   deleteMutation.mutate(table._id);
                                 }
                               }}
                               className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition"
                               title="Delete"
                            >
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Create / Edit Table Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">
                {editingTable ? 'Edit Table' : 'New Table'}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={tableForm.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  placeholder="12"
                  {...tableForm.register('tableNumber')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {tableForm.formState.errors.tableNumber && (
                  <p className="text-xs text-red-500 mt-1">
                    {tableForm.formState.errors.tableNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Table 12 (Main Room)"
                  {...tableForm.register('displayName')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {tableForm.formState.errors.displayName && (
                  <p className="text-xs text-red-500 mt-1">
                    {tableForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Zone (Optional)
                </label>
                <select
                  {...tableForm.register('zoneId')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="">No Zone</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  className="w-1/2 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition"
                >
                  {editingTable ? 'Save' : 'Create'}
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
              <button
                onClick={() => setShowQrModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {isLoadingQr ? (
              <div className="h-48 flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-amber-500" strokeWidth={1.75} />
              </div>
            ) : qrData?.data?.svg ? (
              <div className="space-y-4 flex flex-col items-center w-full">
                {/* SVG QR Code rendering */}
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
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
                  >
                    <Printer className="w-4 h-4" strokeWidth={1.75} />
                    <span>Print QR</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500">Failed to load QR details.</p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation of rotation Modal */}
      {confirmRegenTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <HelpCircle className="w-6 h-6 shrink-0" strokeWidth={1.75} />
              <h3 className="font-bold text-lg">Regenerate QR Code?</h3>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              This will rotate and invalidate the current printed physical QR code. Customers scanning old codes will be blocked immediately. Continue?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmRegenTable(null)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={() => regenerateMutation.mutate(confirmRegenTable._id)}
                className="w-1/2 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition"
              >
                Yes, Rotate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Zone Modal */}
      {isZoneFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">
                {editingZone ? 'Edit Zone' : 'New Zone'}
              </h2>
              <button
                onClick={() => setIsZoneFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={zoneForm.handleSubmit(onZoneSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Outdoor Patio"
                  {...zoneForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {zoneForm.formState.errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {zoneForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsZoneFormOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createZoneMutation.isPending || editZoneMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-70 flex items-center justify-center"
                >
                  {createZoneMutation.isPending || editZoneMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Zone'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagerTables;
