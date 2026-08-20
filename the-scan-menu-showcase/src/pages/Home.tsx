import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, QrCode, Zap, Shield, Sparkles, CheckCircle2, Star, Clock, Layers, HelpCircle, FileText, Check, X, ShieldAlert } from 'lucide-react';
import { Magnetic } from '../components/ui/Magnetic';
import { Card3D } from '../components/ui/Card3D';
import { ImageAsset } from '../components/common/ImageAsset';
import { TapRevealNfc } from '../components/interactive/TapRevealNfc';
import { HorizontalStoryStrip } from '../components/interactive/HorizontalStoryStrip';
import { VenueSwitcher } from '../components/interactive/VenueSwitcher';
import { InteractiveLiveTable } from '../components/interactive/InteractiveLiveTable';
import { InteractiveKds } from '../components/interactive/InteractiveKds';
import { Interactive86Engine } from '../components/interactive/Interactive86Engine';
import { InteractiveFloorPlan } from '../components/interactive/InteractiveFloorPlan';
import { InteractiveRoiCalculator } from '../components/interactive/InteractiveRoiCalculator';
import { HeroProductShowcase } from '../components/interactive/HeroProductShowcase';
import { SEO } from '../components/common/SEO';

export const Home: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const homeSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://thescanmenu.com/#organization',
        'name': 'The Scan Menu by Pixora Studios',
        'url': 'https://thescanmenu.com',
        'logo': 'https://thescanmenu.com/logo.png',
        'description': 'Contactless digital restaurant menu platform combining physical NFC tabletop hardware and high-speed dynamic QR codes with edge-cached mobile web ordering.',
        'founder': 'Pixora Studios',
        'sameAs': ['https://twitter.com/pixorastudios'],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://thescanmenu.com/#software',
        'name': 'The Scan Menu',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web Browser (iOS Safari, Android Chrome)',
        'offers': {
          '@type': 'Offer',
          'price': '29.00',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.9',
          'reviewCount': '128',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Do restaurant guests need to download an application to order?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'No. The Scan Menu runs entirely inside standard mobile browsers like Safari and Chrome. When a guest taps the NFC disc or scans the QR code, the interactive menu loads in approximately 0.38 seconds with zero app installation, account creation, or password requirements.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How does an NFC restaurant menu work?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'An NFC menu uses an embedded NTAG216 high-frequency microchip located inside a tabletop stand or disc. When a smartphone is held near the stand, the phone detects the radio-frequency signal and automatically opens the digital menu web page with the exact table number pre-assigned.',
            },
          },
          {
            '@type': 'Question',
            'name': 'What happens if a guest phone does not support NFC?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Every The Scan Menu tabletop piece features dual hardware: an instant NFC tap sensor and a high-contrast vector QR code. If a phone lacks NFC or has it turned off, the guest simply opens their camera app and scans the QR code to open the identical instant web menu.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Can restaurant managers update prices and sold-out items in real time?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. When an item runs out during service, managers can mark it sold out (86 it) in the portal, and the update propagates to all active customer menus in under 1 second without reprinting QR codes or replacing physical stands.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Does The Scan Menu work on slow restaurant Wi-Fi or cellular networks?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. The digital menu is engineered with lightweight edge CDN caching and compressed vector assets, allowing it to load in under 400 milliseconds even over congested 3G cellular connections or crowded restaurant Wi-Fi.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="space-y-24 pb-20 overflow-x-hidden">
      <SEO
        title="The Scan Menu — Contactless Digital QR & NFC Restaurant Menu"
        description="Transform restaurant dining with 0.38s instant NFC tap & QR scan menus. Zero app downloads, real-time item 86ing, and kitchen dispatch for modern venues."
        keywords="NFC menu, QR menu, digital restaurant menu, contactless ordering, restaurant tech, table ordering platform, Pixora Studios"
        canonicalPath="/"
        schema={homeSchema}
      />

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono-accent bg-zinc-900 border border-white/10 text-amber-400 mb-8 shadow-xl">
          <Sparkles size={14} className="animate-spin" style={{ animationDuration: '8s' }} />
          <span>INSTANT CONTACTLESS DINING • 0.38s EDGE LOAD</span>
        </div>

        {/* Semantic Single H1 */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-[1.1] mb-6">
          Your Restaurant Menu, <br className="hidden sm:block" />
          <span className="amber-text-gradient">Finally Modernized for Instant Ordering.</span>
        </h1>

        {/* Plain-Language Conceptual Lead */}
        <p className="text-lg md:text-xl text-zinc-300 max-w-3xl font-normal leading-relaxed mb-10">
          The Scan Menu is a contactless digital dining platform combining <strong className="text-white font-semibold">laser-engraved NFC tabletop hardware</strong> with <strong className="text-white font-semibold">0.38-second edge web menus</strong>. Guests tap with their phone or scan with their camera to browse dishes, filter allergens, and place orders directly to the kitchen with zero app downloads.
        </p>

        {/* Primary Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Magnetic strength={0.4}>
            <Link
              to="/demo"
              data-cursor="Live Demo"
              className="px-8 py-4 rounded-full text-sm font-extrabold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:scale-105 text-black shadow-xl shadow-amber-500/30 flex items-center gap-2 transition-all"
            >
              <Sparkles size={18} />
              <span>Test Live Interactive Demo</span>
              <ArrowRight size={18} />
            </Link>
          </Magnetic>

          <Magnetic strength={0.2}>
            <Link
              to="/products/nfc"
              data-cursor="Tap NFC"
              className="px-7 py-4 rounded-full text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 flex items-center gap-2 transition-all"
            >
              <Smartphone size={18} className="text-amber-400" />
              <span>NFC Hardware Stands</span>
            </Link>
          </Magnetic>

          <Magnetic strength={0.2}>
            <Link
              to="/products/qr"
              data-cursor="Scan QR"
              className="px-7 py-4 rounded-full text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 text-white border border-white/15 flex items-center gap-2 transition-all"
            >
              <QrCode size={18} className="text-amber-400" />
              <span>Dynamic QR Stands</span>
            </Link>
          </Magnetic>
        </div>

        {/* Hero Product 3D Table & Phone Scene */}
        <div className="w-full">
          <HeroProductShowcase />
        </div>
      </section>

      {/* Live Interactive Table & KDS Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold">
            LIVE OPERATIONAL PREVIEW
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Experience the Actual Diner &amp; Kitchen Flow
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Interact with the live table phone simulator on the left to customize dishes, split bills, and dispatch orders directly into the real-time Kitchen Display System (KDS) on the right.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex justify-center">
            <InteractiveLiveTable />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <InteractiveKds />
          </div>
        </div>
      </section>

      {/* GEO Third-Person Citable Summary Block */}
      <section className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="p-8 rounded-3xl bg-zinc-950 border border-amber-400/30 space-y-3 glass-card">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider block">
            ABOUT THE SCAN MENU • PRODUCT DEFINITION
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            What is The Scan Menu?
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            The Scan Menu by Pixora Studios is a contactless digital restaurant menu platform that combines physical NFC tabletop hardware and dynamic QR codes with edge-cached web software, allowing diners to tap or scan to view menus and place orders in under 0.4 seconds without downloading an app. Designed for cafes, cloud kitchens, fine dining, bars, food courts, and multi-property hotels, the platform eliminates paper menu printing costs, syncs sold-out items live to the kitchen in under 1 second, and increases table ticket averages by 18% to 22%.
          </p>
        </div>
      </section>

      {/* Problem Section: Paper vs PDF vs The Scan Menu */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-mono-accent text-zinc-500 uppercase tracking-widest">
            THE REALITY OF RESTAURANT OPERATIONS
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Why Traditional Menus Hurt Table Revenue
          </h2>
          <p className="text-sm text-zinc-400">
            Paper menus get damaged, slow PDF downloads frustrate diners, and waitstaff lose 40+ trips per shift just handing out booklets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 hover:border-red-500/30 transition-colors flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center font-mono-accent font-bold">
                01
              </div>
              <h3 className="text-xl font-bold text-white">Stained Paper Menus</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reprinting menus every time a price changes costs $1,200–$3,500 annually. Worn laminates and sticky surfaces degrade dining ambiance, while sold-out items lead to awkward apologies at the table.
              </p>
            </div>
            <div className="text-[11px] font-mono-accent text-red-400 pt-2 border-t border-white/5">
              High reprint cost • Zero real-time updates
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 hover:border-red-500/30 transition-colors flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center font-mono-accent font-bold">
                02
              </div>
              <h3 className="text-xl font-bold text-white">Heavy 15MB PDF QR Codes</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generic QR codes redirect guests to heavy downloadable PDF files that take 8–14 seconds to download. Diners must pinch, zoom, and scroll horizontally just to read tiny text on their smartphones.
              </p>
            </div>
            <div className="text-[11px] font-mono-accent text-red-400 pt-2 border-t border-white/5">
              Slow download times • Clunky mobile UX
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900 border-2 border-amber-400/50 space-y-4 amber-glow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-mono-accent font-bold">
                03
              </div>
              <h3 className="text-xl font-bold text-white">The Scan Menu Advantage</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Pre-cached static HTML5 opens in 0.38 seconds on mobile Safari and Chrome. Diners view high-res food photography, filter dietary allergens, and order drinks with a single tap.
              </p>
            </div>
            <div className="text-[11px] font-mono-accent text-amber-400 pt-2 border-t border-amber-400/20 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>0.38s Edge Load • 18–22% Ticket Growth</span>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Interactive NFC Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8">
        <TapRevealNfc />
      </section>

      {/* Horizontal Story Strip Section */}
      <HorizontalStoryStrip />

      {/* Industries Preview */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            VERSATILE HOSPITALITY SUITE
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Engineered for Every Hospitality Space
          </h2>
          <p className="text-sm text-zinc-400">
            From high-volume cafes and cloud kitchens to fine dining steakhouses and hotel room service, see how The Scan Menu adapts typography and layout. Explore our dedicated <Link to="/industries" className="text-amber-400 underline hover:text-amber-300">industry solutions</Link>.
          </p>
        </div>

        <VenueSwitcher />
      </section>

      {/* Detailed Technical Comparison Table */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-mono-accent text-zinc-500 uppercase tracking-widest">
            FEATURE BENCHMARK MATRIX
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            How The Scan Menu Compares to Alternatives
          </h2>
          <p className="text-sm text-zinc-400">
            Compare real capabilities across speed, guest convenience, and operational management.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden">
            <thead>
              <tr className="bg-zinc-900 border-b border-white/10 text-zinc-300 font-mono-accent">
                <th className="p-4">Operational Capability</th>
                <th className="p-4">Physical Paper Menu</th>
                <th className="p-4">Standard PDF QR Code</th>
                <th className="p-4 text-amber-400 font-bold">The Scan Menu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-400">
              <tr>
                <td className="p-4 font-semibold text-white">Average Load Speed</td>
                <td className="p-4">Instant physical, but requires waiter delivery (5–15 min)</td>
                <td className="p-4">8.5 – 14.0s heavy download</td>
                <td className="p-4 text-amber-400 font-bold">0.38s Edge Web Unfurl</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-white">App Download Required?</td>
                <td className="p-4">No</td>
                <td className="p-4">Often requires PDF viewer app</td>
                <td className="p-4 text-amber-400 font-bold">Never (Native Browser Web)</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-white">Live 86 / Sold-Out Sync</td>
                <td className="p-4">None (Must cross out by hand)</td>
                <td className="p-4">None (Must re-upload whole PDF)</td>
                <td className="p-4 text-amber-400 font-bold">&lt; 1s Real-Time Portal Sync</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-white">Allergen &amp; Dietary Badging</td>
                <td className="p-4">Static, easy to miss</td>
                <td className="p-4">Static text inside PDF</td>
                <td className="p-4 text-amber-400 font-bold">Interactive Dynamic Filters</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-white">Direct Kitchen Dispatch</td>
                <td className="p-4">Manual staff trip to POS</td>
                <td className="p-4">View-only (No ordering)</td>
                <td className="p-4 text-amber-400 font-bold">Thermal Printer / KDS Routing</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-white">Automated Google Reviews</td>
                <td className="p-4">None</td>
                <td className="p-4">None</td>
                <td className="p-4 text-amber-400 font-bold">Integrated 5-Star Prompter</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive 86 Sold Out Demonstration */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <Interactive86Engine />
      </section>

      {/* Interactive Floor Plan & Dynamic QR Generator */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <InteractiveFloorPlan />
      </section>

      {/* Interactive ROI Calculator */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <InteractiveRoiCalculator />
      </section>

      {/* Trust & Metrics Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Stats Counters */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10">
              <span className="text-4xl md:text-5xl font-extrabold text-amber-400 font-mono-accent">0.38s</span>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Average Edge Menu Load</p>
            </div>
            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10">
              <span className="text-4xl md:text-5xl font-extrabold text-white font-mono-accent">+21.4%</span>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Average Table Ticket Growth</p>
            </div>
            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10">
              <span className="text-4xl md:text-5xl font-extrabold text-white font-mono-accent">&lt;15 min</span>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Total Venue Setup Time</p>
            </div>
            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10">
              <span className="text-4xl md:text-5xl font-extrabold text-amber-400 font-mono-accent">99.9%</span>
              <p className="text-xs text-zinc-400 mt-2 font-medium">Edge SLA Guarantee</p>
            </div>
          </div>

          {/* Quiet Contrast Narrative */}
          <div className="space-y-6">
            <span className="text-xs font-mono-accent text-zinc-500 uppercase tracking-widest">
              THE PIXORA CRAFT
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Not Another Clunky Spreadsheet. <br />
              <span className="text-amber-400">Software Guests Actually Enjoy.</span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Most restaurant technology is built purely for back-office administrators — rigid tables, slow portals, and zero visual finesse.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We engineered The Scan Menu from the guest perspective: fluid 60fps animations, instant camera/NFC response, and Apple-grade clarity that makes your venue look world-class. Learn more about our <Link to="/features" className="text-amber-400 underline hover:text-amber-300">platform features</Link> and <Link to="/how-it-works" className="text-amber-400 underline hover:text-amber-300">8-beat customer journey</Link>.
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-bold text-white">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-400" />
                <span>Zero App Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-400" />
                <span>Real-Time Menu Sync</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Honest FAQ Section for AEO */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            FREQUENTLY ASKED QUESTIONS • AEO KNOWLEDGE BASE
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Honest Answers for Restaurant Owners
          </h2>
          <p className="text-sm text-zinc-400">
            Direct, plain-language explanations of how our physical hardware and digital software work in day-to-day service.
          </p>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Do restaurant guests need to download an application to order?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>No application download is ever required.</strong> The Scan Menu runs entirely in standard mobile web browsers such as Safari and Chrome. When a guest taps an NFC stand or scans a QR code, the menu opens in approximately 0.38 seconds without asking for phone numbers, app store logins, or account creation.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does an NFC restaurant menu work?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>An NFC menu operates via an embedded NTAG216 high-frequency (13.56 MHz) microchip</strong> placed inside our waterproof acrylic or solid walnut tabletop stands. When an iPhone (XS and newer) or modern Android smartphone is tapped on the stand, the device automatically reads the secure URL and launches the digital menu with that specific table number pre-assigned.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>What happens if a guest phone does not support NFC?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Every tabletop piece is a dual NFC + QR stand.</strong> If a diner has an older device without NFC or prefers using the camera, they simply point their phone lens at the high-contrast vector QR code to reach the exact same interactive menu. Check out our <Link to="/products/qr" className="text-amber-400 underline">branded QR stand specifications</Link> for details.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Can restaurant managers update prices and 86 sold-out items in real time?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes, updates reflect across all dining tables in under 1 second.</strong> When an ingredient runs out during a dinner rush, your floor manager can toggle the item to "Sold Out" on any phone or laptop. Guests currently looking at the menu see the status update immediately without page refreshes.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Does The Scan Menu work on slow restaurant Wi-Fi or congested 3G?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes. Menus are statically cached on global edge CDN nodes.</strong> The initial page bundle is less than 45KB, meaning guests can browse menus seamlessly even in basement bars or crowded dining rooms with spotty Wi-Fi.
            </p>
          </article>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="glass-card p-10 md:p-16 rounded-3xl border border-amber-500/30 text-center space-y-6 relative overflow-hidden amber-glow">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Ready to Upgrade Your Dining Room?
          </h2>
          <p className="text-sm md:text-base text-zinc-300 max-w-xl mx-auto">
            Get custom laser-engraved NFC and QR hardware delivered to your restaurant, fully configured with your menu in under 48 hours. Review our transparent <Link to="/pricing" className="text-amber-400 underline font-semibold">pricing plans</Link> or request a private demo kit.
          </p>
          <div className="pt-4 flex justify-center">
            <Magnetic strength={0.4}>
              <Link
                to="/contact"
                className="px-8 py-4 rounded-full text-sm font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-xl shadow-amber-500/30 flex items-center gap-2"
              >
                <span>Request Custom Hardware Quote</span>
                <ArrowRight size={18} />
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>
    </div>
  );
};
