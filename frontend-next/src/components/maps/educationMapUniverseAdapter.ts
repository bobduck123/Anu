import { MapResource, type MapNode } from '@/lib/api/educationMaps';
import { categoryColor, categoryLabel } from './presentation';
import { labelUniverseStarType } from './universe/presentationTerms';
import {
  deriveUniversePlacement,
  hasMeaningfulCoordinates,
  normalizeRecency,
  normalizeSourceDensity,
  clamp,
} from './universe/placement';
import type {
  UniverseDomainContext,
  UniverseFallbackState,
  UniversePacket,
  UniverseStar,
  UniverseStarType,
} from './universe/types';

interface EducationUniversePacketOptions {
  surface?: UniverseDomainContext['surface'];
  title?: string;
  description?: string;
  domainKey?: string;
  scopeLabel?: string;
  fallbackState?: UniverseFallbackState | null;
}

function universeTypeForNode(node: MapNode): UniverseStarType {
  const haystack = [node.entityType, node.categoryKey ?? '', ...node.tags, ...node.aliases]
    .join(' ')
    .toLowerCase();

  if (haystack.includes('event') || haystack.includes('ritual')) {
    return 'event';
  }

  if (haystack.includes('govern') || haystack.includes('council') || haystack.includes('consent') || haystack.includes('community')) {
    return 'community';
  }

  if (haystack.includes('metric') || haystack.includes('dashboard') || haystack.includes('signal') || haystack.includes('campaign')) {
    return 'action';
  }

  if (haystack.includes('market') || haystack.includes('exchange') || haystack.includes('resource')) {
    return 'marketplace';
  }

  return 'education';
}

function buildConnections(map: MapResource): Map<string, string[]> {
  const connections = new Map<string, Set<string>>();

  map.nodes.forEach((node) => {
    connections.set(node.id, new Set<string>());
  });

  map.edges.forEach((edge) => {
    connections.get(edge.sourceId)?.add(edge.targetId);
    connections.get(edge.targetId)?.add(edge.sourceId);
  });

  return new Map(Array.from(connections.entries()).map(([key, value]) => [key, Array.from(value)]));
}

function buildDomainContext(map: MapResource, options: EducationUniversePacketOptions): UniverseDomainContext {
  return {
    key: options.domainKey ?? map.definition.topicKey,
    title: options.title ?? map.definition.title,
    description: options.description ?? map.definition.description,
    surface: options.surface ?? 'education',
    tenantId: map.definition.tenantId,
    scopeLabel: options.scopeLabel ?? map.definition.topicKey,
    semanticAxes: map.axes.map((axis) => ({
      key: axis.key,
      label: axis.label,
      description: axis.description,
      minLabel: axis.minLabel,
      maxLabel: axis.maxLabel,
    })),
  };
}

function uniqueFilters(stars: UniverseStar[]): UniverseStarType[] {
  return Array.from(new Set(stars.map((star) => star.type)));
}

