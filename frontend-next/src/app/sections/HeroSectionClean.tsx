'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  stats?: {
    members: number;
    distributed: string;
    communities: number;
  };
}

export function HeroSectionClean({
  title = "Building resilient communities together",
  subtitle = "Transparent resource allocation, mutual aid, and community governance for the common good.",
  stats = {
    members: 1247,
    distributed: "$2.4M",
    communities: 12,
  },
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Simple fade-in animation
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 0.2,
        }
      );

      // Stats fade in on scroll
      gsap.utils.toArray<HTMLElement>('.stat-item').forEach((stat, i) => {
        gsap.fromTo(
          stat,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: i * 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: stat,
              start: 'top 90%',
              once: true,
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center px-6 py-24"
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-light/30 to-surface" />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative max-w-3xl mx-auto text-center"
      >
        {/* Eyebrow */}
        <p className="label text-primary mb-6">High-trust civic infrastructure</p>

        {/* Main headline */}
        <h1 className="display-large text-text mb-6">{title}</h1>

        {/* Subhead */}
        <p className="body-large text-text-secondary mb-10 max-w-xl mx-auto">
          {subtitle}
        </p>

        {/* Single CTA */}
        <Link
          href="/impact"
          className="btn-clean btn-clean-primary text-base px-6 py-3"
        >
          Explore the Commons
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Stats - subtle, bottom */}
        <div className="mt-24 pt-10 border-t border-border">
          <div className="flex items-center justify-center gap-8 md:gap-16">
            <StatItem label="Members" value={stats.members.toLocaleString()} />
            <StatItem label="Distributed" value={stats.distributed} />
            <StatItem label="Communities" value={stats.communities.toString()} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-item text-center">
      <span className="metric text-text block">{value}</span>
      <span className="label text-text-muted mt-1">{label}</span>
    </div>
  );
}
