import type { MapEdge, MapNode, MapResource } from '@/lib/api/educationMaps';
import type { Constellation, Star, StarType, UniverseData } from '@/data/adapters/starfieldAdapter';

const STAR_TYPES: StarType[] = ['education', 'community', 'action', 'event', 'marketplace', 'relief', 'donor'];

function typeForNode(node: MapNode, categoryOrder: number): StarType {
  if (node.entityType.includes('person')) return 'community';
  if (node.entityType.includes('technology')) return 'marketplace';
  if (node.entityType.includes('organization')) return 'community';
  if (node.entityType.includes('event')) return 'event';
  if (node.entityType.includes('place')) return 'relief';
  if (node.entityType.includes('myth')) return 'education';
  return STAR_TYPES[categoryOrder % STAR_TYPES.length];
}

export function toKnowledgeUniverse(resource: MapResource, options?: { visibleNodeIds?: Set<string> }): UniverseData {
  const visibleNodeIds = options?.visibleNodeIds;
  const categoryOrder = new Map(resource.categories.map((category, index) => [category.key, index]));
  const nodes = visibleNodeIds
    ? resource.nodes.filter((node) => visibleNodeIds.has(node.id))
    : resource.nodes;
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = resource.edges.filter((edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId));

  const stars: Star[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    z: node.position.z,
    size: Math.max(0.35, node.metrics.renderRadius / 2.6),
    color: '#8b5cf6',
    label: node.label,
    type: typeForNode(node, categoryOrder.get(node.categoryKey ?? '') ?? 0),
    metadata: {
      ...node.metadata,
      summary: node.summary,
      longDescription: node.longDescription,
      importance: node.metrics.importance,
      evidence: node.metrics.evidence,
      confidence: node.confidence.positioning,
      categoryKey: node.categoryKey,
      axisMeta: node.axisMeta,
      authoritativePosition: true,
      layoutMode: 'semantic',
    },
    connections: edges
      .filter((edge) => edge.sourceId === node.id)
      .map((edge) => edge.targetId),
  }));

  const constellations: Constellation[] = resource.categories.map((category) => ({
    id: category.key,
    name: category.label,
    starIds: stars.filter((star) => (star.metadata.categoryKey as string | undefined) === category.key).map((star) => star.id),
    color: '#8b5cf6',
    description: category.description ?? `${category.label} knowledge cluster.`,
  })).filter((constellation) => constellation.starIds.length > 0);

  return {
    stars,
    constellations,
    filters: STAR_TYPES,
  };
}

export function relatedNodesForSelection(resource: MapResource, selectedNodeId: string): Array<{
  edge: MapEdge;
  node: MapNode;
}> {
  return resource.edges
    .filter((edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId)
    .map((edge) => ({
      edge,
      node: resource.nodes.find((node) => node.id === (edge.sourceId === selectedNodeId ? edge.targetId : edge.sourceId))!,
    }))
    .filter((entry) => Boolean(entry.node));
}
