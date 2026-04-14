import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/sdk/journey-connectors/route';
import { FLAGSHIP_JOURNEY_CONNECTORS } from '@/ui-system/anu/journeyConnectorRegistry';
import { getRoutePurpose } from '@/ui-system/anu/routePurposeRegistry';

function toCanonicalFlagshipRoute(route: string): string {
  if (route.startsWith('/education/maps')) {
    return '/education';
  }
  return route;
}

describe('flagship journey isolation proof', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps touched flagship journey routes outside control plane metadata', () => {
    const touchedRoutes = new Set<string>();
    for (const connector of FLAGSHIP_JOURNEY_CONNECTORS) {
      touchedRoutes.add(toCanonicalFlagshipRoute(connector.sourceRoute));
      touchedRoutes.add(toCanonicalFlagshipRoute(connector.targetRoute));
    }

    for (const route of touchedRoutes) {
      const purpose = getRoutePurpose(route);
      expect(purpose).not.toBeNull();
      expect(purpose?.plane).not.toBe('control');
    }
  });

  it('forwards node-scoping query to backend connector projection and preserves node scope', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            journey_slug: 'knowledge-action-community-governance-archive',
            source: { route: '/community' },
            connectors: [],
            active_connectors: [],
            threshold_context: {
              active_thresholds: [],
              default_threshold: 'OPEN',
            },
            provenance_summary: {
              source_label: 'Journey connector registry',
              verification_posture: 'verified-summary',
              freshness: '2026-04-14T00:00:00Z',
            },
            archive_handoff: {
              route: '/archive',
              record_route: '/archive/anu-proving-ground--knowledge-action-community-governance-archive-record',
              report_route:
                '/transparency?report=anu-proving-ground--knowledge-action-community-governance-archive-trust-report',
            },
            degraded_honesty: {
              is_degraded: false,
              reason: null,
              fallback: null,
            },
            node_scope: {
              slug: 'anu-proving-ground',
              name: 'ANU Proving Ground',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const request = new Request(
      'http://localhost/api/sdk/journey-connectors?source=/community&node=anu-proving-ground',
    );
    const response = await GET(request);
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        nodeScope: { slug: string | null; name: string | null };
        archiveHandoff: { recordRoute: string };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.nodeScope).toEqual({
      slug: 'anu-proving-ground',
      name: 'ANU Proving Ground',
    });
    expect(payload.data.archiveHandoff.recordRoute).toContain('/archive/anu-proving-ground--');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/public/connectors?source_route=%2Fcommunity&node=anu-proving-ground'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('keeps requested node hint in degraded fallback payload when backend is unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('backend unavailable'));

    const request = new Request(
      'http://localhost/api/sdk/journey-connectors?source=/community&node=anu-proving-ground',
    );
    const response = await GET(request);
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        degradedHonesty: { isDegraded: boolean; reason: string | null };
        nodeScope: { slug: string | null; name: string | null };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.degradedHonesty).toMatchObject({
      isDegraded: true,
      reason: 'backend_connector_payload_unavailable',
    });
    expect(payload.data.nodeScope).toEqual({
      slug: 'anu-proving-ground',
      name: null,
    });
  });
});
