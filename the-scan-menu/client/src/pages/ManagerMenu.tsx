import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/featureFlags/useFeatureFlags';
import { Navigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useFontScale } from '../hooks/useFontScale';
import { apiClient } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { MenuBadge } from './PublicTable/components/MenuBadge';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  FolderOpen,
  Flame,
  GripVertical,
  Sliders,
  Eye,
  Smartphone,
  Sparkles,
  Check,
  Minus,
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const menuItemSchema = z.object({
  name: z.string().trim().min(1, 'Dish name is required'),
  description: z.string().optional(),
  pricingType: z.enum(['SINGLE', 'PORTION']).default('SINGLE'),
  price: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0, 'Price must be non-negative').default(0)
  ),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Size name is required'),
        price: z.preprocess(
          (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
          z.number().min(0, 'Price must be non-negative')
        ),
        isDefault: z.boolean().default(false),
      })
    )
    .default([]),
  imageUrl: z.string().optional(),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isChefsSpecial: z.boolean().default(false),
  prepTimeMinutes: z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number(val) === 0 ? undefined : Number(val)),
    z.number().int().positive('Prep time must be a positive number').optional()
  ),
  trackStock: z.boolean().default(false),
  stockQuantity: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
    z.number().int().min(0).default(0)
  ),
  lowStockThreshold: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 5 : Number(val)),
    z.number().int().min(0).default(5)
  ),
  isCombo: z.boolean().default(false),
  comboItems: z
    .array(
      z.object({
        menuItemId: z.string().optional(),
        name: z.string().trim().min(1, 'Combo item name is required'),
        categoryName: z.string().optional(),
        quantity: z.preprocess(
          (val) => (val === '' || val === null || val === undefined ? 1 : Number(val)),
          z.number().int().min(1).default(1)
        ),
        imageUrl: z.string().optional(),
      })
    )
    .default([]),
  addOns: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Add-on name is required'),
        priceDelta: z.preprocess(
          (val) => (val === '' || val === null || val === undefined ? 0 : Number(val)),
          z.number().min(0, 'Price delta must be non-negative')
        ),
      })
    )
    .default([]),
  attachedAddOnGroupIds: z.array(z.string()).default([]),
});

const customGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  type: z.enum(['VARIANT', 'ADDON']).default('ADDON'),
  description: z.string().optional(),
  options: z
    .array(
      z.object({
        name: z.string().min(1, 'Option name is required'),
        priceDelta: z.coerce.number().default(0),
        price: z.coerce.number().default(0),
      })
    )
    .min(1, 'At least one option is required'),
  isGlobal: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// Sortable Wrapper component for categories/items
interface SortableItemProps {
  id: string;
  children: (props: { dragHandleProps: any }) => React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
};

