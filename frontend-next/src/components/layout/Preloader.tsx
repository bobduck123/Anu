'use client';

import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import ManaraMark from '@/components/branding/ManaraMark';
import { brand } from '@/lib/brand';

export function Preloader() {
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [isLoading, setIsLoading] = useState(!prefersReducedMotion);

  useEffect(() => {
    if (!isLoading) {
      document.body.classList.add('site-ready');
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsLoading(false);
        document.body.classList.add('site-ready');
      }
    });

    // Entrance animation
    tl.from('.preloader-logo', {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: 'power3.out'
    })
    .from('.preloader-text .word', {
      opacity: 0,
      y: 20,
      stagger: 0.07,
      duration: 0.6,
      ease: 'power2.out'
    }, '-=0.3')
    .from('.preloader-subtext', {
      opacity: 0,
      y: 10,
      duration: 0.5,
      ease: 'power2.out'
    }, '-=0.2')
    // Hold for readability
    .to({}, { duration: 0.8 })
    // Exit animation
    .to('.preloader-inner', {
      opacity: 0,
      y: -20,
      duration: 0.6,
      ease: 'power2.inOut'
    })
    .to('.preloader', {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut'
    }, '-=0.2');

    return () => {
      tl.kill();
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div 
      className="preloader"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${brand.name}`}
    >
      <div className="preloader-inner flex flex-col items-center">
        {/* Logo Icon */}
        <div className="preloader-logo mb-6">
          <ManaraMark className="h-20 w-20" />
        </div>
        
        {/* Brand Name */}
        <h1 
          className="preloader-text text-3xl md:text-4xl font-semibold text-[var(--color-foreground)] mb-2"
          style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
        >
          {brand.name.split(' ').map((word, i) => (
            <span key={i} className="word inline-block mr-3">
              {word}
            </span>
          ))}
        </h1>
        
        {/* Tagline */}
        <p className="preloader-subtext text-[color:rgba(246,212,203,0.7)] text-sm tracking-[0.32em] uppercase">
          Beacon Civic Commons
        </p>

        {/* Progress indicator */}
        <div className="mt-8 w-32 h-0.5 bg-[color:rgba(246,212,203,0.2)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-sage)] rounded-full"
            style={{
              animation: 'loading-bar 2s ease-in-out infinite'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
