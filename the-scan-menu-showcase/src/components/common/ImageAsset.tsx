import React from 'react';

interface ImageAssetProps {
  name: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ImageAsset: React.FC<ImageAssetProps> = ({ name, alt, className = '', style }) => {
  // Bespoke organic vector illustrations with soft irregular contours & zero hard geometric crops
  const renderBespokeGraphic = (assetName: string) => {
    switch (assetName) {
      case 'hero-table-scene':
        return (
          <svg viewBox="0 0 900 620" className="w-full h-full drop-shadow-2xl" role="img" aria-label={alt}>
            <defs>
              <linearGradient id="tableGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#18181f" />
                <stop offset="50%" stopColor="#101014" />
                <stop offset="100%" stopColor="#08080a" />
              </linearGradient>
              <radialGradient id="amberAura" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.4)" />
                <stop offset="60%" stopColor="rgba(245, 158, 11, 0.08)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
              <linearGradient id="metalStand" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="30%" stopColor="#fef3c7" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <clipPath id="organicMaskHero">
                <path d="M 60,80 C 140,20 320,10 460,40 C 620,10 780,50 840,140 C 890,240 880,420 810,510 C 730,590 580,610 440,590 C 280,610 130,580 70,490 C 10,400 10,210 60,80 Z" />
              </clipPath>
            </defs>

            {/* Organic Ambient Glow */}
            <path d="M 80,100 C 180,30 400,20 540,50 C 720,20 820,80 860,200 C 900,340 850,480 760,550 C 640,620 450,600 300,580 C 160,560 60,460 40,320 C 20,180 40,120 80,100 Z" fill="url(#amberAura)" opacity="0.8" />

            {/* Table Surface with Organic Freeform Curvature */}
            <path d="M 100,280 C 240,220 660,220 800,280 C 870,330 870,470 780,530 C 640,580 260,580 120,530 C 30,470 30,330 100,280 Z" fill="url(#tableGrad)" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="2" />

            {/* Candlelight Accent */}
            <g transform="translate(180, 260)">
              <ellipse cx="20" cy="80" rx="16" ry="6" fill="#000" opacity="0.6" />
              <path d="M 8,80 L 12,45 C 12,40 28,40 28,45 L 32,80 Z" fill="#27272a" stroke="rgba(255,255,255,0.1)" />
              <path d="M 19,45 L 21,38" stroke="#a1a1aa" strokeWidth="2" />
              <ellipse cx="20" cy="30" rx="7" ry="12" fill="#fbbf24" opacity="0.9" className="animate-pulse" />
              <ellipse cx="20" cy="32" rx="3" ry="6" fill="#fff" />
            </g>

            {/* Left: Dual NFC + QR Acrylic Stand */}
            <g transform="translate(260, 210)">
              {/* Stand Shadow */}
              <ellipse cx="60" cy="200" rx="55" ry="16" fill="#000" opacity="0.7" />
              {/* Base */}
              <path d="M 20,190 C 20,175 100,175 100,190 L 95,200 C 95,210 25,210 25,200 Z" fill="#18181b" stroke="url(#metalStand)" strokeWidth="1.5" />
              {/* Upright Acrylic Panel */}
              <path d="M 30,60 L 90,60 L 85,185 L 35,185 Z" fill="#09090b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              {/* Gold Metal NFC Disc Centerpiece */}
              <circle cx="60" cy="105" r="24" fill="#18181b" stroke="url(#metalStand)" strokeWidth="2.5" />
              <path d="M 52,100 C 55,95 65,95 68,100 M 48,105 C 53,98 67,98 72,105 M 44,110 C 51,101 69,101 76,110" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <text x="60" y="142" textAnchor="middle" fill="#f59e0b" fontSize="8" fontFamily="monospace" fontWeight="bold">NFC TAP DISC</text>
              <text x="60" y="154" textAnchor="middle" fill="#71717a" fontSize="7" fontFamily="sans-serif">TABLE 08</text>
              {/* Mini QR at Base */}
              <rect x="48" y="160" width="24" height="20" rx="3" fill="#fff" />
              <rect x="52" y="163" width="6" height="6" fill="#000" />
              <rect x="62" y="163" width="6" height="6" fill="#000" />
              <rect x="52" y="171" width="6" height="6" fill="#000" />
            </g>

            {/* Right: Guest Smartphone Unfurling Interactive Web Menu */}
            <g transform="translate(480, 100)">
              {/* Phone Floating Shadow */}
              <ellipse cx="140" cy="460" rx="110" ry="24" fill="#000" opacity="0.8" />
              
              {/* Phone Body with Apple-grade curvature */}
              <rect x="20" y="20" width="240" height="420" rx="42" fill="#09090b" stroke="#3f3f46" strokeWidth="5" />
              <rect x="28" y="28" width="224" height="404" rx="36" fill="#0f0f13" />

              {/* Dynamic Island */}
              <rect x="95" y="38" width="90" height="20" rx="10" fill="#000000" />
              <circle cx="165" cy="48" r="4" fill="#18181b" />

              {/* Instant Browser Banner */}
              <g transform="translate(40, 72)">
                <rect x="0" y="0" width="200" height="28" rx="8" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1" />
                <circle cx="14" cy="14" r="5" fill="#10b981" />
                <text x="26" y="18" fill="#ffffff" fontSize="10" fontWeight="bold">thescanmenu.com/table/8</text>
                <text x="165" y="18" fill="#fbbf24" fontSize="9" fontWeight="bold">0.38s</text>
              </g>

              {/* Restaurant Header */}
              <g transform="translate(40, 110)">
                <text x="0" y="14" fill="#ffffff" fontSize="14" fontWeight="800">Luminary Bistro &amp; Bar</text>
                <text x="0" y="26" fill="#a1a1aa" fontSize="9" fontFamily="monospace">TABLE #08 • CONTACTLESS MENU</text>
              </g>

              {/* Category Pills */}
              <g transform="translate(40, 146)">
                <rect x="0" y="0" width="46" height="18" rx="9" fill="#f59e0b" />
                <text x="23" y="12" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">Starters</text>
                <rect x="52" y="0" width="42" height="18" rx="9" fill="#1f1f26" />
                <text x="73" y="12" textAnchor="middle" fill="#a1a1aa" fontSize="9">Mains</text>
                <rect x="100" y="0" width="46" height="18" rx="9" fill="#1f1f26" />
                <text x="123" y="12" textAnchor="middle" fill="#a1a1aa" fontSize="9">Drinks</text>
              </g>

              {/* Menu Item Cards */}
              {[
                { name: 'Truffle Mushroom Bruschetta', price: '$16.50', tag: 'Chef Choice', y: 174, color: '#f59e0b' },
                { name: 'A5 Wagyu Steak & Frites', price: '$42.00', tag: 'Top Rated', y: 246, color: '#10b981' },
                { name: 'Smoked Amber Old Fashioned', price: '$18.00', tag: 'Signature', y: 318, color: '#ec4899' },
              ].map((item, idx) => (
                <g key={idx} transform={`translate(40, ${item.y})`}>
                  <rect x="0" y="0" width="200" height="64" rx="14" fill="#17171d" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <rect x="8" y="8" width="48" height="48" rx="10" fill="#24242e" />
                  <circle cx="32" cy="32" r="14" fill={item.color} opacity="0.3" />
                  <text x="64" y="24" fill="#ffffff" fontSize="10" fontWeight="bold">{item.name}</text>
                  <text x="64" y="38" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="monospace">{item.price}</text>
                  <rect x="156" y="24" width="34" height="22" rx="7" fill="#f59e0b" />
                  <text x="173" y="38" textAnchor="middle" fill="#000" fontSize="11" fontWeight="bold">+</text>
                </g>
              ))}

              {/* Instant Tap Indicator Ring */}
              <circle cx="140" cy="20" r="18" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" className="animate-spin" style={{ transformOrigin: '140px 20px', animationDuration: '10s' }} />
            </g>
          </svg>
        );

      case 'hero-phone-mockup':
        return (
          <svg viewBox="0 0 340 640" className="w-full h-full drop-shadow-2xl" role="img" aria-label={alt}>
            <defs>
              <linearGradient id="phoneGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="320" height="620" rx="46" fill="#09090b" stroke="#27272a" strokeWidth="6" />
            <rect x="20" y="20" width="300" height="600" rx="38" fill="#0e0e12" />
            <rect x="115" y="30" width="110" height="22" rx="11" fill="#000000" />
            
            {/* Screen Mock UI */}
            <rect x="36" y="70" width="268" height="42" rx="14" fill="rgba(245, 158, 11, 0.15)" stroke="rgba(245, 158, 11, 0.3)" />
            <text x="52" y="96" fill="#ffffff" fontSize="15" fontWeight="bold">The Modern Bistro</text>
            <circle cx="275" cy="91" r="10" fill="#f59e0b" />

            {/* Menu Items */}
            {[
              { name: 'Truffle Artisan Pasta', desc: 'Handcrafted fettuccine, parmesan', price: '$24.00' },
              { name: 'Prime Ribeye Steak', desc: 'Herb butter, charred asparagus', price: '$38.00' },
              { name: 'Burrata Peach Salad', desc: 'Aged balsamic, toasted pistachios', price: '$18.00' },
              { name: 'Velvet Chocolate Dome', desc: 'Warm ganache, hazelnut crunch', price: '$14.00' },
            ].map((dish, idx) => (
              <g key={idx} transform={`translate(36, ${130 + idx * 105})`}>
                <rect x="0" y="0" width="268" height="92" rx="18" fill="#18181e" stroke="rgba(255,255,255,0.07)" />
                <rect x="12" y="14" width="64" height="64" rx="14" fill="#272730" />
                <circle cx="44" cy="46" r="20" fill="#f59e0b" opacity="0.3" />
                <text x="88" y="34" fill="#ffffff" fontSize="13" fontWeight="bold">{dish.name}</text>
                <text x="88" y="52" fill="#828290" fontSize="10">{dish.desc}</text>
                <text x="88" y="74" fill="#fbbf24" fontSize="13" fontWeight="bold" fontFamily="monospace">{dish.price}</text>
                <rect x="210" y="52" width="44" height="28" rx="10" fill="#f59e0b" />
                <text x="232" y="70" fill="#000" fontSize="13" fontWeight="bold" textAnchor="middle">+</text>
              </g>
            ))}
          </svg>
        );

      case 'nfc-glow-chip':
        return (
          <svg viewBox="0 0 400 360" className="w-full h-full drop-shadow-xl" role="img" aria-label={alt}>
            <defs>
              <linearGradient id="copperCoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
              <radialGradient id="chipGlowAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.4)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Organic Background Aura */}
            <circle cx="200" cy="180" r="160" fill="url(#chipGlowAura)" />

            {/* Acrylic Disc Outer Boundary */}
            <circle cx="200" cy="180" r="130" fill="#09090b" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="200" cy="180" r="110" fill="#121217" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

            {/* Concentric NFC Antenna Coils */}
            <circle cx="200" cy="180" r="95" fill="none" stroke="url(#copperCoil)" strokeWidth="3.5" />
            <circle cx="200" cy="180" r="82" fill="none" stroke="url(#copperCoil)" strokeWidth="2.5" />
            <circle cx="200" cy="180" r="70" fill="none" stroke="url(#copperCoil)" strokeWidth="2" />

            {/* Ferrite Anti-Metal Shielding Layer */}
            <rect x="155" y="145" width="90" height="70" rx="14" fill="#1e1e24" stroke="rgba(245,158,11,0.5)" strokeWidth="2" />

            {/* Silicon IC Core */}
            <rect x="175" y="160" width="50" height="40" rx="8" fill="#000000" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="200" y="184" textAnchor="middle" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold">NTAG216</text>

            {/* Radio Frequency Waves */}
            <path d="M 185,115 C 195,108 205,108 215,115 M 175,100 C 190,88 210,88 225,100 M 165,85 C 185,70 215,70 235,85" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" fill="none" />

            {/* Tech Badges */}
            <text x="200" y="270" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold" letterSpacing="1">13.56 MHz HIGH-FREQUENCY</text>
            <text x="200" y="288" textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="monospace">FERRITE ANTI-METAL SHIELDED</text>
          </svg>
        );

      case 'feature-lightning':
        return (
          <svg viewBox="0 0 400 280" className="w-full h-full" role="img" aria-label={alt}>
            <defs>
              <linearGradient id="fastBolt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Speed Comparison Card */}
            <g transform="translate(30, 30)">
              {/* The Scan Menu Edge Card */}
              <rect x="0" y="0" width="340" height="90" rx="20" fill="#141419" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="45" cy="45" r="22" fill="rgba(245,158,11,0.2)" />
              <path d="M 48,32 L 38,46 L 46,46 L 42,58 L 54,44 L 46,44 Z" fill="url(#fastBolt)" />
              <text x="80" y="38" fill="#ffffff" fontSize="14" fontWeight="bold">The Scan Menu (Edge CDN)</text>
              <text x="80" y="56" fill="#a1a1aa" fontSize="11">Pre-cached, zero app install, static HTML5 unfurl</text>
              <text x="80" y="74" fill="#10b981" fontSize="13" fontWeight="bold" fontFamily="monospace">0.38 Seconds Average Load</text>

              {/* Legacy PDF Download Card */}
              <rect x="0" y="110" width="340" height="90" rx="20" fill="#0d0d10" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" />
              <circle cx="45" cy="155" r="22" fill="rgba(239,68,68,0.15)" />
              <text x="45" y="160" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">PDF</text>
              <text x="80" y="148" fill="#a1a1aa" fontSize="14" fontWeight="bold">Legacy PDF QR Menus</text>
              <text x="80" y="166" fill="#71717a" fontSize="11">Heavy 15MB file, pinching/zooming, no mobile reflow</text>
              <text x="80" y="184" fill="#ef4444" fontSize="13" fontWeight="bold" fontFamily="monospace">8.5 - 14.0 Seconds Wait Time</text>
            </g>
          </svg>
        );

      case 'feature-analytics':
        return (
          <svg viewBox="0 0 400 280" className="w-full h-full" role="img" aria-label={alt}>
            <defs>
              <linearGradient id="barGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="rgba(245,158,11,0.1)" />
              </linearGradient>
            </defs>
            <rect x="20" y="20" width="360" height="240" rx="24" fill="#101015" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            
            {/* Header */}
            <text x="44" y="54" fill="#ffffff" fontSize="14" fontWeight="bold">Live Venue Analytics &amp; Revenue</text>
            <text x="44" y="70" fill="#a1a1aa" fontSize="10">Real-time table turnover and dish velocity</text>
            <text x="320" y="58" textAnchor="end" fill="#10b981" fontSize="14" fontWeight="bold" fontFamily="monospace">+21.4% TICKET AVG</text>

            {/* Graph Bars */}
            {[
              { label: '12 PM', h: 60, x: 50 },
              { label: '2 PM', h: 110, x: 105 },
              { label: '5 PM', h: 75, x: 160 },
              { label: '7 PM', h: 150, x: 215 },
              { label: '9 PM', h: 130, x: 270 },
              { label: '11 PM', h: 80, x: 325 },
            ].map((bar, i) => (
              <g key={i}>
                <rect x={bar.x} y={200 - bar.h} width="28" height={bar.h} rx="6" fill={bar.h > 120 ? 'url(#barGlow)' : '#1e1e26'} stroke={bar.h > 120 ? '#f59e0b' : 'none'} />
                <text x={bar.x + 14} y="222" textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="monospace">{bar.label}</text>
              </g>
            ))}
            <line x1="40" y1="200" x2="360" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>
        );

      case 'feature-categories':
        return (
          <svg viewBox="0 0 400 280" className="w-full h-full" role="img" aria-label={alt}>
            <rect x="20" y="20" width="360" height="240" rx="24" fill="#101015" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            <text x="44" y="54" fill="#ffffff" fontSize="14" fontWeight="bold">Instant 86 &amp; Allergen Filtering</text>
            <text x="44" y="70" fill="#a1a1aa" fontSize="10">Multi-lingual auto translation &amp; dietary badges</text>

            {/* Badges Grid */}
            {[
              { text: 'Gluten-Free', tag: 'Safe', color: '#10b981', x: 44, y: 90 },
              { text: 'Vegan / Plant', tag: 'Popular', color: '#10b981', x: 155, y: 90 },
              { text: 'Nut Allergy', tag: 'Flagged', color: '#ef4444', x: 270, y: 90 },
              { text: 'English (US)', tag: 'Native', color: '#f59e0b', x: 44, y: 140 },
              { text: 'Español (ES)', tag: 'Auto', color: '#f59e0b', x: 155, y: 140 },
              { text: 'Français (FR)', tag: 'Auto', color: '#f59e0b', x: 270, y: 140 },
              { text: 'Item 86 Status', tag: 'Sold Out Sync <1s', color: '#ec4899', x: 44, y: 190, full: true },
            ].map((badge, idx) => (
              <g key={idx} transform={`translate(${badge.x}, ${badge.y})`}>
                <rect x="0" y="0" width={badge.full ? 312 : 98} height="36" rx="10" fill="#181820" stroke="rgba(255,255,255,0.07)" />
                <circle cx="12" cy="18" r="4" fill={badge.color} />
                <text x="22" y="22" fill="#ffffff" fontSize="10" fontWeight="bold">{badge.text}</text>
                {badge.full && (
                  <text x="300" y="22" textAnchor="end" fill="#f59e0b" fontSize="10" fontFamily="monospace">{badge.tag}</text>
                )}
              </g>
            ))}
          </svg>
        );

      default:
        // Organic Fallback Visual
        return (
          <svg viewBox="0 0 300 200" className="w-full h-full" role="img" aria-label={alt}>
            <path d="M 30,50 C 90,10 210,20 270,60 C 300,120 260,180 200,190 C 100,200 20,160 10,110 C 0,70 10,60 30,50 Z" fill="#131318" stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
            <circle cx="150" cy="100" r="35" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2" />
            <text x="150" y="105" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="600">{alt || name}</text>
          </svg>
        );
    }
  };

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={style}>
      {renderBespokeGraphic(name)}
    </div>
  );
};