export function mapResourceToUniversePacket(
  map: MapResource,
  options: EducationUniversePacketOptions = {},
): UniversePacket {
  const axisLabels: Record<'x' | 'y' | 'z', string> = {
    x: map.axes.find((axis) => axis.key === 'x')?.label ?? 'Axis X',
    y: map.axes.find((axis) => axis.key === 'y')?.label ?? 'Axis Y',
    z: map.axes.find((axis) => axis.key === 'z')?.label ?? 'Axis Z',
  };
  const nodeConnections = buildConnections(map);

  const stars: UniverseStar[] = map.nodes.map((node) => {
    const primarySource = node.sources[0];
    const sourceCount = Math.max(1, node.sources.length);
    const evidence = clamp(node.metrics.evidence);
    const freshness = clamp(node.metrics.freshness || normalizeRecency(primarySource?.extractedAt));
    const sourceDensity = normalizeSourceDensity(node.sources.length);
    const importance = clamp(node.metrics.importance);
    const centrality = clamp(node.metrics.centrality);
    const controversy = clamp(node.metrics.controversy);
    const axisReasoning = (['x', 'y', 'z'] as const).map((axisKey) => {
      const axisMeta = node.axisMeta.find((axis) => axis.key === axisKey);
      return {
        key: axisKey,
        label: axisLabels[axisKey],
        score: clamp(node.axisScores[axisKey]),
        explanation:
          axisMeta?.explanation ||
          `${node.label} sits at ${Math.round(node.axisScores[axisKey] * 100)}% on ${axisLabels[axisKey]}.`,
        confidence: axisMeta?.confidence ?? clamp(node.confidence.positioning),
      };
    });
    const placement = deriveUniversePlacement({
      seed: primarySource?.title || primarySource?.domain || node.label,
      axisScores: {
        x: clamp(node.axisScores.x),
        y: clamp(node.axisScores.y),
        z: clamp(node.axisScores.z),
      },
      axisReasoning,
      evidence,
      freshness,
      sourceDensity,
      importance,
      centrality,
      controversy,
      authoredCoordinates: hasMeaningfulCoordinates(node.position) || node.pinned ? node.position : undefined,
      authoredWeight: node.pinned ? 1 : hasMeaningfulCoordinates(node.position) ? 0.68 : undefined,
    });
    const impact = Math.round((importance * 55 + evidence * 45) * 100) / 100;
    const starType = universeTypeForNode(node);

    return {
      id: node.id,
      label: node.label,
      type: starType,
      color: categoryColor(map.categories, node.categoryKey),
      size: Math.max(0.85, Math.min(3.4, 0.9 + importance * 1.25 + sourceDensity * 0.8 + (node.pinned ? 0.22 : 0))),
      coordinates: placement.finalCoordinates,
      connections: nodeConnections.get(node.id) ?? [],
      constellationIds: node.categoryKey ? [`${map.definition.id}-constellation-${node.categoryKey}`] : [],
      placement,
      explainer: {
        title: node.label,
        summary: node.summary || 'Curator summary pending.',
        longDescription: node.longDescription,
        categoryLabel: categoryLabel(map.categories, node.categoryKey),
        starTypeLabel: labelUniverseStarType(starType),
        domainLabel: options.title ?? map.definition.title,
        scopeLabel: options.scopeLabel ?? map.definition.topicKey,
        metrics: {
          evidence,
          freshness,
          sourceDensity,
          importance,
          centrality,
          controversy,
        },
        placementRationale: placement.rationale,
        axisReasoning: placement.axisReasoning,
        primarySource: primarySource,
        sources: node.sources,
        tags: node.tags,
        aliases: node.aliases,
      },
      metadata: {
        createdAt: primarySource?.extractedAt ?? map.definition.updatedAt,
        participants: Math.max(6, Math.round(sourceCount * 12 + node.metrics.popularity * 64)),
        impact,
        entityType: node.entityType,
        categoryKey: node.categoryKey,
        pinned: node.pinned,
        sourceCount,
        summary: node.summary,
        longDescription: node.longDescription,
      },
    };
  });

  const constellations = map.categories
    .map((category) => {
      const starIds = map.nodes.filter((node) => node.categoryKey === category.key).map((node) => node.id);
      if (starIds.length < 1) {
        return null;
      }

      return {
        id: `${map.definition.id}-constellation-${category.key}`,
        name: category.label,
        starIds,
        color: categoryColor(map.categories, category.key),
        description:
          category.description ||
          `${category.label} constellation inside the ${options.title ?? map.definition.title} universe.`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    id: map.definition.id,
    title: options.title ?? map.definition.title,
    description: options.description ?? map.definition.description,
    domain: buildDomainContext(map, options),
    stars,
    constellations,
    filters: uniqueFilters(stars),
    fallbackState: options.fallbackState ?? null,
    updatedAt: map.definition.updatedAt,
  };
}
