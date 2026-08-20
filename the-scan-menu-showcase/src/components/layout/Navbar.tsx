import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, Smartphone, QrCode, Sparkles } from 'lucide-react';
import { Magnetic } from '../ui/Magnetic';
import { SoundToggle } from '../ui/SoundToggle';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Interactive Demo', path: '/demo', isSpecial: true },
    { name: 'NFC Tap', path: '/products/nfc' },
    { name: 'QR Menu', path: '/products/qr' },
    { name: 'Features', path: '/features' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Industries', path: '/industries' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-4">
      <nav className="max-w-7xl mx-auto glass-chrome rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Sparkles size={18} className="fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm md:text-base tracking-tight text-white group-hover:text-amber-300 transition-colors">
              The Scan Menu
            </span>
            <span className="text-[10px] text-zinc-400 font-mono-accent tracking-wider">
              BY PIXORA STUDIOS
            </span>
          </div>
        </Link>

        {/* Navigation Desktop Links */}
        <div className="hidden lg:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-full border border-white/10 backdrop-blur-md shadow-inner">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                isActive(link.path)
                  ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30 shadow-sm'
                  : link.isSpecial
                  ? 'text-amber-400 font-semibold hover:bg-amber-400/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.isSpecial && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              <span>{link.name}</span>
            </Link>
          ))}
        </div>

        {/* Right Action Tools */}
        <div className="hidden md:flex items-center gap-3">
          <SoundToggle />

          <Magnetic>
            <a
              href="https://thescanmenu.com"
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="Live App"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/25 transition-all"
            >
              <span>Platform Portal</span>
              <ArrowUpRight size={14} />
            </a>
          </Magnetic>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-zinc-300 hover:text-white"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 max-w-7xl mx-auto glass-chrome rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-zinc-300 hover:bg-zinc-800/80'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <SoundToggle />
            <a
              href="https://thescanmenu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-amber-400 text-black"
            >
              <span>Go to Platform Portal</span>
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
