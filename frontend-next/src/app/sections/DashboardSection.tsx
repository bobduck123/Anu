'use client';

import { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ImpactPoolCard } from '@/components/civic/ImpactPoolCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCounter } from '@/lib/animations';
import { usePools } from '@/hooks/usePools';
import { ArrowRight, Wallet, Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Total balance counter component with real data
function TotalBalance({ value }: { value: number }) {
  const counterRef = useCounter(value, '$');
  
  return (
    <span ref={counterRef} className="font-mono-data">
      $0
    </span>
  );
}

export function DashboardSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { data: pools, isLoading, error } = usePools({ enabled: isAuthenticated });

  // Calculate total balance from pools
  const totalBalance = useMemo(() => {
    if (!pools) return 0;
    return pools.reduce((sum, pool) => sum + (pool.balance || 0), 0);
  }, [pools]);

  const previewPools = [
    {
      name: 'Relief Pool',
      description: 'Emergency mutual-aid allocations with council review and ledger-backed disbursement.',
    },
    {
      name: 'Sovereignty Pool',
      description: 'Local stewardship capacity for nodes, organisers, and long-horizon governance work.',
    },
    {
      name: 'Infrastructure Pool',
      description: 'Shared platform operations, tooling, and transparent service maintenance.',
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      // Header reveal
      gsap.fromTo(headerRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
            once: true
          }
        }
      );

      // Cards stagger
      const cards = cardsRef.current?.querySelectorAll('.card-civic');
      if (cards) {
        gsap.fromTo(cards,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 80%',
              once: true
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [pools]); // Re-run when pools load

  return (
    <section 
      ref={sectionRef}
      id="dashboard"
      className="section-editorial bg-[rgb(var(--background))]"
      aria-label="Impact Pools Dashboard"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={headerRef} className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-institutional))] mb-3">
                <Activity className="w-4 h-4" />
                Live Dashboard
                {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </span>
              <h2 
                className="text-3xl md:text-4xl font-semibold text-earth-dark mb-3"
                style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
              >
                Impact Pools
              </h2>
              <p className="text-earth-medium max-w-xl">
                Transparent allocation of resources across relief, sovereignty, and 
                infrastructure. Every dollar is tracked on our append-only ledger.
              </p>
              {!isAuthenticated && (
                <p className="text-xs text-[var(--color-earth-medium)] mt-2">
                  Live balances appear after sign-in. Public ledger reporting is being brought online separately.
                </p>
              )}
              {error && (
                <p className="text-xs text-amber-600 mt-2">
                  Live pool balances are unavailable right now.
                </p>
              )}
            </div>

            {/* Total Balance Card */}
            <div className="card-civic-dark min-w-[280px]">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-[rgb(var(--color-sage))]" />
                <span className="text-white/70 text-sm">
                  {isAuthenticated ? 'Total Commons Balance' : 'Live Ledger Status'}
                </span>
              </div>
              {isAuthenticated ? (
                <>
                  <div className="text-4xl font-semibold text-white font-mono-data">
                    <TotalBalance value={totalBalance} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="text-white/50">Visible from your signed-in node context</span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-white/70 leading-relaxed">
                  Public visitors see structure and purpose here. Signed-in members see live balances.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pool Cards Grid */}
        {!isAuthenticated ? (
          <div
            ref={cardsRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {previewPools.map((pool) => (
              <div key={pool.name} className="card-civic">
                <p className="text-xs uppercase tracking-[0.18em] text-earth-medium mb-3">Preview</p>
                <h3 className="text-xl font-semibold text-earth-dark mb-3">{pool.name}</h3>
                <p className="text-earth-medium leading-relaxed">{pool.description}</p>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-civic animate-pulse">
                <div className="h-20 bg-gray-200 rounded mb-4" />
                <div className="h-8 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-civic">
            <p className="text-earth-medium">
              Live pool data is unavailable right now. Use Transparency for the current public status, or try again after signing in.
            </p>
          </div>
        ) : (
          <div 
            ref={cardsRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {pools?.map((pool) => (
              <ImpactPoolCard 
                key={pool.id} 
                name={pool.name}
                description={pool.description || ''}
                balance={pool.balance}
                targetAmount={pool.targetAmount}
                allocationPercent={pool.allocationPercent}
                trend={pool.trend}
                trendValue={pool.trendValue}
                color={pool.color}
                icon={pool.icon}
                sparklineData={pool.sparklineData}
              />
            ))}
            {pools?.length === 0 && (
              <div className="card-civic lg:col-span-3">
                <p className="text-earth-medium">No impact pools are configured for this node yet.</p>
              </div>
            )}
          </div>
        )}

        {/* View All Link */}
        <div className="mt-10 text-center">
          <Link
            href="/pools"
            className="inline-flex items-center gap-2 text-[rgb(var(--color-institutional))] font-medium hover:gap-3 transition-all duration-300 focus-ring rounded-lg px-4 py-2"
          >
            View all pools and ledger entries
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
