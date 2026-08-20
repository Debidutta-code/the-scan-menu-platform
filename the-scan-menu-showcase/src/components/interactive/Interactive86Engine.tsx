import React, { useState } from 'react';
import { 
  Flame, 
  Zap, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Smartphone, 
  SlidersHorizontal,
  RefreshCw,
  Clock
} from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface DishState {
  id: string;
  name: string;
  category: string;
  price: number;
  stockCount: number;
  is86: boolean;
}

const SAMPLE_86_DISHES: DishState[] = [
  { id: 'dish-1', name: 'Prime Wagyu A5 Steak & Frites', category: 'Mains', price: 44.0, stockCount: 2, is86: false },
  { id: 'dish-2', name: 'Truffle Wild Mushroom Bruschetta', category: 'Starters', price: 16.5, stockCount: 14, is86: false },
  { id: 'dish-3', name: 'Burrata Wood-Fired Pizza', category: 'Pizzas', price: 24.0, stockCount: 0, is86: true },
  { id: 'dish-4', name: 'Smoked Amber Old Fashioned', category: 'Drinks', price: 18.0, stockCount: 20, is86: false },
];

export const Interactive86Engine: React.FC = () => {
  const [dishes, setDishes] = useState<DishState[]>(SAMPLE_86_DISHES);
  const [syncTimestamp, setSyncTimestamp] = useState<string>('Connected (Edge WebSocket)');
  const [lastToggledName, setLastToggledName] = useState<string | null>(null);

  const toggle86 = (id: string) => {
    soundManager.playTapSound();
    setDishes((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextState = !d.is86;
          setLastToggledName(`${d.name} marked ${nextState ? 'SOLD OUT (86)' : 'AVAILABLE'}`);
          return { ...d, is86: nextState };
        }
        return d;
      })
    );

    setSyncTimestamp(`Propagated in 0.28s to all tables`);
    setTimeout(() => {
      setLastToggledName(null);
    }, 4000);
  };

  return (
    <div className="w-full bg-[#08080c] rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20 mb-2">
            <Zap size={14} className="animate-pulse" />
            <span>REAL-TIME INVENTORY • SUB-1-SECOND WEBSOCKET SYNC</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">
            1-Click Instant "86" Sold-Out Engine
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl mt-1">
            Toggle sold-out dishes in your manager dashboard and watch active diner phone screens update across every table in under 1 second. Zero paper reprint costs.
          </p>
        </div>

        <div className="p-3 bg-zinc-950 rounded-2xl border border-white/5 flex items-center gap-2 text-xs font-mono text-emerald-400">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{syncTimestamp}</span>
        </div>
      </div>

      {lastToggledName && (
        <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <span>⚡ Live Sync: {lastToggledName}</span>
          <span className="text-[10px] text-zinc-400">&lt;0.3s edge broadcast</span>
        </div>
      )}

      {/* Side-by-Side Synchronized Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Manager Control Portal */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <SlidersHorizontal size={14} />
              <span>Manager Live Availability Portal</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Click toggle to broadcast 86</span>
          </div>

          <div className="space-y-3">
            {dishes.map((dish) => (
              <div
                key={dish.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  dish.is86
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-zinc-900/90 border-white/10 hover:border-amber-400/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{dish.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({dish.category})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-amber-400 font-bold">${dish.price.toFixed(2)}</span>
                    <span className={`text-[10px] ${dish.is86 ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                      {dish.is86 ? 'Status: SOLD OUT (86)' : `In Stock: ${dish.stockCount} portions`}
                    </span>
                  </div>
                </div>

                {/* 1-Click Toggle Button */}
                <button
                  onClick={() => toggle86(dish.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md flex items-center gap-1.5 shrink-0 ${
                    dish.is86
                      ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                  }`}
                >
                  <RefreshCw size={12} className={dish.is86 ? 'rotate-180' : ''} />
                  <span>{dish.is86 ? '86 (Sold Out)' : 'In Stock'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Diner Smartphone View */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[320px] bg-zinc-950 rounded-[32px] border-4 border-zinc-700 p-4 shadow-2xl space-y-3">
            <div className="w-16 h-3 bg-black rounded-full mx-auto" />
            
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] font-mono text-zinc-400">TABLE #04 MENU</span>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE SYNC
              </span>
            </div>

            <div className="space-y-2">
              {dishes.map((dish) => (
                <div
                  key={dish.id}
                  className={`p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                    dish.is86
                      ? 'bg-red-950/20 border-red-500/40 opacity-70'
                      : 'bg-zinc-900 border-white/5'
                  }`}
                >
                  {dish.is86 && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-red-500 text-white font-mono text-[8px] font-extrabold uppercase">
                      86 SOLD OUT
                    </div>
                  )}

                  <div className="text-[11px] font-bold text-white pr-16">{dish.name}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ${dish.price.toFixed(2)}
                    </span>
                    <button
                      disabled={dish.is86}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        dish.is86
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-amber-400 text-black'
                      }`}
                    >
                      {dish.is86 ? 'Unavailable' : '+ Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2 text-[9px] font-mono text-zinc-500">
              Changes reflect on guest phones instantly
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
