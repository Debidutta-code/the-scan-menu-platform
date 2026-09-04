import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Eye,
  Sparkles,
  Plus,
  Minus,
  Check,
  Clock,
  Package,
} from 'lucide-react';
import { MenuBadge } from '../../pages/PublicTable/components/MenuBadge';

export interface CustomerDishPreviewProps {
  item: {
    _id?: string;
    name?: string;
    description?: string;
    pricingType?: 'SINGLE' | 'PORTION';
    price?: number;
    originalPrice?: number;
    variants?: Array<{ name: string; price: number; isDefault?: boolean }>;
    imageUrl?: string;
    isVegetarian?: boolean;
    isSpicy?: boolean;
    isChefsSpecial?: boolean;
    isTopPick?: boolean;
    prepTimeMinutes?: number;
    isCombo?: boolean;
    comboItems?: Array<{
      menuItemId?: string;
      name: string;
      categoryName?: string;
      quantity?: number;
      priceSnapshot?: number;
      imageUrl?: string;
    }>;
    addOns?: Array<{ name: string; priceDelta: number }>;
    attachedAddOnGroupIds?: string[];
  };
  previewMode?: 'LIST' | 'FULL';
  setPreviewMode?: (mode: 'LIST' | 'FULL') => void;
  isPaise?: boolean;
}

