import { AxisTemplate, MapArchetype, MapRelation, TopicProfile } from '../domain/types';

const AXES: Record<MapArchetype, AxisTemplate[]> = {
  theory: [
    {
      key: 'x',
      label: 'Ontology',
      minLabel: 'Material',
      maxLabel: 'Metaphysical',
      description: 'How materially or metaphysically the theory frames reality.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Scope',
      minLabel: 'Local',
      maxLabel: 'Universal',
      description: 'The breadth of the theory’s intended explanatory reach.',
      scoringMethod: 'rubric',
    },
    {
      key: 'z',
      label: 'Evidence',
      minLabel: 'Speculative',
      maxLabel: 'Empirical',
      description: 'How directly sources frame the theory as evidence-driven.',
      scoringMethod: 'derived',
    },
  ],
  organization: [
    {
      key: 'x',
      label: 'Institutionality',
      minLabel: 'Grassroots',
      maxLabel: 'Institutional',
      description: 'Whether the organization is framed as community-led or formalized.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Scale',
      minLabel: 'Local',
      maxLabel: 'Global',
      description: 'The organization’s operating reach.',
      scoringMethod: 'rubric',
    },
    {
      key: 'z',
      label: 'Stability',
      minLabel: 'Experimental',
      maxLabel: 'Stable',
      description: 'How stable or established the organization appears in sources.',
      scoringMethod: 'derived',
    },
  ],
  technology: [
    {
      key: 'x',
      label: 'Control',
      minLabel: 'Centralized',
      maxLabel: 'Decentralized',
      description: 'Whether the technology concentrates or distributes control.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Maturity',
      minLabel: 'Prototype',
      maxLabel: 'Production',
      description: 'How deployable the technology is today.',
      scoringMethod: 'derived',
    },
    {
      key: 'z',
      label: 'Complexity',
      minLabel: 'Simple',
      maxLabel: 'Complex',
      description: 'The implementation and conceptual complexity.',
      scoringMethod: 'rubric',
    },
  ],
  place: [
    {
      key: 'x',
      label: 'Scale',
      minLabel: 'Local',
      maxLabel: 'Transregional',
      description: 'Whether a place is local or connected to a wider region.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Elevation',
      minLabel: 'Earthbound',
      maxLabel: 'Sacralized',
      description: 'How mundane or sacralized the place is framed in sources.',
      scoringMethod: 'derived',
    },
    {
      key: 'z',
      label: 'Continuity',
      minLabel: 'Ephemeral',
      maxLabel: 'Enduring',
      description: 'The durability of the place’s significance over time.',
      scoringMethod: 'derived',
    },
  ],
  event: [
    {
      key: 'x',
      label: 'Reach',
      minLabel: 'Localized',
      maxLabel: 'Regional',
      description: 'The spread of the event’s impact.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Cadence',
      minLabel: 'One-off',
      maxLabel: 'Recurring',
      description: 'Whether the event is singular or cyclical.',
      scoringMethod: 'rubric',
    },
    {
      key: 'z',
      label: 'Documentation',
      minLabel: 'Sparse',
      maxLabel: 'Rich',
      description: 'The density of documentary evidence.',
      scoringMethod: 'derived',
    },
  ],
  myth: [
    {
      key: 'x',
      label: 'Territory',
      minLabel: 'Local',
      maxLabel: 'Transregional',
      description: 'How local or widely shared the mythic figure is.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Realm',
      minLabel: 'Earthly',
      maxLabel: 'Celestial',
      description: 'The mythic realm most associated with the figure.',
      scoringMethod: 'rubric',
    },
    {
      key: 'z',
      label: 'Orientation',
      minLabel: 'Practical',
      maxLabel: 'Cosmological',
      description: 'Whether sources frame the figure through practical rituals or cosmic meaning.',
      scoringMethod: 'rubric',
    },
  ],
  ecosystem: [
    {
      key: 'x',
      label: 'Scale',
      minLabel: 'Micro',
      maxLabel: 'Bioregional',
      description: 'The ecological scale under consideration.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Interdependence',
      minLabel: 'Isolated',
      maxLabel: 'Interdependent',
      description: 'How interdependent the ecosystem appears in sources.',
      scoringMethod: 'derived',
    },
    {
      key: 'z',
      label: 'Fragility',
      minLabel: 'Robust',
      maxLabel: 'Fragile',
      description: 'The ecosystem’s sensitivity to disruption.',
      scoringMethod: 'derived',
    },
  ],
  person: [
    {
      key: 'x',
      label: 'Sphere',
      minLabel: 'Local',
      maxLabel: 'Global',
      description: 'The reach of the person’s influence.',
      scoringMethod: 'rubric',
    },
    {
      key: 'y',
      label: 'Role',
      minLabel: 'Practitioner',
      maxLabel: 'Symbol',
      description: 'Whether the person is framed as a direct actor or symbolic figure.',
      scoringMethod: 'rubric',
    },
    {
      key: 'z',
      label: 'Documentation',
      minLabel: 'Sparse',
      maxLabel: 'Documented',
      description: 'The density of evidence attached to the person.',
      scoringMethod: 'derived',
    },
  ],
};

