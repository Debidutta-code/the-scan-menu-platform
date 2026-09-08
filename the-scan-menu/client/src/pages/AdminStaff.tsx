import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  adminService,
  SuperAdminStaffMember,
  Restaurant,
} from '../services/restaurant.service';
import {
  Users,
  UserCheck,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Lock,
  Store,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  AlertTriangle,
  UserX,
  SlidersHorizontal,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

const staffFormSchema = z.object({
  restaurantId: z.string().min(1, 'Please select a restaurant outlet'),
  name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['MANAGER', 'STAFF']),
  password: z.string().optional(),
  pin: z.string().optional(),
  isActive: z.boolean(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export const AdminStaff: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { impersonateOutlet } = useAuth();
  const queryClient = useQueryClient();

  // View & UI states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGER' | 'STAFF'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SuperAdminStaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<SuperAdminStaffMember | null>(null);
  const [staffToResetSecret, setStaffToResetSecret] = useState<SuperAdminStaffMember | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // PIN security states
  const [revealedPinId, setRevealedPinId] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  // 1. Fetch all platform restaurants for dropdowns
  const { data: restResponse } = useQuery({
    queryKey: ['adminRestaurantsList'],
    queryFn: () => adminService.listRestaurants(1, 200),
  });
  const restaurantList: Restaurant[] = useMemo(() => restResponse?.data?.restaurants || [], [restResponse]);

  // 2. Fetch all staff members & platform KPI metrics
  const { data: staffData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminPlatformStaff', selectedOutletFilter, roleFilter, statusFilter, searchQuery],
    queryFn: () =>
      adminService.listStaff({
        restaurantId: selectedOutletFilter,
        role: roleFilter,
        status: statusFilter,
        search: searchQuery,
      }),
  });

  const staffMembers: SuperAdminStaffMember[] = useMemo(() => staffData?.data?.staff || [], [staffData]);
  const stats = staffData?.data?.stats || {
    totalStaff: 0,
    totalManagers: 0,
    totalFloorStaff: 0,
    activeCount: 0,
    suspendedCount: 0,
    totalTenantsCovered: 0,
  };

  // Form handling
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      restaurantId: '',
      name: '',
      email: '',
      role: 'STAFF',
      password: '',
      pin: '',
      isActive: true,
    },
  });

  const formRole = watch('role');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: StaffFormValues) => adminService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlatformStaff'] });
      toast('Team member created successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create team member', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormValues> }) =>
      adminService.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlatformStaff'] });
      toast('Team member updated successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update team member', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, restaurantId }: { id: string; restaurantId?: string }) =>
      adminService.deleteStaff(id, restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlatformStaff'] });
      toast('Team member deactivated successfully', 'success');
      setStaffToDelete(null);
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to deactivate team member', 'error');
    },
  });

  const generatePinMutation = useMutation({
    mutationFn: (staffId: string) => adminService.generatePin(staffId),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['adminPlatformStaff'] });
      toast(`New POS PIN generated: ${res.data?.pin}`, 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to generate PIN', 'error');
    },
  });

  // Modal Handlers
  const handleOpenCreate = () => {
    setEditingStaff(null);
    reset({
      restaurantId: selectedOutletFilter !== 'ALL' ? selectedOutletFilter : restaurantList[0]?._id || '',
      name: '',
      email: '',
      role: 'STAFF',
      password: '',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (staff: SuperAdminStaffMember) => {
    setEditingStaff(staff);
    reset({
      restaurantId: staff.restaurantId || staff.restaurant?._id || '',
      name: staff.name,
      email: staff.email,
      role: (staff.role === 'MANAGER' ? 'MANAGER' : 'STAFF'),
      password: '',
      pin: staff.pin || '',
      isActive: staff.isActive,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStaff(null);
    reset();
  };

  const onSubmitForm = (values: StaffFormValues) => {
    if (editingStaff) {
      updateMutation.mutate({
        id: editingStaff._id,
        data: {
          name: values.name,
          email: values.email,
          role: values.role,
          isActive: values.isActive,
          restaurantId: values.restaurantId,
          ...(values.pin ? { pin: values.pin } : {}),
          ...(values.password ? { password: values.password } : {}),
        },
      });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setValue('pin', randomPin);
    toast(`Random 4-Digit PIN set to ${randomPin}`, 'info');
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setValue('password', pass);
    toast('Random temporary password generated', 'info');
  };

  const handleCopyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    toast(`${label} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleImpersonateManager = async (staff: SuperAdminStaffMember) => {
    const r = staff.restaurant;
    if (r && r._id) {
      try {
        impersonateOutlet({
          id: r._id,
          name: r.name,
          slug: r.slug || '',
        });
        navigate('/manager/staff');
      } catch (err: any) {
        toast('Could not switch into manager view for this outlet', 'error');
      }
    } else {
      toast('No active restaurant assigned for this team member', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5 select-none font-sans">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-slate-150 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
            <Users className="w-6 h-6" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">
                Staff & Managers Directory
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-400">
                SuperAdmin Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Oversee and manage credentials, POS PIN codes, passwords, and roles across all restaurant outlets inline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Personnel Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dense Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-sm py-2 px-4 rounded-xl"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>+ Add Team Member</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-slate-900">{stats.totalStaff}</span>
            <span className="text-[10px] text-slate-400 font-medium">registered</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 font-mono">Managers</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-amber-600">{stats.totalManagers}</span>
            <span className="text-[10px] text-amber-700/70 font-medium">authorized</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 font-mono">Floor Staff</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-indigo-600">{stats.totalFloorStaff}</span>
            <span className="text-[10px] text-indigo-700/70 font-medium">active crew</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-mono">Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-emerald-600">{stats.activeCount}</span>
            <span className="text-[10px] text-emerald-700/70 font-medium">operational</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 font-mono">Suspended</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-red-600">{stats.suspendedCount}</span>
            <span className="text-[10px] text-red-600/70 font-medium">disabled</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">Outlets</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-display font-black text-slate-900">{stats.totalTenantsCovered}</span>
            <span className="text-[10px] text-slate-400 font-medium">tenants</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or restaurant name..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Restaurant Outlet Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedOutletFilter}
              onChange={(e) => setSelectedOutletFilter(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-semibold text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Restaurant Outlets ({restaurantList.length})</option>
              {restaurantList.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} {r.slug ? `(${r.slug})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-transparent border-none text-slate-700 font-semibold text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="MANAGER">Managers Only</option>
              <option value="STAFF">Floor Staff Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-none text-slate-700 font-semibold text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-mono">Fetching platform personnel...</p>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-6 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-display font-bold text-slate-900 text-base">No team members match your filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Try adjusting your search query, outlet selector, or role criteria, or add a new team member.
            </p>
            <Button
              onClick={handleOpenCreate}
              className="mt-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Team Member</span>
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {staffMembers.map((staff) => {
              const isManager = staff.role === 'MANAGER';
              const isRevealed = revealedPinId === staff._id;
              const hasPin = Boolean(staff.pin);

              return (
                <div
                  key={`${staff._id}_${staff.restaurantId || 'any'}`}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                    staff.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-red-100 bg-red-50/10 opacity-80'
                  }`}
                >
                  {/* Card Header: Avatar & Outlet */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm font-mono shrink-0 shadow-2xs ${
                            isManager
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-white font-black'
                          }`}
                        >
                          {staff.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate leading-snug">{staff.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                isManager
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {isManager ? <ShieldCheck className="w-3 h-3 text-amber-600" /> : <UserCheck className="w-3 h-3 text-slate-500" />}
                              <span>{staff.role}</span>
                            </span>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                                staff.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {staff.isActive ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Outlet Tag / Link */}
                      {staff.restaurant && (
                        <button
                          onClick={() => navigate(`/admin/restaurants/${staff.restaurant?._id}`)}
                          className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold truncate max-w-[120px] transition"
                          title={`Assigned Outlet: ${staff.restaurant.name}`}
                        >
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.restaurant.name}</span>
                        </button>
                      )}
                    </div>

                    {/* Email with 1-click copy */}
                    <div className="mt-3.5 flex items-center justify-between bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2 truncate text-slate-600 min-w-0 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{staff.email}</span>
                      </div>
                      <button
                        onClick={() => handleCopyText(staff.email, `email_${staff._id}`, 'Email')}
                        className="text-slate-400 hover:text-slate-700 p-1 shrink-0 transition"
                        title="Copy email"
                      >
                        {copiedItemId === `email_${staff._id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* POS PIN Section */}
                    <div className="mt-2.5 flex items-center justify-between bg-amber-50/50 border border-amber-200/60 rounded-xl px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[10px] font-bold text-amber-900 uppercase font-mono tracking-wider">POS PIN:</span>
                        <span className="font-mono font-bold text-xs text-slate-900 tracking-widest">
                          {hasPin ? (isRevealed ? staff.pin : '••••') : <span className="text-slate-400 font-normal italic">Not Set</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {hasPin && (
                          <button
                            onClick={() => setRevealedPinId(isRevealed ? null : staff._id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                            title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {hasPin && (
                          <button
                            onClick={() => handleCopyText(staff.pin || '', `pin_${staff._id}`, 'POS PIN')}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                            title="Copy PIN"
                          >
                            {copiedItemId === `pin_${staff._id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => generatePinMutation.mutate(staff._id)}
                          disabled={generatePinMutation.isPending}
                          className="p-1 text-amber-600 hover:text-amber-800 rounded-md transition hover:bg-amber-100"
                          title="Generate new random 4-digit PIN"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Edit</span>
                      </button>

                      <button
                        onClick={() => setStaffToResetSecret(staff)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        title="Change Password"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Password</span>
                      </button>

                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: staff._id,
                            data: { isActive: !staff.isActive },
                          })
                        }
                        className={`p-1.5 rounded-lg text-[11px] font-bold transition ${
                          staff.isActive
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={staff.isActive ? 'Suspend access' : 'Activate access'}
                      >
                        {staff.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {staff.restaurant && (
                        <button
                          onClick={() => handleImpersonateManager(staff)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                          title="Open Manager View for this outlet"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setStaffToDelete(staff)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Deactivate / Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DENSE TABLE VIEW */
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5 font-bold">Personnel Member</th>
                    <th className="py-3.5 px-4 font-bold">Role</th>
                    <th className="py-3.5 px-4 font-bold">Assigned Outlet</th>
                    <th className="py-3.5 px-4 font-bold">POS PIN</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffMembers.map((staff) => {
                    const isManager = staff.role === 'MANAGER';
                    const isRevealed = revealedPinId === staff._id;
                    const hasPin = Boolean(staff.pin);

                    return (
                      <tr key={`${staff._id}_tbl`} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                                isManager
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-slate-900 text-white font-black'
                              }`}
                            >
                              {staff.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{staff.name}</p>
                              <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                                <span>{staff.email}</span>
                                <button
                                  onClick={() => handleCopyText(staff.email, `tbl_email_${staff._id}`, 'Email')}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  {copiedItemId === `tbl_email_${staff._id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                              isManager
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isManager ? <ShieldCheck className="w-3 h-3 text-amber-600" /> : <UserCheck className="w-3 h-3 text-slate-500" />}
                            <span>{staff.role}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {staff.restaurant ? (
                            <button
                              onClick={() => navigate(`/admin/restaurants/${staff.restaurant?._id}`)}
                              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-950 font-semibold text-xs group"
                            >
                              <Store className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition" />
                              <span className="truncate max-w-[140px]">{staff.restaurant.name}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 tracking-wider">
                              {hasPin ? (isRevealed ? staff.pin : '••••') : <span className="text-slate-400 font-normal italic">None</span>}
                            </span>
                            {hasPin && (
                              <button
                                onClick={() => setRevealedPinId(isRevealed ? null : staff._id)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={() => generatePinMutation.mutate(staff._id)}
                              className="p-1 text-amber-600 hover:text-amber-800"
                              title="Generate new PIN"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md font-mono ${
                              staff.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {staff.isActive ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(staff)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setStaffToResetSecret(staff)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Update Password"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            {staff.restaurant && (
                              <button
                                onClick={() => handleImpersonateManager(staff)}
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                                title="Open Manager View"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setStaffToDelete(staff)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Deactivate Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT SLIDEOVER / MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  {editingStaff ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {editingStaff ? 'Edit Team Member Details' : 'Add New Platform Team Member'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {editingStaff ? `Updating ${editingStaff.name}` : 'Create manager or floor staff account'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              {/* Outlet Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Restaurant Outlet <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('restaurantId')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                >
                  <option value="">Select a restaurant outlet...</option>
                  {restaurantList.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} {r.slug ? `(${r.slug})` : ''}
                    </option>
                  ))}
                </select>
                {errors.restaurantId && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.restaurantId.message}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
                {errors.name && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="e.g. staff@restaurant.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-mono"
                />
                {errors.email && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Platform Role <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('role', 'STAFF')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      formRole === 'STAFF'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <UserCheck className={`w-4 h-4 mt-0.5 ${formRole === 'STAFF' ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Floor Staff</div>
                      <div className={`text-[10px] ${formRole === 'STAFF' ? 'text-slate-300' : 'text-slate-400'}`}>
                        POS orders & live dining operations
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue('role', 'MANAGER')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      formRole === 'MANAGER'
                        ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 mt-0.5 ${formRole === 'MANAGER' ? 'text-slate-950' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Manager</div>
                      <div className={`text-[10px] ${formRole === 'MANAGER' ? 'text-slate-900/80' : 'text-slate-400'}`}>
                        Full outlet control & pin authorizations
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {editingStaff ? 'Change Password (Optional)' : 'Initial Password'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <input
                  type="text"
                  {...register('password')}
                  placeholder={editingStaff ? 'Leave blank to keep unchanged' : 'e.g. Staff@12345'}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-mono"
                />
              </div>

              {/* POS PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">4-Digit POS PIN</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[10px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  {...register('pin')}
                  placeholder="e.g. 1234"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition font-mono tracking-widest text-slate-900"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Account Active</div>
                  <div className="text-[10px] text-slate-500">Allow user to log in and access POS terminals</div>
                </div>
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 rounded-md text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-150">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                  className="text-xs font-bold px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-5 py-2 shadow-sm"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent animate-spin rounded-full" />
                      <span>Saving...</span>
                    </div>
                  ) : editingStaff ? (
                    'Save Changes'
                  ) : (
                    'Create Team Member'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD STANDALONE MODAL */}
      {staffToResetSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Update Password</h3>
              </div>
              <button
                onClick={() => {
                  setStaffToResetSecret(null);
                  setNewPasswordInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Set a new login password for <span className="font-bold text-slate-900">{staffToResetSecret.name}</span> ({staffToResetSecret.email}):
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">New Password</label>
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
                    let pass = '';
                    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                    setNewPasswordInput(pass);
                  }}
                  className="text-[10px] text-amber-600 font-bold"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStaffToResetSecret(null);
                  setNewPasswordInput('');
                }}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                disabled={!newPasswordInput.trim() || updateMutation.isPending}
                onClick={() => {
                  updateMutation.mutate(
                    {
                      id: staffToResetSecret._id,
                      data: { password: newPasswordInput.trim() },
                    },
                    {
                      onSuccess: () => {
                        setStaffToResetSecret(null);
                        setNewPasswordInput('');
                      },
                    }
                  );
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Deactivate Team Member?</h3>
                <p className="text-[11px] text-slate-500 font-medium">This member will lose access to the platform.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to deactivate <span className="font-bold text-slate-900">{staffToDelete.name}</span> ({staffToDelete.email})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStaffToDelete(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({
                    id: staffToDelete._id,
                    restaurantId: staffToDelete.restaurantId || staffToDelete.restaurant?._id,
                  })
                }
                className="text-xs font-bold"
              >
                {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate Member'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaff;
