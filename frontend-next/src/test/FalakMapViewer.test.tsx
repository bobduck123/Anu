// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { getFallbackEducationMap } from '@/lib/maps/fallbackMapData';
import { starIndexLabel } from '@/components/maps/universe/presentationTerms';

const { packetFactoryMock } = vi.hoisted(() => ({
  packetFactoryMock: vi.fn(),
}));

vi.mock('@/components/maps/educationMapUniverseAdapter', () => ({
  mapResourceToUniversePacket: (...args: unknown[]) => packetFactoryMock(...args),
}));

vi.mock('@/components/maps/EducationMapUniverseScene', () => ({
  EducationMapUniverseScene: ({ packet }: { packet: { title: string } }) => (
    <div data-testid="education-scene">{packet.title}</div>
  ),
}));

vi.mock('@/components/maps/EducationMapUniverseExplainer', () => ({
  EducationMapUniverseExplainer: ({ star }: { star: { label: string } | null }) => (
    <div data-testid="education-explainer">{star?.label ?? 'No star selected'}</div>
  ),
}));

import { FalakMapViewer } from '@/components/maps/FalakMapViewer';

describe('FalakMapViewer', () => {
  beforeEach(() => {
    packetFactoryMock.mockReset();
  });

  it('renders and filters using shared packet stars rather than raw map node copy', async () => {
    const map = getFallbackEducationMap('neural-civic-governance');
    expect(map).toBeTruthy();

    const [firstNode, secondNode] = map!.nodes;
    packetFactoryMock.mockReturnValue({
      id: map!.definition.id,
      title: 'Mock packet',
      description: 'Mock packet description',
      domain: {
        key: map!.definition.topicKey,
        title: map!.definition.title,
        description: map!.definition.description,
        surface: 'education',
        tenantId: map!.definition.tenantId,
        scopeLabel: map!.definition.topicKey,
        semanticAxes: [],
      },
      stars: [
        {
          id: firstNode.id,
          label: 'Packet Beacon',
          type: 'education',
          color: '#22d3ee',
          size: 1.4,
          coordinates: { x: 0, y: 0, z: 0 },
          connections: [secondNode.id],
          constellationIds: [],
          placement: {
            semanticAxisVector: { x: 0.5, y: 0.5, z: 0.5 },
            evidence: 0.82,
            freshness: 0.71,
            sourceDensity: 0.66,
            importance: 0.93,
            centrality: 0.72,
            controversy: 0.11,
            anchorMode: 'derived',
            derivedCoordinates: { x: 0, y: 0, z: 0 },
            finalCoordinates: { x: 0, y: 0, z: 0 },
            rationale: 'Packet placement rationale',
            axisReasoning: [],
          },
          explainer: {
            title: 'Packet Beacon',
            summary: 'Packet summary visible in the star index.',
            starTypeLabel: 'Education',
            categoryLabel: 'Packet Sensing',
            domainLabel: map!.definition.title,
            scopeLabel: map!.definition.topicKey,
            metrics: {
              evidence: 0.82,
              freshness: 0.71,
              sourceDensity: 0.66,
              importance: 0.93,
              centrality: 0.72,
              controversy: 0.11,
            },
            placementRationale: 'Packet placement rationale',
            axisReasoning: [],
            sources: [],
            tags: ['packet-only-tag'],
            aliases: ['Packet alias'],
          },
          metadata: {
            participants: 12,
            impact: 88,
            categoryKey: firstNode.categoryKey,
          },
        },
        {
          id: secondNode.id,
          label: 'Packet Archive',
          type: 'community',
          color: '#f59e0b',
          size: 1.2,
          coordinates: { x: 1, y: 1, z: 1 },
          connections: [firstNode.id],
          constellationIds: [],
          placement: {
            semanticAxisVector: { x: 0.3, y: 0.8, z: 0.4 },
            evidence: 0.54,
            freshness: 0.61,
            sourceDensity: 0.44,
            importance: 0.47,
            centrality: 0.43,
            controversy: 0.09,
            anchorMode: 'hybrid',
            authoredCoordinates: { x: 1, y: 1, z: 1 },
            derivedCoordinates: { x: 0.8, y: 0.9, z: 1.1 },
            finalCoordinates: { x: 1, y: 1, z: 1 },
            rationale: 'Archive placement rationale',
            axisReasoning: [],
          },
          explainer: {
            title: 'Packet Archive',
            summary: 'Secondary packet summary.',
            starTypeLabel: 'Community',
            categoryLabel: 'Packet Memory',
            domainLabel: map!.definition.title,
            scopeLabel: map!.definition.topicKey,
            metrics: {
              evidence: 0.54,
              freshness: 0.61,
              sourceDensity: 0.44,
              importance: 0.47,
              centrality: 0.43,
              controversy: 0.09,
            },
            placementRationale: 'Archive placement rationale',
            axisReasoning: [],
            sources: [],
            tags: ['archive-tag'],
            aliases: [],
          },
          metadata: {
            participants: 8,
            impact: 44,
            categoryKey: secondNode.categoryKey,
          },
        },
      ],
      constellations: [],
      filters: ['education', 'community'],
      fallbackState: null,
      updatedAt: map!.definition.updatedAt,
    });

    render(<FalakMapViewer map={map!} />);

    expect(await screen.findAllByText('Packet Beacon')).toHaveLength(2);
    expect(screen.getByText('Packet summary visible in the star index.')).toBeInTheDocument();
    expect(screen.queryByText(firstNode.label)).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByPlaceholderText('Search stars, aliases, tags, summaries...')[0], {
      target: { value: 'packet-only-tag' },
    });

    const starIndexSection = screen.getByRole('heading', { name: starIndexLabel() }).closest('section');
    expect(starIndexSection).toBeTruthy();

    expect(await screen.findAllByText('Packet Beacon')).toHaveLength(2);
    expect(within(starIndexSection!).queryByText('Packet Archive')).not.toBeInTheDocument();
    expect(screen.queryByText('No stars match the current filters.')).not.toBeInTheDocument();
  });

  it('accepts a packet-first input without invoking the education adapter', async () => {
    const map = getFallbackEducationMap('neural-civic-governance');
    expect(map).toBeTruthy();

    render(
      <FalakMapViewer
        map={map!}
        packet={{
          id: 'packet-first',
          title: 'Packet First Universe',
          description: 'Packet-first path',
          domain: {
            key: 'packet-first',
            title: 'Packet First Universe',
            surface: 'universe',
            semanticAxes: [],
          },
          stars: [
            {
              id: 'packet-first-star',
              label: 'Packet First Star',
              type: 'education',
              color: '#22d3ee',
              size: 1.2,
              coordinates: { x: 0, y: 0, z: 0 },
              connections: [],
              constellationIds: ['packet-first-constellation'],
              placement: {
                semanticAxisVector: { x: 0.5, y: 0.5, z: 0.5 },
                evidence: 0.8,
                freshness: 0.7,
                sourceDensity: 0.6,
                importance: 0.9,
                centrality: 0.72,
                controversy: 0.1,
                anchorMode: 'derived',
                derivedCoordinates: { x: 0, y: 0, z: 0 },
                finalCoordinates: { x: 0, y: 0, z: 0 },
                rationale: 'Packet-first placement rationale',
                axisReasoning: [],
              },
              explainer: {
                title: 'Packet First Star',
                summary: 'Packet-first summary.',
                starTypeLabel: 'Education',
                categoryLabel: 'Packet First Category',
                metrics: {
                  evidence: 0.8,
                  freshness: 0.7,
                  sourceDensity: 0.6,
                  importance: 0.9,
                  centrality: 0.72,
                  controversy: 0.1,
                },
                placementRationale: 'Packet-first placement rationale',
                axisReasoning: [],
                sources: [],
                tags: ['packet-first'],
                aliases: [],
              },
              metadata: {
                participants: 3,
                impact: 12,
              },
            },
          ],
          constellations: [
            {
              id: 'packet-first-constellation',
              name: 'Packet First Category',
              description: 'Packet-first constellation',
              color: '#22d3ee',
              starIds: ['packet-first-star'],
            },
          ],
          relations: [],
          snapshots: [],
          packetMeta: {
            status: 'demo',
            version: 1,
            coverage: 1,
            sourceSummary: '1 star / packet-first',
            adminTopicKey: null,
          },
          filters: ['education'],
          fallbackState: null,
        }}
        showAdminLink={false}
      />,
    );

    expect(packetFactoryMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('education-scene')).toHaveTextContent('Packet First Universe');
    expect(screen.getByText('How to read this universe output')).toBeInTheDocument();
    expect(await screen.findAllByText('Packet First Star')).toHaveLength(2);
    expect(screen.getByText('Packet-first summary.')).toBeInTheDocument();
  });
});
