import { DiscoveredEntity, MapEdge, MapRelation, TopicProfile } from '../domain/types';
import { round, stableId } from './utils';

function inferSimilarity(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA.map((tag) => tag.toLowerCase()));
  const setB = new Set(tagsB.map((tag) => tag.toLowerCase()));
  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }
  const overlap = Array.from(setA).filter((tag) => setB.has(tag)).length;
  return overlap / new Set([...setA, ...setB]).size;
}

export function buildRelationships(
  mapId: string,
  profile: TopicProfile,
  entities: DiscoveredEntity[],
  nodeIdByLabel: Map<string, string>,
): MapEdge[] {
  const edges = new Map<string, Omit<MapEdge, 'id'>>();

  const upsert = (sourceLabel: string, targetLabel: string, relation: MapRelation, weight: number, confidence: number, evidence?: string) => {
    const sourceId = nodeIdByLabel.get(sourceLabel);
    const targetId = nodeIdByLabel.get(targetLabel);
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    const key = `${sourceId}:${targetId}:${relation}`;
    const current = edges.get(key);
    const candidate = {
      mapId,
      sourceId,
      targetId,
      relation,
      weight: round(weight),
      confidence: round(confidence),
      evidence,
    };

    if (!current || candidate.weight > current.weight) {
      edges.set(key, candidate);
    }
  };

  for (const entity of entities) {
    for (const relation of entity.relations) {
      upsert(entity.label, relation.target, relation.relation, relation.weight, relation.confidence, relation.evidence);
    }
  }

  for (let index = 0; index < entities.length; index += 1) {
    const source = entities[index];
    for (let targetIndex = index + 1; targetIndex < entities.length; targetIndex += 1) {
      const target = entities[targetIndex];
      const similarity = inferSimilarity(source.tags, target.tags);
      if (similarity < 0.34) {
        continue;
      }

      const relation = profile.defaultEdgeTypes.includes('similar_to') ? 'similar_to' : profile.defaultEdgeTypes[0];
      upsert(source.label, target.label, relation, 0.32 + similarity * 0.4, 0.45 + similarity * 0.3);
      upsert(target.label, source.label, relation, 0.32 + similarity * 0.4, 0.45 + similarity * 0.3);
    }
  }

  return Array.from(edges.values()).map((edge) => ({
    id: stableId('edge', mapId, edge.sourceId, edge.targetId, edge.relation),
    ...edge,
  }));
}