// Customer Dish Mobile Experience Preview Component
const CustomerDishPreview: React.FC<{
  item: any;
  previewMode: 'LIST' | 'FULL';
  setPreviewMode: (mode: 'LIST' | 'FULL') => void;
}> = ({ item, previewMode, setPreviewMode }) => {
  const isPortion = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<any[]>([]);
  const [previewQty, setPreviewQty] = useState(1);
  const [isAddedToList, setIsAddedToList] = useState(false);

  const activeVariant = isPortion ? item.variants[selectedVariantIdx] || item.variants[0] : null;
  const basePrice = isPortion
    ? (activeVariant ? Number(activeVariant.price || 0) : 0)
    : Number(item.price || 0);

  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + Number(a.priceDelta || 0), 0);
  const totalPrice = (basePrice + addOnsTotal) * previewQty;

  const minVariantPrice = isPortion && item.variants
    ? Math.min(...item.variants.map((v: any) => Number(v.price || 0)))
    : basePrice;

  return (
    <div className="space-y-4">
      {/* Mode Switch Tabs */}
      <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setPreviewMode('LIST')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            previewMode === 'LIST'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Customer List View</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode('FULL')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            previewMode === 'FULL'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Customer Full View (Detail Sheet)</span>
        </button>
      </div>

      {/* Realistic Mobile Frame */}
      <div className="bg-[#FAF9F6] border border-slate-200 rounded-3xl p-4 md:p-6 shadow-inner mx-auto max-w-sm">
        {/* Mobile Top Bar */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-3 mb-2 border-b border-slate-200/60">
          <span className="font-bold text-slate-700">9:41</span>
          <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full font-bold">Table #4</span>
        </div>

        {previewMode === 'LIST' ? (
          /* ========================================= */
          /* MODE 1: CUSTOMER LIST VIEW CARD           */
          /* ========================================= */
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              ✨ Customer Menu Card
            </div>

            <div className="p-4 bg-white rounded-3xl border border-slate-150 shadow-sm space-y-3">
              <div className="flex gap-3.5 items-start">
                {/* Dish Thumbnail */}
                <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative border border-slate-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                      <Sparkles className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                  {item.isChefsSpecial && (
                    <div className="absolute top-1 left-1">
                      <span className="text-[8px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-slate-950/85 rounded-full">
                        Special
                      </span>
                    </div>
                  )}
                  {item.isCombo && !item.isChefsSpecial && (
                    <div className="absolute top-1 left-1">
                      <span className="text-[8px] font-black text-amber-950 uppercase tracking-wider px-1.5 py-0.5 bg-amber-400 rounded-full shadow-2xs">
                        Combo
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {item.name || 'Untitled Dish'}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                      {item.isSpicy && <MenuBadge variant="spicy" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description || 'No description added yet.'}
                  </p>

                  {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                    <p className="text-[10px] text-amber-800 font-medium line-clamp-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 mt-1">
                      Includes: {item.comboItems.map((c: any) => `${c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`).join(' + ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Price & Add Action */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div>
                  {isPortion ? (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                        {item.variants.length} Sizes
                      </span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        From ₹{minVariantPrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                        Price
                      </span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        ₹{basePrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddedToList(!isAddedToList)}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ${
                    isAddedToList
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {isAddedToList ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              💡 Tap "Customer Full View" above to see the expanded sheet when a diner clicks this card.
            </p>
          </div>
        ) : (
          /* ========================================= */
          /* MODE 2: CUSTOMER FULL VIEW (DETAIL SHEET) */
          /* ========================================= */
          <div className="space-y-4 bg-white rounded-3xl p-4 border border-slate-150 shadow-sm">
            {/* Hero Cover */}
            <div className="w-full h-44 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-100">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Sparkles className="w-8 h-8 opacity-40" />
                  <span className="text-[11px] font-bold mt-1 text-slate-400">No Image Uploaded</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                {item.isSpicy && <MenuBadge variant="spicy" />}
                {item.isChefsSpecial && (
                  <span className="text-[9px] font-bold text-white uppercase px-2 py-0.5 bg-amber-500 rounded-full">
                    Chef's Special
                  </span>
                )}
              </div>
            </div>

            {/* Title & Price */}
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-slate-900 leading-tight">
                {item.name || 'Untitled Dish'}
              </h3>
              {item.description && (
                <p className="text-slate-500 text-xs leading-relaxed">{item.description}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-lg font-black text-slate-900 font-mono">
                  ₹{basePrice.toFixed(2)}
                </span>
                {item.prepTimeMinutes && (
                  <span className="text-[11px] text-slate-400 font-medium font-mono">
                    • {item.prepTimeMinutes} mins prep
                  </span>
                )}
              </div>
            </div>

            {/* Portion Sizes Selector */}
            {isPortion && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  Select Portion Size
                </label>
                <div className="space-y-1.5">
                  {item.variants.map((v: any, vIdx: number) => {
                    const isSelected = selectedVariantIdx === vIdx;
                    return (
                      <div
                        key={vIdx}
                        onClick={() => setSelectedVariantIdx(vIdx)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 font-bold text-slate-900'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                          </div>
                          <span className="text-xs">{v.name || `Size ${vIdx + 1}`}</span>
                        </div>
                        <span className="text-xs font-mono font-bold">
                          ₹{Number(v.price || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons Checklist */}
            {item.addOns && item.addOns.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  Custom Add-Ons
                </label>
                <div className="space-y-1.5">
                  {item.addOns.map((addon: any, aIdx: number) => {
                    const isChecked = selectedAddOns.some((a) => a.name === addon.name);
                    return (
                      <div
                        key={aIdx}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedAddOns(selectedAddOns.filter((a) => a.name !== addon.name));
                          } else {
                            setSelectedAddOns([...selectedAddOns, addon]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/50 font-bold text-slate-900'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-3.5 h-3.5 accent-emerald-600 rounded"
                          />
                          <span className="text-xs">{addon.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          +₹{Number(addon.priceDelta || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Mock */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-600 block">
                Special Cooking Request (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra crisp..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 placeholder:text-slate-400"
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewQty(Math.max(1, previewQty - 1))}
                  className="p-1 text-slate-500 hover:text-slate-900"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-mono font-bold text-slate-900">
                  {previewQty}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewQty(previewQty + 1)}
                  className="p-1 text-slate-500 hover:text-slate-900"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-between px-3 shadow-md"
              >
                <span>Add to Order</span>
                <span className="font-mono">₹{totalPrice.toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface ManagerMenuProps {
  restaurantId?: string;
}

export const ManagerMenu: React.FC<ManagerMenuProps> = ({ restaurantId }) => {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();

  const { activeRestaurantId, user } = useAuth();
  const { fontScale, setFontScale } = useFontScale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const targetRestaurantId = restaurantId || activeRestaurantId;

  // Primary Tab: 'MENU' | 'CUSTOMIZATIONS'
  const [activeTab, setActiveTab] = useState<'MENU' | 'CUSTOMIZATIONS'>('MENU');

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [isItemOpen, setIsItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview states
  const [previewDish, setPreviewDish] = useState<any | null>(null);
  const [previewMode, setPreviewMode] = useState<'LIST' | 'FULL'>('LIST');
  const [itemModalTab, setItemModalTab] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Customization group modal states
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Bulk availability states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Fetch Categories
  const { data: catResponse, isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/categories`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  const categories = useMemo(() => catResponse?.data || [], [catResponse]);

  // Automatically select the first category if none is selected
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0]._id);
    }
  }, [categories, selectedCatId]);

  // Fetch Menu Items scoped inside selectedCategory
  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: ['menuItems', targetRestaurantId, selectedCatId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/restaurants/${targetRestaurantId}/menu-items?categoryId=${selectedCatId}`
      );
      return res.data;
    },
    enabled: !!targetRestaurantId && !!selectedCatId,
  });

  const menuItems = itemsResponse?.data || [];

  // Fetch Customization Groups
  const { data: customGroupsResponse, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['customizationGroups', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/customization-groups`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  const customGroups = customGroupsResponse?.data || [];

  // ==========================================
  // MUTATIONS (Categories)
  // ==========================================
  const createCatMutation = useMutation({
    mutationFn: (data: CategoryFormValues) =>
      apiClient.post(`/restaurants/${targetRestaurantId}/categories`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminCategories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      setIsCatOpen(false);
      catForm.reset();
      toast('Category created successfully.', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error creating category');
    },
  });

  const editCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormValues }) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminCategories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      setIsCatOpen(false);
      setEditingCat(null);
      catForm.reset();
      toast('Category updated successfully.', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error editing category');
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/restaurants/${targetRestaurantId}/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminCategories', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      setSelectedCatId(null);
      toast('Category deleted successfully.', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error deleting category', 'error');
    },
  });

  const reorderCatsMutation = useMutation({
    mutationFn: (categoryIds: string[]) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/categories-reorder`, { categoryIds }),
    onMutate: async (categoryIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['categories', targetRestaurantId] });
      const previous = queryClient.getQueryData(['categories', targetRestaurantId]);

      queryClient.setQueryData(['categories', targetRestaurantId], (old: any) => {
        if (!old) return old;
        const sorted = [...old.data].sort((a, b) => {
          return categoryIds.indexOf(a._id) - categoryIds.indexOf(b._id);
        });
        return { ...old, data: sorted };
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', targetRestaurantId] });
    },
  });

  const handleDragEndCategories = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c: any) => c._id === active.id);
      const newIndex = categories.findIndex((c: any) => c._id === over.id);
      const reordered = arrayMove(categories, oldIndex, newIndex);
      reorderCatsMutation.mutate(reordered.map((c: any) => c._id));
    }
  };

  // ==========================================
  // MUTATIONS (Menu Items)
  // ==========================================
  const createItemMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/restaurants/${targetRestaurantId}/menu-items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      setIsItemOpen(false);
      itemForm.reset();
      toast('Menu item created successfully.', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error creating menu item');
    },
  });

  const editItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      setIsItemOpen(false);
      setEditingItem(null);
      itemForm.reset();
      toast('Menu item updated successfully.', 'success');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Error editing menu item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/restaurants/${targetRestaurantId}/menu-items/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      queryClient.invalidateQueries({ queryKey: ['adminMenuItems', targetRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['adminSetupAudit', targetRestaurantId] });
      if (res.data?.data?.archived) {
        toast('Menu item has order history; successfully soft-archived and made unavailable.', 'info');
      } else {
        toast('Menu item successfully deleted.', 'success');
      }
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items-reorder`, {
        itemIds,
        categoryId: selectedCatId,
      }),
    onMutate: async (itemIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      const previous = queryClient.getQueryData(['menuItems', targetRestaurantId, selectedCatId]);

      queryClient.setQueryData(['menuItems', targetRestaurantId, selectedCatId], (old: any) => {
        if (!old) return old;
        const sorted = [...old.data].sort((a, b) => {
          return itemIds.indexOf(a._id) - itemIds.indexOf(b._id);
        });
        return { ...old, data: sorted };
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
    },
  });

  const handleDragEndItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = menuItems.findIndex((i: any) => i._id === active.id);
      const newIndex = menuItems.findIndex((i: any) => i._id === over.id);
      const reordered = arrayMove(menuItems, oldIndex, newIndex);
      reorderItemsMutation.mutate(reordered.map((i: any) => i._id));
    }
  };

  // Optimistic Toggle for availability
  const toggleAvailableMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items/${id}/availability`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      const previousItems = queryClient.getQueryData(['menuItems', targetRestaurantId, selectedCatId]);

      queryClient.setQueryData(
        ['menuItems', targetRestaurantId, selectedCatId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item: any) =>
              item._id === id ? { ...item, isAvailable: !item.isAvailable } : item
            ),
          };
        }
      );

      return { previousItems };
    },
    onError: (_err, _id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['menuItems', targetRestaurantId, selectedCatId],
          context.previousItems
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
    },
  });

  // Bulk availability update
  const bulkAvailableMutation = useMutation({
    mutationFn: ({ ids, isAvailable }: { ids: string[]; isAvailable: boolean }) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items-bulk-availability`, {
        itemIds: ids,
        isAvailable,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId, selectedCatId] });
      setSelectedItemIds([]);
      setBulkMode(false);
    },
  });

  // ==========================================
  // MUTATIONS (Customization Groups)
  // ==========================================
  const createGroupMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post(`/restaurants/${targetRestaurantId}/customization-groups`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customizationGroups', targetRestaurantId] });
      setIsGroupModalOpen(false);
      groupForm.reset();
      toast('Customization group created successfully.', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating group', 'error');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/restaurants/${targetRestaurantId}/customization-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customizationGroups', targetRestaurantId] });
      toast('Customization group archived.', 'success');
    },
  });

  // Forms
  const catForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const itemForm = useForm<any>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      pricingType: 'SINGLE',
      price: 0,
      variants: [],
      addOns: [],
      isVegetarian: false,
      isSpicy: false,
      isChefsSpecial: false,
      isCombo: false,
      comboItems: [],
      attachedAddOnGroupIds: [],
    },
  });

  const { fields: addOnFields, append: appendAddOn, remove: removeAddOn } = useFieldArray({
    control: itemForm.control,
    name: 'addOns',
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({
    control: itemForm.control,
    name: 'variants',
  });

  const {
    fields: comboFields,
    append: appendComboItem,
    remove: removeComboItem,
  } = useFieldArray({
    control: itemForm.control,
    name: 'comboItems',
  });

  const groupForm = useForm<any>({
    resolver: zodResolver(customGroupSchema),
    defaultValues: {
      name: '',
      type: 'ADDON',
      description: '',
      options: [{ name: '', priceDelta: 0, price: 0 }],
      isGlobal: true,
    },
  });

  const { fields: groupOptionFields, append: appendGroupOption, remove: removeGroupOption } = useFieldArray({
    control: groupForm.control,
    name: 'options',
  });

  const onCatSubmit = (values: CategoryFormValues) => {
    setErrorMsg(null);
    if (editingCat) {
      editCatMutation.mutate({ id: editingCat._id, data: values });
    } else {
      createCatMutation.mutate(values);
    }
  };

  const onItemSubmit = (values: any) => {
    setErrorMsg(null);
    if (!selectedCatId) {
      toast('Please select or create a category before saving the dish.', 'error');
      return;
    }

    const isPortion = values.pricingType === 'PORTION';

    if (isPortion) {
      if (!values.variants || values.variants.length === 0) {
        toast('Please add at least one portion size option (e.g. Half / Full).', 'error');
        return;
      }
      const invalidVariant = values.variants.find((v: any) => !v.name?.trim() || Number(v.price) < 0 || isNaN(Number(v.price)));
      if (invalidVariant) {
        toast('Please enter valid names and non-negative prices for all portion sizes.', 'error');
        return;
      }
    } else {
      if (Number(values.price) < 0 || isNaN(Number(values.price))) {
        toast('Please enter a valid non-negative dish price.', 'error');
        return;
      }
    }

    let priceInPaise = Math.round(Number(values.price || 0) * 100);
    const variantsInPaise = isPortion
      ? values.variants.map((v: any) => ({
          name: v.name.trim(),
          price: Math.round(Number(v.price || 0) * 100),
          isDefault: !!v.isDefault,
        }))
      : undefined;

    if (isPortion && variantsInPaise && variantsInPaise.length > 0) {
      const def = variantsInPaise.find((v: any) => v.isDefault) || variantsInPaise[0];
      priceInPaise = def.price;
    }

    const addOnsInPaise = values.addOns
      ?.filter((addon: any) => addon.name?.trim())
      .map((addon: any) => ({
        name: addon.name.trim(),
        priceDelta: Math.round(Number(addon.priceDelta || 0) * 100),
      }));

    const payload = {
      ...values,
      name: values.name.trim(),
      categoryId: selectedCatId,
      pricingType: isPortion ? 'PORTION' : 'SINGLE',
      price: priceInPaise,
      variants: variantsInPaise,
      addOns: addOnsInPaise,
      prepTimeMinutes: values.prepTimeMinutes ? Number(values.prepTimeMinutes) : undefined,
      isCombo: !!values.isCombo,
      comboItems: values.isCombo ? values.comboItems?.filter((c: any) => c.name?.trim()) : undefined,
    };

    if (editingItem) {
      editItemMutation.mutate({ id: editingItem._id, data: payload });
    } else {
      createItemMutation.mutate(payload);
    }
  };

  const handleEditCatClick = (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCat(cat);
    catForm.reset({
      name: cat.name,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
    });
    setIsCatOpen(true);
  };

  const handleEditItemClick = (item: any) => {
    setEditingItem(item);
    setItemModalTab('FORM');
    itemForm.reset({
      name: item.name,
      description: item.description || '',
      pricingType: item.pricingType || 'SINGLE',
      price: (item.price || 0) / 100,
      variants: item.variants?.map((v: any) => ({
        name: v.name,
        price: (v.price || 0) / 100,
        isDefault: !!v.isDefault,
      })) || [],
      imageUrl: item.imageUrl || '',
      isVegetarian: !!item.isVegetarian,
      isSpicy: !!item.isSpicy,
      isChefsSpecial: !!item.isChefsSpecial,
      prepTimeMinutes: item.prepTimeMinutes || '',
      trackStock: !!item.trackStock,
      stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity : 0,
      lowStockThreshold: item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5,
      isCombo: !!item.isCombo,
      comboItems: item.comboItems?.map((c: any) => ({
        menuItemId: c.menuItemId,
        name: c.name,
        categoryName: c.categoryName,
        quantity: c.quantity || 1,
        imageUrl: c.imageUrl,
      })) || [],
      addOns: item.addOns?.map((addon: any) => ({
        name: addon.name,
        priceDelta: (addon.priceDelta || 0) / 100,
      })) || [],
      attachedAddOnGroupIds: item.attachedAddOnGroupIds || [],
    });
    setIsItemOpen(true);
  };

  const handleNewItemClick = () => {
    setEditingItem(null);
    setItemModalTab('FORM');
    itemForm.reset({
      name: '',
      description: '',
      pricingType: 'SINGLE',
      price: 0,
      variants: [],
      imageUrl: '',
      isVegetarian: false,
      isSpicy: false,
      isChefsSpecial: false,
      prepTimeMinutes: '',
      trackStock: false,
      stockQuantity: 0,
      lowStockThreshold: 5,
      isCombo: false,
      comboItems: [],
      addOns: [],
      attachedAddOnGroupIds: [],
    });
    setIsItemOpen(true);
  };

  const handleApplyVariantPreset = (preset: 'HALF_FULL' | 'SML' | 'REG_LARGE') => {
    itemForm.setValue('pricingType', 'PORTION');
    if (preset === 'HALF_FULL') {
      replaceVariants([
        { name: 'Half', price: 150, isDefault: true },
        { name: 'Full', price: 280, isDefault: false },
      ]);
    } else if (preset === 'SML') {
      replaceVariants([
        { name: 'Small', price: 120, isDefault: false },
        { name: 'Medium', price: 180, isDefault: true },
        { name: 'Large', price: 240, isDefault: false },
      ]);
    } else if (preset === 'REG_LARGE') {
      replaceVariants([
        { name: 'Regular', price: 140, isDefault: true },
        { name: 'Large', price: 220, isDefault: false },
      ]);
    }
  };

  if (!restaurantId && user?.role !== 'SUPER_ADMIN' && !flagsLoading && !isEnabled('qr_menu')) {
    return <Navigate to="/manager" replace />;
  }

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto scrollbar-none space-y-3 sm:space-y-4 font-sans select-none pb-12 pr-0.5">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 md:px-5 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
        <div>
          <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">
            Menu &amp; Catalog Manager
          </h1>
          <p className="text-slate-500 text-[11px] font-medium mt-0.5">
            Portion-based multi pricing, combos builder, and reusable add-on templates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Global UI Text Size / Font Scale Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5 border border-slate-200" title="Global UI Font Size">
            <button
              type="button"
              onClick={() => setFontScale('SMALL')}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                fontScale === 'SMALL'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Small Text (81.25% - 13px Base)"
            >
              A⁻
            </button>
            <button
              type="button"
              onClick={() => setFontScale('NORMAL')}
              className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                fontScale === 'NORMAL'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Normal Text (87.5% - 14px Base)"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontScale('LARGE')}
              className={`px-2 py-1 rounded-lg text-sm font-black transition cursor-pointer ${
                fontScale === 'LARGE'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Large Text (100% - 16px Base)"
            >
              A⁺
            </button>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('MENU')}
              className={`h-10 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'MENU' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Menu Dishes</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMIZATIONS')}
              className={`h-10 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'CUSTOMIZATIONS' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Add-on Templates ({customGroups.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: MENU DISHES & CATEGORIES           */}
      {/* ========================================== */}
      {activeTab === 'MENU' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
          {/* Categories Sidebar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 sticky top-2 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="font-display text-base font-bold text-slate-900">Categories</h2>
              <button
                onClick={() => {
                  setEditingCat(null);
                  catForm.reset();
                  setIsCatOpen(true);
                }}
                className="h-8 flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 rounded-xl transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>New</span>
              </button>
            </div>

            {isLoadingCats ? (
              <div className="flex justify-center p-8">
                <Loader className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center p-8 text-xs text-slate-400">No categories found. Click + New above.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategories}>
                <SortableContext items={categories.map((c: any) => c._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {categories.map((cat: any) => (
                      <SortableItem key={cat._id} id={cat._id}>
                        {({ dragHandleProps }) => (
                          <div
                            onClick={() => setSelectedCatId(cat._id)}
                            className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer text-xs font-semibold transition ${
                              selectedCatId === cat._id
                                ? 'bg-slate-950 text-white shadow-sm font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span {...dragHandleProps} className="cursor-grab text-slate-400 hover:text-slate-600">
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              <span className="truncate">{cat.name}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={(e) => handleEditCatClick(cat, e)}
                                className="p-1 hover:bg-white/20 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this category and all associated items?')) {
                                    deleteCatMutation.mutate(cat._id);
                                  }
                                }}
                                className="p-1 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Menu Items List Workspace */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pb-3 pt-1 -mt-1 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {categories.find((c: any) => c._id === selectedCatId)?.name || 'Items'}
                </h2>
                <span className="text-xs text-slate-400 font-medium font-mono">{menuItems.length} dishes in this category</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`h-10 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 shadow-xs ${
                    bulkMode ? 'bg-amber-50 border-amber-300 text-amber-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {bulkMode ? 'Cancel Bulk' : 'Bulk Edit'}
                </button>
                <button
                  onClick={handleNewItemClick}
                  disabled={!selectedCatId}
                  className="h-10 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  <span>New Menu Item</span>
                </button>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {bulkMode && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-950 font-mono">
                  {selectedItemIds.length} items selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => bulkAvailableMutation.mutate({ ids: selectedItemIds, isAvailable: true })}
                    disabled={selectedItemIds.length === 0}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs disabled:opacity-40"
                  >
                    Make Available
                  </button>
                  <button
                    onClick={() => bulkAvailableMutation.mutate({ ids: selectedItemIds, isAvailable: false })}
                    disabled={selectedItemIds.length === 0}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs disabled:opacity-40"
                  >
                    Make 86'd
                  </button>
                </div>
              </div>
            )}

            {/* Items Grid / List */}
            {isLoadingItems ? (
              <div className="flex justify-center p-12">
                <Loader className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
                <p>No dishes in this category yet.</p>
                <button
                  onClick={handleNewItemClick}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Create First Dish
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
                <SortableContext items={menuItems.map((i: any) => i._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {menuItems.map((item: any) => {
                      const isPortion = item.pricingType === 'PORTION' && item.variants && item.variants.length > 0;
                      return (
                        <SortableItem key={item._id} id={item._id}>
                          {({ dragHandleProps }) => (
                            <div className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-white transition flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shadow-2xs">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {bulkMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.includes(item._id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedItemIds((prev) => [...prev, item._id]);
                                      } else {
                                        setSelectedItemIds((prev) => prev.filter((id) => id !== item._id));
                                      }
                                    }}
                                    className="mt-1 w-4 h-4 accent-amber-500 rounded"
                                  />
                                )}
                                <span {...dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-600 mt-1">
                                  <GripVertical className="w-4 h-4" />
                                </span>

                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-100"
                                  />
                                )}

                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                                    {item.isSpicy && <MenuBadge variant="spicy" />}
                                    {item.isCombo && (
                                      <span className="text-[9px] font-black uppercase text-amber-950 bg-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                                        Combo Pack
                                      </span>
                                    )}
                                  </div>

                                  {item.description && (
                                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                                  )}

                                  {/* Portion Variants Tags */}
                                  {isPortion && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {item.variants.map((v: any, vIdx: number) => (
                                        <span
                                          key={vIdx}
                                          className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                        >
                                          <span>{v.name}:</span>
                                          <strong className="font-mono">₹{(v.price / 100).toFixed(2)}</strong>
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Combo Bundled Items Summary */}
                                  {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                                    <p className="text-[10px] text-amber-800 font-medium">
                                      Includes: {item.comboItems.map((c: any) => `${c.quantity}x ${c.name}`).join(' + ')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Price and Action Buttons */}
                              <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                                {!isPortion && (
                                  <span className="font-mono font-black text-sm text-slate-900">
                                    ₹{(item.price / 100).toFixed(2)}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => toggleAvailableMutation.mutate(item._id)}
                                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    item.isAvailable
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {item.isAvailable ? 'Available' : "86'd"}
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewDish({
                                        ...item,
                                        price: (item.price || 0) / 100,
                                        variants: item.variants?.map((v: any) => ({ ...v, price: (v.price || 0) / 100 })),
                                        addOns: item.addOns?.map((a: any) => ({ ...a, priceDelta: (a.priceDelta || 0) / 100 })),
                                      });
                                      setPreviewMode('LIST');
                                    }}
                                    className="p-1.5 hover:bg-amber-50 rounded-xl text-amber-600 hover:text-amber-800 transition"
                                    title="Preview Customer View"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditItemClick(item)}
                                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition"
                                    title="Edit Dish"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete "${item.name}"?`)) {
                                        deleteItemMutation.mutate(item._id);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition"
                                    title="Delete Dish"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </SortableItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: REUSABLE CUSTOMIZATION TEMPLATES    */}
      {/* ========================================== */}
      {activeTab === 'CUSTOMIZATIONS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Customization & Add-on Templates</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Create reusable templates (e.g. Extra Cheese, Garlic Dip, Gulab Jamun) and easily connect them across dishes
              </p>
            </div>
            <button
              onClick={() => {
                groupForm.reset({
                  name: '',
                  type: 'ADDON',
                  description: '',
                  options: [{ name: '', priceDelta: 0, price: 0 }],
                  isGlobal: true,
                });
                setIsGroupModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Create Template</span>
            </button>
          </div>

          {isLoadingGroups ? (
            <div className="flex justify-center p-12">
              <Loader className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : customGroups.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
              <p>No reusable templates created yet.</p>
              <p className="text-[11px] text-slate-400">Templates save time when adding standard add-ons across multiple dishes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customGroups.map((group: any) => (
                <div key={group._id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full font-mono">
                        {group.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{group.name}</h4>
                      {group.description && <p className="text-xs text-slate-500">{group.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteGroupMutation.mutate(group._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Archive template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 text-xs">
                    {group.options.map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="py-1.5 flex justify-between items-center text-slate-700">
                        <span>{opt.name}</span>
                        <span className="font-mono font-bold text-slate-900">
                          +₹{((opt.priceDelta || opt.price || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Modal */}
      {isCatOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl font-bold text-slate-900">
                {editingCat ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setIsCatOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="Desserts"
                  {...catForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  placeholder="Sweet treats & baked delights..."
                  {...catForm.register('description')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Image</label>
                <ImageUploader
                  restaurantId={activeRestaurantId!}
                  value={catForm.watch('imageUrl')}
                  onChange={(url: string) => catForm.setValue('imageUrl', url)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCatOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  {editingCat ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Menu Item Modal with Portion Pricing, Combos, & Live Customer Preview */}
      {isItemOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-5 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
                </h2>
                <span className="text-xs text-slate-400">Configure dish details, portion variants, or combos</span>
              </div>
              <button onClick={() => setIsItemOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setItemModalTab('FORM')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                  itemModalTab === 'FORM' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Dish Configuration
              </button>
              <button
                type="button"
                onClick={() => setItemModalTab('PREVIEW')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  itemModalTab === 'PREVIEW' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Live Customer Preview</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                {errorMsg}
              </div>
            )}

            {itemModalTab === 'PREVIEW' ? (
              <div className="space-y-4">
                <CustomerDishPreview
                  item={itemForm.watch()}
                  previewMode={previewMode}
                  setPreviewMode={setPreviewMode}
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setItemModalTab('FORM')}
                    className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                  >
                    Back to Edit Form
                  </button>
                  <button
                    type="button"
                    onClick={itemForm.handleSubmit(
                      onItemSubmit,
                      (errors) => {
                        console.error('Validation errors:', errors);
                        const firstKey = Object.keys(errors)[0];
                        const firstErr: any = errors[firstKey];
                        const msg = firstErr?.message || firstErr?.name?.message || firstErr?.price?.message || 'Please check the required fields.';
                        toast(msg, 'error');
                        setItemModalTab('FORM');
                      }
                    )}
                    className="w-1/2 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs"
                  >
                    {editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={itemForm.handleSubmit(
                  onItemSubmit,
                  (errors) => {
                    console.error('Validation errors:', errors);
                    const firstKey = Object.keys(errors)[0];
                    const firstErr: any = errors[firstKey];
                    const msg = firstErr?.message || firstErr?.name?.message || firstErr?.price?.message || 'Please check the required fields.';
                    toast(msg, 'error');
                  }
                )}
                className="space-y-5"
              >
                {/* Item Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dish Name</label>
                  <input
                    type="text"
                    placeholder="Paneer Butter Masala"
                    {...itemForm.register('name')}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                {/* PRICING MODE SELECTOR */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-amber-950">Pricing Model</label>
                    <div className="flex gap-1 p-0.5 bg-amber-100/80 rounded-xl border border-amber-300/80 text-xs">
                      <button
                        type="button"
                        onClick={() => itemForm.setValue('pricingType', 'SINGLE')}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          itemForm.watch('pricingType') === 'SINGLE' ? 'bg-slate-950 text-white shadow-xs' : 'text-amber-900'
                        }`}
                      >
                        Single Price
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          itemForm.setValue('pricingType', 'PORTION');
                          if (variantFields.length === 0) {
                            handleApplyVariantPreset('HALF_FULL');
                          }
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          itemForm.watch('pricingType') === 'PORTION' ? 'bg-slate-950 text-white shadow-xs' : 'text-amber-900'
                        }`}
                      >
                        Portion Sizes (Half/Full)
                      </button>
                    </div>
                  </div>

                  {itemForm.watch('pricingType') === 'SINGLE' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Price (INR)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="280.00"
                        {...itemForm.register('price')}
                        className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Quick Presets Bar */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-900">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyVariantPreset('HALF_FULL')}
                          className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-bold rounded-lg border border-amber-300 transition cursor-pointer"
                        >
                          + Half / Full
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyVariantPreset('SML')}
                          className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-bold rounded-lg border border-amber-300 transition cursor-pointer"
                        >
                          + Small / Med / Large
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyVariantPreset('REG_LARGE')}
                          className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-bold rounded-lg border border-amber-300 transition cursor-pointer"
                        >
                          + Regular / Large
                        </button>
                      </div>

                      {/* Variant Rows */}
                      <div className="space-y-2">
                        {variantFields.map((field, vIdx) => (
                          <div key={field.id} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200/80">
                            <input
                              type="text"
                              placeholder="Size (e.g. Half)"
                              {...itemForm.register(`variants.${vIdx}.name` as const)}
                              className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price (INR)"
                              {...itemForm.register(`variants.${vIdx}.price` as const)}
                              className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(vIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => appendVariant({ name: '', price: 0, isDefault: false })}
                          className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Custom Size Option</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* COMBOS BUNDLE BUILDER SECTION */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isComboToggle"
                      {...itemForm.register('isCombo')}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <label htmlFor="isComboToggle" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Bundle as Multi-Dish Combo (e.g. Garlic Naan + Paneer Butter Masala)
                    </label>
                  </div>

                  {itemForm.watch('isCombo') && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[11px] text-slate-500">
                        Add items included in this combo pack:
                      </p>
                      {comboFields.map((cField, cIdx) => (
                        <div key={cField.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            placeholder="Dish name (e.g. Garlic Naan)"
                            {...itemForm.register(`comboItems.${cIdx}.name` as const)}
                            className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty (e.g. 2)"
                            {...itemForm.register(`comboItems.${cIdx}.quantity` as const)}
                            className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          />
                          <input
                            type="text"
                            placeholder="Category (e.g. Breads)"
                            {...itemForm.register(`comboItems.${cIdx}.categoryName` as const)}
                            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => removeComboItem(cIdx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => appendComboItem({ name: '', quantity: 1, categoryName: '' })}
                        className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Bundled Item</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea
                    placeholder="Spiced cottage cheese chunks simmered in rich tomato butter gravy..."
                    {...itemForm.register('description')}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-16"
                  />
                </div>

                {/* Dietary Indicators with FSSAI Badges */}
                <div className="grid grid-cols-3 gap-3">
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${
                    itemForm.watch('isVegetarian') ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'border-slate-200 bg-white text-slate-700'
                  }`}>
                    <input type="checkbox" {...itemForm.register('isVegetarian')} className="hidden" />
                    <MenuBadge variant="veg" />
                    <span className="text-xs">Vegetarian</span>
                  </label>

                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${
                    itemForm.watch('isSpicy') ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold' : 'border-slate-200 bg-white text-slate-700'
                  }`}>
                    <input type="checkbox" {...itemForm.register('isSpicy')} className="hidden" />
                    <Flame className="w-4 h-4 text-rose-500" strokeWidth={2} />
                    <span className="text-xs">Spicy</span>
                  </label>

                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${
                    itemForm.watch('isChefsSpecial') ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold' : 'border-slate-200 bg-white text-slate-700'
                  }`}>
                    <input type="checkbox" {...itemForm.register('isChefsSpecial')} className="hidden" />
                    <span className="text-xs">Chef's Special</span>
                  </label>

                  {isEnabled('ordering') && (
                    <div>
                      <input
                        type="number"
                        placeholder="15 mins prep"
                        {...itemForm.register('prepTimeMinutes')}
                        className="w-full px-3 py-3 border-2 border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Image Uploader */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dish Image</label>
                  <ImageUploader
                    restaurantId={activeRestaurantId!}
                    value={itemForm.watch('imageUrl')}
                    onChange={(url: string) => itemForm.setValue('imageUrl', url)}
                  />
                </div>

                {/* Add-On Customizations Repeater */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Custom Add-Ons (Specific to this dish)</span>
                    <button
                      type="button"
                      onClick={() => appendAddOn({ name: '', priceDelta: 0 })}
                      className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Add-on</span>
                    </button>
                  </div>

                  {addOnFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="e.g. Extra Butter"
                        {...itemForm.register(`addOns.${index}.name` as const)}
                        className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Extra Price (INR)"
                        {...itemForm.register(`addOns.${index}.priceDelta` as const)}
                        className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removeAddOn(index)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Reusable Modifier / Customization Groups */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Reusable Modifier Groups</span>
                      <span className="text-[10px] text-slate-400">Attach pre-configured modifier templates (e.g. Crusts, Dips, Sizes)</span>
                    </div>
                    {customGroups.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemOpen(false);
                          setActiveTab('CUSTOMIZATIONS');
                          setIsGroupModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Template</span>
                      </button>
                    )}
                  </div>

                  {customGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customGroups.map((group: any) => {
                        const currentAttached: string[] = itemForm.watch('attachedAddOnGroupIds') || [];
                        const isAttached = currentAttached.includes(group._id);
                        return (
                          <button
                            key={group._id}
                            type="button"
                            onClick={() => {
                              if (isAttached) {
                                itemForm.setValue('attachedAddOnGroupIds', currentAttached.filter((id) => id !== group._id));
                              } else {
                                itemForm.setValue('attachedAddOnGroupIds', [...currentAttached, group._id]);
                              }
                            }}
                            className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                              isAttached
                                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-amber-950'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-xs block truncate">{group.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {group.options?.length || 0} options • {group.selectionType === 'SINGLE' ? 'Single' : 'Multi'}
                              </span>
                            </div>
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs shrink-0 ${
                              isAttached ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isAttached && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                      <p className="text-xs text-slate-500">No reusable modifier groups created yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemOpen(false);
                          setActiveTab('CUSTOMIZATIONS');
                          setIsGroupModalOpen(true);
                        }}
                        className="mt-1.5 text-xs font-bold text-amber-600 hover:underline"
                      >
                        + Create your first modifier template
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsItemOpen(false)}
                    className="w-1/4 py-3 border border-slate-200 text-slate-600 text-xs font-semibold rounded-2xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemModalTab('PREVIEW')}
                    className="w-1/3 py-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Preview Card</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition shadow-md cursor-pointer"
                  >
                    {editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Standalone Customer Dish Preview Modal */}
      {previewDish && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>Customer Experience Preview</span>
                </h2>
                <p className="text-[11px] text-slate-400">Live diner view for "{previewDish.name}"</p>
              </div>
              <button onClick={() => setPreviewDish(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <CustomerDishPreview
              item={previewDish}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
            />

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPreviewDish(null)}
                className="w-full py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customization Group Template Modal */}
      {isGroupModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4 my-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-display text-xl font-bold text-slate-900">New Add-On Template</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={groupForm.handleSubmit((values: any) => {
                createGroupMutation.mutate({
                  ...values,
                  options: values.options.map((opt: any) => ({
                    name: opt.name.trim(),
                    priceDelta: Math.round(Number(opt.priceDelta || 0) * 100),
                  })),
                });
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Extra Dips & Sauces"
                  {...groupForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Options List</label>
                <div className="space-y-2">
                  {groupOptionFields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Option name"
                        {...groupForm.register(`options.${idx}.name` as const)}
                        className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price (INR)"
                        {...groupForm.register(`options.${idx}.priceDelta` as const)}
                        className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removeGroupOption(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => appendGroupOption({ name: '', priceDelta: 0, price: 0 })}
                    className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default ManagerMenu;
