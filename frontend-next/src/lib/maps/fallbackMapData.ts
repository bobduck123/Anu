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

type NodeSourceSeed = {
  url: string;
  title: string;
  domain: string;
  snippet: string;
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
  sources?: NodeSourceSeed[];
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

const SEP_AXES: AxisSeed[] = [
  {
    key: 'x',
    label: 'Historical to contemporary',
    minLabel: 'Historical',
    maxLabel: 'Contemporary',
    description: 'Whether an entry is anchored in classical philosophy or in modern and contemporary problem spaces.',
  },
  {
    key: 'y',
    label: 'Canonical to plural',
    minLabel: 'Canonical',
    maxLabel: 'Plural',
    description: 'Whether an entry mainly sits inside the canonical frame or expands the map through broader traditions and interventions.',
  },
  {
    key: 'z',
    label: 'Formal to civic',
    minLabel: 'Formal',
    maxLabel: 'Civic',
    description: 'Whether an entry emphasizes formal reasoning or reaches more directly into lived institutions, power, and public life.',
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
  {
    topicKey: 'stanford-encyclopedia-philosophy-atlas',
    title: 'Stanford Encyclopedia of Philosophy Atlas',
    archetype: 'philosophy-knowledge-graph',
    entityType: 'reference-map',
    description: 'A read-only atlas seeded from the Stanford Encyclopedia of Philosophy contents page, linking anchor figures, core domains, plural traditions, and contemporary frontier topics.',
    status: 'published',
    categories: [
      { key: 'anchors', label: 'Canonical Anchors', colorToken: 'amber', description: 'Major historical figures that structure large parts of the SEP landscape.', order: 0 },
      { key: 'domains', label: 'Core Domains', colorToken: 'sky', description: 'Persistent fields that organize philosophical questions across eras.', order: 1 },
      { key: 'methods', label: 'Methods and Language', colorToken: 'violet', description: 'Entries focused on formal reasoning, inference, and linguistic analysis.', order: 2 },
      { key: 'traditions', label: 'Traditions and Interventions', colorToken: 'emerald', description: 'Entries that widen the canon through distinct traditions and critical interventions.', order: 3 },
      { key: 'frontiers', label: 'Contemporary Frontiers', colorToken: 'rose', description: 'Topics where philosophy is actively entangled with present-day technology and contested belief.', order: 4 },
    ],
    axes: SEP_AXES,
    nodes: [
      {
        key: 'plato',
        label: 'Plato',
        entityType: 'philosopher',
        categoryKey: 'anchors',
        tags: ['ancient', 'dialogues', 'canon'],
        summary: 'A canonical anchor whose questions about politics, knowledge, and reality still shape how many later entries are framed.',
        longDescription: 'The SEP entry presents Plato as a wide-ranging and deeply influential writer whose dialogues continue to structure debates about knowledge, justice, metaphysics, and philosophical method.',
        position: { x: -1.55, y: -1.15, z: 0.15 },
        axisScores: { x: 0.06, y: 0.12, z: 0.46 },
        metrics: { importance: 0.97, popularity: 0.88, evidence: 0.82, centrality: 0.94, complexity: 0.71, controversy: 0.18, freshness: 0.52 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/plato/',
            title: 'Plato (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP presents Plato as one of the most influential philosophical writers, spanning politics, method, and metaphysics.',
          },
          {
            url: 'https://plato.stanford.edu/contents.html',
            title: 'Table of Contents (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'The contents page lists Plato among the major anchor entries in the encyclopedia.',
          },
        ],
        pinned: true,
      },
      {
        key: 'aristotle',
        label: 'Aristotle',
        entityType: 'philosopher',
        categoryKey: 'anchors',
        tags: ['ancient', 'systematic', 'canon'],
        summary: 'A second major anchor whose work spans logic, metaphysics, biology, ethics, and politics.',
        longDescription: 'The SEP entry frames Aristotle as a philosopher with enormous historical influence and unusual breadth, connecting formal reasoning with empirical inquiry and social theory.',
        position: { x: -1.18, y: -0.95, z: 0.36 },
        axisScores: { x: 0.1, y: 0.14, z: 0.58 },
        metrics: { importance: 0.96, popularity: 0.85, evidence: 0.82, centrality: 0.91, complexity: 0.75, controversy: 0.17, freshness: 0.51 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/aristotle/',
            title: 'Aristotle (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP presents Aristotle as a peer of Plato in influence, with work ranging from logic and metaphysics to ethics and biology.',
          },
          {
            url: 'https://plato.stanford.edu/contents.html',
            title: 'Table of Contents (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'The contents page places Aristotle alongside major figures and topic clusters that branch into specialized subentries.',
          },
        ],
        pinned: true,
      },
      {
        key: 'metaphysics',
        label: 'Metaphysics',
        entityType: 'field',
        categoryKey: 'domains',
        tags: ['being', 'ontology', 'first-causes'],
        summary: 'A core domain concerned with what there is and how philosophers characterize reality at the most general level.',
        longDescription: 'The SEP entry treats metaphysics as an enduring but contested field, no longer defined by a single subject matter, yet still central to disputes over what exists and how philosophical claims are framed.',
        position: { x: -0.28, y: -0.5, z: 0.18 },
        axisScores: { x: 0.42, y: 0.2, z: 0.28 },
        metrics: { importance: 0.91, popularity: 0.77, evidence: 0.8, centrality: 0.87, complexity: 0.72, controversy: 0.27, freshness: 0.63 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/metaphysics/',
            title: 'Metaphysics (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP describes metaphysics as difficult to define cleanly, yet still centered on broad claims about being and reality.',
          },
        ],
      },
      {
        key: 'epistemology',
        label: 'Epistemology',
        entityType: 'field',
        categoryKey: 'domains',
        tags: ['knowledge', 'justification', 'belief'],
        summary: 'A core domain that studies knowledge, understanding, justification, and the standards for belief.',
        longDescription: 'The SEP entry traces epistemology from its Greek roots through long-running debates about what it is to know and how knowledge differs from true opinion, error, and mere confidence.',
        position: { x: 0.12, y: -0.1, z: 0.34 },
        axisScores: { x: 0.5, y: 0.24, z: 0.34 },
        metrics: { importance: 0.92, popularity: 0.8, evidence: 0.81, centrality: 0.89, complexity: 0.68, controversy: 0.25, freshness: 0.67 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/epistemology/',
            title: 'Epistemology (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP frames epistemology as an old field organized around knowledge, understanding, and reasons for belief.',
          },
        ],
      },
      {
        key: 'modal-logic',
        label: 'Modal Logic',
        entityType: 'method',
        categoryKey: 'methods',
        tags: ['logic', 'necessity', 'possibility'],
        summary: 'A formal method for tracking necessity, possibility, and related families of reasoning.',
        longDescription: 'The SEP entry describes modal logic as the study of reasoning with necessity and possibility while also branching into deontic, temporal, epistemic, and computationally useful systems.',
        position: { x: 0.76, y: -0.08, z: -1.05 },
        axisScores: { x: 0.64, y: 0.29, z: 0.11 },
        metrics: { importance: 0.82, popularity: 0.63, evidence: 0.84, centrality: 0.74, complexity: 0.73, controversy: 0.19, freshness: 0.66 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/logic-modal/',
            title: 'Modal Logic (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP presents modal logic as a family of systems built around necessity and possibility, with applications in philosophy and computer science.',
          },
        ],
      },
      {
        key: 'feminist-philosophy',
        label: 'Feminist Philosophy',
        entityType: 'tradition',
        categoryKey: 'traditions',
        tags: ['feminism', 'intervention', 'canon'],
        summary: 'A critical intervention that reorganizes philosophical inquiry around gender, power, standpoint, and neglected questions.',
        longDescription: 'The SEP entry introduces feminist philosophy as a section with approaches, interventions, and topic clusters, showing it as a durable reworking of what counts as central philosophical work.',
        position: { x: 0.48, y: 1.05, z: 1.12 },
        axisScores: { x: 0.73, y: 0.87, z: 0.8 },
        metrics: { importance: 0.86, popularity: 0.72, evidence: 0.77, centrality: 0.8, complexity: 0.63, controversy: 0.31, freshness: 0.7 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/feminist-philosophy/',
            title: 'Feminist Philosophy (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP describes feminist philosophy as an organized field with approaches, interventions, and focused topic areas.',
          },
        ],
      },
      {
        key: 'africana-philosophy',
        label: 'Africana Philosophy',
        entityType: 'tradition',
        categoryKey: 'traditions',
        tags: ['diaspora', 'metaphilosophy', 'pluralism'],
        summary: 'A plural field that organizes many philosophizing traditions and discourses across Africa and its diasporas.',
        longDescription: 'The SEP entry presents Africana philosophy not as one doctrine but as an umbrella for intellectual work by African and African-descended peoples, widening the map of philosophy beyond a narrow canonical frame.',
        position: { x: -0.2, y: 1.34, z: 1.24 },
        axisScores: { x: 0.68, y: 0.95, z: 0.88 },
        metrics: { importance: 0.83, popularity: 0.64, evidence: 0.78, centrality: 0.77, complexity: 0.65, controversy: 0.22, freshness: 0.6 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/africana/',
            title: 'Africana Philosophy (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP presents Africana philosophy as an umbrella field for reflective and critical work across Africa and its diasporas.',
          },
        ],
      },
      {
        key: 'chinese-logic-language',
        label: 'Logic and Language in Early Chinese Philosophy',
        entityType: 'tradition',
        categoryKey: 'traditions',
        tags: ['china', 'language', 'reasoning'],
        summary: 'An entry that shows sophisticated work on logic and language inside early Chinese philosophy rather than only inside familiar Western formal traditions.',
        longDescription: 'The SEP entry centers Mohism and related debates to show how early Chinese philosophers developed explicit views on logic, language, and reasoning in relation to ethics and governance.',
        position: { x: 0.94, y: 1.22, z: 0.48 },
        axisScores: { x: 0.24, y: 0.9, z: 0.62 },
        metrics: { importance: 0.78, popularity: 0.55, evidence: 0.79, centrality: 0.7, complexity: 0.66, controversy: 0.16, freshness: 0.62 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/chinese-logic-language/',
            title: 'Logic and Language in Early Chinese Philosophy (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP highlights early Chinese debates on logic and language, especially around Mohism and governance.',
          },
        ],
      },
      {
        key: 'artificial-intelligence',
        label: 'Artificial Intelligence',
        entityType: 'frontier-topic',
        categoryKey: 'frontiers',
        tags: ['ai', 'technology', 'philosophy-of-mind'],
        summary: 'A frontier topic where formal systems, reasoning, personhood, and machine agency meet.',
        longDescription: 'The SEP entry frames AI as both a technical field and a philosophical one, connecting logic, planning, probability, personhood, and debates about the limits of artificial agents.',
        position: { x: 1.48, y: 0.2, z: 0.82 },
        axisScores: { x: 0.96, y: 0.58, z: 0.74 },
        metrics: { importance: 0.88, popularity: 0.86, evidence: 0.79, centrality: 0.82, complexity: 0.7, controversy: 0.36, freshness: 0.91 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/artificial-intelligence/',
            title: 'Artificial Intelligence (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP describes AI as building artificial creatures or persons and ties it directly to logic, planning, and philosophy of AI.',
          },
        ],
        pinned: true,
      },
      {
        key: 'religion-epistemology',
        label: 'The Epistemology of Religion',
        entityType: 'frontier-topic',
        categoryKey: 'frontiers',
        tags: ['religion', 'evidentialism', 'disagreement'],
        summary: 'A boundary topic where general epistemic standards meet disagreement, faith, experience, and moral stakes.',
        longDescription: 'The SEP entry focuses on evidentialism and disagreement in religion, using them to show how general questions about justification become sharper in settings shaped by expertise, privacy, and commitment.',
        position: { x: 0.28, y: 0.52, z: 1.3 },
        axisScores: { x: 0.75, y: 0.52, z: 0.72 },
        metrics: { importance: 0.75, popularity: 0.57, evidence: 0.76, centrality: 0.68, complexity: 0.61, controversy: 0.34, freshness: 0.84 },
        sources: [
          {
            url: 'https://plato.stanford.edu/entries/religion-epistemology/',
            title: 'The Epistemology of Religion (Stanford Encyclopedia of Philosophy)',
            domain: 'plato.stanford.edu',
            snippet: 'SEP focuses this entry on evidentialism and disagreement, showing how religion stresses broader epistemic questions.',
          },
        ],
      },
    ],
    edges: [
      { source: 'plato', target: 'aristotle', relation: 'influences', weight: 0.95, confidence: 0.94, evidence: 'The SEP contents and entries present Plato and Aristotle as the two dominant canonical anchors for much later philosophy.' },
      { source: 'plato', target: 'epistemology', relation: 'influences', weight: 0.8, confidence: 0.86, evidence: 'The SEP epistemology entry explicitly points back to Plato when explaining early questions about knowledge and true opinion.' },
      { source: 'aristotle', target: 'metaphysics', relation: 'influences', weight: 0.87, confidence: 0.88, evidence: 'The SEP Aristotle entry links him directly to metaphysics, and the metaphysics entry still uses categories shaped by that inheritance.' },
      { source: 'metaphysics', target: 'epistemology', relation: 'co_occurs_with', weight: 0.62, confidence: 0.73, evidence: 'Questions about what exists and what can be known remain tightly coupled across the SEP map.' },
      { source: 'epistemology', target: 'modal-logic', relation: 'extends', weight: 0.68, confidence: 0.77, evidence: 'Formal reasoning about knowledge, belief, necessity, and possibility links epistemology to modal logic.' },
      { source: 'modal-logic', target: 'artificial-intelligence', relation: 'influences', weight: 0.74, confidence: 0.82, evidence: 'The SEP AI entry names logic-based formalisms and intensional logics as part of AI\'s philosophical and technical foundation.' },
      { source: 'religion-epistemology', target: 'epistemology', relation: 'belongs_to', weight: 0.81, confidence: 0.85, evidence: 'The SEP entry explicitly frames religion-focused evidentialism and disagreement as general epistemological issues under special pressure.' },
      { source: 'feminist-philosophy', target: 'epistemology', relation: 'extends', weight: 0.64, confidence: 0.74, evidence: 'Feminist interventions expand what counts as a knower, a standpoint, and an adequately situated account of evidence.' },
      { source: 'africana-philosophy', target: 'feminist-philosophy', relation: 'co_occurs_with', weight: 0.52, confidence: 0.68, evidence: 'Both entries widen the philosophical field by challenging narrow canonical boundaries and recentering lived histories.' },
      { source: 'chinese-logic-language', target: 'modal-logic', relation: 'similar_to', weight: 0.49, confidence: 0.65, evidence: 'Each entry organizes careful attention to inference, terms, and the structure of reasoning, though from different traditions.' },
      { source: 'chinese-logic-language', target: 'epistemology', relation: 'extends', weight: 0.55, confidence: 0.69, evidence: 'The early Chinese logic-and-language entry broadens the geography of how philosophical reflection on knowledge and argument is mapped.' },
      { source: 'feminist-philosophy', target: 'artificial-intelligence', relation: 'influences', weight: 0.46, confidence: 0.61, evidence: 'Critical work on power, embodiment, and social categories is directly relevant when philosophical questions about AI move into public systems.' },
    ],
  },
];

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function buildAxisExplanation(axis: AxisSeed, nodeLabel: string, score: number): string {
  return `${nodeLabel} sits at ${Math.round(score * 100)}% on the "${axis.label}" axis, between ${axis.minLabel.toLowerCase()} and ${axis.maxLabel.toLowerCase()}.`;
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
    axisMeta: seed.axes.map((axis) => ({
      key: axis.key,
      explanation: buildAxisExplanation(axis, node.label, node.axisScores[axis.key]),
      confidence: axis.key === 'y' ? 0.7 : axis.key === 'x' ? 0.72 : 0.74,
    })),
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
    sources:
      node.sources?.map((source, index) => ({
        id: `${mapId}-source-${node.key}-${index + 1}`,
        nodeId: `${mapId}-node-${node.key}`,
        url: source.url,
        title: source.title,
        domain: source.domain,
        snippet: source.snippet,
        extractedAt: CREATED_AT,
      })) ?? [
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

