import { deriveUniversePlacement } from './placement';
import type {
  UniverseConstellation,
  UniverseDomainContext,
  UniversePacket,
  UniversePlacementAxisReasoning,
  UniverseStar,
  UniverseStarType,
} from './types';

const GLOBAL_AXES: UniverseDomainContext['semanticAxes'] = [
  { key: 'x', label: 'Meaning', minLabel: 'Fragment', maxLabel: 'Orientation' },
  { key: 'y', label: 'Materiality', minLabel: 'Idea', maxLabel: 'Action' },
  { key: 'z', label: 'Governance', minLabel: 'Open', maxLabel: 'Constrained' },
];

interface DemoStarConfig {
  id: string;
  label: string;
  type: UniverseStarType;
  color: string;
  summary: string;
  categoryLabel: string;
  tags: string[];
  aliases?: string[];
  relations?: string[];
  evidence: number;
  freshness: number;
  sourceDensity: number;
  importance: number;
  centrality: number;
  controversy?: number;
  axisScores: { x: number; y: number; z: number };
  axisReasoning: UniversePlacementAxisReasoning[];
  source?: {
    url: string;
    title: string;
    domain?: string;
    snippet?: string;
  };
}

function buildDemoStar(config: DemoStarConfig, constellationIds: string[]): UniverseStar {
  const placement = deriveUniversePlacement({
    seed: config.id,
    axisScores: config.axisScores,
    axisReasoning: config.axisReasoning,
    evidence: config.evidence,
    freshness: config.freshness,
    sourceDensity: config.sourceDensity,
    importance: config.importance,
    centrality: config.centrality,
    controversy: config.controversy ?? 0,
  });

  return {
    id: config.id,
    label: config.label,
    type: config.type,
    color: config.color,
    size: 1.25 + config.importance * 1.6,
    coordinates: placement.finalCoordinates,
    connections: config.relations ?? [],
    constellationIds,
    placement,
    explainer: {
      title: config.label,
      summary: config.summary,
      categoryLabel: config.categoryLabel,
      starTypeLabel: config.type,
      domainLabel: 'Manara',
      scopeLabel: config.categoryLabel,
      metrics: {
        evidence: config.evidence,
        freshness: config.freshness,
        sourceDensity: config.sourceDensity,
        importance: config.importance,
        centrality: config.centrality,
        controversy: config.controversy ?? 0,
      },
      placementRationale: placement.rationale,
      axisReasoning: placement.axisReasoning,
      primarySource: config.source
        ? {
            id: `${config.id}-source`,
            ...config.source,
          }
        : undefined,
      sources: config.source
        ? [
            {
              id: `${config.id}-source`,
              ...config.source,
            },
          ]
        : [],
      tags: config.tags,
      aliases: config.aliases ?? [],
    },
    metadata: {
      participants: Math.round(12 + config.sourceDensity * 40),
      impact: Math.round((config.importance * 55 + config.evidence * 45) * 100),
    },
  };
}

function buildPacket(
  id: string,
  title: string,
  description: string,
  scopeLabel: string,
  stars: UniverseStar[],
  constellations: UniverseConstellation[],
): UniversePacket {
  return {
    id,
    title,
    description,
    domain: {
      key: id,
      title,
      description,
      surface: id === 'community-demo-universe' ? 'community' : id === 'global-demo-universe' ? 'universe' : 'education',
      scopeLabel,
      semanticAxes: GLOBAL_AXES,
    },
    stars,
    constellations,
    filters: ['education', 'community', 'event', 'action', 'donor', 'relief', 'marketplace'],
    fallbackState: {
      active: true,
      mode: 'demo',
      label: 'Local demo packet',
      message: 'This surface is rendering a deterministic local universe packet so the ontology stays alive while live services are absent.',
      source: 'local',
    },
  };
}

