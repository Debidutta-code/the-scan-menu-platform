import React, { useState, useMemo } from 'react';
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
  UserCheck,
  UserX,
  Shield,
} from 'lucide-react';

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().optional(),
  pin: z.string().optional(),
  isActive: z.boolean(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export const ManagerStaff: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [revealPinForId, setRevealPinForId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['managerStaff', activeRestaurantId],
    queryFn: () => managerService.listStaff(activeRestaurantId!),
    enabled: !!activeRestaurantId,
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

  const createMutation = useMutation({
    mutationFn: (data: StaffFormValues) => managerService.createStaff(activeRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', activeRestaurantId] });
      toast('Staff member created successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create staff', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormValues> }) =>
      managerService.updateStaff(activeRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', activeRestaurantId] });
      toast('Staff member updated successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update staff', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteStaff(activeRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerStaff', activeRestaurantId] });
      toast('Staff member deleted successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete staff', 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      pin: '',
      isActive: true,
    },
  });

  const onSubmit = (data: StaffFormValues) => {
    if (editingStaff) {
      const payload: Partial<StaffFormValues> = {
        name: data.name,
        email: data.email,
        isActive: data.isActive,
      };
      if (data.password) payload.password = data.password;
      if (data.pin !== undefined) payload.pin = data.pin;

      updateMutation.mutate({ id: editingStaff._id, data: payload });
    } else {
      if (!data.password) {
        toast('Password is required for new staff', 'error');
        return;
      }
      createMutation.mutate(data);
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setValue('name', staff.name);
    setValue('email', staff.email);
    setValue('pin', staff.pin || '');
    setValue('password', '');
    setValue('isActive', staff.isActive);
    setIsFormOpen(true);
  };

  const handleDelete = (staff: Staff) => {
    if (window.confirm(`Are you sure you want to delete ${staff.name}? This cannot be undone.`)) {
      deleteMutation.mutate(staff._id);
    }
  };

  const handleSuspendToggle = (staff: Staff) => {
    const confirmMessage = staff.isActive
      ? `Are you sure you want to suspend ${staff.name}? They will lose access immediately.`
      : `Are you sure you want to reactivate ${staff.name}?`;

    if (window.confirm(confirmMessage)) {
      updateMutation.mutate({ id: staff._id, data: { isActive: !staff.isActive } });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStaff(null);
    reset({
      name: '',
      email: '',
      password: '',
      pin: '',
      isActive: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader className="w-9 h-9 animate-spin text-amber-500" strokeWidth={2} />
        <span className="text-xs font-semibold text-slate-500">Loading Staff Roster...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
            <Users className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">Staff Roster</h1>
            <p className="text-xs text-slate-500 font-medium">Manage team credentials, POS PINs, and access control</p>
          </div>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-slate-950 hover:bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" strokeWidth={2.5} />
          Add Staff Member
        </button>
      </div>

      {/* ── KPI METRICS STRIP ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              Total Team
            </span>
            <span className="font-mono text-2xl font-black text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              Active Members
            </span>
            <span className="font-mono text-2xl font-black text-emerald-600 mt-0.5 block">{activeCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              Managers
            </span>
            <span className="font-mono text-2xl font-black text-amber-600 mt-0.5 block">{managerCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">
              Suspended
            </span>
            <span className="font-mono text-2xl font-black text-rose-600 mt-0.5 block">{suspendedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <UserX className="w-4.5 h-4.5" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* ── CONTROLS: SEARCH & FILTER ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Status filter buttons */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                statusFilter === filter
                  ? 'bg-slate-950 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {/* ── STAFF GRID ───────────────────────────────────────────────────────── */}
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
              className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 ${
                !staff.isActive
                  ? 'border-slate-200 opacity-75 bg-slate-50/50'
                  : 'border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="space-y-3">
                {/* Avatar + Status Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono text-sm font-black shadow-2xs ${
                      isManager ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-white'
                    }`}>
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 leading-snug">
                        {staff.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md mt-0.5 border ${
                        isManager
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isManager ? 'Manager' : 'Waitstaff / Staff'}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {staff.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Email & PIN Meta */}
                <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                    <span className="font-mono text-[11px] truncate">{staff.email}</span>
                  </div>

                  {staff.pin && (
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-xl font-mono text-[11px]">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                        <span className="text-slate-500 font-semibold">POS PIN:</span>
                        <span className="font-bold text-slate-900">
                          {revealPinForId === staff._id ? staff.pin : '••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => setRevealPinForId(revealPinForId === staff._id ? null : staff._id)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 transition"
                        title={revealPinForId === staff._id ? 'Hide PIN' : 'Reveal PIN'}
                      >
                        {revealPinForId === staff._id ? (
                          <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />
                        ) : (
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(staff)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                  Edit
                </button>

                {!isManager && (
                  <>
                    <button
                      onClick={() => handleSuspendToggle(staff)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-98 ${
                        staff.isActive
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                      }`}
                    >
                      {staff.isActive ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Suspend
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Activate
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(staff)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition active:scale-95"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" strokeWidth={1.5} />
            <p className="text-xs font-bold text-slate-700">No staff members found</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search or add a new staff member.</p>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-display tracking-tight">
                    {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">Configure credentials and access permissions</p>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={2} />
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  {errors.name && <p className="text-rose-500 text-[11px] mt-0.5">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={2} />
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      placeholder="e.g. staff@restaurant.com"
                    />
                  </div>
                  {errors.email && <p className="text-rose-500 text-[11px] mt-0.5">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password {editingStaff && <span className="text-slate-400 font-normal">(Blank = current)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={2} />
                    <input
                      type="password"
                      {...register('password')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      placeholder="Enter secure password"
                    />
                  </div>
                  {errors.password && <p className="text-rose-500 text-[11px] mt-0.5">{errors.password.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    POS PIN <span className="text-slate-400 font-normal">(For quick terminal unlock)</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" strokeWidth={2} />
                    <input
                      type="text"
                      {...register('pin')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/80"
                      placeholder="e.g. 1234"
                      maxLength={6}
                    />
                  </div>
                  {errors.pin && <p className="text-rose-500 text-[11px] mt-0.5">{errors.pin.message}</p>}
                </div>

                {editingStaff && editingStaff.role !== 'MANAGER' && (
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="isActive"
                      {...register('isActive')}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Account is Active
                    </label>
                  </div>
                )}

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                    className="flex-1 py-3 px-4 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-md"
                  >
                    {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                      <Loader className="w-4 h-4 animate-spin text-amber-400" />
                    )}
                    {editingStaff ? 'Save Changes' : 'Create Staff'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerStaff;
