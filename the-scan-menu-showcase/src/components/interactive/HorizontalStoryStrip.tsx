import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { UserCheck, QrCode, Smartphone, ShoppingBag, Utensils, CheckCircle, CreditCard, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const HorizontalStoryStrip: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const storySteps = [
    {
      num: '01',
      title: 'Customer Arrives',
      desc: 'Guest takes a seat at their table in your restaurant.',
      icon: UserCheck,
    },
    {
      num: '02',
      title: 'Sees NFC / QR Stand',
      desc: 'Sleek tabletop stand attracts guest attention instantly.',
      icon: QrCode,
    },
    {
      num: '03',
      title: 'Taps or Scans Phone',
      desc: 'No app download needed. Works directly in browser.',
      icon: Smartphone,
    },
    {
      num: '04',
      title: 'Menu Opens Instantly',
      desc: 'Rich imagery, filters, allergens, and live prices unfurl in <0.4s.',
      icon: ShoppingBag,
    },
    {
      num: '05',
      title: 'Guest Places Order',
      desc: 'Customizes items and sends order straight to kitchen.',
      icon: Utensils,
    },
    {
      num: '06',
      title: 'Kitchen Ticket Prints',
      desc: 'Instant KDS ticket generation with table number & notes.',
      icon: CheckCircle,
    },
    {
      num: '07',
      title: 'Seamless Payment',
      desc: 'Guest pays via UPI, card, or wallet directly on phone.',
      icon: CreditCard,
    },
    {
      num: '08',
      title: '5-Star Google Review',
      desc: 'Automated review prompt boosts venue rating effortlessly.',
      icon: Star,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!sectionRef.current || !containerRef.current) return;

      const totalWidth = containerRef.current.scrollWidth - window.innerWidth;

      gsap.to(containerRef.current, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          end: () => `+=${totalWidth}`,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full bg-[#08080b] py-20 overflow-hidden border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono-accent text-amber-400 font-bold tracking-wider uppercase">
            PINNED HORIZONTAL EXPERIENCE
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-1">
            The 8-Beat Guest Journey
          </h2>
        </div>
        <p className="text-sm text-zinc-400 max-w-sm">
          Scroll down to scrub through the continuous lived moment from table arrival to 5-star review.
        </p>
      </div>

      {/* Horizontal Scrub Container */}
      <div ref={containerRef} className="flex gap-6 px-4 md:px-12 w-max">
        {storySteps.map((step, idx) => (
          <div
            key={idx}
            className="w-[300px] md:w-[360px] h-[400px] bg-zinc-900/80 border border-white/10 rounded-3xl p-8 flex flex-col justify-between glass-card hover:border-amber-400/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono-accent font-extrabold text-amber-400">
                {step.num}
              </span>
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                <step.icon size={24} />
              </div>
            </div>

            <div className="space-y-3 my-auto">
              <div className="w-full h-32 bg-zinc-950 rounded-2xl border border-white/5 flex items-center justify-center p-4">
                <step.icon size={48} className="text-amber-400/40" />
              </div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
            </div>

            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${((idx + 1) / storySteps.length) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
