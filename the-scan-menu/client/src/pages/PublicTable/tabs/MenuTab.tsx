import React from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, X, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { MenuTabProps } from '../types';
import { MenuBadge, MenuSkeleton, QuickAddControl } from '../components/MenuBadge';
import { formatPrice } from '../utils';

export const MenuTab: React.FC<MenuTabProps> = ({
  isMenuLoading,
  filteredCategories,
  currency,
  searchQuery,
  dietFilter,
  priceSort,
  activeCategoryId,
  activePillRef,
  categoryNavRef,
  activeOrderCount,
  activeOrdersIds,
  chefsSpecialFilter,
  onChefsSpecialFilterToggle,
  onSearchChange,
  onSearchClear,
  onDietFilterChange,
  onPriceSortChange,
  onCategoryClick,
  onItemCardClick,
  onQuickAdd,
  onQuickIncrement,
  onQuickDecrement,
  onTrackOrders,
  getItemCartQuantity,
  getItemBadge,
  featureFlags,
}) => {
  const isOrderingEnabled = featureFlags.some(f => f.key === 'ordering' && f.enabled);

  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Integrated Search & Filter Controls */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search dishes, drinks, pizzas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl border border-slate-150 shadow-sm focus:outline-none focus:border-slate-400 transition-all text-sm placeholder:text-slate-400 text-slate-800 font-medium"
          />
          {searchQuery && (
            <button
              onClick={onSearchClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex gap-2 items-center justify-between overflow-x-auto no-scrollbar py-0.5">
          {/* Filter Toggles Group */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Veg Toggle */}
            <button
              type="button"
              onClick={() => onDietFilterChange(dietFilter === 'veg' ? 'all' : 'veg')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                dietFilter === 'veg'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-400/30'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dietFilter === 'veg' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-emerald-500'}`} />
              <span>Veg</span>
            </button>

            {/* Non-Veg Toggle */}
            <button
              type="button"
              onClick={() => onDietFilterChange(dietFilter === 'nonveg' ? 'all' : 'nonveg')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                dietFilter === 'nonveg'
                  ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs ring-1 ring-rose-400/30'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dietFilter === 'nonveg' ? 'bg-rose-500 ring-2 ring-rose-300' : 'bg-rose-500'}`} />
              <span>Non-Veg</span>
            </button>

            {/* Chef's Special Toggle */}
            <button
              type="button"
              onClick={onChefsSpecialFilterToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                chefsSpecialFilter
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-400/30'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${chefsSpecialFilter ? 'text-amber-600' : 'text-amber-500'}`} strokeWidth={2.5} />
              <span>Chef's Special</span>
            </button>
          </div>

          {/* Price Sort Dropdown */}
          <select
            value={priceSort}
            onChange={(e) => onPriceSortChange(e.target.value as any)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none font-bold text-xs text-slate-700 shrink-0 cursor-pointer shadow-xs"
          >
            <option value="default">Sort Price</option>
            <option value="low-high">Low to High</option>
            <option value="high-low">High to Low</option>
          </select>
        </div>
      </div>

      {/* Track Orders Banner */}
      {activeOrderCount > 0 && (
        <div className="max-w-md mx-auto px-4">
          <div className="bg-amber-50 border border-amber-200/65 rounded-3xl p-4 flex items-center justify-between shadow-sm animate-fade-in gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Track Placed Orders</h4>
                <p className="text-[10px] text-slate-500 font-medium">You have {activeOrderCount} order{activeOrderCount > 1 ? 's' : ''} placed at this table.</p>
              </div>
            </div>
            <button
              onClick={() => {
                onTrackOrders(activeOrdersIds[activeOrdersIds.length - 1]);
              }}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm shrink-0 whitespace-nowrap"
            >
              <span>Track Status</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Horizontal category sub nav */}
      {filteredCategories.length > 0 && (
        <div className="sticky top-0 z-20 py-2.5 bg-slate-50/90 backdrop-blur-md border-b border-slate-150">
          <div
            ref={categoryNavRef}
            className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-4"
          >
            {filteredCategories.map((category) => {
              const isActive = activeCategoryId === category._id;
              return (
                <button
                  key={category._id}
                  ref={isActive ? activePillRef : null}
                  onClick={() => onCategoryClick(category._id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap tracking-wide transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-150 hover:bg-slate-50'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 space-y-8">
        {isMenuLoading ? (
          <MenuSkeleton />
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 p-8 space-y-3">
            <SearchIcon className="w-10 h-10 text-slate-300 mx-auto animate-pulse" strokeWidth={1.75} />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">No matching dishes found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Try adjusting your query or choosing another dietary filter.</p>
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchClear();
                  onDietFilterChange('all');
                  onPriceSortChange('default');
                }}
                className="mt-2 text-xs font-bold text-amber-600 hover:underline"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section
                key={category._id}
                id={`category-section-${category._id}`}
                data-category-section={category._id}
                className="space-y-4 pt-2 scroll-mt-24"
              >
                <h3 className="font-display text-2xl font-normal text-slate-900 tracking-tight pl-1 border-l-2 border-amber-500">
                  {category.name}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {category.menuItems.map((item, idx) => {
                    const badge = getItemBadge(item, idx);
                    const cartQty = getItemCartQuantity(item._id);
                    const isPortion = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
                    const isCombo = !!item.isCombo;

                    return (
                      <div
                        key={item._id}
                        onClick={() => onItemCardClick(item)}
                        className={`flex flex-col sm:flex-row gap-3.5 p-4 bg-white rounded-3xl border transition-all ${
                          item.isAvailable
                            ? 'border-slate-150 hover:border-slate-300 shadow-sm cursor-pointer active:scale-[0.99]'
                            : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex gap-3.5 items-start">
                          {/* Image with featured badges */}
                          <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                                <Sparkles className="w-5 h-5 opacity-40" strokeWidth={1.75} />
                              </div>
                            )}
                            {badge && item.isAvailable && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[8px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-slate-950/85 rounded-full backdrop-blur-sm">
                                  {badge}
                                </span>
                              </div>
                            )}
                            {isCombo && item.isAvailable && !badge && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[8px] font-black text-amber-950 uppercase tracking-wider px-1.5 py-0.5 bg-amber-400 rounded-full shadow-2xs">
                                  Combo
                                </span>
                              </div>
                            )}
                            {item.isChefsSpecial && item.isAvailable && !badge && !isCombo && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[8px] font-black text-amber-950 uppercase tracking-wider px-1.5 py-0.5 bg-amber-400 rounded-full shadow-2xs flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> Chef's Special
                                </span>
                              </div>
                            )}
                            {!item.isAvailable && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white uppercase tracking-wider px-1.5 py-0.5 bg-black/60 rounded">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Details Header */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug break-words">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                                {item.isSpicy && <MenuBadge variant="spicy" />}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}

                            {/* Combo bundled items preview */}
                            {isCombo && item.comboItems && item.comboItems.length > 0 && (
                              <p className="text-[10px] text-amber-800 font-medium line-clamp-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                                Includes: {item.comboItems.map((c) => `${c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`).join(' + ')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Pricing & Add Controls Row */}
                        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 w-full">
                          {/* Price Display */}
                          <div className="flex flex-col">
                            {isPortion && item.variants && item.variants.length > 0 ? (
                              <>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {item.variants.length} Sizes
                                </span>
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  From {formatPrice(Math.min(...item.variants.map((v) => v.price)), currency)}
                                </span>
                              </>
                            ) : item.addOns && item.addOns.length > 0 ? (
                              <>
                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                                  Customizable
                                </span>
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  {formatPrice(item.price, currency)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-black text-slate-900 font-mono">
                                {formatPrice(item.price, currency)}
                              </span>
                            )}
                          </div>

                          {/* Add / Stepper Action */}
                          {isOrderingEnabled && (
                            item.isAvailable ? (
                              <QuickAddControl
                                cartQty={cartQty}
                                isCustomizable={(isPortion && !!item.variants && item.variants.length > 0) || (!!item.addOns && item.addOns.length > 0)}
                                onAdd={(e) => onQuickAdd(item, e)}
                                onIncrement={(e) => onQuickIncrement(item, e)}
                                onDecrement={(e) => onQuickDecrement(item, e)}
                              />
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                                Sold Out
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* End of Menu Brick UI - Pure Background 3D Typography */}
            <div className="pt-4 pb-6 flex flex-col items-center justify-center text-center select-none px-4">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2 max-w-sm mx-auto">
                <div className="flex items-center gap-1">
                  {['F', 'E', 'A', 'S', 'T'].map((char, i) => {
                    const rotations = [-3, 2, -2, 3, -1];
                    const rot = rotations[i % rotations.length];
                    return (
                      <span
                        key={i}
                        style={{
                          transform: `rotate(${rot}deg)`,
                          display: 'inline-block',
                          color: '#FFFFFF',
                          WebkitTextStroke: '2px #0f172a',
                          paintOrder: 'stroke fill',
                          textShadow: `
                            0 3px 0 #FFB300,
                            0 4px 0 #FFA000,
                            0 5px 0 #FF8F00,
                            0 6px 0 #FF6F00,
                            0 7px 0 #F57C00,
                            0 8px 0 #E65100,
                            0 9px 0 #DD2C00,
                            0 10px 0 #BF360C,
                            0 12px 0 #871400,
                            0 15px 22px rgba(15, 23, 42, 0.25)
                          `,
                        }}
                        className="font-black text-5xl sm:text-6xl tracking-tight select-none transition-transform hover:scale-110 active:scale-95"
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  {['M', 'O', 'D', 'E'].map((char, i) => {
                    const rotations = [2, -2, 3, -2];
                    const rot = rotations[i % rotations.length];
                    return (
                      <span
                        key={i}
                        style={{
                          transform: `rotate(${rot}deg)`,
                          display: 'inline-block',
                          color: '#FFFFFF',
                          WebkitTextStroke: '2px #0f172a',
                          paintOrder: 'stroke fill',
                          textShadow: `
                            0 3px 0 #FFB300,
                            0 4px 0 #FFA000,
                            0 5px 0 #FF8F00,
                            0 6px 0 #FF6F00,
                            0 7px 0 #F57C00,
                            0 8px 0 #E65100,
                            0 9px 0 #DD2C00,
                            0 10px 0 #BF360C,
                            0 12px 0 #871400,
                            0 15px 22px rgba(15, 23, 42, 0.25)
                          `,
                        }}
                        className="font-black text-5xl sm:text-6xl tracking-tight select-none transition-transform hover:scale-110 active:scale-95"
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono mt-3">
                SERVED FRESH & HOT
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
