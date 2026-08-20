import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Layers, BarChart3, RefreshCw, Smartphone, ShieldCheck, Printer, Globe, Star, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ImageAsset } from '../components/common/ImageAsset';
import { Card3D } from '../components/ui/Card3D';
import { InteractiveKds } from '../components/interactive/InteractiveKds';
import { Interactive86Engine } from '../components/interactive/Interactive86Engine';
import { SEO } from '../components/common/SEO';

export const FeaturesPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const featuresSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://thescanmenu.com/features#software',
        'name': 'The Scan Menu Hospitality Suite',
        'applicationCategory': 'BusinessApplication',
        'operatingSystem': 'Web Browser (iOS Safari, Android Chrome)',
        'featureList': [
          '0.38s Edge CDN Performance',
          'Instant 1-Second 86ing & Live Price Updates',
          'Interactive Allergen & Dietary Filtering',
          'Thermal Kitchen Ticket & POS Dispatch',
          'Multi-Lingual Automatic Translation',
          'Automated 5-Star Google Review Prompter',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/features#breadcrumbs',
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
            'name': 'Features',
            'item': 'https://thescanmenu.com/features',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/features#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'How does real-time item 86ing work during a busy dinner service?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'When an ingredient runs out, a manager toggles the dish to "Sold Out" in the dashboard. The status broadcasts via WebSocket connections to all active customer phone sessions in under 1 second, preventing diners from ordering unavailable dishes.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How does The Scan Menu send orders to the kitchen?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Orders placed by diners route directly over local network or cloud API to your existing kitchen display system (KDS) or ESC/POS thermal receipt printers, printing the order with exact table numbers, seat positions, and special allergy notes.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How does multi-lingual translation work for foreign guests?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'The platform detects the guest default smartphone language and instantly translates item titles, descriptions, and dietary alerts into English, Spanish, French, German, Japanese, Mandarin, and Arabic without manual translation files.',
            },
          },
        ],
      },
    ],
  };

  const featurePillars = [
    {
      badge: 'SPEED & EDGE INFRASTRUCTURE',
      title: '0.38s Ultra-Fast Edge Loading',
      desc: 'Menus are compiled into lightweight HTML5 bundles (<45KB) and cached on 300+ global edge CDN points. Guests never wait for heavy PDFs or app store downloads, even in basement dining rooms with congested 3G networks.',
      graphic: 'feature-lightning',
      highlight: '< 0.4s Edge Load Speed',
      stats: '45KB Total Initial Bundle',
    },
    {
      badge: 'REAL-TIME KITCHEN CATALOG',
      title: 'Instant 1-Second 86ing & Live Price Sync',
      desc: 'Never disappoint a diner with an unavailable dish. Floor managers can 86 sold-out specials, update happy hour pricing, or introduce new chef creations in real time. Changes reflect across all dining tables in under 1 second.',
      graphic: 'feature-categories',
      highlight: '< 1s Live Menu Sync',
      stats: 'Zero Reprint Costs',
    },
    {
      badge: 'REVENUE & GUEST INTELLIGENCE',
      title: 'Smart Guest Analytics & Average Ticket Growth',
      desc: 'Discover peak ordering times, most viewed appetizers, and high-margin dessert add-ons. Visual upselling prompts increase average table spend by 18% to 22% while saving waitstaff 40+ manual trips per shift.',
      graphic: 'feature-analytics',
      highlight: '+21.4% Table Ticket Average',
      stats: '40+ Trips Saved Per Shift',
    },
  ];

  const secondaryFeatures = [
    {
      icon: Printer,
      title: 'Thermal Ticket & POS Dispatch',
      desc: 'Orders route directly to kitchen thermal receipt printers and KDS screens with table tokens and diner notes.',
    },
    {
      icon: Globe,
      title: 'Auto Multi-Lingual Translation',
      desc: 'Native translation into Spanish, French, German, Japanese, and Mandarin based on diner phone language.',
    },
    {
      icon: Star,
      title: 'Automated 5-Star Google Reviews',
      desc: 'Prompts happy diners to rate your venue on Google immediately following bill payment.',
    },
  ];

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-24">
      <SEO
        title="Restaurant Platform Features — Speed, 86ing & Kitchen Sync | The Scan Menu"
        description="Explore 0.38s edge CDN speed, real-time 86ing, allergen filtering, thermal kitchen dispatch, multi-lingual menus, and automated Google review prompters."
        keywords="restaurant menu features, real-time menu sync, item 86ing, kitchen display system integration, multi-language restaurant menu, Pixora Studios"
        canonicalPath="/features"
        schema={featuresSchema}
      />

      {/* Header */}
      <section className="text-center max-w-4xl mx-auto space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          ENTERPRISE HOSPITALITY CAPABILITIES
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          Crafted for Precision. <br />
          <span className="amber-text-gradient">Engineered for Table Delight.</span>
        </h1>
        <p className="text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Every feature is built around real restaurant operational workflows: saving staff footsteps, eliminating menu re-printing expenses, and giving diners a 60fps mobile web experience.
        </p>
      </section>

      {/* Feature Stage Moments */}
      <section className="space-y-16">
        {featurePillars.map((feat, idx) => (
          <Card3D key={idx} maxRotation={3}>
            <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center amber-glow-sm">
              <div className="space-y-4">
                <span className="text-xs font-mono-accent font-bold text-amber-400 tracking-wider">
                  {feat.badge}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">{feat.title}</h2>
                <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">{feat.desc}</p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full text-xs font-mono-accent font-bold bg-amber-400 text-black">
                    {feat.highlight}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-mono-accent font-semibold bg-zinc-900 text-zinc-300 border border-white/10">
                    {feat.stats}
                  </span>
                </div>
              </div>
              <div className="w-full h-72 flex items-center justify-center p-2">
                <ImageAsset name={feat.graphic} alt={feat.title} className="w-full h-full max-h-64" />
              </div>
            </div>
          </Card3D>
        ))}
      </section>

      {/* Live Interactive Kitchen Display System (KDS) Feature Stage */}
      <section className="space-y-6">
        <InteractiveKds />
      </section>

      {/* Live Interactive 86 Sold-Out Engine Feature Stage */}
      <section className="space-y-6">
        <Interactive86Engine />
      </section>

      {/* Secondary Feature Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            ADDITIONAL PLATFORM PILLARS
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Operational Depth Built-In
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            From kitchen printers to tourist translations, explore how our software solves daily dining room friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {secondaryFeatures.map((feat, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                  <feat.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
              <div className="text-[11px] font-mono-accent text-amber-400 pt-2 border-t border-white/5 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Included in all active plans</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            FEATURE FAQ • AEO KNOWLEDGE BASE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            How The Platform Works in Day-to-Day Service
          </h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does real-time item 86ing work during a busy dinner service?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>When an ingredient runs out, a manager toggles the dish to "Sold Out" in the dashboard.</strong> The status broadcasts via WebSocket connections to all active customer phone sessions in under 1 second, preventing diners from ordering unavailable dishes.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does The Scan Menu send orders to the kitchen?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Orders placed by diners route directly over local network or cloud API to your kitchen display system (KDS) or ESC/POS thermal receipt printers.</strong> The kitchen receives clear tickets with exact table numbers, seat positions, and special allergy modifications. See our <Link to="/how-it-works" className="text-amber-400 underline">8-beat customer journey</Link> for complete details.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does multi-lingual translation work for foreign guests?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>The platform detects the guest default smartphone language automatically.</strong> It translates item titles, descriptions, and dietary alerts into English, Spanish, French, German, Japanese, Mandarin, and Arabic without manual translation files or slow third-party widgets.
            </p>
          </article>
        </div>
      </section>

      {/* Action Banner */}
      <section className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">Experience The Scan Menu in Action</h2>
        <p className="text-xs md:text-sm text-zinc-300 max-w-lg mx-auto">
          Review our <Link to="/products/nfc" className="text-amber-400 underline font-semibold">NFC hardware specs</Link>, check <Link to="/pricing" className="text-amber-400 underline font-semibold">pricing options</Link>, or request a live personalized demo.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
          >
            <span>Schedule Private Platform Walkthrough</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