const SOURCE_CLASSES: Record<MapArchetype, string[]> = {
  theory: ['reference', 'bibliography', 'survey', 'encyclopedia'],
  organization: ['directory', 'about', 'governance', 'reports'],
  technology: ['documentation', 'specification', 'case_study', 'reference'],
  place: ['gazetteer', 'atlas', 'reference', 'field_guide'],
  event: ['timeline', 'archive', 'report', 'news_archive'],
  myth: ['mythography', 'encyclopedia', 'reference', 'ritual_index'],
  ecosystem: ['field_guide', 'taxonomy', 'atlas', 'reference'],
  person: ['biography', 'reference', 'archive', 'bibliography'],
};

const CATEGORY_PATTERNS: Record<MapArchetype, string[]> = {
  theory: ['schools', 'lineages', 'methods', 'critics', 'applications'],
  organization: ['actors', 'funding', 'governance', 'programs', 'regions'],
  technology: ['patterns', 'protocols', 'adopters', 'tradeoffs', 'infrastructure'],
  place: ['regions', 'sites', 'routes', 'cult_centers', 'landmarks'],
  event: ['phases', 'actors', 'causes', 'effects', 'sources'],
  myth: ['deities', 'rituals', 'symbols', 'sites', 'lineages'],
  ecosystem: ['species', 'flows', 'habitats', 'pressures', 'regenerators'],
  person: ['works', 'teachers', 'students', 'movements', 'critics'],
};

const EDGE_TYPES: Record<MapArchetype, MapRelation[]> = {
  theory: ['influences', 'contradicts', 'extends', 'derived_from', 'similar_to'],
  organization: ['belongs_to', 'influences', 'derived_from', 'co_occurs_with', 'similar_to'],
  technology: ['extends', 'derived_from', 'contradicts', 'similar_to', 'influences'],
  place: ['belongs_to', 'co_occurs_with', 'derived_from', 'similar_to', 'influences'],
  event: ['influences', 'derived_from', 'co_occurs_with', 'belongs_to', 'similar_to'],
  myth: ['belongs_to', 'derived_from', 'similar_to', 'co_occurs_with', 'influences'],
  ecosystem: ['belongs_to', 'co_occurs_with', 'influences', 'derived_from', 'similar_to'],
  person: ['influences', 'contradicts', 'extends', 'belongs_to', 'similar_to'],
};

const ENTITY_TYPES: Record<MapArchetype, string> = {
  theory: 'concept',
  organization: 'organization',
  technology: 'technology',
  place: 'place',
  event: 'event',
  myth: 'mythic_entity',
  ecosystem: 'ecosystem_entity',
  person: 'person',
};

export function buildTopicProfile(input: {
  topic: string;
  topicKey: string;
  title: string;
  archetype: MapArchetype;
}): TopicProfile {
  return {
    topic: input.topic,
    topicKey: input.topicKey,
    title: input.title,
    archetype: input.archetype,
    entityType: ENTITY_TYPES[input.archetype],
    likelySourceClasses: SOURCE_CLASSES[input.archetype],
    defaultCategoryPatterns: CATEGORY_PATTERNS[input.archetype],
    axisTemplates: AXES[input.archetype],
    defaultEdgeTypes: EDGE_TYPES[input.archetype],
  };
}
