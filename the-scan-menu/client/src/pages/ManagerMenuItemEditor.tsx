import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiClient } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { MenuBadge } from './PublicTable/components/MenuBadge';
import { useFieldChangeTracker } from '../hooks/useFieldChangeTracker';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  Tablet,
  Save,
  Send,
  Layers,
  DollarSign,
  Package,
  Sliders,
  Eye,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  RefreshCw,
  X,
  Loader,
} from 'lucide-react';

const menuItemEditorSchema = z.object({
  name: z.string().trim().min(1, 'Dish name is required'),
  categoryId: z.string().min(1, 'Category is required'),
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
  isDraft: z.boolean().default(false),
  completedStep: z.number().default(1),
  totalSteps: z.number().default(5),
});

const STEPS = [
  { id: 1, title: 'Basic Details', subtitle: 'Dish information & imagery', icon: Layers },
  { id: 2, title: 'Pricing & Inventory', subtitle: 'Price, variants & stock', icon: DollarSign },
  { id: 3, title: 'Bundling (Optional)', subtitle: 'Bundle multiple items', icon: Package },
  { id: 4, title: 'Add-ons & Modifiers', subtitle: 'Custom & template options', icon: Sliders },
  { id: 5, title: 'Review & Publish', subtitle: 'Review & save item', icon: Eye },
];

