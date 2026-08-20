import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Scan, ArrowRight, CheckCircle2, Sparkles, Layout, Smartphone, HelpCircle, Layers, ShieldCheck } from 'lucide-react';
import { ScanRevealQr } from '../components/interactive/ScanRevealQr';
import { Card3D } from '../components/ui/Card3D';
import { SEO } from '../components/common/SEO';

export const QrPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const qrSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': 'https://thescanmenu.com/products/qr#product',
        'name': 'The Scan Menu Dynamic Tabletop QR Stand',
        'description': 'High-contrast dynamic vector QR tabletop stands for contactless restaurant ordering. High error-correction level H with 0.38s edge-cached web menus.',
        'brand': {
          '@type': 'Brand',
          'name': 'The Scan Menu by Pixora Studios',
        },
        'offers': {
          '@type': 'Offer',
          'price': '29.00',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
          'url': 'https://thescanmenu.com/pricing',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/products/qr#breadcrumbs',
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
            'name': 'QR Menu Stands',
            'item': 'https://thescanmenu.com/products/qr',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/products/qr#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Why are dynamic vector QR menus better than downloadable PDF menus?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Dynamic vector QR menus load a responsive web interface in 0.38 seconds, eliminating heavy 15MB PDF downloads, pinching, and horizontal zooming. They enable real-time price updates, item 86ing, dietary allergen filters, and direct kitchen ordering that static PDFs cannot support.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Can I change my restaurant menu without reprinting physical QR stands?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. Because our QR codes use dynamic cloud routing, you can change prices, add dishes, or swap whole seasonal menus inside your management portal at any time. The physical QR code stand on the table never needs to be reprinted or replaced.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Do QR menus work on all iPhone and Android camera apps?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. All standard camera apps on iOS (iOS 11+) and Android automatically recognize our high-contrast vector codes instantly without installing third-party barcode reader applications.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-20">
      <SEO
        title="Branded Tabletop QR Menu Stands — Dynamic Routing | The Scan Menu"
        description="Laser-crafted acrylic and wood tabletop QR stands for restaurants. Dynamic cloud routing, instant camera scans, zero PDF downloads, and real-time kitchen sync."
        keywords="QR menu, dynamic QR code menu, restaurant table stand, contactless QR ordering, Pixora Studios"
        canonicalPath="/products/qr"
        schema={qrSchema}
      />

      {/* Header */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono-accent bg-zinc-900 text-amber-400 border border-white/10">
          <QrCode size={14} />
          <span>BRANDED TABLETOP HARDWARE • DYNAMIC CLOUD ROUTING</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Branded QR Menu Stands. <br />
          <span className="amber-text-gradient">Every Table, Connected in 0.38s.</span>
        </h1>

        <p className="text-base md:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed">
          Not a paper sticker stuck on wood. Custom acrylic, brushed metal, and solid walnut tabletop QR stands that elevate your restaurant ambiance while launching instant, edge-cached web menus on any smartphone camera.
        </p>
      </section>

      {/* Interactive Scan Reveal Stage */}
      <section className="glass-card p-6 md:p-12 rounded-3xl border border-white/10 shadow-2xl">
        <ScanRevealQr />
      </section>

      {/* QR Features Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            PRECISION QR SPECIFICATIONS
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Engineered for Flawless Camera Reads
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            High-contrast vector optics ensure instant scanning even in low-light dining atmospheres.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Layout size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Custom Table Stand Materials</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose from matte black acrylic, brushed champagne aluminum, or solid walnut wooden table tents laser-engraved with your logo and table numbers.
              </p>
            </div>
            <div className="text-[10px] font-mono-accent text-amber-400 pt-2 border-t border-white/5">
              Matte Acrylic • Aluminum • Solid Walnut
            </div>
          </Card3D>

          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Scan size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Cloud Redirects</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Change your menu prices, add daily specials, or re-assign table numbers anytime in your portal without ever re-printing or replacing physical QR hardware.
              </p>
            </div>
            <div className="text-[10px] font-mono-accent text-amber-400 pt-2 border-t border-white/5">
              Zero Re-Printing Costs • Permanent Hardware
            </div>
          </Card3D>

          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Level-H Error Correction</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Vector matrix codes are generated with Level-H Reed-Solomon error correction, remaining 100% readable even if 30% of the surface is smudged or scratched.
              </p>
            </div>
            <div className="text-[10px] font-mono-accent text-amber-400 pt-2 border-t border-white/5">
              Spill-Proof • 30% Damage Tolerance
            </div>
          </Card3D>
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            QR MENU QUESTIONS &amp; ANSWERS
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Common Questions About QR Table Stands
          </h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Why are dynamic web QR menus better than downloadable PDF menus?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Dynamic web menus load in 0.38 seconds without downloading heavy 15MB files.</strong> Diners enjoy interactive food photographs, dietary allergen filtering, and one-tap order dispatch instead of frustrating pinch-and-zoom PDFs.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Can I update my restaurant menu without re-printing QR codes?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes. The QR code links to a dynamic cloud route.</strong> When you modify prices or 86 sold-out dishes in your manager dashboard, the changes update immediately on all dining tables without replacing the physical stands.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Can I combine QR and NFC on the exact same tabletop stand?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes. Every Pixora stand includes dual QR + NFC technology.</strong> Guests with modern smartphones can tap the embedded NFC disc, while guests with older devices can point their camera at the QR code. Explore our <Link to="/products/nfc" className="text-amber-400 underline font-semibold">NFC hardware guide</Link> for details.
            </p>
          </article>
        </div>
      </section>

      {/* Action Banner */}
      <section className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">Combine QR + NFC on the Same Table Stand</h2>
        <p className="text-xs md:text-sm text-zinc-300 max-w-lg mx-auto">
          Give your guests the choice: tap with phone NFC or scan with camera. One dual hardware piece handles both effortlessly. Check our <Link to="/pricing" className="text-amber-400 underline font-semibold">pricing packages</Link> or order a custom sample.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
          >
            <span>Get Dual Hardware Preview</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
