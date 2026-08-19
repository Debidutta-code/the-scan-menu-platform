import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Plus, Minus } from 'lucide-react';
import { ItemDetailSheetProps } from '../types';
import { MenuBadge } from './MenuBadge';
import { formatPrice } from '../utils';

export const ItemDetailSheet: React.FC<ItemDetailSheetProps> = ({
  selectedItem,
  currency,
  detailQuantity,
  detailSelectedAddOns,
  detailSpecialInstructions,
  selectedVariant,
  onVariantChange,
  onClose,
  onAddToCart,
  onAddOnToggle,
  onQuantityChange,
  onInstructionsChange,
}) => {
  if (!selectedItem) return null;

  const isPortion = selectedItem.pricingType === 'PORTION' && selectedItem.variants && selectedItem.variants.length > 0;
  const currentBasePrice = isPortion && selectedVariant ? selectedVariant.price : selectedItem.price;
  const addOnsTotal = detailSelectedAddOns.reduce((sum, x) => sum + x.priceDelta, 0);
  const itemTotal = (currentBasePrice + addOnsTotal) * detailQuantity;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Bottom Drawer Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 24, stiffness: 240 }}
          className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto font-sans flex flex-col"
        >
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-500 hover:text-slate-700 z-10"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
            <div className="w-full h-56 bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-100">
              {selectedItem.imageUrl ? (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Sparkles className="w-12 h-12" strokeWidth={1} />
                </div>
              )}
              <div className="absolute bottom-4 left-4 flex gap-1.5">
                <MenuBadge variant={selectedItem.isVegetarian ? 'veg' : 'nonveg'} />
                {selectedItem.isSpicy && <MenuBadge variant="spicy" />}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-3xl font-normal text-slate-900 leading-tight">{selectedItem.name}</h3>
              {selectedItem.description && <p className="text-slate-500 text-sm leading-relaxed">{selectedItem.description}</p>}
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">{formatPrice(currentBasePrice, currency)}</span>
                {selectedItem.prepTimeMinutes && <span className="text-xs text-slate-400 font-medium">• {selectedItem.prepTimeMinutes} mins prep</span>}
              </div>
            </div>

            {/* Combos Bundled Items list */}
            {selectedItem.isCombo && selectedItem.comboItems && selectedItem.comboItems.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-amber-900 tracking-wider">Combo Includes</span>
                  <span className="text-[10px] font-bold font-mono bg-amber-200/80 text-amber-950 px-2 py-0.2 rounded-full">
                    {selectedItem.comboItems.length} items
                  </span>
                </div>
                <div className="divide-y divide-amber-200/60">
                  {selectedItem.comboItems.map((cItem, cIdx) => (
                    <div key={cIdx} className="py-1.5 flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800">
                        <strong>{cItem.quantity}x</strong> {cItem.name}
                      </span>
                      {cItem.categoryName && (
                        <span className="text-[10px] text-amber-800 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200">
                          {cItem.categoryName}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portion / Size Variants Selection */}
            {isPortion && selectedItem.variants && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Select Portion Size</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {selectedItem.variants.map((v) => {
                    const isSelected = selectedVariant?.name === v.name;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => onVariantChange && onVariantChange(v)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-1 select-none ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900">{v.name}</span>
                        <span className="font-mono text-xs font-black text-slate-800">
                          {formatPrice(v.price, currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-Ons Customizations */}
            {selectedItem.addOns && selectedItem.addOns.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Add-On Customizations</h4>
                <div className="space-y-2.5">
                  {selectedItem.addOns.map((addOn) => {
                    const isChecked = detailSelectedAddOns.some((x) => x.name === addOn.name);
                    return (
                      <label
                        key={addOn.name}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50/50 border-[var(--theme-accent)]/40 text-slate-950'
                            : 'border-slate-150 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onAddOnToggle(addOn)}
                            className="w-4.5 h-4.5 accent-[var(--theme-accent)] rounded border-slate-300"
                          />
                          <span className="text-sm font-semibold">{addOn.name}</span>
                        </div>
                        <span className="text-sm font-bold">+ {formatPrice(addOn.priceDelta, currency)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cooking instructions */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Special Cooking Instructions</h4>
              <textarea
                rows={2}
                placeholder="E.g., Make Maggi dry, extra spicy, less oil..."
                value={detailSpecialInstructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                className="w-full p-3.5 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 focus:border-[var(--theme-accent)] text-sm placeholder:text-slate-400"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 shrink-0">
                <button
                  onClick={() => onQuantityChange(Math.max(1, detailQuantity - 1))}
                  className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <span className="px-4 font-bold text-slate-900 text-sm font-mono w-8 text-center">{detailQuantity}</span>
                <button
                  onClick={() => onQuantityChange(detailQuantity + 1)}
                  className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>

              <button
                onClick={onAddToCart}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-colors flex items-center justify-between shadow-md"
              >
                <span>Add to Cart</span>
                <span>{formatPrice(itemTotal, currency)}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