export const CustomerDishPreview: React.FC<CustomerDishPreviewProps> = ({
  item,
  previewMode: controlledPreviewMode,
  setPreviewMode: controlledSetPreviewMode,
  isPaise: explicitIsPaise,
}) => {
  const [internalPreviewMode, setInternalPreviewMode] = useState<'LIST' | 'FULL'>('LIST');
  const previewMode = controlledPreviewMode ?? internalPreviewMode;
  const setPreviewMode = controlledSetPreviewMode ?? setInternalPreviewMode;

  // Detect whether numbers are in paise or rupees if not explicit
  const isPaise = useMemo(() => {
    if (explicitIsPaise !== undefined) return explicitIsPaise;
    // Form values in Editor are in rupees (e.g. 150), whereas raw DB docs are in paise (e.g. 15000)
    // If price > 1000 and has no decimal part, or if item has _id and no explicit flag, it's typically paise
    if (item._id && (item.price || 0) >= 100) return true;
    return false;
  }, [explicitIsPaise, item]);

  const toRupees = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 0;
    return isPaise ? val / 100 : val;
  };

  const isPortion = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<any[]>([]);
  const [previewQty, setPreviewQty] = useState(1);
  const [isAddedToList, setIsAddedToList] = useState(false);

  const activeVariant = isPortion ? item.variants![selectedVariantIdx] || item.variants![0] : null;
  const basePrice = isPortion
    ? (activeVariant ? toRupees(activeVariant.price) : 0)
    : toRupees(item.price);

  const rawOriginalPrice = toRupees(item.originalPrice);
  const hasDiscount = rawOriginalPrice > 0 && rawOriginalPrice > basePrice;
  const savingsAmount = hasDiscount ? rawOriginalPrice - basePrice : 0;
  const savingsPercent = hasDiscount && rawOriginalPrice > 0 ? Math.round((savingsAmount / rawOriginalPrice) * 100) : 0;

  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + toRupees(a.priceDelta || 0), 0);
  const totalPrice = (basePrice + addOnsTotal) * previewQty;

  const minVariantPrice = isPortion && item.variants
    ? Math.min(...item.variants.map((v) => toRupees(v.price || 0)))
    : basePrice;

  return (
    <div className="space-y-3.5">
      {/* Mode Switch Tabs */}
      <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setPreviewMode('LIST')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            previewMode === 'LIST'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Customer Menu Card</span>
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode('FULL')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            previewMode === 'FULL'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Customer Full Detail</span>
        </button>
      </div>

      {/* Realistic Mobile Container */}
      <div className="bg-[#FAF9F6] border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-inner mx-auto w-full">
        {/* Mobile Top Bar */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-2 mb-2.5 border-b border-slate-200/60">
          <span className="font-bold text-slate-700">9:41</span>
          <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-full font-bold">Table #4</span>
        </div>

        {previewMode === 'LIST' ? (
          /* ========================================= */
          /* MODE 1: CUSTOMER LIST VIEW CARD           */
          /* ========================================= */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>✨ Diner Menu Feed</span>
              <span className="text-slate-400 font-normal">Tap to customize</span>
            </div>

            <div
              onClick={() => setPreviewMode('FULL')}
              className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 transition cursor-pointer space-y-2.5 group"
            >
              <div className="flex gap-3 items-start">
                {/* Dish Thumbnail */}
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-slate-100 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                      <Sparkles className="w-5 h-5 text-slate-300" />
                    </div>
                  )}

                  {/* Overlaid Badges */}
                  <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
                    {item.isCombo && (
                      <span className="text-[8px] font-black text-amber-950 uppercase tracking-wider px-1.5 py-0.5 bg-amber-400 rounded-full shadow-xs">
                        Combo
                      </span>
                    )}
                    {item.isChefsSpecial && !item.isCombo && (
                      <span className="text-[8px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-slate-950/85 rounded-full">
                        Special
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug break-words group-hover:text-amber-950 transition">
                      {item.name || 'Dish Name'}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                      {item.isSpicy && <MenuBadge variant="spicy" />}
                    </div>
                  </div>

                  {/* Badge Pills Row */}
                  <div className="flex items-center gap-1 flex-wrap text-[9px] font-semibold">
                    {item.isTopPick && (
                      <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                        ⭐ Top Pick
                      </span>
                    )}
                    {item.isChefsSpecial && (
                      <span className="bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded">
                        👨‍🍳 Chef&apos;s Special
                      </span>
                    )}
                    {item.prepTimeMinutes && (
                      <span className="text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> {item.prepTimeMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description || 'Appetizing dish description will appear here...'}
                  </p>

                  {/* Combo Included Items snippet */}
                  {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
                    <div className="text-[9px] text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md mt-1 leading-tight flex items-center gap-1 font-medium">
                      <Package className="w-2.5 h-2.5 shrink-0 text-amber-700" />
                      <span className="truncate">
                        Includes: {item.comboItems.map((c) => `${c.quantity && c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`).join(' + ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Add Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  {isPortion ? (
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">
                        {item.variants!.length} Sizes Available
                      </span>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        From ₹{minVariantPrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {hasDiscount && (
                          <span className="text-[10px] text-slate-400 line-through font-mono">
                            ₹{rawOriginalPrice.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 font-mono">
                          ₹{basePrice.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[8px] font-extrabold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono">
                            Save ₹{savingsAmount.toFixed(0)} ({savingsPercent}%)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddedToList(!isAddedToList);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-2xs cursor-pointer ${
                    isAddedToList
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {isAddedToList ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-slate-400">
              💡 Tap "Customer Full Detail" or the card above to test the expanded customization sheet.
            </p>
          </div>
        ) : (
          /* ========================================= */
          /* MODE 2: CUSTOMER FULL VIEW (DETAIL SHEET) */
          /* ========================================= */
          <div className="space-y-3 bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs max-h-[480px] overflow-y-auto [scrollbar-width:none]">
            {/* Hero Cover */}
            <div className="w-full h-36 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-100 flex items-center justify-center shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <Sparkles className="w-6 h-6 opacity-40 text-slate-400" />
                  <span className="text-[10px] font-bold mt-1 text-slate-400">Dish Photo</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                {item.isSpicy && <MenuBadge variant="spicy" />}
                {item.isTopPick && (
                  <span className="text-[8px] font-extrabold text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full shadow-xs">
                    ⭐ Top Pick
                  </span>
                )}
                {item.isChefsSpecial && (
                  <span className="text-[8px] font-bold text-white uppercase px-2 py-0.5 bg-slate-950/85 rounded-full">
                    Chef&apos;s Special
                  </span>
                )}
                {item.isCombo && (
                  <span className="text-[8px] font-black uppercase text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full shadow-xs">
                    Combo Bundle
                  </span>
                )}
              </div>
            </div>

            {/* Title & Pricing */}
            <div className="space-y-1">
              <h3 className="font-display text-sm font-bold text-slate-900 leading-snug break-words">
                {item.name || 'Dish Name'}
              </h3>

              {/* Price display with Strikethrough & Savings */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {hasDiscount && (
                  <span className="text-xs text-slate-400 line-through font-mono">
                    ₹{rawOriginalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-base font-black text-slate-900 font-mono">
                  ₹{basePrice.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono">
                    Save ₹{savingsAmount.toFixed(0)} ({savingsPercent}% OFF)
                  </span>
                )}
                {item.prepTimeMinutes && (
                  <span className="text-[10px] text-slate-400 font-medium font-mono flex items-center gap-0.5 ml-auto">
                    <Clock className="w-2.5 h-2.5" /> {item.prepTimeMinutes} mins prep
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-slate-600 text-[11px] leading-relaxed pt-1">
                {item.description || 'Full mouthwatering dish description will appear here for diners to read.'}
              </p>
            </div>

            {/* Combo Included Items Breakdown Box */}
            {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                    <Package className="w-3 h-3 text-amber-600" />
                    <span>Included in this Bundle ({item.comboItems.length} items)</span>
                  </span>
                </div>

                <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1.5">
                  {item.comboItems.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center justify-between text-xs bg-white p-1.5 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0">
                          {c.quantity || 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 truncate block text-[11px]">{c.name}</span>
                          {c.categoryName && (
                            <span className="text-[8px] text-slate-400 block">{c.categoryName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portion Sizes Selector */}
            {isPortion && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  Select Portion Size
                </label>
                <div className="space-y-1">
                  {item.variants!.map((v, vIdx) => {
                    const isSelected = selectedVariantIdx === vIdx;
                    return (
                      <div
                        key={vIdx}
                        onClick={() => setSelectedVariantIdx(vIdx)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                          </div>
                          <span className="text-[11px]">{v.name || `Size ${vIdx + 1}`}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold">
                          ₹{toRupees(v.price || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons Checklist */}
            {item.addOns && item.addOns.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                  Custom Add-Ons
                </label>
                <div className="space-y-1">
                  {item.addOns.map((addon, aIdx) => {
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
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
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
                            className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span className="text-[11px]">{addon.name}</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-700">
                          +₹{toRupees(addon.priceDelta || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Mock */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-600 block">
                Special Cooking Request (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra crisp..."
                className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewQty(Math.max(1, previewQty - 1))}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center text-xs font-mono font-bold text-slate-900">
                  {previewQty}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewQty(previewQty + 1)}
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-between px-3 shadow-sm cursor-pointer active:scale-98"
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

export default CustomerDishPreview;
