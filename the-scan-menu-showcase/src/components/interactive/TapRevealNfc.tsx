import React, { useState } from 'react';
import { Smartphone, Zap, CheckCircle2, ShoppingBag, Sparkles, QrCode, CreditCard, RotateCcw, Utensils, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/sound';

export const TapRevealNfc: React.FC = () => {
  const [standType, setStandType] = useState<'stand' | 'card'>('stand');
  const [isTapped, setIsTapped] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'starters' | 'mains' | 'drinks'>('all');
  const [cart, setCart] = useState<{ name: string; price: number; count: number }[]>([]);
  const [orderSent, setOrderSent] = useState(false);

  const menuItems = [
    { id: '1', category: 'starters', name: 'Truffle Wild Mushroom Bruschetta', price: 16.5, desc: 'Grilled sourdough, shaved black truffle, aged parmesan', tag: 'Chef Choice' },
    { id: '2', category: 'mains', name: 'Prime Wagyu A5 Steak & Frites', price: 42.0, desc: 'Truffle herb butter, rosemary sea salt fries', tag: 'Popular' },
    { id: '3', category: 'drinks', name: 'Smoked Amber Old Fashioned', price: 18.0, desc: 'Oak-smoked bourbon, bitters, torched orange peel', tag: 'Signature' },
    { id: '4', category: 'starters', name: 'Burrata & Heirloom Peach Salad', price: 19.0, desc: 'Prosciutto di Parma, basil reduction, pine nuts', tag: 'Fresh' },
  ];

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter((item) => item.category === activeCategory);

  const handleTapAction = () => {
    soundManager.playTapSound();
    setIsTapped(!isTapped);
    if (!isTapped) {
      setOrderSent(false);
    }
  };

  const handleAddToCart = (item: { name: string; price: number }) => {
    soundManager.playTapSound();
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => (i.name === item.name ? { ...i, count: i.count + 1 } : i));
      }
      return [...prev, { name: item.name, price: item.price, count: 1 }];
    });
  };

  const handleSendOrder = () => {
    soundManager.playTapSound();
    setOrderSent(true);
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#fbbf24', '#ffffff', '#10b981'],
    });
    setTimeout(() => {
      setOrderSent(false);
    }, 4000);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.count, 0);
  const totalItemCount = cart.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      {/* Side by Side Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Descriptive Story, Hardware Switcher & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Zap size={14} className="animate-pulse" />
              <span>SIGNATURE UX • DUAL QR + NFC TAP INTERACTION</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Tap Phone to Stand. <br />
              <span className="amber-text-gradient">Menu Opens in 0.38s.</span>
            </h2>

            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              No searching for camera apps. No QR alignment in dim restaurant candlelight. Guests simply rest their phone on the luxury tabletop stand or NFC card, and your interactive ordering menu unfurls instantly.
            </p>
          </div>

          {/* Hardware Form Factor Switcher */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3">
            <span className="text-xs font-mono-accent text-zinc-400 uppercase tracking-wider font-semibold block">
              Choose Hardware Form Factor:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  soundManager.playTapSound();
                  setStandType('stand');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  standType === 'stand'
                    ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                <QrCode size={14} />
                <span>QR + NFC Stand</span>
              </button>
              <button
                onClick={() => {
                  soundManager.playTapSound();
                  setStandType('card');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                  standType === 'card'
                    ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                <CreditCard size={14} />
                <span>NFC Business Card</span>
              </button>
            </div>
          </div>

          {/* Primary Simulation Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTapAction}
              data-cursor={isTapped ? 'Tap Again' : 'Tap Phone'}
              className={`px-6 py-3.5 rounded-full text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all ${
                isTapped
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/20'
                  : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/25 scale-105'
              }`}
            >
              <Smartphone size={16} />
              <span>{isTapped ? 'Reset Phone Position' : 'Simulate Phone Tap Now'}</span>
            </button>

            {isTapped && (
              <button
                onClick={() => {
                  setIsTapped(false);
                  setCart([]);
                  setOrderSent(false);
                }}
                className="px-4 py-3.5 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Reset Demo</span>
              </button>
            )}
          </div>

          {/* Value Bullet Points */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Zero App Downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Haptic Tap Feedback</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Auto Table #08 Identification</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Real-Time Menu Sync</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Hardware Stand & Phone Screen Stage */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          
          {/* Ambient Glow Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-amber-500/5 rounded-3xl blur-2xl pointer-events-none" />

          {/* Interactive Stage Container */}
          <div className="w-full max-w-[420px] bg-zinc-950/90 rounded-3xl border border-white/10 p-5 md:p-6 shadow-2xl relative overflow-hidden amber-glow flex flex-col items-center">
            
            {/* Top Hardware Stage: Stand or Card */}
            <div className="w-full flex flex-col items-center mb-4">
              
              {standType === 'stand' ? (
                /* Dual QR + NFC Luxury Tabletop Stand */
                <div 
                  onClick={handleTapAction}
                  data-cursor="TAP NFC"
                  className="w-full max-w-[320px] bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-amber-400/60 rounded-2xl p-4 shadow-xl cursor-pointer hover:border-amber-400 transition-all group relative overflow-hidden"
                >
                  {/* Acrylic Gloss Reflection */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-black font-extrabold text-xs shadow-md">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-white tracking-tight">PIXORA STAND</h4>
                        <span className="text-[9px] text-amber-400 font-mono-accent block">TABLE #08 • DUAL NFC+QR</span>
                      </div>
                    </div>

                    <div className="px-2 py-1 rounded-md bg-zinc-950 text-[10px] font-mono-accent font-bold text-amber-400 border border-amber-400/30">
                      TAP OR SCAN
                    </div>
                  </div>

                  {/* Dual Targets: QR on Left, NFC Disc on Right */}
                  <div className="mt-3 grid grid-cols-2 gap-3 items-center">
                    {/* QR Target */}
                    <div className="bg-white p-2 rounded-xl flex flex-col items-center justify-center shadow-inner">
                      <QrCode size={46} className="text-black" />
                      <span className="text-[8px] font-bold text-zinc-900 mt-0.5">CAMERA SCAN</span>
                    </div>

                    {/* NFC Target Disc */}
                    <div className="bg-zinc-950 border border-amber-400/50 p-2.5 rounded-xl flex flex-col items-center justify-center relative group-hover:scale-105 transition-transform">
                      <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400 flex items-center justify-center text-amber-400 animate-pulse">
                        <Zap size={20} />
                      </div>
                      <span className="text-[8px] font-mono-accent font-bold text-amber-400 mt-1">TAP NFC DISC</span>
                    </div>
                  </div>

                  {/* Hint bar */}
                  <div className="mt-2 text-center text-[10px] text-zinc-400 font-medium">
                    {isTapped ? 'Phone connected to Table 08' : 'Click here or button to tap phone'}
                  </div>
                </div>
              ) : (
                /* Luxury Matte Black NFC Business Card */
                <div 
                  onClick={handleTapAction}
                  data-cursor="TAP CARD"
                  className="w-full max-w-[320px] aspect-[1.586/1] bg-gradient-to-tr from-zinc-900 via-zinc-950 to-zinc-900 border border-amber-400/60 rounded-2xl p-5 shadow-2xl cursor-pointer hover:border-amber-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-accent font-bold text-amber-400 tracking-widest uppercase">
                      PIXORA NFC CARD
                    </span>
                    <Zap size={16} className="text-amber-400 animate-pulse" />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/80 flex items-center justify-center text-amber-400">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">The Modern Bistro</h4>
                      <p className="text-[10px] text-zinc-400 font-mono-accent">TABLE 08 • VIP NFC PASS</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono-accent">
                    <span>NTAG216 ENCRYPTED</span>
                    <span className="text-amber-400 font-semibold">TAP TO LAUNCH</span>
                  </div>
                </div>
              )}
            </div>

            {/* Smartphone Mockup with Radial Unfurl Menu Animation */}
            <div
              onClick={handleTapAction}
              data-cursor={isTapped ? 'Menu Active' : 'Tap Phone'}
              className={`w-full max-w-[340px] transition-all duration-500 cursor-pointer ${
                isTapped ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-95 scale-[0.98]'
              }`}
            >
              {/* Outer Phone Shell */}
              <div className="w-full bg-zinc-900 rounded-[28px] border-[3px] border-zinc-700 p-3 shadow-2xl relative overflow-hidden">
                
                {/* Dynamic Island / Speaker */}
                <div className="w-20 h-3.5 bg-black rounded-full mx-auto mb-2.5 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>

                {/* Inner Screen Interface */}
                <div className="relative w-full bg-zinc-950 rounded-[20px] p-3 border border-white/5 overflow-hidden min-h-[380px] flex flex-col justify-between">
                  
                  {isTapped ? (
                    /* Live Unfurled Menu UI */
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500 flex flex-col h-full justify-between">
                      {/* Venue Header */}
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                          <div>
                            <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
                              <span>Luminary Bistro</span>
                              <Sparkles size={12} className="text-amber-400" />
                            </h4>
                            <span className="text-[9px] text-amber-400 font-mono-accent">TABLE #08 • NFC CONNECTED</span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-0.5 rounded-full border border-white/5 text-[9px] text-zinc-300">
                            <ShoppingBag size={10} className="text-amber-400" />
                            <span>{totalItemCount} items</span>
                          </div>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1 pt-2 overflow-x-auto no-scrollbar">
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'starters', label: 'Starters' },
                            { id: 'mains', label: 'Mains' },
                            { id: 'drinks', label: 'Drinks' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                soundManager.playTapSound();
                                setActiveCategory(cat.id as any);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-colors ${
                                activeCategory === cat.id
                                  ? 'bg-amber-400 text-black'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Menu Items List */}
                      <div className="space-y-2 py-1 max-h-[220px] overflow-y-auto pr-1">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-zinc-900/90 border border-white/5 flex items-center justify-between hover:border-amber-400/40 transition-colors"
                          >
                            <div className="space-y-0.5 max-w-[190px]">
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-[11px] font-bold text-white truncate">{item.name}</h5>
                                <span className="px-1.5 py-0.2 rounded text-[7px] font-bold bg-amber-400/20 text-amber-300">
                                  {item.tag}
                                </span>
                              </div>
                              <p className="text-[8px] text-zinc-400 line-clamp-1">{item.desc}</p>
                              <span className="text-[10px] font-mono-accent font-extrabold text-amber-400">
                                ${item.price.toFixed(2)}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-1 shadow-sm shrink-0"
                            >
                              <span>+ Add</span>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Cart & Order Trigger */}
                      <div className="pt-2 border-t border-white/10">
                        {orderSent ? (
                          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-0.5 animate-in fade-in">
                            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-300">
                              <Check size={14} />
                              <span>Order Sent to Kitchen!</span>
                            </div>
                            <p className="text-[8px] text-emerald-400 font-mono-accent">Ticket #104 dispatched to kitchen display</p>
                          </div>
                        ) : totalItemCount > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendOrder();
                            }}
                            className="w-full py-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black flex items-center justify-between px-3 shadow-lg shadow-amber-500/20"
                          >
                            <span>Send Order (${cartTotal.toFixed(2)})</span>
                            <span className="text-[9px] bg-black text-amber-400 px-1.5 py-0.5 rounded-md font-mono-accent">
                              {totalItemCount} ITEMS
                            </span>
                          </button>
                        ) : (
                          <div className="text-center py-1 text-[9px] text-zinc-500 font-mono-accent">
                            Select delicious dishes above to place order
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Idle State: Waiting for Tap */
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-10">
                      <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 animate-pulse">
                        <Smartphone size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">Touch Phone to NFC Stand</h4>
                        <p className="text-[9px] text-zinc-400 max-w-[200px] mx-auto">
                          Tap the stand above or click button to simulate live customer menu unfurl
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[9px] font-mono-accent bg-zinc-900 text-amber-400 border border-white/10">
                        AWAITING NFC TRIGGER
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
