// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EarthEntryPage } from '@/components/earth/EarthEntryPage';
import type { EarthSummaryResponse, UniversePacket } from '@/lib/api/earthHeavenApi';

const mockedGetEarthSummary = vi.fn();
const mockedGetUniversePacket = vi.fn();

vi.mock('@/lib/api/earthHeavenApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/earthHeavenApi')>('@/lib/api/earthHeavenApi');
  return {
    ...actual,
    getEarthSummary: (...args: unknown[]) => mockedGetEarthSummary(...args),
    getUniversePacket: (...args: unknown[]) => mockedGetUniversePacket(...args),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const summaryPayload: EarthSummaryResponse = {
  featureFlags: {
    earthEntryEnabled: true,
    earthSkyEnabled: true,
    heavenUniverseEnabled: true,
  },
  hero: {
    fulfillmentRate30d: 71.2,
    medianResponseHours: 6.3,
    activeRespondersNearby: 14,
  },
  network: {
    reliefReserveRunwayMonths: 2.1,
    coverageGapIndex: 0.31,
    crisisMode: {
      active: false,
      eventSubmissionFrozen: false,
      escrowFrozen: false,
    },
  },
  liveNeeds: [
    {
      id: 101,
      title: 'Food support cluster',
      description: 'Household meal coverage for 7 days.',
      category: 'food',
      severity: 'high',
      status: 'ROUTING_ACTIVE',
      requested_units: 3,
      fulfilled_units: 1,
      is_sensitive: false,
      created_at: '2026-02-21T10:00:00Z',
    },
  ],
  recentlyFulfilled: [],
  microcosms: [
    {
      id: 11,
      name: 'Sydney Inner West Care Circle',
      description: 'Seeded microcosm',
      status: 'ACTIVE',
      active_needs: 3,
      active_offers: 4,
      fulfilled_30d: 8,
    },
  ],
  footprint: null,
  permissions: {
    authenticated: false,
    role: 'anonymous',
    canViewSensitiveNeeds: false,
    canEnterUniverse: true,
  },
  educationLinks: [
    { title: 'Verification Safety', href: '/education?topic=verification-safety' },
    { title: 'How To Respond', href: '/education?topic=response-basics' },
  ],
};

const packetPayload: UniversePacket = {
  universeMode: 'mutual_aid',
  generatedAt: '2026-02-21T12:00:00Z',
  zoomLevel: 8,
  privacy: {
    kMin: 3,
    resolutionMetersMin: 900,
    redactionLevel: 'public',
  },
  objects: {
    stars: [
      {
        id: 'offer-1',
        kind: 'offer',
        x: 10,
        y: -12,
        z: 0,
        mass: 0.8,
        brightness: 0.7,
        colorKey: 'sea',
        privacyClass: 'public',
      },
    ],
    constellations: [],
    galaxies: [],
    nebulas: [],
    flares: [],
  },
  drilldown: {
    starToEntity: {},
    constellationToQuery: {},
  },
  configVersion: '1.0.0',
  evidenceHash: 'abc123',
};

describe('EarthEntryPage', () => {
  beforeEach(() => {
    mockedGetEarthSummary.mockReset();
    mockedGetUniversePacket.mockReset();
  });

  it('renders Earth dashboard from API payload', async () => {
    mockedGetEarthSummary.mockResolvedValue(summaryPayload);
    mockedGetUniversePacket.mockResolvedValue(packetPayload);

    render(<EarthEntryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Reciprocal support, grounded operations/i)).toBeTruthy();
    });

    expect(screen.getByText('Food support cluster')).toBeTruthy();
    expect(screen.getByText('Enter Universe')).toBeTruthy();
    expect(screen.getByText('Live Needs')).toBeTruthy();
  });

  it('keeps Earth functional when universe packet fetch fails', async () => {
    mockedGetEarthSummary.mockResolvedValue(summaryPayload);
    mockedGetUniversePacket.mockRejectedValue(new Error('Universe API down'));

    render(<EarthEntryPage />);

    await waitFor(() => {
      expect(screen.getByText('Food support cluster')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/Universe packet unavailable\. Earth is running in fallback sky mode\./i)).toBeTruthy();
    });
  });
});

