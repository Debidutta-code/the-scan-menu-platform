import { useMemo } from 'react';

export interface FieldDiff {
  key: string;
  label: string;
  originalFormatted: string;
  currentFormatted: string;
  step: number;
}

export function useFieldChangeTracker(
  baselineItem: any | null,
  currentValues: any,
  isEditMode: boolean
) {
  return useMemo(() => {
    if (!isEditMode || !baselineItem) {
      return {
        hasChanges: false,
        modifiedCount: 0,
        modifiedKeys: new Set<string>(),
        diffs: [] as FieldDiff[],
        isFieldModified: (_key: string) => false,
      };
    }

    const diffs: FieldDiff[] = [];
    const modifiedKeys = new Set<string>();

    // 1. Dish Name
    const origName = (baselineItem.name || '').trim();
    const currName = (currentValues?.name || '').trim();
    if (origName !== currName) {
      modifiedKeys.add('name');
      diffs.push({
        key: 'name',
        label: 'Dish Name',
        originalFormatted: origName || 'None',
        currentFormatted: currName || 'None',
        step: 1,
      });
    }

    // 2. Category
    const origCatId = typeof baselineItem.categoryId === 'object' ? baselineItem.categoryId?._id : baselineItem.categoryId;
    const currCatId = currentValues?.categoryId;
    if (origCatId && currCatId && origCatId.toString() !== currCatId.toString()) {
      modifiedKeys.add('categoryId');
      diffs.push({
        key: 'categoryId',
        label: 'Category',
        originalFormatted: 'Previous category',
        currentFormatted: 'Selected new category',
        step: 1,
      });
    }

    // 3. Description
    const origDesc = (baselineItem.description || '').trim();
    const currDesc = (currentValues?.description || '').trim();
    if (origDesc !== currDesc) {
      modifiedKeys.add('description');
      diffs.push({
        key: 'description',
        label: 'Description',
        originalFormatted: origDesc ? (origDesc.length > 30 ? origDesc.slice(0, 30) + '...' : origDesc) : 'Empty',
        currentFormatted: currDesc ? (currDesc.length > 30 ? currDesc.slice(0, 30) + '...' : currDesc) : 'Empty',
        step: 1,
      });
    }

    // 4. Dietary tags
    const origVeg = !!baselineItem.isVegetarian;
    const currVeg = !!currentValues?.isVegetarian;
    if (origVeg !== currVeg) {
      modifiedKeys.add('isVegetarian');
      diffs.push({
        key: 'isVegetarian',
        label: 'Dietary (Vegetarian)',
        originalFormatted: origVeg ? 'Veg' : 'Non-Veg',
        currentFormatted: currVeg ? 'Veg' : 'Non-Veg',
        step: 1,
      });
    }

    const origSpicy = !!baselineItem.isSpicy;
    const currSpicy = !!currentValues?.isSpicy;
    if (origSpicy !== currSpicy) {
      modifiedKeys.add('isSpicy');
      diffs.push({
        key: 'isSpicy',
        label: 'Spiciness Tag',
        originalFormatted: origSpicy ? 'Spicy' : 'Regular',
        currentFormatted: currSpicy ? 'Spicy' : 'Regular',
        step: 1,
      });
    }

    const origChef = !!baselineItem.isChefsSpecial;
    const currChef = !!currentValues?.isChefsSpecial;
    if (origChef !== currChef) {
      modifiedKeys.add('isChefsSpecial');
      diffs.push({
        key: 'isChefsSpecial',
        label: "Chef's Special Tag",
        originalFormatted: origChef ? 'Special' : 'Regular',
        currentFormatted: currChef ? 'Special' : 'Regular',
        step: 1,
      });
    }

    // 5. Prep Time
    const origPrep = baselineItem.prepTimeMinutes ? Number(baselineItem.prepTimeMinutes) : null;
    const currPrep = currentValues?.prepTimeMinutes ? Number(currentValues?.prepTimeMinutes) : null;
    if (origPrep !== currPrep) {
      modifiedKeys.add('prepTimeMinutes');
      diffs.push({
        key: 'prepTimeMinutes',
        label: 'Preparation Time',
        originalFormatted: origPrep ? `${origPrep} mins` : 'Not set',
        currentFormatted: currPrep ? `${currPrep} mins` : 'Not set',
        step: 1,
      });
    }

    // 6. Image
    const origImg = (baselineItem.imageUrl || '').trim();
    const currImg = (currentValues?.imageUrl || '').trim();
    if (origImg !== currImg) {
      modifiedKeys.add('imageUrl');
      diffs.push({
        key: 'imageUrl',
        label: 'Dish Image',
        originalFormatted: origImg ? 'Previous photo' : 'No photo',
        currentFormatted: currImg ? 'Updated photo' : 'Photo removed',
        step: 1,
      });
    }

    // 7. Dish Type / Combo toggle
    const origIsCombo = !!baselineItem.isCombo;
    const currIsCombo = !!currentValues?.isCombo;
    if (origIsCombo !== currIsCombo) {
      modifiedKeys.add('isCombo');
      diffs.push({
        key: 'isCombo',
        label: 'Dish Type',
        originalFormatted: origIsCombo ? 'Bundle Combo' : 'Single Dish',
        currentFormatted: currIsCombo ? 'Bundle Combo' : 'Single Dish',
        step: 1,
      });
    }

    // 8. Pricing Model & Price / Variants
    const origPricingType = baselineItem.pricingType || 'SINGLE';
    const currPricingType = currentValues?.pricingType || 'SINGLE';
    if (origPricingType !== currPricingType) {
      modifiedKeys.add('pricingType');
      diffs.push({
        key: 'pricingType',
        label: 'Pricing Model',
        originalFormatted: origPricingType === 'PORTION' ? 'Portion Sizes' : 'Single Price',
        currentFormatted: currPricingType === 'PORTION' ? 'Portion Sizes' : 'Single Price',
        step: 2,
      });
    }

    const origPrice = Number((baselineItem.price || 0) / 100);
    const currPrice = Number(currentValues?.price || 0);
    if (currPricingType === 'SINGLE' && origPrice !== currPrice) {
      modifiedKeys.add('price');
      diffs.push({
        key: 'price',
        label: 'Dish Base Price',
        originalFormatted: `₹${origPrice.toFixed(2)}`,
        currentFormatted: `₹${currPrice.toFixed(2)}`,
        step: 2,
      });
    }

    // Variants comparison
    if (currPricingType === 'PORTION') {
      const origVariants = (baselineItem.variants || []).map((v: any) => `${v.name}:${(v.price || 0) / 100}`).join('|');
      const currVariants = (currentValues?.variants || []).map((v: any) => `${v.name}:${Number(v.price || 0)}`).join('|');
      if (origVariants !== currVariants) {
        modifiedKeys.add('variants');
        diffs.push({
          key: 'variants',
          label: 'Portion Sizes & Pricing',
          originalFormatted: `${(baselineItem.variants || []).length} portion sizes`,
          currentFormatted: `${(currentValues?.variants || []).length} portion sizes`,
          step: 2,
        });
      }
    }

    // 9. Inventory Tracking & Stock
    const origTrack = !!baselineItem.trackStock;
    const currTrack = !!currentValues?.trackStock;
    if (origTrack !== currTrack) {
      modifiedKeys.add('trackStock');
      diffs.push({
        key: 'trackStock',
        label: 'Stock Tracking',
        originalFormatted: origTrack ? 'Enabled' : 'Disabled',
        currentFormatted: currTrack ? 'Enabled' : 'Disabled',
        step: 2,
      });
    }

    const origStock = Number(baselineItem.stockQuantity || 0);
    const currStock = Number(currentValues?.stockQuantity || 0);
    if (currTrack && origStock !== currStock) {
      modifiedKeys.add('stockQuantity');
      diffs.push({
        key: 'stockQuantity',
        label: 'Stock Quantity',
        originalFormatted: `${origStock} units`,
        currentFormatted: `${currStock} units`,
        step: 2,
      });
    }

    // 10. Bundled items
    if (currIsCombo) {
      const origCombos = (baselineItem.comboItems || []).map((c: any) => `${c.name}:${c.quantity}`).join('|');
      const currCombos = (currentValues?.comboItems || []).map((c: any) => `${c.name}:${c.quantity}`).join('|');
      if (origCombos !== currCombos) {
        modifiedKeys.add('comboItems');
        diffs.push({
          key: 'comboItems',
          label: 'Bundle Dishes',
          originalFormatted: `${(baselineItem.comboItems || []).length} items`,
          currentFormatted: `${(currentValues?.comboItems || []).length} items`,
          step: 3,
        });
      }
    }

    // 11. Add-ons & Modifiers
    const origAddons = (baselineItem.addOns || []).map((a: any) => `${a.name}:${(a.priceDelta || 0) / 100}`).join('|');
    const currAddons = (currentValues?.addOns || []).map((a: any) => `${a.name}:${Number(a.priceDelta || 0)}`).join('|');
    if (origAddons !== currAddons) {
      modifiedKeys.add('addOns');
      diffs.push({
        key: 'addOns',
        label: 'Custom Add-ons',
        originalFormatted: `${(baselineItem.addOns || []).length} add-ons`,
        currentFormatted: `${(currentValues?.addOns || []).length} add-ons`,
        step: 4,
      });
    }

    const origGroups = (baselineItem.attachedAddOnGroupIds || [])
      .map((id: any) => (typeof id === 'object' ? id._id : id).toString())
      .sort()
      .join(',');
    const currGroups = (currentValues?.attachedAddOnGroupIds || [])
      .map((id: any) => id.toString())
      .sort()
      .join(',');
    if (origGroups !== currGroups) {
      modifiedKeys.add('attachedAddOnGroupIds');
      diffs.push({
        key: 'attachedAddOnGroupIds',
        label: 'Attached Modifier Templates',
        originalFormatted: `${(baselineItem.attachedAddOnGroupIds || []).length} attached`,
        currentFormatted: `${(currentValues?.attachedAddOnGroupIds || []).length} attached`,
        step: 4,
      });
    }

    return {
      hasChanges: diffs.length > 0,
      modifiedCount: diffs.length,
      modifiedKeys,
      diffs,
      isFieldModified: (key: string) => modifiedKeys.has(key),
    };
  }, [baselineItem, currentValues, isEditMode]);
}
