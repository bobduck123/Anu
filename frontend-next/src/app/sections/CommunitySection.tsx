'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MemberTile } from '@/components/civic/MemberTile';
import { useMembers, useMemberStats } from '@/hooks/useMembers';
import { Users, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Marquee content
const marqueeItems = [
  'Sydney Node',
  'Melbourne Node',
  'Brisbane Node',
  'Perth Node',
  'Adelaide Node',
  '1,247 Members',
  '$2.4M Distributed',
  '89% To Relief',
  'Transparent Ledger',
  'Community Governance',
];

export function CommunitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  
  // Fetch members and stats with React Query
  const { data: members, isLoading: membersLoading, error: membersError } = useMembers(8);
  const { data: stats, isLoading: statsLoading } = useMemberStats();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Marquee animation
      if (marqueeRef.current) {
        const content = marqueeRef.current.querySelector('.marquee-content');
        if (content) {
          gsap.to(content, {
            xPercent: -50,
            duration: 30,
            ease: 'none',
            repeat: -1,
          });
        }
      }

      // Section reveal
      gsap.fromTo('.community-header',
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.community-header',
            start: 'top 85%',
            once: true
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [members]);

  const isLoading = membersLoading || statsLoading;

  return (
    <section 
      ref={sectionRef}
      className="py-20 bg-[rgb(var(--color-institutional))] text-white overflow-hidden"
      aria-label="Community"
    >
      {/* Marquee Banner */}
      <div 
        ref={marqueeRef}
        className="marquee-container py-6 border-y border-white/10 mb-16"
      >
        <div className="marquee-content">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span 
              key={i} 
              className="inline-flex items-center mx-8 text-lg font-medium text-white/60 whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[rgb(var(--color-sage))] mr-4" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="community-header flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-sage))] mb-3">
              <Users className="w-4 h-4" />
              Our Community
              {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </span>
            <h2 
              className="text-3xl md:text-4xl font-semibold text-white mb-3"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              Members & Stewards
            </h2>
            <p className="text-white/60 max-w-xl">
              A diverse network of validators, organizers, and participants building 
              resilient communities together.
            </p>
            {membersError && (
              <p className="text-xs text-amber-300 mt-2">
                Using offline data (API unavailable)
              </p>
            )}
          </div>

          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-white font-medium hover:text-[rgb(var(--color-sage))] transition-colors focus-ring rounded-lg px-4 py-2"
          >
            View all members
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Member Grid - 2 rows of 4 */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white/10 rounded-xl p-5 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-white/20 mb-4" />
                <div className="h-4 bg-white/20 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/20 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {members?.map((member) => (
              <MemberTile 
                key={member.pseudonym} 
                {...member} 
              />
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-t border-white/10">
          <div className="text-center">
            <div className="text-3xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '-' : (stats?.total || 1247).toLocaleString()}
            </div>
            <div className="text-white/50 text-sm">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '-' : (stats?.validators || 156).toLocaleString()}
            </div>
            <div className="text-white/50 text-sm">Validators</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '-' : (stats?.organizers || 42).toLocaleString()}
            </div>
            <div className="text-white/50 text-sm">Organizers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-white mb-1 font-mono-data">
              {statsLoading ? '-' : (stats?.activeNodes || 12).toLocaleString()}
            </div>
            <div className="text-white/50 text-sm">Active Nodes</div>
          </div>
        </div>
      </div>
    </section>
  );
}
