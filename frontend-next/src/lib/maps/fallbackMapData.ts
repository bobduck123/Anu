import { MapDefinition, MapRelation, MapResource, MapStatus } from '@/lib/api/educationMaps';

type AxisSeed = {
  key: 'x' | 'y' | 'z';
  label: string;
  minLabel: string;
  maxLabel: string;
  description: string;
};

type CategorySeed = {
  key: string;
  label: string;
  colorToken: string;
  description: string;
  order: number;
};

type NodeSeed = {
  key: string;
  label: string;
  aliases?: string[];
  entityType: string;
  categoryKey: string;
  tags: string[];
  summary: string;
  longDescription: string;
  position: { x: number; y: number; z: number };
  axisScores: { x: number; y: number; z: number };
  metrics: {
    importance: number;
    popularity: number;
    evidence: number;
    centrality: number;
    complexity: number;
    controversy: number;
    freshness: number;
  };
  pinned?: boolean;
};

type EdgeSeed = {
  source: string;
  target: string;
  relation: MapRelation;
  weight: number;
  confidence: number;
  evidence: string;
};

type FallbackMapSeed = {
  topicKey: string;
  title: string;
  archetype: string;
  entityType: string;
  description: string;
  status: MapStatus;
  categories: CategorySeed[];
  axes: AxisSeed[];
  nodes: NodeSeed[];
  edges: EdgeSeed[];
};

const FALLBACK_TENANT_ID = 'fallback-tenant-anu-beta';
const CREATED_AT = '2026-03-18T00:00:00Z';

const DEFAULT_AXES: AxisSeed[] = [
  {
    key: 'x',
    label: 'Embodied to abstract',
    minLabel: 'Embodied',
    maxLabel: 'Abstract',
    description: 'Whether a concept is grounded in direct practice or higher-order abstraction.',
  },
  {
    key: 'y',
    label: 'Local to federated',
    minLabel: 'Local',
    maxLabel: 'Federated',
    description: 'How strongly the concept operates at local scale versus across many nodes.',
  },
  {
    key: 'z',
    label: 'Signal to action',
    minLabel: 'Signal',
    maxLabel: 'Action',
    description: 'Whether the concept primarily senses conditions or directly changes them.',
  },
];

