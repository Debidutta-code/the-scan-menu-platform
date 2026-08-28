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
  MoreVertical,
  Search,
  Package,
  Clock,
  AlertCircle,
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

  // ── New UI state ───────────────────────────────────────────────────────────
  const [activeItemInspector, setActiveItemInspector] = useState<any | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'OVERVIEW' | 'VARIANTS' | 'ADDONS' | 'INVENTORY'>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch ALL Menu Items for global search and high-speed category switching
  const { data: itemsResponse, isLoading: isLoadingItems } = useQuery({
    queryKey: ['menuItems', targetRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${targetRestaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!targetRestaurantId,
  });

  const allMenuItems = useMemo(() => itemsResponse?.data || [], [itemsResponse]);

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
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
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
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
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
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
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
      await queryClient.cancelQueries({ queryKey: ['menuItems', targetRestaurantId] });
      const previous = queryClient.getQueryData(['menuItems', targetRestaurantId]);

      queryClient.setQueryData(['menuItems', targetRestaurantId], (old: any) => {
        if (!old) return old;
        const otherItems = old.data.filter((item: any) => {
          const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
          return cId !== selectedCatId;
        });
        const currentCategoryItems = old.data.filter((item: any) => {
          const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
          return cId === selectedCatId;
        });
        const sorted = [...currentCategoryItems].sort((a, b) => {
          return itemIds.indexOf(a._id) - itemIds.indexOf(b._id);
        });
        return { ...old, data: [...otherItems, ...sorted] };
      });

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
    },
  });

  const handleDragEndItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && selectedCatId) {
      const catItems = allMenuItems.filter((i: any) => {
        const cId = typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId;
        return cId === selectedCatId;
      });
      const oldIndex = catItems.findIndex((i: any) => i._id === active.id);
      const newIndex = catItems.findIndex((i: any) => i._id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(catItems, oldIndex, newIndex);
        reorderItemsMutation.mutate(reordered.map((i: any) => i._id));
      }
    }
  };

  // Optimistic Toggle for availability
  const toggleAvailableMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items/${id}/availability`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['menuItems', targetRestaurantId] });
      const previousItems = queryClient.getQueryData(['menuItems', targetRestaurantId]);

      queryClient.setQueryData(
        ['menuItems', targetRestaurantId],
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

      if (activeItemInspector?._id === id) {
        setActiveItemInspector((prev: any) => prev ? { ...prev, isAvailable: !prev.isAvailable } : null);
      }

      return { previousItems };
    },
    onError: (_err, _id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['menuItems', targetRestaurantId],
          context.previousItems
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
    },
  });

  // Direct Stock Update Mutation
  const updateStockMutation = useMutation({
    mutationFn: ({
      itemId,
      stockQuantity,
      trackStock,
      lowStockThreshold,
    }: {
      itemId: string;
      stockQuantity: number;
      trackStock?: boolean;
      lowStockThreshold?: number;
    }) =>
      apiClient.patch(`/restaurants/${targetRestaurantId}/menu-items/${itemId}/stock`, {
        stockQuantity,
        trackStock: trackStock !== undefined ? trackStock : true,
        lowStockThreshold,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
      if (activeItemInspector && res.data?.data) {
        setActiveItemInspector(res.data.data);
      }
      toast('Stock updated successfully', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error updating stock', 'error');
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
      queryClient.invalidateQueries({ queryKey: ['menuItems', targetRestaurantId] });
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

  // ── Global & Category Filtering ──────────────────────────────────────────
  const isSearching = searchQuery.trim().length > 0;

  const filteredMenuItems = useMemo(() => {
    if (isSearching) {
      const q = searchQuery.toLowerCase().trim();
      return allMenuItems.filter((item: any) => {
        const catName = typeof item.categoryId === 'object' ? item.categoryId?.name : '';
        return (
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          catName?.toLowerCase().includes(q) ||
          item.variants?.some((v: any) => v.name?.toLowerCase().includes(q))
        );
      });
    }
    if (!selectedCatId) return [];
    return allMenuItems.filter((item: any) => {
      const cId = typeof item.categoryId === 'object' ? item.categoryId?._id : item.categoryId;
      return cId === selectedCatId;
    });
  }, [allMenuItems, selectedCatId, isSearching, searchQuery]);

  if (!restaurantId && user?.role !== 'SUPER_ADMIN' && !flagsLoading && !isEnabled('qr_menu')) {
    return <Navigate to="/manager" replace />;
  }

  return (
    <div
      className="w-full h-full min-h-0 overflow-y-auto scrollbar-none space-y-2.5 font-sans select-none pb-2 pr-0.5"
      onClick={() => setOpenMenuId(null)}
    >

      {/* ── Page Header (Scrolls naturally with page) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:px-5 rounded-2xl border border-slate-200/80 shadow-xs shrink-0 transition-all">
        <div>
          <h1 className="font-display tracking-tight text-lg sm:text-xl font-bold text-slate-900 leading-tight">Menu &amp; Catalog Manager</h1>
          <p className="text-slate-500 text-[11px] font-medium mt-0.5">Manage dishes, categories, pricing and modifier templates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Tab switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('MENU')}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'MENU' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Menu Dishes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMIZATIONS')}
              className={`h-9 flex items-center gap-2 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'CUSTOMIZATIONS' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Add-on Templates{customGroups.length > 0 ? ` (${customGroups.length})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB 1: MENU DISHES (Sticky 3-Column Area)  */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'MENU' && (
        <div className="sticky top-0 z-10 flex gap-3 items-start h-[calc(100vh-5.25rem)]">

          {/* ── Column 1: Category Sidebar ── */}
          <div className="w-56 xl:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden">
            <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-sm text-slate-900">Categories</h2>
              <span className="text-[11px] font-mono font-black text-slate-400">{categories.length}</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-2">
              {isLoadingCats ? (
                <div className="flex justify-center py-8"><Loader className="w-5 h-5 animate-spin text-amber-500" /></div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No categories yet.<br />Click below to add one.</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategories}>
                  <SortableContext items={categories.map((c: any) => c._id)} strategy={verticalListSortingStrategy}>
                    {categories.map((cat: any) => {
                      const isActive = selectedCatId === cat._id && !isSearching;
                      const catItemCount = allMenuItems.filter((i: any) => {
                        const cId = typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId;
                        return cId === cat._id;
                      }).length;

                      return (
                        <SortableItem key={cat._id} id={cat._id}>
                          {({ dragHandleProps }) => (
                            <div
                              onClick={() => { setSelectedCatId(cat._id); setActiveItemInspector(null); setSearchQuery(''); }}
                              className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer text-xs font-semibold transition mb-0.5 ${
                                isActive ? 'bg-slate-950 text-white shadow-xs' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span
                                {...dragHandleProps}
                                onClick={(e) => e.stopPropagation()}
                                className={`cursor-grab shrink-0 ${isActive ? 'text-white/30' : 'text-slate-300 group-hover:text-slate-400'}`}
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              {cat.imageUrl ? (
                                <img src={cat.imageUrl} alt={cat.name} className="w-6 h-6 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center ${isActive ? 'bg-white/10' : 'bg-slate-100'}`}>
                                  <FolderOpen className={`w-3 h-3 ${isActive ? 'text-white/50' : 'text-slate-400'}`} />
                                </div>
                              )}
                              <span className="truncate flex-1 leading-tight">{cat.name}</span>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200/80 group-hover:text-slate-600'
                              }`}>
                                {catItemCount}
                              </span>
                              <button
                                onClick={(e) => handleEditCatClick(cat, e)}
                                className={`p-1 rounded-lg transition cursor-pointer opacity-0 group-hover:opacity-100 shrink-0 ${
                                  isActive ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-slate-200 text-slate-300 hover:text-slate-600'
                                }`}
                                title="Edit category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </SortableItem>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-slate-100 shrink-0 space-y-2">
              <div className="grid grid-cols-2 gap-1.5 text-center">
                <div className="bg-slate-50 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400 font-medium">Categories</div>
                  <div className="text-base font-black text-slate-900 font-mono">{categories.length}</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-2">
                  <div className="text-[10px] text-amber-700 font-medium">Live Items</div>
                  <div className="text-base font-black text-amber-900 font-mono">
                    {allMenuItems.filter((i: any) => i.isAvailable).length}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setEditingCat(null); catForm.reset(); setIsCatOpen(true); }}
                className="w-full h-9 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add New Category
              </button>
            </div>
          </div>

          {/* ── Column 2: Items Table Panel ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden">

            {/* Panel Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 shrink-0">
              <div className="min-w-0 mr-2">
                <h2 className="font-bold text-sm text-slate-900 leading-tight truncate flex items-center gap-1.5">
                  {isSearching ? (
                    <>
                      <span>Search Results</span>
                      <span className="text-xs font-normal text-amber-600 font-mono">(&ldquo;{searchQuery}&rdquo;)</span>
                    </>
                  ) : (
                    categories.find((c: any) => c._id === selectedCatId)?.name || 'Select a category'
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium font-mono">
                  {filteredMenuItems.length} {filteredMenuItems.length === 1 ? 'item' : 'items'}
                  {filteredMenuItems.filter((i: any) => !i.isAvailable).length > 0 && (
                    <span className="text-rose-500 ml-1.5">· {filteredMenuItems.filter((i: any) => !i.isAvailable).length} unavailable</span>
                  )}
                </p>
              </div>

              {/* Global Search Input */}
              <div className="relative ml-auto sm:ml-0" onClick={(e) => e.stopPropagation()}>
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
                <input
                  type="text"
                  placeholder="Global search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setBulkMode(!bulkMode); setSelectedItemIds([]); }}
                  className={`h-8 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    bulkMode ? 'bg-amber-50 border-amber-300 text-amber-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {bulkMode ? 'Cancel' : 'Bulk Edit'}
                </button>
                <button
                  onClick={handleNewItemClick}
                  disabled={!selectedCatId && !isSearching}
                  className="h-8 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 rounded-xl text-xs transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  New Item
                </button>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {bulkMode && (
              <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between text-xs shrink-0">
                <span className="font-bold text-amber-950">
                  {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedItemIds(filteredMenuItems.map((i: any) => i._id))}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => { if (selectedItemIds.length > 0) bulkAvailableMutation.mutate({ ids: selectedItemIds, isAvailable: true }); }}
                    disabled={selectedItemIds.length === 0}
                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Make Available
                  </button>
                  <button
                    onClick={() => { if (selectedItemIds.length > 0) bulkAvailableMutation.mutate({ ids: selectedItemIds, isAvailable: false }); }}
                    disabled={selectedItemIds.length === 0}
                    className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Mark 86&apos;d
                  </button>
                </div>
              </div>
            )}

            {/* Column Header (Adapts when inspector is open) */}
            <div className={`grid items-center px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 gap-3 shrink-0 ${
              activeItemInspector
                ? bulkMode ? 'grid-cols-[16px_16px_1fr_72px]' : 'grid-cols-[16px_1fr_72px]'
                : bulkMode ? 'grid-cols-[16px_16px_1fr_80px_52px_110px_32px]' : 'grid-cols-[16px_1fr_80px_52px_110px_32px]'
            }`}>
              {bulkMode && (
                <input
                  type="checkbox"
                  checked={selectedItemIds.length === filteredMenuItems.length && filteredMenuItems.length > 0}
                  onChange={(e) => setSelectedItemIds(e.target.checked ? filteredMenuItems.map((i: any) => i._id) : [])}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              )}
              <div /> {/* drag handle col */}
              <div>Item</div>
              <div className="text-right">Price</div>
              {!activeItemInspector && (
                <>
                  <div className="text-right">Stock</div>
                  <div className="text-center">Status</div>
                  <div />
                </>
              )}
            </div>

            {/* Items Rows (Independently Scrollable Container) */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none divide-y divide-slate-100">
              {isLoadingItems ? (
                <div className="flex justify-center py-16"><Loader className="w-7 h-7 animate-spin text-amber-500" /></div>
              ) : !selectedCatId && !isSearching ? (
                <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                  <FolderOpen className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  <p>Select a category to view its items</p>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400 space-y-3">
                  {isSearching ? (
                    <>
                      <p>No menu items matched &ldquo;<strong>{searchQuery}</strong>&rdquo; across all categories.</p>
                      <button onClick={() => setSearchQuery('')} className="text-amber-600 font-bold hover:underline cursor-pointer">Clear global search</button>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                      <p>No dishes in this category yet.</p>
                      <button onClick={handleNewItemClick} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-800 transition">Create First Dish</button>
                    </>
                  )}
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
                  <SortableContext items={filteredMenuItems.map((i: any) => i._id)} strategy={verticalListSortingStrategy}>
                    {filteredMenuItems.map((item: any) => {
                      const isPortion = item.pricingType === 'PORTION' && item.variants?.length > 0;
                      const isSelected = selectedItemIds.includes(item._id);
                      const isInspecting = activeItemInspector?._id === item._id;
                      const isInspectorOpen = !!activeItemInspector;
                      const minPrice = isPortion ? Math.min(...item.variants.map((v: any) => v.price)) : item.price;
                      const isMenuOpen = openMenuId === item._id;
                      const isAvailable = item.isAvailable !== false;
                      const categoryName = typeof item.categoryId === 'object' ? item.categoryId?.name : categories.find((c: any) => c._id === item.categoryId)?.name;

                      return (
                        <SortableItem key={item._id} id={item._id}>
                          {({ dragHandleProps }) => (
                            <div
                              className={`group grid items-center px-4 py-2.5 gap-3 transition cursor-pointer border-l-3 ${
                                isInspectorOpen
                                  ? bulkMode ? 'grid-cols-[16px_16px_1fr_72px]' : 'grid-cols-[16px_1fr_72px]'
                                  : bulkMode ? 'grid-cols-[16px_16px_1fr_80px_52px_110px_32px]' : 'grid-cols-[16px_1fr_80px_52px_110px_32px]'
                              } ${
                                isInspecting
                                  ? 'bg-amber-50/70 border-amber-500'
                                  : !isAvailable
                                  ? 'bg-slate-50/80 hover:bg-slate-100/70 border-rose-300'
                                  : 'hover:bg-slate-50/70 border-transparent'
                              }`}
                              onClick={() => {
                                if (!bulkMode) {
                                  setActiveItemInspector(isInspecting ? null : item);
                                  setInspectorTab('OVERVIEW');
                                  setOpenMenuId(null);
                                }
                              }}
                            >
                              {/* Checkbox (bulk) */}
                              {bulkMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) setSelectedItemIds(prev => [...prev, item._id]);
                                    else setSelectedItemIds(prev => prev.filter(id => id !== item._id));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                                />
                              )}

                              {/* Drag handle */}
                              <span
                                {...dragHandleProps}
                                onClick={(e) => e.stopPropagation()}
                                className={`cursor-grab transition ${isSearching ? 'opacity-20 cursor-not-allowed' : 'text-slate-300 group-hover:text-slate-400'}`}
                                title={isSearching ? 'Reordering disabled during global search' : 'Drag to reorder'}
                              >
                                <GripVertical className="w-4 h-4" />
                              </span>

                              {/* Item info: name, description, time, veg/nonveg */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100 relative">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className={`w-full h-full object-cover transition duration-150 ${!isAvailable ? 'grayscale-[50%] opacity-75' : ''}`}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                                    <span className={`text-sm font-bold leading-tight ${!isAvailable ? 'text-slate-700' : 'text-slate-900'}`}>
                                      {item.name}
                                    </span>
                                    {!isAvailable && (
                                      <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.2 rounded-md">
                                        86&apos;d
                                      </span>
                                    )}
                                    {item.isSpicy && <MenuBadge variant="spicy" />}
                                    {item.isChefsSpecial && (
                                      <span className="text-[9px] font-black uppercase text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded-full">Special</span>
                                    )}
                                    {item.isCombo && (
                                      <span className="text-[9px] font-black uppercase text-violet-900 bg-violet-100 px-1.5 py-0.5 rounded-full">Combo</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {isSearching && categoryName && (
                                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                                        <FolderOpen className="w-2.5 h-2.5 text-slate-400" />
                                        {categoryName}
                                      </span>
                                    )}
                                    {item.description && (
                                      <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{item.description}</p>
                                    )}
                                    {item.prepTimeMinutes && (
                                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />{item.prepTimeMinutes} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                {isPortion ? (
                                  <div>
                                    <span className="text-[10px] text-slate-400 block leading-tight">From</span>
                                    <span className="text-sm font-black text-slate-900 font-mono">₹{(minPrice / 100).toFixed(0)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-black text-slate-900 font-mono">₹{(item.price / 100).toFixed(0)}</span>
                                )}
                              </div>

                              {/* Stock, Toggle, 3-dot (Omitted when 3rd column is open) */}
                              {!isInspectorOpen && (
                                <>
                                  {/* Stock */}
                                  <div className="text-right">
                                    {item.trackStock ? (
                                      <div>
                                        <span className={`text-sm font-black font-mono ${
                                          item.stockQuantity === 0 ? 'text-rose-600' :
                                          item.stockQuantity <= (item.lowStockThreshold || 5) ? 'text-amber-600' :
                                          'text-emerald-700'
                                        }`}>{item.stockQuantity}</span>
                                        {item.stockQuantity <= (item.lowStockThreshold || 5) && item.stockQuantity > 0 && (
                                          <span className="text-[9px] font-bold text-amber-600 block leading-tight">Low</span>
                                        )}
                                        {item.stockQuantity === 0 && (
                                          <span className="text-[9px] font-bold text-rose-600 block leading-tight">Out</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-300 font-mono">—</span>
                                    )}
                                  </div>

                                  {/* Status Toggle Switch */}
                                  <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={isAvailable}
                                      onClick={() => toggleAvailableMutation.mutate(item._id)}
                                      title={isAvailable ? "Click to 86 / mark unavailable" : "Click to make available"}
                                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                                        isAvailable ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 hover:bg-slate-400'
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-150 ease-in-out ${
                                          isAvailable ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                    <span className={`text-[11px] font-bold w-14 text-left select-none ${
                                      isAvailable ? 'text-emerald-700' : 'text-slate-400'
                                    }`}>
                                      {isAvailable ? 'Available' : '86\'d'}
                                    </span>
                                  </div>

                                  {/* ⋯ Overflow menu */}
                                  <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => setOpenMenuId(isMenuOpen ? null : item._id)}
                                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition cursor-pointer ${
                                        isMenuOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                      }`}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {isMenuOpen && (
                                      <div className="absolute right-0 top-9 z-40 bg-white border border-slate-200 rounded-xl shadow-xl w-44 py-1 overflow-hidden">
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setPreviewDish({
                                              ...item,
                                              price: (item.price || 0) / 100,
                                              variants: item.variants?.map((v: any) => ({ ...v, price: (v.price || 0) / 100 })),
                                              addOns: item.addOns?.map((a: any) => ({ ...a, priceDelta: (a.priceDelta || 0) / 100 })),
                                            });
                                            setPreviewMode('LIST');
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                          Customer Preview
                                        </button>
                                        <button
                                          onClick={() => { setOpenMenuId(null); handleEditItemClick(item); }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                        >
                                          <Edit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          Edit Details
                                        </button>
                                        <div className="h-px bg-slate-100 my-0.5" />
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            if (confirm(`Delete "${item.name}"?\n\nThis cannot be undone. Items with order history will be archived instead.`)) {
                                              if (activeItemInspector?._id === item._id) setActiveItemInspector(null);
                                              deleteItemMutation.mutate(item._id);
                                            }
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                          Delete Item
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </SortableItem>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Middle Panel Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between shrink-0">
              <span>
                Showing {filteredMenuItems.length} of {allMenuItems.length} {allMenuItems.length === 1 ? 'item' : 'items'}
                {isSearching && ' (Global Search)'}
              </span>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-amber-600 font-bold hover:underline cursor-pointer">Clear search</button>
              )}
            </div>
          </div>

          {/* ── Column 3: Item Inspector Panel ── */}
          {activeItemInspector && (() => {
            const item = activeItemInspector;
            const isPortion = item.pricingType === 'PORTION' && item.variants?.length > 0;
            const minPrice = isPortion ? Math.min(...item.variants.map((v: any) => v.price)) : item.price;
            const attachedGroups = customGroups.filter((g: any) => item.attachedAddOnGroupIds?.includes(g._id));
            const isAvailable = item.isAvailable !== false;

            return (
              <div className="w-80 xl:w-96 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden">
                {/* Inspector Header */}
                <div className="px-4 py-3.5 border-b border-slate-100 shrink-0 bg-slate-50/60">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Sparkles className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">{item.name}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item._id?.slice(-8)}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                          {item.isSpicy && <MenuBadge variant="spicy" />}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>{isAvailable ? 'Active' : "86'd"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveItemInspector(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                        {isPortion ? `From · ${item.variants.length} portions` : 'Price'}
                      </span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {isPortion ? `₹${(minPrice / 100).toFixed(0)}` : `₹${(item.price / 100).toFixed(0)}`}
                      </span>
                    </div>
                    {/* Interactive Switch in Header */}
                    <button
                      type="button"
                      onClick={() => toggleAvailableMutation.mutate(item._id)}
                      className={`h-8 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {isAvailable ? 'Available' : "86'd"}
                    </button>
                  </div>
                </div>

                {/* Inspector Tabs */}
                <div className="flex border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
                  {(['OVERVIEW', 'VARIANTS', 'ADDONS', 'INVENTORY'] as const).map((tab) => {
                    const label =
                      tab === 'OVERVIEW' ? 'Overview' :
                      tab === 'VARIANTS' ? `Portions${isPortion ? ` (${item.variants.length})` : ''}` :
                      tab === 'ADDONS' ? `Add-Ons${(item.addOns?.length || 0) + attachedGroups.length > 0 ? ` (${(item.addOns?.length || 0) + attachedGroups.length})` : ''}` :
                      'Inventory';
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setInspectorTab(tab)}
                        className={`flex-shrink-0 px-3.5 py-2.5 text-[11px] font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                          inspectorTab === tab
                            ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Inspector Tab Content (Independently Scrollable Container) */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-4">

                  {/* ── OVERVIEW TAB ── */}
                  {inspectorTab === 'OVERVIEW' && (
                    <>
                      {item.description && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                        </div>
                      )}

                      {(item.isChefsSpecial || item.isCombo || item.prepTimeMinutes) && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Properties</p>
                          <div className="grid grid-cols-2 gap-2">
                            {item.isChefsSpecial && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-bold text-amber-900">Chef&apos;s Special</span>
                              </div>
                            )}
                            {item.isCombo && (
                              <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5 flex items-center gap-2">
                                <Package className="w-4 h-4 text-violet-500 shrink-0" />
                                <span className="text-xs font-bold text-violet-900">Combo Pack</span>
                              </div>
                            )}
                            {item.prepTimeMinutes && (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">{item.prepTimeMinutes} min prep</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {item.isCombo && item.comboItems?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bundled Items</p>
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {item.comboItems.map((c: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                                <span className="text-slate-700 font-medium">{c.name}</span>
                                <span className="font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-lg">×{c.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mini customer card preview */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Card Preview</p>
                        <div className="bg-[#FAF9F6] border border-slate-200 rounded-2xl p-3">
                          <div className="flex gap-3 items-start">
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200"><Sparkles className="w-6 h-6" /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                                <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                              </div>
                              {item.description && <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{item.description}</p>}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  {isPortion ? `From ₹${(minPrice / 100).toFixed(0)}` : `₹${(item.price / 100).toFixed(0)}`}
                                </span>
                                <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg">+ Add</span>
                              </div>
                            </div>
                          </div>
                        </div>
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
                          className="w-full mt-2 h-8 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-500" />
                          Full Customer Preview
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── VARIANTS TAB ── */}
                  {inspectorTab === 'VARIANTS' && (
                    <>
                      {!isPortion ? (
                        <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                          <p className="font-medium">Single pricing model</p>
                          <p className="text-2xl font-black text-slate-800 font-mono">₹{(item.price / 100).toFixed(2)}</p>
                          <button onClick={() => handleEditItemClick(item)} className="text-amber-600 font-bold hover:underline cursor-pointer">Edit to add portion sizes</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Portion Sizes</p>
                          {item.variants.map((v: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">{v.name}</span>
                                {v.isDefault && <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Default</span>}
                              </div>
                              <span className="font-mono font-black text-slate-900">₹{(v.price / 100).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── ADD-ONS TAB ── */}
                  {inspectorTab === 'ADDONS' && (
                    <>
                      {item.addOns?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dish-Specific Add-Ons</p>
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                            {item.addOns.map((addon: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                                <span className="text-slate-700 font-medium">{addon.name}</span>
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                  +₹{((addon.priceDelta || 0) / 100).toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {attachedGroups.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Modifier Templates</p>
                          <div className="space-y-2">
                            {attachedGroups.map((group: any) => (
                              <div key={group._id} className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                  <span className="text-xs font-bold text-slate-900">{group.name}</span>
                                  <span className="text-[9px] font-black uppercase text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded-full">{group.type}</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {group.options.map((opt: any, oIdx: number) => (
                                    <div key={oIdx} className="flex items-center justify-between px-3 py-1.5 text-xs">
                                      <span className="text-slate-600">{opt.name}</span>
                                      <span className="font-mono font-bold text-slate-700">+₹{((opt.priceDelta || opt.price || 0) / 100).toFixed(0)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!item.addOns?.length && !attachedGroups.length && (
                        <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                          <Sliders className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                          <p>No add-ons attached to this item.</p>
                          <button onClick={() => handleEditItemClick(item)} className="text-amber-600 font-bold hover:underline cursor-pointer">Add customizations</button>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── INVENTORY TAB (Interactive Stock Manager) ── */}
                  {inspectorTab === 'INVENTORY' && (
                    <>
                      {item.trackStock ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Stock Tracking</span>
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Enabled</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className={`text-center p-4 rounded-2xl border ${
                              item.stockQuantity === 0 ? 'bg-rose-50 border-rose-200' :
                              item.stockQuantity <= (item.lowStockThreshold || 5) ? 'bg-amber-50 border-amber-200' :
                              'bg-emerald-50/60 border-emerald-200'
                            }`}>
                              <div className="text-3xl font-black font-mono text-slate-900">{item.stockQuantity}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">In Stock</div>
                            </div>
                            <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
                              <div className="text-3xl font-black font-mono text-amber-600">{item.lowStockThreshold || 5}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Alert Level</div>
                            </div>
                          </div>

                          {/* Quick Adjust Buttons */}
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Stock Adjust</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[-5, -1, +1, +5].map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  onClick={() => updateStockMutation.mutate({
                                    itemId: item._id,
                                    stockQuantity: Math.max(0, (item.stockQuantity || 0) + delta),
                                    trackStock: true,
                                    lowStockThreshold: item.lowStockThreshold || 5,
                                  })}
                                  className="py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-800 transition cursor-pointer active:scale-95"
                                >
                                  {delta > 0 ? `+${delta}` : delta}
                                </button>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => updateStockMutation.mutate({
                                  itemId: item._id,
                                  stockQuantity: 0,
                                  trackStock: true,
                                  lowStockThreshold: item.lowStockThreshold || 5,
                                })}
                                className="py-2 rounded-xl border border-rose-200 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              >
                                Set Out (0)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStockMutation.mutate({
                                  itemId: item._id,
                                  stockQuantity: 20,
                                  trackStock: true,
                                  lowStockThreshold: item.lowStockThreshold || 5,
                                })}
                                className="py-2 rounded-xl border border-emerald-200 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                Restock (+20)
                              </button>
                            </div>
                          </div>

                          {item.stockQuantity <= (item.lowStockThreshold || 5) && (
                            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                {item.stockQuantity === 0
                                  ? 'Out of stock. Customers will see this item marked unavailable.'
                                  : `Low stock alert — remaining count (${item.stockQuantity}) is below threshold (${item.lowStockThreshold || 5}).`}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-400 space-y-3">
                          <Package className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                          <p className="font-medium text-slate-700">Stock tracking is disabled for this dish</p>
                          <p className="text-slate-400 max-w-[220px] mx-auto text-[11px]">Enable stock tracking to monitor inventory and prevent orders when depleted.</p>
                          <button
                            type="button"
                            onClick={() => updateStockMutation.mutate({
                              itemId: item._id,
                              trackStock: true,
                              stockQuantity: 25,
                              lowStockThreshold: 5,
                            })}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Enable Stock Tracking (Start with 25)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Inspector Footer */}
                <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex gap-2">
                  <button
                    onClick={() => {
                      setPreviewDish({
                        ...item,
                        price: (item.price || 0) / 100,
                        variants: item.variants?.map((v: any) => ({ ...v, price: (v.price || 0) / 100 })),
                        addOns: item.addOns?.map((a: any) => ({ ...a, priceDelta: (a.priceDelta || 0) / 100 })),
                      });
                      setPreviewMode('LIST');
                    }}
                    className="h-10 w-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-amber-600 transition cursor-pointer shrink-0"
                    title="Customer Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditItemClick(item)}
                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB 2: ADD-ON TEMPLATES                   */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'CUSTOMIZATIONS' && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Customization &amp; Add-on Templates</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Create reusable templates and connect them across dishes
              </p>
            </div>
            <button
              onClick={() => {
                groupForm.reset({ name: '', type: 'ADDON', description: '', options: [{ name: '', priceDelta: 0, price: 0 }], isGlobal: true });
                setIsGroupModalOpen(true);
              }}
              className="h-10 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 rounded-xl text-xs transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Template
            </button>
          </div>

          {isLoadingGroups ? (
            <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : customGroups.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
              <Sliders className="w-10 h-10 mx-auto text-slate-200 mb-2" />
              <p>No reusable templates created yet.</p>
              <p className="text-[11px]">Templates save time when adding standard add-ons across multiple dishes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {customGroups.map((group: any) => (
                <div key={group._id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs hover:border-slate-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full font-mono">{group.type}</span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{group.name}</h4>
                      {group.description && <p className="text-xs text-slate-500">{group.description}</p>}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Archive "${group.name}"? It will be removed from all dishes.`)) {
                          deleteGroupMutation.mutate(group._id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Archive template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 text-xs">
                    {group.options.map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="py-1.5 flex justify-between items-center text-slate-700">
                        <span>{opt.name}</span>
                        <span className="font-mono font-bold text-slate-900">+₹{((opt.priceDelta || opt.price || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────── */}
      {/* MODALS                              */}
      {/* ──────────────────────────────────── */}

      {/* Category Modal */}
      {isCatOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl font-bold text-slate-900">
                {editingCat ? 'Edit Category' : 'New Category'}
              </h2>
              <button onClick={() => setIsCatOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{errorMsg}</div>
            )}

            <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name</label>
                <input type="text" placeholder="Desserts" {...catForm.register('name')} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea placeholder="Sweet treats & baked delights..." {...catForm.register('description')} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-20 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category Image</label>
                <ImageUploader restaurantId={activeRestaurantId!} value={catForm.watch('imageUrl')} onChange={(url: string) => catForm.setValue('imageUrl', url)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCatOpen(false)} className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                <button type="submit" className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition cursor-pointer">
                  {editingCat ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Menu Item Modal */}
      {isItemOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-5 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">{editingItem ? 'Edit Menu Item' : 'New Menu Item'}</h2>
                <span className="text-xs text-slate-400">Configure dish details, pricing, inventory, and modifier templates</span>
              </div>
              <button onClick={() => setIsItemOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Modal Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button type="button" onClick={() => setItemModalTab('FORM')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${itemModalTab === 'FORM' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                Dish Configuration
              </button>
              <button type="button" onClick={() => setItemModalTab('PREVIEW')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${itemModalTab === 'PREVIEW' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                <Smartphone className="w-3.5 h-3.5" />Live Customer Preview
              </button>
            </div>

            {errorMsg && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{errorMsg}</div>}

            {itemModalTab === 'PREVIEW' ? (
              <div className="space-y-4">
                <CustomerDishPreview item={itemForm.watch()} previewMode={previewMode} setPreviewMode={setPreviewMode} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setItemModalTab('FORM')} className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">Back to Edit</button>
                  <button type="button" onClick={itemForm.handleSubmit(onItemSubmit, (errors) => { const k = Object.keys(errors)[0]; const e: any = errors[k]; toast(e?.message || e?.name?.message || 'Check required fields.', 'error'); setItemModalTab('FORM'); })} className="w-1/2 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-xs cursor-pointer">
                    {editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={itemForm.handleSubmit(onItemSubmit, (errors) => { const k = Object.keys(errors)[0]; const e: any = errors[k]; toast(e?.message || e?.name?.message || e?.price?.message || 'Check required fields.', 'error'); })} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dish Name</label>
                  <input type="text" placeholder="Paneer Butter Masala" {...itemForm.register('name')} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-bold" />
                </div>

                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-amber-950">Pricing Model</label>
                    <div className="flex gap-1 p-0.5 bg-amber-100/80 rounded-xl border border-amber-300/80 text-xs">
                      <button type="button" onClick={() => itemForm.setValue('pricingType', 'SINGLE')} className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${itemForm.watch('pricingType') === 'SINGLE' ? 'bg-slate-950 text-white shadow-xs' : 'text-amber-900'}`}>Single Price</button>
                      <button type="button" onClick={() => { itemForm.setValue('pricingType', 'PORTION'); if (variantFields.length === 0) handleApplyVariantPreset('HALF_FULL'); }} className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${itemForm.watch('pricingType') === 'PORTION' ? 'bg-slate-950 text-white shadow-xs' : 'text-amber-900'}`}>Portion Sizes</button>
                    </div>
                  </div>
                  {itemForm.watch('pricingType') === 'SINGLE' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Dish Price (INR)</label>
                      <input type="number" step="0.01" placeholder="280.00" {...itemForm.register('price')} className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-amber-500 font-mono font-bold" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-amber-900">Quick Presets:</span>
                        {(['HALF_FULL', 'SML', 'REG_LARGE'] as const).map((preset) => (
                          <button key={preset} type="button" onClick={() => handleApplyVariantPreset(preset)} className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-950 text-[11px] font-bold rounded-lg border border-amber-300 transition cursor-pointer">
                            {preset === 'HALF_FULL' ? '+ Half/Full' : preset === 'SML' ? '+ S/M/L' : '+ Reg/Large'}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {variantFields.map((field, vIdx) => (
                          <div key={field.id} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200/80">
                            <input type="text" placeholder="Size (e.g. Half)" {...itemForm.register(`variants.${vIdx}.name` as const)} className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold" />
                            <input type="number" step="0.01" placeholder="Price (INR)" {...itemForm.register(`variants.${vIdx}.price` as const)} className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold" />
                            <button type="button" onClick={() => removeVariant(vIdx)} className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => appendVariant({ name: '', price: 0, isDefault: false })} className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 mt-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add Custom Size</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock & Inventory Card */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="trackStockToggle" className="text-xs font-bold text-slate-900 cursor-pointer block">
                        Inventory &amp; Stock Tracking
                      </label>
                      <span className="text-[10px] text-slate-400">Track current quantity and receive low-stock alerts</span>
                    </div>
                    <input
                      type="checkbox"
                      id="trackStockToggle"
                      {...itemForm.register('trackStock')}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {itemForm.watch('trackStock') && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Current Stock Quantity</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 50"
                          {...itemForm.register('stockQuantity')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Low Stock Alert Level</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 5"
                          {...itemForm.register('lowStockThreshold')}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isComboToggle" {...itemForm.register('isCombo')} className="w-4 h-4 accent-amber-500 rounded cursor-pointer" />
                    <label htmlFor="isComboToggle" className="text-xs font-bold text-slate-900 cursor-pointer">Bundle as Multi-Dish Combo</label>
                  </div>
                  {itemForm.watch('isCombo') && (
                    <div className="space-y-2 pt-2">
                      {comboFields.map((cField, cIdx) => (
                        <div key={cField.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                          <input type="text" placeholder="Dish name" {...itemForm.register(`comboItems.${cIdx}.name` as const)} className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs" />
                          <input type="number" min="1" placeholder="Qty" {...itemForm.register(`comboItems.${cIdx}.quantity` as const)} className="w-16 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold" />
                          <input type="text" placeholder="Category" {...itemForm.register(`comboItems.${cIdx}.categoryName` as const)} className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs" />
                          <button type="button" onClick={() => removeComboItem(cIdx)} className="text-rose-500 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => appendComboItem({ name: '', quantity: 1, categoryName: '' })} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add Bundled Item</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea placeholder="Spiced cottage cheese simmered in rich tomato butter gravy..." {...itemForm.register('description')} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 h-16 resize-none" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${itemForm.watch('isVegetarian') ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input type="checkbox" {...itemForm.register('isVegetarian')} className="hidden" />
                    <MenuBadge variant="veg" /><span className="text-xs">Vegetarian</span>
                  </label>
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${itemForm.watch('isSpicy') ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input type="checkbox" {...itemForm.register('isSpicy')} className="hidden" />
                    <Flame className="w-4 h-4 text-rose-500" strokeWidth={2} /><span className="text-xs">Spicy</span>
                  </label>
                  <label className={`p-3 rounded-2xl border-2 flex items-center gap-2 cursor-pointer transition ${itemForm.watch('isChefsSpecial') ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input type="checkbox" {...itemForm.register('isChefsSpecial')} className="hidden" />
                    <span className="text-xs">Chef&apos;s Special</span>
                  </label>
                  {isEnabled('ordering') && (
                    <input type="number" placeholder="15 mins prep" {...itemForm.register('prepTimeMinutes')} className="w-full px-3 py-3 border-2 border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-amber-500 font-medium" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dish Image</label>
                  <ImageUploader restaurantId={activeRestaurantId!} value={itemForm.watch('imageUrl')} onChange={(url: string) => itemForm.setValue('imageUrl', url)} />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-900">Custom Add-Ons (This dish only)</span>
                    <button type="button" onClick={() => appendAddOn({ name: '', priceDelta: 0 })} className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add Add-on</button>
                  </div>
                  {addOnFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <input type="text" placeholder="e.g. Extra Butter" {...itemForm.register(`addOns.${index}.name` as const)} className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold" />
                      <input type="number" step="0.01" placeholder="Extra Price" {...itemForm.register(`addOns.${index}.priceDelta` as const)} className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold" />
                      <button type="button" onClick={() => removeAddOn(index)} className="text-rose-500 p-1 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Reusable Modifier Groups</span>
                      <span className="text-[10px] text-slate-400">Attach pre-configured modifier templates</span>
                    </div>
                    {customGroups.length === 0 && (
                      <button type="button" onClick={() => { setIsItemOpen(false); setActiveTab('CUSTOMIZATIONS'); setIsGroupModalOpen(true); }} className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Create Template</button>
                    )}
                  </div>
                  {customGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {customGroups.map((group: any) => {
                        const currentAttached: string[] = itemForm.watch('attachedAddOnGroupIds') || [];
                        const isAttached = currentAttached.includes(group._id);
                        return (
                          <button key={group._id} type="button" onClick={() => { if (isAttached) itemForm.setValue('attachedAddOnGroupIds', currentAttached.filter(id => id !== group._id)); else itemForm.setValue('attachedAddOnGroupIds', [...currentAttached, group._id]); }} className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${isAttached ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-amber-950' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-xs block truncate">{group.name}</span>
                              <span className="text-[10px] text-slate-400 block">{group.options?.length || 0} options</span>
                            </div>
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs shrink-0 ${isAttached ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isAttached && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                      <p className="text-xs text-slate-500">No modifier groups yet.</p>
                      <button type="button" onClick={() => { setIsItemOpen(false); setActiveTab('CUSTOMIZATIONS'); setIsGroupModalOpen(true); }} className="mt-1.5 text-xs font-bold text-amber-600 hover:underline cursor-pointer">+ Create your first modifier template</button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsItemOpen(false)} className="w-1/4 py-3 border border-slate-200 text-slate-600 text-xs font-semibold rounded-2xl hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                  <button type="button" onClick={() => setItemModalTab('PREVIEW')} className="w-1/3 py-3 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />Preview
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition shadow-md cursor-pointer">
                    {editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Standalone Customer Preview Modal */}
      {previewDish && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 my-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-500" />Customer Experience Preview
                </h2>
                <p className="text-[11px] text-slate-400">Live diner view for &ldquo;{previewDish.name}&rdquo;</p>
              </div>
              <button onClick={() => setPreviewDish(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" strokeWidth={1.75} /></button>
            </div>
            <CustomerDishPreview item={previewDish} previewMode={previewMode} setPreviewMode={setPreviewMode} />
            <button type="button" onClick={() => setPreviewDish(null)} className="w-full py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer">Close Preview</button>
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
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={groupForm.handleSubmit((values: any) => { createGroupMutation.mutate({ ...values, options: values.options.map((opt: any) => ({ name: opt.name.trim(), priceDelta: Math.round(Number(opt.priceDelta || 0) * 100) })) }); })} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Template Name</label>
                <input type="text" placeholder="e.g. Extra Dips & Sauces" {...groupForm.register('name')} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Options List</label>
                <div className="space-y-2">
                  {groupOptionFields.map((field, idx) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <input type="text" placeholder="Option name" {...groupForm.register(`options.${idx}.name` as const)} className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs" />
                      <input type="number" step="0.01" placeholder="Price (INR)" {...groupForm.register(`options.${idx}.priceDelta` as const)} className="w-1/3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold" />
                      <button type="button" onClick={() => removeGroupOption(idx)} className="text-rose-500 p-1 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => appendGroupOption({ name: '', priceDelta: 0, price: 0 })} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"><Plus className="w-3.5 h-3.5" />Add Option</button>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="w-1/2 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl cursor-pointer hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer">Save Template</button>
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
