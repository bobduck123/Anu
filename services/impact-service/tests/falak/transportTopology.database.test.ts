import { randomUUID } from 'crypto';
import { createPrismaClient } from '../../src/lib/prisma';

const describeIfDatabase =
  process.env.FALAK_INTEGRATION_LOCAL === 'true' && process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase('Falak transport topology schema', () => {
  let prisma!: ReturnType<typeof createPrismaClient>;
  const tenantIds: string[] = [];

  beforeAll(() => {
    prisma = createPrismaClient();
  });

  afterAll(async () => {
    for (const id of tenantIds) {
      const patterns = await prisma.falakTransportPattern.findMany({ where: { tenantId: id }, select: { id: true } });
      await prisma.falakTransportPatternCall.deleteMany({ where: { patternId: { in: patterns.map((row) => row.id) } } });
      await prisma.falakTransportPattern.deleteMany({ where: { tenantId: id } });
      await prisma.falakNode.deleteMany({ where: { tenantId: id } });
      await prisma.falakTenant.delete({ where: { id } });
    }
    await prisma.$disconnect();
  });

  async function tenant() {
    const id = randomUUID();
    await prisma.falakTenant.create({ data: { id, slug: `transport-fixture-${id}`, name: 'Transport fixture' } });
    tenantIds.push(id);
    return id;
  }

  async function node(tenantId: string, type: string, slug: string) {
    return prisma.falakNode.create({ data: { tenantId, type, slug, title: slug } });
  }

  test('represents shared stations, branches and repeated calls without duplicate station identity', async () => {
    const tenantId = await tenant();
    const network = await node(tenantId, 'transport_network', 'fixture-sydney-rail');
    const lineA = await node(tenantId, 'transport_line', 'fixture-line-a');
    const lineB = await node(tenantId, 'transport_line', 'fixture-line-b');
    const central = await node(tenantId, 'transport_station', 'fixture-central');
    const redfern = await node(tenantId, 'transport_station', 'fixture-redfern');
    const newtown = await node(tenantId, 'transport_station', 'fixture-newtown');
    const erskineville = await node(tenantId, 'transport_station', 'fixture-erskineville');
    const venue = await node(tenantId, 'venue', 'fixture-nearby-venue');
    const artist = await node(tenantId, 'artist', 'fixture-artist');
    const event = await prisma.falakNode.create({ data: {
      tenantId, type: 'event', slug: 'fixture-event', title: 'Fixture event',
      timeStart: new Date('2026-10-30T09:00:00+11:00'),
      timeEnd: new Date('2026-10-30T11:00:00+11:00')
    } });

    const common = { tenantId, networkNodeId: network.id, sourceSlug: 'synthetic-test', status: 'active' };
    const direct = await prisma.falakTransportPattern.create({
      data: { ...common, lineNodeId: lineA.id, externalId: 'a-direct', label: 'A direct',
        calls: { create: [
          { sequence: 0, stationNodeId: central.id },
          { sequence: 1, stationNodeId: redfern.id },
          { sequence: 2, stationNodeId: newtown.id }
        ] } }, include: { calls: { orderBy: { sequence: 'asc' } } }
    });
    const branch = await prisma.falakTransportPattern.create({
      data: { ...common, lineNodeId: lineA.id, externalId: 'a-branch', label: 'A branch',
        calls: { create: [
          { sequence: 0, stationNodeId: central.id },
          { sequence: 1, stationNodeId: redfern.id },
          { sequence: 2, stationNodeId: erskineville.id },
          { sequence: 3, stationNodeId: redfern.id }
        ] } }
    });
    const crossing = await prisma.falakTransportPattern.create({
      data: { ...common, lineNodeId: lineB.id, externalId: 'b-crossing', label: 'B crossing',
        calls: { create: [
          { sequence: 0, stationNodeId: newtown.id },
          { sequence: 1, stationNodeId: redfern.id }
        ] } }
    });
    await prisma.falakEdge.createMany({ data: [
      { tenantId, fromNodeId: redfern.id, toNodeId: venue.id, relation: 'nearby_venue', metadata: { origin: 'editorial' } },
      { tenantId, fromNodeId: newtown.id, toNodeId: venue.id, relation: 'nearby_venue', metadata: { origin: 'computed' } },
      { tenantId, fromNodeId: event.id, toNodeId: venue.id, relation: 'at_venue' },
      { tenantId, fromNodeId: event.id, toNodeId: artist.id, relation: 'features_artist' }
    ] });

    expect(direct.calls.map((call) => call.stationNodeId)).toEqual([central.id, redfern.id, newtown.id]);
    expect(await prisma.falakTransportPatternCall.count({ where: { patternId: branch.id, stationNodeId: redfern.id } })).toBe(2);
    expect(await prisma.falakTransportPatternCall.count({ where: { patternId: crossing.id, stationNodeId: redfern.id } })).toBe(1);
    expect(await prisma.falakNode.count({ where: { id: redfern.id } })).toBe(1);
    expect(await prisma.falakEdge.count({ where: { tenantId, toNodeId: venue.id, relation: 'nearby_venue' } })).toBe(2);
    expect(await prisma.falakNode.count({ where: { id: event.id, type: 'event' } })).toBe(1);
  });

  test('rejects cross-tenant and wrong-type references at the database boundary', async () => {
    const tenantA = await tenant();
    const tenantB = await tenant();
    const network = await node(tenantA, 'transport_network', 'fixture-network-a');
    const line = await node(tenantA, 'transport_line', 'fixture-line-a');
    const otherStation = await node(tenantB, 'transport_station', 'fixture-station-b');
    const wrongType = await node(tenantA, 'venue', 'fixture-venue-a');
    const pattern = await prisma.falakTransportPattern.create({
      data: { tenantId: tenantA, networkNodeId: network.id, lineNodeId: line.id,
        sourceSlug: 'synthetic-test', externalId: 'scope-test', label: 'Scope test' }
    });

    await expect(prisma.falakTransportPatternCall.create({
      data: { patternId: pattern.id, sequence: 0, stationNodeId: otherStation.id }
    })).rejects.toThrow();
    await expect(prisma.falakTransportPatternCall.create({
      data: { patternId: pattern.id, sequence: 0, stationNodeId: wrongType.id }
    })).rejects.toThrow();
    await expect(prisma.falakTransportPattern.create({
      data: { tenantId: tenantB, networkNodeId: network.id, lineNodeId: line.id,
        sourceSlug: 'synthetic-test', externalId: 'cross-tenant', label: 'Cross tenant' }
    })).rejects.toThrow();
  });
});
