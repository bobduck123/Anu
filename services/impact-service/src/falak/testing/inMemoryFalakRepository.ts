import { createHash, randomUUID } from 'crypto';
import {
  AllocationExecutionRecord,
  AllocationProposalRecord,
  AllocationProposalView,
  ApprovalRecord,
  ApprovalVoteInput,
  AuditWriteInput,
  ContributionRecord,
  CreateAllocationProposalInput,
  CreateApprovalInput,
  CreateEdgeInput,
  CreateEventWorkflowInput,
  CreateFederationLinkInput,
  CreateNodeInput,
  CurrencyAmount,
  EdgeRecord,
  EventImpactRecord,
  EventRecord,
  EventWorkflowRecord,
  EventWriteInput,
  EventWriteResult,
  FalakLedgerCategory,
  FalakRepository,
  GraphRecord,
  JsonObject,
  LedgerEntryRecord,
  LedgerWriteInput,
  ListEventsFilters,
  ListLedgerFilters,
  ListNodesFilters,
  ListNodesResult,
  NodeRecord,
  PoolBalanceRecord,
  PolicyRecord,
  RecordContributionInput,
  RequestContext,
  ResolvedActor,
  SpatialNearbyFilters,
  UpdateNodeInput
} from '../domain/types';
import { errors } from '../../utils/errors';
import { hasRestrictedReadAccess } from '../domain/access';

interface TenantState {
  id: string;
  slug: string;
  name: string;
}

interface AuditState extends AuditWriteInput {
  id: string;
  createdAt: string;
}

interface ApprovalVoteState {
  approvalId: string;
  actorId: string;
  vote: 'approve' | 'reject';
  note: string | null;
  createdAt: string;
}

interface ApprovalState extends ApprovalRecord {
  tenantId: string;
}

interface LedgerEntryState extends LedgerEntryRecord {
  tenantId: string;
}

interface ContributionState extends ContributionRecord {}

interface AllocationProposalState extends AllocationProposalRecord {}

