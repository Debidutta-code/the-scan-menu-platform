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
  onSearchChange,
  onSearchClear,
  onDietFilterChange,
  onPriceSortChange,
  onCategoryClick,
  onItemCardClick,
  onQuickAdd,
  onAddVariant,
  onQuickIncrement,
  onQuickDecrement,
  onTrackOrders,
  getItemCartQuantity,
  getItemBadge,
}) => {
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

        <div className="flex gap-2.5 items-center justify-between">
          {/* Diet filter group */}
          <div className="flex gap-1">
            {([
              { key: 'all', label: 'All' },
              { key: 'veg', label: 'Veg' },
              { key: 'nonveg', label: 'Non-Veg' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => onDietFilterChange(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  dietFilter === opt.key
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Price Sort Dropdown */}
          <select
            value={priceSort}
            onChange={(e) => onPriceSortChange(e.target.value as any)}
            className="border border-slate-150 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none font-bold text-xs text-slate-600"
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
                          {isPortion && item.variants ? (
                            item.variants.length <= 3 ? (
                              <div className="flex items-center justify-between w-full gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">From</span>
                                  <span className="text-sm font-black text-slate-900 font-mono">
                                    {formatPrice(Math.min(...item.variants.map((v) => v.price)), currency)}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                  {item.variants.map((v) => (
                                    <button
                                      key={v.name}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAddVariant) onAddVariant(item, v, e);
                                        else onItemCardClick(item);
                                      }}
                                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                                      title={`Add ${item.name} (${v.name})`}
                                    >
                                      <span className="text-[10px] font-extrabold uppercase text-slate-900">{v.name}</span>
                                      <span className="font-mono font-black text-xs text-slate-950">
                                        {formatPrice(v.price, currency)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full gap-3">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.variants.length} Sizes</span>
                                  <span className="text-sm font-black text-slate-900 font-mono">
                                    From {formatPrice(Math.min(...item.variants.map((v) => v.price)), currency)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onItemCardClick(item);
                                  }}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition shadow-xs active:scale-95 shrink-0 cursor-pointer"
                                >
                                  Options
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="text-sm font-black text-slate-900 font-mono">
                                {formatPrice(item.price, currency)}
                              </span>
                              {item.isAvailable ? (
                                <QuickAddControl
                                  cartQty={cartQty}
                                  onAdd={(e) => onQuickAdd(item, e)}
                                  onIncrement={(e) => onQuickIncrement(item, e)}
                                  onDecrement={(e) => onQuickDecrement(item, e)}
                                />
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  Sold Out
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
