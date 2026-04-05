'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Users, AlertCircle, CheckCircle, Hourglass, Loader2 } from 'lucide-react';
import { useMyReliefRequests } from '@/hooks/useRelief';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type RequestStatus = 'submitted' | 'pending' | 'under_review' | 'approved' | 'approved_under_cap' | 'disbursed' | 'escalated';

interface ReliefRequestCardProps {
  amount: number;
  purpose: string;
  urgency: 'low' | 'medium' | 'high';
  status: RequestStatus;
  queuePosition: number;
  totalInQueue: number;
  submittedAt: string;
  estimatedDays: number;
  anonId: string;
}

const statusConfig = {
  submitted: {
    label: 'Submitted',
    color: 'rgb(var(--color-accent))',
    bgColor: 'rgba(224,177,21,0.1)',
    icon: Hourglass,
    pulse: true,
  },
  pending: {
    label: 'Pending',
    color: 'rgb(var(--color-accent))',
    bgColor: 'rgba(224,177,21,0.1)',
    icon: Hourglass,
    pulse: true,
  },
  under_review: {
    label: 'Under Review',
    color: 'rgb(var(--color-institutional))',
    bgColor: 'rgba(30,2,39,0.1)',
    icon: Users,
    pulse: false,
  },
  approved: {
    label: 'Approved',
    color: 'rgb(var(--color-sage))',
    bgColor: 'rgba(124,65,60,0.1)',
    icon: CheckCircle,
    pulse: false,
  },
  approved_under_cap: {
    label: 'Approved',
    color: 'rgb(var(--color-sage))',
    bgColor: 'rgba(124,65,60,0.1)',
    icon: CheckCircle,
    pulse: false,
  },
  disbursed: {
    label: 'Disbursed',
    color: 'rgb(var(--color-forest))',
    bgColor: 'rgba(124,65,60,0.1)',
    icon: CheckCircle,
    pulse: false,
  },
  escalated: {
    label: 'Escalated',
    color: '#7c413c',
    bgColor: 'rgba(124,65,60,0.1)',
    icon: AlertCircle,
    pulse: true,
  },
};

const urgencyConfig = {
  low: { label: 'Low', color: 'rgb(var(--color-sage))' },
  medium: { label: 'Medium', color: 'rgb(var(--color-accent))' },
  high: { label: 'High', color: '#7c413c' },
};

