import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { managerService, Tax } from '../../services/restaurant.service';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  Calculator,
  Layers,
  Tag,
  Sparkles,
} from 'lucide-react';

const taxSchema = z.object({
  type: z.enum(['GROUP', 'TAX']),
  name: z.string().min(1, 'Name is required'),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  groupId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

export interface TaxManagementSectionProps {
  restaurantId?: string;
  onSaved?: () => void;
}

export const TaxManagementSection: React.FC<TaxManagementSectionProps> = ({
  restaurantId: propRestaurantId,
  onSaved,
}) => {
  const { activeRestaurantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = propRestaurantId || activeRestaurantId;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  const { data: taxesData, isLoading } = useQuery({
    queryKey: ['managerTaxes', targetRestaurantId],
    queryFn: () => managerService.listTaxes(targetRestaurantId!),
    enabled: !!targetRestaurantId,
  });

  const taxes: Tax[] = useMemo(() => taxesData?.data || [], [taxesData?.data]);
  const groups = useMemo(() => taxes.filter((t) => t.type === 'GROUP'), [taxes]);
  const standaloneTaxes = useMemo(() => taxes.filter((t) => t.type === 'TAX' && !t.groupId), [taxes]);

  const getSubTaxes = (groupId: string) =>
    taxes.filter(
      (t) =>
        t.type === 'TAX' &&
        (typeof t.groupId === 'string' ? t.groupId === groupId : (t.groupId as any)?._id === groupId)
    );

  const createMutation = useMutation({
    mutationFn: (data: TaxFormValues) => managerService.createTax(targetRestaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Tax configuration created successfully', 'success');
      handleCloseForm();
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to create tax config', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaxFormValues> }) =>
      managerService.updateTax(targetRestaurantId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Tax configuration updated successfully', 'success');
      handleCloseForm();
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to update tax config', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => managerService.deleteTax(targetRestaurantId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managerTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast('Tax configuration deleted successfully', 'success');
      if (onSaved) onSaved();
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Failed to delete tax config', 'error');
    },
  });

  // Preset Applicator
  const handleApplyPreset = async (preset: 'GST_5' | 'GST_18' | 'VAT_10' | 'NONE') => {
    if (!targetRestaurantId) return;

    try {
      // Clear existing taxes
      for (const t of taxes) {
        await managerService.deleteTax(targetRestaurantId, t._id);
      }

      if (preset === 'GST_5') {
        const grp = await managerService.createTax(targetRestaurantId, {
          name: 'GST 5%',
          type: 'GROUP',
          percentage: 5,
          isActive: true,
        });
        const gid = grp.data._id;
        await managerService.createTax(targetRestaurantId, {
          name: 'CGST 2.5%',
          type: 'TAX',
          percentage: 2.5,
          groupId: gid,
          isActive: true,
        });
        await managerService.createTax(targetRestaurantId, {
          name: 'SGST 2.5%',
          type: 'TAX',
          percentage: 2.5,
          groupId: gid,
          isActive: true,
        });
      } else if (preset === 'GST_18') {
        const grp = await managerService.createTax(targetRestaurantId, {
          name: 'GST 18%',
          type: 'GROUP',
          percentage: 18,
          isActive: true,
        });
        const gid = grp.data._id;
        await managerService.createTax(targetRestaurantId, {
          name: 'CGST 9%',
          type: 'TAX',
          percentage: 9,
          groupId: gid,
          isActive: true,
        });
        await managerService.createTax(targetRestaurantId, {
          name: 'SGST 9%',
          type: 'TAX',
          percentage: 9,
          groupId: gid,
          isActive: true,
        });
      } else if (preset === 'VAT_10') {
        await managerService.createTax(targetRestaurantId, {
          name: 'VAT 10%',
          type: 'TAX',
          percentage: 10,
          groupId: null,
          isActive: true,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['managerTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminTaxes', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      toast(`Tax Preset applied successfully!`, 'success');
      if (onSaved) onSaved();
    } catch (err: any) {
      toast(err.response?.data?.error?.message || 'Failed to apply tax preset', 'error');
    }
  };

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
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <span>Tax Rates & GST Rules</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure individual tax rates or grouped tax brackets (CGST/SGST breakdowns).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              reset({ type: 'GROUP', name: '', percentage: 0, groupId: null, isActive: true });
              setIsFormOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Add Tax Group</span>
          </button>

          <button
            type="button"
            onClick={() => {
              reset({ type: 'TAX', name: '', percentage: 0, groupId: null, isActive: true });
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Tax Rate</span>
          </button>
        </div>
      </div>

      {/* 1-Click Tax Presets Bar */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">1-Click Presets</span>
            <p className="text-xs font-bold text-slate-900 mt-0.5">Quickly apply standard national tax rules</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyPreset('GST_5')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
          >
            GST 5% (Restaurant Std)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('GST_18')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
          >
            GST 18% (AC/Bar)
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('VAT_10')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
          >
            VAT 10%
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('NONE')}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
          >
            Clear (0%)
          </button>
        </div>
      </div>

      {/* Tax List */}
      <div className="space-y-4">
        {groups.length === 0 && standaloneTaxes.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-medium text-xs">No taxes configured</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Click a preset above or add custom taxes.</p>
          </div>
        )}

        {/* Groups */}
        {groups.map((group) => {
          const subTaxes = getSubTaxes(group._id);
          const totalPercentage = subTaxes.reduce((sum, t) => sum + t.percentage, 0);
          return (
            <div key={group._id} className={`bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${!group.isActive ? 'opacity-75' : ''}`}>
              <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Layers className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{group.name}</h4>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full">
                        TAX GROUP ({totalPercentage > 0 ? totalPercentage.toFixed(2) : group.percentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${group.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {group.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-1 border-l border-slate-200 pl-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(group)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(group)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-2 bg-white">
                {subTaxes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-2">No individual taxes added to this group yet.</p>
                ) : (
                  subTaxes.map((tax) => (
                    <div key={tax._id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{tax.name}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-bold font-mono">
                          {tax.percentage}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEdit(tax)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-900">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(tax)} className="text-[11px] font-semibold text-red-500 hover:text-red-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    reset({ type: 'TAX', name: '', percentage: 0, groupId: group._id, isActive: true });
                    setIsFormOpen(true);
                  }}
                  className="mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 px-2 cursor-pointer"
                >
                  <Plus className="w-3 h-3" strokeWidth={2} /> Add sub-tax
                </button>
              </div>
            </div>
          );
        })}

        {/* Standalone Taxes */}
        {standaloneTaxes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Tag className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Standalone Tax Rates</h4>
                  <p className="text-[11px] text-slate-500">Individual taxes applied directly to orders</p>
                </div>
              </div>
              <span className="text-[11px] font-bold font-mono bg-slate-200/70 text-slate-700 px-2.5 py-0.5 rounded-lg">
                {standaloneTaxes.length} Rates
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {standaloneTaxes.map((tax) => (
                <div
                  key={tax._id}
                  className={`bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all ${
                    !tax.isActive ? 'opacity-65 grayscale-[0.2]' : 'hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-bold text-slate-900 text-xs truncate">{tax.name}</h5>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        tax.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tax.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="inline-flex font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      {tax.percentage.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(tax)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Edit Tax"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tax)}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                      title="Delete Tax"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tax Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900">
                {editingTax ? 'Edit Configuration' : (selectedType === 'GROUP' ? 'New Tax Group' : 'New Tax Rate')}
              </h4>
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3.5 text-xs">
              {!editingTax && (
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Configuration Type</label>
                  <select
                    {...register('type')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="TAX">Individual Tax Rate</option>
                    <option value="GROUP">Tax Group (e.g. GST)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Name (e.g. CGST or Service Charge)</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {errors.name && <p className="text-red-500 text-[10px] mt-1">{errors.name.message}</p>}
              </div>

              {selectedType === 'TAX' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Percentage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('percentage', { valueAsNumber: true })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                    {errors.percentage && <p className="text-red-500 text-[10px] mt-1">{errors.percentage.message}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Parent Group (Optional)</label>
                    <select
                      {...register('groupId')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">None (Standalone Tax)</option>
                      {groups.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="isActiveTax"
                  {...register('isActive')}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="isActiveTax" className="font-semibold text-slate-700 cursor-pointer">
                  {selectedType === 'GROUP' ? 'Group is Active' : 'Tax is Active'}
                </label>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 disabled:opacity-70 text-white rounded-xl font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
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
