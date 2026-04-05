'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/contexts/AuthContext';
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
  'Transparent Ledger',
  'Community Governance',
  'Consent-Based Profiles',
  'Local Stewardship',
];

export function CommunitySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { data: members, isLoading: membersLoading, error: membersError } = useMembers(8, { enabled: isAuthenticated });
  const { data: stats, isLoading: statsLoading, error: statsError } = useMemberStats({ enabled: isAuthenticated });
  const previewRoles = [
    { title: 'Participants', body: 'People contributing time, care, and local knowledge.' },
    { title: 'Organisers', body: 'Operators coordinating requests, pools, and follow-through.' },
    { title: 'Validators', body: 'Members reviewing evidence, governance, and allocations.' },
    { title: 'Case Workers', body: 'Assigned support roles with limited, consent-based access.' },
  ];

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
      className="py-20 bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden"
      aria-label="Community"
    >
      {/* Marquee Banner */}
      <div 
        ref={marqueeRef}
        className="marquee-container py-6 border-y border-[color:rgba(246,212,203,0.1)] mb-16"
      >
        <div className="marquee-content">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span 
              key={i} 
              className="inline-flex items-center mx-8 text-lg font-medium text-[color:rgba(246,212,203,0.6)] whitespace-nowrap"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--color-sage)] mr-4" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="community-header flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-sage)] mb-3">
              <Users className="w-4 h-4" />
              Our Community
              {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </span>
            <h2 
              className="text-3xl md:text-4xl font-semibold text-[var(--color-foreground)] mb-3"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              Members & Stewards
            </h2>
            <p className="text-[color:rgba(246,212,203,0.6)] max-w-xl">
              A diverse network of validators, organizers, and participants building 
              resilient communities together.
            </p>
            {!isAuthenticated && (
              <p className="text-xs text-[color:rgba(246,212,203,0.5)] mt-2">
                Public roster data stays private by default. Signed-in members see node-specific profiles.
              </p>
            )}
            {membersError && (
              <p className="text-xs text-[#e0b115] mt-2">
                Live member data is unavailable right now.
              </p>
            )}
          </div>

          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-[var(--color-foreground)] font-medium hover:text-[var(--color-sage)] transition-colors focus-ring rounded-lg px-4 py-2"
          >
            View all members
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Member Grid - 2 rows of 4 */}
        {!isAuthenticated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {previewRoles.map((role) => (
              <div key={role.title} className="bg-[color:rgba(246,212,203,0.1)] rounded-xl p-5 border border-[color:rgba(246,212,203,0.1)]">
                <p className="text-sm font-semibold text-[var(--color-foreground)] mb-2">{role.title}</p>
                <p className="text-sm text-[color:rgba(246,212,203,0.6)] leading-relaxed">{role.body}</p>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-[color:rgba(246,212,203,0.1)] rounded-xl p-5 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-[color:rgba(246,212,203,0.2)] mb-4" />
                <div className="h-4 bg-[color:rgba(246,212,203,0.2)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[color:rgba(246,212,203,0.2)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : membersError ? (
          <div className="bg-[color:rgba(246,212,203,0.1)] rounded-xl p-5 border border-[color:rgba(246,212,203,0.1)]">
            <p className="text-sm text-[color:rgba(246,212,203,0.7)]">
              Member profiles could not be loaded. Try again after signing in or when the core service is stable.
            </p>
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
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-t border-[color:rgba(246,212,203,0.1)]">
          <div className="text-center">
            <div className="text-3xl font-semibold text-[var(--color-foreground)] mb-1 font-mono-data">
              {isAuthenticated && !statsLoading && !statsError ? stats?.total.toLocaleString() : 'Private'}
            </div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">{isAuthenticated ? 'Total Members' : 'Member roster'}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-[var(--color-foreground)] mb-1 font-mono-data">
              {isAuthenticated && !statsLoading && !statsError ? stats?.validators.toLocaleString() : 'Scoped'}
            </div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">{isAuthenticated ? 'Validators' : 'Role-based access'}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-[var(--color-foreground)] mb-1 font-mono-data">
              {isAuthenticated && !statsLoading && !statsError ? stats?.organizers.toLocaleString() : 'Local'}
            </div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">{isAuthenticated ? 'Organizers' : 'Node stewardship'}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-[var(--color-foreground)] mb-1 font-mono-data">
              {isAuthenticated && !statsLoading && !statsError ? stats?.activeNodes.toLocaleString() : 'Consent'}
            </div>
            <div className="text-[color:rgba(246,212,203,0.5)] text-sm">{isAuthenticated ? 'Active Nodes' : 'Data sharing model'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
