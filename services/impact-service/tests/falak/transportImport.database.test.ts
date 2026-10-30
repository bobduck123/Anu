import { randomUUID } from 'crypto';
import { join } from 'path';
import { createPrismaClient } from '../../src/lib/prisma';
import { readGtfsTopology } from '../../src/falak/transport/gtfsTopology';
import { importGtfsTopology } from '../../src/falak/transport/importGtfsTopology';

const describeIfDatabase =
  process.env.FALAK_INTEGRATION_LOCAL === 'true' && process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase('GTFS topology import on disposable Falak database', () => {
  let prisma!: ReturnType<typeof createPrismaClient>;
  const tenantId = randomUUID();
  const fixture = join(__dirname, '..', 'fixtures', 'gtfs-rail');
  const options = {
    tenantId, sourceSlug: 'synthetic-test', sourceVersion: 'fixture-v1',
    sourceAttribution: 'Synthetic test fixture', sourceLicence: 'fixture-only', sourceUrl: 'https://example.test/fixture',
    networkExternalId: 'sydney-fixture', networkName: 'Sydney fixture rail'
  };

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.falakTenant.create({ data: { id: tenantId, slug: `gtfs-test-${tenantId}`, name: 'GTFS fixture' } });
  });

  afterAll(async () => {
    const patterns = await prisma.falakTransportPattern.findMany({ where: { tenantId }, select: { id: true } });
    await prisma.falakTransportPatternCall.deleteMany({ where: { patternId: { in: patterns.map((row) => row.id) } } });
    await prisma.falakTransportPattern.deleteMany({ where: { tenantId } });
    await prisma.falakNode.deleteMany({ where: { tenantId } });
    await prisma.falakTenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  test('reimport is idempotent and source removals preserve curated graph edges', async () => {
    const topology = await readGtfsTopology(fixture);
    const first = await importGtfsTopology(prisma, topology, options);
    expect(first.createdNodes).toBe(7);
    expect(first.createdPatterns).toBe(3);
    const patternsBefore = await prisma.falakTransportPattern.findMany({ where: { tenantId }, orderBy: { externalId: 'asc' } });
    const second = await importGtfsTopology(prisma, topology, options);
    expect(second).toMatchObject({ createdNodes: 0, updatedNodes: 0, createdPatterns: 0, updatedPatterns: 0, retiredPatterns: 0 });
    expect(await prisma.falakTransportPattern.findMany({ where: { tenantId }, orderBy: { externalId: 'asc' } }))
      .toEqual(patternsBefore);

    const station = await prisma.falakNode.findFirstOrThrow({ where: { tenantId, type: 'transport_station', title: 'Redfern' } });
    const venue = await prisma.falakNode.create({ data: {
      tenantId, type: 'venue', slug: `fixture-venue-${tenantId}`, title: 'Fixture venue'
    } });
    const curated = await prisma.falakEdge.create({ data: {
      tenantId, fromNodeId: station.id, toNodeId: venue.id,
      relation: 'nearby_venue', metadata: { origin: 'editorial' }
    } });
    const reduced = { ...topology, patterns: topology.patterns.slice(0, 2) };
    const third = await importGtfsTopology(prisma, reduced, options);
    expect(third.retiredPatterns).toBe(1);
    expect(await prisma.falakTransportPattern.count({ where: { tenantId, status: 'retired' } })).toBe(1);
    expect(await prisma.falakEdge.findUnique({ where: { id: curated.id } })).not.toBeNull();
  });
});
