import { MapArchetype, SeedCorpus, TopicProfile } from '../domain/types';
import { buildTopicProfile } from './archetypes';
import { normalizeTopicKey, toTitleCase } from './utils';

const ARCHETYPE_KEYWORDS: Array<{ archetype: MapArchetype; terms: string[] }> = [
  { archetype: 'myth', terms: ['deit', 'god', 'goddess', 'myth', 'pantheon', 'ritual'] },
  { archetype: 'technology', terms: ['software', 'protocol', 'architecture', 'platform', 'system', 'stack'] },
  { archetype: 'organization', terms: ['organization', 'movement', 'institution', 'collective', 'association'] },
  { archetype: 'place', terms: ['city', 'region', 'temple', 'site', 'place', 'kingdom'] },
  { archetype: 'event', terms: ['war', 'event', 'conference', 'festival', 'revolt', 'crisis'] },
  { archetype: 'ecosystem', terms: ['ecosystem', 'forest', 'river', 'habitat', 'species'] },
  { archetype: 'person', terms: ['person', 'biography', 'philosopher', 'leader', 'author'] },
  { archetype: 'theory', terms: ['theory', 'framework', 'school', 'thought', 'model'] },
];

function inferArchetype(topic: string): MapArchetype {
  const lower = topic.toLowerCase();
  for (const entry of ARCHETYPE_KEYWORDS) {
    if (entry.terms.some((term) => lower.includes(term))) {
      return entry.archetype;
    }
  }

  return 'theory';
}

export function profileTopic(topic: string, seed?: SeedCorpus): TopicProfile {
  const normalizedTopic = topic.trim();
  const topicKey = normalizeTopicKey(seed?.topicKey ?? normalizedTopic);
  const title = seed?.title ?? toTitleCase(normalizedTopic);
  const archetype = seed?.archetype ?? inferArchetype(normalizedTopic);

  return buildTopicProfile({
    topic: normalizedTopic,
    topicKey,
    title,
    archetype,
  });
}
