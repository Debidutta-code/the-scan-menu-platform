import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, HelpCircle, Calculator, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { Magnetic } from '../components/ui/Magnetic';
import { InteractiveRoiCalculator } from '../components/interactive/InteractiveRoiCalculator';
import { SEO } from '../components/common/SEO';

export const PricingPage: React.FC = () => {
  const [tables, setTables] = useState(25);
  const [ordersPerDay, setOrdersPerDay] = useState(80);
  const [avgTicket, setAvgTicket] = useState(25);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ROI Math: 18% upsell growth over 30 days
  const monthlyRevenueGrowth = Math.round(tables * (ordersPerDay / tables) * avgTicket * 0.18 * 30);

  const pricingSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': 'https://thescanmenu.com/pricing#essential',
        'name': 'The Scan Menu Essential QR Plan',
        'description': 'Contactless QR menu platform with up to 30 custom laser-engraved table stands, real-time 86ing, and allergen filtering.',
        'offers': {
          '@type': 'Offer',
          'price': '29.00',
          'priceCurrency': 'USD',
          'billingIncrement': 'P1M',
          'availability': 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'Product',
        '@id': 'https://thescanmenu.com/pricing#nfc-pro',
        'name': 'The Scan Menu NFC Pro Showcase',
        'description': 'Dual NFC tap and QR hardware suite with up to 75 NTAG216 stands, thermal kitchen dispatch, and automated Google review prompter.',
        'offers': {
          '@type': 'Offer',
          'price': '69.00',
          'priceCurrency': 'USD',
          'billingIncrement': 'P1M',
          'availability': 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/pricing#breadcrumbs',
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
            'name': 'Pricing',
            'item': 'https://thescanmenu.com/pricing',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/pricing#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Are there any hidden order commissions or per-scan transaction fees?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'No. The Scan Menu charges zero commission on food or beverage sales and zero per-scan fees. You pay only the flat monthly software subscription and standard direct payment gateway processing fees (e.g. Stripe or UPI).',
            },
          },
          {
            '@type': 'Question',
            'name': 'How quickly do custom branded NFC stands arrive?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Custom laser-engraved tabletop stands are manufactured, pre-programmed with your table numbers, and dispatched within 48 hours, arriving at your venue in 3 to 5 business days.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Can I cancel or switch my plan at any time?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. All plans operate on flexible month-to-month terms with zero lock-in contracts. You can upgrade, downgrade, or cancel anytime from your management portal.',
            },
          },
          {
            '@type': 'Question',
            'name': 'What happens if a tabletop stand is damaged or lost?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Replacement NFC discs and QR stands can be ordered directly from your portal at a nominal hardware cost ($4–$8 per unit) and arrive pre-linked to your table number.',
            },
          },
        ],
      },
    ],
  };

  const plans = [
    {
      name: 'Essential QR',
      price: '$29',
      period: '/month',
      desc: 'Ideal for small cafes, food trucks, and bistros starting with digital ordering.',
      features: [
        'Up to 30 Custom Laser QR Stands',
        '0.38s Unlimited Web Menu Views',
        'Real-Time Item 86ing & Live Price Sync',
        'Interactive Allergen & Dietary Filter',
        'Standard Email & Ticket Support',
      ],
      popular: false,
    },
    {
      name: 'NFC Pro Showcase',
      price: '$69',
      period: '/month',
      desc: 'Full dual NFC tap + QR hardware experience for high-volume restaurants and bars.',
      features: [
        'Up to 75 Custom Branded Dual NFC Stands',
        'Industrial NTAG216 Chips with Anti-Metal Shielding',
        'Thermal Kitchen Printer & KDS Dispatch',
        'Automated 5-Star Google Review Prompter',
        'Multi-Lingual Auto Translation (6 Languages)',
        'Priority 24/7 Phone & Chat Support',
      ],
      popular: true,
    },
    {
      name: 'Enterprise Hotel Suite',
      price: 'Custom',
      period: '',
      desc: 'Multi-property hotel resorts, casino dining, and national franchise chains.',
      features: [
        'Unlimited Venues, Dining Tables & Rooms',
        'PMS In-Room Folio Charge Integration',
        'POS API Connectors (Micros, Toast, Clover)',
        'Multi-Property Centralized Menu Management',
        'Dedicated Account Specialist & 99.9% SLA',
      ],
      popular: false,
    },
  ];

  const pricingFaqs = [
    {
      q: 'Are there any hidden order commissions or per-scan transaction fees?',
      a: 'No. The Scan Menu charges zero commission on food or beverage sales and zero per-scan fees. You pay only the flat monthly software subscription and standard direct payment gateway processing fees (e.g. Stripe or UPI).',
    },
    {
      q: 'How quickly do custom branded NFC stands arrive?',
      a: 'Custom laser-engraved tabletop stands are manufactured, pre-programmed with your table numbers, and dispatched within 48 hours, arriving at your venue in 3 to 5 business days.',
    },
    {
      q: 'Can I cancel or switch my plan at any time?',
      a: 'Yes. All plans operate on flexible month-to-month terms with zero lock-in contracts. You can upgrade, downgrade, or cancel anytime from your management portal.',
    },
    {
      q: 'What happens if a tabletop stand is damaged or lost?',
      a: 'Replacement NFC discs and QR stands can be ordered directly from your portal at a nominal hardware cost ($4–$8 per unit) and arrive pre-linked to your table number.',
    },
  ];

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-20">
      <SEO
        title="Transparent Restaurant Menu Pricing — No Hidden Fees | The Scan Menu"
        description="Transparent monthly plans starting at $29/mo with zero order commissions. Custom laser-engraved NFC & QR table stands delivered in 48 hours."
        keywords="restaurant menu pricing, QR menu cost, NFC table stand price, contactless ordering plans, Pixora Studios"
        canonicalPath="/pricing"
        schema={pricingSchema}
      />

      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          TRANSPARENT VALUE • ZERO ORDER COMMISSIONS
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          Simple Pricing for Every Venue.
        </h1>
        <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
          Choose the right plan for your table count. Every package includes hardware, 0.38s edge software, and real-time portal updates.
        </p>
      </section>

      {/* Pricing Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`p-8 rounded-3xl flex flex-col justify-between relative ${
              plan.popular
                ? 'bg-zinc-900 border-2 border-amber-400 shadow-2xl amber-glow'
                : 'bg-zinc-950 border border-white/10'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono-accent font-extrabold bg-amber-400 text-black uppercase tracking-wider">
                MOST POPULAR CHOICE
              </span>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{plan.desc}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono-accent">{plan.price}</span>
                <span className="text-xs text-zinc-400">{plan.period}</span>
              </div>

              <ul className="space-y-3 pt-4 border-t border-white/10 text-xs text-zinc-300">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/contact"
                className={`w-full py-3 rounded-full text-xs font-bold text-center block transition-colors ${
                  plan.popular
                    ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
              >
                {plan.popular ? 'Get Started with NFC Pro' : 'Choose Plan'}
              </Link>
            </div>
          </div>
        ))}
      </section>

      {/* Rich Interactive ROI Calculator */}
      <section className="space-y-6">
        <InteractiveRoiCalculator />
      </section>

      {/* Direct AEO FAQ Accordion */}
      <section className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            PRICING &amp; CONTRACT FAQ
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Frequently Asked Pricing Questions</h2>
        </div>

        <div className="space-y-4">
          {pricingFaqs.map((faq, idx) => (
            <article key={idx} className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle size={18} className="text-amber-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed pl-6">{faq.a}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Action Banner */}
      <section className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">Need a Custom Hardware Quote?</h2>
        <p className="text-xs md:text-sm text-zinc-300 max-w-lg mx-auto">
          Explore our <Link to="/products/nfc" className="text-amber-400 underline font-semibold">NFC stand hardware</Link> or contact our hospitality design team for custom table materials and branding.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
          >
            <span>Request Custom Hardware Quote</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
