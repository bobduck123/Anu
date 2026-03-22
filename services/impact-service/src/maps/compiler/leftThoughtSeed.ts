import type { MapRelation, SeedCorpus } from '../domain/types';
import leftThoughtGraph from './data/leftThoughtGraph.json';

interface LeftThoughtSource {
  label?: string;
  url: string;
}

interface LeftThoughtNode {
  id: string;
  type: 'thinker' | 'topic' | 'work';
  label: string;
  description: string;
  years?: string;
  year?: number;
  group?: string;
  resources?: LeftThoughtSource[];
}

interface LeftThoughtLink {
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
}

const EXTRACTED_AT = '2026-03-22T00:00:00.000Z';

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

const THINKER_GROUP_PLURAL_SCORE: Record<string, number> = {
  'Classical Marxism': 0.24,
  Leninism: 0.34,
  'Anarchist Tradition': 0.67,
  'Frankfurt School': 0.45,
  'Black Radical Tradition': 0.82,
  'Postcolonial Theory': 0.88,
  'Contemporary Marxism': 0.73,
};

const RELATION_MAP: Record<
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

function parseDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

function pluralAxisScore(node: LeftThoughtNode): number {
  if (node.type === 'thinker' && node.group) {
    return THINKER_GROUP_PLURAL_SCORE[node.group] ?? 0.56;
  }

  const text = `${node.label} ${node.description}`.toLowerCase();

  if (/(postcolonial|black radical|feminist|africana|anti-colonial)/.test(text)) {
    return 0.87;
  }

  if (/(anarch|libertarian socialism|mutualism)/.test(text)) {
    return 0.72;
  }

  if (/(lenin|classical marx|dialectical materialism)/.test(text)) {
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

  if (/(revolution|workers|strike|abolition|movement|imperialism|colonial)/.test(text)) {
    score += 0.2;
  }

  if (/(theory|metaphysics|epistemology|dialectic|method)/.test(text)) {
    score -= 0.18;
  }

  return clamp(score);
}

function buildCategoryKey(node: LeftThoughtNode): string {
  if (node.type === 'topic') {
    return 'topics';
  }
  if (node.type === 'work') {
    return 'works';
  }

  if (node.group) {
    return slugify(node.group);
  }

  return 'thinkers';
}

function relationVocabulary(nodeId: string, links: LeftThoughtLink[]): number {
  const relations = new Set(
    links
      .filter((link) => link.source === nodeId || link.target === nodeId)
      .map((link) => link.relation),
  );

  return relations.size;
}

function degree(nodeId: string, links: LeftThoughtLink[]): number {
  return links.reduce((total, link) => {
    if (link.source === nodeId || link.target === nodeId) {
      return total + 1;
    }

    return total;
  }, 0);
}

function buildSepSource(node: LeftThoughtNode) {
  const direct = SEP_SOURCE_BY_NODE_ID[node.id];
  if (direct) {
    return {
      url: direct.url,
      title: direct.title,
      domain: 'plato.stanford.edu',
      snippet: direct.snippet,
      extractedAt: EXTRACTED_AT,
    };
  }

  const searchUrl = `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(node.label)}`;
  return {
    url: searchUrl,
    title: `SEP search: ${node.label}`,
    domain: 'plato.stanford.edu',
    snippet: `SEP search anchor for ${node.label}, preserved to keep the atlas source-linked in the live Falak map pipeline.`,
    extractedAt: EXTRACTED_AT,
  };
}

function buildSources(node: LeftThoughtNode) {
  const sources: Array<{ url: string; title?: string; domain?: string; snippet?: string; extractedAt?: string }> = [];
  const seen = new Set<string>();

  const push = (source: { url: string; title?: string; domain?: string; snippet?: string; extractedAt?: string }) => {
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

    push({
      url: resource.url,
      title: resource.label || `Primary source for ${node.label}`,
      domain: parseDomain(resource.url),
      snippet: `${node.label}: source linked from the imported left-thought graph corpus.`,
      extractedAt: EXTRACTED_AT,
    });
  }

  push(buildSepSource(node));

  return sources;
}

function buildAliases(node: LeftThoughtNode): string[] {
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

function asLeftThoughtGraph(input: unknown): { nodes: LeftThoughtNode[]; links: LeftThoughtLink[] } {
  if (
    !input ||
    typeof input !== 'object' ||
    !Array.isArray((input as { nodes?: unknown[] }).nodes) ||
    !Array.isArray((input as { links?: unknown[] }).links)
  ) {
    return { nodes: [], links: [] };
  }

  return input as { nodes: LeftThoughtNode[]; links: LeftThoughtLink[] };
}

function buildSeed(): SeedCorpus {
  const { nodes, links } = asLeftThoughtGraph(leftThoughtGraph);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const years = nodes.map((node) => parseStartYear(node)).filter((year): year is number => year != null);
  const minYear = years.length > 0 ? Math.min(...years) : 1800;
  const maxYear = years.length > 0 ? Math.max(...years) : 2020;

  const maxDegree = Math.max(1, ...nodes.map((node) => degree(node.id, links)));
  const maxRelationVocabulary = Math.max(1, ...nodes.map((node) => relationVocabulary(node.id, links)));

  const entities: SeedCorpus['entities'] = nodes.map((node) => {
    const startYear = parseStartYear(node);
    const historicalNormalized = startYear == null || maxYear <= minYear
      ? 0.5
      : clamp((startYear - minYear) / (maxYear - minYear));

    const pluralNormalized = pluralAxisScore(node);
    const praxisNormalized = praxisAxisScore(node);

    const d = degree(node.id, links);
    const relationBreadth = relationVocabulary(node.id, links);
    const sources = buildSources(node);

    const degreeNorm = clamp(d / maxDegree);
    const relationBreadthNorm = clamp(relationBreadth / maxRelationVocabulary);
    const sourceNorm = clamp(sources.length / 4);
    const textNorm = clamp((node.description?.length ?? 0) / 420);

    const importanceBase = node.type === 'thinker' ? 0.56 : node.type === 'topic' ? 0.5 : 0.48;

    const importance = clamp(importanceBase + degreeNorm * 0.3 + sourceNorm * 0.12 + relationBreadthNorm * 0.12);
    const popularity = clamp(0.26 + degreeNorm * 0.5 + sourceNorm * 0.24);
    const evidence = clamp(0.38 + sourceNorm * 0.42 + relationBreadthNorm * 0.12 + (node.type === 'work' ? 0.06 : 0));
    const complexity = clamp(0.28 + textNorm * 0.42 + relationBreadthNorm * 0.24 + (node.type === 'topic' ? 0.08 : 0));

    let controversy = 0.16;
    if (/(revolution|lenin|trotsky|anarch|capitalism|imperialism)/i.test(`${node.label} ${node.description}`)) {
      controversy += 0.12;
    }
    if (/(femin|postcolonial|racial|black radical)/i.test(`${node.label} ${node.description}`)) {
      controversy += 0.08;
    }

    const categoryKey = buildCategoryKey(node);

    return {
      label: node.label,
      aliases: buildAliases(node),
      entityType: node.type,
      categoryKey,
      tags: [
        `node:${slugify(node.id)}`,
        `type:${node.type}`,
        `label:${slugify(node.label)}`,
      ],
      summary: node.description,
      longDescription: node.description,
      axisScores: {
        x: Number((historicalNormalized * 2 - 1).toFixed(4)),
        y: Number((pluralNormalized * 2 - 1).toFixed(4)),
        z: Number((praxisNormalized * 2 - 1).toFixed(4)),
      },
      axisExplanations: {
        x: `${node.label} is placed from historical emergence (earliest year extraction from thinker lifespan or publication year).`,
        y: `${node.label} is placed by canonical-core vs plural-edge weighting derived from school and textual signals.`,
        z: `${node.label} is placed by formal-theory vs civic-praxis weighting from description semantics.`,
      },
      metrics: {
        importance,
        popularity,
        evidence,
        centrality: degreeNorm,
        complexity,
        controversy: clamp(controversy),
        freshness: historicalNormalized,
      },
      metadata: {
        source: 'left-thought-graph',
        sourceNodeId: node.id,
        sourceNodeType: node.type,
        sourceGroup: node.group ?? null,
        sourceYears: node.years ?? null,
      },
      sources,
      relations: links
        .filter((link) => link.source === node.id)
        .map((link) => {
          const target = nodeById.get(link.target);
          if (!target) {
            return null;
          }

          const mapped = RELATION_MAP[link.relation];
          return {
            target: target.label,
            relation: mapped.relation,
            weight: mapped.weight,
            confidence: mapped.confidence,
            evidence: `Mapped from left-thought relation "${mapped.label}": ${node.label} → ${target.label}.`,
          };
        })
        .filter((relation): relation is NonNullable<typeof relation> => relation != null),
    };
  });

  const topThinkers = nodes
    .filter((node) => node.type === 'thinker')
    .slice(0, 12)
    .map((node) => node.label);

  return {
    topicKey: 'left-thought-graph-atlas',
    title: 'Left Thought Graph Atlas',
    archetype: 'theory',
    description:
      'Imported left political thought atlas spanning thinkers, topics, and foundational texts, source-linked to SEP and primary archives.',
    seedQueries: [
      'left thought graph atlas',
      'left political philosophy lineage',
      'stanford encyclopedia of philosophy left thought',
      'marxism anarchism postcolonial theory map',
    ],
    suppliedUrls: [
      'https://plato.stanford.edu/contents.html',
      'https://www.marxists.org/',
      'https://theanarchistlibrary.org/',
    ],
    documents: [
      {
        id: 'left-thought-graph-corpus',
        url: 'https://left-thought-graph.local/graph.json',
        title: 'Left Thought Graph Corpus',
        type: 'source_pack',
        summary: `Imported corpus with ${nodes.length} nodes and ${links.length} directed relations across thinkers, topics, and works.`,
        breadcrumbs: ['ANU', 'Falak Maps', 'Imported corpora'],
        metadata: {
          nodes: nodes.length,
          links: links.length,
          source: 'left-thought-graph',
          importedAt: EXTRACTED_AT,
        },
        sections: [
          {
            heading: 'Canonical entries',
            kind: 'list',
            lines: topThinkers,
          },
          {
            heading: 'Source policy',
            kind: 'summary',
            lines: [
              'Each entity preserves original linked resources when available.',
              'Each entity additionally receives a SEP source anchor (direct entry or SEP search fallback).',
              'Left-thought relation vocabulary is mapped into Falak relation enums with provenance kept in evidence strings.',
            ],
          },
        ],
      },
    ],
    entities,
  };
}

export const LEFT_THOUGHT_GRAPH_SEED: SeedCorpus = buildSeed();
