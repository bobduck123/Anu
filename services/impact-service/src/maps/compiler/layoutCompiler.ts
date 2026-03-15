import { MapEdge, MapNode, MapPosition } from '../domain/types';
import { clamp, round } from './utils';

interface LayoutNodeInput {
  id: string;
  categoryKey?: string;
  axisScores: { x: number; y: number; z: number };
  renderRadius: number;
  pinned?: boolean;
  position?: MapPosition;
}

interface LayoutEdgeInput {
  sourceId: string;
  targetId: string;
  weight: number;
}

const SEMANTIC_SCALE = 22;
const ANCHOR_SPRING = 0.19;
const EDGE_ATTRACTION = 0.022;
const CATEGORY_COHESION = 0.012;
const COLLISION_FORCE = 0.4;
const DAMPING = 0.82;
const ITERATIONS = 56;

function magnitude(vector: MapPosition): number {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

function semanticAnchor(input: LayoutNodeInput): MapPosition {
  return {
    x: round(input.axisScores.x * SEMANTIC_SCALE),
    y: round(input.axisScores.y * SEMANTIC_SCALE),
    z: round(input.axisScores.z * SEMANTIC_SCALE),
  };
}

export function compileConstrainedLayout(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[],
): Map<string, { position: MapPosition; confidence: number; clusterId?: string }> {
  const positions = new Map<string, MapPosition>();
  const anchors = new Map<string, MapPosition>();
  const velocities = new Map<string, MapPosition>();

  const groups = new Map<string, LayoutNodeInput[]>();
  for (const node of nodes) {
    const anchor = semanticAnchor(node);
    anchors.set(node.id, anchor);
    positions.set(node.id, node.pinned && node.position ? { ...node.position } : anchor);
    velocities.set(node.id, { x: 0, y: 0, z: 0 });

    const key = node.categoryKey ?? 'uncategorized';
    const bucket = groups.get(key) ?? [];
    bucket.push(node);
    groups.set(key, bucket);
  }

  const categoryCentroids = new Map<string, MapPosition>();
  for (const [key, bucket] of groups) {
    const centroid = bucket.reduce<MapPosition>((acc, node) => {
      const anchor = anchors.get(node.id)!;
      return {
        x: acc.x + anchor.x,
        y: acc.y + anchor.y,
        z: acc.z + anchor.z,
      };
    }, { x: 0, y: 0, z: 0 });

    categoryCentroids.set(key, {
      x: centroid.x / bucket.length,
      y: centroid.y / bucket.length,
      z: centroid.z / bucket.length,
    });
  }

  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    const forces = new Map<string, MapPosition>();
    for (const node of nodes) {
      forces.set(node.id, { x: 0, y: 0, z: 0 });
    }

    for (const node of nodes) {
      const anchor = anchors.get(node.id)!;
      const position = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      if (node.pinned) {
        continue;
      }
      force.x += (anchor.x - position.x) * ANCHOR_SPRING;
      force.y += (anchor.y - position.y) * ANCHOR_SPRING;
      force.z += (anchor.z - position.z) * ANCHOR_SPRING;

      const centroid = categoryCentroids.get(node.categoryKey ?? 'uncategorized');
      if (centroid) {
        force.x += (centroid.x - position.x) * CATEGORY_COHESION;
        force.y += (centroid.y - position.y) * CATEGORY_COHESION;
        force.z += (centroid.z - position.z) * CATEGORY_COHESION;
      }
    }

    for (const edge of edges) {
      const source = positions.get(edge.sourceId);
      const target = positions.get(edge.targetId);
      if (!source || !target) {
        continue;
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;

      const sourceForce = forces.get(edge.sourceId)!;
      const targetForce = forces.get(edge.targetId)!;
      sourceForce.x += dx * EDGE_ATTRACTION * edge.weight;
      sourceForce.y += dy * EDGE_ATTRACTION * edge.weight;
      sourceForce.z += dz * EDGE_ATTRACTION * edge.weight;
      targetForce.x -= dx * EDGE_ATTRACTION * edge.weight;
      targetForce.y -= dy * EDGE_ATTRACTION * edge.weight;
      targetForce.z -= dz * EDGE_ATTRACTION * edge.weight;
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
        const other = nodes[otherIndex];
        const source = positions.get(node.id)!;
        const target = positions.get(other.id)!;

        let dx = source.x - target.x;
        let dy = source.y - target.y;
        let dz = source.z - target.z;
        const distanceSq = Math.max(dx * dx + dy * dy + dz * dz, 0.001);
        const minimumDistance = node.renderRadius + other.renderRadius + 0.6;
        const distance = Math.sqrt(distanceSq);
        if (distance >= minimumDistance) {
          continue;
        }

        const push = ((minimumDistance - distance) / minimumDistance) * COLLISION_FORCE;
        dx /= distance;
        dy /= distance;
        dz /= distance;

        const sourceForce = forces.get(node.id)!;
        const targetForce = forces.get(other.id)!;
        sourceForce.x += dx * push;
        sourceForce.y += dy * push;
        sourceForce.z += dz * push;
        targetForce.x -= dx * push;
        targetForce.y -= dy * push;
        targetForce.z -= dz * push;
      }
    }

    for (const node of nodes) {
      if (node.pinned) {
        const position = positions.get(node.id)!;
        const velocity = velocities.get(node.id)!;
        velocity.x = 0;
        velocity.y = 0;
        velocity.z = 0;
        positions.set(node.id, {
          x: round(position.x),
          y: round(position.y),
          z: round(position.z),
        });
        continue;
      }

      const velocity = velocities.get(node.id)!;
      const position = positions.get(node.id)!;
      const force = forces.get(node.id)!;

      velocity.x = (velocity.x + force.x) * DAMPING;
      velocity.y = (velocity.y + force.y) * DAMPING;
      velocity.z = (velocity.z + force.z) * DAMPING;

      position.x = round(position.x + velocity.x);
      position.y = round(position.y + velocity.y);
      position.z = round(position.z + velocity.z);
    }
  }

  const result = new Map<string, { position: MapPosition; confidence: number; clusterId?: string }>();
  for (const node of nodes) {
    const position = positions.get(node.id)!;
    const anchor = anchors.get(node.id)!;
    const offset = magnitude({
      x: position.x - anchor.x,
      y: position.y - anchor.y,
      z: position.z - anchor.z,
    });
    result.set(node.id, {
      position,
      confidence: round(clamp(1 - offset / 18, 0.35, 0.96)),
      clusterId: node.categoryKey ? `cluster:${node.categoryKey}` : undefined,
    });
  }

  return result;
}

export function layoutInputsFromNodes(
  nodes: Array<Pick<MapNode, 'id' | 'categoryKey' | 'axisScores' | 'metrics' | 'pinned' | 'position'>>,
  edges: Array<Pick<MapEdge, 'sourceId' | 'targetId' | 'weight'>>,
): Map<string, { position: MapPosition; confidence: number; clusterId?: string }> {
  return compileConstrainedLayout(
    nodes.map((node) => ({
      id: node.id,
      categoryKey: node.categoryKey,
      axisScores: node.axisScores,
      renderRadius: node.metrics.renderRadius,
      pinned: node.pinned,
      position: node.position,
    })),
    edges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      weight: edge.weight,
    })),
  );
}
