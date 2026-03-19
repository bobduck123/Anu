'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCoreApiBase, getImpactApiBase } from '@/lib/runtime';
import { getFalakTenantConfiguration } from '@/lib/maps/sandbox';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type IndicatorState = 'checking' | 'online' | 'degraded' | 'offline';

type Indicator = {
  label: string;
  state: IndicatorState;
  detail: string;
};

const CORE_API_BASE = getCoreApiBase();
const IMPACT_API_BASE = getImpactApiBase();
const REFRESH_INTERVAL_MS = 60_000;

async function probeCoreHealth(): Promise<Indicator> {
  try {
    const response = await fetch(`${CORE_API_BASE}/healthz`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    return {
      label: 'Core API',
      state: response.ok ? 'online' : 'degraded',
      detail: response.ok ? 'Liveness reachable' : `Liveness returned ${response.status}`,
    };
  } catch {
    return {
      label: 'Core API',
      state: 'offline',
      detail: 'Liveness probe unreachable',
    };
  }
}

async function probeImpactHealth(): Promise<Indicator> {
  try {
    const response = await fetch(`${IMPACT_API_BASE}/v1/falak/readiness`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    const payload = await response.json().catch(() => null);
    const readinessStatus =
      typeof payload?.status === 'string'
        ? payload.status
        : response.ok
          ? 'ok'
          : 'degraded';

    return {
      label: 'Impact API',
      state: response.ok && readinessStatus === 'ok' ? 'online' : 'degraded',
      detail:
        response.ok && readinessStatus === 'ok'
          ? `Falak readiness ${readinessStatus}`
          : `Falak readiness ${readinessStatus} (${response.status})`,
    };
  } catch {
    return {
      label: 'Impact API',
      state: 'offline',
      detail: 'Falak readiness unreachable',
    };
  }
}

function chipClasses(state: IndicatorState): string {
  switch (state) {
    case 'online':
      return 'border-emerald-300/70 bg-emerald-100/70 text-emerald-950';
    case 'degraded':
      return 'border-amber-300/80 bg-amber-100/75 text-amber-950';
    case 'offline':
      return 'border-rose-300/80 bg-rose-100/75 text-rose-950';
    case 'checking':
    default:
      return 'border-slate-300/80 bg-white/70 text-slate-700';
  }
}

export function SystemHealthBanner() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [coreIndicator, setCoreIndicator] = useState<Indicator>({
    label: 'Core API',
    state: 'checking',
    detail: 'Checking',
  });
  const [impactIndicator, setImpactIndicator] = useState<Indicator>({
    label: 'Impact API',
    state: 'checking',
    detail: 'Checking',
  });
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const checkServices = useCallback(async () => {
    setCoreIndicator((current) => ({ ...current, state: 'checking', detail: 'Checking' }));
    setImpactIndicator((current) => ({ ...current, state: 'checking', detail: 'Checking' }));

    const [nextCore, nextImpact] = await Promise.all([probeCoreHealth(), probeImpactHealth()]);

    setCoreIndicator(nextCore);
    setImpactIndicator(nextImpact);
    setLastCheckedAt(new Date());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void checkServices();
    }, 0);

    const intervalId = window.setInterval(() => {
      void checkServices();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [checkServices]);

  const authIndicator: Indicator = useMemo(() => {
    if (!isSupabaseConfigured()) {
      return {
        label: 'Auth',
        state: 'degraded',
        detail: 'Supabase config missing',
      };
    }

    if (authLoading) {
      return {
        label: 'Auth',
        state: 'checking',
        detail: 'Checking session',
      };
    }

    return {
      label: 'Auth',
      state: 'online',
      detail: isAuthenticated ? 'Signed in' : 'Guest mode',
    };
  }, [authLoading, isAuthenticated]);

  const tenantIndicator: Indicator = useMemo(() => {
    const tenantConfiguration = getFalakTenantConfiguration();

    if (tenantConfiguration.mode === 'hosted') {
      return {
        label: 'Maps tenant',
        state: 'online',
        detail: 'Hosted tenant configured',
      };
    }

    if (tenantConfiguration.mode === 'sandbox') {
      return {
        label: 'Maps tenant',
        state: 'online',
        detail: 'Sandbox tenant configured',
      };
    }

    return {
      label: 'Maps tenant',
      state: 'degraded',
      detail: 'NEXT_PUBLIC_FALAK_TENANT_ID missing',
    };
  }, []);

  const indicators: Indicator[] = [coreIndicator, impactIndicator, authIndicator, tenantIndicator];

  const issueCount = indicators.filter((indicator) => indicator.state === 'offline' || indicator.state === 'degraded').length;
  const isChecking = indicators.some((indicator) => indicator.state === 'checking');
  const hasIssues = issueCount > 0;

  const statusHeading = hasIssues
    ? 'Fallback mode active'
    : isChecking
      ? 'Verifying live systems'
      : 'Live systems stable';

  const statusDetail = hasIssues
    ? `${issueCount} service signal${issueCount > 1 ? 's' : ''} need attention. Cultural routes remain available.`
    : isChecking
      ? 'Checking core, impact, auth, and tenant readiness.'
      : 'Core, impact, auth, and tenant routing are healthy.';

  const cta = tenantIndicator.state === 'degraded'
    ? {
        href: '/education/maps',
        label: 'Open maps fallback',
      }
    : hasIssues
      ? {
          href: '/docs',
          label: 'Open continuity routes',
        }
      : {
          href: '/transparency',
          label: 'View trust signals',
        };

  return (
    <section
      className={`rounded-2xl border px-3 py-3 text-sm shadow-[0_14px_34px_-24px_rgba(18,30,46,0.85)] backdrop-blur-xl md:px-4 ${
        hasIssues
          ? 'border-amber-200/85 bg-gradient-to-r from-[#fff7e6]/96 via-[#f7efd9]/94 to-[#fff8ec]/92 text-[#2f271a]'
          : 'border-emerald-200/80 bg-gradient-to-r from-[#e8faf0]/92 via-[#f2fff7]/90 to-[#effaf5]/92 text-[#173022]'
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              hasIssues
                ? 'border-amber-300/80 bg-amber-100/80 text-amber-700'
                : 'border-emerald-300/80 bg-emerald-100/80 text-emerald-700'
            }`}
          >
            {hasIssues ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{statusHeading}</p>
            <p className="text-sm font-medium leading-snug md:text-[15px]">{statusDetail}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void checkServices()}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-current/30 bg-white/45 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/70"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>

          <Link
            href={cta.href}
            className="inline-flex min-h-10 items-center rounded-full border border-current/30 bg-white/45 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/70"
          >
            {cta.label}
          </Link>

          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-current/30 bg-white/45 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/70"
            aria-expanded={detailsOpen}
            aria-controls="system-health-details"
          >
            {detailsOpen ? 'Hide details' : 'Health details'}
            {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {detailsOpen ? (
        <div id="system-health-details" className="mt-3 border-t border-current/15 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {indicators.map((indicator) => (
              <span
                key={indicator.label}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${chipClasses(indicator.state)}`}
              >
                <span className="font-semibold">{indicator.label}</span>
                <span>{indicator.detail}</span>
              </span>
            ))}
          </div>

          {lastCheckedAt ? (
            <p className="mt-2 text-xs opacity-80">Last checked {lastCheckedAt.toLocaleTimeString()}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
