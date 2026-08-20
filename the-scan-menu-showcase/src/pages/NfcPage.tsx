import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Smartphone, ArrowRight, ShieldCheck, Cpu, Flame, CheckCircle2, QrCode, HelpCircle, Layers, Award, Sparkles } from 'lucide-react';
import { TapRevealNfc } from '../components/interactive/TapRevealNfc';
import { Card3D } from '../components/ui/Card3D';
import { ImageAsset } from '../components/common/ImageAsset';
import { SEO } from '../components/common/SEO';

export const NfcPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nfcSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': 'https://thescanmenu.com/products/nfc#product',
        'name': 'The Scan Menu Instant NFC Table Stand',
        'description': 'Industrial-grade NTAG216 NFC tabletop stand with ferrite anti-metal shielding for contactless restaurant dining. 0.38s browser load time without app downloads.',
        'brand': {
          '@type': 'Brand',
          'name': 'The Scan Menu by Pixora Studios',
        },
        'offers': {
          '@type': 'Offer',
          'price': '69.00',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
          'url': 'https://thescanmenu.com/pricing',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/products/nfc#breadcrumbs',
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
            'name': 'NFC Tap Menus',
            'item': 'https://thescanmenu.com/products/nfc',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/products/nfc#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'How does an NFC restaurant menu work?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'An NFC restaurant menu contains a miniature NTAG216 microchip pre-programmed with a secure web URL. When a diner holds an iPhone or Android smartphone within 2 to 4 centimeters of the tabletop stand, the device reads the radio-frequency signal and immediately opens the digital menu in their default browser.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Does NFC work on metal or stainless-steel restaurant tables?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. The Scan Menu hardware embeds a specialized ferrite magnetic absorber layer underneath the microchip. This anti-metal shielding prevents eddy currents from metal surfaces from distorting the 13.56 MHz radio frequency, ensuring instantaneous phone tap detection even on cast-iron and stainless steel bar tops.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Which smartphone models support tapping an NFC restaurant menu?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'All Apple iPhones from the iPhone XS, XR, 11 through iPhone 16 natively support background NFC reading without opening any scanner app. Over 90% of modern Android devices equipped with NFC support instant tap reading automatically.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-20">
      <SEO
        title="Instant NFC Restaurant Menus — Tap to Order | The Scan Menu"
        description="NTAG216 industrial NFC tabletop stands for restaurants. Zero app downloads, instant 0.38s browser unfurl, anti-metal ferrite shielding, and real-time kitchen sync."
        keywords="NFC menu, NFC restaurant table stand, tap to order, NTAG216 NFC tag, contactless restaurant ordering, Pixora Studios"
        canonicalPath="/products/nfc"
        schema={nfcSchema}
      />

      {/* Hero Header */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono-accent bg-zinc-900 text-amber-400 border border-white/10">
          <Zap size={14} className="animate-pulse" />
          <span>HARDWARE ENGINEERING • NTAG216 13.56 MHz CHIP</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Instant NFC Table Menus. <br />
          <span className="amber-text-gradient">Tap Phone. Order in 0.38s.</span>
        </h1>

        <p className="text-base md:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed">
          NFC (Near Field Communication) restaurant menus replace paper booklets with luxury tabletop stands. Diners simply rest their smartphone on the stand to launch your full interactive menu with zero app downloads, zero typing, and zero searching in dim restaurant lighting.
        </p>
      </section>

      {/* Interactive Side-by-Side Tap Reveal Stage */}
      <section className="glass-card p-6 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
        <TapRevealNfc />
      </section>

      {/* Side-by-Side Lived Moment: Scan vs Tap */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-zinc-500 uppercase tracking-widest">
            THE GUEST EXPERIENCE EVOLUTION
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Camera Scanning vs. Instant NFC Touch
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            Compare how traditional QR camera scanning compares to zero-step NFC tap touch in day-to-day hospitality environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* QR Scene */}
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-accent text-zinc-400 font-bold flex items-center gap-1.5">
                  <QrCode size={14} />
                  <span>MODE 01: STANDARD QR CAMERA SCAN</span>
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300">Standard Fallback</span>
              </div>
              <h3 className="text-lg font-bold text-white">Camera Alignment Flow</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Requires the diner to unlock their device, open their native camera application, aim the lens at the code, and tap the tiny floating browser link banner.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-400 pt-2 border-t border-white/5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Can be tricky to align in candlelit or dark romantic dining rooms</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Requires clean camera lens without grease smudges</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  <span>Universal fallback for older smartphones without NFC</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] font-mono-accent text-zinc-500 pt-3">
              Included on every <Link to="/products/qr" className="text-amber-400 underline">Pixora dual stand</Link>
            </div>
          </div>

          {/* NFC Scene */}
          <div className="p-8 rounded-3xl bg-zinc-900 border-2 border-amber-400/60 space-y-4 amber-glow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-accent text-amber-400 font-bold flex items-center gap-1.5">
                  <Zap size={14} />
                  <span>MODE 02: ZERO-STEP INSTANT NFC TAP</span>
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-400 text-black">Instant Touch</span>
              </div>
              <h3 className="text-lg font-bold text-white">Zero-Friction Physical Touch</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Guest simply touches their iPhone or Android phone to the tabletop disc. Radio frequency instantly triggers Safari or Chrome to open the table menu in 0.38 seconds.
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-amber-400/20">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">Works effortlessly in pitch black and candlelit venues</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>Zero camera app opening or lens alignment needed</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>Table #08 token pre-bound automatically for direct kitchen dispatch</span>
                </li>
              </ul>
            </div>
            <div className="text-[11px] font-mono-accent text-amber-400 pt-3 flex items-center gap-1">
              <Sparkles size={12} />
              <span>Standard on all NFC Pro &amp; Enterprise plans</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Hardware Stand & Chip Engineering Breakdown */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            COMMERCIAL RESTAURANT SPECIFICATIONS
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Built for Heavy Restaurant Service
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            Engineered to withstand spills, sanitizer sprays, daily dish cleanings, and metallic table interference.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Cpu size={24} />
            </div>
            <h3 className="text-base font-bold text-white">NXP NTAG216 Microchip</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Equipped with 888 bytes of rewritable user memory, operating at 13.56 MHz high frequency. Encapsulated in waterproof, scratch-resistant acrylic designed for heavy restaurant service.
            </p>
            <div className="text-[10px] font-mono-accent text-amber-400">
              IP68 Waterproof • 100,000+ Write Cycles
            </div>
          </Card3D>

          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-white">Ferrite Anti-Metal Shielding</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Standard NFC tags fail on stainless steel, aluminum, and cast-iron tables due to eddy current distortion. Our integrated ferrite backing layer guarantees 100% instant read reliability on any surface.
            </p>
            <div className="text-[10px] font-mono-accent text-amber-400">
              Works on Stainless Steel &amp; Metal Tables
            </div>
          </Card3D>

          <Card3D className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Flame size={24} />
            </div>
            <h3 className="text-base font-bold text-white">Laser-Engraved Branding</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your venue logo precision laser-etched directly onto matte black acrylic, brushed aluminum, or solid walnut wooden table stands with gold and silver inlay options.
            </p>
            <div className="text-[10px] font-mono-accent text-amber-400">
              Custom Shapes • Luxury Finish Options
            </div>
          </Card3D>
        </div>
      </section>

      {/* Chip Schematics Visual Container with Organic Mask */}
      <section className="max-w-4xl mx-auto">
        <div className="glass-card p-8 md:p-12 rounded-3xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
              HARDWARE ARCHITECTURE
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Inside the Pixora NFC Stand
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Every stand is constructed with three bonded layers: a diamond-cut scratchproof acrylic face, an insulated copper antenna coil tuned for 13.56 MHz, and a high-permeability ferrite barrier.
            </p>
            <div className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Compatible with iPhone XS through iPhone 16</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Compatible with all Android NFC devices</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Zero batteries or external power required</span>
              </div>
            </div>
          </div>

          <div className="w-full h-72 flex items-center justify-center">
            <ImageAsset name="nfc-glow-chip" alt="Cross-section schematic of NTAG216 NFC chip with copper coil and ferrite shielding layer" className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            NFC HARDWARE QUESTIONS &amp; ANSWERS
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            Everything You Need to Know About NFC Menus
          </h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does an NFC restaurant menu work?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>An NFC menu operates via an embedded NTAG216 microchip pre-programmed with your menu URL.</strong> When a guest holds their smartphone within 2–4 centimeters of the tabletop stand, the device automatically reads the radio signal and opens the web menu in Safari or Chrome without any app downloads or camera permissions.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>Does NFC work on metal or stainless steel tables?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Yes, our stands include a built-in ferrite anti-metal barrier.</strong> Standard NFC tags short-circuit on metal surfaces because metal absorbs the magnetic field. Our engineered ferrite layer isolates the radio waves, enabling instantaneous tap response even on stainless steel bar tops and iron patio tables.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>What if a diner has an older phone or disabled NFC?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Every piece of Pixora hardware features dual NFC + QR technology.</strong> Diners with older smartphones simply scan the high-contrast vector QR code located right beside the NFC disc to view the identical 0.38-second menu.
            </p>
          </article>
        </div>
      </section>

      {/* Action Banner */}
      <section className="glass-card p-10 rounded-3xl border border-amber-500/30 text-center space-y-4 amber-glow">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">Order Sample NFC Tabletop Stands</h2>
        <p className="text-xs md:text-sm text-zinc-400 max-w-md mx-auto">
          We ship custom laser-engraved test samples pre-programmed with your restaurant menu within 48 hours. Explore our <Link to="/pricing" className="text-amber-400 underline font-semibold">hardware pricing</Link> or submit a demo request.
        </p>
        <div className="pt-2">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-500/20"
          >
            <span>Request Hardware Sample Kit</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
