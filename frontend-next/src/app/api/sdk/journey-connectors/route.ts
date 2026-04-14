import { NextResponse } from 'next/server';
import { getCoreApiBase } from '@/lib/runtime';
import {
  buildJourneyConnectorRailPayload,
  type JourneyConnectorEntry,
  type JourneyConnectorRailPayload,
} from '@/ui-system/anu/journeyConnectorRegistry';

interface BackendConnectorEntry {
  id: number | string;
  source_route: string;
  target_route: string;
  threshold_required: JourneyConnectorEntry['thresholdRequired'];
  provenance_mode: JourneyConnectorEntry['provenanceMode'];
  archive_handoff_mode: JourneyConnectorEntry['archiveHandoffMode'];
  summary: string;
}

interface BackendConnectorPayload {
  journey_slug: string;
  source: {
    route: string;
  };
  connectors: BackendConnectorEntry[];
  active_connectors: BackendConnectorEntry[];
  threshold_context: {
    active_thresholds: JourneyConnectorEntry['thresholdRequired'][];
    default_threshold: JourneyConnectorEntry['thresholdRequired'];
  };
  provenance_summary: {
    source_label: string;
    verification_posture: 'verified-summary';
    freshness: string;
  };
  archive_handoff: {
    route: '/archive';
    record_route: string;
    report_route: string;
  };
  degraded_honesty: {
    is_degraded: boolean;
    reason: string | null;
    fallback?: string | null;
  };
  node_scope?: {
    slug?: string | null;
    name?: string | null;
  };
}

function toVisibilityCue(thresholdRequired: JourneyConnectorEntry['thresholdRequired']): JourneyConnectorEntry['visibilityCue'] {
  return thresholdRequired === 'OPEN' ? 'public-safe' : 'participant-only';
}

function normalizeConnector(entry: BackendConnectorEntry): JourneyConnectorEntry {
  return {
    id: String(entry.id),
    sourceRoute: entry.source_route,
    targetRoute: entry.target_route,
    thresholdRequired: entry.threshold_required,
    provenanceMode: entry.provenance_mode,
    archiveHandoffMode: entry.archive_handoff_mode,
    summary: entry.summary,
    visibilityCue: toVisibilityCue(entry.threshold_required),
  };
}

function normalizeBackendPayload(payload: BackendConnectorPayload): JourneyConnectorRailPayload {
  return {
    journeySlug: payload.journey_slug,
    sourceRoute: payload.source.route,
    connectors: payload.connectors.map(normalizeConnector),
    activeConnectors: payload.active_connectors.map(normalizeConnector),
    thresholdContext: {
      activeThresholds: payload.threshold_context.active_thresholds,
      defaultThreshold: payload.threshold_context.default_threshold,
    },
    provenanceSummary: {
      sourceLabel: payload.provenance_summary.source_label,
      verificationPosture: payload.provenance_summary.verification_posture,
      freshnessHint: payload.provenance_summary.freshness,
    },
    archiveHandoff: {
      route: payload.archive_handoff.route,
      recordRoute: payload.archive_handoff.record_route,
      reportRoute: payload.archive_handoff.report_route,
    },
    degradedHonesty: {
      isDegraded: payload.degraded_honesty.is_degraded,
      reason: payload.degraded_honesty.reason,
      fallbackNote: payload.degraded_honesty.fallback ?? null,
    },
    nodeScope: {
      slug: payload.node_scope?.slug ?? null,
      name: payload.node_scope?.name ?? null,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceRoute = searchParams.get('source') ?? searchParams.get('source_route');
  const nodeSlug = searchParams.get('node');
  const params = new URLSearchParams();
  if (sourceRoute) {
    params.set('source_route', sourceRoute);
  }
  if (nodeSlug) {
    params.set('node', nodeSlug);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const backendBase = getCoreApiBase({ server: true });

  try {
    const response = await fetch(`${backendBase}/public/connectors${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const body = (await response.json()) as { ok: boolean; data?: BackendConnectorPayload };
      if (body.ok && body.data) {
        return NextResponse.json({
          ok: true,
          data: normalizeBackendPayload(body.data),
        });
      }
    }
  } catch {
    // Fall through to registry payload when backend connector APIs are unavailable.
  }

  const fallbackPayload = buildJourneyConnectorRailPayload(sourceRoute);
  fallbackPayload.degradedHonesty = {
    isDegraded: true,
    reason: 'backend_connector_payload_unavailable',
    fallbackNote:
      'Live connector context is temporarily unavailable. Showing canonical registry path so the journey remains navigable.',
  };
  fallbackPayload.nodeScope = {
    slug: nodeSlug,
    name: null,
  };

  return NextResponse.json({
    ok: true,
    data: fallbackPayload,
  });
}
