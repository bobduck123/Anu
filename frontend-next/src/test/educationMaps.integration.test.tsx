// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import type { MapResource } from '@/lib/api/educationMaps';
import { educationMapsApi } from '@/lib/api/educationMaps';
import { MapLibraryIndex } from '@/components/education/maps/MapLibraryIndex';
import { MapResourcePage } from '@/components/education/maps/MapResourcePage';
import { MapResourceWorkspace } from '@/components/education/maps/MapResourceWorkspace';

const pushMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/education/resource-library/maps',
}));

vi.mock('@/ui/patterns/starfield/QuantumCanvas', () => ({
  QuantumCanvas: ({
    flattenFactor,
    focusStarId,
    densityFactor,
    showConnections,
    onStarClick,
  }: {
    flattenFactor?: number;
    focusStarId?: string | null;
    densityFactor?: number;
    showConnections?: boolean;
    onStarClick?: (star: { id: string }) => void;
  }) => (
    <div
      data-testid="quantum-canvas"
      data-flatten={String(flattenFactor ?? 0)}
      data-focus={focusStarId ?? ''}
      data-density={String(densityFactor ?? 1)}
      data-connections={String(Boolean(showConnections))}
    >
      <button type="button" onClick={() => onStarClick?.({ id: 'node-el' })}>
        Select node-el
      </button>
    </div>
  ),
}));

