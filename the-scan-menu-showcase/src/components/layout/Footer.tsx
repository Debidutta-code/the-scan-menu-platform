import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUpRight, ShieldCheck, Zap, Heart, QrCode, Smartphone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#08080a] border-t border-white/10 pt-16 pb-12 px-4 md:px-8 text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Column 1: Brand Info & GEO Summary */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-black font-extrabold">
              <Sparkles size={16} />
            </div>
            <span className="font-extrabold text-base text-white tracking-tight">The Scan Menu</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The Scan Menu by Pixora Studios is a contactless digital restaurant menu platform combining laser-engraved NFC tabletop hardware and dynamic QR codes with 0.38-second edge web software for modern dining rooms.
          </p>
          <div className="text-xs text-zinc-500 font-mono-accent">
            A CREATION BY <span className="text-white font-semibold">PIXORA STUDIOS</span>
          </div>
        </div>

        {/* Column 2: Products & Hardware */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono-accent uppercase tracking-wider text-amber-400 font-semibold">
            Product &amp; Hardware
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/demo" className="text-amber-400 font-bold hover:text-amber-300 transition-colors flex items-center gap-1">
                <span>✨ Interactive Live Sandbox</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">LIVE</span>
              </Link>
            </li>
            <li>
              <Link to="/products/nfc" className="hover:text-white transition-colors">
                Instant NFC Tap Menus (NTAG216)
              </Link>
            </li>
            <li>
              <Link to="/products/qr" className="hover:text-white transition-colors">
                Branded QR Tabletop Stands
              </Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-white transition-colors">
                0.38s Edge Speed &amp; 86ing Sync
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-white transition-colors">
                8-Beat Contactless Customer Journey
              </Link>
            </li>
            <li>
              <Link to="/industries" className="hover:text-white transition-colors">
                Hotel, Bar &amp; Fine Dining Verticals
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Platform & Portal */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono-accent uppercase tracking-wider text-amber-400 font-semibold">
            Platform &amp; Pricing
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="https://app.thescanmenu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <span>App Portal</span>
                <ArrowUpRight size={12} />
              </a>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-white transition-colors">
                Transparent Plans &amp; ROI Calculator
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white transition-colors">
                Request Hardware Sample Kit (48hr)
              </Link>
            </li>
            <li>
              <Link to="/docs" className="text-zinc-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-mono text-[11px]">
                <span>API Reference &amp; Docs</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-zinc-300">/docs</span>
              </Link>
            </li>
            <li>
              <span className="text-zinc-500">Zero App Installation Required</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Contrast Statement & Positioning */}
        <div className="space-y-3 p-4 rounded-2xl glass-card border border-white/5 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>Engineered for Guest Delight</span>
            </h4>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Where legacy restaurant tools feel like complex spreadsheets, The Scan Menu provides fluid 60fps mobile web ordering that elevates your dining atmosphere.
            </p>
          </div>
          <div className="text-[10px] font-mono-accent text-amber-400/80 pt-2 border-t border-white/5">
            0.38s Edge CDN • Real-Time Kitchen Dispatch
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
        <div>
          &copy; {new Date().getFullYear()} Pixora Studios. All rights reserved. The Scan Menu &amp; TheScanMenu.
        </div>
        <div className="flex items-center gap-6">
          <Link to="/pricing" className="hover:text-zinc-300">
            Pricing
          </Link>
          <Link to="/contact" className="hover:text-zinc-300">
            Contact Demo
          </Link>
          <span className="flex items-center gap-1">
            Crafted with <Heart size={12} className="text-amber-400 fill-current" /> by Pixora Studios
          </span>
        </div>
      </div>
    </footer>
  );
};
