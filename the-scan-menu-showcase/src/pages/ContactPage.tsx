import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, Sparkles, Building, Phone, Mail, MapPin, HelpCircle, Package, ArrowRight } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { SEO } from '../components/common/SEO';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    venueName: '',
    email: '',
    phone: '',
    tables: '15-30',
    message: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const contactSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': 'https://thescanmenu.com/contact#page',
        'name': 'Request Custom Hardware Demo & Quote — The Scan Menu',
        'description': 'Contact the Pixora Studios hardware engineering and onboarding team for custom laser-engraved NFC tabletop stands and digital menu setups.',
        'url': 'https://thescanmenu.com/contact',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://thescanmenu.com/contact#breadcrumbs',
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
            'name': 'Contact',
            'item': 'https://thescanmenu.com/contact',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://thescanmenu.com/contact#faq',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'How quickly will I receive my custom hardware sample kit?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Custom sample kits with pre-programmed NTAG216 NFC stands and laser-engraved QR stands are shipped within 48 hours of request and arrive in 3 to 5 business days.',
            },
          },
          {
            '@type': 'Question',
            'name': 'How does onboarding and menu upload work?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Our onboarding team handles initial menu setup for you. Simply email your existing PDF or Excel menu, and we format items, high-res photos, allergen tags, and dietary badges within 24 hours.',
            },
          },
        ],
      },
    ],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playTapSound();
    setSubmitted(true);
  };

  return (
    <div className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-20">
      <SEO
        title="Contact & Hardware Demo — Custom NFC Stands | The Scan Menu"
        description="Request custom laser-engraved NFC & QR restaurant stands. Shipped worldwide within 48 hours with full menu pre-configuration and dedicated onboarding."
        keywords="contact Pixora Studios, restaurant menu hardware quote, custom NFC table stand sample, digital menu demo"
        canonicalPath="/contact"
        schema={contactSchema}
      />

      {/* Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          GET IN TOUCH • PIXORA STUDIOS
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
          Request Hardware Demo &amp; Quote.
        </h1>
        <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
          Speak directly with our hospitality design team. We ship custom laser-engraved NFC test stands pre-programmed with your menu within 48 hours.
        </p>
      </section>

      {/* Form & Studio Info */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
        {/* Contact Information & Hardware Inclusions */}
        <div className="space-y-6 glass-card p-8 rounded-3xl border border-white/10">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">What's in the Sample Kit?</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Experience the physical craft before deploying across your dining room:
            </p>
          </div>

          <div className="space-y-3 text-xs text-zinc-300">
            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-white/5">
              <Package size={18} className="text-amber-400 shrink-0" />
              <span>1x Matte Black Acrylic Dual NFC + QR Tabletop Stand</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-white/5">
              <Package size={18} className="text-amber-400 shrink-0" />
              <span>1x Solid Walnut Laser-Engraved NFC Table Tent</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-white/5">
              <Package size={18} className="text-amber-400 shrink-0" />
              <span>1x Pre-configured Portal Access with Live 86ing Sync</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-4 text-xs">
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Building size={16} />
              </div>
              <div>
                <span className="text-zinc-500 font-mono-accent block">PLATFORM PORTAL</span>
                <span className="font-bold text-white">TheScanMenu.com</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <Mail size={16} />
              </div>
              <div>
                <span className="text-zinc-500 font-mono-accent block">DIRECT EMAIL</span>
                <span className="font-bold text-white">hello@pixora.studios</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <div>
                <span className="text-zinc-500 font-mono-accent block">HARDWARE DISPATCH</span>
                <span className="font-bold text-white">Worldwide Dispatch within 48 Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="glass-card p-8 rounded-3xl border border-white/10">
          {submitted ? (
            <div className="text-center py-12 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white">Sample Request Received!</h2>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Thank you! A Pixora Studios hardware specialist will contact you within 24 hours to confirm your custom branding and dispatch your demo kit.
              </p>
              <div className="pt-4">
                <Link to="/" className="text-xs text-amber-400 underline font-semibold">
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Restaurant / Venue Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luminary Bistro & Bar"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@luminary.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 019-2834"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Dining Table Count</label>
                <select
                  value={formData.tables}
                  onChange={(e) => setFormData({ ...formData, tables: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  <option value="1-15">1 - 15 Tables (Boutique Cafe)</option>
                  <option value="15-30">15 - 30 Tables (Essential QR)</option>
                  <option value="30-75">30 - 75 Tables (NFC Pro Showcase)</option>
                  <option value="75+">75+ Tables (Enterprise Multi-Property)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Message &amp; Custom Branding Notes</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your menu concept, table stand preferences (acrylic, walnut, metal)..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Send size={14} />
                <span>Submit Hardware Sample Request</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Direct AEO FAQ Section */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono-accent text-amber-400 font-bold uppercase tracking-wider">
            ONBOARDING &amp; DISPATCH FAQ
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Questions About Ordering Hardware</h2>
        </div>

        <div className="space-y-4">
          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How quickly will I receive my custom hardware sample kit?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Sample kits are shipped within 48 hours of your request.</strong> They include pre-programmed NTAG216 NFC stands and laser-engraved QR table tents ready for live testing in your dining room.
            </p>
          </article>

          <article className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-amber-400 shrink-0" />
              <span>How does onboarding and menu upload work?</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed pl-6">
              <strong>Our onboarding specialists handle menu digitization for you.</strong> Simply send your existing menu PDF or POS export, and our team configures item descriptions, high-resolution photography, and allergen badges within 24 hours. Learn more on our <Link to="/how-it-works" className="text-amber-400 underline">how it works guide</Link>.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};
