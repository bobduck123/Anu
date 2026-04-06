'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Compass, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, OrganizerStatus } from '@/lib/api';
import { buildAuthHref } from '@/lib/auth/returnTo';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const FALLBACK_STATUS: OrganizerStatus = {
  hasApplied: false,
  isOrganizer: false,
  role: 'participant',
};

export default function OrganizerOnRampPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<OrganizerStatus>(FALLBACK_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const authHref = useMemo(() => buildAuthHref('/organizer/on-ramp'), []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setStatus(FALLBACK_STATUS);
      setLoading(false);
      setError(null);
      setNotice('Working now: sign in to check organizer status and continue the organizer pathway.');
      return;
    }

    let active = true;

    const loadStatus = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const nextStatus = await api.organizer.getStatus();
        if (!active) return;
        setStatus(nextStatus);
      } catch {
        if (!active) return;
        setStatus(FALLBACK_STATUS);
        setError('Live organizer status is unavailable in this environment.');
        setNotice('Working now: organizer on-ramp remains available while status services recover.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated]);

  const headline = status.isOrganizer
    ? 'Organizer access is active'
    : status.hasApplied
      ? 'Organizer application in progress'
      : 'Organizer pathway is open';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Organizer On-ramp
            </h1>
            <HoverBubble title="Why this route" align="right">
              This is the user entry point into organizer work. It keeps next steps clear and low-noise.
            </HoverBubble>
          </div>
          <p className="text-[color:rgba(246,212,203,0.82)]">Start here to apply, track status, or open organizer tools.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading organizer pathway…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Governance index
                  </Link>
                  <Link href="/profile" className="btn-pill btn-pill-outline text-xs">
                    Open profile
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Pathway state</p>
            <p className="text-xl font-semibold text-[var(--color-foreground)]">{headline}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Role</p>
            <p className="text-xl font-semibold text-[var(--color-foreground)]">{status.role || 'participant'}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Session</p>
            <p className="text-xl font-semibold text-[var(--color-foreground)]">{isAuthenticated ? 'Signed in' : 'Guest'}</p>
          </article>
        </div>

        {!isAuthenticated ? (
          <section className="card-civic space-y-3">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Sign in to continue
            </h2>
            <p className="text-sm text-[color:rgba(246,212,203,0.82)]">
              You can browse the organizer pathway now. Sign in to apply or check your organizer status.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={authHref} className="btn-pill btn-pill-primary text-xs">
                Sign in
              </Link>
              <Link href="/community" className="btn-pill btn-pill-outline text-xs">
                Browse community
              </Link>
            </div>
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="card-civic space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Next step
              </h2>
              <HoverBubble title="Fast route" align="left">
                Keep this route short: one clear next action, then optional deeper tools.
              </HoverBubble>
            </div>

            {status.isOrganizer ? (
              <>
                <p className="text-sm text-[color:rgba(246,212,203,0.82)]">
                  You already have organizer access. Open your console or intelligence cockpit.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/organizer" className="btn-pill btn-pill-primary text-xs">
                    Organizer console
                  </Link>
                  <Link href="/organizer/intelligence" className="btn-pill btn-pill-outline text-xs">
                    Intelligence cockpit
                  </Link>
                  <Link href="/organizer/guilds" className="btn-pill btn-pill-outline text-xs">
                    Guilds
                  </Link>
                </div>
              </>
            ) : status.hasApplied ? (
              <>
                <p className="text-sm text-[color:rgba(246,212,203,0.82)]">
                  Your organizer application is under review. Continue normal route work while status updates.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/profile" className="btn-pill btn-pill-primary text-xs">
                    Open organizer tab in profile
                  </Link>
                  <Link href="/events" className="btn-pill btn-pill-outline text-xs">
                    Open events
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[color:rgba(246,212,203,0.82)]">
                  You can apply to become an organizer from your profile pathway.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/profile" className="btn-pill btn-pill-primary text-xs">
                    Open organizer tab in profile
                  </Link>
                  <Link href="/actions" className="btn-pill btn-pill-outline text-xs">
                    Keep contributing
                  </Link>
                </div>
              </>
            )}
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="card-civic space-y-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.04]">
              <Compass className="h-4 w-4 text-[var(--color-foreground)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">1. Learn the route</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.8)]">Understand organizer responsibilities and workflow expectations.</p>
          </article>
          <article className="card-civic space-y-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.04]">
              <Shield className="h-4 w-4 text-[var(--color-foreground)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">2. Apply or check status</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.8)]">Use profile organizer pathway for application or review updates.</p>
          </article>
          <article className="card-civic space-y-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.04]">
              <Sparkles className="h-4 w-4 text-[var(--color-foreground)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">3. Enter console</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.8)]">Move into organizer console and intelligence tools when access is active.</p>
          </article>
        </section>
      </div>
    </div>
  );
}
