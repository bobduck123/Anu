'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { brand } from '@/lib/brand';

// Dynamically import GSAP-heavy sections to reduce initial bundle
// These sections use GSAP animations which add ~60KB to the bundle
const HeroSection = dynamic(
  () => import('./sections/HeroSection').then((mod) => mod.HeroSection),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4 animate-pulse">
          <div className="h-12 w-64 mx-auto bg-muted rounded-lg" />
          <div className="h-6 w-96 max-w-full mx-auto bg-muted/60 rounded" />
        </div>
      </div>
    ),
  }
);

const DashboardSection = dynamic(
  () => import('./sections/DashboardSection').then((mod) => mod.DashboardSection),
  {
    ssr: false,
    loading: () => (
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-8" />
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

const ReliefSection = dynamic(
  () => import('@/components/civic/ReliefRequestCard').then((mod) => mod.ReliefSection),
  {
    ssr: false,
    loading: () => (
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-8" />
          <div className="h-64 bg-muted/30 animate-pulse rounded-2xl" />
        </div>
      </section>
    ),
  }
);

const CommunitySection = dynamic(
  () => import('./sections/CommunitySection').then((mod) => mod.CommunitySection),
  {
    ssr: false,
    loading: () => (
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 w-32 flex-shrink-0 bg-muted/50 animate-pulse rounded-full" />
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

const EditorialSection = dynamic(
  () => import('./sections/EditorialSection').then((mod) => mod.EditorialSection),
  {
    ssr: false,
    loading: () => (
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-muted/30 animate-pulse rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-muted/60 animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-muted/60 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </section>
    ),
  }
);

export default function HomePage() {
  useEffect(() => {
    // Dynamically load GSAP and register ScrollTrigger only when needed
    const loadGsap = async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      
      gsapModule.gsap.registerPlugin(scrollTriggerModule.ScrollTrigger);
      
      // Refresh ScrollTrigger after all content loads
      const timer = setTimeout(() => {
        scrollTriggerModule.ScrollTrigger.refresh();
      }, 100);

      return () => clearTimeout(timer);
    };

    loadGsap();
  }, []);

  return (
    <div className="relative">
      {/* Hero - Full viewport intro with parallax */}
      <HeroSection />
      
      {/* Dashboard - Impact Pools with animated counters */}
      <DashboardSection />
      
      {/* Relief - Mutual aid requests */}
      <ReliefSection />
      
      {/* Community - Member tiles with marquee */}
      <CommunitySection />
      
      {/* Editorial - Asymmetric layouts with parallax images */}
      <EditorialSection />
      
      {/* Simple Footer - Keep in main bundle as it's lightweight */}
      <footer className="bg-[var(--color-earth-dark)] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <h3 
                className="text-2xl font-semibold mb-4"
                style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
              >
                {brand.name}
              </h3>
              <p className="text-white/60 max-w-sm leading-relaxed">
                {brand.footerLine} Built by the community, for the community.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="/impact" className="hover:text-white transition-colors">Impact</Link></li>
                <li><Link href="/pools" className="hover:text-white transition-colors">Pools</Link></li>
                <li><Link href="/relief" className="hover:text-white transition-colors">Relief</Link></li>
                <li><Link href="/transparency" className="hover:text-white transition-colors">Transparency</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="/memberships" className="hover:text-white transition-colors">Join</Link></li>
                <li><Link href="/governance" className="hover:text-white transition-colors">Governance</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              (c) 2026 {brand.longName}. Open source under MIT license.
            </p>
            <div className="flex items-center gap-6 text-white/40 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/code-of-conduct" className="hover:text-white transition-colors">Code of Conduct</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
