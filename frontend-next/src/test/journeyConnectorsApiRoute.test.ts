import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/sdk/journey-connectors/route';

describe('journey connectors API route', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes backend connector payload for requested source route', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            journey_slug: 'knowledge-action-community-governance-archive',
            source: { route: '/community' },
            connectors: [
              {
                id: 1,
                source_route: '/community',
                target_route: '/governance/model-registry',
                threshold_required: 'STEWARD',
                provenance_mode: 'verified-summary',
                archive_handoff_mode: 'required',
                summary: 'Escalate into model governance',
              },
            ],
            active_connectors: [
              {
                id: 1,
                source_route: '/community',
                target_route: '/governance/model-registry',
                threshold_required: 'STEWARD',
                provenance_mode: 'verified-summary',
                archive_handoff_mode: 'required',
                summary: 'Escalate into model governance',
              },
            ],
            threshold_context: {
              active_thresholds: ['STEWARD'],
              default_threshold: 'STEWARD',
            },
            provenance_summary: {
              source_label: 'Journey connector registry',
              verification_posture: 'verified-summary',
              freshness: '2026-04-14T00:00:00Z',
            },
            archive_handoff: {
              route: '/archive',
              record_route: '/archive/knowledge-action-community-governance-archive-record',
              report_route: '/transparency?report=knowledge-action-community-governance-archive-trust-report',
            },
            degraded_honesty: {
              is_degraded: false,
              reason: null,
              fallback: null,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const request = new Request('http://localhost/api/sdk/journey-connectors?source=/community');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        journeySlug: string;
        sourceRoute: string;
        connectors: Array<{ sourceRoute: string; targetRoute: string; visibilityCue?: string }>;
        activeConnectors: Array<{ targetRoute: string; visibilityCue?: string }>;
        provenanceSummary: { sourceLabel: string };
        archiveHandoff: { route: string; recordRoute: string };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.journeySlug).toBe('knowledge-action-community-governance-archive');
    expect(payload.data.sourceRoute).toBe('/community');
    expect(payload.data.connectors).toHaveLength(1);
    expect(payload.data.activeConnectors.map((connector) => connector.targetRoute)).toEqual(
      expect.arrayContaining(['/governance/model-registry']),
    );
    expect(payload.data.provenanceSummary.sourceLabel).toBe('Journey connector registry');
    expect(payload.data.activeConnectors[0]?.visibilityCue).toBe('participant-only');
    expect(payload.data.archiveHandoff.route).toBe('/archive');
    expect(payload.data.archiveHandoff.recordRoute).toMatch(/^\/archive\//);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to canonical registry payload when backend connector API is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('backend unavailable'));

    const request = new Request('http://localhost/api/sdk/journey-connectors?source=/community');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        activeConnectors: Array<{ targetRoute: string }>;
        degradedHonesty: { isDegraded: boolean; reason: string | null };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.activeConnectors.map((connector) => connector.targetRoute)).toEqual(
      expect.arrayContaining(['/governance/model-registry', '/transparency']),
    );
    expect(payload.data.degradedHonesty.isDegraded).toBe(true);
    expect(payload.data.degradedHonesty.reason).toBe('backend_connector_payload_unavailable');
  });
});
