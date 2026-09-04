import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { MenuItem } from '../../../services/restaurant.service';
import { MenuBadge, QuickAddControl } from './MenuBadge';
import { formatPrice } from '../utils';

interface TopPicksCarouselProps {
  items: MenuItem[];
  currency: string;
  isOrderingEnabled: boolean;
  getItemCartQuantity: (itemId: string) => number;
  onItemClick: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, e: React.MouseEvent) => void;
  onQuickIncrement: (item: MenuItem, e: React.MouseEvent) => void;
  onQuickDecrement: (item: MenuItem, e: React.MouseEvent) => void;
}

export const TopPicksCarousel: React.FC<TopPicksCarouselProps> = ({
  items,
  currency,
  isOrderingEnabled,
  getItemCartQuantity,
  onItemClick,
  onQuickAdd,
  onQuickIncrement,
  onQuickDecrement,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filter only Top Picks or Combos or Chef's Specials with discount
  const topPicks = items.filter(
    (item) =>
      item.isAvailable &&
      (item.isTopPick ||
        item.isCombo ||
        (item.originalPrice && item.originalPrice > item.price) ||
        item.isChefsSpecial)
  );

  // Auto-scroll loop
  useEffect(() => {
    if (topPicks.length <= 1) return;

    const interval = setInterval(() => {
      if (isPaused || !scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: 240, behavior: 'smooth' });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, topPicks.length]);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleScrollBy = (offset: number) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (topPicks.length === 0) return null;

  return (
    <div
      className="w-full space-y-3 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Resume after 2 seconds
        setTimeout(() => setIsPaused(false), 2000);
      }}
    >
      {/* Carousel Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-xs shrink-0">
            <Sparkles className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 leading-tight">
              Chef's Specials &amp; Top Picks
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Handcrafted specials &amp; value bundles
            </p>
          </div>
        </div>

        {/* Scroll navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScrollBy(-260)}
            disabled={!canScrollLeft}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
              canScrollLeft
                ? 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer active:scale-90'
                : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollBy(260)}
            disabled={!canScrollRight}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
              canScrollRight
                ? 'bg-white border-slate-200 text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer active:scale-90'
                : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Card Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScrollability}
        className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1.5 px-1 -mx-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {topPicks.map((item) => {
          const cartQty = getItemCartQuantity(item._id);
          const hasDiscount = item.originalPrice && item.originalPrice > item.price;
          const savingsAmount = hasDiscount ? item.originalPrice! - item.price : 0;
          const isCombo = !!item.isCombo;
          const isPortion = item.pricingType === 'PORTION' && Array.isArray(item.variants) && item.variants.length > 0;
          const isCustomizable = (isPortion && !!item.variants && item.variants.length > 0) || (!!item.addOns && item.addOns.length > 0);

          return (
            <div
              key={item._id}
              onClick={() => onItemClick(item)}
              className="snap-start shrink-0 w-[240px] sm:w-[260px] h-[255px] bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col overflow-hidden active:scale-[0.985]"
            >
              {/* Card Image Area - Fixed 128px height with uniform object-cover */}
              <div className="relative w-full h-32 shrink-0 bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 text-slate-400 gap-1">
                    <Sparkles className="w-7 h-7 text-amber-400/60" strokeWidth={1.5} />
                    <span className="text-[10px] font-bold text-amber-900/60 uppercase tracking-wider">
                      {isCombo ? 'Meal Bundle' : "Chef's Special"}
                    </span>
                  </div>
                )}

                {/* Veg/Non-Veg Badge in Top-Left */}
                <div className="absolute top-2 left-2 z-10">
                  <MenuBadge variant={item.isVegetarian ? 'veg' : 'nonveg'} />
                </div>

                {/* Priority Badges in Top-Right */}
                <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                  {item.isChefsSpecial ? (
                    <span className="text-[9px] font-black text-amber-950 bg-amber-400/95 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide border border-amber-500/30 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 fill-amber-950 text-amber-950" /> Chef's Special
                    </span>
                  ) : hasDiscount ? (
                    <span className="text-[9px] font-black text-emerald-950 bg-emerald-300/95 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide border border-emerald-400">
                      Save {formatPrice(savingsAmount, currency)}
                    </span>
                  ) : isCombo ? (
                    <span className="text-[9px] font-black text-indigo-950 bg-indigo-200/95 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide border border-indigo-300">
                      Combo Deal
                    </span>
                  ) : item.isTopPick ? (
                    <span className="text-[9px] font-black text-amber-950 bg-amber-300/95 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide border border-amber-400">
                      ⭐ Top Pick
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-3 flex-1 flex flex-col justify-between min-h-0 space-y-1.5">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug">
                    {item.name}
                  </h4>

                  {/* Bundled Sub-Items or Description */}
                  {isCombo && item.comboItems && item.comboItems.length > 0 ? (
                    <p className="text-[10px] text-amber-800 font-semibold line-clamp-1 mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50">
                      Includes: {item.comboItems.map((c) => `${c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`).join(' + ')}
                    </p>
                  ) : item.description ? (
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                      {item.description}
                    </p>
                  ) : null}
                </div>

                {/* Pricing & Add Row */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                  <div className="flex flex-col">
                    {hasDiscount && (
                      <span className="text-[11px] text-slate-400 line-through font-mono leading-none">
                        {formatPrice(item.originalPrice!, currency)}
                      </span>
                    )}
                    <span className="text-sm font-black text-slate-900 font-mono leading-tight">
                      {formatPrice(item.price, currency)}
                    </span>
                  </div>

                  {isOrderingEnabled && (
                    <QuickAddControl
                      cartQty={cartQty}
                      isCustomizable={isCustomizable}
                      onAdd={(e) => onQuickAdd(item, e)}
                      onIncrement={(e) => onQuickIncrement(item, e)}
                      onDecrement={(e) => onQuickDecrement(item, e)}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