export function getEducationDemoUniversePacket(): UniversePacket {
  const constellations: UniverseConstellation[] = [
    {
      id: 'education-memory',
      name: 'Cultural memory',
      description: 'Stars that carry historical depth, evidence, and civilizational continuity.',
      color: '#80d6ff',
      starIds: ['edu-memory', 'edu-philosophy', 'edu-governance'],
    },
    {
      id: 'education-action',
      name: 'Learning into action',
      description: 'Stars that link ideas to practice, institutions, and campaigns.',
      color: '#c29bff',
      starIds: ['edu-practice', 'edu-logistics', 'edu-community'],
    },
  ];

  const stars = [
    buildDemoStar(
      {
        id: 'edu-memory',
        label: 'Civilizational memory',
        type: 'education',
        color: '#80d6ff',
        summary: 'A stable anchor for historical depth, philosophy, and long-range continuity inside the Manara learning universe.',
        categoryLabel: 'Cultural memory',
        tags: ['history', 'memory', 'continuity'],
        relations: ['edu-philosophy', 'edu-community'],
        evidence: 0.82,
        freshness: 0.55,
        sourceDensity: 0.64,
        importance: 0.84,
        centrality: 0.77,
        axisScores: { x: 0.9, y: 0.38, z: 0.52 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.9, explanation: 'Anchors long-range orientation rather than tactical detail.', confidence: 0.88 },
          { key: 'y', label: 'Materiality', score: 0.38, explanation: 'Begins as knowledge before routing into practice.', confidence: 0.73 },
          { key: 'z', label: 'Governance', score: 0.52, explanation: 'Informs governance without being reducible to bureaucracy.', confidence: 0.7 },
        ],
        source: {
          url: '/education',
          title: 'Manara education domain',
          snippet: 'Entry point into the Manara learning field.',
        },
      },
      ['education-memory'],
    ),
    buildDemoStar(
      {
        id: 'edu-philosophy',
        label: 'Philosophical pathways',
        type: 'education',
        color: '#9bc8ff',
        summary: 'Guided conceptual pathways that connect schools of thought to civic and practical consequences.',
        categoryLabel: 'Cultural memory',
        tags: ['philosophy', 'pathways', 'interpretation'],
        relations: ['edu-practice', 'edu-governance'],
        evidence: 0.78,
        freshness: 0.62,
        sourceDensity: 0.7,
        importance: 0.76,
        centrality: 0.72,
        axisScores: { x: 0.84, y: 0.42, z: 0.46 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.84, explanation: 'Acts as a high-orientation knowledge star.', confidence: 0.83 },
          { key: 'y', label: 'Materiality', score: 0.42, explanation: 'Connects to action indirectly through pathways and institutions.', confidence: 0.68 },
          { key: 'z', label: 'Governance', score: 0.46, explanation: 'Shapes governance questions without becoming a control surface.', confidence: 0.67 },
        ],
        source: {
          url: '/universe',
          title: 'Manara universe overview',
        },
      },
      ['education-memory'],
    ),
    buildDemoStar(
      {
        id: 'edu-governance',
        label: 'Governance literacy',
        type: 'community',
        color: '#7df0d4',
        summary: 'The interpretive bridge between knowledge, institutions, and the rules that shape collective action.',
        categoryLabel: 'Cultural memory',
        tags: ['governance', 'civics', 'institutions'],
        relations: ['edu-logistics'],
        evidence: 0.75,
        freshness: 0.72,
        sourceDensity: 0.58,
        importance: 0.8,
        centrality: 0.81,
        axisScores: { x: 0.72, y: 0.58, z: 0.78 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.72, explanation: 'Explains why institutions exist and how they can change.', confidence: 0.78 },
          { key: 'y', label: 'Materiality', score: 0.58, explanation: 'Connects directly to processes, roles, and practical collaboration.', confidence: 0.74 },
          { key: 'z', label: 'Governance', score: 0.78, explanation: 'Sits high on the governance axis because it mediates permissions and trust.', confidence: 0.88 },
        ],
        source: {
          url: '/governance',
          title: 'Governance surfaces',
        },
      },
      ['education-memory', 'education-action'],
    ),
    buildDemoStar(
      {
        id: 'edu-practice',
        label: 'Applied pathways',
        type: 'action',
        color: '#f4c35a',
        summary: 'Turns learning into events, tasks, campaigns, and live collaboration loops.',
        categoryLabel: 'Learning into action',
        tags: ['practice', 'tasks', 'campaigns'],
        relations: ['edu-community', 'edu-logistics'],
        evidence: 0.69,
        freshness: 0.77,
        sourceDensity: 0.55,
        importance: 0.73,
        centrality: 0.69,
        axisScores: { x: 0.58, y: 0.82, z: 0.52 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.58, explanation: 'Keeps conceptual grounding while prioritizing practical next steps.', confidence: 0.69 },
          { key: 'y', label: 'Materiality', score: 0.82, explanation: 'Lives close to action, participation, and task execution.', confidence: 0.9 },
          { key: 'z', label: 'Governance', score: 0.52, explanation: 'Requires governance contact but does not sit inside the control plane.', confidence: 0.66 },
        ],
        source: {
          url: '/actions',
          title: 'Action pathways',
        },
      },
      ['education-action'],
    ),
    buildDemoStar(
      {
        id: 'edu-logistics',
        label: 'Institutional logistics',
        type: 'event',
        color: '#ff9f6d',
        summary: 'Material constraints, events, scheduling, and approvals that connect knowledge to the world as it actually moves.',
        categoryLabel: 'Learning into action',
        tags: ['logistics', 'events', 'institutions'],
        relations: ['edu-community'],
        evidence: 0.66,
        freshness: 0.81,
        sourceDensity: 0.5,
        importance: 0.71,
        centrality: 0.74,
        axisScores: { x: 0.42, y: 0.9, z: 0.74 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.42, explanation: 'Prioritizes execution clarity over abstract interpretation.', confidence: 0.65 },
          { key: 'y', label: 'Materiality', score: 0.9, explanation: 'Strongly grounded in scheduling, resourcing, and real-world follow-through.', confidence: 0.92 },
          { key: 'z', label: 'Governance', score: 0.74, explanation: 'Crosses into approvals and institutional constraint.', confidence: 0.8 },
        ],
        source: {
          url: '/calendar',
          title: 'Calendar and coordination',
        },
      },
      ['education-action'],
    ),
    buildDemoStar(
      {
        id: 'edu-community',
        label: 'Learning community',
        type: 'community',
        color: '#66e0b8',
        summary: 'The social layer where knowledge pathways, belonging, and action loops reinforce each other.',
        categoryLabel: 'Learning into action',
        tags: ['community', 'belonging', 'learning'],
        relations: ['edu-governance'],
        evidence: 0.7,
        freshness: 0.8,
        sourceDensity: 0.62,
        importance: 0.79,
        centrality: 0.76,
        axisScores: { x: 0.67, y: 0.76, z: 0.58 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.67, explanation: 'Keeps educational purpose visible inside the social layer.', confidence: 0.74 },
          { key: 'y', label: 'Materiality', score: 0.76, explanation: 'Routes learning into community participation and live action.', confidence: 0.83 },
          { key: 'z', label: 'Governance', score: 0.58, explanation: 'Touches governance through moderation, trust, and roles.', confidence: 0.69 },
        ],
        source: {
          url: '/community',
          title: 'Community surface',
        },
      },
      ['education-action'],
    ),
  ];

  return buildPacket(
    'education-demo-universe',
    'Manara Learning Universe Demo',
    'Deterministic fallback packet for education slices when live services are not available.',
    'education',
    stars,
    constellations,
  );
}

