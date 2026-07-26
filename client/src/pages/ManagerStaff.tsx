import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { managerService, Staff } from '../services/restaurant.service';
import { Plus, Edit2, ShieldAlert, Trash2, ShieldCheck, X, Loader, Users } from 'lucide-react';

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().optional(), // Required for creation, optional for edit
  pin: z.string().optional(),
  isActive: z.boolean(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export const ManagerStaff: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const activeRestaurantId = user?.restaurants?.[0];

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['managerStaff', activeRestaurantId],
    queryFn: () => managerService.listStaff(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });

  const staffList: Staff[] = staffData?.data || [];

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
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            Staff Management
          </h1>
          <p className="text-slate-500 mt-1">Manage waitstaff access and credentials.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((staff) => (
          <div
            key={staff._id}
            className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
              !staff.isActive ? 'border-slate-200 opacity-75 grayscale-[0.2]' : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  {staff.name}
                  {staff.role === 'MANAGER' && (
                    <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Manager
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-500">{staff.email}</p>
                {staff.pin && (
                  <p className="text-xs font-mono text-slate-400 mt-1">PIN: ••••</p>
                )}
              </div>
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  staff.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {staff.isActive ? 'Active' : 'Suspended'}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleEdit(staff)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              {staff.role !== 'MANAGER' && (
                <>
                  <button
                    onClick={() => handleSuspendToggle(staff)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      staff.isActive
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {staff.isActive ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        Suspend
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(staff)}
                    className="flex-none p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {staffList.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No staff members found.</p>
            <p className="text-slate-400 text-sm mt-1">Add staff to help manage orders.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. John Doe"
                />
                {errors.name && (
                  <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. john@restaurant.com"
                />
                {errors.email && (
                  <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Password {editingStaff && <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter secure password"
                />
                {errors.password && (
                  <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  PIN Code <span className="text-slate-400 font-normal">(Optional, for quick actions)</span>
                </label>
                <input
                  type="text"
                  {...register('pin')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  placeholder="e.g. 1234"
                  maxLength={6}
                />
                {errors.pin && (
                  <p className="text-rose-500 text-xs mt-1">{errors.pin.message}</p>
                )}
              </div>

              {editingStaff && editingStaff.role !== 'MANAGER' && (
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 select-none">
                    Account is Active
                  </label>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                    <Loader className="w-4 h-4 animate-spin" />
                  )}
                  {editingStaff ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerStaff;