const FALLBACK_MAP_SEEDS: FallbackMapSeed[] = [
  {
    topicKey: 'neural-civic-governance',
    title: 'Neural Civic Governance',
    archetype: 'governance-system',
    entityType: 'civic-graph',
    description: 'A read-only live fallback showing how civic sensing, memory, and coordination form a neural-style governance mesh.',
    status: 'published',
    categories: [
      { key: 'sensing', label: 'Sensing', colorToken: 'cyan', description: 'Inputs that register community and ecological conditions.', order: 0 },
      { key: 'memory', label: 'Memory', colorToken: 'violet', description: 'Stores that preserve precedent, consent, and institutional memory.', order: 1 },
      { key: 'coordination', label: 'Coordination', colorToken: 'amber', description: 'Structures that route signals into collective action.', order: 2 },
      { key: 'outcomes', label: 'Outcomes', colorToken: 'emerald', description: 'Observable effects and feedback loops.', order: 3 },
    ],
    axes: DEFAULT_AXES,
    nodes: [
      {
        key: 'signal-mesh',
        label: 'Signal Mesh',
        aliases: ['Community signal mesh'],
        entityType: 'infrastructure',
        categoryKey: 'sensing',
        tags: ['sensorium', 'observability', 'field-input'],
        summary: 'Distributed local sensing that turns weak civic signals into shared situational awareness.',
        longDescription: 'The signal mesh represents ambient sensing across microcosms, venues, and neighborhoods. It acts like the peripheral nervous system for civic life.',
        position: { x: -1.4, y: 0.2, z: 1.6 },
        axisScores: { x: 0.28, y: 0.74, z: 0.18 },
        metrics: { importance: 0.92, popularity: 0.78, evidence: 0.72, centrality: 0.88, complexity: 0.54, controversy: 0.18, freshness: 0.69 },
        pinned: true,
      },
      {
        key: 'resource-pulse',
        label: 'Resource Pulse',
        aliases: ['Pulse board'],
        entityType: 'dashboard',
        categoryKey: 'sensing',
        tags: ['resource-flows', 'availability', 'pressure'],
        summary: 'Tracks where food, time, care, and money are tightening or opening.',
        longDescription: 'Resource pulse compresses many small economic and social signals into a legible flow map for coordinators and communities.',
        position: { x: -0.8, y: -0.9, z: 1.2 },
        axisScores: { x: 0.22, y: 0.68, z: 0.26 },
        metrics: { importance: 0.84, popularity: 0.7, evidence: 0.75, centrality: 0.76, complexity: 0.46, controversy: 0.14, freshness: 0.66 },
      },
      {
        key: 'memory-commons',
        label: 'Memory Commons',
        aliases: ['Commons memory'],
        entityType: 'knowledge-base',
        categoryKey: 'memory',
        tags: ['archives', 'precedent', 'shared-memory'],
        summary: 'Collective memory that prevents governance from resetting every cycle.',
        longDescription: 'The memory commons stores prior decisions, lessons, and edge cases so governance learns cumulatively rather than episodically.',
        position: { x: 0.3, y: 0.8, z: 0.5 },
        axisScores: { x: 0.58, y: 0.64, z: 0.32 },
        metrics: { importance: 0.87, popularity: 0.73, evidence: 0.68, centrality: 0.83, complexity: 0.61, controversy: 0.12, freshness: 0.58 },
      },
      {
        key: 'consent-ledger',
        label: 'Consent Ledger',
        aliases: ['Ledger of consent'],
        entityType: 'protocol',
        categoryKey: 'memory',
        tags: ['consent', 'commitments', 'auditability'],
        summary: 'Records what has been accepted, delegated, and contested across the network.',
        longDescription: 'The consent ledger is the durable trace of social legitimacy. It ties decisions to actors, scopes, and conditions so the network can remain accountable.',
        position: { x: 0.7, y: -0.1, z: 0.7 },
        axisScores: { x: 0.63, y: 0.71, z: 0.41 },
        metrics: { importance: 0.9, popularity: 0.67, evidence: 0.64, centrality: 0.85, complexity: 0.66, controversy: 0.22, freshness: 0.55 },
      },
      {
        key: 'microcosm-councils',
        label: 'Microcosm Councils',
        aliases: ['Council mesh'],
        entityType: 'governance-body',
        categoryKey: 'coordination',
        tags: ['deliberation', 'microcosm', 'delegation'],
        summary: 'Local councils that metabolize signals into context-aware decisions.',
        longDescription: 'Microcosm councils are where sensing becomes interpretation. They turn broad network telemetry into locally grounded choices and commitments.',
        position: { x: 0.2, y: 1.4, z: -0.4 },
        axisScores: { x: 0.41, y: 0.22, z: 0.64 },
        metrics: { importance: 0.93, popularity: 0.75, evidence: 0.69, centrality: 0.9, complexity: 0.57, controversy: 0.16, freshness: 0.61 },
        pinned: true,
      },
      {
        key: 'apprenticeship-loops',
        label: 'Apprenticeship Loops',
        aliases: ['Learning loops'],
        entityType: 'learning-path',
        categoryKey: 'coordination',
        tags: ['education', 'capability', 'role-transfer'],
        summary: 'Capability loops that keep governance knowledge circulating instead of concentrating.',
        longDescription: 'Apprenticeship loops ensure new actors can inherit practical governance skill, not just formal permissions.',
        position: { x: 1.2, y: 0.9, z: -0.8 },
        axisScores: { x: 0.34, y: 0.48, z: 0.71 },
        metrics: { importance: 0.81, popularity: 0.69, evidence: 0.62, centrality: 0.73, complexity: 0.49, controversy: 0.1, freshness: 0.72 },
      },
      {
        key: 'scenario-studio',
        label: 'Scenario Studio',
        aliases: ['Simulation studio'],
        entityType: 'simulation-space',
        categoryKey: 'coordination',
        tags: ['foresight', 'simulation', 'stress-test'],
        summary: 'A rehearsal layer where policy can be tested before it lands on communities.',
        longDescription: 'Scenario studio lets operators and communities probe consequences before commitments become real, reducing brittle governance moves.',
        position: { x: 1.6, y: -0.4, z: -0.2 },
        axisScores: { x: 0.74, y: 0.58, z: 0.53 },
        metrics: { importance: 0.77, popularity: 0.58, evidence: 0.56, centrality: 0.67, complexity: 0.63, controversy: 0.2, freshness: 0.63 },
      },
      {
        key: 'reciprocity-index',
        label: 'Reciprocity Index',
        aliases: ['Reciprocity score'],
        entityType: 'metric',
        categoryKey: 'outcomes',
        tags: ['trust', 'feedback', 'reciprocity'],
        summary: 'A synthetic outcome measure tracking whether exchange stays mutual over time.',
        longDescription: 'The reciprocity index is a feedback node that shows whether the network is producing mutual benefit or silently extracting from one side.',
        position: { x: 0.9, y: -1.2, z: -1.1 },
        axisScores: { x: 0.56, y: 0.52, z: 0.88 },
        metrics: { importance: 0.79, popularity: 0.61, evidence: 0.59, centrality: 0.71, complexity: 0.44, controversy: 0.19, freshness: 0.64 },
      },
    ],
    edges: [
      { source: 'signal-mesh', target: 'resource-pulse', relation: 'influences', weight: 0.83, confidence: 0.88, evidence: 'The mesh aggregates local observations into resource pressure signals.' },
      { source: 'signal-mesh', target: 'memory-commons', relation: 'derived_from', weight: 0.58, confidence: 0.74, evidence: 'Repeated signals become durable knowledge when patterns recur.' },
      { source: 'memory-commons', target: 'consent-ledger', relation: 'extends', weight: 0.71, confidence: 0.8, evidence: 'Institutional memory gives consent records usable context.' },
      { source: 'resource-pulse', target: 'microcosm-councils', relation: 'influences', weight: 0.79, confidence: 0.86, evidence: 'Councils use pulse data to prioritize interventions.' },
      { source: 'consent-ledger', target: 'microcosm-councils', relation: 'belongs_to', weight: 0.62, confidence: 0.75, evidence: 'Council legitimacy depends on current consent state.' },
      { source: 'microcosm-councils', target: 'apprenticeship-loops', relation: 'extends', weight: 0.64, confidence: 0.72, evidence: 'Councils create the demand for governance apprenticeship.' },
      { source: 'microcosm-councils', target: 'scenario-studio', relation: 'co_occurs_with', weight: 0.56, confidence: 0.7, evidence: 'Simulation often accompanies high-risk council decisions.' },
      { source: 'apprenticeship-loops', target: 'reciprocity-index', relation: 'influences', weight: 0.55, confidence: 0.66, evidence: 'Capability circulation tends to improve reciprocal outcomes.' },
      { source: 'scenario-studio', target: 'reciprocity-index', relation: 'similar_to', weight: 0.41, confidence: 0.58, evidence: 'Both are feedback-oriented layers for policy quality.' },
    ],
  },
  {
    topicKey: 'learning-web-of-regeneration',
    title: 'Learning Web of Regeneration',
    archetype: 'education-ecosystem',
    entityType: 'learning-network',
    description: 'A read-only live fallback map of the education layer, centered on practical capability, ecological literacy, and shared infrastructure.',
    status: 'published',
    categories: [
      { key: 'foundations', label: 'Foundations', colorToken: 'sky', description: 'Concepts that orient the learning field.', order: 0 },
      { key: 'practices', label: 'Practices', colorToken: 'teal', description: 'Embodied or repeatable learning motions.', order: 1 },
      { key: 'infrastructure', label: 'Infrastructure', colorToken: 'indigo', description: 'Systems that support learning persistence.', order: 2 },
      { key: 'culture', label: 'Culture', colorToken: 'rose', description: 'Social and ceremonial conditions that sustain attention.', order: 3 },
    ],
    axes: DEFAULT_AXES,
    nodes: [
      {
        key: 'ecological-literacy',
        label: 'Ecological Literacy',
        entityType: 'capability',
        categoryKey: 'foundations',
        tags: ['ecology', 'systems', 'pattern-recognition'],
        summary: 'Baseline ability to read living systems, thresholds, and interdependence.',
        longDescription: 'Ecological literacy is the core orientation layer for regenerative education. It changes what learners can perceive before it changes what they can do.',
        position: { x: -1.5, y: 0.6, z: 1.1 },
        axisScores: { x: 0.35, y: 0.46, z: 0.29 },
        metrics: { importance: 0.91, popularity: 0.74, evidence: 0.71, centrality: 0.87, complexity: 0.52, controversy: 0.11, freshness: 0.62 },
        pinned: true,
      },
      {
        key: 'learning-journeys',
        label: 'Learning Journeys',
        aliases: ['Journey tracks'],
        entityType: 'pathway',
        categoryKey: 'practices',
        tags: ['sequencing', 'cohort', 'pathway'],
        summary: 'Structured arcs that move learners from orientation into practice.',
        longDescription: 'Learning journeys provide temporal scaffolding so capability can compound through projects, reflection, and contribution.',
        position: { x: -0.6, y: 1.2, z: 0.4 },
        axisScores: { x: 0.31, y: 0.41, z: 0.7 },
        metrics: { importance: 0.83, popularity: 0.7, evidence: 0.68, centrality: 0.77, complexity: 0.43, controversy: 0.08, freshness: 0.66 },
      },
      {
        key: 'stewardship-guilds',
        label: 'Stewardship Guilds',
        entityType: 'community-structure',
        categoryKey: 'practices',
        tags: ['guild', 'peer-learning', 'stewardship'],
        summary: 'Peer groups that keep capability tied to service, responsibility, and place.',
        longDescription: 'Guilds turn education from isolated consumption into shared stewardship, role rotation, and visible responsibility.',
        position: { x: 0.4, y: 1.5, z: -0.3 },
        axisScores: { x: 0.22, y: 0.36, z: 0.76 },
        metrics: { importance: 0.86, popularity: 0.63, evidence: 0.64, centrality: 0.81, complexity: 0.48, controversy: 0.12, freshness: 0.57 },
      },
      {
        key: 'sensor-commons',
        label: 'Sensor Commons',
        entityType: 'infrastructure',
        categoryKey: 'infrastructure',
        tags: ['measurement', 'commons', 'feedback'],
        summary: 'Shared observability tools that let learners study living systems in real time.',
        longDescription: 'Sensor commons gives education a practical feedback layer, connecting learning with water, soil, heat, and energy conditions.',
        position: { x: -0.4, y: -0.2, z: 1.5 },
        axisScores: { x: 0.25, y: 0.59, z: 0.22 },
        metrics: { importance: 0.78, popularity: 0.58, evidence: 0.73, centrality: 0.69, complexity: 0.58, controversy: 0.09, freshness: 0.71 },
      },
      {
        key: 'watershed-data',
        label: 'Watershed Data',
        entityType: 'dataset',
        categoryKey: 'infrastructure',
        tags: ['water', 'ecology', 'context'],
        summary: 'Place-based data that grounds learning in actual ecological constraints.',
        longDescription: 'Watershed data anchors abstract sustainability talk in a concrete living context that learners can observe and influence.',
        position: { x: 0.2, y: -0.8, z: 1.3 },
        axisScores: { x: 0.27, y: 0.34, z: 0.24 },
        metrics: { importance: 0.74, popularity: 0.5, evidence: 0.79, centrality: 0.63, complexity: 0.39, controversy: 0.07, freshness: 0.68 },
      },
      {
        key: 'local-manufacturing',
        label: 'Local Manufacturing',
        entityType: 'practice-lab',
        categoryKey: 'infrastructure',
        tags: ['fabrication', 'repair', 'circularity'],
        summary: 'Practical making and repair spaces that connect theory to material throughput.',
        longDescription: 'Local manufacturing labs help learners understand supply, repair, and circular design by handling real tools and materials.',
        position: { x: 1.5, y: 0.4, z: -0.5 },
        axisScores: { x: 0.18, y: 0.52, z: 0.86 },
        metrics: { importance: 0.76, popularity: 0.6, evidence: 0.61, centrality: 0.67, complexity: 0.51, controversy: 0.1, freshness: 0.65 },
      },
      {
        key: 'mutual-aid-pods',
        label: 'Mutual Aid Pods',
        entityType: 'support-structure',
        categoryKey: 'culture',
        tags: ['care', 'mutuality', 'cohort'],
        summary: 'Small care structures that keep learning relational and durable.',
        longDescription: 'Mutual aid pods make the education field resilient by linking progress to care, accountability, and practical solidarity.',
        position: { x: 0.8, y: -1.1, z: -0.9 },
        axisScores: { x: 0.14, y: 0.23, z: 0.79 },
        metrics: { importance: 0.8, popularity: 0.66, evidence: 0.55, centrality: 0.72, complexity: 0.37, controversy: 0.06, freshness: 0.6 },
      },
      {
        key: 'ritual-reflection',
        label: 'Ritual and Reflection',
        aliases: ['Reflection rituals'],
        entityType: 'cultural-practice',
        categoryKey: 'culture',
        tags: ['ritual', 'reflection', 'meaning'],
        summary: 'Practices that metabolize experience into memory, orientation, and belonging.',
        longDescription: 'Ritual and reflection convert raw experience into pattern recognition, integration, and shared meaning across the learning field.',
        position: { x: 1.2, y: 1.1, z: -1.2 },
        axisScores: { x: 0.61, y: 0.28, z: 0.58 },
        metrics: { importance: 0.73, popularity: 0.57, evidence: 0.48, centrality: 0.64, complexity: 0.45, controversy: 0.15, freshness: 0.54 },
      },
    ],
    edges: [
      { source: 'ecological-literacy', target: 'learning-journeys', relation: 'influences', weight: 0.84, confidence: 0.89, evidence: 'Orientation frames the pathways that learners move through.' },
      { source: 'learning-journeys', target: 'stewardship-guilds', relation: 'extends', weight: 0.68, confidence: 0.77, evidence: 'Journeys deepen when learners are held in peer stewardship structures.' },
      { source: 'sensor-commons', target: 'watershed-data', relation: 'derived_from', weight: 0.79, confidence: 0.86, evidence: 'Shared sensing generates the contextual datasets learners interpret.' },
      { source: 'watershed-data', target: 'ecological-literacy', relation: 'influences', weight: 0.73, confidence: 0.8, evidence: 'Local ecological data sharpens literacy through direct context.' },
      { source: 'stewardship-guilds', target: 'mutual-aid-pods', relation: 'co_occurs_with', weight: 0.58, confidence: 0.69, evidence: 'Peer stewardship is more durable when care structures are present.' },
      { source: 'local-manufacturing', target: 'learning-journeys', relation: 'belongs_to', weight: 0.52, confidence: 0.63, evidence: 'Material labs often sit inside longer educational arcs.' },
      { source: 'ritual-reflection', target: 'learning-journeys', relation: 'similar_to', weight: 0.43, confidence: 0.56, evidence: 'Both provide temporal structure, one practical and one interpretive.' },
      { source: 'mutual-aid-pods', target: 'ritual-reflection', relation: 'extends', weight: 0.47, confidence: 0.6, evidence: 'Care structures make reflective practice socially durable.' },
    ],
  },
];

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function buildFallbackMap(seed: FallbackMapSeed): MapResource {
  const mapId = `fallback-map-${seed.topicKey}`;
  const snapshotId = `fallback-snapshot-${seed.topicKey}-v1`;
  const nodes = seed.nodes.map((node) => ({
    id: `${mapId}-node-${node.key}`,
    mapId,
    label: node.label,
    aliases: node.aliases ?? [],
    entityType: node.entityType,
    categoryKey: node.categoryKey,
    subcategoryKey: undefined,
    tags: node.tags,
    summary: node.summary,
    longDescription: node.longDescription,
    metadata: {
      source: 'bundled_read_only_fallback',
      fallbackTopic: seed.topicKey,
    },
    axisScores: node.axisScores,
    axisMeta: [
      { key: 'x' as const, explanation: `${node.label} leans from embodied practice toward abstraction at ${Math.round(node.axisScores.x * 100)}%.`, confidence: 0.72 },
      { key: 'y' as const, explanation: `${node.label} spans local-to-federated scope at ${Math.round(node.axisScores.y * 100)}%.`, confidence: 0.7 },
      { key: 'z' as const, explanation: `${node.label} sits on the signal-to-action axis at ${Math.round(node.axisScores.z * 100)}%.`, confidence: 0.74 },
    ],
    metrics: {
      ...node.metrics,
      sizeScore: roundMetric((node.metrics.importance + node.metrics.centrality) / 2),
      renderRadius: roundMetric(10 + node.metrics.importance * 14),
    },
    position: node.position,
    confidence: {
      extraction: 0.76,
      classification: 0.8,
      positioning: 0.78,
    },
    sources: [
      {
        id: `${mapId}-source-${node.key}`,
        nodeId: `${mapId}-node-${node.key}`,
        url: `https://example.org/falak/${seed.topicKey}/${node.key}`,
        title: `${seed.title}: ${node.label}`,
        domain: 'example.org',
        snippet: node.summary,
        extractedAt: CREATED_AT,
      },
    ],
    pinned: Boolean(node.pinned),
    clusterId: node.categoryKey,
  }));

  const nodeByKey = new Map(seed.nodes.map((node, index) => [node.key, nodes[index]!]));
  const edges = seed.edges.map((edge, index) => ({
    id: `${mapId}-edge-${index + 1}`,
    mapId,
    sourceId: nodeByKey.get(edge.source)!.id,
    targetId: nodeByKey.get(edge.target)!.id,
    relation: edge.relation,
    weight: edge.weight,
    confidence: edge.confidence,
    evidence: edge.evidence,
  }));

  const categories = seed.categories.map((category) => ({
    id: `${mapId}-category-${category.key}`,
    mapId,
    key: category.key,
    label: category.label,
    colorToken: category.colorToken,
    parentKey: undefined,
    description: category.description,
    order: category.order,
  }));

  const axes = seed.axes.map((axis) => ({
    id: `${mapId}-axis-${axis.key}`,
    mapId,
    key: axis.key,
    label: axis.label,
    minLabel: axis.minLabel,
    maxLabel: axis.maxLabel,
    description: axis.description,
    scoringMethod: 'curated' as const,
  }));

  const aliases = nodes.flatMap((node) =>
    node.aliases.map((alias, index) => ({
      id: `${node.id}-alias-${index + 1}`,
      mapId,
      nodeId: node.id,
      alias,
      canonicalLabel: node.label,
    })),
  );

  return {
    definition: {
      id: mapId,
      tenantId: FALLBACK_TENANT_ID,
      topicKey: seed.topicKey,
      title: seed.title,
      archetype: seed.archetype,
      entityType: seed.entityType,
      description: seed.description,
      status: seed.status,
      sizeFormula: '10 + importance * 14',
      version: 1,
      currentSnapshotId: snapshotId,
      confidence: {
        coverage: 0.81,
        taxonomy: 0.84,
        positions: 0.79,
        dedupe: 0.88,
        relationships: 0.77,
      },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
    categories,
    axes,
    nodes,
    edges,
    aliases,
    snapshots: [
      {
        id: snapshotId,
        mapId,
        version: 1,
        name: 'Bundled read-only snapshot',
        nodes: nodes.map((node) => ({
          nodeId: node.id,
          position: node.position,
          confidence: node.confidence.positioning,
          pinned: node.pinned,
          clusterId: node.clusterId,
        })),
        createdAt: CREATED_AT,
        createdBy: 'bundled-fallback',
      },
    ],
    jobs: [],
  };
}

const FALLBACK_MAPS = FALLBACK_MAP_SEEDS.map(buildFallbackMap);

export function listFallbackEducationMaps(filters: { q?: string; status?: MapStatus } = {}): MapDefinition[] {
  const query = filters.q?.trim().toLowerCase() ?? '';
  return FALLBACK_MAPS
    .map((resource) => resource.definition)
    .filter((definition) => {
      if (filters.status && definition.status !== filters.status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        definition.title,
        definition.topicKey,
        definition.archetype,
        definition.entityType,
        definition.description ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
}

export function getFallbackEducationMap(topicKey: string): MapResource | null {
  return FALLBACK_MAPS.find((resource) => resource.definition.topicKey === topicKey || resource.definition.id === topicKey) ?? null;
}
