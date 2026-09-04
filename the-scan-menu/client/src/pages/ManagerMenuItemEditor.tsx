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
import { MenuItemEditorSkeleton } from '../components/menu/MenuItemEditorSkeleton';
import { useFieldChangeTracker } from '../hooks/useFieldChangeTracker';
import { Button } from '../components/ui/Button';
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
  originalPrice: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(0, 'Original price must be non-negative').optional()
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
  isTopPick: z.boolean().default(false),
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
        priceSnapshot: z.preprocess(
          (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
          z.number().min(0).optional()
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
  totalSteps: z.number().default(6),
});

const STEPS = [
  { id: 1, title: 'Basic Details', subtitle: 'Name, category & tags', icon: Layers },
  { id: 2, title: 'Dish Imagery', subtitle: 'Photo & presentation', icon: Sparkles },
  { id: 3, title: 'Pricing & Stock', subtitle: 'Price, variants & stock', icon: DollarSign },
  { id: 4, title: 'Bundling (Optional)', subtitle: 'Bundle combo builder', icon: Package },
  { id: 5, title: 'Add-ons & Modifiers', subtitle: 'Custom & template options', icon: Sliders },
  { id: 6, title: 'Review & Publish', subtitle: 'Review & save item', icon: Eye },
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

  // Automatic backend draft saving state
  const [persistedItemId, setPersistedItemId] = useState<string | undefined>(itemId);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<Date | null>(null);

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
      totalSteps: 6,
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
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({
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
        originalPrice: baselineItem.originalPrice ? (baselineItem.originalPrice / 100) : undefined,
        variants: (baselineItem.variants || []).map((v: any) => ({
          name: v.name,
          price: (v.price || 0) / 100,
          isDefault: !!v.isDefault,
        })),
        imageUrl: baselineItem.imageUrl || '',
        isVegetarian: !!baselineItem.isVegetarian,
        isSpicy: !!baselineItem.isSpicy,
        isChefsSpecial: !!baselineItem.isChefsSpecial,
        isTopPick: !!baselineItem.isTopPick,
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
          priceSnapshot: c.priceSnapshot ? c.priceSnapshot / 100 : undefined,
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
        completedStep: baselineItem.completedStep || (baselineItem.isDraft ? 1 : 6),
        totalSteps: 6,
      };

      reset(initialVals);
      setCompletedStepLevel(initialVals.completedStep);
      if (initialVals.isDraft && initialVals.completedStep > 1 && initialVals.completedStep <= 6) {
        setCurrentStep(initialVals.completedStep);
      }
    } else if (!isEditMode && categories.length > 0) {
      if (!getValues('categoryId')) {
        setValue('categoryId', initialCategoryParam || categories[0]._id);
      }
      const selectedItemsParam = searchParams.get('selectedItems');
      if (selectedItemsParam && allMenuItems.length > 0 && !getValues('isCombo')) {
        const itemIds = selectedItemsParam.split(',').filter(Boolean);
        const dishes = allMenuItems.filter((d: any) => itemIds.includes(d._id));
        if (dishes.length > 0) {
          setValue('isCombo', true);
          const comboList = dishes.map((d: any) => ({
            menuItemId: d._id,
            name: d.name,
            categoryName: typeof d.categoryId === 'object' ? d.categoryId?.name : categories.find((c: any) => c._id === d.categoryId)?.name || 'Dish',
            quantity: 1,
            priceSnapshot: (d.price || 0) / 100,
            imageUrl: d.imageUrl || '',
          }));
          setValue('comboItems', comboList);
          const bundleTotal = dishes.reduce((sum: number, d: any) => sum + (d.price || 0) / 100, 0);
          setValue('originalPrice', bundleTotal);
          setValue('price', Math.round(bundleTotal * 0.85));
          setValue('name', `${dishes.map((d: any) => d.name).slice(0, 2).join(' + ')} Combo`);
          setCurrentStep(4);
        }
      }
    }
  }, [baselineItem, categories, allMenuItems, isEditMode, reset, getValues, setValue, initialCategoryParam, searchParams]);

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

  // Automatic background draft saving
  const autoSaveDraftToBackend = async (targetStep: number) => {
    const rawValues = getValues();
    if (!rawValues.name?.trim() || !rawValues.categoryId || !activeRestaurantId) {
      return;
    }

    try {
      setIsAutoSaving(true);
      const payload = preparePayload(rawValues, true);
      payload.completedStep = Math.min(5, targetStep);
      payload.totalSteps = 5;
      payload.isDraft = true;

      const activeId = persistedItemId || itemId;
      if (activeId) {
        await apiClient.patch(`/restaurants/${activeRestaurantId}/menu-items/${activeId}`, payload);
      } else {
        const res = await apiClient.post(`/restaurants/${activeRestaurantId}/menu-items`, payload);
        if (res.data?.data?._id) {
          const newId = res.data.data._id;
          setPersistedItemId(newId);
          window.history.replaceState(null, '', `/manager/menu/${newId}/edit`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['menuItems', activeRestaurantId] });
      setLastAutoSavedTime(new Date());
    } catch (err) {
      console.warn('Auto-save draft warning:', err);
    } finally {
      setIsAutoSaving(false);
    }
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

    const nextStep = Math.min(6, currentStep + 1);
    setCurrentStep(nextStep);
    setCompletedStepLevel((prev) => Math.max(prev, nextStep));

    // Automatically save draft on step advancement
    autoSaveDraftToBackend(nextStep);
  };

  const handleStepClick = (stepId: number) => {
    if (currentStep === 1 && (!watchedValues.name?.trim() || !watchedValues.categoryId)) {
      setCurrentStep(stepId);
      return;
    }
    setCurrentStep(stepId);
    autoSaveDraftToBackend(stepId);
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
        completedStep: isDraft ? Math.min(5, currentStep) : 5,
        totalSteps: 5,
      };

      const activeId = persistedItemId || itemId;
      if (activeId || isEditMode) {
        return apiClient.patch(`/restaurants/${activeRestaurantId}/menu-items/${activeId || itemId}`, finalPayload);
      } else {
        return apiClient.post(`/restaurants/${activeRestaurantId}/menu-items`, finalPayload);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ['menuItem', activeRestaurantId, persistedItemId || itemId] });
      localStorage.removeItem(localStorageKey);

      if (variables.isDraft) {
        toast(`Draft saved at Step ${currentStep} of 6.`, 'info');
      } else {
        toast(isEditMode || persistedItemId ? 'Menu item updated and published!' : 'Menu item published to live menu!', 'success');
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
      originalPrice: values.originalPrice ? Math.round(Number(values.originalPrice) * 100) : undefined,
      variants: variantsInPaise,
      imageUrl: values.imageUrl?.trim(),
      isVegetarian: !!values.isVegetarian,
      isSpicy: !!values.isSpicy,
      isChefsSpecial: !!values.isChefsSpecial,
      isTopPick: !!values.isTopPick,
      prepTimeMinutes: values.prepTimeMinutes ? Number(values.prepTimeMinutes) : undefined,
      trackStock: !!values.trackStock,
      stockQuantity: Number(values.stockQuantity || 0),
      lowStockThreshold: Number(values.lowStockThreshold || 5),
      isCombo: !!values.isCombo,
      comboItems: values.isCombo
        ? (values.comboItems || [])
            .filter((c: any) => c.name?.trim())
            .map((c: any) => ({
              menuItemId: c.menuItemId,
              name: c.name.trim(),
              categoryName: c.categoryName,
              quantity: Number(c.quantity || 1),
              priceSnapshot: c.priceSnapshot ? Math.round(Number(c.priceSnapshot) * 100) : undefined,
              imageUrl: c.imageUrl,
            }))
        : undefined,
      addOns: addOnsInPaise,
      attachedAddOnGroupIds: values.attachedAddOnGroupIds || [],
      isAvailable: true,
      isDraft,
      completedStep: isDraft ? Math.min(5, currentStep) : 5,
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

  if ((isLoadingItem && isEditMode) || (isLoadingCategories && categories.length === 0)) {
    return <MenuItemEditorSkeleton isEditMode={isEditMode} />;
  }

  return (
    <div className="h-full w-full bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP COMPACT HEADER                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200/80 shadow-2xs z-20">
        <div className="w-full px-3 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate('/manager/menu')}
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title="Back to Menu"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {isEditMode ? 'Edit Menu Item' : 'Create New Menu Item'}
                </h1>
                {isEditMode && hasChanges && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {modifiedCount} modified
                  </span>
                )}
                {isAutoSaving ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                    <Loader className="w-2.5 h-2.5 animate-spin text-amber-600" />
                    Auto-saving...
                  </span>
                ) : lastAutoSavedTime ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                    Auto-saved
                  </span>
                ) : (watchedValues.isDraft || persistedItemId) ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                    Draft ({completedStepLevel}/6)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/manager/menu')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveAsDraft}
              disabled={saveMutation.isPending}
              leftIcon={<Save className="w-3.5 h-3.5 text-slate-500" />}
            >
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveAndPublish}
              isLoading={saveMutation.isPending}
              leftIcon={<Send className="w-3.5 h-3.5 text-amber-400" />}
            >
              {isEditMode ? 'Save Changes' : 'Save & Publish'}
            </Button>
          </div>
        </div>
      </header>

      {/* Crash / Recovery Banner */}
      {showRecoveryBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 shrink-0">
          <div className="w-full flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span className="text-[11px]">Restored unsaved changes from previous session.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyRecoveredDraft}
                className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer text-xs"
              >
                Apply
              </button>
              <button
                onClick={handleDiscardRecoveredDraft}
                className="px-2 py-0.5 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer text-xs"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN 3-COLUMN WORKSPACE (Fills Screen, No outer scroll)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-2 sm:p-2.5 w-full flex flex-col overflow-hidden">
        <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-stretch overflow-hidden">
          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 1: STEP NAVIGATION (3 cols)                        */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 h-full flex flex-col bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 pb-0.5">
              Steps Progress
            </div>
            <div className="space-y-1 flex-1">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = completedStepLevel >= step.id && !isActive;
                const stepDiffsCount = diffs.filter((d) => d.step === step.id).length;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 border border-amber-500/30 text-slate-900 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
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
                          <span className="text-[9px] font-extrabold bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded">
                            {stepDiffsCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate leading-tight">{step.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {isEditMode && hasChanges && (
              <div className="bg-amber-50/80 rounded-xl p-2 border border-amber-200/80 text-xs space-y-0.5 mt-auto">
                <div className="flex items-center gap-1 text-amber-950 font-bold text-[10px]">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Modified ({modifiedCount})</span>
                </div>
                <p className="text-[9px] text-amber-800 leading-tight">
                  Review highlighted edits in Step 6.
                </p>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 2: ACTIVE STEP FORM (5 cols)                       */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header (Fixed at top of middle card) */}
            <div className="px-3.5 sm:px-4 py-2 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                  {STEPS[currentStep - 1]?.title}
                </h2>
                <p className="text-[10px] text-slate-400">
                  {STEPS[currentStep - 1]?.subtitle}
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Step {currentStep} of {STEPS.length}
              </span>
            </div>

            {/* Card Form Body (Scrolls individually with 0px scrollbar, compact inputs) */}
            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-3.5 sm:p-4 space-y-3">
              {/* ────────────────────────────────────────── */}
              {/* STEP 1: BASIC DETAILS                      */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div className="space-y-3">
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
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none ${
                        isFieldModified('name')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    {errors.name && <p className="text-[11px] text-rose-600 font-medium">{String(errors.name.message)}</p>}
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
                      className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold bg-white transition focus:outline-none ${
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
                      <p className="text-[11px] text-rose-600 font-medium">{String(errors.categoryId.message)}</p>
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
                      rows={2}
                      placeholder="A short appetizing description about this dish..."
                      {...register('description')}
                      className={`w-full px-3 py-2 border rounded-xl text-xs leading-relaxed transition focus:outline-none resize-none ${
                        isFieldModified('description')
                          ? 'border-amber-400 bg-amber-50/30 focus:border-amber-500'
                          : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                  </div>

                  {/* Dietary & Feature Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Dietary &amp; Tags</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setValue('isVegetarian', !watchedValues.isVegetarian)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          watchedValues.isChefsSpecial
                            ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Chef&apos;s Special</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue('isTopPick', !watchedValues.isTopPick)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          watchedValues.isTopPick
                            ? 'bg-amber-400/20 text-amber-950 border-amber-400 shadow-2xs font-extrabold'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>⭐ Top Pick Banner</span>
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
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 15"
                        {...register('prepTimeMinutes')}
                        className="w-full pl-8 pr-12 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900"
                      />
                      <span className="absolute right-3 top-1.5 text-[11px] text-slate-400 font-medium">mins</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 2: DISH IMAGERY                       */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>Dish Photo</span>
                        {isFieldModified('imageUrl') && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                            Modified
                          </span>
                        )}
                      </label>
                      {watchedValues.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setValue('imageUrl', '')}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                    <ImageUploader
                      restaurantId={activeRestaurantId!}
                      value={watchedValues.imageUrl}
                      onChange={(url: string) => setValue('imageUrl', url)}
                    />
                  </div>

                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Photography Tip</span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      High quality appetizing food photos with good natural lighting can boost dish orders by up to 35% on digital menus.
                    </p>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 3: PRICING & STOCK                    */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 3 && (
                <div className="space-y-3.5">
                  {/* Pricing Model Selector */}
                  <div className="space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Pricing Model</label>
                      <div className="flex gap-1 p-0.5 bg-slate-200/80 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setValue('pricingType', 'SINGLE')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
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
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            watchedValues.pricingType === 'PORTION'
                              ? 'bg-slate-950 text-white shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Portion Sizes
                        </button>
                      </div>
                    </div>

                    {/* Single Price Input + Original MRP */}
                    {watchedValues.pricingType === 'SINGLE' ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <span>Selling Price (₹)</span>
                              <span className="text-rose-500">*</span>
                              {isFieldModified('price') && (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                                  Modified
                                </span>
                              )}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="150.00"
                                {...register('price')}
                                className="w-full pl-7 pr-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>Original MRP (₹)</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">(Crossed out)</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="e.g. 199.00"
                                {...register('originalPrice')}
                                className="w-full pl-7 pr-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs font-mono text-slate-600 focus:outline-none focus:border-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        {watchedValues.originalPrice && Number(watchedValues.originalPrice) > Number(watchedValues.price || 0) && (
                          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                            <span className="flex items-center gap-1.5 font-mono">
                              <span className="line-through text-slate-400">₹{Number(watchedValues.originalPrice).toFixed(0)}</span>
                              <span className="text-emerald-700 font-black">₹{Number(watchedValues.price || 0).toFixed(0)}</span>
                            </span>
                            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              Save ₹{(Number(watchedValues.originalPrice) - Number(watchedValues.price || 0)).toFixed(0)} ({Math.round(((Number(watchedValues.originalPrice) - Number(watchedValues.price || 0)) / Number(watchedValues.originalPrice)) * 100)}% OFF)
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Portion Sizes Configuration */
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500">Presets:</span>
                          {(['HALF_FULL', 'SML', 'REG_LARGE'] as const).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleApplyVariantPreset(preset)}
                              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold rounded border border-slate-300 transition cursor-pointer"
                            >
                              {preset === 'HALF_FULL' ? '+ Half / Full' : preset === 'SML' ? '+ S / M / L' : '+ Reg / Large'}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          {(watchedValues.variants || []).map((_v: any, idx: number) => (
                            <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                              <input
                                type="text"
                                placeholder="Size name (e.g. Full)"
                                {...register(`variants.${idx}.name` as const)}
                                className="w-1/2 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                              />
                              <div className="w-1/3 relative">
                                <span className="absolute left-2 top-1 text-[11px] text-slate-400 font-mono">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Price"
                                  {...register(`variants.${idx}.price` as const)}
                                  className="w-full pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                title="Remove size"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => appendVariant({ name: '', price: 0, isDefault: false })}
                            className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Portion Size
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Tracking Toggle & Quantity */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">Track Stock &amp; Inventory</div>
                        <div className="text-[10px] text-slate-400">
                          Automatically mark 86 when quantity reaches zero
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={watchedValues.trackStock}
                          onChange={(e) => setValue('trackStock', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {watchedValues.trackStock && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                            Available Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...register('stockQuantity')}
                            className="w-full px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                            Low Stock Alert
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="5"
                            {...register('lowStockThreshold')}
                            className="w-full px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 4: BUNDLING (COMBO BUILDER)          */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Bundle as Multi-Dish Combo</div>
                      <div className="text-[10px] text-slate-400">Combine multiple menu items into one deal</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watchedValues.isCombo}
                        onChange={(e) => setValue('isCombo', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {watchedValues.isCombo ? (
                    <div className="space-y-3">
                      {/* Bundle Financial Metrics Cards */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">
                            Bundled
                          </span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {(watchedValues.comboItems || []).length}
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">
                            Regular Total
                          </span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            ₹{bundledRegularTotal.toFixed(0)}
                          </span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase block">
                            Saves
                          </span>
                          <span className="text-sm font-black text-emerald-700 font-mono">
                            ₹{customerSavingsAmount.toFixed(0)} ({customerSavingsPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Combo Pricing & Discount Controls */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Combo Bundle Pricing</span>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('originalPrice', bundledRegularTotal);
                              setValue('price', Math.round(bundledRegularTotal * 0.8));
                            }}
                            className="text-[10px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition"
                          >
                            Auto-Apply 20% Discount
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Original Sum (Crossed out ₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Original Total"
                              {...register('originalPrice')}
                              className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-900 block mb-0.5">Combo Deal Price (₹) *</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Discounted Price"
                              {...register('price')}
                              className="w-full px-2.5 py-1.5 border border-amber-400 bg-white rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-none focus:border-amber-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Selected Bundle Items */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Included Dishes</span>
                          <button
                            type="button"
                            onClick={() => setIsCustomComboModalOpen(true)}
                            className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Custom Item
                          </button>
                        </div>

                        {(watchedValues.comboItems || []).length === 0 ? (
                          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            Select dishes below to add to bundle.
                          </div>
                        ) : (
                          <div className="space-y-1 divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-white max-h-36 overflow-y-auto [scrollbar-width:none]">
                            {(watchedValues.comboItems || []).map((cItem: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0">
                                <div className="min-w-0 pr-2">
                                  <div className="text-xs font-bold text-slate-900 truncate">{cItem.name}</div>
                                  <div className="text-[9px] text-slate-400 truncate">{cItem.categoryName || 'Dish'}</div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
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
                                      className="w-5 h-5 rounded bg-white text-slate-700 text-xs font-bold flex items-center justify-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-black font-mono px-1">{cItem.quantity || 1}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setValue(`comboItems.${idx}.quantity`, Number(cItem.quantity || 1) + 1)
                                      }
                                      className="w-5 h-5 rounded bg-white text-slate-700 text-xs font-bold flex items-center justify-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeComboItem(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add More Items to Bundle (Picker) */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                            <input
                              type="text"
                              value={comboSearchQuery}
                              onChange={(e) => setComboSearchQuery(e.target.value)}
                              placeholder="Search dishes..."
                              className="w-full pl-8 pr-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <select
                            value={comboCategoryFilter}
                            onChange={(e) => setComboCategoryFilter(e.target.value)}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:outline-none"
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
                        <div className="max-h-36 overflow-y-auto [scrollbar-width:none] space-y-1 divide-y divide-slate-100">
                          {availableDishesForCombo.slice(0, 20).map((dish: any) => (
                            <div key={dish._id} className="flex items-center justify-between pt-1 first:pt-0">
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-slate-900 truncate">{dish.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  ₹{((dish.price || 0) / 100).toFixed(0)}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddDishToCombo(dish)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">Bundling is optional</p>
                      <p className="text-[10px]">Enable the toggle above if you want to turn this dish into a combo bundle.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────── */}
              {/* STEP 5: ADD-ONS & MODIFIERS                */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  {/* Custom Add-ons (This dish only) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Custom Add-ons (This dish only)</span>
                      <button
                        type="button"
                        onClick={() => appendAddOn({ name: '', priceDelta: 0 })}
                        className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Add-on
                      </button>
                    </div>

                    {(watchedValues.addOns || []).length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No dish-specific add-ons added.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto [scrollbar-width:none]">
                        {(watchedValues.addOns || []).map((_a: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. Extra Butter"
                              {...register(`addOns.${idx}.name` as const)}
                              className="w-2/3 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                            />
                            <div className="w-1/3 relative">
                              <span className="absolute left-2 top-1 text-[11px] text-slate-400 font-mono">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                {...register(`addOns.${idx}.priceDelta` as const)}
                                className="w-full pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAddOn(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reusable Modifier Templates */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800 block">Reusable Modifier Groups</span>

                    {customGroups.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No modifier templates available.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto [scrollbar-width:none]">
                        {customGroups.map((group: any) => {
                          const isChecked = (watchedValues.attachedAddOnGroupIds || []).includes(group._id);
                          return (
                            <label
                              key={group._id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                isChecked
                                  ? 'bg-amber-500/10 border-amber-500 text-slate-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold truncate">{group.name}</div>
                                <div className="text-[9px] text-slate-400 truncate">
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
              {/* STEP 6: REVIEW & PUBLISH                   */}
              {/* ────────────────────────────────────────── */}
              {currentStep === 6 && (
                <div className="space-y-3">
                  {/* Edit Mode Diff Table */}
                  {isEditMode && hasChanges && (
                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Changes ({modifiedCount})</span>
                      </div>

                      <div className="divide-y divide-amber-200/60 border border-amber-200/60 rounded-lg bg-white text-xs overflow-hidden max-h-32 overflow-y-auto [scrollbar-width:none]">
                        {diffs.map((d, i) => (
                          <div key={i} className="p-2 flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-700 w-1/3 truncate text-[11px]">{d.label}</span>
                            <div className="flex items-center gap-1.5 w-2/3 justify-end text-[10px] font-mono">
                              <span className="text-slate-400 line-through truncate max-w-[80px]">
                                {d.originalFormatted}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded truncate max-w-[90px]">
                                {d.currentFormatted}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px]">Dish Name:</span>
                      <span className="font-bold text-slate-900">{watchedValues.name || 'Untitled'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px]">Category:</span>
                      <span className="font-bold text-slate-900">
                        {categories.find((c: any) => c._id === watchedValues.categoryId)?.name || 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px]">Pricing:</span>
                      <span className="font-bold text-slate-900">
                        {watchedValues.pricingType === 'PORTION'
                          ? `${(watchedValues.variants || []).length} Portion Sizes`
                          : `₹${Number(watchedValues.price || 0).toFixed(2)}`}
                      </span>
                    </div>

                    {watchedValues.isCombo && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium text-[11px]">Bundle:</span>
                        <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                          {(watchedValues.comboItems || []).length} items included
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium text-[11px]">Stock Tracking:</span>
                      <span className="font-bold text-slate-900">
                        {watchedValues.trackStock
                          ? `${watchedValues.stockQuantity} in stock`
                          : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Bottom Stepper Navigation (Identical position on EVERY step) */}
            <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep === 1}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="text-[11px] font-bold text-slate-400 font-mono">
                Step {currentStep} of {STEPS.length}
              </div>

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  Next Step <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  disabled={saveMutation.isPending}
                  className="px-4 py-1.5 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  )}
                  <span className="text-slate-950">{isEditMode ? 'Complete Edit' : 'Publish Dish'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 3: LIVE PREVIEW (4 cols)                           */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 h-full flex flex-col bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-2.5">
            {/* Header & Switcher */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Preview</span>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewDeviceMode('MOBILE')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    previewDeviceMode === 'MOBILE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDeviceMode('KIOSK')}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    previewDeviceMode === 'KIOSK' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <Tablet className="w-3 h-3" />
                  <span>Kiosk</span>
                </button>
              </div>
            </div>

            {/* Realistic Customer Card Preview */}
            <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-xl p-3 shadow-inner space-y-2.5 flex-1 flex flex-col">
              {/* Hero Thumbnail Image */}
              <div className="w-full h-36 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200/60 flex items-center justify-center shrink-0">
                {watchedValues.imageUrl ? (
                  <img
                    src={watchedValues.imageUrl}
                    alt={watchedValues.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400 space-y-1">
                    <Sparkles className="w-5 h-5 mx-auto text-slate-300" />
                    <span className="text-[10px] font-semibold block">Photo will appear here</span>
                  </div>
                )}

                {watchedValues.isCombo && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[8px] font-black uppercase text-amber-950 bg-amber-400 px-1.5 py-0.5 rounded-full shadow-xs">
                      Combo Deal
                    </span>
                  </div>
                )}

                {watchedValues.isChefsSpecial && !watchedValues.isCombo && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[8px] font-black uppercase text-white bg-slate-950/85 px-1.5 py-0.5 rounded-full">
                      Chef&apos;s Special
                    </span>
                  </div>
                )}
              </div>

              {/* Dish Titles & Price */}
              <div className="space-y-1 flex-1">
                <div className="flex items-start justify-between gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug break-words">
                    {watchedValues.name || 'Dish Name'}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <MenuBadge variant={watchedValues.isVegetarian ? 'veg' : 'nonveg'} />
                    {watchedValues.isSpicy && <MenuBadge variant="spicy" />}
                  </div>
                </div>

                {/* Price */}
                <div className="text-sm font-black text-slate-900 font-mono">
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
                <div className="flex items-center gap-1 flex-wrap text-[9px] font-semibold text-slate-500 pt-0.5">
                  {watchedValues.prepTimeMinutes && (
                    <span className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Clock className="w-2.5 h-2.5 text-slate-400" /> {watchedValues.prepTimeMinutes} mins
                    </span>
                  )}
                  {watchedValues.isVegetarian && (
                    <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">Veg</span>
                  )}
                  {watchedValues.isChefsSpecial && (
                    <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded">Chef&apos;s Special</span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[10px] text-slate-500 leading-relaxed pt-0.5 line-clamp-2">
                  {watchedValues.description || 'Description will appear here...'}
                </p>

                {/* Bundle Includes Box */}
                {watchedValues.isCombo && (watchedValues.comboItems || []).length > 0 && (
                  <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200/80 text-[9px] space-y-0.5 mt-1">
                    <span className="font-bold text-amber-900 block">✨ Bundle Includes:</span>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* QUICK CATEGORY CREATION MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isQuickCatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">New Category</h3>
              <button
                onClick={() => setIsQuickCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category Name</label>
              <input
                type="text"
                value={quickCatName}
                onChange={(e) => setQuickCatName(e.target.value)}
                placeholder="e.g. Hot Beverages"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsQuickCatModalOpen(false)}
                className="w-1/2 py-1.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
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
                className="w-1/2 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Add Custom Item to Bundle</h3>
              <button
                onClick={() => setIsCustomComboModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Item Description / Name</label>
              <input
                type="text"
                value={customComboItemName}
                onChange={(e) => setCustomComboItemName(e.target.value)}
                placeholder="e.g. Complimentary Drink, French Fries"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setIsCustomComboModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                size="sm"
                onClick={handleAddCustomComboItem}
                disabled={!customComboItemName.trim()}
              >
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerMenuItemEditor;
