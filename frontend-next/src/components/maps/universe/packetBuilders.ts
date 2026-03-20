import type {
  UniverseConstellation,
  UniversePacket,
  UniverseRelation,
  UniverseSnapshot,
  UniverseStar,
  UniverseStarType,
} from './types';

function average(values: number[]): number {
  if (values.length < 1) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scopedId(scope: string, value: string): string {
  return `${scope}::${value}`;
}

function scopedStar(
  packet: UniversePacket,
  star: UniverseStar,
  scopedConstellationIds: string[],
  scopedConnections: string[],
): UniverseStar {
  const scope = packet.domain.key;
  const originalCategoryKey =
    typeof star.metadata.categoryKey === 'string' && star.metadata.categoryKey.trim().length > 0
      ? star.metadata.categoryKey
      : undefined;

  return {
    ...star,
    id: scopedId(scope, star.id),
    connections: scopedConnections,
    constellationIds: scopedConstellationIds,
    explainer: {
      ...star.explainer,
      domainLabel: packet.title,
      scopeLabel: packet.domain.scopeLabel ?? packet.domain.key,
      categoryLabel: star.explainer.categoryLabel
        ? `${packet.title} / ${star.explainer.categoryLabel}`
        : undefined,
    },
    metadata: {
      ...star.metadata,
      categoryKey: originalCategoryKey ? scopedId(scope, originalCategoryKey) : undefined,
      originPacketId: packet.id,
      originPacketKey: packet.domain.key,
      originPacketTitle: packet.title,
      originStarId: star.id,
    },
  };
}

function scopedConstellation(packet: UniversePacket, constellation: UniverseConstellation): UniverseConstellation {
  const scope = packet.domain.key;
  return {
    ...constellation,
    id: scopedId(scope, constellation.id),
    name: `${packet.title} / ${constellation.name}`,
    starIds: constellation.starIds.map((starId) => scopedId(scope, starId)),
  };
}

function scopedRelation(packet: UniversePacket, relation: UniverseRelation): UniverseRelation {
  const scope = packet.domain.key;
  return {
    ...relation,
    id: scopedId(scope, relation.id),
    sourceId: scopedId(scope, relation.sourceId),
    targetId: scopedId(scope, relation.targetId),
  };
}

function scopedSnapshot(packet: UniversePacket, snapshot: UniverseSnapshot): UniverseSnapshot {
  const scope = packet.domain.key;
  return {
    ...snapshot,
    id: scopedId(scope, snapshot.id),
    name: `${packet.title} / ${snapshot.name}`,
  };
}

function mergedStatus(packets: UniversePacket[]): string {
  const statuses = packets.map((packet) => packet.packetMeta?.status).filter(Boolean);
  if (statuses.length < 1) {
    return 'available';
  }

  if (statuses.every((status) => status === 'published')) {
    return 'published';
  }

  if (statuses.some((status) => status === 'reviewed')) {
    return 'reviewed';
  }

  if (statuses.some((status) => status === 'demo')) {
    return 'demo';
  }

  return 'draft';
}

function mergedSemanticAxes(packets: UniversePacket[]): UniversePacket['domain']['semanticAxes'] {
  const axisMap = new Map<string, UniversePacket['domain']['semanticAxes'][number]>();

  packets.forEach((packet) => {
    packet.domain.semanticAxes.forEach((axis) => {
      if (!axisMap.has(axis.key)) {
        axisMap.set(axis.key, axis);
      }
    });
  });

  return Array.from(axisMap.values());
}

export function buildCanonicalUniversePacket(packets: UniversePacket[]): UniversePacket | null {
  if (packets.length < 1) {
    return null;
  }

  const scopedStars = packets.flatMap((packet) =>
    packet.stars.map((star) =>
      scopedStar(
        packet,
        star,
        star.constellationIds.map((constellationId) => scopedId(packet.domain.key, constellationId)),
        star.connections.map((connectionId) => scopedId(packet.domain.key, connectionId)),
      ),
    ),
  );

  const scopedConstellations = packets.flatMap((packet) => packet.constellations.map((constellation) => scopedConstellation(packet, constellation)));
  const scopedRelations = packets.flatMap((packet) => (packet.relations ?? []).map((relation) => scopedRelation(packet, relation)));
  const scopedSnapshots = packets.flatMap((packet) => (packet.snapshots ?? []).map((snapshot) => scopedSnapshot(packet, snapshot)));
  const coverage = average(
    packets
      .map((packet) => packet.packetMeta?.coverage)
      .filter((value): value is number => typeof value === 'number'),
  );
  const version = packets
    .map((packet) => packet.packetMeta?.version)
    .filter((value): value is number => typeof value === 'number')
    .reduce((max, current) => Math.max(max, current), 0);
  const updatedAt = [...packets]
    .map((packet) => packet.updatedAt)
    .filter((value): value is string => typeof value === 'string')
    .sort()
    .slice(-1)[0];
  const filters = Array.from(new Set(packets.flatMap((packet) => packet.filters))) as UniverseStarType[];

  return {
    id: 'anu-cosmos-packet',
    title: 'Manara Shared Universe',
    description:
      'A shared Manara universe built from all available source domains. Stars remain packet-native, source-linked, and inspectable across domain boundaries.',
    domain: {
      key: 'anu-cosmos',
      title: 'Manara Shared Universe',
      description:
        'Cross-domain packet composed from the available Manara universe slices.',
      surface: 'universe',
      scopeLabel: 'cross-domain',
      semanticAxes: mergedSemanticAxes(packets),
    },
    stars: scopedStars,
    constellations: scopedConstellations,
    relations: scopedRelations,
    snapshots: scopedSnapshots,
    packetMeta: {
      status: mergedStatus(packets),
      version: version > 0 ? version : null,
      coverage,
      sourceSummary: `${packets.length} source domains / ${scopedStars.length} stars / ${scopedConstellations.length} constellations`,
      adminTopicKey: null,
    },
    filters,
    fallbackState: packets.some((packet) => packet.fallbackState?.active)
      ? {
          active: true,
          mode: 'read_only',
          label: 'Shared universe fallback',
          message:
            'The shared universe is mixing live and fallback packets so cross-domain inspection stays available while some remote sources are degraded.',
          source: 'mixed',
        }
      : null,
    updatedAt,
  };
}
