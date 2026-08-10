import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { managerService, Tax } from '../services/restaurant.service';
import { Plus, Edit2, Trash2, X, Loader, Calculator, Layers, Tag } from 'lucide-react';

const taxSchema = z.object({
  type: z.enum(['GROUP', 'TAX']),
  name: z.string().min(1, 'Name is required'),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  groupId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export const ManagerTaxes: React.FC = () => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  const { data: taxesData, isLoading } = useQuery({
    queryKey: ['managerTaxes', activeRestaurantId],
    queryFn: () => managerService.listTaxes(activeRestaurantId!),
    enabled: !!activeRestaurantId,
  });

  const taxes: Tax[] = useMemo(() => taxesData?.data || [], [taxesData?.data]);

  const groups = useMemo(() => taxes.filter((t) => t.type === 'GROUP'), [taxes]);
  const standaloneTaxes = useMemo(() => taxes.filter((t) => t.type === 'TAX' && !t.groupId), [taxes]);

  const getSubTaxes = (groupId: string) => taxes.filter((t) => t.type === 'TAX' && (typeof t.groupId === 'string' ? t.groupId === groupId : (t.groupId as any)?._id === groupId));

  const createMutation = useMutation({
    mutationFn: (data: TaxFormValues) => managerService.createTax(activeRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax configuration created successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create tax config', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxFormValues> }) =>
      managerService.updateTax(activeRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax configuration updated successfully', 'success');
      handleCloseForm();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update tax config', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteTax(activeRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', activeRestaurantId] });
      toast('Tax configuration deleted successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete tax config', 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      type: 'TAX',
      name: '',
      percentage: 0,
      groupId: null,
      isActive: true,
    },
  });

  const selectedType = watch('type');

  const onSubmit = (data: TaxFormValues) => {
    // Scrub empty string for group id
    if (!data.groupId) data.groupId = null;

    if (editingTax) {
      updateMutation.mutate({ id: editingTax._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setValue('type', tax.type);
    setValue('name', tax.name);
    setValue('percentage', tax.percentage || 0);
    const gid = typeof tax.groupId === 'string' ? tax.groupId : (tax.groupId as any)?._id;
    setValue('groupId', gid || null);
    setValue('isActive', tax.isActive);
    setIsFormOpen(true);
  };

  const handleDelete = (tax: Tax) => {
    if (window.confirm(`Are you sure you want to delete ${tax.name}?`)) {
      deleteMutation.mutate(tax._id);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTax(null);
    reset({
      type: 'TAX',
      name: '',
      percentage: 0,
      groupId: null,
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
    <div className="w-full space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display tracking-tight font-bold text-slate-900 flex items-center gap-2">
            Tax Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure individual taxes or grouped tax brackets (e.g. GST).</p>
        </div>
        <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                  reset({ type: 'GROUP', name: '', percentage: 0, groupId: null, isActive: true });
                  setIsFormOpen(true);
              }}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Layers className="w-4 h-4" strokeWidth={1.75} />
              Add Group
            </button>
            <button
              onClick={() => {
                  reset({ type: 'TAX', name: '', percentage: 0, groupId: null, isActive: true });
                  setIsFormOpen(true);
              }}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              Add Tax
            </button>
        </div>
      </div>

      <div className="space-y-6">
          {groups.length === 0 && standaloneTaxes.length === 0 && (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No taxes configured</p>
                <p className="text-slate-400 text-sm mt-1">Add groups (like GST) or individual taxes to apply them to orders.</p>
              </div>
          )}

          {/* GROUPS */}
          {groups.map(group => {
              const subTaxes = getSubTaxes(group._id);
              const totalPercentage = subTaxes.reduce((sum, t) => sum + t.percentage, 0);
              return (
                  <div key={group._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!group.isActive ? 'opacity-75' : ''}`}>
                      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                                  <Layers className="w-5 h-5" strokeWidth={1.75} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-slate-900 text-lg">{group.name}</h3>
                                  <p className="text-xs text-slate-500 font-medium">Combined Rate: <span className="font-bold">{totalPercentage.toFixed(2)}%</span></p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${group.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                  {group.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <div className="flex gap-1 border-l border-slate-200 pl-3">
                                  <button onClick={() => handleEdit(group)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(group)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      </div>
                      <div className="p-4 space-y-3">
                          {subTaxes.length === 0 ? (
                              <p className="text-sm text-slate-400 italic px-2">No individual taxes added to this group yet.</p>
                          ) : (
                              subTaxes.map(tax => (
                                  <div key={tax._id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                                      <div className="flex items-center gap-3">
                                          <Tag className="w-4 h-4 text-slate-400" />
                                          <span className="font-semibold text-slate-700 text-sm">{tax.name}</span>
                                          <span className="text-xs bg-amber-100 text-amber-800 px-2 rounded-full font-bold font-mono">{tax.percentage}%</span>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => handleEdit(tax)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Edit</button>
                                          <button onClick={() => handleDelete(tax)} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                                      </div>
                                  </div>
                              ))
                          )}
                          <button
                            onClick={() => {
                                reset({ type: 'TAX', name: '', percentage: 0, groupId: group._id, isActive: true });
                                setIsFormOpen(true);
                            }}
                            className="mt-2 text-sm font-semibold text-primary hover:text-slate-900 flex items-center gap-1 px-2"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add sub-tax
                          </button>
                      </div>
                  </div>
              )
          })}

          {/* STANDALONE TAXES */}
          {standaloneTaxes.length > 0 && (
             <div className="mt-8">
                 <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Standalone Taxes</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {standaloneTaxes.map((tax) => (
                      <div
                        key={tax._id}
                        className={`bg-white rounded-2xl p-6 border shadow-sm transition-all flex flex-col justify-between ${
                          !tax.isActive ? 'border-slate-200 opacity-75' : 'border-slate-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-slate-900 text-lg">{tax.name}</h3>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${tax.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {tax.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 font-mono text-xl mt-4">
                             <Calculator className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                             <span>{tax.percentage.toFixed(2)}%</span>
                          </div>
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
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    ))}
                 </div>
             </div>
          )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-slate-900">
                {editingTax ? 'Edit Configuration' : (selectedType === 'GROUP' ? 'New Tax Group' : 'New Tax Rate')}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

              {!editingTax && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Configuration Type</label>
                    <select
                      {...register('type')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="TAX">Individual Tax Rate</option>
                      <option value="GROUP">Tax Group (e.g. GST)</option>
                    </select>
                  </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Name (e.g. CGST or Service Charge)
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {selectedType === 'TAX' && (
                  <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Percentage (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register('percentage', { valueAsNumber: true })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                        {errors.percentage && <p className="text-red-500 text-xs mt-1">{errors.percentage.message}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Parent Group (Optional)</label>
                        <select
                          {...register('groupId')}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="">None (Standalone Tax)</option>
                          {groups.map(g => (
                              <option key={g._id} value={g._id}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                  </>
              )}

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                  {selectedType === 'GROUP' ? 'Group is Active' : 'Tax is Active'}
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
                  Save
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
