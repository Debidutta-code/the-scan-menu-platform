import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
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
  Mail,
  User,
  Lock,
  Shield,
} from 'lucide-react';

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
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
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = restaurantId || activeRestaurantId;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [revealPinForId, setRevealPinForId] = useState<string | null>(null);
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
      handleCloseForm();
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
      handleCloseForm();
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
      toast('Member deleted / deactivated successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete member', 'error');
    },
  });

  const handleOpenCreate = () => {
    setEditingStaff(null);
    reset({
      name: '',
      email: '',
      password: '',
      pin: '',
      role: 'STAFF',
      isActive: true,
    });
    setIsFormOpen(true);
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
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStaff(null);
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

  const handleSuspendToggle = (staff: Staff) => {
    updateMutation.mutate({
      id: staff._id,
      data: { isActive: !staff.isActive },
    });
  };

  const handleDelete = (staff: Staff) => {
    if (window.confirm(`Are you sure you want to remove ${staff.name} (${staff.role === 'MANAGER' ? 'Manager' : 'Staff'})?`)) {
      deleteMutation.mutate(staff._id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Loader className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-bold text-slate-500 font-mono">Loading staff and managers roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER & KPI CARDS ────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 leading-tight">
              Staff & Manager Accounts
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage store managers, floor waitstaff credentials, POS terminal PINs, and permissions
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account (Manager / Staff)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Team</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{totalCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Store Managers</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{managerCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Members</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-150 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suspended</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{suspendedCount}</span>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-150">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-stretch sm:self-auto">
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-950 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MEMBERS GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const initials = staff.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          const isManager = staff.role === 'MANAGER';

          return (
            <div
              key={staff._id}
              className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 shadow-xs ${
                !staff.isActive
                  ? 'border-slate-200 opacity-75 bg-slate-50/50'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Header & Role */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono text-sm font-black shadow-xs ${
                        isManager ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-white'
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 leading-snug">
                        {staff.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mt-0.5 border ${
                          isManager
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isManager ? (
                          <>
                            <Shield className="w-3 h-3 text-amber-600" />
                            <span>Store Manager</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-slate-500" />
                            <span>Floor Staff</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {staff.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Email & PIN Meta */}
                <div className="space-y-2 pt-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{staff.email}</span>
                  </div>

                  {staff.pin ? (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-slate-500 font-semibold">POS PIN:</span>
                        <span className="font-bold text-slate-900">
                          {revealPinForId === staff._id ? staff.pin : '••••'}
                        </span>
                      </div>
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
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(staff)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  Edit
                </button>

                <button
                  onClick={() => handleSuspendToggle(staff)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-98 ${
                    staff.isActive
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {staff.isActive ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Suspend
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Activate
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(staff)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition cursor-pointer active:scale-95"
                  title="Remove account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No members found</p>
            <p className="text-[11px] text-slate-400">Try adjusting your filter or add a new manager/staff account.</p>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL (WITH PORTAL) ─────────────────────────────── */}
      <AnimatePresence>
        {isFormOpen &&
          createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold font-display tracking-tight">
                      {editingStaff ? 'Edit Account' : 'Add New Team Member'}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Configure manager or staff credentials, role, and terminal PIN
                    </p>
                  </div>
                  <button
                    onClick={handleCloseForm}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Account Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setValue('role', 'MANAGER')}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          selectedRole === 'MANAGER'
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-900">Store Manager</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">
                          Full store control, menu, tables, staff, reports
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue('role', 'STAFF')}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          selectedRole === 'STAFF'
                            ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <User className={`w-4 h-4 ${selectedRole === 'STAFF' ? 'text-white' : 'text-slate-600'}`} />
                          <span className={`text-xs font-bold ${selectedRole === 'STAFF' ? 'text-white' : 'text-slate-900'}`}>
                            Floor Staff
                          </span>
                        </div>
                        <span className={`text-[10px] mt-1 ${selectedRole === 'STAFF' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Orders, KDS, POS PIN login, table service
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Full Name</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        {...register('name')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                    {errors.name && <p className="text-rose-500 text-[11px] mt-0.5">{errors.name.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        {...register('email')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                        placeholder="e.g. manager@restaurant.com"
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-[11px] mt-0.5">{errors.email.message}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Password {editingStaff && <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>}
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        {...register('password')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-500"
                        placeholder={editingStaff ? '••••••••' : 'Enter secure password'}
                      />
                    </div>
                    {errors.password && <p className="text-rose-500 text-[11px] mt-0.5">{errors.password.message}</p>}
                  </div>

                  {/* POS PIN */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      POS PIN <span className="text-slate-400 font-normal">(4-6 digit numeric code for POS terminal)</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        {...register('pin')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        placeholder="e.g. 1234"
                        maxLength={6}
                      />
                    </div>
                    {errors.pin && <p className="text-rose-500 text-[11px] mt-0.5">{errors.pin.message}</p>}
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="isActive"
                      {...register('isActive')}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Account is Active
                    </label>
                  </div>

                  {/* Submit Buttons */}
                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>{editingStaff ? 'Update Account' : 'Create Account'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>,
            document.body
          )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerStaff;
