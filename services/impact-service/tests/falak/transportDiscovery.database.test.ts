import { randomUUID } from 'crypto';
import { createPrismaClient } from '../../src/lib/prisma';
import { PublicTransportDiscovery } from '../../src/falak/discovery/publicTransportDiscovery';
import { buildFalakApp } from '../../src/falak/app';

const describeIfDatabase =
  process.env.FALAK_INTEGRATION_LOCAL === 'true' && process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase('published transport discovery on disposable PostGIS', () => {
  let prisma!: ReturnType<typeof createPrismaClient>;
  let discovery!: PublicTransportDiscovery;
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const ids: Record<string, string> = {};

  async function node(name: string, type: string, options: Record<string, unknown> = {}, tenant = tenantId) {
    const row = await prisma.falakNode.create({ data: {
      tenantId: tenant, type, slug: `discovery-${name}-${tenant}`,
      title: name, status: 'active', visibility: 'public', sensitivityClass: 'normal',
      ...options
    } });
    ids[name] = row.id;
    return row;
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    discovery = new PublicTransportDiscovery(prisma);
    await prisma.falakTenant.createMany({ data: [
      { id: tenantId, slug: `discovery-${tenantId}`, name: 'Discovery fixture' },
      { id: otherTenantId, slug: `discovery-${otherTenantId}`, name: 'Other fixture' }
    ] });
    const network = await node('Sydney network', 'transport_network');
    const line = await node('Blue line', 'transport_line');
    const central = await node('Central', 'transport_station');
    const redfern = await node('Redfern', 'transport_station');
    const hiddenStation = await node('Hidden station', 'transport_station', { status: 'draft' });
    await node('Hidden network', 'transport_network', { visibility: 'tenant' });
    await node('Hidden line', 'transport_line', { status: 'draft' });
    await node('Other network', 'transport_network', {}, otherTenantId);

    const publicPattern = await prisma.falakTransportPattern.create({ data: {
      tenantId, networkNodeId: network.id, lineNodeId: line.id, sourceSlug: 'fixture',
      externalId: 'public-pattern', label: 'Blue branch', status: 'active',
      calls: { create: [
        { sequence: 0, stationNodeId: central.id },
        { sequence: 1, stationNodeId: redfern.id },
        { sequence: 2, stationNodeId: central.id }
      ] }
    } });
    await prisma.$executeRaw`UPDATE falak.nodes
      SET geometry = falak.ST_SetSRID(falak.ST_MakePoint(151.206, -33.882), 4326)
      WHERE id = ${central.id}::uuid`;
    await prisma.$executeRaw`UPDATE falak.nodes
      SET geometry = falak.ST_SetSRID(falak.ST_MakePoint(151.204, -33.893), 4326)
      WHERE id = ${redfern.id}::uuid`;
    await prisma.$executeRaw`UPDATE falak.transport_patterns
      SET geometry = falak.ST_GeomFromText('LINESTRING(151.206 -33.882,151.204 -33.893)', 4326)
      WHERE id = ${publicPattern.id}::uuid`;
    await prisma.falakTransportPattern.create({ data: {
      tenantId, networkNodeId: network.id, lineNodeId: line.id, sourceSlug: 'fixture',
      externalId: 'hidden-pattern', label: 'Unpublished stop', status: 'active',
      calls: { create: [
        { sequence: 0, stationNodeId: central.id },
        { sequence: 1, stationNodeId: hiddenStation.id }
      ] }
    } });

    const venue = await node('Public venue', 'venue');
    const hiddenVenue = await node('Private venue', 'venue', { visibility: 'tenant' });
    const artist = await node('Public artist', 'artist');
    const hiddenArtist = await node('Draft artist', 'artist', { status: 'draft' });
    const organisation = await node('Public organisation', 'organisation');
    const first = await node('First event', 'event', {
      timeStart: new Date('2026-10-30T10:00:00Z'), timeEnd: new Date('2026-10-30T12:00:00Z')
    });
    const second = await node('Second event', 'event', {
      timeStart: new Date('2026-10-31T10:00:00Z')
    });
    const draft = await node('Draft event', 'event', {
      status: 'draft', timeStart: new Date('2026-10-30T10:00:00Z')
    });
    const archived = await node('Cancelled event', 'event', {
      status: 'archived', timeStart: new Date('2026-10-30T10:00:00Z')
    });
    const outside = await node('Outside event', 'event', {
      timeStart: new Date('2026-11-30T10:00:00Z')
    });
    const privateEvent = await node('Private event', 'event', {
      visibility: 'tenant', timeStart: new Date('2026-10-30T10:00:00Z')
    });
    const privateVenueEvent = await node('Private venue event', 'event', {
      timeStart: new Date('2026-10-30T10:00:00Z')
    });
    await prisma.falakEdge.createMany({ data: [
      { tenantId, fromNodeId: central.id, toNodeId: venue.id, relation: 'nearby_venue' },
      { tenantId, fromNodeId: redfern.id, toNodeId: venue.id, relation: 'nearby_venue' },
      { tenantId, fromNodeId: central.id, toNodeId: hiddenVenue.id, relation: 'nearby_venue' },
      ...[first, second, draft, archived, outside, privateEvent].map((event) => ({
        tenantId, fromNodeId: event.id, toNodeId: venue.id, relation: 'occurs_at',
        validFrom: event.timeStart, validTo: event.timeEnd
      })),
      { tenantId, fromNodeId: first.id, toNodeId: venue.id, relation: 'at_venue' },
      { tenantId, fromNodeId: first.id, toNodeId: artist.id, relation: 'features_artist' },
      { tenantId, fromNodeId: first.id, toNodeId: hiddenArtist.id, relation: 'features_artist' },
      { tenantId, fromNodeId: first.id, toNodeId: organisation.id, relation: 'hosted_by' },
      { tenantId, fromNodeId: privateVenueEvent.id, toNodeId: hiddenVenue.id, relation: 'occurs_at' }
    ] });
  });

  afterAll(async () => {
    await prisma.falakEdge.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } });
    const patterns = await prisma.falakTransportPattern.findMany({ where: { tenantId }, select: { id: true } });
    await prisma.falakTransportPatternCall.deleteMany({ where: { patternId: { in: patterns.map((row) => row.id) } } });
    await prisma.falakTransportPattern.deleteMany({ where: { tenantId } });
    await prisma.falakNode.deleteMany({ where: { tenantId: { in: [tenantId, otherTenantId] } } });
    await prisma.falakTenant.deleteMany({ where: { id: { in: [tenantId, otherTenantId] } } });
    await prisma.$disconnect();
  });

  test('lists only public networks and ordered patterns with every station public', async () => {
    const networks = await discovery.networks(tenantId, 20, 0);
    expect(networks.items.map((item) => item.id)).toEqual([ids['Sydney network']]);
    const lines = await discovery.lines(tenantId, ids['Sydney network']!, 20, 0);
    expect(lines.items.map((item) => item.id)).toEqual([ids['Blue line']]);
    const patterns = await discovery.patterns(tenantId, ids['Blue line']!, 20, 0);
    expect(patterns.items).toHaveLength(1);
    expect(patterns.items[0]!.external_id).toBe('public-pattern');
    expect(patterns.items[0]!.calls.map((call) => call.station.id))
      .toEqual([ids.Central, ids.Redfern, ids.Central]);
    expect(patterns.items[0]!.calls[0]!.station.coordinate).toEqual([151.206, -33.882]);
    expect(patterns.items[0]!.geometry?.type).toBe('LineString');
    expect(await discovery.networks(otherTenantId, 20, 0)).toMatchObject({
      items: [{ id: ids['Other network'] }]
    });
  });

  test('deduplicates canonical events and filters draft, archived, private and out-of-window content', async () => {
    const from = new Date('2026-10-30T00:00:00Z');
    const to = new Date('2026-11-02T00:00:00Z');
    const central = await discovery.station(tenantId, ids.Central!, from, to, 20, 0);
    const redfern = await discovery.station(tenantId, ids.Redfern!, from, to, 20, 0);
    expect(central.items.map((item) => item.title)).toEqual(['First event', 'Second event']);
    expect(redfern.items.map((item) => item.id)).toEqual(central.items.map((item) => item.id));
    expect(central.items[0]!.venues.map((item) => item.id)).toEqual([ids['Public venue']]);
    expect(central.items[0]!.artists.map((item) => item.id)).toEqual([ids['Public artist']]);
    expect(central.items[0]!.organizations.map((item) => item.id)).toEqual([ids['Public organisation']]);
    expect(central.station.coordinate).toEqual([151.206, -33.882]);
    const overlap = await discovery.station(tenantId, ids.Central!,
      new Date('2026-10-30T11:00:00Z'), new Date('2026-10-30T11:30:00Z'), 20, 0);
    expect(overlap.items.map((item) => item.title)).toEqual(['First event']);
    const firstPage = await discovery.station(tenantId, ids.Central!, from, to, 1, 0);
    expect(firstPage.next_offset).toBe(1);
    const secondPage = await discovery.station(tenantId, ids.Central!, from, to, 1, 1);
    expect(secondPage.items[0]!.title).toBe('Second event');
    await expect(discovery.station(tenantId, ids['Hidden station']!, from, to, 20, 0))
      .rejects.toMatchObject({ statusCode: 404 });
    await expect(discovery.station(otherTenantId, ids.Central!, from, to, 20, 0))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('serves guarded HTTP contract with bounded date window', async () => {
    const { app, fanoutPublisher } = await buildFalakApp(prisma);
    try {
      const response = await app.inject({ method: 'GET',
        url: `/v1/falak/transport/stations/${ids.Central}/discovery?from=2026-10-30T00%3A00%3A00Z&to=2026-11-02T00%3A00%3A00Z`,
        headers: { 'x-tenant-id': tenantId } });
      expect(response.statusCode).toBe(200);
      expect(response.json().items.map((item: { title: string }) => item.title))
        .toEqual(['First event', 'Second event']);
      const invalid = await app.inject({ method: 'GET',
        url: `/v1/falak/transport/stations/${ids.Central}/discovery?from=2026-10-30T00%3A00%3A00Z&to=2026-12-31T00%3A00%3A00Z`,
        headers: { 'x-tenant-id': tenantId } });
      expect(invalid.statusCode).toBe(400);
      const missingTenant = await app.inject({ method: 'GET', url: '/v1/falak/transport/networks' });
      expect(missingTenant.statusCode).toBe(400);
    } finally {
      await app.close();
      await fanoutPublisher.close();
    }
  }, 20_000);
});
