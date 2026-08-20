import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  ChefHat, 
  SlidersHorizontal, 
  LayoutGrid, 
  Calculator, 
  Printer, 
  Sparkles, 
  Check, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Building
} from 'lucide-react';
import { InteractiveLiveTable } from '../components/interactive/InteractiveLiveTable';
import { InteractiveKds } from '../components/interactive/InteractiveKds';
import { Interactive86Engine } from '../components/interactive/Interactive86Engine';
import { InteractiveFloorPlan } from '../components/interactive/InteractiveFloorPlan';
import { InteractiveRoiCalculator } from '../components/interactive/InteractiveRoiCalculator';
import { SEO } from '../components/common/SEO';
import { soundManager } from '../utils/sound';

export const InteractiveDemoPage: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'table' | 'kds' | 'availability' | 'floorplan' | 'roi'>('table');
  const [syncedOrder, setSyncedOrder] = useState<any>(null);
  const [soldOutDishes, setSoldOutDishes] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const demoSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': 'https://thescanmenu.com/demo#app',
        'name': 'The Scan Menu Interactive Product Sandbox',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web Browser (Safari, Chrome)',
        'description': 'Experience the live diner mobile table ordering, Kitchen Display System (KDS), 1-click instant 86 sold-out sync, and dynamic QR table generator in real time.',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/demo#breadcrumbs',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://thescanmenu.com/',
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Live Interactive Demo',
            'item': 'https://thescanmenu.com/demo',
          },
        ],
      },
    ],
  };

  const screens = [
    { id: 'table', label: '📱 Diner Table Phone', desc: 'Browse dishes, customize modifiers, split bill & place order' },
    { id: 'kds', label: '🍳 Kitchen Display (KDS)', desc: 'Live ticket stream with timers, station filtering & ticket bumping' },
    { id: 'availability', label: '⚡ 1-Click 86ing Hub', desc: 'Manager sold-out toggle broadcasting to tables in <1 second' },
    { id: 'floorplan', label: '🗺️ Floor Plan & QR', desc: 'Table occupancy map with dynamic vector QR code customizer' },
    { id: 'roi', label: '💰 Revenue & ROI', desc: 'Interactive revenue turnover and staff trip savings calculator' },
  ];

  const handleOrderDispatched = (order: any) => {
    setSyncedOrder(order);
  };

  const handleToggleSoldOut = (dishId: string) => {
    setSoldOutDishes((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
      <SEO
        title="Interactive Live Sandbox — The Scan Menu Product Suite"
        description="Test live diner table ordering, real-time Kitchen Display System (KDS), instant 1-second 86ing, and dynamic QR generation in an interactive live demo."
        keywords="The Scan Menu demo, interactive restaurant QR demo, KDS live simulator, contactless ordering sandbox, Pixora Studios"
        canonicalPath="/demo"
        schema={demoSchema}
      />

      {/* Header */}
      <section className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono-accent bg-zinc-900 text-amber-400 border border-white/10 shadow-xl">
          <Sparkles size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
          <span>FULL PRODUCTION SUITE • LIVE INTERACTIVE SANDBOX</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Test The Scan Menu <br />
          <span className="amber-text-gradient">In Full Real-Time Operation.</span>
        </h1>

        <p className="text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Switch between the Diner's Smartphone, the Kitchen's KDS Screen, the Manager's 86 Hub, and the Floor Plan to experience how our contactless architecture runs your restaurant.
        </p>
      </section>

      {/* Synchronized Screen Switcher Tabs */}
      <section className="flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto">
        {screens.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              soundManager.playTapSound();
              setActiveScreen(s.id as any);
            }}
            className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-start gap-0.5 border text-left ${
              activeScreen === s.id
                ? 'bg-amber-400 text-black border-amber-400 shadow-xl shadow-amber-500/20 scale-105'
                : 'bg-zinc-950/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <span className="font-extrabold text-sm">{s.label}</span>
            <span className={`text-[10px] font-normal line-clamp-1 ${activeScreen === s.id ? 'text-black/80' : 'text-zinc-500'}`}>
              {s.desc}
            </span>
          </button>
        ))}
      </section>

      {/* Screen Canvas Display */}
      <section className="max-w-6xl mx-auto">
        {activeScreen === 'table' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider block">
                  EXPERIENCE 01 • GUEST TABLE ORDERING
                </span>
                <h2 className="text-3xl font-extrabold text-white">
                  Diner Mobile Table Session
                </h2>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Test the exact guest experience: browse categories, filter allergens, customize dish variants & add-ons, test the dynamic split bill calculator, and call waitstaff with 1 tap.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Check size={14} className="text-amber-400" />
                  <span>0.38s instant edge load without app download</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Check size={14} className="text-amber-400" />
                  <span>Dish customizer with variants & allergen notes</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Check size={14} className="text-amber-400" />
                  <span>Interactive Split Bill & Tip Presets (5%, 10%, 15%, 20%)</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Check size={14} className="text-amber-400" />
                  <span>1-Tap Staff Paging with live countdown response</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    soundManager.playTapSound();
                    setActiveScreen('kds');
                  }}
                  className="px-5 py-3 rounded-full text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 flex items-center gap-2"
                >
                  <span>See Incoming KDS Kitchen View</span>
                  <ArrowRight size={14} className="text-amber-400" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <InteractiveLiveTable
                onOrderDispatched={handleOrderDispatched}
                soldOutDishIds={soldOutDishes}
                onToggleSoldOut={handleToggleSoldOut}
              />
            </div>
          </div>
        )}

        {activeScreen === 'kds' && (
          <div className="space-y-6">
            <InteractiveKds incomingOrder={syncedOrder} />
          </div>
        )}

        {activeScreen === 'availability' && (
          <div className="space-y-6">
            <Interactive86Engine />
          </div>
        )}

        {activeScreen === 'floorplan' && (
          <div className="space-y-6">
            <InteractiveFloorPlan />
          </div>
        )}

        {activeScreen === 'roi' && (
          <div className="space-y-6">
            <InteractiveRoiCalculator />
          </div>
        )}
      </section>

      {/* POS Integrations Bottom Bar */}
      <section className="p-8 rounded-3xl bg-zinc-950/80 border border-white/10 max-w-5xl mx-auto text-center space-y-4">
        <span className="text-xs font-mono-accent text-zinc-500 uppercase tracking-widest">
          ENTERPRISE COMPATIBILITY
        </span>
        <h3 className="text-xl font-bold text-white">
          Seamlessly Bridges Into Your Existing Restaurant Stack
        </h3>
        <p className="text-xs text-zinc-400 max-w-xl mx-auto">
          Works standalone or syncs bi-directionally with Toast, Square, Clover, Petpooja, Lightspeed, Micros, ESC/POS thermal printers, Stripe, and Apple Pay.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-mono text-zinc-400">
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">🍞 Toast POS</span>
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">⬛ Square POS</span>
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">🍀 Clover POS</span>
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">🍲 Petpooja</span>
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">🖨️ ESC/POS Thermal</span>
          <span className="px-3 py-1 bg-zinc-900 rounded-lg border border-white/5">💳 Apple Pay & Stripe</span>
        </div>
      </section>
    </div>
  );
};
