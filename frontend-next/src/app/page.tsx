'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';

// Sections
import { HeroSection } from './sections/HeroSection';
import { DashboardSection } from './sections/DashboardSection';
import { ReliefSection } from '@/components/civic/ReliefRequestCard';
import { CommunitySection } from './sections/CommunitySection';
import { EditorialSection } from './sections/EditorialSection';
import { brand } from '@/lib/brand';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HomePage() {
  useEffect(() => {
    // Refresh ScrollTrigger after all content loads
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
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
      
      {/* Simple Footer */}
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
