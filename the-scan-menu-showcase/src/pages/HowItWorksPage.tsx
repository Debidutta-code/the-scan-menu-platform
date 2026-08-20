import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HorizontalStoryStrip } from '../components/interactive/HorizontalStoryStrip';
import { CheckCircle, Clock, Zap, Shield, ArrowRight, HelpCircle, Utensils, CreditCard, Star, Printer, Smartphone } from 'lucide-react';
import { SEO } from '../components/common/SEO';

export const HowItWorksPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const howItWorksSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        '@id': 'https://thescanmenu.com/how-it-works#howto',
        'name': 'How Contactless Dining Works with The Scan Menu',
        'description': 'The 8-beat operational journey of contactless restaurant ordering: from NFC table tap to kitchen ticket print and automated 5-star Google review.',
        'step': [
          {
            '@type': 'HowToStep',
            'position': 1,
            'name': 'Customer Arrives & Takes Table',
            'text': 'Guest is seated and notices the laser-engraved NFC and QR tabletop stand.',
          },
          {
            '@type': 'HowToStep',
            'position': 2,
            'name': 'Taps Phone or Scans QR',
            'text': 'Guest taps their smartphone on the NFC disc or scans the high-contrast QR code with their camera.',
          },
          {
            '@type': 'HowToStep',
            'position': 3,
            'name': 'Menu Opens in 0.38 Seconds',
            'text': 'The mobile web menu opens instantly in Safari or Chrome without installing apps.',
          },
          {
            '@type': 'HowToStep',
            'position': 4,
            'name': 'Interactive Dish Browsing',
            'text': 'Diner browses rich food photography, customizes dish preferences, and applies allergen filters.',
          },
          {
            '@type': 'HowToStep',
            'position': 5,
            'name': 'One-Tap Order Dispatch',
            'text': 'Diner places order; table token automatically binds order to the correct table number.',
          },
          {
            '@type': 'HowToStep',
            'position': 6,
            'name': 'Kitchen Thermal Ticket Prints',
            'text': 'The order prints on the kitchen ESC/POS thermal printer or sends to the kitchen display screen.',
          },
          {
            '@type': 'HowToStep',
            'position': 7,
            'name': 'Contactless Bill Settlement',
            'text': 'Guest pays via Apple Pay, Google Pay, UPI, or credit card directly on their device.',
          },
          {
            '@type': 'HowToStep',
            'position': 8,
            'name': 'Automated 5-Star Google Review',
            'text': 'Post-payment screen invites satisfied diners to rate the restaurant on Google Maps.',
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/how-it-works#breadcrumbs',
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
            'name': 'How It Works',
            'item': 'https://thescanmenu.com/how-it-works',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/how-it-works#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'How does the customer journey differ from traditional paper menus?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Traditional paper menus require guests to wait for waitstaff to bring booklets, return to take notes, manually punch orders into a terminal, and bring a credit card reader. The Scan Menu eliminates these friction points by allowing guests to tap the tabletop stand, browse high-res photos, send orders directly to the kitchen, and pay on their phone, reducing table turnaround times by 15 to 20 minutes.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How do waitstaff know which table placed the order?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Each physical NFC tag and QR code contains an encrypted token that pre-assigns the exact table number to the diner web session. When an order is sent, the kitchen ticket automatically prints with the precise table identifier.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="pt-32 pb-20 space-y-20">
      <SEO
        title="How It Works — The 8-Beat Contactless Dining Journey | The Scan Menu"
        description="Step-by-step walkthrough of contactless dining: NFC tap, 0.38s edge load, interactive ordering, kitchen thermal dispatch, and automated Google reviews."
        keywords="how contactless ordering works, NFC restaurant ordering flow, digital menu customer journey, table ordering workflow, Pixora Studios"
        canonicalPath="/how-it-works"
        schema={howItWorksSchema}
      />

      {/* Header */}
      <section className="text-center max-w-4xl mx-auto px-4 space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          THE 8-BEAT OPERATIONAL JOURNEY
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          From Table Seat to <br />
          <span className="amber-text-gradient">5-Star Review in Seconds.</span>
        </h1>
        <p className="text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          Follow the exact customer and kitchen experience from the moment a diner takes a seat to automated post-meal feedback.
        </p>
      </section>

      {/* Horizontal Story Strip with GSAP Scroll Trigger */}
      <HorizontalStoryStrip />

      {/* Step Breakdown Cards */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            STEP-BY-STEP OPERATIONAL SUBSTANCE
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            What Happens at Every Beat
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-mono-accent font-bold">
              01
            </div>
            <h3 className="text-base font-bold text-white">Table Stand Touch</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diner rests their smartphone on the <Link to="/products/nfc" className="text-amber-400 underline">laser-engraved NFC stand</Link> or scans the <Link to="/products/qr" className="text-amber-400 underline">vector QR code</Link>.
            </p>
          </div>

          <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-mono-accent font-bold">
              02
            </div>
            <h3 className="text-base font-bold text-white">0.38s Browser Unfurl</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Lightweight HTML5 menu opens in Safari or Chrome. Table number is pre-authenticated with zero app downloads.
            </p>
          </div>

          <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-mono-accent font-bold">
              03
            </div>
            <h3 className="text-base font-bold text-white">Direct Kitchen Dispatch</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Order routes to kitchen thermal receipt printer or KDS with seat positions, modifiers, and allergy tags.
            </p>
          </div>

          <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-mono-accent font-bold">
              04
            </div>
            <h3 className="text-base font-bold text-white">Payment &amp; 5-Star Review</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diner pays via Apple Pay, Google Pay, or card, and is seamlessly prompted to leave a positive Google review.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Highlights */}
      <section className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
          <Clock className="text-amber-400" size={24} />
          <h3 className="text-base font-bold text-white">0.38s Edge Load</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">Zero app downloads, fast global CDN edge caching.</p>
        </div>
        <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
          <Zap className="text-amber-400" size={24} />
          <h3 className="text-base font-bold text-white">Live Kitchen Dispatch</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">Orders print directly on kitchen thermal receipt printers.</p>
        </div>
        <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
          <Shield className="text-amber-400" size={24} />
          <h3 className="text-base font-bold text-white">Encrypted Digital Pay</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">Secure 256-bit encrypted Apple Pay and card checkout.</p>
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            JOURNEY FAQ • AEO KNOWLEDGE BASE
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Questions About the Guest Journey
          </h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does the customer journey differ from traditional paper menus?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>The Scan Menu reduces table turnaround by 15 to 20 minutes.</strong> Diners browse high-res photos and allergen tags immediately upon seating, place orders without waving down busy staff, and pay their bill directly on their phone.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How do waitstaff know which table placed the order?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Each physical NFC disc and QR code is encrypted with a unique table identifier.</strong> When an order is submitted, the ticket prints with the exact table number (e.g. Table #08) and seat position, so food runners deliver dishes with zero confusion.
            </p>
          </article>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Ready to Deploy This 8-Beat Journey?</h2>
          <p className="text-xs md:text-sm text-zinc-300 max-w-lg mx-auto">
            Discover our <Link to="/features" className="text-amber-400 underline font-semibold">platform features</Link>, check <Link to="/pricing" className="text-amber-400 underline font-semibold">transparent pricing</Link>, or request a sample hardware kit.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
            >
              <span>Get Started with The Scan Menu</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
