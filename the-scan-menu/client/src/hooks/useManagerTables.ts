import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerService, Table, TableZone } from '../services/restaurant.service';
import { useToast } from './useToast';

export interface TableFormValues {
  tableNumber?: string;
  displayName?: string;
  zoneId?: string;
}

export interface BulkTableFormValues {
  count: number;
  prefix?: string;
  zoneId?: string;
}

export interface ZoneFormValues {
  name: string;
}

export function useManagerTables(activeRestaurantId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Fetch tables list with auto refetching (poll every 15s to keep occupied/session status fresh)
  const { data: tablesData, isLoading: isLoadingTables, refetch: refetchTables } = useQuery({
    queryKey: ['managerTables', activeRestaurantId],
    queryFn: () => managerService.listTables(activeRestaurantId!),
    enabled: !!activeRestaurantId,
    refetchInterval: 15000,
  });

  const tables: Table[] = tablesData?.data || [];

  // 2. Fetch zones list
  const { data: zonesData, isLoading: isLoadingZones } = useQuery({
    queryKey: ['managerZones', activeRestaurantId],
    queryFn: () => managerService.listZones(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });

  const zones: TableZone[] = zonesData?.data || [];

  // Helper to invalidate tables cache
  const invalidateTables = () => {
    queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
  };

  const invalidateZones = () => {
    queryClient.invalidateQueries({ queryKey: ['managerZones', activeRestaurantId] });
    queryClient.invalidateQueries({ queryKey: ['managerTables', activeRestaurantId] });
  };

  // 3. Table Mutations
  const createTableMutation = useMutation({
    mutationFn: (data: TableFormValues) => managerService.createTable(activeRestaurantId!, data),
    onSuccess: () => {
      invalidateTables();
      toast('Table successfully created!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating table', 'error');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: BulkTableFormValues) => managerService.bulkCreateTables(activeRestaurantId!, data),
    onSuccess: (res) => {
      invalidateTables();
      toast(`${res.data.count} tables generated successfully!`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating tables', 'error');
    },
  });

  const editTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Table> }) =>
      managerService.editTable(activeRestaurantId!, id, data),
    onSuccess: () => {
      invalidateTables();
      toast('Table details saved!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating table', 'error');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteTable(activeRestaurantId!, id),
    onSuccess: (res) => {
      invalidateTables();
      if (res.data?.archived) {
        toast('Table has order history; soft-archived and deactivated.', 'info');
      } else {
        toast('Table deleted successfully.', 'success');
      }
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting table', 'error');
    },
  });

  const regenerateQrMutation = useMutation({
    mutationFn: (id: string) => managerService.regenerateTableQr(activeRestaurantId!, id),
    onSuccess: () => {
      invalidateTables();
      toast('QR code token rotated successfully.', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error rotating QR token', 'error');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' }) =>
      managerService.updateTableStatus(activeRestaurantId!, id, status),
    onSuccess: (_, variables) => {
      invalidateTables();
      toast(`Table marked as ${variables.status.toLowerCase()}`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating status', 'error');
    },
  });

  const clearTablesMutation = useMutation({
    mutationFn: (tableIds: string[]) => managerService.clearTables(activeRestaurantId!, tableIds),
    onSuccess: (res) => {
      invalidateTables();
      toast(`${res.data?.clearedCount || 'Table(s)'} cleared successfully!`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error clearing tables', 'error');
    },
  });

  const reserveTablesMutation = useMutation({
    mutationFn: ({ tableIds, reserved }: { tableIds: string[]; reserved: boolean }) =>
      managerService.reserveTables(activeRestaurantId!, tableIds, reserved),
    onSuccess: (_, variables) => {
      invalidateTables();
      const actionText = variables.reserved ? 'reserved' : 'unreserved';
      toast(`Selected table(s) ${actionText} successfully!`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating table reservation', 'error');
    },
  });

  // 4. Zone Mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: ZoneFormValues) => managerService.createZone(activeRestaurantId!, data),
    onSuccess: () => {
      invalidateZones();
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
      invalidateZones();
      toast('Zone updated successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating zone', 'error');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => managerService.deleteZone(activeRestaurantId!, zoneId),
    onSuccess: () => {
      invalidateZones();
      toast('Zone and associated tables deleted', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting zone', 'error');
    },
  });

  return {
    tables,
    zones,
    isLoading: isLoadingTables || isLoadingZones,
    refetchTables,
    createTableMutation,
    bulkCreateMutation,
    editTableMutation,
    deleteTableMutation,
    regenerateQrMutation,
    updateStatusMutation,
    clearTablesMutation,
    reserveTablesMutation,
    createZoneMutation,
    editZoneMutation,
    deleteZoneMutation,
  };
}
