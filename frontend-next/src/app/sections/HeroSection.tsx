'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
            backgroundImage: `linear-gradient(to bottom, rgba(30,2,39,0.78), rgba(30,2,39,0.54)), radial-gradient(circle at top, rgba(246,212,203,0.28), transparent 22%), url('data:image/svg+xml,${encodeURIComponent(`
              <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="rgba(246,212,203,0.28)"/>
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:rgba(246,212,203,0.1)] backdrop-blur-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--color-beacon)] animate-pulse" />
          <span className="text-[color:rgba(246,212,203,0.8)] text-sm font-medium">Beaconing mutual aid with accountable local stewardship</span>
        </div>

        {/* Main Heading - Word by word reveal */}
        <h1 
          ref={headingRef}
          className="text-4xl md:text-6xl lg:text-7xl font-semibold text-[var(--color-foreground)] mb-6 leading-tight"
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
          className="text-lg md:text-xl text-[color:rgba(246,212,203,0.7)] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {brand.beaconLine}
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/memberships"
            className="btn-pill bg-[var(--color-sage)] text-[var(--color-foreground)] hover:bg-[var(--color-forest)] w-full sm:w-auto"
          >
            <Heart className="w-4 h-4 mr-2" />
            Join Manara
          </Link>
          <Link
            href="/transparency"
            className="btn-pill bg-[color:rgba(246,212,203,0.1)] text-[var(--color-foreground)] hover:bg-[color:rgba(246,212,203,0.2)] backdrop-blur-sm w-full sm:w-auto"
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
            <div className="text-2xl md:text-3xl font-semibold text-[var(--color-foreground)] mb-1">Auditable</div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">Append-only ledgers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold text-[var(--color-foreground)] mb-1">Local</div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">Node-led stewardship</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold text-[var(--color-foreground)] mb-1">Private</div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">Consent-based access</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[color:rgba(246,212,203,0.5)] hover:text-[var(--color-foreground)] transition-colors focus-ring rounded-full p-2"
        aria-label="Scroll to content"
      >
        <ArrowDown className="w-6 h-6 animate-bounce" />
      </button>
    </section>
  );
}