export const ManagerMenuItemEditor: React.FC = () => {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeRestaurantId } = useAuth();

  const isEditMode = !!itemId;
  const initialCategoryParam = searchParams.get('categoryId') || '';
  const initialTypeParam = searchParams.get('type') || '';

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedStepLevel, setCompletedStepLevel] = useState<number>(1);
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'MOBILE' | 'KIOSK'>('MOBILE');

  // Crash recovery state
  const [recoveredDraft, setRecoveredDraft] = useState<any | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState<boolean>(false);

  // Quick Category creation modal inside editor
  const [isQuickCatModalOpen, setIsQuickCatModalOpen] = useState<boolean>(false);
  const [quickCatName, setQuickCatName] = useState<string>('');

  // Combo builder filters
  const [comboSearchQuery, setComboSearchQuery] = useState<string>('');
  const [comboCategoryFilter, setComboCategoryFilter] = useState<string>('ALL');

  // Custom item add modal in combo builder
  const [isCustomComboModalOpen, setIsCustomComboModalOpen] = useState<boolean>(false);
  const [customComboItemName, setCustomComboItemName] = useState<string>('');

  const localStorageKey = `manager_menu_draft_${activeRestaurantId}_${itemId || 'new'}`;

  // React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    control,
    formState: { errors, isDirty },
  } = useForm<any>({
    resolver: zodResolver(menuItemEditorSchema),
    defaultValues: {
      name: '',
      categoryId: initialCategoryParam,
      description: '',
      pricingType: 'SINGLE',
      price: 0,
      variants: [],
      imageUrl: '',
      isVegetarian: false,
      isSpicy: false,
      isChefsSpecial: false,
      prepTimeMinutes: undefined,
      trackStock: false,
      stockQuantity: 0,
      lowStockThreshold: 5,
      isCombo: initialTypeParam === 'bundle',
      comboItems: [],
      addOns: [],
      attachedAddOnGroupIds: [],
      isDraft: false,
      completedStep: 1,
      totalSteps: 5,
    },
  });

  const {
    append: appendVariant,
    remove: removeVariant,
    replace: replaceVariants,
  } = useFieldArray({
    name: 'variants',
    control,
  });

  const {
    append: appendComboItem,
    remove: removeComboItem,
  } = useFieldArray({
    name: 'comboItems',
    control,
  });

  const {
    append: appendAddOn,
    remove: removeAddOn,
  } = useFieldArray({
    name: 'addOns',
    control,
  });

  // Fetch Categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/categories`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const categories = useMemo(() => categoriesResponse?.data || [], [categoriesResponse]);

  // Fetch All Menu Items (for combo search & selection)
  const { data: itemsResponse } = useQuery({
    queryKey: ['menuItems', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/menu-items`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const allMenuItems = useMemo(() => itemsResponse?.data || [], [itemsResponse]);

  // Fetch Customization Groups (modifier templates)
  const { data: customGroupsResponse } = useQuery({
    queryKey: ['customizationGroups', activeRestaurantId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/customization-groups`);
      return res.data;
    },
    enabled: !!activeRestaurantId,
  });

  const customGroups = useMemo(() => customGroupsResponse?.data || [], [customGroupsResponse]);

  // Fetch Existing Dish for Edit Mode
  const { data: itemResponse, isLoading: isLoadingItem } = useQuery({
    queryKey: ['menuItem', activeRestaurantId, itemId],
    queryFn: async () => {
      const res = await apiClient.get(`/restaurants/${activeRestaurantId}/menu-items/${itemId}`);
      return res.data;
    },
    enabled: !!activeRestaurantId && isEditMode,
  });

  const baselineItem = useMemo(() => itemResponse?.data || null, [itemResponse]);

  // Set form baseline when existing dish data loads
  useEffect(() => {
    if (baselineItem) {
      const cId = typeof baselineItem.categoryId === 'object' ? baselineItem.categoryId?._id : baselineItem.categoryId;
      const initialVals = {
        name: baselineItem.name || '',
        categoryId: cId || '',
        description: baselineItem.description || '',
        pricingType: baselineItem.pricingType || 'SINGLE',
        price: (baselineItem.price || 0) / 100,
        variants: (baselineItem.variants || []).map((v: any) => ({
          name: v.name,
          price: (v.price || 0) / 100,
          isDefault: !!v.isDefault,
        })),
        imageUrl: baselineItem.imageUrl || '',
        isVegetarian: !!baselineItem.isVegetarian,
        isSpicy: !!baselineItem.isSpicy,
        isChefsSpecial: !!baselineItem.isChefsSpecial,
        prepTimeMinutes: baselineItem.prepTimeMinutes || undefined,
        trackStock: !!baselineItem.trackStock,
        stockQuantity: baselineItem.stockQuantity !== undefined ? baselineItem.stockQuantity : 0,
        lowStockThreshold: baselineItem.lowStockThreshold !== undefined ? baselineItem.lowStockThreshold : 5,
        isCombo: !!baselineItem.isCombo,
        comboItems: (baselineItem.comboItems || []).map((c: any) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          categoryName: c.categoryName,
          quantity: c.quantity || 1,
          imageUrl: c.imageUrl || '',
        })),
        addOns: (baselineItem.addOns || []).map((a: any) => ({
          name: a.name,
          priceDelta: (a.priceDelta || 0) / 100,
        })),
        attachedAddOnGroupIds: (baselineItem.attachedAddOnGroupIds || []).map((g: any) =>
          typeof g === 'object' ? g._id : g
        ),
        isDraft: !!baselineItem.isDraft,
        completedStep: baselineItem.completedStep || (baselineItem.isDraft ? 1 : 5),
        totalSteps: 5,
      };

      reset(initialVals);
      setCompletedStepLevel(initialVals.completedStep);
      if (initialVals.isDraft && initialVals.completedStep > 1 && initialVals.completedStep <= 5) {
        setCurrentStep(initialVals.completedStep);
      }
    } else if (!isEditMode && categories.length > 0 && !getValues('categoryId')) {
      setValue('categoryId', initialCategoryParam || categories[0]._id);
    }
  }, [baselineItem, categories, isEditMode, reset, getValues, setValue, initialCategoryParam]);

  // Check LocalStorage Crash Recovery on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setRecoveredDraft(parsed.data);
          setShowRecoveryBanner(true);
        }
      }
    } catch {
      // ignore
    }
  }, [localStorageKey]);

  // Real-time autosave to localStorage on form changes
  const watchedValues = watch();

  const handleApplyRecoveredDraft = () => {
    if (recoveredDraft) {
      reset(recoveredDraft);
      if (recoveredDraft.completedStep) {
        setCompletedStepLevel(recoveredDraft.completedStep);
        setCurrentStep(recoveredDraft.completedStep);
      }
      setShowRecoveryBanner(false);
      toast('Draft session restored successfully.', 'info');
    }
  };

  const handleDiscardRecoveredDraft = () => {
    localStorage.removeItem(localStorageKey);
    setShowRecoveryBanner(false);
    setRecoveredDraft(null);
  };

  // Sync to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty || watchedValues.name) {
        try {
          localStorage.setItem(
            localStorageKey,
            JSON.stringify({
              timestamp: Date.now(),
              data: { ...watchedValues, completedStep: completedStepLevel },
            })
          );
        } catch {
          // ignore
        }
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [watchedValues, isDirty, localStorageKey, completedStepLevel]);

  // Field change tracker (Diff highlighter for Edit mode)
  const { hasChanges, modifiedCount, diffs, isFieldModified } = useFieldChangeTracker(
    baselineItem,
    watchedValues,
    isEditMode
  );

  // Quick Category creation
  const createCategoryMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient.post(`/restaurants/${activeRestaurantId}/categories`, { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['categories', activeRestaurantId] });
      const newCat = res.data?.data;
      if (newCat) {
        setValue('categoryId', newCat._id);
      }
      setIsQuickCatModalOpen(false);
      setQuickCatName('');
      toast('New category created.', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error creating category', 'error');
    },
  });

  // Preset portion sizes helper
  const handleApplyVariantPreset = (preset: 'HALF_FULL' | 'SML' | 'REG_LARGE') => {
    if (preset === 'HALF_FULL') {
      replaceVariants([
        { name: 'Half', price: Math.round(Number(watchedValues.price || 0) * 0.6) || 0, isDefault: true },
        { name: 'Full', price: Number(watchedValues.price || 0) || 0, isDefault: false },
      ]);
    } else if (preset === 'SML') {
      replaceVariants([
        { name: 'Small', price: Math.round(Number(watchedValues.price || 0) * 0.5) || 0, isDefault: false },
        { name: 'Medium', price: Math.round(Number(watchedValues.price || 0) * 0.8) || 0, isDefault: true },
        { name: 'Large', price: Number(watchedValues.price || 0) || 0, isDefault: false },
      ]);
    } else if (preset === 'REG_LARGE') {
      replaceVariants([
        { name: 'Regular', price: Number(watchedValues.price || 0) || 0, isDefault: true },
        { name: 'Large', price: Math.round(Number(watchedValues.price || 0) * 1.4) || 0, isDefault: false },
      ]);
    }
  };

  // Combo calculations
  const availableDishesForCombo = useMemo(() => {
    return allMenuItems.filter((dish: any) => {
      if (isEditMode && dish._id === itemId) return false;
      if (comboSearchQuery.trim()) {
        const q = comboSearchQuery.toLowerCase();
        const catName =
          typeof dish.categoryId === 'object'
            ? dish.categoryId?.name
            : categories.find((c: any) => c._id === dish.categoryId)?.name || '';
        if (!dish.name.toLowerCase().includes(q) && !catName.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (comboCategoryFilter !== 'ALL') {
        const cId = typeof dish.categoryId === 'object' ? dish.categoryId?._id : dish.categoryId;
        if (cId !== comboCategoryFilter) return false;
      }
      return true;
    });
  }, [allMenuItems, isEditMode, itemId, comboSearchQuery, comboCategoryFilter, categories]);

  const bundledRegularTotal = useMemo(() => {
    const currentCombo = watchedValues.comboItems || [];
    return currentCombo.reduce((acc: number, cItem: any) => {
      const originalDish = allMenuItems.find((d: any) => d._id === cItem.menuItemId || d.name === cItem.name);
      const itemPrice = originalDish ? (originalDish.price || 0) / 100 : 0;
      return acc + itemPrice * (cItem.quantity || 1);
    }, 0);
  }, [watchedValues.comboItems, allMenuItems]);

  const comboCurrentPrice = Number(watchedValues.price || 0);
  const customerSavingsAmount = Math.max(0, bundledRegularTotal - comboCurrentPrice);
  const customerSavingsPercent =
    bundledRegularTotal > 0 ? Math.round((customerSavingsAmount / bundledRegularTotal) * 100) : 0;

  const handleAddDishToCombo = (dish: any) => {
    const currentItems = getValues('comboItems') || [];
    const existingIndex = currentItems.findIndex(
      (c: any) => c.menuItemId === dish._id || c.name.toLowerCase() === dish.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      const currentQty = Number(currentItems[existingIndex].quantity || 1);
      setValue(`comboItems.${existingIndex}.quantity`, currentQty + 1);
    } else {
      const catName =
        typeof dish.categoryId === 'object'
          ? dish.categoryId?.name
          : categories.find((c: any) => c._id === dish.categoryId)?.name || '';
      appendComboItem({
        menuItemId: dish._id,
        name: dish.name,
        categoryName: catName,
        quantity: 1,
        imageUrl: dish.imageUrl || '',
      });
    }

    // Auto-suggest combo name if empty
    if (currentItems.length === 0 && !getValues('name')) {
      setValue('name', `${dish.name} Combo`);
    }

    // Auto-suggest 10% discount price if price is 0
    const newItems = getValues('comboItems') || [];
    const newTotal = newItems.reduce((acc: number, cItem: any) => {
      const originalDish = allMenuItems.find((d: any) => d._id === cItem.menuItemId || d.name === cItem.name);
      const itemPrice = originalDish ? (originalDish.price || 0) / 100 : 0;
      return acc + itemPrice * (cItem.quantity || 1);
    }, 0);

    if (getValues('price') === 0 || !getValues('price')) {
      setValue('price', Math.round(newTotal * 0.9));
    }
  };

  const handleAddCustomComboItem = () => {
    if (!customComboItemName.trim()) return;
    appendComboItem({
      name: customComboItemName.trim(),
      categoryName: 'Special / Beverage',
      quantity: 1,
      imageUrl: '',
    });
    setCustomComboItemName('');
    setIsCustomComboModalOpen(false);
  };

  // Step advancement & validation
  const goToNextStep = async () => {
    if (currentStep === 1) {
      if (!watchedValues.name?.trim()) {
        toast('Please enter a dish name to proceed.', 'error');
        return;
      }
      if (!watchedValues.categoryId) {
        toast('Please select a category.', 'error');
        return;
      }
    }

    const nextStep = Math.min(5, currentStep + 1);
    setCurrentStep(nextStep);
    setCompletedStepLevel((prev) => Math.max(prev, nextStep));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ payload, isDraft }: { payload: any; isDraft: boolean }) => {
      const finalPayload = {
        ...payload,
        isDraft,
        completedStep: isDraft ? currentStep : 5,
        totalSteps: 5,
      };

      if (isEditMode) {
        return apiClient.patch(`/restaurants/${activeRestaurantId}/menu-items/${itemId}`, finalPayload);
      } else {
        return apiClient.post(`/restaurants/${activeRestaurantId}/menu-items`, finalPayload);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['menuItem', activeRestaurantId, itemId] });
      localStorage.removeItem(localStorageKey);

      if (variables.isDraft) {
        toast(`Draft saved at Step ${currentStep} of 5. It will not show on public menu.`, 'info');
      } else {
        toast(isEditMode ? 'Menu item updated and published!' : 'Menu item published to live menu!', 'success');
      }
      navigate('/manager/menu');
    },
    onError: (err: any) => {
      toast(err.response?.data?.error?.message || 'Error saving menu item', 'error');
    },
  });

  const preparePayload = (values: any, isDraft: boolean) => {
    const isPortion = values.pricingType === 'PORTION';

    let priceInPaise = Math.round(Number(values.price || 0) * 100);
    const variantsInPaise = isPortion
      ? (values.variants || []).map((v: any) => ({
          name: v.name.trim(),
          price: Math.round(Number(v.price || 0) * 100),
          isDefault: !!v.isDefault,
        }))
      : undefined;

    if (isPortion && variantsInPaise && variantsInPaise.length > 0) {
      const def = variantsInPaise.find((v: any) => v.isDefault) || variantsInPaise[0];
      priceInPaise = def.price;
    }

    const addOnsInPaise = (values.addOns || [])
      .filter((addon: any) => addon.name?.trim())
      .map((addon: any) => ({
        name: addon.name.trim(),
        priceDelta: Math.round(Number(addon.priceDelta || 0) * 100),
      }));

    return {
      name: values.name.trim(),
      categoryId: values.categoryId,
      description: values.description?.trim(),
      pricingType: isPortion ? 'PORTION' : 'SINGLE',
      price: priceInPaise,
      variants: variantsInPaise,
      imageUrl: values.imageUrl?.trim(),
      isVegetarian: !!values.isVegetarian,
      isSpicy: !!values.isSpicy,
      isChefsSpecial: !!values.isChefsSpecial,
      prepTimeMinutes: values.prepTimeMinutes ? Number(values.prepTimeMinutes) : undefined,
      trackStock: !!values.trackStock,
      stockQuantity: Number(values.stockQuantity || 0),
      lowStockThreshold: Number(values.lowStockThreshold || 5),
      isCombo: !!values.isCombo,
      comboItems: values.isCombo ? (values.comboItems || []).filter((c: any) => c.name?.trim()) : undefined,
      addOns: addOnsInPaise,
      attachedAddOnGroupIds: values.attachedAddOnGroupIds || [],
      isAvailable: true,
      isDraft,
      completedStep: isDraft ? currentStep : 5,
      totalSteps: 5,
    };
  };

  const handleSaveAsDraft = () => {
    const rawValues = getValues();
    if (!rawValues.name?.trim()) {
      setValue('name', 'Untitled Draft Dish');
    }
    if (!rawValues.categoryId && categories.length > 0) {
      setValue('categoryId', categories[0]._id);
    }
    const payload = preparePayload(getValues(), true);
    saveMutation.mutate({ payload, isDraft: true });
  };

  const handleSaveAndPublish = () => {
    handleSubmit(
      (validValues: any) => {
        const payload = preparePayload(validValues, false);
        saveMutation.mutate({ payload, isDraft: false });
      },
      (validationErrors: any) => {
        const firstKey = Object.keys(validationErrors || {})[0];
        const errorObj = firstKey ? validationErrors[firstKey] : null;
        toast(errorObj?.message || errorObj?.name?.message || errorObj?.price?.message || 'Please check required fields.', 'error');
      }
    )();
  };

  if (isLoadingItem && isEditMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading menu item details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] flex flex-col font-sans pb-12">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP STICKY HEADER & BREADCRUMB                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/manager/menu')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Back to Menu"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {isEditMode ? 'Edit Menu Item' : 'Create New Menu Item'}
                </h1>
                {isEditMode && hasChanges && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {modifiedCount} field{modifiedCount > 1 ? 's' : ''} modified
                  </span>
                )}
                {watchedValues.isDraft && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Draft (Step {completedStepLevel}/5)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate hidden md:block">
                {isEditMode
                  ? 'Update dish details, portions, combo bundle, and modifiers.'
                  : 'Add a new dish to your digital menu. Fill the details below to get started.'}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/manager/menu')}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              disabled={saveMutation.isPending}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Save as Draft</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={saveMutation.isPending}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-900 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {saveMutation.isPending ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isEditMode ? 'Save Changes' : 'Save & Publish'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Crash / Recovery Banner */}
      {showRecoveryBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span>We restored unsaved changes from your previous session.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyRecoveredDraft}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer"
              >
                Apply Restored Draft
              </button>
              <button
                onClick={handleDiscardRecoveredDraft}
                className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN 3-COLUMN WORKSPACE                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 1: STEP NAVIGATION (3 cols)                        */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 pb-1">
                Steps Progress
              </div>
              <div className="space-y-1.5">
                {STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = completedStepLevel >= step.id && !isActive;

                  // Check if any diffs belong to this step in edit mode
                  const stepDiffsCount = diffs.filter((d) => d.step === step.id).length;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/10 border border-amber-500/30 text-slate-900 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate ${
                              isActive ? 'text-slate-900 font-extrabold' : 'text-slate-700'
                            }`}
                          >
                            {step.title}
                          </span>
                          {stepDiffsCount > 0 && isEditMode && (
                            <span className="text-[9px] font-extrabold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-md">
                              {stepDiffsCount} edited
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{step.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edit Mode Summary Box */}
            {isEditMode && hasChanges && (
              <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Modified Fields ({modifiedCount})</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Before saving, review your highlighted changes in Step 5 to avoid accidental edits.
                </p>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 2: ACTIVE STEP FORM (5 cols)                       */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs space-y-5">
              {/* ────────────────────────────────────────── */}
              {/* STEP 1: BASIC DETAILS                      */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Basic Details</h2>
                    <p className="text-xs text-slate-500">Add the essential information about your dish.</p>
                  </div>

                  {/* Dish Name */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Dish Name</span>
                        <span className="text-rose-500">*</span>
                        {isFieldModified('name') && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                            Modified
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(watchedValues.name || '').length}/120
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Madras Filter Coffee"
                      {...register('name')}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold transition focus:outline-none ${
                        isFieldModified('name')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    {errors.name && <p className="text-xs text-rose-600 font-medium">{String(errors.name.message)}</p>}
                  </div>

                  {/* Category Selection + Quick Add */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Category</span>
                        <span className="text-rose-500">*</span>
                        {isFieldModified('categoryId') && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                            Modified
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCatModalOpen(true)}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> New Category
                      </button>
                    </div>
                    <select
                      {...register('categoryId')}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold bg-white transition focus:outline-none ${
                        isFieldModified('categoryId')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    >
                      <option value="" disabled>
                        Select Category...
                      </option>
                      {categories.map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-xs text-rose-600 font-medium">{String(errors.categoryId.message)}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Description</span>
                        {isFieldModified('description') && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                            Modified
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(watchedValues.description || '').length}/300
                      </span>
                    </div>
                    <textarea
                      maxLength={300}
                      rows={3}
                      placeholder="A short appetizing description about this dish..."
                      {...register('description')}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs leading-relaxed transition focus:outline-none resize-none ${
                        isFieldModified('description')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                  </div>

                  {/* Dietary & Feature Tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">Dietary &amp; Tags</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setValue('isVegetarian', !watchedValues.isVegetarian)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          watchedValues.isVegetarian
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Vegetarian</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue('isSpicy', !watchedValues.isSpicy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          watchedValues.isSpicy
                            ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>Spicy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue('isChefsSpecial', !watchedValues.isChefsSpecial)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          watchedValues.isChefsSpecial
                            ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Chef&apos;s Special</span>
                      </button>
                    </div>
                  </div>

                  {/* Prep Time */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Prep Time (mins)</span>
                      {isFieldModified('prepTimeMinutes') && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                          Modified
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 15"
                        {...register('prepTimeMinutes')}
                        className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-slate-900"
                      />
                      <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-medium">mins</span>
                    </div>
                  </div>

                  {/* Dish Image Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>Dish Image</span>
                      {isFieldModified('imageUrl') && (
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                          Modified
                        </span>
                      )}
                    </label>
                    <ImageUploader
                      restaurantId={activeRestaurantId!}
                      value={watchedValues.imageUrl}
                      onChange={(url: string) => setValue('imageUrl', url)}
                    />
                  </div>

                  {/* Dish Type / Combo deal selector */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">Dish Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setValue('isCombo', false)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          !watchedValues.isCombo
                            ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">Single Dish</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            !watchedValues.isCombo ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          A standalone menu item
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setValue('isCombo', true);
                          setCurrentStep(3); // jump to combo builder if selected
                        }}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                          watchedValues.isCombo
                            ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">Bundle (Multi-Dish)</span>
                          <span className="text-[8px] font-black uppercase bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-md">
                            Combo Deal
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Combine multiple items with special pricing</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 2: PRICING & INVENTORY                */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Pricing &amp; Inventory</h2>
                    <p className="text-xs text-slate-500">Configure base price, portion sizes, and stock control.</p>
                  </div>

                  {/* Pricing Model Selector */}
                  <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Pricing Model</label>
                      <div className="flex gap-1 p-0.5 bg-slate-200/80 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setValue('pricingType', 'SINGLE')}
                          className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                            watchedValues.pricingType === 'SINGLE'
                              ? 'bg-slate-950 text-white shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Single Price
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setValue('pricingType', 'PORTION');
                            if ((watchedValues.variants || []).length === 0) {
                              handleApplyVariantPreset('HALF_FULL');
                            }
                          }}
                          className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                            watchedValues.pricingType === 'PORTION'
                              ? 'bg-slate-950 text-white shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Portion Sizes
                        </button>
                      </div>
                    </div>

                    {/* Single Price Input */}
                    {watchedValues.pricingType === 'SINGLE' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>Dish Price (₹)</span>
                          <span className="text-rose-500">*</span>
                          {isFieldModified('price') && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                              Modified
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="150.00"
                            {...register('price')}
                            className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Portion Sizes Configuration */
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500">Quick Presets:</span>
                          {(['HALF_FULL', 'SML', 'REG_LARGE'] as const).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleApplyVariantPreset(preset)}
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-300 transition cursor-pointer"
                            >
                              {preset === 'HALF_FULL' ? '+ Half / Full' : preset === 'SML' ? '+ S / M / L' : '+ Reg / Large'}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2">
                          {(watchedValues.variants || []).map((_v: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                              <input
                                type="text"
                                placeholder="Size name (e.g. Full)"
                                {...register(`variants.${idx}.name` as const)}
                                className="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                              />
                              <div className="w-1/3 relative">
                                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Price"
                                  {...register(`variants.${idx}.price` as const)}
                                  className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                                title="Remove size"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => appendVariant({ name: '', price: 0, isDefault: false })}
                            className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Portion Size
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Tracking Toggle & Quantity */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">Track Stock &amp; Inventory</div>
                        <div className="text-[11px] text-slate-400">
                          Automatically 86 dish when quantity reaches zero
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={watchedValues.trackStock}
                          onChange={(e) => setValue('trackStock', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {watchedValues.trackStock && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Available Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...register('stockQuantity')}
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Low Stock Alert
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="5"
                            {...register('lowStockThreshold')}
                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 3: BUNDLING (COMBO BUILDER)          */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Bundle as Multi-Dish Combo</h2>
                      <p className="text-xs text-slate-500">Combine multiple menu items into a single meal bundle.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watchedValues.isCombo}
                        onChange={(e) => setValue('isCombo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {watchedValues.isCombo ? (
                    <div className="space-y-5">
                      {/* Bundle Financial Metrics Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Bundled Dishes
                          </span>
                          <span className="text-lg font-black text-slate-900 font-mono">
                            {(watchedValues.comboItems || []).length}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Separate Total
                          </span>
                          <span className="text-lg font-black text-slate-900 font-mono">
                            ₹{bundledRegularTotal.toFixed(0)}
                          </span>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Customer Saves
                          </span>
                          <span className="text-lg font-black text-emerald-700 font-mono">
                            ₹{customerSavingsAmount.toFixed(0)} ({customerSavingsPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Selected Bundle Items */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Selected Bundle Items</span>
                          <button
                            type="button"
                            onClick={() => setIsCustomComboModalOpen(true)}
                            className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Custom Item
                          </button>
                        </div>

                        {(watchedValues.comboItems || []).length === 0 ? (
                          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                            <Package className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-600">No items added yet</p>
                            <p className="text-[11px] text-slate-400">
                              Select dishes from the menu list below to create your combo.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-white">
                            {(watchedValues.comboItems || []).map((cItem: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                                    {cItem.imageUrl ? (
                                      <img
                                        src={cItem.imageUrl}
                                        alt={cItem.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Package className="w-4 h-4" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 truncate">{cItem.name}</div>
                                    <div className="text-[10px] text-slate-400 truncate">{cItem.categoryName || 'Dish'}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Qty Controls */}
                                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = Number(cItem.quantity || 1);
                                        if (current > 1) {
                                          setValue(`comboItems.${idx}.quantity`, current - 1);
                                        } else {
                                          removeComboItem(idx);
                                        }
                                      }}
                                      className="w-6 h-6 rounded-lg bg-white text-slate-700 text-xs font-bold flex items-center justify-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-black font-mono px-1">{cItem.quantity || 1}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setValue(`comboItems.${idx}.quantity`, Number(cItem.quantity || 1) + 1)
                                      }
                                      className="w-6 h-6 rounded-lg bg-white text-slate-700 text-xs font-bold flex items-center justify-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeComboItem(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add More Items to Bundle (Picker) */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-800 block">Add More Items to Bundle</span>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={comboSearchQuery}
                              onChange={(e) => setComboSearchQuery(e.target.value)}
                              placeholder="Search dishes to add..."
                              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <select
                            value={comboCategoryFilter}
                            onChange={(e) => setComboCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none"
                          >
                            <option value="ALL">All Categories</option>
                            {categories.map((c: any) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Dish items list */}
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                          {availableDishesForCombo.map((dish: any) => (
                            <div key={dish._id} className="flex items-center justify-between pt-1.5 first:pt-0">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                  {dish.imageUrl ? (
                                    <img
                                      src={dish.imageUrl}
                                      alt={dish.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <Package className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">{dish.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ₹{((dish.price || 0) / 100).toFixed(0)}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddDishToCombo(dish)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
                      <Package className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">Bundling is disabled for this dish</p>
                      <p className="text-[11px]">Enable the toggle above if you want to turn this dish into a combo bundle.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 4: ADD-ONS & MODIFIERS                */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Add-ons &amp; Modifiers</h2>
                    <p className="text-xs text-slate-500">Attach dish-specific add-ons and global modifier templates.</p>
                  </div>

                  {/* Custom Add-ons (This dish only) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800">Custom Add-ons (This dish only)</span>
                        <span className="text-[10px] text-slate-400 block">
                          Add custom options specific to this menu item
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => appendAddOn({ name: '', priceDelta: 0 })}
                        className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Add-on
                      </button>
                    </div>

                    {(watchedValues.addOns || []).length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No dish-specific add-ons added.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(watchedValues.addOns || []).map((_a: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. Extra Butter, Cheese Slice"
                              {...register(`addOns.${idx}.name` as const)}
                              className="w-2/3 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <div className="w-1/3 relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                {...register(`addOns.${idx}.priceDelta` as const)}
                                className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAddOn(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reusable Modifier Templates */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Reusable Modifier Groups</span>
                      <span className="text-[10px] text-slate-400 block">
                        Attach pre-configured modifier templates to this dish
                      </span>
                    </div>

                    {customGroups.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No modifier templates available. Create templates in the Customizations tab.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {customGroups.map((group: any) => {
                          const isChecked = (watchedValues.attachedAddOnGroupIds || []).includes(group._id);
                          return (
                            <label
                              key={group._id}
                              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                isChecked
                                  ? 'bg-amber-500/10 border-amber-500 text-slate-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold truncate">{group.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {group.options?.length || 0} options • {group.type}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = getValues('attachedAddOnGroupIds') || [];
                                  if (e.target.checked) {
                                    setValue('attachedAddOnGroupIds', [...current, group._id]);
                                  } else {
                                    setValue(
                                      'attachedAddOnGroupIds',
                                      current.filter((id: string) => id !== group._id)
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 5: REVIEW & PUBLISH                   */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Review &amp; Publish</h2>
                    <p className="text-xs text-slate-500">
                      {isEditMode
                        ? 'Verify modified fields before completing the update.'
                        : 'Review all details before publishing this dish to your live menu.'}
                    </p>
                  </div>

                  {/* Edit Mode Diff Table */}
                  {isEditMode && hasChanges && (
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-3">
                      <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Changes to be Applied ({modifiedCount})</span>
                      </div>

                      <div className="divide-y divide-amber-200/60 border border-amber-200/60 rounded-xl bg-white text-xs overflow-hidden">
                        {diffs.map((d, i) => (
                          <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-700 w-1/3 truncate">{d.label}</span>
                            <div className="flex items-center gap-2 w-2/3 justify-end text-[11px] font-mono">
                              <span className="text-slate-400 line-through truncate max-w-[100px]">
                                {d.originalFormatted}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                {d.currentFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Dish Name:</span>
                      <span className="font-bold text-slate-900">{watchedValues.name || 'Untitled'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Category:</span>
                      <span className="font-bold text-slate-900">
                        {categories.find((c: any) => c._id === watchedValues.categoryId)?.name || 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Pricing Model:</span>
                      <span className="font-bold text-slate-900">
                        {watchedValues.pricingType === 'PORTION'
                          ? `${(watchedValues.variants || []).length} Portion Sizes`
                          : `₹${Number(watchedValues.price || 0).toFixed(2)}`}
                      </span>
                    </div>

                    {watchedValues.isCombo && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Bundle Items:</span>
                        <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg">
                          {(watchedValues.comboItems || []).length} items included
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Stock Tracking:</span>
                      <span className="font-bold text-slate-900">
                        {watchedValues.trackStock
                          ? `${watchedValues.stockQuantity} in stock`
                          : 'Unlimited (No tracking)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* WIZARD STEPPERS (BOTTOM BAR)               */}
              {/* ────────────────────────────────────────── */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 1}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <div className="text-[11px] font-bold text-slate-400 font-mono">
                  Step {currentStep} of 5
                </div>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAndPublish}
                    disabled={saveMutation.isPending}
                    className="px-5 py-2 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {saveMutation.isPending ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    )}
                    <span className="text-slate-950">{isEditMode ? 'Complete Edit' : 'Publish Dish'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 3: LIVE PREVIEW (4 cols)                           */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-3 sticky top-18 sm:top-20">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
              {/* Header & Switcher */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Smartphone className="w-4 h-4 text-amber-500" />
                  <span>Live Preview</span>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewDeviceMode('MOBILE')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      previewDeviceMode === 'MOBILE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Customer View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDeviceMode('KIOSK')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      previewDeviceMode === 'KIOSK' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    <Tablet className="w-3 h-3" />
                    <span>Kiosk View</span>
                  </button>
                </div>
              </div>

              {/* Realistic Customer Card Preview */}
              <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-4 shadow-inner space-y-3">
                {/* Hero Thumbnail Image */}
                <div className="w-full h-44 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200/60 flex items-center justify-center">
                  {watchedValues.imageUrl ? (
                    <img
                      src={watchedValues.imageUrl}
                      alt={watchedValues.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 space-y-1">
                      <Sparkles className="w-6 h-6 mx-auto text-slate-300" />
                      <span className="text-[10px] font-semibold block">Upload photo to preview</span>
                    </div>
                  )}

                  {watchedValues.isCombo && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[9px] font-black uppercase text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full shadow-xs">
                        Combo Deal
                      </span>
                    </div>
                  )}

                  {watchedValues.isChefsSpecial && !watchedValues.isCombo && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[9px] font-black uppercase text-white bg-slate-950/85 px-2 py-0.5 rounded-full">
                        Chef&apos;s Special
                      </span>
                    </div>
                  )}
                </div>

                {/* Dish Titles & Price */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {watchedValues.name || 'Dish Name'}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <MenuBadge variant={watchedValues.isVegetarian ? 'veg' : 'nonveg'} />
                      {watchedValues.isSpicy && <MenuBadge variant="spicy" />}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-base font-black text-slate-900 font-mono">
                    {watchedValues.pricingType === 'PORTION' && (watchedValues.variants || []).length > 0 ? (
                      <span>
                        From ₹
                        {Math.min(
                          ...(watchedValues.variants || []).map((v: any) => Number(v.price || 0))
                        ).toFixed(2)}
                      </span>
                    ) : (
                      <span>₹{Number(watchedValues.price || 0).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Tags Pill Row */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-slate-500 pt-0.5">
                    {watchedValues.prepTimeMinutes && (
                      <span className="flex items-center gap-0.5 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" /> {watchedValues.prepTimeMinutes} mins
                      </span>
                    )}
                    {watchedValues.isVegetarian && (
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">Veg</span>
                    )}
                    {watchedValues.isChefsSpecial && (
                      <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md">Chef&apos;s Special</span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1 line-clamp-2">
                    {watchedValues.description || 'Description will appear here...'}
                  </p>

                  {/* Bundle Includes Box */}
                  {watchedValues.isCombo && (watchedValues.comboItems || []).length > 0 && (
                    <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[10px] space-y-1">
                      <span className="font-bold text-amber-900 block">✨ This Bundle Includes:</span>
                      <div className="text-slate-700 leading-tight">
                        {(watchedValues.comboItems || [])
                          .map((c: any) => `${c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`)
                          .join(' + ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* QUICK CATEGORY CREATION MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isQuickCatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">New Category</h3>
              <button
                onClick={() => setIsQuickCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category Name</label>
              <input
                type="text"
                value={quickCatName}
                onChange={(e) => setQuickCatName(e.target.value)}
                placeholder="e.g. Hot Beverages"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsQuickCatModalOpen(false)}
                className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (quickCatName.trim()) {
                    createCategoryMutation.mutate(quickCatName.trim());
                  }
                }}
                disabled={!quickCatName.trim() || createCategoryMutation.isPending}
                className="w-1/2 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* QUICK CUSTOM COMBO ITEM MODAL                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCustomComboModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Add Non-Menu Item to Bundle</h3>
              <button
                onClick={() => setIsCustomComboModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Item Description / Name</label>
              <input
                type="text"
                value={customComboItemName}
                onChange={(e) => setCustomComboItemName(e.target.value)}
                placeholder="e.g. Complimentary Drink, French Fries"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomComboModalOpen(false)}
                className="w-1/2 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomComboItem}
                disabled={!customComboItemName.trim()}
                className="w-1/2 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerMenuItemEditor;
