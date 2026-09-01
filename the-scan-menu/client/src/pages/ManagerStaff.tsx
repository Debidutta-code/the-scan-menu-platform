import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { managerService, Staff } from '../services/restaurant.service';
import {
  Plus,
  Edit2,
  ShieldAlert,
  Trash2,
  ShieldCheck,
  X,
  Loader,
  Users,
  Eye,
  EyeOff,
  Search,
  KeyRound,
  Shield,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const staffSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  pin: z.string().optional(),
  role: z.enum(['MANAGER', 'STAFF']),
  isActive: z.boolean(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export interface ManagerStaffProps {
  restaurantId?: string;
}

export const ManagerStaff: React.FC<ManagerStaffProps> = ({ restaurantId }) => {
  const { user: currentUser, activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = restaurantId || activeRestaurantId;

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [revealPinForId, setRevealPinForId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MANAGERS' | 'STAFF' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['managerStaff', targetRestaurantId],
    queryFn: () => managerService.listStaff(targetRestaurantId!),
    enabled: !!targetRestaurantId,
  });

  const staffList: Staff[] = useMemo(() => staffData?.data || [], [staffData?.data]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'MANAGERS'
          ? staff.role === 'MANAGER'
          : statusFilter === 'STAFF'
          ? staff.role === 'STAFF'
          : statusFilter === 'ACTIVE'
          ? staff.isActive
          : !staff.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [staffList, searchQuery, statusFilter]);

  // KPI Metrics
  const totalCount = staffList.length;
  const activeCount = staffList.filter((s) => s.isActive).length;
  const suspendedCount = staffList.filter((s) => !s.isActive).length;
  const managerCount = staffList.filter((s) => s.role === 'MANAGER').length;
  const floorStaffCount = staffList.filter((s) => s.role === 'STAFF').length;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      pin: '',
      role: 'STAFF',
      isActive: true,
    },
  });

  const selectedRole = watch('role');

  const createMutation = useMutation({
    mutationFn: (data: StaffFormValues) => managerService.createStaff(targetRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Member created successfully', 'success');
      handleClosePanel();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create member', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormValues> }) =>
      managerService.updateStaff(targetRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Member updated successfully', 'success');
      handleClosePanel();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update member', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteStaff(targetRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminStaff', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Member removed successfully', 'success');
      if (editingStaff?._id === staffToDelete?._id) {
        handleClosePanel();
      }
      setStaffToDelete(null);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete member', 'error');
    },
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    reset({
      name: '',
      email: '',
      password: '',
      pin: '',
      role: 'STAFF',
      isActive: true,
    });
    setIsPanelOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    reset({
      name: staff.name,
      email: staff.email,
      password: '',
      pin: staff.pin || '',
      role: staff.role || 'STAFF',
      isActive: staff.isActive,
    });
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setEditingStaff(null);
    reset({
      name: '',
      email: '',
      password: '',
      pin: '',
      role: 'STAFF',
      isActive: true,
    });
  };

  const onSubmit = (values: StaffFormValues) => {
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
    }
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff._id, data: payload });
    } else {
      if (!values.password) {
        toast('Password is required for new accounts', 'error');
        return;
      }
      createMutation.mutate(payload);
    }
  };

  const handleSuspendToggle = (staff: Staff, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateMutation.mutate({
      id: staff._id,
      data: { isActive: !staff.isActive },
    });
  };

  const copyEmailToClipboard = (email: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    toast('Email copied to clipboard', 'info');
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-bold text-slate-500 font-mono">Loading staff and managers roster...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden font-sans select-none gap-2.5">
      {/* ── TOP HEADER BAR ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white rounded-2xl px-4 py-2.5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-extrabold shadow-2xs shrink-0">
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">Staff &amp; Permissions</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 font-mono">
                {totalCount} Total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Manage store manager and floor waitstaff credentials, terminal PINs, and access
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add New Member
        </Button>
      </div>

      {/* ── TOOLBAR: STATS PILLS + SEARCH + FILTER TABS ─────────────────────── */}
      <div className="shrink-0 bg-white rounded-2xl px-3.5 py-2 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
        {/* Left: Metric Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] shrink-0">
            <span className="text-slate-500 font-medium">All:</span>
            <span className="font-bold text-slate-900 font-mono">{totalCount}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] shrink-0">
            <Shield className="w-3 h-3 text-amber-600" />
            <span className="text-amber-800 font-medium">Managers:</span>
            <span className="font-bold text-amber-950 font-mono">{managerCount}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] shrink-0">
            <User className="w-3 h-3 text-slate-500" />
            <span className="text-slate-500 font-medium">Floor Staff:</span>
            <span className="font-bold text-slate-900 font-mono">{floorStaffCount}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-800 font-medium">Active:</span>
            <span className="font-bold text-emerald-950 font-mono">{activeCount}</span>
          </div>

          {suspendedCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50/80 border border-rose-200/80 text-[11px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span className="text-rose-800 font-medium">Suspended:</span>
              <span className="font-bold text-rose-950 font-mono">{suspendedCount}</span>
            </div>
          )}
        </div>

        {/* Right: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name or email..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7.5 pr-7 py-1 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 self-stretch sm:self-auto shrink-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'MANAGERS', label: 'Managers' },
              { id: 'STAFF', label: 'Staff' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'SUSPENDED', label: 'Suspended' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── WORKSPACE BODY: ADAPTIVE VIEW (TABLE WHEN CLOSED, MASTER-DETAIL LIST WHEN OPEN) ── */}
      <div className="flex-1 min-h-0 flex gap-2.5 overflow-hidden">
        
        {/* LEFT CONTAINER */}
        <div className="flex-1 min-w-0 h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* OPTION A: FULL 6-COLUMN TABLE WHEN SIDE PANEL IS CLOSED */}
          {!isPanelOpen ? (
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200/90 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Team Member</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold">Contact Email</th>
                    <th className="py-2.5 px-4 font-semibold text-center">POS PIN</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStaff.map((staff) => {
                    const initials = staff.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const isManager = staff.role === 'MANAGER';
                    const isMe = currentUser?.email === staff.email;

                    return (
                      <tr
                        key={staff._id}
                        className={`transition-colors duration-150 group ${
                          !staff.isActive
                            ? 'opacity-60 bg-slate-50/40 hover:bg-slate-100/50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Member */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 shadow-2xs ${
                                isManager
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{staff.name}</span>
                                {isMe && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono border border-amber-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {staff._id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                              isManager
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isManager ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-amber-600" />
                                <span>Store Manager</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span>Floor Staff</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-600">{staff.email}</span>
                            <button
                              onClick={(e) => copyEmailToClipboard(staff.email, staff._id, e)}
                              className="text-slate-300 hover:text-slate-600 transition p-1 rounded hover:bg-slate-100 cursor-pointer"
                              title="Copy email"
                            >
                              {copiedEmailId === staff._id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* POS PIN */}
                        <td className="py-3 px-4 text-center">
                          {staff.pin ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-xs">
                              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                              <span className="font-bold text-slate-900 tracking-wider">
                                {revealPinForId === staff._id ? staff.pin : '••••'}
                              </span>
                              <button
                                onClick={() => setRevealPinForId(revealPinForId === staff._id ? null : staff._id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 transition cursor-pointer"
                                title={revealPinForId === staff._id ? 'Hide PIN' : 'Reveal PIN'}
                              >
                                {revealPinForId === staff._id ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 font-mono italic">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              staff.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            ></span>
                            {staff.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEdit(staff)}
                              className="px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                              title="Edit member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={(e) => handleSuspendToggle(staff, e)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${
                                staff.isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                              title={staff.isActive ? 'Suspend account' : 'Activate account'}
                            >
                              {staff.isActive ? (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setStaffToDelete(staff)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition cursor-pointer active:scale-95"
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center space-y-1.5">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No team members found</p>
                        <p className="text-[11px] text-slate-400">Click "Add New Member" above to create an account.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* OPTION B: STREAMLINED MASTER LIST WHEN SIDE PANEL IS OPEN (ZERO HORIZONTAL SCROLL) */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono shrink-0 flex items-center justify-between">
                <span>Select Member to Edit</span>
                <span className="text-slate-400">{filteredStaff.length} Loaded</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                {filteredStaff.map((staff) => {
                  const initials = staff.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  const isManager = staff.role === 'MANAGER';
                  const isSelected = editingStaff?._id === staff._id;
                  const isMe = currentUser?.email === staff.email;

                  return (
                    <div
                      key={staff._id}
                      onClick={() => handleEdit(staff)}
                      className={`p-2.5 transition-all cursor-pointer flex items-center justify-between gap-2.5 border-l-4 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 shadow-2xs'
                          : 'border-transparent hover:bg-slate-50/90'
                      } ${!staff.isActive ? 'opacity-65' : ''}`}
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 shadow-2xs ${
                            isManager ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-white'
                          }`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">{staff.name}</span>
                            {isMe && (
                              <span className="text-[8.5px] font-bold px-1 rounded bg-amber-100 text-amber-900 font-mono">
                                You
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                isManager
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isManager ? 'Manager' : 'Staff'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-mono mt-0.5 truncate">
                            <span className="truncate">{staff.email}</span>
                            {staff.pin && (
                              <span className="text-slate-600 font-bold bg-slate-100 px-1 rounded">
                                PIN: {staff.pin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Active Dot & Arrow */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            staff.isActive ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                          title={staff.isActive ? 'Active' : 'Suspended'}
                        ></span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  );
                })}

                {filteredStaff.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">No members found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: MINIMAL, COMPACT ADD / EDIT PANEL */}
        {isPanelOpen && (
          <div className="w-full sm:w-[350px] md:w-[360px] shrink-0 h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden animate-in slide-in-from-right-3 duration-150">
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Edit2 className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {editingStaff ? `Edit: ${editingStaff.name}` : 'New Team Member'}
                  </h2>
                  <p className="text-[10px] text-slate-400 truncate">
                    {editingStaff ? 'Update role & credentials' : 'Set credentials & terminal PIN'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {editingStaff && (
                  <button
                    onClick={handleOpenAdd}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
                    title="Switch to New Member form"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleClosePanel}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
                  title="Close side panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Minimal Form (No Scrolling Needed) */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between p-3.5 gap-2.5">
              <div className="space-y-2.5">
                {/* Minimal Segmented Role Bar */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">
                    Role Permission
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setValue('role', 'MANAGER')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedRole === 'MANAGER'
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Manager</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('role', 'STAFF')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedRole === 'STAFF'
                          ? 'bg-slate-950 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Floor Staff</span>
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Full Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    placeholder="Rahul Sharma"
                  />
                  {errors.name && <p className="text-rose-500 text-[10px] mt-0.5">{errors.name.message}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Email Address</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white font-mono transition"
                    placeholder="staff@democafe.com"
                  />
                  {errors.email && <p className="text-rose-500 text-[10px] mt-0.5">{errors.email.message}</p>}
                </div>

                {/* Password + POS PIN (2 Columns Side-by-Side) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5 truncate">
                      Password {editingStaff && <span className="text-slate-400 font-normal">(Keep)</span>}
                    </label>
                    <input
                      type="password"
                      {...register('password')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition"
                      placeholder={editingStaff ? '••••••••' : 'Password'}
                    />
                    {errors.password && <p className="text-rose-500 text-[10px] mt-0.5">{errors.password.message}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                      POS PIN <span className="text-slate-400 font-normal">(4-6)</span>
                    </label>
                    <input
                      type="text"
                      {...register('pin')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white tracking-widest transition"
                      placeholder="1111"
                      maxLength={6}
                    />
                    {errors.pin && <p className="text-rose-500 text-[10px] mt-0.5">{errors.pin.message}</p>}
                  </div>
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="w-3.5 h-3.5 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    Account is Active
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={handleClosePanel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={createMutation.isPending || updateMutation.isPending}
                  leftIcon={editingStaff ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                >
                  {editingStaff ? 'Update Account' : 'Save Member'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ───────────────────────── */}
      {staffToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 p-5 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">Delete Account?</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{staffToDelete.name}</span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    {staffToDelete.role}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">{staffToDelete.email}</div>
                <p className="text-[10px] text-rose-600 font-medium pt-0.5">
                  Terminal PIN and login credentials will be revoked immediately.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setStaffToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  fullWidth
                  isLoading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(staffToDelete._id)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ManagerStaff;
