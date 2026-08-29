import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Sparkles, Plus, Minus } from 'lucide-react';
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
  featureFlags,
}) => {
  const dragControls = useDragControls();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isItemOpen = Boolean(selectedItem);

  // Lock body scroll and touch actions while modal is open
  useEffect(() => {
    if (!isItemOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isItemOpen]);

  // Handle Phone Back Button (popstate) and Keyboard Escape Key
  useEffect(() => {
    if (!isItemOpen) return;

    window.history.pushState({ modalOpen: 'item-detail' }, '');

    const handlePopState = () => {
      onCloseRef.current();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      if (window.history.state?.modalOpen === 'item-detail') {
        window.history.back();
      }
    };
  }, [isItemOpen]);

  if (!selectedItem) return null;

  const isOrderingEnabled = (featureFlags || []).some(f => f.key === 'ordering' && f.enabled);

  const isPortion = selectedItem.pricingType === 'PORTION' && selectedItem.variants && selectedItem.variants.length > 0;
  const currentBasePrice = isPortion && selectedVariant ? selectedVariant.price : selectedItem.price;
  const addOnsTotal = detailSelectedAddOns.reduce((sum, x) => sum + x.priceDelta, 0);
  const itemTotal = (currentBasePrice + addOnsTotal) * detailQuantity;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain touch-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Bottom Drawer Sheet with drag-down-to-close */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 300) {
              onClose();
            }
          }}
          className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl max-h-[90vh] font-sans flex flex-col overflow-hidden overscroll-contain"
        >
          {/* Top Drag Handle Header */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="pt-3.5 pb-2 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full hover:bg-slate-400 transition" />
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-5 pb-6 space-y-6">
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
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-1 select-none cursor-pointer ${
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
                            ? 'bg-amber-50/50 border-amber-400 text-slate-950 shadow-2xs'
                            : 'border-slate-150 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onAddOnToggle(addOn)}
                            className="w-4.5 h-4.5 accent-amber-500 rounded border-slate-300 cursor-pointer"
                          />
                          <span className="text-sm font-semibold">{addOn.name}</span>
                        </div>
                        <span className="text-sm font-bold font-mono">+ {formatPrice(addOn.priceDelta, currency)}</span>
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
                className="w-full p-3.5 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Sticky Bottom Footer */}
          {isOrderingEnabled && (
            <div className="shrink-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_20px_-6px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 z-20">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, detailQuantity - 1))}
                  className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95 cursor-pointer"
                  title="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <span className="px-3 font-bold text-slate-900 text-sm font-mono w-8 text-center">{detailQuantity}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(detailQuantity + 1)}
                  className="p-2 text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-white active:scale-95 cursor-pointer"
                  title="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>

              <button
                type="button"
                onClick={onAddToCart}
                className="flex-1 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-between shadow-md cursor-pointer"
              >
                <span>Add to Cart</span>
                <span className="font-mono font-black">{formatPrice(itemTotal, currency)}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
