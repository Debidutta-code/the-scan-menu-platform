import React, { useState } from 'react';
import { QrCode, Scan, Check, Utensils, Coffee, Wine, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';
import { soundManager } from '../../utils/sound';

export const ScanRevealQr: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleTriggerScan = () => {
    soundManager.playTapSound();
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanned(true);
    }, 1800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Story & Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Scan size={14} className="animate-pulse" />
              <span>SIGNATURE UX • LASER SCAN REVEAL</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Branded QR Stands. <br />
              <span className="amber-text-gradient">Camera Scan in 0.38s.</span>
            </h2>

            <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
              When guests prefer using their standard camera app, our high-contrast vector QR codes resolve instantly. Watch the camera laser line sweep the tabletop stand and unfurl live categories with zero delay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              data-cursor="Scan QR"
              className="px-6 py-3.5 rounded-full text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all"
            >
              <Scan size={16} />
              <span>{isScanning ? 'Simulating Camera Sweep...' : 'Simulate Camera QR Scan'}</span>
            </button>

            {scanned && (
              <button
                onClick={() => setScanned(false)}
                className="px-4 py-3.5 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Reset Scan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Universal iOS &amp; Android Cameras</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Zero App Downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Dynamic Redirect Routing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
              <span>Table #08 Embedded Token</span>
            </div>
          </div>
        </div>

        {/* Right Column: Branded QR Stand & Sweeping Laser Line */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-[420px] bg-zinc-950/90 rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden amber-glow space-y-6">
            
            {/* Tabletop Stand Visual with Laser Scan */}
            <div className="relative w-full max-w-[280px] mx-auto bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl border-2 border-amber-400/50 p-5 shadow-2xl overflow-hidden flex flex-col items-center">
              
              {/* Stand Header */}
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className="text-[10px] font-mono-accent font-bold text-amber-400">TABLE #08</span>
                <span className="text-[9px] text-zinc-400 font-bold">PIXORA QR STAND</span>
              </div>

              {/* QR Pattern Canvas */}
              <div className="relative w-40 h-40 bg-white rounded-xl p-3 shadow-2xl flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-3 gap-2 border-2 border-black p-1.5">
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-3 h-3 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-3 h-3 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-amber-500 rounded-xs flex items-center justify-center"><QrCode size={18} className="text-black" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-black rounded-xs flex items-center justify-center"><div className="w-3 h-3 bg-white" /></div>
                  <div className="bg-black/20" />
                  <div className="bg-black" />
                </div>

                {/* Sweeping Laser Line */}
                {isScanning && (
                  <div className="absolute inset-x-0 h-1 bg-amber-400 shadow-[0_0_20px_#f59e0b] animate-scanline z-20" />
                )}
              </div>

              <span className="mt-3 text-[10px] font-mono-accent text-zinc-400">
                {isScanning ? 'Reading QR code matrix...' : 'Point phone camera at code'}
              </span>
            </div>

            {/* Unfurl Categories Preview */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono-accent">
                  Category Unfurl State
                </h4>
                {scanned ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                    <Check size={12} /> SCANNED IN 0.38s
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono-accent">AWAITING SCAN</span>
                )}
              </div>

              {[
                { title: 'Chef Special Starters', icon: Utensils, items: '8 items available', badge: 'Fresh' },
                { title: 'Artisan Espresso & Beverages', icon: Coffee, items: '14 items available', badge: 'Popular' },
                { title: 'Craft Cocktails & Wine Cellar', icon: Wine, items: '22 items available', badge: 'Aged' },
              ].map((cat, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all duration-500 flex items-center justify-between ${
                    scanned
                      ? 'bg-zinc-900 border-amber-400/50 translate-x-0 opacity-100'
                      : 'bg-zinc-950/60 border-white/5 translate-x-2 opacity-40'
                  }`}
                  style={{ transitionDelay: `${idx * 120}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                      <cat.icon size={16} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">{cat.title}</h5>
                      <p className="text-[10px] text-zinc-400">{cat.items}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-400/20 text-amber-300">
                    {cat.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
