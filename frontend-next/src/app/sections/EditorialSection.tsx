'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Quote } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { brand } from '@/lib/brand';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Parallax Image Component
function ParallaxImage({ 
  src, 
  alt,
  className = ''
}: { 
  src: string; 
  alt: string;
  className?: string;
}) {
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !imageRef.current) return;

    const element = imageRef.current;
    gsap.to(element, {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === element) st.kill();
      });
    };
  }, []);

  return (
    <div ref={imageRef} className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        unoptimized
        className="object-cover scale-110"
      />
    </div>
  );
}

export function EditorialSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Reveal animations for editorial blocks
      gsap.utils.toArray<HTMLElement>('.editorial-block').forEach((block) => {
        const text = block.querySelector('.editorial-text');
        const image = block.querySelector('.editorial-image');

        gsap.fromTo(text,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 80%',
              once: true
            }
          }
        );

        gsap.fromTo(image,
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 80%',
              once: true
            }
          }
        );
      });

      // Pull quote animation
      gsap.fromTo('.pull-quote-block',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.pull-quote-block',
            start: 'top 85%',
            once: true
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="section-editorial bg-[var(--color-background)]"
      aria-label="About"
    >
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Block 1: Text Left, Image Right */}
        <div className="editorial-block grid-asymmetric items-center">
          <div className="editorial-text space-y-6">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-forest)]">
              Our Approach
            </span>
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-earth-dark leading-tight"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              Beacon light on every transaction
            </h2>
            <p className="text-earth-medium text-lg leading-relaxed">
              Every contribution, allocation, and disbursement is recorded on our append-only 
              ledger. No black boxes. No hidden fees. Just clear, accountable stewardship of 
              community resources.
            </p>
            <p className="text-earth-medium leading-relaxed">
              Manara carries decisions in the open, with shared local stewardship and a signal path
              that keeps resources visible from contribution through disbursement.
            </p>
            <Link
              href="/transparency"
              className="inline-flex items-center gap-2 text-[var(--color-institutional)] font-medium hover:gap-3 transition-all duration-300 pt-4"
            >
              Explore the ledger
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="editorial-image relative">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden">
              <ParallaxImage 
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80"
                alt="Community meeting with transparent discussion"
                className="w-full h-full"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-5 shadow-xl border border-gray-100">
              <div className="text-3xl font-semibold text-[var(--color-sage)] font-mono-data">
                99.2%
              </div>
              <div className="text-sm text-earth-medium">Audit accuracy</div>
            </div>
          </div>
        </div>

        {/* Pull Quote */}
        <div className="pull-quote-block max-w-4xl mx-auto text-center py-12">
          <Quote className="w-12 h-12 text-[var(--color-sage)] mx-auto mb-6 opacity-50" />
          <blockquote 
            className="text-2xl md:text-3xl lg:text-4xl font-medium text-earth-dark leading-relaxed"
            style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
          >
            &ldquo;The commons is not just about sharing resources—it&apos;s about 
            building the trust infrastructure that makes sharing possible.&rdquo;
          </blockquote>
          <cite className="block mt-6 text-earth-medium not-italic">
            — Elinor Ostrom, adapted
          </cite>
        </div>

        {/* Block 2: Image Left, Text Right (Reversed) */}
        <div className="editorial-block grid-asymmetric-reverse items-center">
          <div className="editorial-image relative order-2 md:order-1">
            <div className="aspect-square rounded-full overflow-hidden max-w-md mx-auto">
              <ParallaxImage 
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
                alt="Community member in circular frame"
                className="w-full h-full"
              />
            </div>
            {/* Decorative ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-sage)] opacity-30 scale-110" />
          </div>
          
          <div className="editorial-text space-y-6 order-1 md:order-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
              Sovereignty
            </span>
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-earth-dark leading-tight"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              Community-controlled, always
            </h2>
            <p className="text-earth-medium text-lg leading-relaxed">
              Local nodes maintain autonomy over their funds and decisions. The platform 
              provides infrastructure—communities provide the wisdom.
            </p>
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-sage)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-earth-dark">Local Decision Making</h4>
                  <p className="text-earth-medium text-sm">Each node sets its own priorities and allocation policies.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-sage)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-semibold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-earth-dark">Privacy by Design</h4>
                  <p className="text-earth-medium text-sm">Member data is encrypted and never sold or shared without consent.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-sage)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-earth-dark">Open Source</h4>
                  <p className="text-earth-medium text-sm">Core platform code is open for audit and community improvement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Block 3: Full Width Feature */}
        <div className="editorial-block">
          <div className="relative rounded-3xl overflow-hidden bg-[var(--color-earth-dark)]">
            <div className="absolute inset-0 opacity-30">
              <ParallaxImage 
                src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=1200&q=80"
                alt="Community gathering"
                className="w-full h-full"
              />
            </div>
            <div className="relative z-10 p-8 md:p-16 lg:p-20">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-sage)] mb-4">
                  Join Us
                </span>
                <h2 
                  className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6"
                  style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
                >
                  Ready to be part of the commons?
                </h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">
                  Whether you want to contribute, request support, or help govern—
              there&apos;s a place for you in {brand.name}.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/memberships"
                    className="btn-pill bg-[var(--color-sage)] text-white hover:bg-[var(--color-forest)] text-center"
                  >
                    Become a Member
                  </Link>
                  <Link
                    href="/relief"
                    className="btn-pill bg-white/10 text-white hover:bg-white/20 text-center"
                  >
                    Request Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
