import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VenueSwitcher } from '../components/interactive/VenueSwitcher';
import { Store, Building2, Coffee, Wine, Utensils, Flame, ArrowRight, HelpCircle, CheckCircle2 } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const IndustriesPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const industriesSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': 'https://thescanmenu.com/industries#service',
        'name': 'The Scan Menu Hospitality Suite',
        'description': 'Contactless digital menu and table ordering tailored for fine dining, hotels, cafes, craft cocktail bars, cloud kitchens, and food courts.',
        'url': 'https://thescanmenu.com/industries',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/industries#breadcrumbs',
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
            'name': 'Industries',
            'item': 'https://thescanmenu.com/industries',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/industries#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Can hotels use The Scan Menu for in-room dining and room bill charging?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. Hotels place NFC cards or QR stands on bedside tables and poolside cabanas. Guests can order room service, specify delivery times, and charge orders directly to their room folio via PMS integration.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How does The Scan Menu help bars and nightlife venues during peak hours?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'In crowded bars and lounges, patrons avoid waving down busy bartenders by tapping the illuminated bar disc to order craft cocktails and beers, settling tabs instantly with Apple Pay or UPI.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Can a cloud kitchen run multiple virtual restaurant brands on one system?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. The Scan Menu allows multi-concept cloud kitchens to manage multiple brand menus from a single kitchen portal, routing pick-up orders to dedicated packing stations.',
            },
          },
        ],
      },
    ],
  };

  const industryVerticals = [
    {
      icon: Utensils,
      title: 'Fine Dining & Steakhouses',
      desc: 'Elegant serif typography, sommelier tasting notes, wine pairings, and luxury solid walnut NFC stands that preserve refined table ambiance.',
      highlight: 'Sommelier Notes • Curated Typography',
    },
    {
      icon: Coffee,
      title: 'High-Volume Cafes & Bakeries',
      desc: 'Rapid drink customizations (milk substitutions, extra shots, syrup flavors) and instant mobile tap checkout to keep counter lines moving.',
      highlight: 'One-Tap Modifiers • Fast Checkout',
    },
    {
      icon: Building2,
      title: 'Hotels & Resort In-Room Dining',
      desc: 'Bedside and poolside NFC cards for 24/7 in-room dining, multi-lingual automatic translation for tourists, and PMS folio charge routing.',
      highlight: 'PMS Integration • Multi-Lingual',
    },
    {
      icon: Wine,
      title: 'Bars, Lounges & Nightclubs',
      desc: 'High-contrast dark neon themes readable in low lighting, instant tap re-ordering for craft cocktails, and split-check digital payments.',
      highlight: 'Low-Light High Contrast • Tab Re-ordering',
    },
    {
      icon: Flame,
      title: 'Cloud Kitchens & Virtual Brands',
      desc: 'Host multiple digital brands from a single kitchen display, dispatching orders to delivery drivers and pick-up counters effortlessly.',
      highlight: 'Multi-Brand Routing • Live 86ing',
    },
    {
      icon: Store,
      title: 'Food Courts & Multi-Vendor Halls',
      desc: 'Guests order from multiple culinary stalls on a single digital tab and receive SMS notifications when their meals are ready for collection.',
      highlight: 'Multi-Vendor Tabs • SMS Pick-Up Alert',
    },
  ];

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-20">
      <SEO
        title="Hospitality Industries — Tailored NFC & QR Menus | The Scan Menu"
        description="Explore tailored digital menu solutions for fine dining, hotels, cafes, bars, cloud kitchens, and food courts with custom typography and PMS integration."
        keywords="hotel digital menu, bar QR ordering, cafe NFC menu, fine dining digital menu, cloud kitchen ordering, Pixora Studios"
        canonicalPath="/industries"
        schema={industriesSchema}
      />

      {/* Header */}
      <section className="text-center max-w-4xl mx-auto space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          TAILORED HOSPITALITY VERTICALS
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          Designed for Every Dining Concept.
        </h1>
        <p className="text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Whether you operate a Michelin-starred steakhouse, a 200-room luxury resort, or a bustling urban cafe, The Scan Menu dynamically adapts typography, layout, and ordering logic to match your hospitality ethos.
        </p>
      </section>

      {/* Interactive Venue Switcher */}
      <section className="space-y-4">
        <VenueSwitcher />
      </section>

      {/* 6 Industry Vertical Breakdown */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            SPECIFIC OPERATIONAL WORKFLOWS
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            How The Scan Menu Adapts by Concept
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            Real operational features designed for the unique pain points of each venue type.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {industryVerticals.map((ind, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between hover:border-amber-400/40 transition-colors">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                  <ind.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">{ind.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{ind.desc}</p>
              </div>
              <div className="text-[11px] font-mono-accent text-amber-400 pt-2 border-t border-white/5 flex items-center gap-1.5 font-semibold">
                <CheckCircle2 size={12} />
                <span>{ind.highlight}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            INDUSTRY QUESTIONS &amp; ANSWERS
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Frequently Asked Industry Questions
          </h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Can hotels use The Scan Menu for in-room dining and room bill charging?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes. Hotels place NFC cards or QR stands in guest rooms and poolside cabanas.</strong> Guests can order late-night room service, request specific delivery times, and route charges directly to their guest room folio via PMS integration.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does The Scan Menu help bars and nightlife venues during peak hours?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>In high-volume bars, patrons avoid waving down busy bartenders.</strong> Patrons simply tap the illuminated bar disc to order craft cocktails and beers, settling tabs instantly with Apple Pay or UPI. Explore our <Link to="/products/nfc" className="text-amber-400 underline">instant NFC hardware</Link> for details.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Can a cloud kitchen run multiple virtual restaurant brands on one system?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes. The Scan Menu allows multi-concept cloud kitchens to manage multiple brand menus from a single kitchen portal.</strong> Orders route to dedicated packing stations with real-time 86ing. See our <Link to="/features" className="text-amber-400 underline">platform features</Link> for more information.
            </p>
          </article>
        </div>
      </section>

      {/* Action Banner */}
      <section className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">Tailor The Scan Menu for Your Venue</h2>
        <p className="text-xs md:text-sm text-zinc-300 max-w-lg mx-auto">
          Review our <Link to="/pricing" className="text-amber-400 underline font-semibold">pricing tiers</Link> or get in touch with our team for custom hospitality deployments.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
          >
            <span>Request Custom Concept Demo</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