export function ReliefRequestCard({
  amount,
  purpose,
  urgency,
  status,
  queuePosition,
  totalInQueue,
  submittedAt,
  estimatedDays,
  anonId,
}: ReliefRequestCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const statusInfo = statusConfig[status] ?? {
    label: 'Unknown',
    color: 'rgb(var(--color-earth-dark))',
    bgColor: 'rgba(30,2,39,0.08)',
    icon: AlertCircle,
    pulse: false,
  };
  const urgencyInfo = urgencyConfig[urgency] ?? urgencyConfig.medium;
  const StatusIcon = statusInfo.icon;

  const safeTotal = totalInQueue > 0 ? totalInQueue : 1;
  const safeQueue = queuePosition ?? 0;
  const progressPercent = ((safeTotal - safeQueue) / safeTotal) * 100;

  useEffect(() => {
    if (typeof window === 'undefined' || !progressRef.current) return;

    // Animate progress bar on scroll
    gsap.fromTo(progressRef.current,
      { width: '0%' },
      {
        width: `${progressPercent}%`,
        duration: 1.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 85%',
          once: true
        }
      }
    );
  }, [progressPercent]);

  return (
    <div 
      ref={cardRef}
      className="card-civic group"
    >
      {/* Header with ID and Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono-data text-xs text-earth-medium bg-[#f6d4cb] px-2 py-1 rounded">
            #{anonId}
          </span>
          <span 
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: urgencyInfo.color + '20',
              color: urgencyInfo.color 
            }}
          >
            {urgencyInfo.label} urgency
          </span>
        </div>
        
        <div 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusInfo.pulse ? 'status-pulse' : ''}`}
          style={{ 
            backgroundColor: statusInfo.bgColor,
            color: statusInfo.color 
          }}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{statusInfo.label}</span>
        </div>
      </div>

      {/* Amount and Purpose */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-semibold text-earth-dark font-mono-data">
            ${amount.toLocaleString()}
          </span>
          <span className="text-sm text-earth-medium">requested</span>
        </div>
        <p className="text-earth-dark font-medium">{purpose}</p>
      </div>

      {/* Queue Progress */}
      {status === 'pending' || status === 'under_review' ? (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-earth-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Queue position
            </span>
            <span className="font-medium text-earth-dark">
              {queuePosition} of {totalInQueue}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              ref={progressRef}
              className="progress-bar-fill"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      ) : null}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-4 border-t border-[#f6d4cb] text-sm">
        <div className="flex items-center gap-1 text-earth-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>Submitted {submittedAt}</span>
        </div>
        
        {(status === 'pending' || status === 'under_review') && (
          <div className="flex items-center gap-1 text-earth-medium">
            <span>Est. </span>
            <span className="font-medium text-[rgb(var(--color-institutional))]">
              {estimatedDays} days
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Relief Section Component
export function ReliefSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { data: requests, isLoading, error } = useMyReliefRequests({ enabled: isAuthenticated });
  const previewSteps = [
    {
      title: 'Submit',
      body: 'Members file requests with only the minimum information needed to start support.',
    },
    {
      title: 'Review',
      body: 'Micro-councils and assigned workers review urgency, evidence, and allocation fit.',
    },
    {
      title: 'Disburse',
      body: 'Approved support is released against an auditable decision trail.',
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll('.card-civic');
      if (cards) {
        gsap.fromTo(cards,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: cardsRef.current,
              start: 'top 85%',
              once: true
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [requests]);

  return (
    <section 
      ref={sectionRef}
      className="section-editorial bg-[rgb(var(--muted))]"
      aria-label="Relief Requests"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-accent))] mb-3">
              <AlertCircle className="w-4 h-4" />
              Mutual Aid
              {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            </span>
            <h2 
              className="text-3xl md:text-4xl font-semibold text-earth-dark mb-3"
              style={{ fontFamily: 'var(--font-source-serif), Georgia, serif' }}
            >
              Relief Requests
            </h2>
            <p className="text-earth-medium max-w-xl">
              Anonymous requests for community support. Reviewed by micro-councils 
              with transparent voting and allocation.
            </p>
            {!isAuthenticated && (
              <p className="text-xs text-earth-medium mt-2">
                Relief timelines are private by default. Sign in to view your own requests and updates.
              </p>
            )}
            {error && (
              <p className="text-xs text-[#665700] mt-2">
                Live relief status is unavailable right now.
              </p>
            )}
          </div>

          <Link href={isAuthenticated ? '/relief' : '/auth'} className="btn-pill-accent">
            {isAuthenticated ? 'Submit Request' : 'Sign In to Submit'}
          </Link>
        </div>

        {/* Cards Grid */}
        {!isAuthenticated ? (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previewSteps.map((step) => (
              <div key={step.title} className="card-civic">
                <p className="text-xs uppercase tracking-[0.18em] text-earth-medium mb-3">{step.title}</p>
                <p className="text-earth-dark font-medium mb-2">{step.title} relief support</p>
                <p className="text-earth-medium leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-civic animate-pulse">
                <div className="h-20 bg-[#f6d4cb] rounded mb-4" />
                <div className="h-8 bg-[#f6d4cb] rounded mb-2 w-3/4" />
                <div className="h-4 bg-[#f6d4cb] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-civic">
            <p className="text-earth-medium">
              Your relief requests could not be loaded. Try again after signing in or when the core service is available.
            </p>
          </div>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests?.map((request) => (
              <ReliefRequestCard 
                key={request.id}
                amount={request.amount}
                purpose={request.purpose}
                urgency={request.urgency}
                status={request.status}
                queuePosition={request.queuePosition}
                totalInQueue={request.totalInQueue}
                submittedAt={request.submittedAt}
                estimatedDays={request.estimatedDays}
                anonId={request.anonId}
              />
            ))}
            {requests?.length === 0 && (
              <div className="card-civic lg:col-span-3">
                <p className="text-earth-medium">No relief requests are attached to this account yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-[color:rgba(246,212,203,0.5)] rounded-lg border border-[#f6d4cb]">
          <p className="text-sm text-earth-medium text-center">
            <strong>Privacy protected:</strong> All requests are anonymized. 
            Personal information is encrypted and only visible to assigned case workers.
          </p>
        </div>
      </div>
    </section>
  );
}
