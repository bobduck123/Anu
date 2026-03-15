export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type FalakVisibility = 'public' | 'tenant' | 'restricted';
export type FalakNodeStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type FalakEdgeStatus = 'active' | 'deprecated';
export type FalakPolicyEffect = 'allow' | 'deny' | 'requires_approval';
export type FalakPolicyResult = 'allowed' | 'denied' | 'pending';
export type FalakApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type FalakApprovalVote = 'approve' | 'reject';
export type FalakLedgerCategory =
  | 'financial'
  | 'governance'
  | 'verification'
  | 'moderation'
  | 'security'
  | 'publication';
export type FalakPlane = 'public' | 'privileged' | 'system';
export type AllocationProposalStatus = 'pending' | 'executed' | 'rejected';
export type FalakRouteGuardMode = 'disabled' | 'admin_only' | 'tenant_allowlist' | 'enabled';
export type FalakGuardedRouteAccess = 'public' | 'privileged';
export type FalakActorResolutionSource = 'none' | 'verified_auth' | 'trusted_header_override';

export interface GeometryValue {
  type: string;
  coordinates?: JsonValue;
  geometries?: GeometryValue[];
  [key: string]: JsonValue | GeometryValue[] | undefined;
}

export interface ActorRoleAssignment {
  id: string;
  roleName: string;
  regionNodeId: string | null;
}

export interface ResolvedActor {
  id: string;
  tenantId: string;
  actorType: string;
  externalAuthId: string | null;
  email: string | null;
  displayName: string | null;
  roles: ActorRoleAssignment[];
}

export interface ActorResolutionContext {
  source: FalakActorResolutionSource;
  isVerified: boolean;
  authenticatedIdentity: string | null;
  requestedActorId: string | null;
}

export interface RouteGuardContext {
  applies: boolean;
  mode: FalakRouteGuardMode;
  access: FalakGuardedRouteAccess;
}

