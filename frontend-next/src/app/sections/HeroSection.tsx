'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStats } from '@/hooks/useStats';
import { ArrowDown, Heart, Shield } from 'lucide-react';
import Link from 'next/link';
import { brand } from '@/lib/brand';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  
  // Fetch real stats
  const { data: stats, isLoading: statsLoading } = useStats();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Word-by-word reveal for heading
      const words = headingRef.current?.querySelectorAll('.word');
      if (words) {
        gsap.fromTo(words,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.8,
            ease: 'power3.out',
            delay: 0.5
          }
        );
      }

      // Subtext fade in
      gsap.fromTo(subtextRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
          delay: 1.2
        }
      );

      // CTA buttons
      gsap.fromTo(ctaRef.current?.children || [],
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          duration: 0.6,
          ease: 'power2.out',
          delay: 1.5
        }
      );

      // Stats stagger
      gsap.fromTo(statsRef.current?.children || [],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power2.out',
          delay: 1.8
        }
      );

      // Parallax background
      gsap.to('.hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });

      // Content fade on scroll
      gsap.to('.hero-content', {
        opacity: 0,
        y: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'center top',
          end: 'bottom top',
          scrub: true
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const scrollToContent = () => {
    const nextSection = document.getElementById('dashboard');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* Background with parallax */}
      <div className="hero-bg absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(20, 28, 36, 0.78), rgba(20, 28, 36, 0.54)), radial-gradient(circle at top, rgba(243, 199, 123, 0.28), transparent 22%), url('data:image/svg+xml,${encodeURIComponent(`
              <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="rgba(243,199,123,0.28)"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)"/>
              </svg>
            `)}')`,
            backgroundColor: 'var(--color-earth-dark)'
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-earth-dark)]" />
      </div>

      {/* Content */}
      <div className="hero-content relative z-10 max-w-6xl mx-auto px-4 md:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-beacon)] animate-pulse" />
          <span className="text-white/80 text-sm font-medium">Beaconing mutual aid across 12 communities</span>
        </div>

        {/* Main Heading - Word by word reveal */}
        <h1 
          ref={headingRef}
          className="text-4xl md:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-tight"
          style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
        >
          {'Beacon-led infrastructure'.split(' ').map((word, i) => (
            <span key={i} className="word inline-block mr-[0.3em]">
              {word}
            </span>
          ))}
          <br />
          {'for mutual aid &'.split(' ').map((word, i) => (
            <span key={i} className="word inline-block mr-[0.3em]">
              {word}
            </span>
          ))}
          <br />
          <span className="word inline-block text-[var(--color-beacon)]">
            community governance
          </span>
        </h1>

        {/* Subtext */}
        <p 
          ref={subtextRef}
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {brand.beaconLine}
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/memberships"
            className="btn-pill bg-[var(--color-sage)] text-white hover:bg-[var(--color-forest)] w-full sm:w-auto"
          >
            <Heart className="w-4 h-4 mr-2" />
            Join Manara
          </Link>
          <Link
            href="/transparency"
            className="btn-pill bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
          >
            <Shield className="w-4 h-4 mr-2" />
            View Transparency
          </Link>
        </div>

        {/* Stats */}
        <div 
          ref={statsRef}
          className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '$2.4M' : `$${((stats?.totalDistributed || 2480000) / 1000000).toFixed(1)}M`}
            </div>
            <div className="text-white/50 text-sm">Distributed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '1,247' : (stats?.totalMembers || 1247).toLocaleString()}
            </div>
            <div className="text-white/50 text-sm">Members</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '89%' : `${Math.round(((stats?.totalDistributed || 2480000) - (stats?.totalDistributed || 2480000) * (stats?.adminRatio || 0.08)) / (stats?.totalDistributed || 2480000) * 100)}%`}
            </div>
            <div className="text-white/50 text-sm">To Relief</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white transition-colors focus-ring rounded-full p-2"
        aria-label="Scroll to content"
      >
        <ArrowDown className="w-6 h-6 animate-bounce" />
      </button>
    </section>
  );
}