export function getCommunityDemoUniversePacket(): UniversePacket {
  const constellations: UniverseConstellation[] = [
    {
      id: 'community-care',
      name: 'Care loops',
      description: 'Mutual support, local response, and contribution pathways.',
      color: '#6fe5ff',
      starIds: ['community-care', 'community-volunteers', 'community-donors'],
    },
    {
      id: 'community-action',
      name: 'Action loops',
      description: 'Stories, venues, and campaigns that turn social energy into visible work.',
      color: '#ffb56b',
      starIds: ['community-stories', 'community-venue', 'community-campaign'],
    },
  ];

  const stars = [
    buildDemoStar(
      {
        id: 'community-care',
        label: 'Mutual aid mesh',
        type: 'relief',
        color: '#6fe5ff',
        summary: 'A resilient care layer that keeps the world alive locally even when upstream services are unstable.',
        categoryLabel: 'Care loops',
        tags: ['mutual-aid', 'care', 'fallback'],
        relations: ['community-volunteers', 'community-donors'],
        evidence: 0.71,
        freshness: 0.82,
        sourceDensity: 0.48,
        importance: 0.84,
        centrality: 0.75,
        axisScores: { x: 0.66, y: 0.88, z: 0.52 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.66, explanation: 'Keeps the social story coherent instead of transactional.', confidence: 0.73 },
          { key: 'y', label: 'Materiality', score: 0.88, explanation: 'Highly grounded in practical help and care delivery.', confidence: 0.9 },
          { key: 'z', label: 'Governance', score: 0.52, explanation: 'Requires trust rules without becoming fully bureaucratic.', confidence: 0.64 },
        ],
        source: {
          url: '/relief',
          title: 'Relief and care pathways',
        },
      },
      ['community-care'],
    ),
    buildDemoStar(
      {
        id: 'community-volunteers',
        label: 'Volunteer pathways',
        type: 'action',
        color: '#79f3af',
        summary: 'Role-based entry into campaigns, events, and recurring contribution loops.',
        categoryLabel: 'Care loops',
        tags: ['volunteers', 'roles', 'tasks'],
        relations: ['community-campaign', 'community-venue'],
        evidence: 0.67,
        freshness: 0.78,
        sourceDensity: 0.5,
        importance: 0.72,
        centrality: 0.73,
        axisScores: { x: 0.55, y: 0.86, z: 0.48 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.55, explanation: 'Carries purpose through service and role clarity.', confidence: 0.68 },
          { key: 'y', label: 'Materiality', score: 0.86, explanation: 'Lives close to scheduling, presence, and follow-through.', confidence: 0.88 },
          { key: 'z', label: 'Governance', score: 0.48, explanation: 'Needs light governance to stay trustworthy.', confidence: 0.63 },
        ],
        source: {
          url: '/community',
          title: 'Community participation',
        },
      },
      ['community-care', 'community-action'],
    ),
    buildDemoStar(
      {
        id: 'community-donors',
        label: 'Donor circle',
        type: 'donor',
        color: '#ffe06d',
        summary: 'Transparent support routing that connects generosity to visible care and action.',
        categoryLabel: 'Care loops',
        tags: ['donors', 'support', 'routing'],
        relations: ['community-care'],
        evidence: 0.62,
        freshness: 0.74,
        sourceDensity: 0.41,
        importance: 0.7,
        centrality: 0.59,
        axisScores: { x: 0.48, y: 0.72, z: 0.68 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.48, explanation: 'Support is grounded more in routing than in theory.', confidence: 0.59 },
          { key: 'y', label: 'Materiality', score: 0.72, explanation: 'Directly affects resources, viability, and continuity.', confidence: 0.78 },
          { key: 'z', label: 'Governance', score: 0.68, explanation: 'Requires rules for allocation, visibility, and trust.', confidence: 0.74 },
        ],
        source: {
          url: '/pools',
          title: 'Public pools and support',
        },
      },
      ['community-care'],
    ),
    buildDemoStar(
      {
        id: 'community-stories',
        label: 'Story channel',
        type: 'community',
        color: '#8cc2ff',
        summary: 'Public storytelling and cultural memory that stop the community layer from feeling like a dead queue.',
        categoryLabel: 'Action loops',
        tags: ['stories', 'publishing', 'memory'],
        relations: ['community-campaign'],
        evidence: 0.58,
        freshness: 0.86,
        sourceDensity: 0.46,
        importance: 0.65,
        centrality: 0.67,
        axisScores: { x: 0.74, y: 0.46, z: 0.4 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.74, explanation: 'Holds cultural interpretation and public narrative.', confidence: 0.77 },
          { key: 'y', label: 'Materiality', score: 0.46, explanation: 'Touches material action indirectly by shaping participation.', confidence: 0.58 },
          { key: 'z', label: 'Governance', score: 0.4, explanation: 'Mostly open, with moderation rather than heavy bureaucracy.', confidence: 0.61 },
        ],
        source: {
          url: '/community',
          title: 'Community stories',
        },
      },
      ['community-action'],
    ),
    buildDemoStar(
      {
        id: 'community-venue',
        label: 'Venue ecosystem',
        type: 'event',
        color: '#ffb56b',
        summary: 'The real-world layer of places, access, and event logistics that hosts community life.',
        categoryLabel: 'Action loops',
        tags: ['venues', 'events', 'places'],
        relations: ['community-campaign'],
        evidence: 0.61,
        freshness: 0.76,
        sourceDensity: 0.44,
        importance: 0.7,
        centrality: 0.72,
        axisScores: { x: 0.4, y: 0.92, z: 0.64 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.4, explanation: 'This star is mostly material and logistical.', confidence: 0.64 },
          { key: 'y', label: 'Materiality', score: 0.92, explanation: 'Strongly tied to places, access, and operations.', confidence: 0.93 },
          { key: 'z', label: 'Governance', score: 0.64, explanation: 'Touches permits, scheduling, and institutional coordination.', confidence: 0.75 },
        ],
        source: {
          url: '/events',
          title: 'Events and venues',
        },
      },
      ['community-action'],
    ),
    buildDemoStar(
      {
        id: 'community-campaign',
        label: 'Campaign engine',
        type: 'action',
        color: '#ffcf7c',
        summary: 'Where stories, venues, volunteers, and support converge into visible campaigns and quests.',
        categoryLabel: 'Action loops',
        tags: ['campaigns', 'quests', 'coordination'],
        relations: ['community-care', 'community-stories'],
        evidence: 0.64,
        freshness: 0.81,
        sourceDensity: 0.52,
        importance: 0.77,
        centrality: 0.83,
        axisScores: { x: 0.58, y: 0.89, z: 0.6 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.58, explanation: 'Keeps mission coherence while staying action-focused.', confidence: 0.68 },
          { key: 'y', label: 'Materiality', score: 0.89, explanation: 'Routes directly into campaigns, tasks, and outcomes.', confidence: 0.91 },
          { key: 'z', label: 'Governance', score: 0.6, explanation: 'Needs approvals and trust boundaries without killing momentum.', confidence: 0.72 },
        ],
        source: {
          url: '/quests',
          title: 'Action loops',
        },
      },
      ['community-action'],
    ),
  ];

  return buildPacket(
    'community-demo-universe',
    'Manara Community Universe Demo',
    'Deterministic fallback packet for community slices when live feeds are empty or unavailable.',
    'community',
    stars,
    constellations,
  );
}