export interface RequestContext {
  traceId: string;
  tenantId: string;
  tenantSlug: string | null;
  plane: FalakPlane;
  actor: ResolvedActor | null;
  actorResolution: ActorResolutionContext;
  routeGuard: RouteGuardContext;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface NodeRecord {
  id: string;
  tenantId: string;
  type: string;
  status: FalakNodeStatus;
  visibility: FalakVisibility;
  sensitivityClass: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  metadata: JsonObject;
  geometry: GeometryValue | null;
  timeStart: string | null;
  timeEnd: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  distanceMeters?: number;
}

export interface EdgeRecord {
  id: string;
  tenantId: string;
  fromNode: string;
  toNode: string;
  relation: string;
  status: FalakEdgeStatus;
  weight: number;
  validFrom: string | null;
  validTo: string | null;
  evidence: JsonValue[];
  metadata: JsonObject;
  createdAt: string;
}

export interface PolicyRecord {
  id: string;
  tenantId: string;
  name: string;
  resourceType: string;
  action: string;
  effect: FalakPolicyEffect;
  priority: number;
  enabled: boolean;
  conditions: JsonObject;
  description: string | null;
}

export interface PolicyEvaluationInput {
  resourceType: string;
  action: string;
  targetId?: string;
  targetTenantId?: string;
  regionNodeId?: string;
  resourceVisibility?: FalakVisibility;
  sensitivityClass?: string;
  nodeType?: string;
  context?: JsonObject;
}

export interface PolicyEvaluationResult {
  decision: FalakPolicyEffect;
  matchedPolicyIds: string[];
  reasons: string[];
  requiredApprovals: number | null;
  approvalId: string | null;
}

export interface ApprovalRecord {
  id: string;
  requestType: string;
  targetType: string;
  targetId: string;
  status: FalakApprovalStatus;
  requiredApprovals: number;
  currentApprovals: number;
  context: JsonObject;
  createdAt: string;
  resolvedAt: string | null;
}

export interface EventRecord {
  id: string;
  tenantId: string;
  eventType: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  correlationId: string | null;
  causationId: string | null;
  traceId: string | null;
  policyResult: FalakPolicyResult;
  payload: JsonObject;
  occurredAt: string;
  recordedAt: string;
}

export interface LedgerEntryRecord {
  id: string;
  category: FalakLedgerCategory;
  eventId: string | null;
  referenceType: string;
  referenceId: string | null;
  amount: number | null;
  currency: string | null;
  hash: string;
  metadata: JsonObject;
  recordedAt: string;
}

export interface GraphRecord {
  rootNodeId: string;
  depth: number;
  nodes: NodeRecord[];
  edges: EdgeRecord[];
}

export interface ListNodesFilters {
  type?: string;
  status?: FalakNodeStatus;
  visibility?: FalakVisibility;
  query?: string;
  limit: number;
  cursor?: string;
}

export interface ListNodesResult {
  items: NodeRecord[];
  nextCursor: string | null;
}

export interface ListEventsFilters {
  eventType?: string;
  targetType?: string;
  targetId?: string;
  limit: number;
}

export interface ListLedgerFilters {
  category?: FalakLedgerCategory;
  referenceType?: string;
  referenceId?: string;
}

export interface SpatialNearbyFilters {
  lat: number;
  lng: number;
  radiusMeters: number;
  type?: string;
}

export interface CreateNodeInput {
  type: string;
  visibility: FalakVisibility;
  sensitivityClass: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  metadata: JsonObject;
  geometry: GeometryValue | null;
  timeStart: string | null;
  timeEnd: string | null;
}

export interface UpdateNodeInput {
  status?: FalakNodeStatus;
  visibility?: FalakVisibility;
  sensitivityClass?: string;
  slug?: string | null;
  title?: string | null;
  summary?: string | null;
  metadata?: JsonObject;
  geometry?: GeometryValue | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  expectedVersion: number;
}

export interface CreateEdgeInput {
  fromNode: string;
  toNode: string;
  relation: string;
  weight: number;
  validFrom: string | null;
  validTo: string | null;
  evidence: JsonValue[];
  metadata: JsonObject;
}

export interface CreateApprovalInput {
  requestType: string;
  targetType: string;
  targetId: string;
  requiredApprovals: number;
  context: JsonObject;
}

export interface ApprovalVoteInput {
  vote: FalakApprovalVote;
  note: string | null;
}

export interface CreateFederationLinkInput {
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  contract: JsonObject;
}

export interface EventWriteInput {
  tenantId: string;
  eventType: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  policyResult: FalakPolicyResult;
  payload: JsonObject;
  traceId: string;
}

export interface LedgerWriteInput {
  tenantId: string;
  category: FalakLedgerCategory;
  eventId: string | null;
  referenceType: string;
  referenceId: string | null;
  amount?: number | null;
  currency?: string | null;
  metadata: JsonObject;
}

export interface AuditWriteInput {
  tenantId: string | null;
  actorId: string | null;
  plane: FalakPlane;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: JsonObject;
}

export interface MutationPlan<T> {
  action: string;
  resourceType: string;
  targetType: string;
  targetId?: string | null | ((result: T) => string | null);
  policy: PolicyEvaluationInput;
  materializeLedger?:
    | false
    | ((result: T, decision: PolicyEvaluationResult) => {
        category: FalakLedgerCategory;
        referenceType: string;
        referenceId?: string | null;
        amount?: number | null;
        currency?: string | null;
        metadata?: JsonObject;
      } | null);
  mutation: (repository: FalakRepository) => Promise<T>;
  eventPayload: (result: T, decision: PolicyEvaluationResult) => JsonObject;
  fanoutChannel?: string;
}

export interface MutationResult<T> {
  decision: PolicyEvaluationResult;
  result: T;
}

export interface FanoutMessage {
  channel: string;
  eventId: string;
  tenantId: string;
  traceId: string;
  eventType: string;
  payload: JsonObject;
}

export interface EventWriteResult {
  id: string;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface CreateEventWorkflowInput {
  visibility: FalakVisibility;
  sensitivityClass: string;
  slug: string | null;
  title: string;
  summary: string | null;
  metadata: JsonObject;
  geometry: GeometryValue | null;
  timeStart: string | null;
  timeEnd: string | null;
  venueNodeId: string;
  communityNodeId: string | null;
  campaignNodeId: string | null;
  poolNodeId: string | null;
}

export interface EventWorkflowRecord {
  event: NodeRecord;
  linkedNodes: NodeRecord[];
  links: EdgeRecord[];
}

export interface RecordContributionInput {
  eventNodeId: string;
  poolNodeId: string;
  amount: number;
  currency: string;
  note: string | null;
  reference: string | null;
  contributedAt: string | null;
}

export interface ContributionRecord {
  id: string;
  tenantId: string;
  nodeId: string;
  eventNodeId: string;
  poolNodeId: string;
  contributorActorId: string | null;
  amount: number;
  currency: string;
  note: string | null;
  reference: string | null;
  contributedAt: string;
  createdAt: string;
}

export interface CreateAllocationProposalInput {
  eventNodeId: string | null;
  poolNodeId: string;
  targetNodeId: string;
  amount: number;
  currency: string;
  rationale: string | null;
}

export interface AllocationProposalRecord {
  id: string;
  tenantId: string;
  nodeId: string;
  eventNodeId: string | null;
  poolNodeId: string;
  targetNodeId: string;
  requestedById: string | null;
  amount: number;
  currency: string;
  rationale: string | null;
  status: AllocationProposalStatus;
  approvalId: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationProposalView extends AllocationProposalRecord {
  targetNode: NodeRecord | null;
}

export interface AllocationExecutionRecord {
  proposal: AllocationProposalRecord;
  ledgerEntries: LedgerEntryRecord[];
  executed: boolean;
}

export interface AllocationProposalWorkflowRecord {
  proposal: AllocationProposalRecord;
  approval: ApprovalRecord | null;
  ledgerEntries: LedgerEntryRecord[];
  executed: boolean;
}

export interface ApprovalVoteWorkflowRecord {
  approval: ApprovalRecord;
  proposal: AllocationProposalRecord | null;
  ledgerEntries: LedgerEntryRecord[];
  executed: boolean;
}

export interface PoolBalanceRecord {
  poolId: string;
  balances: CurrencyAmount[];
  totalContributions: CurrencyAmount[];
  totalAllocated: CurrencyAmount[];
}

export interface EventImpactRecord {
  event: NodeRecord;
  venue: NodeRecord | null;
  pool: NodeRecord | null;
  graph: GraphRecord;
  contributionCount: number;
  totalContributions: CurrencyAmount[];
  proposedAllocations: AllocationProposalView[];
  approvedAllocations: AllocationProposalView[];
  executedTotals: CurrencyAmount[];
  poolBalance: PoolBalanceRecord | null;
  eventStream: EventRecord[];
  nearbyNodes: NodeRecord[];
}

export interface FalakRepository {
  transaction<T>(tenantId: string, execute: (repository: FalakRepository) => Promise<T>): Promise<T>;
  findTenantById(tenantId: string): Promise<{ id: string; slug: string; name: string } | null>;
  findActorById(tenantId: string, actorId: string): Promise<ResolvedActor | null>;
  findActorByIdentity(tenantId: string, identity: string): Promise<ResolvedActor | null>;
  listPolicies(tenantId: string, resourceType: string, action: string): Promise<PolicyRecord[]>;
  listNodes(context: RequestContext, filters: ListNodesFilters): Promise<ListNodesResult>;
  getNodeById(context: RequestContext, nodeId: string): Promise<NodeRecord | null>;
  createNode(context: RequestContext, input: CreateNodeInput): Promise<NodeRecord>;
  updateNode(context: RequestContext, nodeId: string, input: UpdateNodeInput): Promise<NodeRecord>;
  softDeleteNode(context: RequestContext, nodeId: string, expectedVersion: number): Promise<void>;
  createEdge(context: RequestContext, input: CreateEdgeInput): Promise<EdgeRecord>;
  getGraph(context: RequestContext, nodeId: string, depth: number): Promise<GraphRecord>;
  createApproval(context: RequestContext, input: CreateApprovalInput): Promise<ApprovalRecord>;
  getApprovalById(tenantId: string, approvalId: string): Promise<ApprovalRecord | null>;
  recordApprovalVote(context: RequestContext, approvalId: string, input: ApprovalVoteInput): Promise<ApprovalRecord>;
  listEvents(context: RequestContext, filters: ListEventsFilters): Promise<EventRecord[]>;
  listLedger(context: RequestContext, filters: ListLedgerFilters): Promise<LedgerEntryRecord[]>;
  nearbyNodes(context: RequestContext, filters: SpatialNearbyFilters): Promise<NodeRecord[]>;
  createFederationLink(context: RequestContext, input: CreateFederationLinkInput): Promise<EdgeRecord>;
  createEventWithLinks(context: RequestContext, input: CreateEventWorkflowInput): Promise<EventWorkflowRecord>;
  recordContribution(context: RequestContext, input: RecordContributionInput): Promise<ContributionRecord>;
  createAllocationProposal(context: RequestContext, input: CreateAllocationProposalInput): Promise<AllocationProposalRecord>;
  getAllocationProposalById(tenantId: string, proposalId: string): Promise<AllocationProposalRecord | null>;
  attachApprovalToAllocationProposal(tenantId: string, proposalId: string, approvalId: string): Promise<AllocationProposalRecord>;
  rejectAllocationProposal(tenantId: string, proposalId: string, rejectedAt: string): Promise<AllocationProposalRecord>;
  executeAllocation(tenantId: string, proposalId: string, approvedAt: string, executedEventId: string): Promise<AllocationExecutionRecord>;
  getPoolBalance(context: RequestContext, poolId: string): Promise<PoolBalanceRecord>;
  getEventImpact(context: RequestContext, eventId: string): Promise<EventImpactRecord>;
  writeEvent(input: EventWriteInput): Promise<EventWriteResult>;
  writeLedgerEntry(input: LedgerWriteInput): Promise<LedgerEntryRecord>;
  writeAuditLog(input: AuditWriteInput): Promise<void>;
}
