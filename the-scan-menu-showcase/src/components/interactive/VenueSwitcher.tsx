import React, { useState } from 'react';
import { Utensils, Coffee, Building2, Wine, Flame, Store, Check } from 'lucide-react';
import { soundManager } from '../../utils/sound';

export const VenueSwitcher: React.FC = () => {
  const [activeVenue, setActiveVenue] = useState('Restaurant');

  const venues = [
    { name: 'Restaurant', icon: Utensils, subtitle: 'Fine & Casual Dining', theme: 'Amber Gold', font: 'Serif Elegance', items: 'Truffle Pasta, Wagyu Steak, Tiramisu' },
    { name: 'Cafe', icon: Coffee, subtitle: 'Artisan Coffee & Bakery', theme: 'Warm Mocha', font: 'Clean Minimal', items: 'Cold Brew, Almond Croissant, Avocado Toast' },
    { name: 'Hotel', icon: Building2, subtitle: 'In-Room Dining & Suites', theme: 'Obsidian Velvet', font: 'Luxury Monospace', items: 'Club Sandwich, High Tea, Breakfast Tray' },
    { name: 'Bar & Lounge', icon: Wine, subtitle: 'Cocktails & Nightlife', theme: 'Neon Amber', font: 'Bold Cyber', items: 'Smoked Old Fashioned, Craft IPA, Sliders' },
    { name: 'Cloud Kitchen', icon: Flame, subtitle: 'Delivery & Pick-up', theme: 'High Contrast', font: 'Fast Grid', items: 'Gourmet Burgers, Burrito Bowls, Wings' },
    { name: 'Food Court', icon: Store, subtitle: 'Multi-Counter Venues', theme: 'Multi-Brand', font: 'Compact List', items: 'Dim Sum, Ramen, Boba Tea' },
  ];

  const current = venues.find((v) => v.name === activeVenue) || venues[0];

  const handleSelect = (name: string) => {
    soundManager.playTapSound();
    setActiveVenue(name);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      {/* Pills Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {venues.map((venue) => {
          const isSelected = activeVenue === venue.name;
          return (
            <button
              key={venue.name}
              onClick={() => handleSelect(venue.name)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <venue.icon size={16} />
              <span>{venue.name}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Stage Preview */}
      <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
            <current.icon size={14} />
            <span>VENUE TYPE RE-THEMING</span>
          </div>

          <h3 className="text-3xl font-extrabold text-white">{current.name} Experience</h3>
          <p className="text-sm text-zinc-400">{current.subtitle}</p>

          <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-mono-accent">VISUAL STYLE:</span>
              <span className="font-bold text-amber-400">{current.theme}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-mono-accent">TYPOGRAPHY PRESET:</span>
              <span className="font-bold text-white">{current.font}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-mono-accent">POPULAR OFFERINGS:</span>
              <span className="font-bold text-zinc-300">{current.items}</span>
            </div>
          </div>
        </div>

        {/* Live Phone Preview Transformation */}
        <div className="relative w-full max-w-xs mx-auto aspect-[9/16] bg-zinc-950 rounded-3xl border-4 border-zinc-700 p-4 shadow-2xl overflow-hidden flex flex-col justify-between">
          <div className="w-20 h-3 bg-black rounded-full mx-auto" />
          <div className="text-center py-2 border-b border-white/10">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{current.name} Menu</span>
          </div>

          <div className="space-y-2 my-auto">
            {current.items.split(', ').map((item, i) => (
              <div key={i} className="p-3 bg-zinc-900/90 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-white">{item}</h5>
                  <span className="text-[10px] text-zinc-400">Customized layout</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs">
                  +
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-amber-400 rounded-xl text-center font-bold text-black text-xs">
            Send Order to Kitchen
          </div>
        </div>
      </div>
    </div>
  );
};
