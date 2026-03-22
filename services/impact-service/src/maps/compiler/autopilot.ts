import { buildAxes, buildNodeAxisMeta } from './axisBuilder';
import { dedupeEntities } from './dedupe';
import { buildSourcePlan, discoverEntities } from './discoveryPipeline';
import { findMockSeed } from './mockSeeds';
import { profileTopic } from './topicProfiler';
import { buildTaxonomy } from './taxonomyBuilder';
import { buildRelationships } from './relationshipBuilder';
import { finalizeMetrics, DEFAULT_SIZE_FORMULA } from './scoringEngine';
import { layoutInputsFromNodes } from './layoutCompiler';
import { round, stableId } from './utils';
import { CompileResult, MapCompileRequest, MapNode, MapRelation, SeedCorpus } from '../domain/types';

function pushLog(logs: CompileResult['logs'], step: string, message: string, status: 'info' | 'warning' | 'error' = 'info') {
  logs.push({ step, message, status });
}

function buildFallbackSeed(profileTopicKey: string): SeedCorpus | undefined {
  return findMockSeed(profileTopicKey);
}

interface CompileMapDraftOptions {
  seedOverride?: SeedCorpus;
}

export function compileMapDraft(request: MapCompileRequest, options: CompileMapDraftOptions = {}): CompileResult {
  const logs: CompileResult['logs'] = [];
  const inferredTopicKey = request.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const seed = options.seedOverride ?? buildFallbackSeed(inferredTopicKey);

  if (options.seedOverride) {
    pushLog(logs, 'seed_override', `Using caller-supplied seed corpus for topic "${options.seedOverride.topicKey}".`);
  }

  pushLog(logs, 'topic_profiler', `Profiling topic "${request.topic}".`);
  const profile = profileTopic(request.topic, seed);
  const mapId = stableId('map', profile.topicKey);

  pushLog(logs, 'source_plan', `Planning deterministic discovery sources for archetype "${profile.archetype}".`);
  const sourcePlan = buildSourcePlan(profile, seed);

  pushLog(logs, 'discovery', `Discovering candidate entities from ${sourcePlan.documents.length} structured documents.`);
  const discovered = discoverEntities(profile, seed);

  pushLog(logs, 'canonicalization', `Canonicalizing ${discovered.length} discovered entities.`);
  const deduped = dedupeEntities(discovered);
  if (deduped.length < discovered.length) {
    pushLog(logs, 'dedupe', `Merged ${discovered.length - deduped.length} duplicate candidates into canonical entities.`);
  } else {
    pushLog(logs, 'dedupe', 'No duplicate entities detected.');
  }

  const taxonomy = buildTaxonomy(mapId, deduped, profile);
  pushLog(logs, 'taxonomy', `Built ${taxonomy.categories.length} primary categories with single-category node assignment.`);

  const axes = buildAxes(mapId, profile);
  pushLog(logs, 'axes', `Applied ${axes.length} semantic axes from the ${profile.archetype} archetype template.`);

  const nodeIdByLabel = new Map<string, string>();
  for (const entity of deduped) {
    nodeIdByLabel.set(entity.label, stableId('node', mapId, entity.label));
  }

  const preliminaryEdgeSet = buildRelationships(mapId, profile, deduped, nodeIdByLabel);
  pushLog(logs, 'relationships', `Built ${preliminaryEdgeSet.length} typed semantic relationships.`);

  const degreeByNodeId = new Map<string, number>();
  for (const edge of preliminaryEdgeSet) {
    degreeByNodeId.set(edge.sourceId, (degreeByNodeId.get(edge.sourceId) ?? 0) + edge.weight);
    degreeByNodeId.set(edge.targetId, (degreeByNodeId.get(edge.targetId) ?? 0) + edge.weight);
  }
  const maxDegree = Math.max(1, ...degreeByNodeId.values());

  const nodes: Array<Omit<MapNode, 'mapId'>> = deduped.map((entity) => {
    const nodeId = nodeIdByLabel.get(entity.label)!;
    const { axisScores, axisMeta } = buildNodeAxisMeta(entity, axes);
    const centrality = round((degreeByNodeId.get(nodeId) ?? 0) / maxDegree);

    return {
      id: nodeId,
      label: entity.label,
      aliases: entity.aliases.filter((alias) => alias.toLowerCase() !== entity.label.toLowerCase()),
      entityType: entity.entityType,
      categoryKey: taxonomy.categoryAssignments.get(entity.label),
      subcategoryKey: undefined,
      tags: entity.tags,
      summary: entity.summary,
      longDescription: entity.longDescription,
      metadata: entity.metadata,
      axisScores,
      axisMeta,
      metrics: finalizeMetrics(entity.metrics, { centrality }),
      position: { x: 0, y: 0, z: 0 },
      confidence: {
        extraction: round(Math.min(0.95, 0.45 + entity.sources.length * 0.12)),
        classification: round(Math.min(0.94, 0.52 + entity.tags.length * 0.07)),
        positioning: 0,
      },
      sources: entity.sources.map((source) => ({
        id: stableId('source', nodeId, source.url),
        nodeId,
        ...source,
      })),
      pinned: false,
      clusterId: undefined,
    };
  });

  const positioned = layoutInputsFromNodes(
    nodes.map((node) => ({
      id: node.id,
      categoryKey: node.categoryKey,
      axisScores: node.axisScores,
      metrics: node.metrics,
      pinned: node.pinned,
      position: node.position,
    })),
    preliminaryEdgeSet,
  );
  pushLog(logs, 'layout', 'Computed constrained semantic layout with anchor springs dominating graph refinement.');

  const finalizedNodes = nodes.map((node) => {
    const layout = positioned.get(node.id)!;

    return {
      ...node,
      position: layout.position,
      clusterId: layout.clusterId,
      confidence: {
        ...node.confidence,
        positioning: layout.confidence,
      },
    };
  });

  const aliases = finalizedNodes.flatMap((node) =>
    node.aliases.map((alias) => ({
      id: stableId('alias', node.id, alias),
      alias,
      canonicalLabel: node.label,
      nodeId: node.id,
    })),
  );

  const coverageConfidence = round(Math.min(0.98, 0.42 + finalizedNodes.length * 0.06));
  const relationshipConfidence = preliminaryEdgeSet.length === 0
    ? 0.32
    : round(preliminaryEdgeSet.reduce((sum, edge) => sum + edge.confidence, 0) / preliminaryEdgeSet.length);
  const positionConfidence = finalizedNodes.length === 0
    ? 0
    : round(finalizedNodes.reduce((sum, node) => sum + node.confidence.positioning, 0) / finalizedNodes.length);
  const dedupeConfidence = discovered.length === 0 ? 0 : round(deduped.length / discovered.length);

  const definition = {
    topicKey: profile.topicKey,
    title: profile.title,
    archetype: profile.archetype,
    entityType: profile.entityType,
    description: seed?.description ?? `Autogenerated ${profile.archetype} map for ${profile.title}.`,
    status: 'draft' as const,
    sizeFormula: DEFAULT_SIZE_FORMULA,
    version: 1,
    currentSnapshotId: null,
    confidence: {
      coverage: coverageConfidence,
      taxonomy: round(taxonomy.confidence),
      positions: positionConfidence,
      dedupe: dedupeConfidence,
      relationships: relationshipConfidence,
    },
  };

  return {
    definition,
    categories: taxonomy.categories.map((category) => ({
      id: category.id,
      key: category.key,
      label: category.label,
      colorToken: category.colorToken,
      parentKey: category.parentKey,
      description: category.description,
      order: category.order,
    })),
    axes: axes.map((axis) => ({
      id: axis.id,
      key: axis.key,
      label: axis.label,
      minLabel: axis.minLabel,
      maxLabel: axis.maxLabel,
      description: axis.description,
      scoringMethod: axis.scoringMethod,
    })),
    nodes: finalizedNodes,
    edges: preliminaryEdgeSet.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: edge.relation as MapRelation,
      weight: edge.weight,
      confidence: edge.confidence,
      evidence: edge.evidence,
    })),
    aliases,
    snapshot: {
      version: 1,
      name: `${profile.title} Semantic Draft`,
      createdBy: null,
      nodes: finalizedNodes.map((node) => ({
        nodeId: node.id,
        position: node.position,
        confidence: node.confidence.positioning,
        pinned: node.pinned,
        clusterId: node.clusterId,
      })),
    },
    profile,
    sourcePlan,
    logs,
  };
}

export function compileMapDraftFromSeed(seed: SeedCorpus, mode: MapCompileRequest['mode'] = 'curated_refine'): CompileResult {
  return compileMapDraft(
    {
      topic: seed.topicKey,
      mode,
    },
    {
      seedOverride: seed,
    },
  );
}