vi.mock('@/lib/api/educationMaps', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/educationMaps')>('@/lib/api/educationMaps');
  return {
    ...actual,
    educationMapsApi: {
      listMaps: vi.fn(),
      resolveMap: vi.fn(),
      getMap: vi.fn(),
      getCategoryView: vi.fn(),
      listEntities: vi.fn(),
      updateStatus: vi.fn(),
      updateNode: vi.fn(),
      updateEdge: vi.fn(),
      rerunLayout: vi.fn(),
    },
  };
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithClient(ui: ReactNode) {
  const client = createQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function createMapFixture(): MapResource {
  return {
    definition: {
      id: 'map-consciousness',
      tenantId: 'tenant-test',
      topicKey: 'consciousness-theories',
      title: 'Consciousness Theories',
      archetype: 'theory',
      entityType: 'theory',
      description: 'A Falak semantic draft for consciousness theories.',
      status: 'draft',
      sizeFormula:
        '0.30 * importance + 0.10 * popularity + 0.30 * evidence + 0.15 * centrality + 0.10 * complexity + 0.05 * freshness',
      version: 1,
      currentSnapshotId: 'snapshot-1',
      confidence: {
        coverage: 0.86,
        taxonomy: 0.79,
        positions: 0.82,
        dedupe: 0.93,
        relationships: 0.8,
      },
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    },
    categories: [
      {
        id: 'cat-schools',
        mapId: 'map-consciousness',
        key: 'schools',
        label: 'Schools',
        colorToken: 'cyan',
        order: 0,
      },
      {
        id: 'cat-cosmos',
        mapId: 'map-consciousness',
        key: 'cosmos',
        label: 'Cosmos',
        colorToken: 'violet',
        order: 1,
      },
    ],
    axes: [
      {
        id: 'axis-x',
        mapId: 'map-consciousness',
        key: 'x',
        label: 'Locality',
        minLabel: 'local',
        maxLabel: 'transregional',
        description: 'How locally bounded or widely distributed the theory is framed.',
        scoringMethod: 'rubric',
      },
      {
        id: 'axis-y',
        mapId: 'map-consciousness',
        key: 'y',
        label: 'Cosmology',
        minLabel: 'empirical',
        maxLabel: 'cosmological',
        description: 'How empirical or cosmological the explanatory frame is.',
        scoringMethod: 'rubric',
      },
      {
        id: 'axis-z',
        mapId: 'map-consciousness',
        key: 'z',
        label: 'Scope',
        minLabel: 'narrow',
        maxLabel: 'universal',
        description: 'How broad the explanatory scope is.',
        scoringMethod: 'rubric',
      },
    ],
    nodes: [
      {
        id: 'node-el',
        mapId: 'map-consciousness',
        label: 'Integrated Information Theory',
        aliases: ['IIT'],
        entityType: 'theory',
        categoryKey: 'schools',
        tags: ['consciousness'],
        metadata: {},
        axisScores: { x: 0.4, y: 0.7, z: 0.9 },
        axisMeta: [
          { key: 'x', explanation: 'Often discussed as a transregional theory.', confidence: 0.8 },
          { key: 'y', explanation: 'Frequently framed in cosmological terms.', confidence: 0.76 },
          { key: 'z', explanation: 'Claims broad explanatory scope.', confidence: 0.82 },
        ],
        metrics: {
          importance: 0.9,
          popularity: 0.5,
          evidence: 0.8,
          centrality: 0.6,
          complexity: 0.7,
          controversy: 0.4,
          freshness: 0.5,
          sizeScore: 0.74,
          renderRadius: 4.8,
        },
        position: { x: 5, y: 3, z: 8 },
        confidence: { extraction: 0.9, classification: 0.85, positioning: 0.81 },
        summary: 'A mathematical theory of conscious integration.',
        longDescription: 'Treats consciousness as integrated information with a formal structure.',
        sources: [
          {
            id: 'source-1',
            nodeId: 'node-el',
            url: 'https://example.com/iit',
            title: 'IIT overview',
            domain: 'example.com',
            snippet: 'Overview of integrated information theory.',
          },
        ],
        pinned: false,
      },
      {
        id: 'node-cosmos',
        mapId: 'map-consciousness',
        label: 'Panpsychism',
        aliases: [],
        entityType: 'theory',
        categoryKey: 'cosmos',
        tags: ['mind'],
        metadata: {},
        axisScores: { x: -0.2, y: 0.9, z: 0.8 },
        axisMeta: [
          { key: 'x', explanation: 'Discussed across multiple traditions.', confidence: 0.71 },
          { key: 'y', explanation: 'Strongly cosmological framing.', confidence: 0.88 },
          { key: 'z', explanation: 'Universal explanatory scope.', confidence: 0.83 },
        ],
        metrics: {
          importance: 0.82,
          popularity: 0.44,
          evidence: 0.61,
          centrality: 0.54,
          complexity: 0.66,
          controversy: 0.63,
          freshness: 0.4,
          sizeScore: 0.65,
          renderRadius: 4.3,
        },
        position: { x: -6, y: 7, z: 6 },
        confidence: { extraction: 0.88, classification: 0.8, positioning: 0.77 },
        summary: 'A view that mind-like qualities are fundamental.',
        longDescription: 'Treats mentality as a basic feature of matter or existence.',
        sources: [
          {
            id: 'source-2',
            nodeId: 'node-cosmos',
            url: 'https://example.com/panpsychism',
            title: 'Panpsychism primer',
            domain: 'example.com',
          },
        ],
        pinned: false,
      },
    ],
    edges: [
      {
        id: 'edge-1',
        mapId: 'map-consciousness',
        sourceId: 'node-el',
        targetId: 'node-cosmos',
        relation: 'similar_to',
        weight: 0.58,
        confidence: 0.72,
        evidence: 'Both appear in comparative philosophy of mind source sets.',
      },
    ],
    aliases: [
      {
        id: 'alias-1',
        mapId: 'map-consciousness',
        nodeId: 'node-el',
        alias: 'IIT',
        canonicalLabel: 'Integrated Information Theory',
      },
    ],
    snapshots: [
      {
        id: 'snapshot-1',
        mapId: 'map-consciousness',
        version: 1,
        name: 'Consciousness Theories Semantic Draft',
        nodes: [
          {
            nodeId: 'node-el',
            position: { x: 5, y: 3, z: 8 },
            confidence: 0.81,
            pinned: false,
            clusterId: 'cluster:schools',
          },
          {
            nodeId: 'node-cosmos',
            position: { x: -6, y: 7, z: 6 },
            confidence: 0.77,
            pinned: false,
            clusterId: 'cluster:cosmos',
          },
        ],
        createdAt: '2026-03-15T00:00:00.000Z',
        createdBy: null,
      },
    ],
    jobs: [],
  };
}

function createDenseMapFixture(count = 460): MapResource {
  const base = createMapFixture();
  const nodes = Array.from({ length: count }, (_, index) => ({
    ...base.nodes[index % base.nodes.length],
    id: `dense-node-${index}`,
    label: `Dense Node ${index}`,
    aliases: [`DN${index}`],
    categoryKey: index % 2 === 0 ? 'schools' : 'cosmos',
    position: {
      x: (index % 23) - 11,
      y: Math.floor(index / 23) - 10,
      z: (index % 7) - 3,
    },
    sources: [
      {
        id: `dense-source-${index}`,
        nodeId: `dense-node-${index}`,
        url: `https://example.com/dense/${index}`,
        title: `Dense Source ${index}`,
        domain: 'example.com',
      },
    ],
  }));
  const edges = nodes.slice(1).map((node, index) => ({
    id: `dense-edge-${index}`,
    mapId: base.definition.id,
    sourceId: nodes[index].id,
    targetId: node.id,
    relation: 'similar_to' as const,
    weight: 0.42,
    confidence: 0.66,
    evidence: `Dense relation ${index}`,
  }));

  return {
    ...base,
    nodes,
    edges,
    snapshots: [
      {
        ...base.snapshots[0],
        nodes: nodes.map((node) => ({
          nodeId: node.id,
          position: node.position,
          confidence: node.confidence.positioning,
          pinned: node.pinned,
          clusterId: node.clusterId,
        })),
      },
    ],
  };
}

describe('Education maps integration', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(educationMapsApi.listMaps).mockReset();
    vi.mocked(educationMapsApi.resolveMap).mockReset();
    vi.mocked(educationMapsApi.getMap).mockReset();
  });

  it('opens an existing map detail view and keeps flatten/focus props in sync with the Falak canvas', async () => {
    const resource = createMapFixture();
    vi.mocked(educationMapsApi.getMap).mockResolvedValue(resource);

    renderWithClient(<MapResourcePage topicKey={resource.definition.topicKey} />);

    await screen.findByText('Consciousness Theories');
    expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-flatten', '0');
    expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-focus', '');

    fireEvent.click(screen.getByRole('button', { name: 'Flatten to 2D' }));
    expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-flatten', '1');

    fireEvent.click(screen.getByRole('button', { name: 'Select node-el' }));
    expect(await screen.findByText('Integrated Information Theory')).toBeTruthy();
    expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-focus', 'node-el');
    expect(screen.getByText(/Spotlight mode is isolating/)).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cosmos' } });
    await waitFor(() => {
      expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-focus', '');
    });
  });

  it('generates a missing map draft and routes to the new resource', async () => {
    const resource = createMapFixture();
    vi.mocked(educationMapsApi.listMaps).mockResolvedValue([]);
    vi.mocked(educationMapsApi.resolveMap).mockResolvedValue({
      map: resource,
      jobCreated: true,
    });

    renderWithClient(<MapLibraryIndex />);

    await screen.findByText('Falak Map Autopilot');
    fireEvent.change(screen.getByPlaceholderText('ancient levantine deities'), {
      target: { value: 'consciousness theories' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve or compile topic' }));

    await waitFor(() => {
      expect(educationMapsApi.resolveMap).toHaveBeenCalledWith({
        topic: 'consciousness theories',
        mode: 'auto_seed',
      });
      expect(pushMock).toHaveBeenCalledWith('/education/resource-library/maps/consciousness-theories');
    });
  });

  it('reduces dense-map render density until the user narrows the constellation', async () => {
    renderWithClient(<MapResourceWorkspace resource={createDenseMapFixture()} />);

    expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-density', '0.62');

    fireEvent.change(screen.getByPlaceholderText('Search labels, aliases, tags'), {
      target: { value: 'Dense Node 12' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('quantum-canvas')).toHaveAttribute('data-density', '1');
    });
  });
});
