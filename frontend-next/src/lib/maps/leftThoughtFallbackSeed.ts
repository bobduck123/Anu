import type { MapRelation, MapStatus } from '@/lib/api/educationMaps';
import leftThoughtGraphData from './data/leftThoughtGraph.json';

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

export type FallbackMapSeedShape = {
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

type LeftThoughtSource = {
  label: string;
  url: string;
};

type LeftThoughtNode = {
  id: string;
  type: 'thinker' | 'topic' | 'work';
  label: string;
  description: string;
  years?: string;
  year?: number;
  group?: string;
  resources?: LeftThoughtSource[];
};

type LeftThoughtLink = {
  source: string;
  target: string;
  relation:
    | 'influenced'
    | 'founded'
    | 'developed'
    | 'extended'
    | 'foundational_to'
    | 'associated_with'
    | 'foundational'
    | 'authored_by'
    | 'foundational_text'
    | 'key_text'
    | 'related_text';
};

const LEFT_THOUGHT_AXES: AxisSeed[] = [
  {
    key: 'x',
    label: 'Historical to contemporary',
    minLabel: 'Historical',
    maxLabel: 'Contemporary',
    description: 'Places stars by historical emergence, allowing users to read diachronic lineages across thinkers, texts, and schools.',
  },
  {
    key: 'y',
    label: 'Canonical core to plural edge',
    minLabel: 'Canonical',
    maxLabel: 'Plural',
    description: 'Tracks whether a star sits in highly canonical reference space or in later plural interventions and counter-canonical expansion.',
  },
  {
    key: 'z',
    label: 'Formal theory to civic praxis',
    minLabel: 'Formal',
    maxLabel: 'Civic',
    description: 'Shows whether a star is weighted toward formal theoretical elaboration or direct social, institutional, and movement praxis.',
  },
];

const THINKER_GROUP_ORDER = [
  'Classical Marxism',
  'Leninism',
  'Anarchist Tradition',
  'Frankfurt School',
  'Black Radical Tradition',
  'Postcolonial Theory',
  'Contemporary Marxism',
] as const;

const THINKER_GROUP_COLOR: Record<string, string> = {
  'Classical Marxism': 'rose',
  Leninism: 'orange',
  'Anarchist Tradition': 'emerald',
  'Frankfurt School': 'indigo',
  'Black Radical Tradition': 'fuchsia',
  'Postcolonial Theory': 'violet',
  'Contemporary Marxism': 'sky',
};

const THINKER_GROUP_PLURAL_SCORE: Record<string, number> = {
  'Classical Marxism': 0.25,
  Leninism: 0.34,
  'Anarchist Tradition': 0.64,
  'Frankfurt School': 0.46,
  'Black Radical Tradition': 0.82,
  'Postcolonial Theory': 0.88,
  'Contemporary Marxism': 0.73,
};

const SEP_SOURCE_BY_NODE_ID: Record<string, { url: string; title: string; snippet: string }> = {
  marx: {
    url: 'https://plato.stanford.edu/entries/marx/',
    title: 'Karl Marx (Stanford Encyclopedia of Philosophy)',
    snippet: 'SEP overview of Marx’s philosophy, political economy, and historical impact.',
  },
  beauvoir: {
    url: 'https://plato.stanford.edu/entries/beauvoir/',
    title: 'Simone de Beauvoir (Stanford Encyclopedia of Philosophy)',
    snippet: 'SEP entry situating Beauvoir’s existential and feminist contributions.',
  },
  anarchism: {
    url: 'https://plato.stanford.edu/entries/anarchism/',
    title: 'Anarchism (Stanford Encyclopedia of Philosophy)',
    snippet: 'SEP entry on anarchism as a family of anti-authoritarian political theories.',
  },
  feminism: {
    url: 'https://plato.stanford.edu/entries/feminism-social-political/',
    title: 'Feminist Perspectives on Social and Political Philosophy (SEP)',
    snippet: 'SEP overview of feminist interventions in social and political philosophy.',
  },
};

function canonicalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${pathname}${parsed.search}`;
  } catch {
    return trimmed;
  }
}

function buildSepSource(node: LeftThoughtNode): NodeSourceSeed {
  const direct = SEP_SOURCE_BY_NODE_ID[node.id];
  if (direct) {
    return {
      url: direct.url,
      title: direct.title,
      domain: 'plato.stanford.edu',
      snippet: direct.snippet,
    };
  }

  const searchUrl = `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(node.label)}`;
  return {
    url: searchUrl,
    title: `SEP search: ${node.label}`,
    domain: 'plato.stanford.edu',
    snippet: `SEP search entry-point for ${node.label}, used to keep this star source-linked inside the ANU universe fallback atlas.`,
  };
}

const RELATION_TO_EDGE_META: Record<
  LeftThoughtLink['relation'],
  { relation: MapRelation; weight: number; confidence: number; label: string }
> = {
  influenced: { relation: 'influences', weight: 0.82, confidence: 0.84, label: 'influenced' },
  founded: { relation: 'influences', weight: 0.9, confidence: 0.9, label: 'founded' },
  developed: { relation: 'extends', weight: 0.78, confidence: 0.8, label: 'developed' },
  extended: { relation: 'extends', weight: 0.75, confidence: 0.78, label: 'extended' },
  foundational_to: { relation: 'influences', weight: 0.86, confidence: 0.86, label: 'foundational to' },
  associated_with: { relation: 'co_occurs_with', weight: 0.58, confidence: 0.66, label: 'associated with' },
  foundational: { relation: 'influences', weight: 0.84, confidence: 0.84, label: 'foundational for' },
  authored_by: { relation: 'derived_from', weight: 0.88, confidence: 0.92, label: 'authored by' },
  foundational_text: { relation: 'belongs_to', weight: 0.82, confidence: 0.86, label: 'foundational text for' },
  key_text: { relation: 'belongs_to', weight: 0.75, confidence: 0.82, label: 'key text for' },
  related_text: { relation: 'similar_to', weight: 0.54, confidence: 0.64, label: 'related text for' },
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'external';
  }
}

function parseStartYear(node: LeftThoughtNode): number | null {
  if (typeof node.year === 'number' && Number.isFinite(node.year)) {
    return node.year;
  }

  if (!node.years) {
    return null;
  }

  const match = node.years.match(/(\d{4})/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

function hashFraction(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function relationVocabulary(nodeId: string, links: LeftThoughtLink[]): number {
  const relations = new Set(
    links
      .filter((link) => link.source === nodeId || link.target === nodeId)
      .map((link) => link.relation),
  );

  return relations.size;
}

function countNodeDegree(nodeId: string, links: LeftThoughtLink[]): number {
  return links.reduce((count, link) => {
    if (link.source === nodeId || link.target === nodeId) {
      return count + 1;
    }

    return count;
  }, 0);
}

function buildCategoryKey(node: LeftThoughtNode): string {
  if (node.type !== 'thinker') {
    return node.type === 'topic' ? 'topics' : 'works';
  }

  if (!node.group) {
    return 'thinkers';
  }

  return `thinkers-${slugify(node.group)}`;
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lowercase = text.toLowerCase();
  return keywords.some((keyword) => lowercase.includes(keyword));
}

function pluralAxisScore(node: LeftThoughtNode): number {
  if (node.type === 'thinker' && node.group) {
    return THINKER_GROUP_PLURAL_SCORE[node.group] ?? 0.56;
  }

  const text = `${node.label} ${node.description}`.toLowerCase();

  if (hasKeyword(text, ['postcolonial', 'black radical', 'feminist', 'africana', 'anti-colonial'])) {
    return 0.86;
  }

  if (hasKeyword(text, ['anarch', 'libertarian socialism', 'mutualism'])) {
    return 0.72;
  }

  if (hasKeyword(text, ['lenin', 'classical marx', 'dialectical materialism'])) {
    return 0.34;
  }

  if (node.type === 'work') {
    return 0.52;
  }

  return 0.48;
}

function praxisAxisScore(node: LeftThoughtNode): number {
  const text = `${node.label} ${node.description}`.toLowerCase();
  let score = node.type === 'thinker' ? 0.58 : node.type === 'topic' ? 0.5 : 0.44;

  if (hasKeyword(text, ['revolution', 'workers', 'strike', 'abolition', 'movement', 'imperialism', 'colonial'])) {
    score += 0.2;
  }

  if (hasKeyword(text, ['theory', 'metaphysics', 'epistemology', 'dialectic', 'method'])) {
    score -= 0.18;
  }

  return clamp(score);
}

function historicalAxisScore(node: LeftThoughtNode, minYear: number, maxYear: number): number {
  const year = parseStartYear(node);
  if (year == null) {
    return node.type === 'topic' ? 0.56 : node.type === 'work' ? 0.48 : 0.52;
  }

  if (maxYear <= minYear) {
    return 0.5;
  }

  return clamp((year - minYear) / (maxYear - minYear));
}

function nodeAliases(node: LeftThoughtNode): string[] {
  const aliases = new Set<string>();

  const idAlias = node.id.replace(/_/g, ' ').trim();
  if (idAlias && idAlias.toLowerCase() !== node.label.toLowerCase()) {
    aliases.add(idAlias);
  }

  const asciiAlias = node.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (asciiAlias.toLowerCase() !== node.label.toLowerCase()) {
    aliases.add(asciiAlias);
  }

  if (node.years) {
    aliases.add(node.years);
  }

  return Array.from(aliases);
}

function nodeSources(node: LeftThoughtNode): NodeSourceSeed[] {
  const sources: NodeSourceSeed[] = [];
  const seen = new Set<string>();

  const pushSource = (source: NodeSourceSeed) => {
    const key = canonicalizeUrl(source.url);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    sources.push(source);
  };

  for (const resource of node.resources ?? []) {
    if (!resource?.url) {
      continue;
    }

    pushSource({
      url: resource.url,
      title: resource.label || `Primary source for ${node.label}`,
      domain: parseDomain(resource.url),
      snippet: `${node.label}: source linked from the left-thought graph dataset.`,
    });
  }

  pushSource(buildSepSource(node));

  return sources;
}

function nodeMetrics(args: {
  node: LeftThoughtNode;
  degree: number;
  maxDegree: number;
  relationVariety: number;
  maxRelationVariety: number;
  sourceCount: number;
  freshness: number;
}): NodeSeed['metrics'] {
  const {
    node,
    degree,
    maxDegree,
    relationVariety,
    maxRelationVariety,
    sourceCount,
    freshness,
  } = args;

  const centrality = maxDegree > 0 ? clamp(degree / maxDegree) : 0;
  const relationBreadth = maxRelationVariety > 0 ? clamp(relationVariety / maxRelationVariety) : 0;
  const sourceSignal = clamp(sourceCount / 4);
  const textSignal = clamp((node.description?.length ?? 0) / 420);

  const importanceBase = node.type === 'thinker' ? 0.56 : node.type === 'topic' ? 0.5 : 0.48;
  const importance = clamp(importanceBase + centrality * 0.3 + sourceSignal * 0.12 + relationBreadth * 0.12);

  const popularity = clamp(0.26 + centrality * 0.5 + sourceSignal * 0.24);
  const evidence = clamp(0.38 + sourceSignal * 0.42 + relationBreadth * 0.12 + (node.type === 'work' ? 0.06 : 0));
  const complexity = clamp(0.28 + textSignal * 0.42 + relationBreadth * 0.24 + (node.type === 'topic' ? 0.08 : 0));

  let controversy = 0.16;
  if (hasKeyword(`${node.label} ${node.description}`, ['revolution', 'lenin', 'trotsky', 'anarch', 'capitalism', 'imperialism'])) {
    controversy += 0.12;
  }
  if (hasKeyword(`${node.label} ${node.description}`, ['femin', 'postcolonial', 'racial', 'black radical'])) {
    controversy += 0.08;
  }

  return {
    importance,
    popularity,
    evidence,
    centrality,
    complexity,
    controversy: clamp(controversy),
    freshness,
  };
}

function nodeTags(node: LeftThoughtNode, sources: NodeSourceSeed[]): string[] {
  const tags = new Set<string>();

  tags.add(`type:${node.type}`);
  if (node.group) {
    tags.add(`school:${slugify(node.group)}`);
  }

  for (const token of node.label.split(/[^a-zA-Z0-9]+/g)) {
    const normalized = token.trim().toLowerCase();
    if (normalized.length >= 4) {
      tags.add(normalized);
    }
  }

  for (const source of sources) {
    tags.add(`source:${source.domain}`);
  }

  return Array.from(tags).slice(0, 14);
}

function buildLeftThoughtCategories(nodes: LeftThoughtNode[]): CategorySeed[] {
  const categories: CategorySeed[] = [
    {
      key: 'topics',
      label: 'Conceptual domains',
      colorToken: 'amber',
      description: 'Ideological formations, schools, and conceptual domains in left political thought.',
      order: 0,
    },
    {
      key: 'works',
      label: 'Texts and interventions',
      colorToken: 'emerald',
      description: 'Major works linked to thinkers and traditions in the graph.',
      order: 1,
    },
  ];

  const uniqueGroups = new Set(
    nodes.filter((node) => node.type === 'thinker' && node.group).map((node) => node.group as string),
  );

  let orderIndex = 10;
  for (const group of THINKER_GROUP_ORDER) {
    if (!uniqueGroups.has(group)) {
      continue;
    }

    categories.push({
      key: `thinkers-${slugify(group)}`,
      label: group,
      colorToken: THINKER_GROUP_COLOR[group] ?? 'amber',
      description: `Thinkers grouped under ${group} in the original left-thought graph.`,
      order: orderIndex,
    });
    orderIndex += 1;
  }

  const uncategorizedThinkers = nodes.some((node) => node.type === 'thinker' && !node.group);
  if (uncategorizedThinkers) {
    categories.push({
      key: 'thinkers',
      label: 'Other thinkers',
      colorToken: 'amber',
      description: 'Thinkers without an explicit school label in the source graph.',
      order: orderIndex,
    });
  }

  return categories;
}

function buildLeftThoughtNodes(nodes: LeftThoughtNode[], links: LeftThoughtLink[]): NodeSeed[] {
  const years = nodes
    .map((node) => parseStartYear(node))
    .filter((year): year is number => year != null);

  const minYear = years.length > 0 ? Math.min(...years) : 1800;
  const maxYear = years.length > 0 ? Math.max(...years) : 2020;

  const degreesByNode = new Map(nodes.map((node) => [node.id, countNodeDegree(node.id, links)]));
  const maxDegree = Math.max(...Array.from(degreesByNode.values()), 1);

  const relationVarietyByNode = new Map(
    nodes.map((node) => [node.id, relationVocabulary(node.id, links)]),
  );
  const maxRelationVariety = Math.max(...Array.from(relationVarietyByNode.values()), 1);

  return nodes.map((node) => {
    const sources = nodeSources(node);
    const freshness = historicalAxisScore(node, minYear, maxYear);
    const axisScores = {
      x: freshness,
      y: pluralAxisScore(node),
      z: praxisAxisScore(node),
    };

    const metrics = nodeMetrics({
      node,
      degree: degreesByNode.get(node.id) ?? 0,
      maxDegree,
      relationVariety: relationVarietyByNode.get(node.id) ?? 0,
      maxRelationVariety,
      sourceCount: sources.length,
      freshness,
    });

    const xJitter = (hashFraction(`${node.id}:x`) - 0.5) * 0.24;
    const yJitter = (hashFraction(`${node.id}:y`) - 0.5) * 0.24;
    const zJitter = (hashFraction(`${node.id}:z`) - 0.5) * 0.24;

    return {
      key: node.id,
      label: node.label,
      aliases: nodeAliases(node),
      entityType: node.type,
      categoryKey: buildCategoryKey(node),
      tags: nodeTags(node, sources),
      summary: node.description,
      longDescription: node.description,
      position: {
        x: Number(((axisScores.x - 0.5) * 3.2 + xJitter).toFixed(3)),
        y: Number(((axisScores.y - 0.5) * 3.2 + yJitter).toFixed(3)),
        z: Number(((axisScores.z - 0.5) * 3.2 + zJitter).toFixed(3)),
      },
      axisScores: {
        x: Number(axisScores.x.toFixed(3)),
        y: Number(axisScores.y.toFixed(3)),
        z: Number(axisScores.z.toFixed(3)),
      },
      metrics,
      sources,
      pinned: node.type === 'thinker' && ['marx', 'lenin', 'fanon', 'beauvoir', 'gramsci'].includes(node.id),
    };
  });
}

function buildLeftThoughtEdges(links: LeftThoughtLink[], nodes: LeftThoughtNode[]): EdgeSeed[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return links.map((link) => {
    const meta = RELATION_TO_EDGE_META[link.relation];
    const sourceLabel = nodeById.get(link.source)?.label ?? link.source;
    const targetLabel = nodeById.get(link.target)?.label ?? link.target;

    return {
      source: link.source,
      target: link.target,
      relation: meta.relation,
      weight: meta.weight,
      confidence: meta.confidence,
      evidence: `Mapped from left-thought relation "${meta.label}": ${sourceLabel} → ${targetLabel}.`,
    };
  });
}

function asLeftThoughtData(value: unknown): { nodes: LeftThoughtNode[]; links: LeftThoughtLink[] } {
  if (
    !value ||
    typeof value !== 'object' ||
    !Array.isArray((value as { nodes?: unknown[] }).nodes) ||
    !Array.isArray((value as { links?: unknown[] }).links)
  ) {
    return { nodes: [], links: [] };
  }

  return value as { nodes: LeftThoughtNode[]; links: LeftThoughtLink[] };
}

function buildLeftThoughtGraphFallbackSeed(): FallbackMapSeedShape {
  const { nodes, links } = asLeftThoughtData(leftThoughtGraphData);

  return {
    topicKey: 'left-thought-graph-atlas',
    title: 'Left Thought Graph Atlas',
    archetype: 'left-philosophy-knowledge-graph',
    entityType: 'reference-map',
    description:
      'A read-only fallback atlas imported from the Left Thought Graph, aligned to ANU universe semantics and source-linked to SEP and primary archives where available.',
    status: 'published',
    categories: buildLeftThoughtCategories(nodes),
    axes: LEFT_THOUGHT_AXES,
    nodes: buildLeftThoughtNodes(nodes, links),
    edges: buildLeftThoughtEdges(links, nodes),
  };
}

export const LEFT_THOUGHT_GRAPH_FALLBACK_SEED = buildLeftThoughtGraphFallbackSeed();