interface RepositoryState {
  tenants: Map<string, TenantState>;
  actors: Map<string, ResolvedActor>;
  policies: Map<string, PolicyRecord>;
  nodes: Map<string, NodeRecord>;
  edges: Map<string, EdgeRecord>;
  approvals: Map<string, ApprovalState>;
  approvalVotes: ApprovalVoteState[];
  events: Map<string, EventRecord>;
  ledgerEntries: Map<string, LedgerEntryState>;
  contributions: Map<string, ContributionState>;
  allocationProposals: Map<string, AllocationProposalState>;
  auditLogs: AuditState[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function canAccessNode(context: RequestContext, node: NodeRecord): boolean {
  if (node.status === 'deleted') {
    return false;
  }

  if (node.tenantId !== context.tenantId) {
    return false;
  }

  if (context.plane === 'public' || !context.actor) {
    return node.visibility === 'public';
  }

  if (node.visibility === 'restricted') {
    return hasRestrictedReadAccess(context.actor);
  }

  return true;
}

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRadians = (value: number): number => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cloneState(state: RepositoryState): RepositoryState {
  return structuredClone(state);
}

export class InMemoryFalakRepository implements FalakRepository {
  readonly state: RepositoryState;

  constructor(state?: Partial<RepositoryState>) {
    this.state = {
      tenants: state?.tenants ?? new Map<string, TenantState>(),
      actors: state?.actors ?? new Map<string, ResolvedActor>(),
      policies: state?.policies ?? new Map<string, PolicyRecord>(),
      nodes: state?.nodes ?? new Map<string, NodeRecord>(),
      edges: state?.edges ?? new Map<string, EdgeRecord>(),
      approvals: state?.approvals ?? new Map<string, ApprovalState>(),
      approvalVotes: state?.approvalVotes ?? [],
      events: state?.events ?? new Map<string, EventRecord>(),
      ledgerEntries: state?.ledgerEntries ?? new Map<string, LedgerEntryState>(),
      contributions: state?.contributions ?? new Map<string, ContributionState>(),
      allocationProposals: state?.allocationProposals ?? new Map<string, AllocationProposalState>(),
      auditLogs: state?.auditLogs ?? []
    };
  }

  async transaction<T>(_tenantId: string, execute: (repository: FalakRepository) => Promise<T>): Promise<T> {
    const snapshot = cloneState(this.state);
    try {
      return await execute(this);
    } catch (error) {
      this.state.tenants = snapshot.tenants;
      this.state.actors = snapshot.actors;
      this.state.policies = snapshot.policies;
      this.state.nodes = snapshot.nodes;
      this.state.edges = snapshot.edges;
      this.state.approvals = snapshot.approvals;
      this.state.approvalVotes = snapshot.approvalVotes;
      this.state.events = snapshot.events;
      this.state.ledgerEntries = snapshot.ledgerEntries;
      this.state.contributions = snapshot.contributions;
      this.state.allocationProposals = snapshot.allocationProposals;
      this.state.auditLogs = snapshot.auditLogs;
      throw error;
    }
  }

  async findTenantById(tenantId: string): Promise<TenantState | null> {
    return this.state.tenants.get(tenantId) ?? null;
  }

  async findActorById(tenantId: string, actorId: string): Promise<ResolvedActor | null> {
    const actor = this.state.actors.get(actorId) ?? null;
    return actor && actor.tenantId === tenantId ? actor : null;
  }

  async findActorByIdentity(tenantId: string, identity: string): Promise<ResolvedActor | null> {
    return [...this.state.actors.values()].find((actor) =>
      actor.tenantId === tenantId &&
      [actor.externalAuthId, actor.email, actor.displayName].includes(identity)
    ) ?? null;
  }

  async listPolicies(tenantId: string, resourceType: string, action: string): Promise<PolicyRecord[]> {
    return [...this.state.policies.values()]
      .filter((policy) => policy.tenantId === tenantId && policy.resourceType === resourceType && policy.action === action && policy.enabled)
      .sort((left, right) => left.priority - right.priority);
  }

  async listNodes(context: RequestContext, filters: ListNodesFilters): Promise<ListNodesResult> {
    let nodes = [...this.state.nodes.values()]
      .filter((node) => node.tenantId === context.tenantId)
      .filter((node) => canAccessNode(context, node));

    if (filters.type) {
      nodes = nodes.filter((node) => node.type === filters.type);
    }
    if (filters.status) {
      nodes = nodes.filter((node) => node.status === filters.status);
    }
    if (filters.visibility) {
      nodes = nodes.filter((node) => node.visibility === filters.visibility);
    }
    if (filters.query) {
      const needle = filters.query.toLowerCase();
      nodes = nodes.filter((node) =>
        `${node.title ?? ''} ${node.summary ?? ''}`.toLowerCase().includes(needle)
      );
    }

    return {
      items: nodes.slice(0, filters.limit),
      nextCursor: null
    };
  }

  async getNodeById(context: RequestContext, nodeId: string): Promise<NodeRecord | null> {
    const node = this.state.nodes.get(nodeId) ?? null;
    if (!node || node.tenantId !== context.tenantId || !canAccessNode(context, node)) {
      return null;
    }

    return node;
  }

  async createNode(context: RequestContext, input: CreateNodeInput): Promise<NodeRecord> {
    const id = randomUUID();
    const timestamp = nowIso();
    const node: NodeRecord = {
      id,
      tenantId: context.tenantId,
      type: input.type,
      status: 'draft',
      visibility: input.visibility,
      sensitivityClass: input.sensitivityClass,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      metadata: input.metadata,
      geometry: input.geometry,
      timeStart: input.timeStart,
      timeEnd: input.timeEnd,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1
    };

    this.state.nodes.set(id, node);
    return node;
  }

  async updateNode(_context: RequestContext, nodeId: string, input: UpdateNodeInput): Promise<NodeRecord> {
    const current = this.state.nodes.get(nodeId);
    if (!current) {
      throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
    }
    if (current.version !== input.expectedVersion) {
      throw errors.conflict('Node version conflict', 'VERSION_CONFLICT');
    }

    const next: NodeRecord = {
      ...current,
      status: input.status ?? current.status,
      visibility: input.visibility ?? current.visibility,
      sensitivityClass: input.sensitivityClass ?? current.sensitivityClass,
      slug: input.slug !== undefined ? input.slug : current.slug,
      title: input.title !== undefined ? input.title : current.title,
      summary: input.summary !== undefined ? input.summary : current.summary,
      metadata: input.metadata ?? current.metadata,
      geometry: input.geometry !== undefined ? input.geometry : current.geometry,
      timeStart: input.timeStart !== undefined ? input.timeStart : current.timeStart,
      timeEnd: input.timeEnd !== undefined ? input.timeEnd : current.timeEnd,
      updatedAt: nowIso(),
      version: current.version + 1
    };

    this.state.nodes.set(nodeId, next);
    return next;
  }

  async softDeleteNode(_context: RequestContext, nodeId: string, expectedVersion: number): Promise<void> {
    const node = this.state.nodes.get(nodeId);
    if (!node || node.status === 'deleted') {
      throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
    }
    if (node.version !== expectedVersion) {
      throw errors.conflict('Node delete version conflict', 'VERSION_CONFLICT');
    }

    this.state.nodes.set(nodeId, {
      ...node,
      status: 'deleted',
      updatedAt: nowIso(),
      version: node.version + 1
    });
  }

  async createEdge(context: RequestContext, input: CreateEdgeInput): Promise<EdgeRecord> {
    const fromNode = this.state.nodes.get(input.fromNode);
    const toNode = this.state.nodes.get(input.toNode);
    if (!fromNode || fromNode.tenantId !== context.tenantId || fromNode.status === 'deleted') {
      throw errors.notFound('Source node not found', 'SOURCE_NODE_NOT_FOUND');
    }
    if (!toNode || toNode.tenantId !== context.tenantId || toNode.status === 'deleted') {
      throw errors.notFound('Target node not found', 'TARGET_NODE_NOT_FOUND');
    }

    const edge: EdgeRecord = {
      id: randomUUID(),
      tenantId: context.tenantId,
      fromNode: input.fromNode,
      toNode: input.toNode,
      relation: input.relation,
      status: 'active',
      weight: input.weight,
      validFrom: input.validFrom,
      validTo: input.validTo,
      evidence: input.evidence,
      metadata: input.metadata,
      createdAt: nowIso()
    };
    this.state.edges.set(edge.id, edge);
    return edge;
  }

  async getGraph(context: RequestContext, nodeId: string, depth: number): Promise<GraphRecord> {
    const root = await this.getNodeById(context, nodeId);
    if (!root) {
      throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
    }

    const seenNodes = new Set<string>([nodeId]);
    const seenEdges = new Set<string>();
    let frontier = new Set<string>([nodeId]);

    for (let level = 0; level < depth; level += 1) {
      const nextFrontier = new Set<string>();
      for (const edge of this.state.edges.values()) {
        if (edge.tenantId !== context.tenantId) {
          continue;
        }
        if (![...frontier].includes(edge.fromNode) && ![...frontier].includes(edge.toNode)) {
          continue;
        }
        seenEdges.add(edge.id);
        seenNodes.add(edge.fromNode);
        seenNodes.add(edge.toNode);
        nextFrontier.add(edge.fromNode);
        nextFrontier.add(edge.toNode);
      }
      frontier = nextFrontier;
    }

    const nodes = [...seenNodes]
      .map((id) => this.state.nodes.get(id))
      .filter((node): node is NodeRecord => Boolean(node))
      .filter((node) => canAccessNode(context, node));
    const allowedIds = new Set(nodes.map((node) => node.id));
    const edges = [...seenEdges]
      .map((id) => this.state.edges.get(id))
      .filter((edge): edge is EdgeRecord => Boolean(edge))
      .filter((edge) => allowedIds.has(edge.fromNode) && allowedIds.has(edge.toNode));

    return {
      rootNodeId: root.id,
      depth,
      nodes,
      edges
    };
  }

  async createApproval(_context: RequestContext, input: CreateApprovalInput): Promise<ApprovalRecord> {
    const approval: ApprovalState = {
      id: randomUUID(),
      tenantId: _context.tenantId,
      requestType: input.requestType,
      targetType: input.targetType,
      targetId: input.targetId,
      status: 'pending',
      requiredApprovals: input.requiredApprovals,
      currentApprovals: 0,
      context: input.context,
      createdAt: nowIso(),
      resolvedAt: null
    };
    this.state.approvals.set(approval.id, approval);
    return this.toApprovalRecord(approval);
  }

  async getApprovalById(tenantId: string, approvalId: string): Promise<ApprovalRecord | null> {
    const approval = this.state.approvals.get(approvalId) ?? null;
    return approval && approval.tenantId === tenantId ? this.toApprovalRecord(approval) : null;
  }

  async recordApprovalVote(context: RequestContext, approvalId: string, input: ApprovalVoteInput): Promise<ApprovalRecord> {
    const actorId = context.actor?.id;
    if (!actorId) {
      throw errors.unauthorized('Actor required', 'ACTOR_REQUIRED');
    }
    const approval = this.state.approvals.get(approvalId);
    if (!approval) {
      throw errors.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }
    if (approval.status !== 'pending') {
      throw errors.conflict('Approval is already resolved', 'APPROVAL_RESOLVED');
    }
    if (this.state.approvalVotes.some((vote) => vote.approvalId === approvalId && vote.actorId === actorId)) {
      throw errors.conflict('Actor already voted on this approval', 'DUPLICATE_APPROVAL_VOTE');
    }

    this.state.approvalVotes.push({
      approvalId,
      actorId,
      vote: input.vote,
      note: input.note,
      createdAt: nowIso()
    });

    const approvals = this.state.approvalVotes.filter((vote) => vote.approvalId === approvalId && vote.vote === 'approve').length;
    const rejections = this.state.approvalVotes.filter((vote) => vote.approvalId === approvalId && vote.vote === 'reject').length;
    const status =
      rejections > 0 ? 'rejected' :
      approvals >= approval.requiredApprovals ? 'approved' :
      'pending';

    const next: ApprovalRecord = {
      ...approval,
      currentApprovals: approvals,
      status,
      resolvedAt: status === 'pending' ? null : nowIso()
    };
    this.state.approvals.set(approvalId, {
      ...next,
      tenantId: approval.tenantId
    });
    return this.toApprovalRecord(this.state.approvals.get(approvalId)!);
  }

  async listEvents(context: RequestContext, filters: ListEventsFilters): Promise<EventRecord[]> {
    return [...this.state.events.values()]
      .filter((event) => event.tenantId === context.tenantId)
      .filter((event) => !filters.eventType || event.eventType === filters.eventType)
      .filter((event) => !filters.targetType || event.targetType === filters.targetType)
      .filter((event) => !filters.targetId || event.targetId === filters.targetId)
      .slice(0, filters.limit);
  }

  async listLedger(_context: RequestContext, filters: ListLedgerFilters): Promise<LedgerEntryRecord[]> {
    return [...this.state.ledgerEntries.values()]
      .filter((entry) => entry.tenantId === _context.tenantId)
      .filter((entry) => !filters.category || entry.category === filters.category)
      .filter((entry) => !filters.referenceType || entry.referenceType === filters.referenceType)
      .filter((entry) => !filters.referenceId || entry.referenceId === filters.referenceId)
      .map((entry) => this.toLedgerEntryRecord(entry));
  }

  async nearbyNodes(context: RequestContext, filters: SpatialNearbyFilters): Promise<NodeRecord[]> {
    const nodes: NodeRecord[] = [];
    for (const node of this.state.nodes.values()) {
      if (node.tenantId !== context.tenantId) {
        continue;
      }
      if (!canAccessNode(context, node)) {
        continue;
      }
      if (filters.type && node.type !== filters.type) {
        continue;
      }

      const coordinates = node.geometry?.coordinates as [number, number] | undefined;
      if (!coordinates) {
        continue;
      }

      const distanceMeters = haversineMeters(filters.lat, filters.lng, coordinates[1], coordinates[0]);
      if (distanceMeters > filters.radiusMeters) {
        continue;
      }

      nodes.push({
        ...node,
        distanceMeters
      });
    }

    nodes.sort((left, right) => (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0));

    return nodes;
  }

  async createFederationLink(context: RequestContext, input: CreateFederationLinkInput): Promise<EdgeRecord> {
    const fromNode = this.state.nodes.get(input.sourceNodeId);
    const toNode = this.state.nodes.get(input.targetNodeId);

    if (!fromNode || fromNode.tenantId !== context.tenantId || fromNode.status === 'deleted') {
      throw errors.notFound('Source node not found', 'SOURCE_NODE_NOT_FOUND');
    }
    if (!toNode || toNode.status === 'deleted' || toNode.visibility !== 'public') {
      throw errors.notFound('Target node not found', 'TARGET_NODE_NOT_FOUND');
    }

    const edge: EdgeRecord = {
      id: randomUUID(),
      tenantId: context.tenantId,
      fromNode: input.sourceNodeId,
      toNode: input.targetNodeId,
      relation: input.relation,
      status: 'active',
      weight: 1,
      validFrom: null,
      validTo: null,
      evidence: [],
      metadata: {
        federation: true,
        targetTenantId: toNode.tenantId,
        contract: input.contract
      },
      createdAt: nowIso()
    };
    this.state.edges.set(edge.id, edge);
    return edge;
  }

  async createEventWithLinks(context: RequestContext, input: CreateEventWorkflowInput): Promise<EventWorkflowRecord> {
    const venueNode = this.requireTenantNode(context.tenantId, input.venueNodeId, 'VENUE_NODE_NOT_FOUND');
    if (venueNode.type !== 'venue') {
      throw errors.badRequest('Event venue must reference a venue node', 'INVALID_VENUE_NODE');
    }

    const communityNode = input.communityNodeId
      ? this.requireTenantNode(context.tenantId, input.communityNodeId, 'COMMUNITY_NODE_NOT_FOUND')
      : null;
    const campaignNode = input.campaignNodeId
      ? this.requireTenantNode(context.tenantId, input.campaignNodeId, 'CAMPAIGN_NODE_NOT_FOUND')
      : null;
    const poolNode = input.poolNodeId
      ? this.requireTenantNode(context.tenantId, input.poolNodeId, 'POOL_NODE_NOT_FOUND')
      : null;

    if (communityNode && communityNode.type !== 'community') {
      throw errors.badRequest('Event community link must reference a community node', 'INVALID_COMMUNITY_NODE');
    }
    if (campaignNode && campaignNode.type !== 'campaign') {
      throw errors.badRequest('Event campaign link must reference a campaign node', 'INVALID_CAMPAIGN_NODE');
    }
    if (poolNode && poolNode.type !== 'liquidity_pool') {
      throw errors.badRequest('Event pool link must reference a liquidity_pool node', 'INVALID_POOL_NODE');
    }

    const event = this.createWorkflowNode(context, {
      type: 'event',
      status: 'active',
      visibility: input.visibility,
      sensitivityClass: input.sensitivityClass,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      metadata: input.metadata,
      geometry: input.geometry,
      timeStart: input.timeStart,
      timeEnd: input.timeEnd
    });

    const links: EdgeRecord[] = [
      await this.createEdge(context, {
        fromNode: event.id,
        toNode: venueNode.id,
        relation: 'occurs_at',
        weight: 1,
        validFrom: input.timeStart,
        validTo: input.timeEnd,
        evidence: [],
        metadata: {}
      }),
      await this.createEdge(context, {
        fromNode: venueNode.id,
        toNode: event.id,
        relation: 'hosts',
        weight: 1,
        validFrom: input.timeStart,
        validTo: input.timeEnd,
        evidence: [],
        metadata: {}
      })
    ];

    if (communityNode) {
      links.push(await this.createEdge(context, {
        fromNode: event.id,
        toNode: communityNode.id,
        relation: 'benefits',
        weight: 1,
        validFrom: input.timeStart,
        validTo: input.timeEnd,
        evidence: [],
        metadata: {}
      }));
    }
    if (campaignNode) {
      links.push(await this.createEdge(context, {
        fromNode: event.id,
        toNode: campaignNode.id,
        relation: 'benefits',
        weight: 1,
        validFrom: input.timeStart,
        validTo: input.timeEnd,
        evidence: [],
        metadata: {}
      }));
    }
    if (poolNode) {
      links.push(await this.createEdge(context, {
        fromNode: event.id,
        toNode: poolNode.id,
        relation: 'tied_to_pool',
        weight: 1,
        validFrom: input.timeStart,
        validTo: input.timeEnd,
        evidence: [],
        metadata: {}
      }));
    }

    return {
      event,
      linkedNodes: [venueNode, communityNode, campaignNode, poolNode].filter((node): node is NodeRecord => Boolean(node)),
      links
    };
  }

  async recordContribution(context: RequestContext, input: RecordContributionInput): Promise<ContributionRecord> {
    const eventNode = this.requireTenantNode(context.tenantId, input.eventNodeId, 'EVENT_NODE_NOT_FOUND');
    const poolNode = this.requireTenantNode(context.tenantId, input.poolNodeId, 'POOL_NODE_NOT_FOUND');

    if (eventNode.type !== 'event') {
      throw errors.notFound('Event node not found', 'EVENT_NODE_NOT_FOUND');
    }
    if (poolNode.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool node not found', 'POOL_NODE_NOT_FOUND');
    }
    this.ensureEventPoolLink(context.tenantId, eventNode.id, poolNode.id);

    const contributedAt = input.contributedAt ?? nowIso();
    const node = this.createWorkflowNode(context, {
      type: 'contribution',
      status: 'active',
      visibility: 'tenant',
      sensitivityClass: 'normal',
      slug: null,
      title: `${input.amount} ${input.currency} contribution`,
      summary: input.note,
      metadata: {
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        anonymous: context.actor === null
      },
      geometry: null,
      timeStart: contributedAt,
      timeEnd: contributedAt
    });

    await this.createEdge(context, {
      fromNode: node.id,
      toNode: eventNode.id,
      relation: 'contributes_to',
      weight: 1,
      validFrom: contributedAt,
      validTo: contributedAt,
      evidence: [],
      metadata: {}
    });
    await this.createEdge(context, {
      fromNode: node.id,
      toNode: poolNode.id,
      relation: 'funds',
      weight: 1,
      validFrom: contributedAt,
      validTo: contributedAt,
      evidence: [],
      metadata: {}
    });

    const record: ContributionState = {
      id: randomUUID(),
      tenantId: context.tenantId,
      nodeId: node.id,
      eventNodeId: eventNode.id,
      poolNodeId: poolNode.id,
      contributorActorId: context.actor?.id ?? null,
      amount: input.amount,
      currency: input.currency,
      note: input.note,
      reference: input.reference,
      contributedAt,
      createdAt: nowIso()
    };
    this.state.contributions.set(record.id, record);
    return record;
  }

  async createAllocationProposal(context: RequestContext, input: CreateAllocationProposalInput): Promise<AllocationProposalRecord> {
    const poolNode = this.requireTenantNode(context.tenantId, input.poolNodeId, 'POOL_NODE_NOT_FOUND');
    const targetNode = this.requireTenantNode(context.tenantId, input.targetNodeId, 'TARGET_NODE_NOT_FOUND');
    const eventNode = input.eventNodeId
      ? this.requireTenantNode(context.tenantId, input.eventNodeId, 'EVENT_NODE_NOT_FOUND')
      : null;

    if (poolNode.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool node not found', 'POOL_NODE_NOT_FOUND');
    }
    if (!['community', 'campaign'].includes(targetNode.type)) {
      throw errors.badRequest('Allocation target must be a community or campaign node', 'INVALID_ALLOCATION_TARGET');
    }
    if (eventNode && eventNode.type !== 'event') {
      throw errors.notFound('Event node not found', 'EVENT_NODE_NOT_FOUND');
    }
    if (eventNode) {
      this.ensureEventPoolLink(context.tenantId, eventNode.id, poolNode.id);
    }

    const node = this.createWorkflowNode(context, {
      type: 'allocation_proposal',
      status: 'active',
      visibility: 'tenant',
      sensitivityClass: 'normal',
      slug: null,
      title: `Allocate ${input.amount} ${input.currency}`,
      summary: input.rationale,
      metadata: {
        amount: input.amount,
        currency: input.currency,
        poolNodeId: input.poolNodeId,
        targetNodeId: input.targetNodeId
      },
      geometry: null,
      timeStart: null,
      timeEnd: null
    });

    await this.createEdge(context, {
      fromNode: node.id,
      toNode: targetNode.id,
      relation: 'supports',
      weight: 1,
      validFrom: null,
      validTo: null,
      evidence: [],
      metadata: {}
    });

    const record: AllocationProposalState = {
      id: randomUUID(),
      tenantId: context.tenantId,
      nodeId: node.id,
      eventNodeId: eventNode?.id ?? null,
      poolNodeId: poolNode.id,
      targetNodeId: targetNode.id,
      requestedById: context.actor?.id ?? null,
      amount: input.amount,
      currency: input.currency,
      rationale: input.rationale,
      status: 'pending',
      approvalId: null,
      approvedAt: null,
      executedAt: null,
      rejectedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.state.allocationProposals.set(record.id, record);
    return record;
  }

  async getAllocationProposalById(tenantId: string, proposalId: string): Promise<AllocationProposalRecord | null> {
    const proposal = this.state.allocationProposals.get(proposalId) ?? null;
    return proposal && proposal.tenantId === tenantId ? proposal : null;
  }

  async attachApprovalToAllocationProposal(tenantId: string, proposalId: string, approvalId: string): Promise<AllocationProposalRecord> {
    const proposal = await this.getAllocationProposalById(tenantId, proposalId);
    if (!proposal) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }

    const next: AllocationProposalState = {
      ...proposal,
      approvalId,
      updatedAt: nowIso()
    };
    this.state.allocationProposals.set(proposalId, next);
    return next;
  }

  async rejectAllocationProposal(tenantId: string, proposalId: string, rejectedAt: string): Promise<AllocationProposalRecord> {
    const proposal = await this.getAllocationProposalById(tenantId, proposalId);
    if (!proposal) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }

    const next: AllocationProposalState = {
      ...proposal,
      status: 'rejected',
      rejectedAt,
      updatedAt: nowIso()
    };
    this.state.allocationProposals.set(proposalId, next);
    return next;
  }

  async executeAllocation(
    tenantId: string,
    proposalId: string,
    approvedAt: string,
    executedEventId: string
  ): Promise<AllocationExecutionRecord> {
    const proposal = await this.getAllocationProposalById(tenantId, proposalId);
    if (!proposal) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }
    if (proposal.status === 'rejected') {
      throw errors.conflict('Rejected allocation proposals cannot execute', 'ALLOCATION_REJECTED');
    }
    if (proposal.status === 'executed') {
      return {
        proposal,
        ledgerEntries: [],
        executed: false
      };
    }

      const balances = await this.getPoolBalance({
        tenantId,
        tenantSlug: null,
        traceId: randomUUID(),
        plane: 'system',
        actor: null,
        actorResolution: {
          source: 'none',
          isVerified: false,
          authenticatedIdentity: null,
          requestedActorId: null
        },
        routeGuard: {
          applies: false,
          mode: 'enabled',
          access: 'privileged'
        },
        ipAddress: null,
        userAgent: null
      }, proposal.poolNodeId);
    const available = balances.balances.find((entry) => entry.currency === proposal.currency)?.amount ?? 0;
    if (available < proposal.amount) {
      throw errors.conflict('Insufficient pool balance for allocation', 'INSUFFICIENT_POOL_BALANCE');
    }

    const next: AllocationProposalState = {
      ...proposal,
      status: 'executed',
      approvedAt: proposal.approvedAt ?? approvedAt,
      executedAt: proposal.executedAt ?? approvedAt,
      updatedAt: nowIso()
    };
    this.state.allocationProposals.set(proposalId, next);

    const poolLedger = await this.writeLedgerEntry({
      tenantId,
      category: 'financial',
      eventId: executedEventId,
      referenceType: 'pool',
      referenceId: proposal.poolNodeId,
      amount: -proposal.amount,
      currency: proposal.currency,
      metadata: {
        kind: 'allocation_debit',
        proposalId: proposal.id,
        proposalNodeId: proposal.nodeId,
        targetNodeId: proposal.targetNodeId
      }
    });
    const targetLedger = await this.writeLedgerEntry({
      tenantId,
      category: 'financial',
      eventId: executedEventId,
      referenceType: 'node',
      referenceId: proposal.targetNodeId,
      amount: proposal.amount,
      currency: proposal.currency,
      metadata: {
        kind: 'allocation_credit',
        proposalId: proposal.id,
        proposalNodeId: proposal.nodeId,
        poolNodeId: proposal.poolNodeId
      }
    });

    return {
      proposal: next,
      ledgerEntries: [poolLedger, targetLedger],
      executed: true
    };
  }

