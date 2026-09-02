import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Sparkles,
  Utensils,
  CornerDownLeft,
  MessageSquare,
} from 'lucide-react';
import { MenuBadge } from '../../pages/PublicTable/components/MenuBadge';

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
    price: number; // in paise
    quantity: number;
    selectedAddOns: Array<{ name: string; priceDelta: number }>;
    specialInstructions?: string;
  }) => void;
}

interface FocusableOption {
  type: 'VARIANT' | 'ADDON';
  groupKey: string;
  option: any;
  shortcutIndex: number;
}

export const ItemModifierModal: React.FC<ItemModifierModalProps> = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
}) => {
  const variants: any[] = item?.variants || [];
  const defaultVariant = variants.find((v: any) => v.isDefault) || variants[0] || null;
  const [selectedVariant, setSelectedVariant] = useState<any>(defaultVariant);
  const [selectedAddonsByGroup, setSelectedAddonsByGroup] = useState<Record<string, ModifierOption[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const instructionsInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open or item change
  useEffect(() => {
    if (item && isOpen) {
      const vars = item.variants || [];
      setSelectedVariant(vars.find((v: any) => v.isDefault) || vars[0] || null);
      setSelectedAddonsByGroup({});
      setSpecialInstructions('');
      setQuantity(1);
      setFocusedIndex(0);
    }
  }, [item, isOpen]);

  // Collect modifier groups
  const modifierGroups: ModifierGroup[] = useMemo(() => {
    if (!item) return [];
    const groups: ModifierGroup[] = [];

    if (item.addOns && item.addOns.length > 0) {
      groups.push({
        name: 'Add-ons & Extras',
        selectionType: 'MULTIPLE',
        isRequired: false,
        options: item.addOns,
      });
    }

    if (item.customizationGroups && Array.isArray(item.customizationGroups)) {
      groups.push(...item.customizationGroups);
    }

    return groups;
  }, [item]);

  // Flatten all navigable options for keyboard arrow navigation & hotkeys (1-9)
  const allFocusableOptions: FocusableOption[] = useMemo(() => {
    const list: FocusableOption[] = [];
    let shortcutCounter = 1;

    if (variants.length > 0) {
      variants.forEach((v) => {
        list.push({
          type: 'VARIANT',
          groupKey: '__VARIANTS__',
          option: v,
          shortcutIndex: shortcutCounter++,
        });
      });
    }

    modifierGroups.forEach((group) => {
      group.options.forEach((opt) => {
        list.push({
          type: 'ADDON',
          groupKey: group.name,
          option: opt,
          shortcutIndex: shortcutCounter <= 9 ? shortcutCounter++ : -1,
        });
      });
    });

    return list;
  }, [variants, modifierGroups]);

  const toggleOption = useCallback((group: ModifierGroup, opt: ModifierOption) => {
    const groupKey = group.name;
    const currentSelections = selectedAddonsByGroup[groupKey] || [];

    if (group.selectionType === 'SINGLE') {
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: [opt],
      }));
      return;
    }

    const exists = currentSelections.some((o) => o.name === opt.name);
    if (exists) {
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: currentSelections.filter((o) => o.name !== opt.name),
      }));
    } else {
      if (group.maxSelections && group.maxSelections > 0 && currentSelections.length >= group.maxSelections) {
        return;
      }
      setSelectedAddonsByGroup((prev) => ({
        ...prev,
        [groupKey]: [...currentSelections, opt],
      }));
    }
  }, [selectedAddonsByGroup]);

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

  const handleConfirm = useCallback(() => {
    if (!isValid || !item) return;

    const allAddons = Object.values(selectedAddonsByGroup)
      .flat()
      .map((opt) => ({ name: opt.name, priceDelta: opt.priceDelta || 0 }));

    const addonsSuffix = allAddons.length > 0 ? `_${allAddons.map((a) => a.name).sort().join('-')}` : '';
    const uniqueItemId = selectedVariant
      ? `${item._id}_${selectedVariant.name}${addonsSuffix}`
      : `${item._id}${addonsSuffix}`;

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
  }, [isValid, item, selectedAddonsByGroup, selectedVariant, unitPricePaise, quantity, specialInstructions, onAddToCart, onClose]);

  // Keyboard navigation & isolated shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't let key events leak to main POS screen
      e.stopPropagation();

      const isInputFocused = document.activeElement === instructionsInputRef.current;

      // Escape always closes
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter to confirm & add
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isValid) {
          handleConfirm();
        }
        return;
      }

      // If user is actively typing in the text input, let them type freely
      if (isInputFocused) {
        return;
      }

      // Number keys 1-9 to quick toggle / select options
      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10);
        const target = allFocusableOptions.find((o) => o.shortcutIndex === num);
        if (target) {
          e.preventDefault();
          if (target.type === 'VARIANT') {
            setSelectedVariant(target.option);
          } else {
            const grp = modifierGroups.find((g) => g.name === target.groupKey);
            if (grp) toggleOption(grp, target.option);
          }
          const idx = allFocusableOptions.indexOf(target);
          if (idx >= 0) setFocusedIndex(idx);
        }
        return;
      }

      // Arrow keys to navigate between options
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (allFocusableOptions.length > 0) {
          setFocusedIndex((prev) => (prev + 1) % allFocusableOptions.length);
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (allFocusableOptions.length > 0) {
          setFocusedIndex((prev) => (prev - 1 + allFocusableOptions.length) % allFocusableOptions.length);
        }
        return;
      }

      // Spacebar to toggle the currently highlighted option
      if (e.key === ' ') {
        e.preventDefault();
        const current = allFocusableOptions[focusedIndex];
        if (current) {
          if (current.type === 'VARIANT') {
            setSelectedVariant(current.option);
          } else {
            const grp = modifierGroups.find((g) => g.name === current.groupKey);
            if (grp) toggleOption(grp, current.option);
          }
        }
        return;
      }

      // Quantity controls (+ / -)
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setQuantity((q) => q + 1);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setQuantity((q) => Math.max(1, q - 1));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isValid, handleConfirm, onClose, allFocusableOptions, focusedIndex, modifierGroups, toggleOption]);

  if (!isOpen || !item || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none font-sans overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white flex items-start justify-between">
            <div className="space-y-1 min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Customize Dish
                </span>
                <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
              <kbd className="text-[9px] font-mono font-semibold px-1 rounded bg-white text-slate-500 border border-slate-200 hidden sm:inline">
                Esc
              </kbd>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4.5 scrollbar-none">
            {/* 1. Portion Sizes (if variants exist) */}
            {variants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      Select Size / Portion <span className="text-rose-500 font-bold">*</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-mono">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {variants.map((v: any) => {
                    const isSelected = selectedVariant?.name === v.name;
                    const optIndex = allFocusableOptions.findIndex(
                      (o) => o.type === 'VARIANT' && o.option.name === v.name
                    );
                    const isKeyboardFocused = focusedIndex === optIndex;
                    const shortcutNum = optIndex >= 0 ? allFocusableOptions[optIndex].shortcutIndex : null;

                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => {
                          setSelectedVariant(v);
                          if (optIndex >= 0) setFocusedIndex(optIndex);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer relative select-none shadow-2xs ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50/90 text-amber-950 ring-2 ring-amber-400/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50 text-slate-700'
                        } ${isKeyboardFocused ? 'ring-2 ring-slate-900 border-slate-900' : ''}`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            {shortcutNum && shortcutNum <= 9 && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  isSelected
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {shortcutNum}
                              </span>
                            )}
                            <span className="font-bold text-xs truncate block">{v.name}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-900 block mt-1">
                            ₹{(v.price / 100).toFixed(2)}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'border border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Modifier Groups (Add-ons / Extras) */}
            {modifierGroups.map((group) => {
              const currentSelections = selectedAddonsByGroup[group.name] || [];
              return (
                <div key={group.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                        {group.name}
                      </span>
                      {group.isRequired && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded font-mono border border-rose-200">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      {group.selectionType === 'SINGLE'
                        ? 'Choose 1'
                        : group.maxSelections
                        ? `Max ${group.maxSelections}`
                        : 'Optional'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const isSelected = currentSelections.some((o) => o.name === opt.name);
                      const delta = opt.priceDelta || 0;
                      const optIndex = allFocusableOptions.findIndex(
                        (o) => o.type === 'ADDON' && o.groupKey === group.name && o.option.name === opt.name
                      );
                      const isKeyboardFocused = focusedIndex === optIndex;
                      const shortcutNum = optIndex >= 0 && allFocusableOptions[optIndex].shortcutIndex <= 9
                        ? allFocusableOptions[optIndex].shortcutIndex
                        : null;

                      return (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => {
                            toggleOption(group, opt);
                            if (optIndex >= 0) setFocusedIndex(optIndex);
                          }}
                          className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer select-none shadow-2xs ${
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                          } ${isKeyboardFocused ? 'ring-2 ring-amber-500' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            {shortcutNum && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {shortcutNum}
                              </span>
                            )}
                            <span className="font-bold text-xs truncate">{opt.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[11px] font-mono font-bold ${
                                isSelected ? 'text-amber-300' : 'text-slate-600'
                              }`}
                            >
                              {delta > 0 ? `+₹${(delta / 100).toFixed(0)}` : 'Free'}
                            </span>
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center transition ${
                                isSelected
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'border border-slate-300 text-transparent'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 3. Special Instructions */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>Special Kitchen Note</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Optional</span>
              </div>
              <input
                ref={instructionsInputRef}
                type="text"
                placeholder="e.g. Less spicy, no ice, extra hot, pack separately..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition"
              />

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {['No Sugar', 'Less Ice', 'Extra Hot', 'Pack Separately'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSpecialInstructions((prev) => (prev ? `${prev}, ${preset}` : preset));
                      instructionsInputRef.current?.focus();
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: Stepper & Confirm Add to Order */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              {/* Quantity Stepper */}
              <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  title="Decrease (-)"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <span className="w-8 text-center font-bold font-mono text-xs text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-900 bg-amber-400 hover:bg-amber-300 transition cursor-pointer shadow-2xs"
                  title="Increase (+)"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>

              {/* Add to Order Button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isValid}
                className="flex-1 h-10 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-2xl transition shadow-xs disabled:opacity-40 flex items-center justify-between px-4 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add to Order</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-amber-400">
                    ₹{(totalPricePaise / 100).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-0.5 text-[9px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    <span>Enter</span>
                    <CornerDownLeft className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                </div>
              </button>
            </div>

            {/* Keyboard Shortcuts Hint Bar */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60 px-1">
              <span className="hidden sm:inline">
                <kbd className="font-bold text-slate-600">← → ↑ ↓</kbd> Navigate &bull; <kbd className="font-bold text-slate-600">Space</kbd> Toggle &bull; <kbd className="font-bold text-slate-600">1-9</kbd> Select
              </span>
              <span>
                <kbd className="font-bold text-slate-600">Enter ↵</kbd> Confirm &bull; <kbd className="font-bold text-slate-600">Esc</kbd> Close
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ItemModifierModal;
