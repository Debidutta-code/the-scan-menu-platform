import React from 'react';
import { Compass, Sparkles, BellRing, ClipboardList } from 'lucide-react';
import { BottomNavProps } from '../types';

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  cartItemsCount,
  waiterCallState,
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-150 flex items-center justify-around px-4 pb-safe z-40 shadow-lg select-none">
      {/* Landing */}
      <button
        onClick={() => onTabChange('landing')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
          activeTab === 'landing' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
        }`}
      >
        <Compass className="w-5 h-5" strokeWidth={1.75} />
        <span className="text-[10px] leading-none">Home</span>
      </button>

      {/* Menu & Search */}
      <button
        onClick={() => onTabChange('menu')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${
          activeTab === 'menu' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
        }`}
      >
        <Sparkles className="w-5 h-5" strokeWidth={1.75} />
        <span className="text-[10px] leading-none">Menu & Search</span>
      </button>

      {/* Call Waiter */}
      <button
        onClick={() => onTabChange('waiter')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
          activeTab === 'waiter' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
        }`}
      >
        <BellRing className="w-5 h-5" strokeWidth={1.75} />
        <span className="text-[10px] leading-none">Assistance</span>
        {waiterCallState === 'waiting' && (
          <span className="absolute top-2 right-1/4 h-2 w-2 bg-amber-500 rounded-full animate-ping" />
        )}
      </button>

      {/* Cart & Orders */}
      <button
        onClick={() => onTabChange('cart-orders')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative transition-all ${
          activeTab === 'cart-orders' ? 'text-slate-950 font-black' : 'text-slate-400 font-semibold'
        }`}
      >
        <div className="relative">
          <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-[10px] leading-none">Cart & Orders</span>
      </button>
    </nav>
  );
};