  async getPoolBalance(context: RequestContext, poolId: string): Promise<PoolBalanceRecord> {
    const relevantEntries = [...this.state.ledgerEntries.values()]
      .filter((entry) => entry.tenantId === context.tenantId)
      .filter((entry) => entry.referenceType === 'pool' && entry.referenceId === poolId);

    return {
      poolId,
      balances: this.aggregateLedgerEntries(relevantEntries),
      totalContributions: this.aggregateLedgerEntries(relevantEntries.filter((entry) => entry.metadata.kind === 'contribution')),
      totalAllocated: this.aggregateLedgerEntries(
        relevantEntries
          .filter((entry) => entry.metadata.kind === 'allocation_debit')
          .map((entry) => ({ ...entry, amount: Math.abs(entry.amount ?? 0) }))
      )
    };
  }

  async getEventImpact(context: RequestContext, eventId: string): Promise<EventImpactRecord> {
    const event = await this.getNodeById(context, eventId);
    if (!event || event.type !== 'event') {
      throw errors.notFound('Event not found', 'EVENT_NOT_FOUND');
    }

    const graph = await this.getGraph(context, eventId, 2);
    const venueEdge = graph.edges.find((edge) => edge.fromNode === eventId && edge.relation === 'occurs_at');
    const poolEdge = graph.edges.find((edge) => edge.fromNode === eventId && edge.relation === 'tied_to_pool');
    const venue = venueEdge ? graph.nodes.find((node) => node.id === venueEdge.toNode) ?? null : null;
    const pool = poolEdge ? graph.nodes.find((node) => node.id === poolEdge.toNode) ?? null : null;

    const contributions = [...this.state.contributions.values()].filter((entry) => entry.tenantId === context.tenantId && entry.eventNodeId === eventId);
    const visibleTargets = new Map(
      [...this.state.nodes.values()]
        .filter((node) => canAccessNode(context, node))
        .map((node) => [node.id, node])
    );
    const proposedAllocations: AllocationProposalView[] = [...this.state.allocationProposals.values()]
      .filter((proposal) => proposal.tenantId === context.tenantId && proposal.eventNodeId === eventId)
      .filter((proposal) => visibleTargets.has(proposal.targetNodeId))
      .map((proposal) => ({
        ...proposal,
        targetNode: visibleTargets.get(proposal.targetNodeId) ?? null
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const eventStream = [...this.state.events.values()]
      .filter((record) => record.tenantId === context.tenantId)
      .filter((record) => record.targetId === eventId || record.payload.eventNodeId === eventId)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 20);

    const nearbyNodes = event.geometry?.coordinates && Array.isArray(event.geometry.coordinates)
      ? (await this.nearbyNodes(context, {
          lat: Number(event.geometry.coordinates[1]),
          lng: Number(event.geometry.coordinates[0]),
          radiusMeters: 1500
        })).filter((node) => node.id !== eventId).slice(0, 5)
      : [];

    return {
      event,
      venue,
      pool,
      graph,
      contributionCount: contributions.length,
      totalContributions: this.aggregateCurrencyAmounts(contributions),
      proposedAllocations,
      approvedAllocations: proposedAllocations.filter((proposal) => proposal.approvedAt !== null || proposal.status === 'executed'),
      executedTotals: this.aggregateCurrencyAmounts(proposedAllocations.filter((proposal) => proposal.executedAt !== null)),
      poolBalance: pool ? await this.getPoolBalance(context, pool.id) : null,
      eventStream,
      nearbyNodes
    };
  }

  async writeEvent(input: EventWriteInput): Promise<EventWriteResult> {
    const id = randomUUID();
    this.state.events.set(id, {
      id,
      tenantId: input.tenantId,
      eventType: input.eventType,
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      correlationId: input.traceId,
      causationId: null,
      traceId: input.traceId,
      policyResult: input.policyResult,
      payload: input.payload,
      occurredAt: nowIso(),
      recordedAt: nowIso()
    });
    return { id };
  }

  async writeLedgerEntry(input: LedgerWriteInput): Promise<LedgerEntryRecord> {
    const id = randomUUID();
    const entry: LedgerEntryState = {
      id,
      tenantId: input.tenantId,
      category: input.category,
      eventId: input.eventId,
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      hash: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      metadata: input.metadata,
      recordedAt: nowIso()
    };
    this.state.ledgerEntries.set(id, entry);
    return this.toLedgerEntryRecord(entry);
  }

  async writeAuditLog(input: AuditWriteInput): Promise<void> {
    this.state.auditLogs.push({
      ...input,
      id: randomUUID(),
      createdAt: nowIso()
    });
  }

  private requireTenantNode(tenantId: string, nodeId: string, code: string): NodeRecord {
    const node = this.state.nodes.get(nodeId);
    if (!node || node.tenantId !== tenantId || node.status === 'deleted') {
      throw errors.notFound('Node not found', code);
    }

    return node;
  }

  private createWorkflowNode(
    context: RequestContext,
    input: {
      type: string;
      status: NodeRecord['status'];
      visibility: NodeRecord['visibility'];
      sensitivityClass: string;
      slug: string | null;
      title: string | null;
      summary: string | null;
      metadata: JsonObject;
      geometry: NodeRecord['geometry'];
      timeStart: string | null;
      timeEnd: string | null;
    }
  ): NodeRecord {
    const node: NodeRecord = {
      id: randomUUID(),
      tenantId: context.tenantId,
      type: input.type,
      status: input.status,
      visibility: input.visibility,
      sensitivityClass: input.sensitivityClass,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      metadata: input.metadata,
      geometry: input.geometry,
      timeStart: input.timeStart,
      timeEnd: input.timeEnd,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      version: 1
    };

    this.state.nodes.set(node.id, node);
    return node;
  }

  private ensureEventPoolLink(tenantId: string, eventNodeId: string, poolNodeId: string): void {
    const linked = [...this.state.edges.values()].some((edge) =>
      edge.tenantId === tenantId &&
      edge.fromNode === eventNodeId &&
      edge.toNode === poolNodeId &&
      edge.relation === 'tied_to_pool' &&
      edge.status === 'active'
    );

    if (!linked) {
      throw errors.badRequest('Event must be tied to the target liquidity pool', 'EVENT_POOL_LINK_REQUIRED');
    }
  }

  private aggregateLedgerEntries(
    entries: ReadonlyArray<Pick<LedgerEntryRecord, 'currency' | 'amount'>>
  ): CurrencyAmount[] {
    const totals = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.currency) {
        continue;
      }

      totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + (entry.amount ?? 0));
    }

