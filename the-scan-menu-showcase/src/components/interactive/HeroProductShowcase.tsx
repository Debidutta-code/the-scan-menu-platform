import React, { useState } from 'react';
import { 
  Sparkles, 
  Zap, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  Star, 
  Plus, 
  Clock, 
  RotateCcw, 
  ShoppingBag, 
  Radio, 
  Wifi, 
  Battery, 
  ChevronRight,
  Utensils
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/sound';

export const HeroProductShowcase: React.FC = () => {
  const [activeItem, setActiveItem] = useState<number>(0);
  const [isTapped, setIsTapped] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(2);
  const [activeCategory, setActiveCategory] = useState<'all' | 'starters' | 'mains' | 'drinks'>('all');

  const heroDishes = [
    {
      id: 'dish-1',
      category: 'starters',
      name: 'Truffle Mushroom Bruschetta',
      desc: 'Artisan grilled sourdough, black truffle emulsion, shaved parmigiano',
      price: '$16.50',
      tag: '⭐ 4.9 Chef Choice',
      prep: '6 min',
      image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
    },
    {
      id: 'dish-2',
      category: 'mains',
      name: 'Prime Wagyu A5 Steak & Frites',
      desc: 'Miyazaki A5 striploin, black garlic herb butter, rosemary sea salt fries',
      price: '$44.00',
      tag: '🔥 Top Seller',
      prep: '14 min',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'dish-3',
      category: 'drinks',
      name: 'Smoked Amber Old Fashioned',
      desc: 'Oak-smoked Kentucky bourbon, Angostura bitters, torched orange peel',
      price: '$18.00',
      tag: '🍸 Signature',
      prep: '4 min',
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const filteredDishes = activeCategory === 'all'
    ? heroDishes
    : heroDishes.filter((d) => d.category === activeCategory);

  const handleSimulateTap = () => {
    soundManager.playTapSound();
    setIsTapped(true);
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981'],
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playTapSound();
    setIsTapped(false);
  };

  const handleAddItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playTapSound();
    setCartCount((prev) => prev + 1);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto py-4">
      {/* Ambient Backlight Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-amber-500/20 via-amber-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-12 w-80 h-80 bg-amber-600/15 rounded-full blur-2xl pointer-events-none" />

      {/* Main Luxury Stage Container */}
      <div className="relative glass-card rounded-[44px] border border-white/10 p-6 sm:p-10 md:p-12 shadow-2xl overflow-hidden backdrop-blur-2xl bg-zinc-950/80">
        
        {/* Top Metadata HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-8 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-zinc-200 font-bold uppercase tracking-wider">
              LUMINARY BISTRO &amp; BAR
            </span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-amber-400 font-semibold">TABLE #04 (TERRACE)</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
              <Zap size={12} className="animate-pulse" />
              <span>0.38s EDGE SPEED</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-400">
              NTAG216 • 13.56 MHz
            </span>
          </div>
        </div>

        {/* 3D Hardware Composition: Solid Walnut Stand (Left) + Sleek Tall iPhone 16 Pro (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT: Luxury Laser-Cut Smoky Acrylic & Solid American Walnut Stand */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            
            {/* Physical Stand Elevation */}
            <div 
              onClick={handleSimulateTap}
              className="relative w-full max-w-[260px] bg-gradient-to-b from-zinc-800 via-zinc-900 to-[#0c0c10] rounded-3xl border-2 border-amber-400/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center space-y-4 group transition-all duration-300 hover:border-amber-400 hover:scale-[1.02] cursor-pointer"
            >
              {/* Gloss Reflection Overlay */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent rounded-t-3xl pointer-events-none" />

              {/* Stand Top Brand Crown */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold border-b border-white/10 pb-2">
                <span className="text-amber-400 font-bold">TABLE #04</span>
                <span className="text-zinc-400 tracking-wider">THE SCAN MENU</span>
              </div>

              {/* High-Polish Metallic Gold NFC Touch Disc */}
              <div 
                className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 p-0.5 shadow-xl shadow-amber-500/25 transition-transform group-hover:scale-105 active:scale-95 group/disc"
                title="Click to simulate smartphone NFC tap"
              >
                <div className="w-full h-full rounded-full bg-[#0a0a0d] flex flex-col items-center justify-center p-2 relative overflow-hidden border border-amber-400/30">
                  <div className="absolute inset-0 bg-amber-400/15 rounded-full animate-ping opacity-25" />
                  <Smartphone size={20} className="text-amber-400 mb-0.5 transition-transform group-hover/disc:-translate-y-0.5" />
                  <span className="text-[8px] font-mono font-extrabold text-amber-400 tracking-wider">
                    TAP PHONE
                  </span>
                  <span className="text-[7px] text-zinc-500 font-mono">NFC INSTANT</span>
                </div>
              </div>

              {/* Laser-Engraved High-Contrast Vector QR Matrix */}
              <div className="w-full bg-white rounded-2xl p-3 shadow-inner flex flex-col items-center justify-center space-y-2 border border-zinc-200">
                <div className="w-24 h-24 grid grid-cols-4 gap-1 p-1 bg-white border-2 border-black rounded-lg">
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-2 h-2 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-black/80" />
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-2 h-2 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="col-span-2 row-span-2 bg-amber-500 rounded-sm flex items-center justify-center text-black font-extrabold text-[8px] font-mono shadow-sm">
                    PIXORA
                  </div>
                  <div className="bg-black/20" />
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-2 h-2 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-black" />
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-2 h-2 bg-white" /></div>
                </div>
                <span className="text-[8px] font-mono text-zinc-800 font-bold tracking-tight">
                  SCAN WITH CAMERA
                </span>
              </div>

              {/* Stand Solid Walnut Wood Base */}
              <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                <span>SOLID WALNUT BASE</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
            </div>

            {/* Simulation Action Controls Under Stand */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSimulateTap}
                className={`px-5 py-2.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-lg ${
                  isTapped
                    ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                    : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/25 scale-105'
                }`}
              >
                <Zap size={14} className={isTapped ? '' : 'animate-bounce'} />
                <span>{isTapped ? '✨ Menu Active on Phone' : 'Simulate Instant Tap Now'}</span>
              </button>

              {isTapped && (
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2.5 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
                  title="Reset to lock screen"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Perfectly Proportioned iPhone 16 Pro (Sleek Tall 19.5:9 Ratio) */}
          <div className="lg:col-span-7 flex justify-center">
            
            {/* Tall, Slim Titanium Phone Body (w-[315px] h-[660px]) */}
            <div 
              onClick={!isTapped ? handleSimulateTap : undefined}
              className={`relative w-[315px] h-[660px] rounded-[52px] p-[3.5px] bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950 ring-1 ring-white/20 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_rgba(245,158,11,0.15)] transition-all duration-500 shrink-0 ${
                !isTapped ? 'cursor-pointer hover:ring-amber-400/60 hover:scale-[1.01]' : ''
              }`}
            >
              
              {/* Inner OLED Display Container with Full Vertical Height */}
              <div className="relative bg-[#07070a] rounded-[49px] overflow-hidden p-4 text-zinc-100 h-full flex flex-col justify-between border border-black shadow-inner">
                
                {/* Dynamic Island */}
                <div className="w-24 h-5 bg-black rounded-full mx-auto mb-1.5 flex items-center justify-between px-2.5 border border-white/10 shadow-md shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] font-mono text-zinc-400 font-bold">
                    {isTapped ? '0.38s' : '5G'}
                  </span>
                </div>

                {/* Status Bar */}
                <div className="flex items-center justify-between px-2 text-[10px] text-zinc-400 font-mono mb-2 shrink-0">
                  <span className="font-bold text-white">9:41</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi size={11} className="text-zinc-300" />
                    <Battery size={13} className="text-emerald-400" />
                  </div>
                </div>

                {/* STATE A: IDLE / LOCKSCREEN STANDBY BEFORE TAP */}
                {!isTapped ? (
                  <div className="flex-1 flex flex-col items-center justify-between py-6 text-center space-y-4 animate-in fade-in duration-300">
                    
                    {/* Lockscreen Time & Date */}
                    <div className="space-y-1">
                      <div className="text-5xl font-extrabold text-white font-mono tracking-tight">
                        9:41
                      </div>
                      <p className="text-xs text-zinc-400 font-medium">
                        Saturday, August 9
                      </p>
                    </div>

                    {/* Central Pulsing NFC Radar Wave Beacon */}
                    <div className="relative my-auto flex flex-col items-center justify-center space-y-4 py-4">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
                        <div className="absolute inset-2 rounded-full border border-amber-400/40 animate-pulse" />
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/30 via-zinc-900 to-amber-400/10 border-2 border-amber-400/70 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/30">
                          <Radio size={36} className="animate-pulse" />
                        </div>
                      </div>

                      <div className="space-y-1.5 max-w-[230px]">
                        <span className="text-xs font-extrabold text-white block">
                          NFC Stand Detected • Table #04
                        </span>
                        <p className="text-[10px] text-zinc-400 leading-snug">
                          Hold iPhone near tabletop stand or tap below to unfurl 0.38s instant web menu.
                        </p>
                      </div>
                    </div>

                    {/* Tap to Unlock Button Inside Lockscreen */}
                    <button
                      onClick={handleSimulateTap}
                      className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-xl shadow-amber-500/30 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Zap size={15} />
                      <span>Tap to Open Menu (0.38s)</span>
                    </button>

                    {/* Bottom Indicator */}
                    <div className="text-[9px] font-mono text-zinc-500 flex items-center justify-center gap-1.5">
                      <span>⚡ Safari Edge Load</span>
                      <span>•</span>
                      <span>Zero App Installs</span>
                    </div>
                  </div>
                ) : (
                  /* STATE B: UNFURLED LIVE MOBILE WEB MENU WITH TALL PROPORTIONS & FOOD PHOTOS */
                  <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in zoom-in-95 duration-400">
                    
                    {/* Safari Address Bar Banner */}
                    <div className="p-2 rounded-xl bg-zinc-900/95 border border-white/10 flex items-center justify-between text-[10px] font-mono animate-in slide-in-from-top-2 shadow-sm shrink-0">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-zinc-200 font-bold">app.thescanmenu.com/table/4</span>
                      </div>
                      <span className="text-amber-400 font-bold">0.38s</span>
                    </div>

                    {/* Restaurant Brand Header in Mobile Web */}
                    <div className="flex items-center justify-between px-1 shrink-0">
                      <div>
                        <h4 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1">
                          <span>Luminary Bistro &amp; Bar</span>
                          <Sparkles size={12} className="text-amber-400" />
                        </h4>
                        <p className="text-[10px] text-amber-400 font-mono">
                          Table #04 • Contactless Menu
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-400/30">
                        4
                      </div>
                    </div>

                    {/* Category Filter Pills in Phone */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none shrink-0">
                      {[
                        { id: 'all', label: 'All Items' },
                        { id: 'starters', label: 'Starters' },
                        { id: 'mains', label: 'Wood Mains' },
                        { id: 'drinks', label: 'Cocktails' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playTapSound();
                            setActiveCategory(cat.id as any);
                          }}
                          className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors ${
                            activeCategory === cat.id
                              ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* High-Resolution Mouthwatering Food Photo Cards */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5 scrollbar-none">
                      {filteredDishes.map((dish, i) => {
                        const isSelected = activeItem === i;
                        return (
                          <div
                            key={dish.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              soundManager.playTapSound();
                              setActiveItem(i);
                            }}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex gap-3 items-center ${
                              isSelected
                                ? 'bg-zinc-900 border-amber-400 shadow-md shadow-amber-500/10 scale-[1.01]'
                                : 'bg-zinc-950/90 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {/* Crisp Food Photography Thumbnail */}
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md bg-zinc-900">
                              <img 
                                src={dish.image} 
                                alt={dish.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              {dish.isVeg && (
                                <div className="absolute top-1 left-1 w-3 h-3 bg-black/80 rounded-xs flex items-center justify-center p-0.5 border border-emerald-400">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                </div>
                              )}
                            </div>

                            {/* Dish Details */}
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <h5 className="text-[11px] font-bold text-white leading-tight">
                                {dish.name}
                              </h5>
                              <p className="text-[9px] text-zinc-400 line-clamp-1 leading-snug">
                                {dish.desc}
                              </p>
                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-xs font-mono font-extrabold text-amber-400">
                                  {dish.price}
                                </span>
                                <span className="text-[8px] text-zinc-500 font-mono">
                                  ⏱️ {dish.prep}
                                </span>
                              </div>
                            </div>

                            {/* Interactive Add Button */}
                            <button
                              onClick={handleAddItem}
                              className="w-7 h-7 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold text-xs hover:scale-110 active:scale-95 transition-transform shrink-0 shadow-md shadow-amber-500/20"
                              title="Add to table order"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Active Tab Summary Bar */}
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-black flex items-center justify-between text-xs font-bold shadow-lg shadow-amber-500/25 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono font-bold">
                          {cartCount}
                        </span>
                        <span>Table Tab Active</span>
                      </div>
                      <span className="font-mono text-xs font-extrabold">$60.50 ↗</span>
                    </div>
                  </div>
                )}

                {/* iPhone Home Indicator Bar */}
                <div className="w-28 h-1 bg-zinc-700 rounded-full mx-auto mt-2 shrink-0" />
              </div>
            </div>

          </div>

        </div>

        {/* Floating Telemetry Metric Chips Under Stage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 mt-8 border-t border-white/10 text-center">
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
            <span className="text-lg md:text-xl font-mono font-extrabold text-amber-400 block">0.38s</span>
            <span className="text-[10px] text-zinc-400 uppercase font-mono">Edge Load Speed</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
            <span className="text-lg md:text-xl font-mono font-extrabold text-white block">0 Apps</span>
            <span className="text-[10px] text-zinc-400 uppercase font-mono">Zero Installs</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
            <span className="text-lg md:text-xl font-mono font-extrabold text-emerald-400 block">&lt; 1s</span>
            <span className="text-[10px] text-zinc-400 uppercase font-mono">Real-Time 86 Sync</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5">
            <span className="text-lg md:text-xl font-mono font-extrabold text-amber-400 block">+21.4%</span>
            <span className="text-[10px] text-zinc-400 uppercase font-mono">Average Check Uplift</span>
          </div>
        </div>

      </div>
    </div>
  );
};
