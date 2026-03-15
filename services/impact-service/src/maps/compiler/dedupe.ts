import { DiscoveredEntity } from '../domain/types';
import { uniqueStrings } from './utils';

export function canonicalizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '');
}

export function dedupeEntities(entities: DiscoveredEntity[]): DiscoveredEntity[] {
  const merged = new Map<string, DiscoveredEntity>();

  for (const entity of entities) {
    const key = canonicalizeLabel(entity.label);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, {
        ...entity,
        aliases: uniqueStrings(entity.aliases),
        tags: uniqueStrings(entity.tags),
      });
      continue;
    }

    current.aliases = uniqueStrings([...current.aliases, entity.label, ...entity.aliases]);
    current.tags = uniqueStrings([...current.tags, ...entity.tags]);
    current.summary = current.summary ?? entity.summary;
    current.longDescription = current.longDescription ?? entity.longDescription;
    current.sources = [...current.sources, ...entity.sources];
    current.metrics = {
      importance: Math.max(current.metrics.importance ?? 0, entity.metrics.importance ?? 0),
      popularity: Math.max(current.metrics.popularity ?? 0, entity.metrics.popularity ?? 0),
      evidence: Math.max(current.metrics.evidence ?? 0, entity.metrics.evidence ?? 0),
      centrality: Math.max(current.metrics.centrality ?? 0, entity.metrics.centrality ?? 0),
      complexity: Math.max(current.metrics.complexity ?? 0, entity.metrics.complexity ?? 0),
      controversy: Math.max(current.metrics.controversy ?? 0, entity.metrics.controversy ?? 0),
      freshness: Math.max(current.metrics.freshness ?? 0, entity.metrics.freshness ?? 0),
    };
    current.relations = [...current.relations, ...entity.relations];
    current.seedAxisScores = {
      ...entity.seedAxisScores,
      ...current.seedAxisScores,
    };
    current.seedAxisExplanations = {
      ...entity.seedAxisExplanations,
      ...current.seedAxisExplanations,
    };
  }

  return Array.from(merged.values());
}
