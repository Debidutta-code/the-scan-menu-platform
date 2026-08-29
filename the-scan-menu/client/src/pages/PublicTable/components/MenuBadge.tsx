import React from 'react';
import { Flame, Plus, Minus } from 'lucide-react';

// ==========================================
// MENU BADGE
// ==========================================

interface MenuBadgeProps {
  variant: 'veg' | 'nonveg' | 'egg' | 'spicy';
}

export const MenuBadge: React.FC<MenuBadgeProps> = ({ variant }) => {
  if (variant === 'veg') {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-[1.5px] border-emerald-600 bg-white shadow-2xs shrink-0"
        title="Vegetarian"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-600" />
      </span>
    );
  }
  if (variant === 'nonveg') {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-[1.5px] border-rose-700 bg-white shadow-2xs shrink-0"
        title="Non-Vegetarian"
      >
        <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-700" />
      </span>
    );
  }
  if (variant === 'egg') {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] border-[1.5px] border-amber-500 bg-white shadow-2xs shrink-0"
        title="Contains Egg"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500" />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shrink-0"
      title="Spicy"
    >
      <Flame className="w-2.5 h-2.5 text-rose-600 fill-rose-500" strokeWidth={2} />
      <span>Spicy</span>
    </span>
  );
};

// ==========================================
// MENU SKELETON (Loading State)
// ==========================================

export const MenuSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex gap-2 overflow-x-hidden py-2">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-9 w-24 bg-slate-200 rounded-full shrink-0" />
      ))}
    </div>
    {[1, 2].map((cat) => (
      <div key={cat} className="space-y-4">
        <div className="h-7 bg-slate-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ==========================================
// MENU ITEM CARD QUICK-ADD CONTROLS
// ==========================================

interface QuickAddControlProps {
  cartQty: number;
  isCustomizable?: boolean;
  onAdd: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
  onDecrement: (e: React.MouseEvent) => void;
}

export const QuickAddControl: React.FC<QuickAddControlProps> = ({
  cartQty,
  isCustomizable = false,
  onAdd,
  onIncrement,
  onDecrement,
}) => {
  if (cartQty > 0) {
    return (
      <div className="flex flex-col items-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 bg-slate-950 text-white rounded-2xl px-2 py-1 shadow-sm border border-slate-900">
          <button
            type="button"
            onClick={onDecrement}
            className="w-5 h-5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition active:scale-90 cursor-pointer"
            title="Decrease quantity"
          >
            <Minus className="w-3 h-3" strokeWidth={2.5} />
          </button>
          <span className="w-4 text-center font-mono font-black text-xs text-amber-400">
            {cartQty}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="w-5 h-5 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-950 transition active:scale-90 cursor-pointer"
            title="Increase quantity"
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </div>
        {isCustomizable && (
          <span className="text-[9px] font-bold text-amber-700 font-mono tracking-tight leading-none pr-1">
            Customised
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 text-[11px] font-black text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-3.5 py-1.5 rounded-2xl transition-all shadow-xs active:scale-95 uppercase tracking-wider cursor-pointer"
      >
        <Plus className="w-3 h-3" strokeWidth={3} />
        <span>{isCustomizable ? 'Options' : 'Add'}</span>
      </button>
      {isCustomizable && (
        <span className="text-[9px] font-semibold text-slate-400 font-mono tracking-tight leading-none pr-1">
          customisable
        </span>
      )}
    </div>
  );
};

// ==========================================
// EMPTY STATE
// ==========================================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="text-center py-12 bg-white rounded-3xl border border-slate-150 p-8 space-y-4">
    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto">
      {icon}
    </div>
    <div className="space-y-1">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{description}</p>
    </div>
    {action}
  </div>
);