export function getGlobalUniverseDemoPacket(): UniversePacket {
  const constellations: UniverseConstellation[] = [
    {
      id: 'global-heaven',
      name: 'Heaven',
      description: 'Learning, meaning, memory, and orientation.',
      color: '#8bc5ff',
      starIds: ['global-learning', 'global-memory'],
    },
    {
      id: 'global-earth',
      name: 'Earth',
      description: 'Places, campaigns, logistics, and material coordination.',
      color: '#88f0a2',
      starIds: ['global-logistics', 'global-community'],
    },
    {
      id: 'global-hell',
      name: 'Hell',
      description: 'Approvals, blockers, dependencies, and institutional drag.',
      color: '#ffb275',
      starIds: ['global-friction'],
    },
    {
      id: 'global-god',
      name: 'Constitution',
      description: 'Meta-governance, visibility rules, and constrained optimization.',
      color: '#f8d36a',
      starIds: ['global-constitution'],
    },
  ];

  const stars = [
    buildDemoStar(
      {
        id: 'global-learning',
        label: 'Learning field',
        type: 'education',
        color: '#8bc5ff',
        summary: 'The knowledge universe where ideas, sources, and pathways remain inspectable.',
        categoryLabel: 'Heaven',
        tags: ['learning', 'orientation'],
        relations: ['global-memory', 'global-community'],
        evidence: 0.76,
        freshness: 0.67,
        sourceDensity: 0.58,
        importance: 0.85,
        centrality: 0.8,
        axisScores: { x: 0.91, y: 0.34, z: 0.44 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.91, explanation: 'Defines orientation and interpretive coherence.', confidence: 0.9 },
          { key: 'y', label: 'Materiality', score: 0.34, explanation: 'Starts in the knowledge layer before moving into action.', confidence: 0.69 },
          { key: 'z', label: 'Governance', score: 0.44, explanation: 'Governed lightly until it intersects with shared rules.', confidence: 0.63 },
        ],
        source: { url: '/education/maps', title: 'Education maps' },
      },
      ['global-heaven'],
    ),
    buildDemoStar(
      {
        id: 'global-memory',
        label: 'Cultural memory',
        type: 'education',
        color: '#6fa4ff',
        summary: 'Historical depth and story continuity that keep the universe from collapsing into a dashboard.',
        categoryLabel: 'Heaven',
        tags: ['memory', 'history', 'myth'],
        relations: ['global-constitution'],
        evidence: 0.72,
        freshness: 0.53,
        sourceDensity: 0.61,
        importance: 0.79,
        centrality: 0.69,
        axisScores: { x: 0.88, y: 0.29, z: 0.55 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.88, explanation: 'Carries long-range orientation and identity.', confidence: 0.87 },
          { key: 'y', label: 'Materiality', score: 0.29, explanation: 'Acts indirectly through narrative and memory.', confidence: 0.62 },
          { key: 'z', label: 'Governance', score: 0.55, explanation: 'Shapes legitimacy and institutional imagination.', confidence: 0.68 },
        ],
        source: { url: '/universe', title: 'Universe overview' },
      },
      ['global-heaven'],
    ),
    buildDemoStar(
      {
        id: 'global-community',
        label: 'Coordination commons',
        type: 'community',
        color: '#88f0a2',
        summary: 'The layer where people, venues, campaigns, and contribution loops meet.',
        categoryLabel: 'Earth',
        tags: ['community', 'coordination'],
        relations: ['global-logistics', 'global-friction'],
        evidence: 0.67,
        freshness: 0.81,
        sourceDensity: 0.54,
        importance: 0.82,
        centrality: 0.86,
        axisScores: { x: 0.63, y: 0.82, z: 0.56 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.63, explanation: 'Still carries social meaning, not just throughput.', confidence: 0.71 },
          { key: 'y', label: 'Materiality', score: 0.82, explanation: 'Grounded in people, roles, and local action.', confidence: 0.87 },
          { key: 'z', label: 'Governance', score: 0.56, explanation: 'Touches trust and permissions without sitting fully inside them.', confidence: 0.68 },
        ],
        source: { url: '/community', title: 'Community' },
      },
      ['global-earth'],
    ),
    buildDemoStar(
      {
        id: 'global-logistics',
        label: 'Material logistics',
        type: 'event',
        color: '#b4ffa3',
        summary: 'Places, events, tasks, and dependencies that make the world changeable.',
        categoryLabel: 'Earth',
        tags: ['logistics', 'tasks', 'events'],
        relations: ['global-friction'],
        evidence: 0.65,
        freshness: 0.83,
        sourceDensity: 0.46,
        importance: 0.78,
        centrality: 0.74,
        axisScores: { x: 0.36, y: 0.94, z: 0.67 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.36, explanation: 'Exists mainly to operationalize change.', confidence: 0.61 },
          { key: 'y', label: 'Materiality', score: 0.94, explanation: 'Sits very close to the world of matter, labor, and scheduling.', confidence: 0.94 },
          { key: 'z', label: 'Governance', score: 0.67, explanation: 'Crosses into approvals and dependencies.', confidence: 0.76 },
        ],
        source: { url: '/calendar', title: 'Calendar and logistics' },
      },
      ['global-earth'],
    ),
    buildDemoStar(
      {
        id: 'global-friction',
        label: 'Bureaucratic friction',
        type: 'action',
        color: '#ffb275',
        summary: 'Administrative drag, approvals, and blocker chains that must become navigable instead of soul-killing.',
        categoryLabel: 'Hell',
        tags: ['approvals', 'bureaucracy', 'blockers'],
        relations: ['global-constitution'],
        evidence: 0.63,
        freshness: 0.74,
        sourceDensity: 0.43,
        importance: 0.83,
        centrality: 0.7,
        controversy: 0.42,
        axisScores: { x: 0.31, y: 0.88, z: 0.93 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.31, explanation: 'This star exists to expose friction rather than inspire orientation.', confidence: 0.66 },
          { key: 'y', label: 'Materiality', score: 0.88, explanation: 'Shows up in processes, dependencies, and resource bottlenecks.', confidence: 0.88 },
          { key: 'z', label: 'Governance', score: 0.93, explanation: 'Lives deep in the rules and approvals layer.', confidence: 0.92 },
        ],
        source: { url: '/governance', title: 'Governance' },
      },
      ['global-hell'],
    ),
    buildDemoStar(
      {
        id: 'global-constitution',
        label: 'Constitutional layer',
        type: 'community',
        color: '#f8d36a',
        summary: 'The meta-governance layer that constrains power, visibility, spending, and automation.',
        categoryLabel: 'Constitution',
        tags: ['constitution', 'meta-governance', 'trust'],
        relations: ['global-learning', 'global-community'],
        evidence: 0.81,
        freshness: 0.69,
        sourceDensity: 0.52,
        importance: 0.91,
        centrality: 0.88,
        axisScores: { x: 0.74, y: 0.62, z: 0.98 },
        axisReasoning: [
          { key: 'x', label: 'Meaning', score: 0.74, explanation: 'Defines what the system is allowed to optimize.', confidence: 0.84 },
          { key: 'y', label: 'Materiality', score: 0.62, explanation: 'Still affects real spending, access, and action routing.', confidence: 0.76 },
          { key: 'z', label: 'Governance', score: 0.98, explanation: 'Sits at the highest governance depth in the shared universe.', confidence: 0.96 },
        ],
        source: { url: '/governance/sovereignty', title: 'Governance sovereignty' },
      },
      ['global-god'],
    ),
  ];

  return buildPacket(
    'global-demo-universe',
    'Manara Shared Universe Demo',
    'Deterministic fallback packet spanning learning, logistics, bureaucracy, and constitutional control.',
    'universe',
    stars,
    constellations,
  );
}

export function getFallbackUniversePacket(kind: 'education' | 'community' | 'global'): UniversePacket {
  if (kind === 'community') {
    return getCommunityDemoUniversePacket();
  }

  if (kind === 'global') {
    return getGlobalUniverseDemoPacket();
  }

  return getEducationDemoUniversePacket();
}
