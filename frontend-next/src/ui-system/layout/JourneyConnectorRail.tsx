'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import type { JourneyConnectorRailPayload } from '@/ui-system/anu/journeyConnectorRegistry';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

interface JourneyConnectorRailProps {
  sourceRoute: string | null;
  onNavigate?: () => void;
}

export function JourneyConnectorRail({ sourceRoute, onNavigate }: JourneyConnectorRailProps) {
  const [payload, setPayload] = useState<JourneyConnectorRailPayload | null>(null);
  const tenant = useTenant();

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (sourceRoute) {
      params.set('source', sourceRoute);
    }
    if (tenant.slug) {
      params.set('node', tenant.slug);
    }
    const query = params.toString() ? `?${params.toString()}` : '';

    fetch(`/api/sdk/journey-connectors${query}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        const body = (await response.json()) as { ok: boolean; data: JourneyConnectorRailPayload };
        return body.ok ? body.data : null;
      })
      .then((nextPayload) => {
        if (nextPayload) {
          setPayload(nextPayload);
        }
      })
      .catch(() => {
        // Keep this panel silent on fetch failures; pathway guidance still provides navigation.
      });

    return () => controller.abort();
  }, [sourceRoute, tenant.slug]);

  const activeConnectors = useMemo(() => payload?.activeConnectors ?? [], [payload]);

  if (!payload) {
    return null;
  }
  const isDegraded = payload.degradedHonesty.isDegraded;

  return (
    <div className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-2.5">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.86)]">Connector rail</p>
      </div>

      {activeConnectors.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {activeConnectors.map((connector) => (
            <div key={connector.id} className="rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-2.5 py-1.5">
              <Link
                href={connector.targetRoute}
                onClick={onNavigate}
                className="inline-flex w-full items-center justify-between text-xs text-[color:rgba(246,212,203,0.88)] transition-colors hover:text-[color:rgba(246,212,203,0.98)]"
              >
                <span className="truncate">{connector.targetRoute}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
              </Link>
              <p className="mt-1 text-[10px] text-[color:rgba(246,212,203,0.7)]">
                {connector.visibilityCue === 'public-safe' ? 'Public-safe transition' : 'Participant-only transition'} -{' '}
                {connector.provenanceMode}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-[color:rgba(246,212,203,0.74)]">
          No direct connectors are active for this route yet. Use the archive handoff or return to the canonical knowledge source.
        </p>
      )}

      <div className="mt-2 text-[11px] text-[color:rgba(246,212,203,0.74)]">
        <p>Threshold: {payload.thresholdContext.defaultThreshold}</p>
        <p className="mt-1">Provenance: {payload.provenanceSummary.verificationPosture}</p>
        <p className="mt-1">Source: {payload.provenanceSummary.sourceLabel}</p>
        <p className="mt-1">Freshness: {payload.provenanceSummary.freshnessHint}</p>
      </div>

      {isDegraded ? (
        <p className="mt-2 rounded-lg border border-amber-200/25 bg-amber-100/10 px-2 py-1.5 text-[11px] text-amber-100/85">
          Degraded honesty: {payload.degradedHonesty.fallbackNote ?? payload.degradedHonesty.reason ?? 'partial connector context'}
        </p>
      ) : null}

      <Link
        href={payload.archiveHandoff.recordRoute}
        onClick={onNavigate}
        className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-2.5 py-1.5 text-xs text-[color:rgba(246,212,203,0.88)] transition-colors hover:border-[color:rgba(246,212,203,0.24)] hover:bg-[color:rgba(246,212,203,0.1)]"
      >
        <span className="truncate">Archive handoff</span>
        <ArrowRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
      </Link>

      {payload.sourceRoute !== '/education/maps/weaving-futures-atlas' ? (
        <Link
          href="/education/maps/weaving-futures-atlas"
          onClick={onNavigate}
          className="mt-1 inline-flex w-full items-center justify-between rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-2.5 py-1.5 text-xs text-[color:rgba(246,212,203,0.88)] transition-colors hover:border-[color:rgba(246,212,203,0.24)] hover:bg-[color:rgba(246,212,203,0.1)]"
        >
          <span className="truncate">Canonical knowledge source</span>
          <ArrowRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
        </Link>
      ) : null}
    </div>
  );
}
