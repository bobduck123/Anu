import { CategoryDef, DiscoveredEntity, TopicProfile } from '../domain/types';
import { normalizeTopicKey, stableId } from './utils';

export const DEFAULT_TOP_LEVEL_CATEGORY_TARGET = 12;

const CATEGORY_COLORS = [
  'violet',
  'cyan',
  'amber',
  'emerald',
  'rose',
  'indigo',
  'sky',
  'teal',
  'orange',
  'fuchsia',
  'lime',
  'slate',
];

function choosePrimaryCategory(entity: DiscoveredEntity, profile: TopicProfile): string {
  if (entity.categoryHint) {
    return normalizeTopicKey(entity.categoryHint);
  }

  if (entity.tags.length > 0) {
    return normalizeTopicKey(entity.tags[0]);
  }

  return normalizeTopicKey(profile.defaultCategoryPatterns[0] ?? profile.entityType);
}

export function buildTaxonomy(
  mapId: string,
  entities: DiscoveredEntity[],
  profile: TopicProfile,
  categoryTarget = DEFAULT_TOP_LEVEL_CATEGORY_TARGET,
): {
  categories: CategoryDef[];
  categoryAssignments: Map<string, string>;
  confidence: number;
} {
  const counts = new Map<string, number>();
  const assignments = new Map<string, string>();

  for (const entity of entities) {
    const category = choosePrimaryCategory(entity, profile);
    assignments.set(entity.label, category);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const orderedKeys = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, categoryTarget)
    .map(([key]) => key);

  const fallbackKeys = profile.defaultCategoryPatterns
    .map(normalizeTopicKey)
    .filter((key) => !orderedKeys.includes(key));

  const finalKeys = [...orderedKeys, ...fallbackKeys].slice(0, categoryTarget);

  const categories: CategoryDef[] = finalKeys.map((key, index) => ({
    id: stableId('cat', mapId, key),
    mapId,
    key,
    label: key
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    colorToken: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    description: `Primary semantic category for ${profile.title}.`,
    order: index,
  }));

  const categoryKeySet = new Set(finalKeys);
  for (const entity of entities) {
    const assigned = assignments.get(entity.label);
    if (assigned && !categoryKeySet.has(assigned)) {
      assignments.set(entity.label, finalKeys[0] ?? normalizeTopicKey(profile.defaultCategoryPatterns[0] ?? profile.entityType));
    }
  }

  const confidence = entities.length === 0
    ? 0
    : Array.from(assignments.values()).filter((value) => categoryKeySet.has(value)).length / entities.length;

  return {
    categories,
    categoryAssignments: assignments,
    confidence,
  };
}
