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
  onClose,
  onAddToCart,
  onAddOnToggle,
  onQuantityChange,
  onInstructionsChange,
}) => {
  return (
    <AnimatePresence>
      {selectedItem && (
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
                  {selectedItem.isVegetarian && <MenuBadge variant="veg" />}
                  {selectedItem.isSpicy && <MenuBadge variant="spicy" />}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-3xl font-normal text-slate-900 leading-tight">{selectedItem.name}</h3>
                {selectedItem.description && <p className="text-slate-500 text-sm leading-relaxed">{selectedItem.description}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-900">{formatPrice(selectedItem.price, currency)}</span>
                  {selectedItem.prepTimeMinutes && <span className="text-xs text-slate-400 font-medium">• {selectedItem.prepTimeMinutes} mins prep</span>}
                </div>
              </div>

              {/* Add-Ons Customizations */}
              {selectedItem.addOns && selectedItem.addOns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wide">Customize Item</h4>
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
                  placeholder="E.g., Extra hot, sugar-free, less ice..."
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
                  <span>
                    {formatPrice(
                      (selectedItem.price +
                        detailSelectedAddOns.reduce((sum, x) => sum + x.priceDelta, 0)) *
                        detailQuantity,
                      currency
                    )}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
