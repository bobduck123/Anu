// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { JourneyConnectorRail } from '@/ui-system/layout/JourneyConnectorRail';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('JourneyConnectorRail', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders threshold, provenance, and transition visibility cues from connector payload', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            journeySlug: 'knowledge-action-community-governance-archive',
            sourceRoute: '/community',
            connectors: [
              {
                id: 'community-to-model-registry',
                sourceRoute: '/community',
                targetRoute: '/governance/model-registry',
                thresholdRequired: 'STEWARD',
                provenanceMode: 'verified-summary',
                archiveHandoffMode: 'required',
                summary: 'Escalate into model governance',
                visibilityCue: 'participant-only',
              },
            ],
            activeConnectors: [
              {
                id: 'community-to-model-registry',
                sourceRoute: '/community',
                targetRoute: '/governance/model-registry',
                thresholdRequired: 'STEWARD',
                provenanceMode: 'verified-summary',
                archiveHandoffMode: 'required',
                summary: 'Escalate into model governance',
                visibilityCue: 'participant-only',
              },
            ],
            thresholdContext: {
              activeThresholds: ['STEWARD'],
              defaultThreshold: 'STEWARD',
            },
            provenanceSummary: {
              sourceLabel: 'Journey connector registry',
              verificationPosture: 'verified-summary',
              freshnessHint: '2026-04-14T00:00:00Z',
            },
            archiveHandoff: {
              route: '/archive',
              recordRoute: '/archive/knowledge-action-community-governance-archive-record',
              reportRoute: '/transparency?report=knowledge-action-community-governance-archive-trust-report',
            },
            degradedHonesty: {
              isDegraded: false,
              reason: null,
              fallbackNote: null,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<JourneyConnectorRail sourceRoute="/community" />);

    await waitFor(() => {
      expect(screen.getByText('Connector rail')).toBeInTheDocument();
    });

    expect(screen.getByText('/governance/model-registry')).toBeInTheDocument();
    expect(screen.getByText(/Threshold: STEWARD/)).toBeInTheDocument();
    expect(screen.getByText(/Provenance: verified-summary/)).toBeInTheDocument();
    expect(screen.getByText(/Participant-only transition/)).toBeInTheDocument();
  });

  it('renders degraded honesty cue and canonical knowledge source handoff when active connectors are missing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            journeySlug: 'knowledge-action-community-governance-archive',
            sourceRoute: '/unmapped-route',
            connectors: [],
            activeConnectors: [],
            thresholdContext: {
              activeThresholds: [],
              defaultThreshold: 'OPEN',
            },
            provenanceSummary: {
              sourceLabel: 'Connector rail registry',
              verificationPosture: 'verified-summary',
              freshnessHint: 'Generated at request time from canonical journey contract.',
            },
            archiveHandoff: {
              route: '/archive',
              recordRoute: '/archive/knowledge-action-community-governance-archive-record',
              reportRoute: '/transparency?report=knowledge-action-community-governance-archive-trust-report',
            },
            degradedHonesty: {
              isDegraded: true,
              reason: 'backend_connector_payload_unavailable',
              fallbackNote: 'Live connector context is temporarily unavailable.',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(<JourneyConnectorRail sourceRoute="/unmapped-route" />);

    await waitFor(() => {
      expect(screen.getByText(/Degraded honesty:/)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Canonical knowledge source' })).toHaveAttribute(
      'href',
      '/education/maps/weaving-futures-atlas',
    );
    expect(screen.getByRole('link', { name: 'Archive handoff' })).toHaveAttribute(
      'href',
      '/archive/knowledge-action-community-governance-archive-record',
    );
  });
});
