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
      return 'border-emerald-300/45 bg-emerald-300/16 text-emerald-100';
    case 'degraded':
      return 'border-amber-300/45 bg-amber-300/16 text-amber-100';
    case 'offline':
      return 'border-rose-300/45 bg-rose-300/16 text-rose-100';
    case 'checking':
    default:
      return 'border-white/20 bg-white/10 text-slate-100';
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

  const criticalIndicators = indicators.filter(
    (indicator) =>
      (indicator.label === 'Core API' || indicator.label === 'Impact API') &&
      (indicator.state === 'offline' || indicator.state === 'degraded'),
  );

  const issueCount = criticalIndicators.length;
  const hasErrors = issueCount > 0;

  const statusHeading = 'Fallback mode active';

  const statusDetail = `${issueCount} service signal${issueCount > 1 ? 's' : ''} need attention. Cultural routes remain available.`;

  if (!hasErrors) {
    return null;
  }

  const cta = impactIndicator.state !== 'online'
    ? {
        href: '/education/maps',
        label: 'Open maps fallback',
      }
    : {
        href: '/docs',
        label: 'Open continuity routes',
      };

  return (
    <section
      className={`manara-grid-hero rounded-2xl border px-3 py-3 text-sm shadow-[0_16px_36px_-24px_rgba(18,30,46,0.88)] backdrop-blur-xl md:px-4 ${
        hasErrors
          ? 'border-amber-200/46 bg-[linear-gradient(118deg,rgba(52,42,19,0.74),rgba(36,28,15,0.68))] text-amber-50'
          : 'border-emerald-200/44 bg-[linear-gradient(118deg,rgba(16,50,33,0.7),rgba(14,40,29,0.64))] text-emerald-50'
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
              hasErrors
                ? 'border-amber-300/55 bg-amber-300/20 text-amber-100'
                : 'border-emerald-300/55 bg-emerald-300/20 text-emerald-100'
            }`}
          >
            {hasErrors ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
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
            className="manara-glass-chip inline-flex min-h-10 items-center gap-1 border border-current/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-current hover:bg-white/18"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>

          <Link
            href={cta.href}
            className="manara-glass-chip inline-flex min-h-10 items-center border border-current/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-current hover:bg-white/18"
          >
            {cta.label}
          </Link>

          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="manara-glass-chip inline-flex min-h-10 items-center gap-1 border border-current/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-current hover:bg-white/18"
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
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium ${chipClasses(indicator.state)}`}
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
