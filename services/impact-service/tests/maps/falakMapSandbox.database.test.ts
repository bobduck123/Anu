import { createPrismaClient } from '../../src/lib/prisma';
import { PrismaFalakMapRepository } from '../../src/maps/repositories/prismaFalakMapRepository';
import { FalakMapService } from '../../src/maps/services/falakMapService';

const describeIfSandbox =
  process.env.FALAK_MAP_SANDBOX_LOCAL === 'true' && process.env.DATABASE_URL ? describe : describe.skip;

const TENANT_ID = '11111111-1111-4111-8111-111111111111';

describeIfSandbox('Falak map sandbox live database', () => {
  const prisma = createPrismaClient();
  const repository = new PrismaFalakMapRepository(prisma);
  const service = new FalakMapService(repository);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('opens a seeded published sandbox map', async () => {
    const map = await service.getMap(TENANT_ID, 'consciousness-theories');

    expect(map).not.toBeNull();
    expect(map?.definition.status).toBe('published');
    expect(map?.nodes.length).toBeGreaterThan(4);
    expect(map?.edges.length).toBeGreaterThan(1);
    expect(map?.snapshots.length).toBeGreaterThan(0);
  });

  test('includes the left-thought atlas in sandbox seed with SEP coverage parity', async () => {
    const map = await service.getMap(TENANT_ID, 'left-thought-graph-atlas');

    expect(map).not.toBeNull();
    expect(map?.definition.status).toBe('published');
    expect(map?.nodes).toHaveLength(79);
    expect(map?.edges).toHaveLength(126);

    const sepLinkedNodes = map?.nodes.filter((node) =>
      node.sources.some((source) => source.domain === 'plato.stanford.edu'),
    );
    expect(sepLinkedNodes).toHaveLength(79);
  });

  test('resolves a missing topic into a persisted draft map through the real compiler', async () => {
    const topic = `river memory protocols ${Date.now()}`;
    const result = await service.resolveOrCompile(TENANT_ID, {
      topic,
      mode: 'auto_seed',
    });

    expect(result.jobCreated).toBe(true);
    expect(result.map.definition.status).toBe('draft');
    expect(result.map.nodes.length).toBeGreaterThan(0);
    const persisted = await service.getMap(TENANT_ID, result.map.definition.topicKey);
    expect(persisted?.definition.id).toBe(result.map.definition.id);
  });

  test('persists taxonomy, node, edge, rerun, and snapshot restore operations', async () => {
    const base = await service.getMap(TENANT_ID, 'software-architecture-patterns');
    if (!base) {
      throw new Error('Expected seeded sandbox map to exist');
    }

    const snapshotId = base.definition.currentSnapshotId ?? base.snapshots[0]?.id;
    const category = base.categories[0];
    const node = base.nodes[0];
    const edge = base.edges[0];
    if (!snapshotId || !category || !node || !edge) {
      throw new Error('Sandbox map is missing expected category, node, edge, or snapshot data');
    }

    const pinnedPosition = { x: 14.25, y: -6.5, z: 2.1 };
    const categoryLabel = `Execution Modes Sandbox`;

    const categoryUpdated = await service.updateCategory(TENANT_ID, base.definition.topicKey, category.key, {
      label: categoryLabel,
      description: 'Local sandbox taxonomy override',
      colorToken: 'amber',
      order: 11,
    });
    const nodeUpdated = await service.updateNode(TENANT_ID, base.definition.topicKey, node.id, {
      summary: 'Pinned by local sandbox validation',
      pinned: true,
      position: pinnedPosition,
    });
    const edgeUpdated = await service.updateEdge(TENANT_ID, base.definition.topicKey, edge.id, {
      weight: 0.91,
      confidence: 0.89,
      evidence: 'Local sandbox validation override',
    });

    expect(categoryUpdated?.categories.find((entry) => entry.key === category.key)?.label).toBe(categoryLabel);
    expect(nodeUpdated?.nodes.find((entry) => entry.id === node.id)?.summary).toBe('Pinned by local sandbox validation');
    expect(edgeUpdated?.edges.find((entry) => entry.id === edge.id)?.weight).toBe(0.91);

    const rerun = await service.rerunLayout(TENANT_ID, base.definition.topicKey);
    const rerunNode = rerun?.nodes.find((entry) => entry.id === node.id);
    expect(rerun?.snapshots.length).toBeGreaterThan(base.snapshots.length);
    expect(rerunNode?.pinned).toBe(true);
    expect(rerunNode?.position).toEqual(pinnedPosition);

    const restored = await service.restoreSnapshot(TENANT_ID, base.definition.topicKey, snapshotId);
    const restoredNode = restored?.nodes.find((entry) => entry.id === node.id);
    const originalSnapshotNode = base.snapshots.find((entry) => entry.id === snapshotId)?.nodes.find((entry) => entry.nodeId === node.id);

    expect(restored?.definition.currentSnapshotId).toBe(snapshotId);
    expect(restored?.categories.find((entry) => entry.key === category.key)?.label).toBe(categoryLabel);
    expect(restored?.edges.find((entry) => entry.id === edge.id)?.weight).toBe(0.91);
    expect(restoredNode?.position).toEqual(originalSnapshotNode?.position);
    expect(restoredNode?.pinned).toBe(originalSnapshotNode?.pinned);
  });
});
