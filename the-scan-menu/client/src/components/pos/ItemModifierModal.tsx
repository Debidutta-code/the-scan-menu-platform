import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';

export interface ModifierOption {
  name: string;
  priceDelta: number; // in cents/paise
  isDefault?: boolean;
}

export interface ModifierGroup {
  _id?: string;
  name: string;
  type?: 'VARIANT' | 'ADDON';
  selectionType?: 'SINGLE' | 'MULTIPLE';
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  options: ModifierOption[];
}

export interface ItemModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onAddToCart: (customizedItem: {
    itemId: string;
    baseItemId: string;
    name: string;
    variantName?: string;
    price: number; // base price + selected addons price in paise
    quantity: number;
    selectedAddOns: Array<{ name: string; priceDelta: number }>;
    specialInstructions?: string;
  }) => void;
}

export const ItemModifierModal: React.FC<ItemModifierModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
}) => {
  // Selected Portion Variant (if PORTION pricing)
  const variants = item?.variants || [];
  const defaultVariant = variants.find((v: any) => v.isDefault) || variants[0] || null;
  const [selectedVariant, setSelectedVariant] = useState<any>(defaultVariant);

  // Selected Add-ons state: map of groupName -> array of ModifierOption
  const [selectedAddonsByGroup, setSelectedAddonsByGroup] = useState<Record<string, ModifierOption[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Reset state whenever item changes or modal opens
  React.useEffect(() => {
    if (item) {
      const vars = item.variants || [];
      setSelectedVariant(vars.find((v: any) => v.isDefault) || vars[0] || null);
      setSelectedAddonsByGroup({});
      setSpecialInstructions('');
      setQuantity(1);
    }
  }, [item, isOpen]);

  // Collect modifier groups: flat addOns on item, or custom attached groups
  const modifierGroups: ModifierGroup[] = useMemo(() => {
    if (!item) return [];
    const groups: ModifierGroup[] = [];

    // If item has basic addOns attached directly
    if (item.addOns && item.addOns.length > 0) {
      groups.push({
        name: 'Add-ons & Extras',
        selectionType: 'MULTIPLE',
        isRequired: false,
        options: item.addOns,
      });
    }

    // If item has attached Customization Groups
    if (item.customizationGroups && Array.isArray(item.customizationGroups)) {
      groups.push(...item.customizationGroups);
    }

    return groups;
  }, [item]);

  const toggleOption = (group: ModifierGroup, opt: ModifierOption) => {
    const groupKey = group.name;
    const currentSelections = selectedAddonsByGroup[groupKey] || [];

    if (group.selectionType === 'SINGLE') {
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: [opt],
      }));
      return;
    }

    // Multiple selection
    const exists = currentSelections.some((o) => o.name === opt.name);
    if (exists) {
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: currentSelections.filter((o) => o.name !== opt.name),
      }));
    } else {
      if (group.maxSelections && group.maxSelections > 0 && currentSelections.length >= group.maxSelections) {
        return; // Exceeded maximum allowed options
      }
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: [...currentSelections, opt],
      }));
    }
  };

  // Base price in paise
  const basePricePaise = selectedVariant ? selectedVariant.price : item?.price || 0;

  // Total add-ons delta
  const totalAddonsDeltaPaise = Object.values(selectedAddonsByGroup)
    .flat()
    .reduce((sum, opt) => sum + (opt.priceDelta || 0), 0);

  const unitPricePaise = basePricePaise + totalAddonsDeltaPaise;
  const totalPricePaise = unitPricePaise * quantity;

  // Validate required groups
  const isValid = useMemo(() => {
    for (const g of modifierGroups) {
      if (g.isRequired) {
        const selections = selectedAddonsByGroup[g.name] || [];
        if (selections.length === 0) return false;
        if (g.minSelections && selections.length < g.minSelections) return false;
      }
    }
    return true;
  }, [modifierGroups, selectedAddonsByGroup]);

  const handleConfirm = () => {
    if (!isValid || !item) return;

    const allAddons = Object.values(selectedAddonsByGroup)
      .flat()
      .map((opt) => ({ name: opt.name, priceDelta: opt.priceDelta || 0 }));

    const uniqueItemId = selectedVariant
      ? `${item._id}_${selectedVariant.name}`
      : `${item._id}_${allAddons.map((a) => a.name).sort().join('-')}`;

    onAddToCart({
      itemId: uniqueItemId,
      baseItemId: item._id,
      name: item.name,
      variantName: selectedVariant?.name,
      price: unitPricePaise,
      quantity,
      selectedAddOns: allAddons,
      specialInstructions: specialInstructions.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Customize Item
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-2">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. Portion Sizes (if variants exist) */}
          {variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Size / Portion <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">Choose 1</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {variants.map((v: any) => {
                  const isSelected = selectedVariant?.name === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm block">{v.name}</span>
                        <span className="text-xs font-mono text-slate-500">₹{(v.price / 100).toFixed(2)}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Modifier Groups */}
          {modifierGroups.map((group) => {
            const currentSelections = selectedAddonsByGroup[group.name] || [];
            return (
              <div key={group.name} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {group.name}
                    </span>
                    {group.isRequired && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {group.selectionType === 'SINGLE'
                      ? 'Choose 1'
                      : group.maxSelections
                      ? `Max ${group.maxSelections}`
                      : 'Optional extras'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.options.map((opt) => {
                    const isSelected = currentSelections.some((o) => o.name === opt.name);
                    const delta = opt.priceDelta || 0;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => toggleOption(group, opt)}
                        className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-semibold ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>
                            {delta > 0 ? `+₹${(delta / 100).toFixed(0)}` : 'Free'}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 3. Special Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Special Kitchen Instructions
            </label>
            <input
              type="text"
              placeholder="e.g. Less spicy, no onion, extra crispy"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Footer: Quantity Stepper & Add to Cart */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center font-bold text-sm text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-950/20 disabled:opacity-40 flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              Add to Order
            </span>
            <span className="font-mono font-bold text-sm text-amber-400">
              ₹{(totalPricePaise / 100).toFixed(2)}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ItemModifierModal;
