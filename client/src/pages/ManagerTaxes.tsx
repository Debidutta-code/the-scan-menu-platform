import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { managerService, Tax } from '../services/restaurant.service';
import { Plus, Edit2, Trash2, X, Loader, Calculator } from 'lucide-react';

const taxSchema = z.object({
  name: z.string().min(1, 'Tax name is required'),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  isActive: z.boolean(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export const ManagerTaxes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  const activeRestaurantId = user?.restaurants?.[0];

  const { data: taxesData, isLoading } = useQuery({
    queryKey: ['managerTaxes', activeRestaurantId],
    queryFn: () => managerService.listTaxes(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });

  const taxes: Tax[] = taxesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: TaxFormValues) => managerService.createTax(activeRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax created successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create tax', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxFormValues> }) =>
      managerService.updateTax(activeRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax updated successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update tax', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteTax(activeRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax deleted successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete tax', 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      name: '',
      percentage: 0,
      isActive: true,
    },
  });

  const onSubmit = (data: TaxFormValues) => {
    if (editingTax) {
      updateMutation.mutate({ id: editingTax._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setValue('name', tax.name);
    setValue('percentage', tax.percentage);
    setValue('isActive', tax.isActive);
    setIsFormOpen(true);
  };

  const handleDelete = (tax: Tax) => {
    if (window.confirm(`Are you sure you want to delete ${tax.name}? This will stop applying it to new orders.`)) {
      deleteMutation.mutate(tax._id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTax(null);
    reset({
      name: '',
      percentage: 0,
      isActive: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display tracking-tight font-bold text-slate-900 flex items-center gap-2">
            Tax Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure taxes to be applied to orders.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          Add Tax
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {taxes.map((tax) => (
          <div
            key={tax._id}
            className={`bg-white rounded-2xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
              !tax.isActive ? 'border-slate-200 opacity-75' : 'border-slate-100'
            }`}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-lg">{tax.name}</h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    tax.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {tax.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xl mt-4">
                 <Calculator className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                 <span>{tax.percentage.toFixed(2)}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Calculated on subtotal</p>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-50">
              <button
                onClick={() => handleEdit(tax)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(tax)}
                className="flex-none p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                title="Delete permanently"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}
        {taxes.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No taxes configured</p>
            <p className="text-slate-400 text-sm mt-1">Add your regional taxes (e.g., GST) to apply them to orders.</p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-slate-900">
                {editingTax ? 'Edit Tax' : 'New Tax'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tax Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., SGST"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('percentage', { valueAsNumber: true })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="2.5"
                />
                {errors.percentage && (
                  <p className="text-red-500 text-xs mt-1">{errors.percentage.message}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                  Tax is Active
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 px-4 bg-primary hover:bg-slate-800 disabled:opacity-70 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                    <Loader className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  )}
                  {editingTax ? 'Save Changes' : 'Create Tax'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTaxes;