    return [...totals.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((left, right) => left.currency.localeCompare(right.currency));
  }

  private aggregateCurrencyAmounts(
    records: ReadonlyArray<Pick<ContributionRecord | AllocationProposalRecord, 'currency' | 'amount'>>
  ): CurrencyAmount[] {
    const totals = new Map<string, number>();
    for (const record of records) {
      totals.set(record.currency, (totals.get(record.currency) ?? 0) + record.amount);
    }

    return [...totals.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((left, right) => left.currency.localeCompare(right.currency));
  }

  private toApprovalRecord(approval: ApprovalState): ApprovalRecord {
    return {
      id: approval.id,
      requestType: approval.requestType,
      targetType: approval.targetType,
      targetId: approval.targetId,
      status: approval.status,
      requiredApprovals: approval.requiredApprovals,
      currentApprovals: approval.currentApprovals,
      context: approval.context,
      createdAt: approval.createdAt,
      resolvedAt: approval.resolvedAt
    };
  }

  private toLedgerEntryRecord(entry: LedgerEntryState): LedgerEntryRecord {
    return {
      id: entry.id,
      category: entry.category,
      eventId: entry.eventId,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      amount: entry.amount,
      currency: entry.currency,
      hash: entry.hash,
      metadata: entry.metadata,
      recordedAt: entry.recordedAt
    };
  }
}

export function createSeededFalakRepository(): {
  repository: InMemoryFalakRepository;
  tenantId: string;
  otherTenantId: string;
  adminContext: RequestContext;
  curatorContext: RequestContext;
  governorContext: RequestContext;
  viewerContext: RequestContext;
  publicContext: RequestContext;
  nodeIds: {
    publicVenue: string;
    publicEvent: string;
    community: string;
    campaign: string;
    liquidityPool: string;
    restrictedStory: string;
    region: string;
    organisation: string;
    otherTenantPublicVenue: string;
    otherTenantCampaign: string;
    otherTenantRestrictedStory: string;
  };
} {
  const repository = new InMemoryFalakRepository();
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const otherTenantId = '22222222-2222-4222-8222-222222222222';
  repository.state.tenants.set(tenantId, {
    id: tenantId,
    slug: 'anu-beta',
    name: 'ANU Beta'
  });
  repository.state.tenants.set(otherTenantId, {
    id: otherTenantId,
    slug: 'partner-beta',
    name: 'Partner Beta'
  });

  const admin: ResolvedActor = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    tenantId,
    actorType: 'user',
    externalAuthId: 'anu-admin',
    email: 'admin@anu.beta',
    displayName: 'ANU Admin',
    roles: [{ id: randomUUID(), roleName: 'tenant_admin', regionNodeId: null }]
  };
  const curator: ResolvedActor = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    tenantId,
    actorType: 'user',
    externalAuthId: 'anu-curator',
    email: 'curator@anu.beta',
    displayName: 'ANU Curator',
    roles: [{ id: randomUUID(), roleName: 'curator', regionNodeId: null }]
  };
  const governor: ResolvedActor = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    tenantId,
    actorType: 'user',
    externalAuthId: 'anu-governor',
    email: 'governor@anu.beta',
    displayName: 'ANU Governor',
    roles: [{ id: randomUUID(), roleName: 'governor', regionNodeId: null }]
  };
  const viewer: ResolvedActor = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    tenantId,
    actorType: 'user',
    externalAuthId: 'anu-viewer',
    email: 'viewer@anu.beta',
    displayName: 'ANU Viewer',
    roles: [{ id: randomUUID(), roleName: 'viewer', regionNodeId: null }]
  };
  [admin, curator, governor, viewer].forEach((actor) => repository.state.actors.set(actor.id, actor));

  const now = nowIso();
  const nodes: Array<NodeRecord> = [
    {
      id: '10000000-0000-4000-8000-000000000001',
      tenantId,
      type: 'region',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'ngunnawal-country',
      title: 'Ngunnawal Country',
      summary: 'Regional node',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1187, -35.2777] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000002',
      tenantId,
      type: 'venue',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'anu-school-of-music',
      title: 'ANU School of Music',
      summary: 'Public venue',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1201, -35.2792] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      tenantId,
      type: 'organisation',
      status: 'active',
      visibility: 'tenant',
      sensitivityClass: 'normal',
      slug: 'anu-cultural-commons',
      title: 'ANU Cultural Commons',
      summary: 'Tenant organisation',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1236, -35.2811] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000004',
      tenantId,
      type: 'event',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'weaving-futures-festival',
      title: 'Weaving Futures Festival',
      summary: 'Public festival',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1205, -35.2795] },
      timeStart: '2026-05-01T08:00:00.000Z',
      timeEnd: '2026-05-03T18:00:00.000Z',
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000005',
      tenantId,
      type: 'community',
      status: 'active',
      visibility: 'tenant',
      sensitivityClass: 'normal',
      slug: 'ngunnawal-arts-circle',
      title: 'Ngunnawal Arts Circle',
      summary: 'Tenant-scoped community node',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1192, -35.2801] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000006',
      tenantId,
      type: 'campaign',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'first-nations-stage-fund',
      title: 'First Nations Stage Fund',
      summary: 'Public campaign node',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1212, -35.2799] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000007',
      tenantId,
      type: 'liquidity_pool',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'weaving-futures-pool',
      title: 'Weaving Futures Pool',
      summary: 'Public liquidity pool for the event slice',
      metadata: {},
      geometry: null,
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '10000000-0000-4000-8000-000000000008',
      tenantId,
      type: 'story',
      status: 'active',
      visibility: 'restricted',
      sensitivityClass: 'cultural-sensitive',
      slug: 'songlines-of-lake-burley',
      title: 'Songlines of Lake Burley',
      summary: 'Restricted cultural story',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1169, -35.2922] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '20000000-0000-4000-8000-000000000001',
      tenantId: otherTenantId,
      type: 'venue',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'partner-hall',
      title: 'Partner Hall',
      summary: 'Cross-tenant venue',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1305, -35.2855] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      tenantId: otherTenantId,
      type: 'campaign',
      status: 'active',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'partner-campaign',
      title: 'Partner Campaign',
      summary: 'Cross-tenant campaign',
      metadata: {},
      geometry: null,
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    },
    {
      id: '20000000-0000-4000-8000-000000000003',
      tenantId: otherTenantId,
      type: 'story',
      status: 'active',
      visibility: 'restricted',
      sensitivityClass: 'cultural-sensitive',
      slug: 'partner-restricted-story',
      title: 'Partner Restricted Story',
      summary: 'Cross-tenant restricted story',
      metadata: {},
      geometry: { type: 'Point', coordinates: [149.1315, -35.2865] },
      timeStart: null,
      timeEnd: null,
      createdAt: now,
      updatedAt: now,
      version: 1
    }
  ];
  nodes.forEach((node) => repository.state.nodes.set(node.id, node));

  const basePolicies: PolicyRecord[] = [
    {
      id: randomUUID(),
      tenantId,
      name: 'node-create',
      resourceType: 'node',
      action: 'create',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'node-update-restricted',
      resourceType: 'node',
      action: 'update',
      effect: 'requires_approval',
      priority: 5,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], resource_visibility_in: ['restricted'], approval_threshold: 2, require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'node-update-general',
      resourceType: 'node',
      action: 'update',
      effect: 'allow',
      priority: 20,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'node-delete-viewer-deny',
      resourceType: 'node',
      action: 'delete',
      effect: 'deny',
      priority: 1,
      enabled: true,
      conditions: { roles_any: ['viewer'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'edge-create',
      resourceType: 'edge',
      action: 'create',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'approval-create',
      resourceType: 'approval',
      action: 'create',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'approval-vote',
      resourceType: 'approval',
      action: 'vote',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'governor'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'event-create',
      resourceType: 'event',
      action: 'create',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'contribution-record-actor',
      resourceType: 'contribution',
      action: 'record',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'contribution-record-anonymous',
      resourceType: 'contribution',
      action: 'record',
      effect: 'allow',
      priority: 20,
      enabled: true,
      conditions: { context_equals: { anonymous: true } },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'allocation-propose',
      resourceType: 'allocation',
      action: 'propose',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'allocation-execute-needs-approval',
      resourceType: 'allocation',
      action: 'execute',
      effect: 'requires_approval',
      priority: 5,
      enabled: true,
      conditions: {
        roles_any: ['tenant_admin', 'curator'],
        context_equals: { currency: 'AUD' },
        context_number_gt: { amount: 500 },
        approval_threshold: 2,
        require_actor: true
      },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'allocation-execute-allow',
      resourceType: 'allocation',
      action: 'execute',
      effect: 'allow',
      priority: 20,
      enabled: true,
      conditions: { roles_any: ['tenant_admin', 'curator'], require_actor: true },
      description: null
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'federation-link-create',
      resourceType: 'federation_link',
      action: 'create',
      effect: 'allow',
      priority: 10,
      enabled: true,
      conditions: { roles_any: ['tenant_admin'], require_actor: true },
      description: null
    }
  ];
  basePolicies.forEach((policy) => repository.state.policies.set(policy.id, policy));

  const makeContext = (actor: ResolvedActor | null, plane: RequestContext['plane']): RequestContext => ({
    traceId: randomUUID(),
    tenantId,
    tenantSlug: 'anu-beta',
    plane,
    actor,
    actorResolution: {
      source: actor ? 'verified_auth' : 'none',
      isVerified: actor !== null,
      authenticatedIdentity: actor?.externalAuthId ?? actor?.email ?? null,
      requestedActorId: null
    },
    routeGuard: {
      applies: false,
      mode: 'enabled',
      access: plane === 'public' ? 'public' : 'privileged'
    },
    ipAddress: '127.0.0.1',
    userAgent: 'jest'
  });

  return {
    repository,
    tenantId,
    otherTenantId,
    adminContext: makeContext(admin, 'privileged'),
    curatorContext: makeContext(curator, 'privileged'),
    governorContext: makeContext(governor, 'privileged'),
    viewerContext: makeContext(viewer, 'privileged'),
    publicContext: makeContext(null, 'public'),
    nodeIds: {
      region: nodes[0]!.id,
      publicVenue: nodes[1]!.id,
      organisation: nodes[2]!.id,
      publicEvent: nodes[3]!.id,
      community: nodes[4]!.id,
      campaign: nodes[5]!.id,
      liquidityPool: nodes[6]!.id,
      restrictedStory: nodes[7]!.id,
      otherTenantPublicVenue: nodes[8]!.id,
      otherTenantCampaign: nodes[9]!.id,
      otherTenantRestrictedStory: nodes[10]!.id
    }
  };
}
