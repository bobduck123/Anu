import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { errors } from '../../utils/errors';
import { hasRestrictedReadAccess } from '../domain/access';
import { logFalak } from '../observability/falakTelemetry';
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

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

interface TenantRow {
  id: string;
  slug: string;
  name: string;
}

interface ActorRow {
  id: string;
  tenant_id: string;
  actor_type: string;
  external_auth_id: string | null;
  email: string | null;
  display_name: string | null;
}

interface ActorRoleRow {
  id: string;
  role_name: string;
  region_node_id: string | null;
}

interface NodeRow {
  id: string;
  tenant_id: string;
  type: string;
  status: string;
  visibility: string;
  sensitivity_class: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  metadata: JsonObject;
  geometry: Record<string, unknown> | null;
  time_start: Date | null;
  time_end: Date | null;
  created_at: Date;
  updated_at: Date;
  version: bigint | number;
  distance_meters?: Prisma.Decimal | number | null;
}

interface EdgeRow {
  id: string;
  tenant_id: string;
  from_node: string;
  to_node: string;
  relation: string;
  status: string;
  weight: Prisma.Decimal | number;
  valid_from: Date | null;
  valid_to: Date | null;
  evidence: Prisma.JsonValue[];
  metadata: JsonObject;
  created_at: Date;
}

interface PolicyRow {
  id: string;
  tenant_id: string;
  name: string;
  resource_type: string;
  action: string;
  effect: string;
  priority: number;
  enabled: boolean;
  conditions: JsonObject;
  description: string | null;
}

interface ApprovalRow {
  id: string;
  request_type: string;
  target_type: string;
  target_id: string;
  status: string;
  required_approvals: number;
  current_approvals: number;
  context: JsonObject;
  created_at: Date;
  resolved_at: Date | null;
}

interface EventRow {
  id: string;
  tenant_id: string;
  event_type: string;
  actor_id: string | null;
  target_type: string;
  target_id: string | null;
  correlation_id: string | null;
  causation_id: string | null;
  trace_id: string | null;
  policy_result: string;
  payload: JsonObject;
  occurred_at: Date;
  recorded_at: Date;
}

interface LedgerRow {
  id: string;
  category: string;
  event_id: string | null;
  reference_type: string;
  reference_id: string | null;
  amount: Prisma.Decimal | number | null;
  currency: string | null;
  hash: string;
  metadata: JsonObject;
  recorded_at: Date;
}

interface ContributionRow {
  id: string;
  tenant_id: string;
  node_id: string;
  event_node_id: string;
  pool_node_id: string;
  contributor_actor_id: string | null;
  amount: Prisma.Decimal | number;
  currency: string;
  note: string | null;
  reference: string | null;
  contributed_at: Date;
  created_at: Date;
}

interface AllocationProposalRow {
  id: string;
  tenant_id: string;
  node_id: string;
  event_node_id: string | null;
  pool_node_id: string;
  target_node_id: string;
  requested_by: string | null;
  amount: Prisma.Decimal | number;
  currency: string;
  rationale: string | null;
  status: string;
  approval_id: string | null;
  approved_at: Date | null;
  executed_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const nodeSelectColumns = (alias: string, includeDistance = false): Prisma.Sql => {
  const tableAlias = Prisma.raw(alias);
  const distanceColumns = includeDistance
    ? Prisma.sql`, distance_meters`
    : Prisma.sql``;

  return Prisma.sql`
    ${tableAlias}.id,
    ${tableAlias}.tenant_id,
    ${tableAlias}.type,
    ${tableAlias}.status,
    ${tableAlias}.visibility,
    ${tableAlias}.sensitivity_class,
    ${tableAlias}.slug,
    ${tableAlias}.title,
    ${tableAlias}.summary,
    ${tableAlias}.metadata,
    CASE
      WHEN ${tableAlias}.geometry IS NULL THEN NULL
      ELSE falak.ST_AsGeoJSON(${tableAlias}.geometry)::jsonb
    END AS geometry,
    ${tableAlias}.time_start,
    ${tableAlias}.time_end,
    ${tableAlias}.created_at,
    ${tableAlias}.updated_at,
    ${tableAlias}.version
    ${distanceColumns}
  `;
};

function stringifyJson(value: JsonObject | Prisma.JsonValue[] | Record<string, unknown> | null | undefined): string {
  return JSON.stringify(value ?? {});
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toNumber(value: Prisma.Decimal | bigint | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return value.toNumber();
}

function encodeCursor(row: Pick<NodeRow, 'created_at' | 'id'>): string {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at.toISOString(), id: row.id })).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt: string;
      id: string;
    };

    if (!decoded.createdAt || !decoded.id) {
      throw new Error('Malformed cursor');
    }

    return decoded;
  } catch {
    throw errors.badRequest('Invalid cursor supplied', 'INVALID_CURSOR');
  }
}

function mapNodeRow(row: NodeRow): NodeRecord {
  const distance = toNumber(row.distance_meters);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    status: row.status as NodeRecord['status'],
    visibility: row.visibility as NodeRecord['visibility'],
    sensitivityClass: row.sensitivity_class,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    metadata: row.metadata ?? {},
    geometry: (row.geometry as NodeRecord['geometry']) ?? null,
    timeStart: toIsoString(row.time_start),
    timeEnd: toIsoString(row.time_end),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: Number(row.version),
    ...(distance !== null ? { distanceMeters: distance } : {})
  };
}

function mapEdgeRow(row: EdgeRow): EdgeRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fromNode: row.from_node,
    toNode: row.to_node,
    relation: row.relation,
    status: row.status as EdgeRecord['status'],
    weight: toNumber(row.weight) ?? 0,
    validFrom: toIsoString(row.valid_from),
    validTo: toIsoString(row.valid_to),
    evidence: (row.evidence ?? []) as EdgeRecord['evidence'],
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString()
  };
}

function mapPolicyRow(row: PolicyRow): PolicyRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    resourceType: row.resource_type,
    action: row.action,
    effect: row.effect as PolicyRecord['effect'],
    priority: row.priority,
    enabled: row.enabled,
    conditions: row.conditions ?? {},
    description: row.description
  };
}

function mapApprovalRow(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    requestType: row.request_type,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status as ApprovalRecord['status'],
    requiredApprovals: row.required_approvals,
    currentApprovals: row.current_approvals,
    context: row.context ?? {},
    createdAt: row.created_at.toISOString(),
    resolvedAt: toIsoString(row.resolved_at)
  };
}

function mapEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    targetType: row.target_type,
    targetId: row.target_id,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    traceId: row.trace_id,
    policyResult: row.policy_result as EventRecord['policyResult'],
    payload: row.payload ?? {},
    occurredAt: row.occurred_at.toISOString(),
    recordedAt: row.recorded_at.toISOString()
  };
}

function mapLedgerRow(row: LedgerRow): LedgerEntryRecord {
  return {
    id: row.id,
    category: row.category as FalakLedgerCategory,
    eventId: row.event_id,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    amount: toNumber(row.amount),
    currency: row.currency,
    hash: row.hash,
    metadata: row.metadata ?? {},
    recordedAt: row.recorded_at.toISOString()
  };
}

function mapContributionRow(row: ContributionRow): ContributionRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    nodeId: row.node_id,
    eventNodeId: row.event_node_id,
    poolNodeId: row.pool_node_id,
    contributorActorId: row.contributor_actor_id,
    amount: toNumber(row.amount) ?? 0,
    currency: row.currency,
    note: row.note,
    reference: row.reference,
    contributedAt: row.contributed_at.toISOString(),
    createdAt: row.created_at.toISOString()
  };
}

function mapAllocationProposalRow(row: AllocationProposalRow): AllocationProposalRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    nodeId: row.node_id,
    eventNodeId: row.event_node_id,
    poolNodeId: row.pool_node_id,
    targetNodeId: row.target_node_id,
    requestedById: row.requested_by,
    amount: toNumber(row.amount) ?? 0,
    currency: row.currency,
    rationale: row.rationale,
    status: row.status as AllocationProposalRecord['status'],
    approvalId: row.approval_id,
    approvedAt: toIsoString(row.approved_at),
    executedAt: toIsoString(row.executed_at),
    rejectedAt: toIsoString(row.rejected_at),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapCurrencyRows(
  rows: Array<{ currency: string | null; amount: Prisma.Decimal | number | null }>
): CurrencyAmount[] {
  return rows
    .filter((row): row is { currency: string; amount: Prisma.Decimal | number | null } => Boolean(row.currency))
    .map((row) => ({
      currency: row.currency,
      amount: toNumber(row.amount) ?? 0
    }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

function canAccessNode(context: RequestContext, node: Pick<NodeRecord, 'tenantId' | 'visibility' | 'status'>): boolean {
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

export class PrismaFalakRepository implements FalakRepository {
  constructor(private readonly prisma: PrismaExecutor) {}

  async transaction<T>(tenantId: string, execute: (repository: FalakRepository) => Promise<T>): Promise<T> {
    if (!('$transaction' in this.prisma)) {
      await this.setTenantSession(tenantId);
      return execute(this);
    }

    const client = this.prisma as PrismaClient;
    return client.$transaction(async (tx) => {
      const repository = new PrismaFalakRepository(tx);
      await repository.setTenantSession(tenantId);
      return execute(repository);
    });
  }

  private async withTenantSession<T>(tenantId: string, execute: (db: PrismaExecutor) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      const client = this.prisma as PrismaClient;
      return client.$transaction(async (tx) => {
        await this.setTenantSessionOn(tx, tenantId);
        return execute(tx);
      });
    }

    await this.setTenantSessionOn(this.prisma, tenantId);
    return execute(this.prisma);
  }

  async findTenantById(tenantId: string): Promise<TenantRow | null> {
    const rows = await this.withTenantSession(tenantId, (db) => db.$queryRaw<TenantRow[]>(Prisma.sql`
      SELECT id, slug, name
      FROM falak.tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `));
    return rows[0] ?? null;
  }

  async findActorById(tenantId: string, actorId: string): Promise<ResolvedActor | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const actorRows = await db.$queryRaw<ActorRow[]>(Prisma.sql`
        SELECT id, tenant_id, actor_type, external_auth_id, email, display_name
        FROM falak.actors
        WHERE tenant_id = ${tenantId}::uuid AND id = ${actorId}::uuid
        LIMIT 1
      `);

      return this.hydrateActor(db, actorRows[0] ?? null);
    });
  }

  async findActorByIdentity(tenantId: string, identity: string): Promise<ResolvedActor | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const actorRows = await db.$queryRaw<ActorRow[]>(Prisma.sql`
        SELECT id, tenant_id, actor_type, external_auth_id, email, display_name
        FROM falak.actors
        WHERE tenant_id = ${tenantId}::uuid
          AND (
            external_auth_id = ${identity}
            OR email = ${identity}
            OR display_name = ${identity}
          )
        ORDER BY created_at ASC
        LIMIT 1
      `);

      return this.hydrateActor(db, actorRows[0] ?? null);
    });
  }

  async listPolicies(tenantId: string, resourceType: string, action: string): Promise<PolicyRecord[]> {
    const rows = await this.withTenantSession(tenantId, (db) => db.$queryRaw<PolicyRow[]>(Prisma.sql`
      SELECT id, tenant_id, name, resource_type, action, effect, priority, enabled, conditions, description
      FROM falak.policies
      WHERE tenant_id = ${tenantId}::uuid
        AND enabled = TRUE
        AND resource_type = ${resourceType}
        AND action = ${action}
      ORDER BY priority ASC, created_at ASC
    `));

    return rows.map(mapPolicyRow);
  }

  async listNodes(context: RequestContext, filters: ListNodesFilters): Promise<ListNodesResult> {
    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`n.tenant_id = ${context.tenantId}::uuid`
    ];

    if (filters.type) {
      whereClauses.push(Prisma.sql`n.type = ${filters.type}`);
    }

    if (filters.status) {
      whereClauses.push(Prisma.sql`n.status = ${filters.status}::falak.falak_node_status`);
    } else {
      whereClauses.push(Prisma.sql`n.status <> 'deleted'::falak.falak_node_status`);
    }

    const allowedVisibilities = this.allowedVisibilities(context, filters.visibility);
    whereClauses.push(Prisma.sql`n.visibility IN (${Prisma.join(allowedVisibilities.map((value) => Prisma.sql`${value}::falak.falak_visibility`))})`);

    if (filters.query) {
      whereClauses.push(Prisma.sql`n.search_vector @@ plainto_tsquery('simple', ${filters.query})`);
    }

    if (filters.cursor) {
      const cursor = decodeCursor(filters.cursor);
      whereClauses.push(
        Prisma.sql`(n.created_at, n.id) < (${new Date(cursor.createdAt)}::timestamptz, ${cursor.id}::uuid)`
      );
    }

    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE ${Prisma.join(whereClauses, ' AND ')}
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ${filters.limit + 1}
    `));

    const items = rows.slice(0, filters.limit).map(mapNodeRow);
    const nextCursor = rows.length > filters.limit ? encodeCursor(rows[filters.limit - 1]!) : null;

    return { items, nextCursor };
  }

  async getNodeById(context: RequestContext, nodeId: string): Promise<NodeRecord | null> {
    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE n.tenant_id = ${context.tenantId}::uuid
        AND n.id = ${nodeId}::uuid
      LIMIT 1
    `));

    const node = rows[0] ? mapNodeRow(rows[0]) : null;
    if (!node || !canAccessNode(context, node)) {
      return null;
    }

    return node;
  }

  async createNode(context: RequestContext, input: CreateNodeInput): Promise<NodeRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    // Prisma cannot round-trip PostGIS geometry columns, so geometry mutations use
    // parameterized raw SQL around ST_GeomFromGeoJSON / ST_AsGeoJSON.
    const geometrySql = input.geometry
      ? Prisma.sql`falak.ST_SetSRID(falak.ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)}), 4326)`
      : Prisma.sql`NULL`;

    const rows = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      INSERT INTO falak.nodes (
        tenant_id,
        type,
        status,
        visibility,
        sensitivity_class,
        slug,
        title,
        summary,
        metadata,
        geometry,
        time_start,
        time_end,
        created_by,
        updated_by
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${input.type},
        'draft'::falak.falak_node_status,
        ${input.visibility}::falak.falak_visibility,
        ${input.sensitivityClass},
        ${input.slug},
        ${input.title},
        ${input.summary},
        CAST(${stringifyJson(input.metadata)} AS jsonb),
        ${geometrySql},
        ${input.timeStart ? new Date(input.timeStart) : null}::timestamptz,
        ${input.timeEnd ? new Date(input.timeEnd) : null}::timestamptz,
        ${actorId}::uuid,
        ${actorId}::uuid
      )
      RETURNING ${nodeSelectColumns('nodes')}
    `);

    return mapNodeRow(rows[0]!);
  }

  async updateNode(context: RequestContext, nodeId: string, input: UpdateNodeInput): Promise<NodeRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    const assignments: Prisma.Sql[] = [Prisma.sql`updated_by = ${actorId}::uuid`];

    if (input.status) {
      assignments.push(Prisma.sql`status = ${input.status}::falak.falak_node_status`);
    }
    if (input.visibility) {
      assignments.push(Prisma.sql`visibility = ${input.visibility}::falak.falak_visibility`);
    }
    if (input.sensitivityClass !== undefined) {
      assignments.push(Prisma.sql`sensitivity_class = ${input.sensitivityClass}`);
    }
    if (input.slug !== undefined) {
      assignments.push(Prisma.sql`slug = ${input.slug}`);
    }
    if (input.title !== undefined) {
      assignments.push(Prisma.sql`title = ${input.title}`);
    }
    if (input.summary !== undefined) {
      assignments.push(Prisma.sql`summary = ${input.summary}`);
    }
    if (input.metadata !== undefined) {
      assignments.push(Prisma.sql`metadata = CAST(${stringifyJson(input.metadata)} AS jsonb)`);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'geometry')) {
      assignments.push(
        input.geometry
          ? Prisma.sql`geometry = falak.ST_SetSRID(falak.ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)}), 4326)`
          : Prisma.sql`geometry = NULL`
      );
    }
    if (input.timeStart !== undefined) {
      assignments.push(Prisma.sql`time_start = ${input.timeStart ? new Date(input.timeStart) : null}::timestamptz`);
    }
    if (input.timeEnd !== undefined) {
      assignments.push(Prisma.sql`time_end = ${input.timeEnd ? new Date(input.timeEnd) : null}::timestamptz`);
    }

    if (assignments.length === 1) {
      throw errors.badRequest('No mutable fields supplied for patch', 'EMPTY_PATCH');
    }

    const rows = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      UPDATE falak.nodes
      SET ${Prisma.join(assignments, ', ')}
      WHERE id = ${nodeId}::uuid
        AND tenant_id = ${context.tenantId}::uuid
        AND version = ${input.expectedVersion}
        AND status <> 'deleted'::falak.falak_node_status
      RETURNING ${nodeSelectColumns('nodes')}
    `);

    if (rows.length === 0) {
      const current = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
        SELECT ${nodeSelectColumns('n')}
        FROM falak.nodes n
        WHERE n.id = ${nodeId}::uuid
          AND n.tenant_id = ${context.tenantId}::uuid
        LIMIT 1
      `);

      if (current.length === 0) {
        throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
      }

      throw errors.conflict('Node version conflict', 'VERSION_CONFLICT');
    }

    return mapNodeRow(rows[0]!);
  }

  async softDeleteNode(context: RequestContext, nodeId: string, expectedVersion: number): Promise<void> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE falak.nodes
      SET status = 'deleted'::falak.falak_node_status,
          updated_by = ${actorId}::uuid
      WHERE id = ${nodeId}::uuid
        AND tenant_id = ${context.tenantId}::uuid
        AND version = ${expectedVersion}
        AND status <> 'deleted'::falak.falak_node_status
      RETURNING id
    `);

    if (rows.length === 0) {
      const current = await this.prisma.$queryRaw<Array<{ id: string; version: bigint | number; status: string }>>(Prisma.sql`
        SELECT id, version, status
        FROM falak.nodes
        WHERE id = ${nodeId}::uuid
          AND tenant_id = ${context.tenantId}::uuid
        LIMIT 1
      `);

      if (current.length === 0 || current[0]?.status === 'deleted') {
        throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
      }

      throw errors.conflict('Node delete version conflict', 'VERSION_CONFLICT');
    }
  }

  async createEdge(context: RequestContext, input: CreateEdgeInput): Promise<EdgeRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    const [fromNode, toNode] = await this.fetchNodesForEdge(context.tenantId, input.fromNode, input.toNode);

    if (!fromNode || fromNode.tenant_id !== context.tenantId || fromNode.status === 'deleted') {
      throw errors.notFound('Source node not found in tenant', 'SOURCE_NODE_NOT_FOUND');
    }

    if (!toNode || toNode.tenant_id !== context.tenantId || toNode.status === 'deleted') {
      throw errors.notFound('Target node not found in tenant', 'TARGET_NODE_NOT_FOUND');
    }

    const rows = await this.prisma.$queryRaw<EdgeRow[]>(Prisma.sql`
      INSERT INTO falak.edges (
        tenant_id,
        from_node,
        to_node,
        relation,
        status,
        weight,
        valid_from,
        valid_to,
        evidence,
        metadata,
        created_by
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${input.fromNode}::uuid,
        ${input.toNode}::uuid,
        ${input.relation},
        'active'::falak.falak_edge_status,
        ${input.weight},
        ${input.validFrom ? new Date(input.validFrom) : null}::timestamptz,
        ${input.validTo ? new Date(input.validTo) : null}::timestamptz,
        CAST(${JSON.stringify(input.evidence)} AS jsonb),
        CAST(${stringifyJson(input.metadata)} AS jsonb),
        ${actorId}::uuid
      )
      RETURNING id, tenant_id, from_node, to_node, relation, status, weight, valid_from, valid_to, evidence, metadata, created_at
    `);

    return mapEdgeRow(rows[0]!);
  }

  async getGraph(context: RequestContext, nodeId: string, depth: number): Promise<GraphRecord> {
    await this.setTenantSession(context.tenantId);
    const rootNode = await this.getNodeById(context, nodeId);
    if (!rootNode) {
      throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
    }

    const visited = new Set<string>([nodeId]);
    const expanded = new Set<string>();
    const edgeMap = new Map<string, EdgeRecord>();
    let frontier = new Set<string>([nodeId]);

    for (let level = 1; level <= depth; level += 1) {
      const currentFrontier = [...frontier].filter((id) => !expanded.has(id));
      if (currentFrontier.length === 0) {
        break;
      }

      currentFrontier.forEach((id) => expanded.add(id));
      const edges = await this.fetchEdgesForNodeSet(context.tenantId, currentFrontier);
      frontier = new Set<string>();

      for (const edge of edges.map(mapEdgeRow)) {
        edgeMap.set(edge.id, edge);
        if (!visited.has(edge.fromNode)) {
          visited.add(edge.fromNode);
          frontier.add(edge.fromNode);
        }
        if (!visited.has(edge.toNode)) {
          visited.add(edge.toNode);
          frontier.add(edge.toNode);
        }
      }
    }

    const visibleNodes = await this.fetchVisibleNodesByIds(context, [...visited]);
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = [...edgeMap.values()].filter(
      (edge) => visibleNodeIds.has(edge.fromNode) && visibleNodeIds.has(edge.toNode)
    );

    return {
      rootNodeId: rootNode.id,
      depth,
      nodes: visibleNodes,
      edges: visibleEdges
    };
  }

  async createApproval(context: RequestContext, input: CreateApprovalInput): Promise<ApprovalRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    const rows = await this.prisma.$queryRaw<ApprovalRow[]>(Prisma.sql`
      INSERT INTO falak.approvals (
        tenant_id,
        request_type,
        target_type,
        target_id,
        status,
        required_approvals,
        current_approvals,
        requested_by,
        context
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${input.requestType},
        ${input.targetType},
        ${input.targetId}::uuid,
        'pending'::falak.falak_approval_status,
        ${input.requiredApprovals},
        0,
        ${actorId}::uuid,
        CAST(${stringifyJson(input.context)} AS jsonb)
      )
      RETURNING id, request_type, target_type, target_id, status, required_approvals, current_approvals, context, created_at, resolved_at
    `);

    const approval = mapApprovalRow(rows[0]!);
    logFalak('falak.approval_created', {
      traceId: context.traceId,
      tenantId: context.tenantId,
      tenantSlug: context.tenantSlug,
      actorId: context.actor?.id ?? null,
      actorExternalAuthId: context.actor?.externalAuthId ?? null,
      approvalId: approval.id,
      requestType: approval.requestType,
      targetType: approval.targetType,
      targetId: approval.targetId,
      requiredApprovals: approval.requiredApprovals,
      correlationId: context.traceId
    });
    return approval;
  }

  async getApprovalById(tenantId: string, approvalId: string): Promise<ApprovalRecord | null> {
    const rows = await this.withTenantSession(tenantId, (db) => db.$queryRaw<ApprovalRow[]>(Prisma.sql`
      SELECT id, request_type, target_type, target_id, status, required_approvals, current_approvals, context, created_at, resolved_at
      FROM falak.approvals
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${approvalId}::uuid
      LIMIT 1
    `));

    return rows[0] ? mapApprovalRow(rows[0]) : null;
  }

  async recordApprovalVote(context: RequestContext, approvalId: string, input: ApprovalVoteInput): Promise<ApprovalRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id;
    if (!actorId) {
      throw errors.unauthorized('Approval voting requires an actor', 'ACTOR_REQUIRED');
    }

    const approvalRows = await this.prisma.$queryRaw<ApprovalRow[]>(Prisma.sql`
      SELECT id, request_type, target_type, target_id, status, required_approvals, current_approvals, context, created_at, resolved_at
      FROM falak.approvals
      WHERE tenant_id = ${context.tenantId}::uuid
        AND id = ${approvalId}::uuid
      FOR UPDATE
    `);

    const approval = approvalRows[0];
    if (!approval) {
      throw errors.notFound('Approval not found', 'APPROVAL_NOT_FOUND');
    }

    if (approval.status !== 'pending') {
      throw errors.conflict('Approval is already resolved', 'APPROVAL_RESOLVED');
    }

    try {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO falak.approval_votes (approval_id, actor_id, vote, note)
        VALUES (${approvalId}::uuid, ${actorId}::uuid, ${input.vote}, ${input.note})
      `);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientUnknownRequestError) {
        throw errors.conflict('Actor already voted on this approval', 'DUPLICATE_APPROVAL_VOTE');
      }
      throw error;
    }

    const tallyRows = await this.prisma.$queryRaw<Array<{ approvals: bigint; rejections: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE vote = 'approve') AS approvals,
        COUNT(*) FILTER (WHERE vote = 'reject') AS rejections
      FROM falak.approval_votes
      WHERE approval_id = ${approvalId}::uuid
    `);

    const approvalCount = Number(tallyRows[0]?.approvals ?? 0n);
    const rejectionCount = Number(tallyRows[0]?.rejections ?? 0n);
    const nextStatus =
      rejectionCount > 0
        ? 'rejected'
        : approvalCount >= approval.required_approvals
          ? 'approved'
          : 'pending';

    const rows = await this.prisma.$queryRaw<ApprovalRow[]>(Prisma.sql`
      UPDATE falak.approvals
      SET current_approvals = ${approvalCount},
          status = ${nextStatus}::falak.falak_approval_status,
          resolved_by = CASE WHEN ${nextStatus} <> 'pending' THEN ${actorId}::uuid ELSE resolved_by END,
          resolved_at = CASE WHEN ${nextStatus} <> 'pending' THEN NOW() ELSE NULL END
      WHERE id = ${approvalId}::uuid
      RETURNING id, request_type, target_type, target_id, status, required_approvals, current_approvals, context, created_at, resolved_at
    `);

    const updatedApproval = mapApprovalRow(rows[0]!);
    logFalak('falak.approval_vote', {
      traceId: context.traceId,
      tenantId: context.tenantId,
      tenantSlug: context.tenantSlug,
      actorId: context.actor?.id ?? null,
      actorExternalAuthId: context.actor?.externalAuthId ?? null,
      approvalId: updatedApproval.id,
      vote: input.vote,
      status: updatedApproval.status,
      currentApprovals: updatedApproval.currentApprovals,
      correlationId: context.traceId
    });
    return updatedApproval;
  }

  async listEvents(context: RequestContext, filters: ListEventsFilters): Promise<EventRecord[]> {
    const whereClauses: Prisma.Sql[] = [Prisma.sql`tenant_id = ${context.tenantId}::uuid`];

    if (filters.eventType) {
      whereClauses.push(Prisma.sql`event_type = ${filters.eventType}`);
    }
    if (filters.targetType) {
      whereClauses.push(Prisma.sql`target_type = ${filters.targetType}`);
    }
    if (filters.targetId) {
      whereClauses.push(Prisma.sql`target_id = ${filters.targetId}::uuid`);
    }

    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<EventRow[]>(Prisma.sql`
      SELECT id, tenant_id, event_type, actor_id, target_type, target_id, correlation_id, causation_id, trace_id, policy_result, payload, occurred_at, recorded_at
      FROM falak.events
      WHERE ${Prisma.join(whereClauses, ' AND ')}
      ORDER BY occurred_at DESC
      LIMIT ${filters.limit}
    `));

    return rows.map(mapEventRow);
  }

  async listLedger(context: RequestContext, filters: ListLedgerFilters): Promise<LedgerEntryRecord[]> {
    const whereClauses: Prisma.Sql[] = [Prisma.sql`tenant_id = ${context.tenantId}::uuid`];

    if (filters.category) {
      whereClauses.push(Prisma.sql`category = ${filters.category}::falak.falak_ledger_category`);
    }
    if (filters.referenceType) {
      whereClauses.push(Prisma.sql`reference_type = ${filters.referenceType}`);
    }
    if (filters.referenceId) {
      whereClauses.push(Prisma.sql`reference_id = ${filters.referenceId}::uuid`);
    }

    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<LedgerRow[]>(Prisma.sql`
      SELECT id, category, event_id, reference_type, reference_id, amount, currency, hash, metadata, recorded_at
      FROM falak.ledger_entries
      WHERE ${Prisma.join(whereClauses, ' AND ')}
      ORDER BY recorded_at DESC
    `));

    return rows.map(mapLedgerRow);
  }

  async nearbyNodes(context: RequestContext, filters: SpatialNearbyFilters): Promise<NodeRecord[]> {
    const allowedVisibilities = this.allowedVisibilities(context);
    const typeClause = filters.type ? Prisma.sql`AND n.type = ${filters.type}` : Prisma.sql``;

    // Nearby queries rely on PostGIS geography operators. Prisma cannot express
    // ST_DWithin/ST_Distance or computed distance projection safely through the ORM.
    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<NodeRow[]>(Prisma.sql`
      WITH anchor AS (
        SELECT falak.ST_SetSRID(falak.ST_MakePoint(${filters.lng}, ${filters.lat}), 4326)::geography AS reference
      )
      SELECT
        ${nodeSelectColumns('n')},
        falak.ST_Distance(n.geometry::geography, anchor.reference) AS distance_meters
      FROM falak.nodes n
      CROSS JOIN anchor
      WHERE n.tenant_id = ${context.tenantId}::uuid
        AND n.status <> 'deleted'::falak.falak_node_status
        AND n.visibility IN (${Prisma.join(allowedVisibilities.map((value) => Prisma.sql`${value}::falak.falak_visibility`))})
        AND n.geometry IS NOT NULL
        AND falak.ST_DWithin(n.geometry::geography, anchor.reference, ${filters.radiusMeters})
        ${typeClause}
      ORDER BY distance_meters ASC
    `));

    return rows.map(mapNodeRow);
  }

  async createFederationLink(context: RequestContext, input: CreateFederationLinkInput): Promise<EdgeRecord> {
    await this.setTenantSession(context.tenantId);
    const actorId = context.actor?.id ?? null;
    const [sourceNode, targetNode] = await this.fetchFederationNodes(context.tenantId, input.sourceNodeId, input.targetNodeId);

    if (!sourceNode || sourceNode.tenant_id !== context.tenantId || sourceNode.status === 'deleted') {
      throw errors.notFound('Source node not found in tenant', 'SOURCE_NODE_NOT_FOUND');
    }

    if (!targetNode || targetNode.status === 'deleted' || targetNode.visibility !== 'public') {
      throw errors.notFound('Target node not found for federation link', 'TARGET_NODE_NOT_FOUND');
    }

    const rows = await this.prisma.$queryRaw<EdgeRow[]>(Prisma.sql`
      INSERT INTO falak.edges (
        tenant_id,
        from_node,
        to_node,
        relation,
        status,
        weight,
        valid_from,
        valid_to,
        evidence,
        metadata,
        created_by
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${input.sourceNodeId}::uuid,
        ${input.targetNodeId}::uuid,
        ${input.relation},
        'active'::falak.falak_edge_status,
        1,
        NULL,
        NULL,
        '[]'::jsonb,
        CAST(${stringifyJson({
          federation: true,
          targetTenantId: targetNode.tenant_id,
          contract: input.contract
        })} AS jsonb),
        ${actorId}::uuid
      )
      RETURNING id, tenant_id, from_node, to_node, relation, status, weight, valid_from, valid_to, evidence, metadata, created_at
    `);

    return mapEdgeRow(rows[0]!);
  }

  async createEventWithLinks(context: RequestContext, input: CreateEventWorkflowInput): Promise<EventWorkflowRecord> {
    await this.setTenantSession(context.tenantId);

    const requestedNodeIds = [
      input.venueNodeId,
      input.communityNodeId,
      input.campaignNodeId,
      input.poolNodeId
    ].filter((value): value is string => Boolean(value));
    const relatedRows = await this.fetchNodesByIdsForTenant(context.tenantId, requestedNodeIds);
    const venueNode = relatedRows.find((row) => row.id === input.venueNodeId);
    const communityNode = input.communityNodeId ? relatedRows.find((row) => row.id === input.communityNodeId) : null;
    const campaignNode = input.campaignNodeId ? relatedRows.find((row) => row.id === input.campaignNodeId) : null;
    const poolNode = input.poolNodeId ? relatedRows.find((row) => row.id === input.poolNodeId) : null;

    if (!venueNode || venueNode.status === 'deleted') {
      throw errors.notFound('Venue node not found', 'VENUE_NODE_NOT_FOUND');
    }
    if (venueNode.type !== 'venue') {
      throw errors.badRequest('Event venue must reference a venue node', 'INVALID_VENUE_NODE');
    }
    if (communityNode && communityNode.type !== 'community') {
      throw errors.badRequest('Event community link must reference a community node', 'INVALID_COMMUNITY_NODE');
    }
    if (campaignNode && campaignNode.type !== 'campaign') {
      throw errors.badRequest('Event campaign link must reference a campaign node', 'INVALID_CAMPAIGN_NODE');
    }
    if (input.communityNodeId && !communityNode) {
      throw errors.notFound('Community node not found', 'COMMUNITY_NODE_NOT_FOUND');
    }
    if (input.campaignNodeId && !campaignNode) {
      throw errors.notFound('Campaign node not found', 'CAMPAIGN_NODE_NOT_FOUND');
    }
    if (input.poolNodeId && !poolNode) {
      throw errors.notFound('Liquidity pool node not found', 'POOL_NODE_NOT_FOUND');
    }
    if (poolNode && poolNode.type !== 'liquidity_pool') {
      throw errors.badRequest('Event pool link must reference a liquidity_pool node', 'INVALID_POOL_NODE');
    }

    const event = await this.createWorkflowNode(context, {
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

    const linkedNodes = [venueNode, communityNode, campaignNode, poolNode]
      .filter((row): row is NodeRow => Boolean(row))
      .map(mapNodeRow);

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
      linkedNodes,
      links
    };
  }

  async recordContribution(context: RequestContext, input: RecordContributionInput): Promise<ContributionRecord> {
    await this.setTenantSession(context.tenantId);

    const relatedRows = await this.fetchNodesByIdsForTenant(context.tenantId, [input.eventNodeId, input.poolNodeId]);
    const eventNode = relatedRows.find((row) => row.id === input.eventNodeId);
    const poolNode = relatedRows.find((row) => row.id === input.poolNodeId);

    if (!eventNode || eventNode.status === 'deleted' || eventNode.type !== 'event') {
      throw errors.notFound('Event node not found', 'EVENT_NODE_NOT_FOUND');
    }
    if (!poolNode || poolNode.status === 'deleted' || poolNode.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool node not found', 'POOL_NODE_NOT_FOUND');
    }

    await this.ensureEventPoolLink(context.tenantId, eventNode.id, poolNode.id);

    const contributedAt = input.contributedAt ?? new Date().toISOString();
    const contributionNode = await this.createWorkflowNode(context, {
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
      fromNode: contributionNode.id,
      toNode: eventNode.id,
      relation: 'contributes_to',
      weight: 1,
      validFrom: contributedAt,
      validTo: contributedAt,
      evidence: [],
      metadata: {}
    });
    await this.createEdge(context, {
      fromNode: contributionNode.id,
      toNode: poolNode.id,
      relation: 'funds',
      weight: 1,
      validFrom: contributedAt,
      validTo: contributedAt,
      evidence: [],
      metadata: {}
    });

    const rows = await this.prisma.$queryRaw<ContributionRow[]>(Prisma.sql`
      INSERT INTO falak.contributions (
        tenant_id,
        node_id,
        event_node_id,
        pool_node_id,
        contributor_actor_id,
        amount,
        currency,
        note,
        reference,
        contributed_at
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${contributionNode.id}::uuid,
        ${eventNode.id}::uuid,
        ${poolNode.id}::uuid,
        ${context.actor?.id ?? null}::uuid,
        ${input.amount},
        ${input.currency},
        ${input.note},
        ${input.reference},
        ${new Date(contributedAt)}::timestamptz
      )
      RETURNING id, tenant_id, node_id, event_node_id, pool_node_id, contributor_actor_id, amount, currency, note, reference, contributed_at, created_at
    `);

    return mapContributionRow(rows[0]!);
  }

  async createAllocationProposal(context: RequestContext, input: CreateAllocationProposalInput): Promise<AllocationProposalRecord> {
    await this.setTenantSession(context.tenantId);

    const requestedNodeIds = [input.poolNodeId, input.targetNodeId, input.eventNodeId].filter((value): value is string => Boolean(value));
    const relatedRows = await this.fetchNodesByIdsForTenant(context.tenantId, requestedNodeIds);
    const poolNode = relatedRows.find((row) => row.id === input.poolNodeId);
    const targetNode = relatedRows.find((row) => row.id === input.targetNodeId);
    const eventNode = input.eventNodeId ? relatedRows.find((row) => row.id === input.eventNodeId) : null;

    if (!poolNode || poolNode.status === 'deleted' || poolNode.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool node not found', 'POOL_NODE_NOT_FOUND');
    }
    if (!targetNode || targetNode.status === 'deleted') {
      throw errors.notFound('Allocation target not found', 'TARGET_NODE_NOT_FOUND');
    }
    if (!['community', 'campaign'].includes(targetNode.type)) {
      throw errors.badRequest('Allocation target must be a community or campaign node', 'INVALID_ALLOCATION_TARGET');
    }
    if (input.eventNodeId && (!eventNode || eventNode.status === 'deleted' || eventNode.type !== 'event')) {
      throw errors.notFound('Event node not found', 'EVENT_NODE_NOT_FOUND');
    }
    if (eventNode) {
      await this.ensureEventPoolLink(context.tenantId, eventNode.id, poolNode.id);
    }

    const proposalNode = await this.createWorkflowNode(context, {
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
        targetNodeId: input.targetNodeId,
        poolNodeId: input.poolNodeId
      },
      geometry: null,
      timeStart: null,
      timeEnd: null
    });

    await this.createEdge(context, {
      fromNode: proposalNode.id,
      toNode: targetNode.id,
      relation: 'supports',
      weight: 1,
      validFrom: null,
      validTo: null,
      evidence: [],
      metadata: {}
    });

    const rows = await this.prisma.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      INSERT INTO falak.allocation_proposals (
        tenant_id,
        node_id,
        event_node_id,
        pool_node_id,
        target_node_id,
        requested_by,
        amount,
        currency,
        rationale
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${proposalNode.id}::uuid,
        ${input.eventNodeId}::uuid,
        ${poolNode.id}::uuid,
        ${targetNode.id}::uuid,
        ${context.actor?.id ?? null}::uuid,
        ${input.amount},
        ${input.currency},
        ${input.rationale}
      )
      RETURNING id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
    `);

    return mapAllocationProposalRow(rows[0]!);
  }

  async getAllocationProposalById(tenantId: string, proposalId: string): Promise<AllocationProposalRecord | null> {
    const rows = await this.withTenantSession(tenantId, (db) => db.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      SELECT id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
      FROM falak.allocation_proposals
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${proposalId}::uuid
      LIMIT 1
    `));

    return rows[0] ? mapAllocationProposalRow(rows[0]) : null;
  }

  async attachApprovalToAllocationProposal(tenantId: string, proposalId: string, approvalId: string): Promise<AllocationProposalRecord> {
    await this.setTenantSession(tenantId);
    const rows = await this.prisma.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      UPDATE falak.allocation_proposals
      SET approval_id = ${approvalId}::uuid
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${proposalId}::uuid
      RETURNING id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
    `);

    if (rows.length === 0) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }

    return mapAllocationProposalRow(rows[0]!);
  }

  async rejectAllocationProposal(tenantId: string, proposalId: string, rejectedAt: string): Promise<AllocationProposalRecord> {
    await this.setTenantSession(tenantId);
    const rows = await this.prisma.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      UPDATE falak.allocation_proposals
      SET status = 'rejected',
          rejected_at = COALESCE(rejected_at, ${new Date(rejectedAt)}::timestamptz)
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${proposalId}::uuid
      RETURNING id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
    `);

    if (rows.length === 0) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }

    return mapAllocationProposalRow(rows[0]!);
  }

  async executeAllocation(
    tenantId: string,
    proposalId: string,
    approvedAt: string,
    executedEventId: string
  ): Promise<AllocationExecutionRecord> {
    await this.setTenantSession(tenantId);
    const proposalRows = await this.prisma.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      SELECT id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
      FROM falak.allocation_proposals
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${proposalId}::uuid
      FOR UPDATE
    `);

    const proposalRow = proposalRows[0];
    if (!proposalRow) {
      throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
    }
    if (proposalRow.status === 'rejected') {
      throw errors.conflict('Rejected allocation proposals cannot execute', 'ALLOCATION_REJECTED');
    }
    if (proposalRow.status === 'executed') {
      return {
        proposal: mapAllocationProposalRow(proposalRow),
        ledgerEntries: [],
        executed: false
      };
    }

    const nodeRows = await this.fetchNodesByIdsForTenant(tenantId, [proposalRow.pool_node_id, proposalRow.target_node_id]);
    const poolNode = nodeRows.find((row) => row.id === proposalRow.pool_node_id);
    const targetNode = nodeRows.find((row) => row.id === proposalRow.target_node_id);
    if (!poolNode || poolNode.status === 'deleted' || poolNode.type !== 'liquidity_pool') {
      throw errors.conflict('Allocation pool is unavailable', 'POOL_UNAVAILABLE');
    }
    if (!targetNode || targetNode.status === 'deleted') {
      throw errors.conflict('Allocation target is unavailable', 'TARGET_UNAVAILABLE');
    }

    const balanceRows = await this.prisma.$queryRaw<Array<{ amount: Prisma.Decimal | number | null }>>(Prisma.sql`
      SELECT COALESCE(SUM(amount), 0) AS amount
      FROM falak.ledger_entries
      WHERE tenant_id = ${tenantId}::uuid
        AND reference_type = 'pool'
        AND reference_id = ${proposalRow.pool_node_id}::uuid
        AND currency = ${proposalRow.currency}
    `);
    const availableBalance = toNumber(balanceRows[0]?.amount) ?? 0;
    if (availableBalance < (toNumber(proposalRow.amount) ?? 0)) {
      throw errors.conflict('Insufficient pool balance for allocation', 'INSUFFICIENT_POOL_BALANCE');
    }

    const updatedRows = await this.prisma.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      UPDATE falak.allocation_proposals
      SET status = 'executed',
          approved_at = COALESCE(approved_at, ${new Date(approvedAt)}::timestamptz),
          executed_at = COALESCE(executed_at, ${new Date(approvedAt)}::timestamptz)
      WHERE id = ${proposalId}::uuid
        AND executed_at IS NULL
      RETURNING id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
    `);

    if (updatedRows.length === 0) {
      return {
        proposal: mapAllocationProposalRow(proposalRow),
        ledgerEntries: [],
        executed: false
      };
    }

    const updatedProposal = mapAllocationProposalRow(updatedRows[0]!);
    const poolDebit = await this.writeLedgerEntry({
      tenantId,
      category: 'financial',
      eventId: executedEventId,
      referenceType: 'pool',
      referenceId: updatedProposal.poolNodeId,
      amount: -updatedProposal.amount,
      currency: updatedProposal.currency,
      metadata: {
        kind: 'allocation_debit',
        proposalId: updatedProposal.id,
        proposalNodeId: updatedProposal.nodeId,
        targetNodeId: updatedProposal.targetNodeId
      }
    });
    const targetCredit = await this.writeLedgerEntry({
      tenantId,
      category: 'financial',
      eventId: executedEventId,
      referenceType: 'node',
      referenceId: updatedProposal.targetNodeId,
      amount: updatedProposal.amount,
      currency: updatedProposal.currency,
      metadata: {
        kind: 'allocation_credit',
        proposalId: updatedProposal.id,
        proposalNodeId: updatedProposal.nodeId,
        poolNodeId: updatedProposal.poolNodeId
      }
    });

    return {
      proposal: updatedProposal,
      ledgerEntries: [poolDebit, targetCredit],
      executed: true
    };
  }

  async getPoolBalance(context: RequestContext, poolId: string): Promise<PoolBalanceRecord> {
    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<Array<{
      currency: string | null;
      balance: Prisma.Decimal | number | null;
      contributed: Prisma.Decimal | number | null;
      allocated: Prisma.Decimal | number | null;
    }>>(Prisma.sql`
      SELECT
        currency,
        COALESCE(SUM(amount), 0) AS balance,
        COALESCE(SUM(CASE WHEN metadata ->> 'kind' = 'contribution' THEN amount ELSE 0 END), 0) AS contributed,
        COALESCE(SUM(CASE WHEN metadata ->> 'kind' = 'allocation_debit' THEN ABS(amount) ELSE 0 END), 0) AS allocated
      FROM falak.ledger_entries
      WHERE tenant_id = ${context.tenantId}::uuid
        AND reference_type = 'pool'
        AND reference_id = ${poolId}::uuid
      GROUP BY currency
    `));

    return {
      poolId,
      balances: mapCurrencyRows(rows.map((row) => ({ currency: row.currency, amount: row.balance }))),
      totalContributions: mapCurrencyRows(rows.map((row) => ({ currency: row.currency, amount: row.contributed }))),
      totalAllocated: mapCurrencyRows(rows.map((row) => ({ currency: row.currency, amount: row.allocated })))
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

    const contributionRows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<Array<{
      currency: string | null;
      amount: Prisma.Decimal | number | null;
      count: bigint;
    }>>(Prisma.sql`
      SELECT currency, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
      FROM falak.contributions
      WHERE tenant_id = ${context.tenantId}::uuid
        AND event_node_id = ${eventId}::uuid
      GROUP BY currency
    `));

    const proposalRows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<AllocationProposalRow[]>(Prisma.sql`
      SELECT id, tenant_id, node_id, event_node_id, pool_node_id, target_node_id, requested_by, amount, currency, rationale, status, approval_id, approved_at, executed_at, rejected_at, created_at, updated_at
      FROM falak.allocation_proposals
      WHERE tenant_id = ${context.tenantId}::uuid
        AND event_node_id = ${eventId}::uuid
      ORDER BY created_at DESC
    `));

    const targetIds = [...new Set(proposalRows.map((row) => row.target_node_id))];
    const visibleTargets = await this.fetchVisibleNodesByIds(context, targetIds);
    const visibleTargetMap = new Map(visibleTargets.map((node) => [node.id, node]));
    const proposedAllocations: AllocationProposalView[] = proposalRows
      .map((row) => mapAllocationProposalRow(row))
      .filter((proposal) => visibleTargetMap.has(proposal.targetNodeId))
      .map((proposal) => ({
        ...proposal,
        targetNode: visibleTargetMap.get(proposal.targetNodeId) ?? null
      }));

    const approvedAllocations = proposedAllocations.filter((proposal) => proposal.approvedAt !== null || proposal.status === 'executed');
    const executedTotals = this.aggregateCurrencyAmounts(
      proposedAllocations.filter((proposal) => proposal.executedAt !== null)
    );

    const eventRows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<EventRow[]>(Prisma.sql`
      SELECT id, tenant_id, event_type, actor_id, target_type, target_id, correlation_id, causation_id, trace_id, policy_result, payload, occurred_at, recorded_at
      FROM falak.events
      WHERE tenant_id = ${context.tenantId}::uuid
        AND (
          (target_type = 'event' AND target_id = ${eventId}::uuid)
          OR payload ->> 'eventNodeId' = ${eventId}
        )
      ORDER BY occurred_at DESC
      LIMIT 20
    `));

    let nearbyNodes: NodeRecord[] = [];
    const coordinates = event.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      nearbyNodes = (await this.nearbyNodes(context, {
        lat: coordinates[1],
        lng: coordinates[0],
        radiusMeters: 1500
      })).filter((node) => node.id !== eventId).slice(0, 5);
    }

    return {
      event,
      venue,
      pool,
      graph,
      contributionCount: contributionRows.reduce((sum, row) => sum + Number(row.count), 0),
      totalContributions: mapCurrencyRows(contributionRows.map((row) => ({ currency: row.currency, amount: row.amount }))),
      proposedAllocations,
      approvedAllocations,
      executedTotals,
      poolBalance: pool ? await this.getPoolBalance(context, pool.id) : null,
      eventStream: eventRows.map(mapEventRow),
      nearbyNodes
    };
  }

  async writeEvent(input: EventWriteInput): Promise<EventWriteResult> {
    await this.setTenantSession(input.tenantId);
    // Events are inserted with raw SQL because they participate in append-only DB
    // triggers and need exact enum / trace-id handling inside the active transaction.
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO falak.events (
        tenant_id,
        event_type,
        actor_id,
        target_type,
        target_id,
        correlation_id,
        trace_id,
        policy_result,
        payload
      )
      VALUES (
        ${input.tenantId}::uuid,
        ${input.eventType},
        ${input.actorId}::uuid,
        ${input.targetType},
        ${input.targetId}::uuid,
        ${input.traceId}::uuid,
        ${input.traceId}::uuid,
        ${input.policyResult}::falak.falak_event_policy_result,
        CAST(${stringifyJson(input.payload)} AS jsonb)
      )
      RETURNING id
    `);

    const result = rows[0]!;
    logFalak('falak.event_write', {
      traceId: input.traceId,
      tenantId: input.tenantId,
      actorId: input.actorId,
      eventId: result.id,
      eventType: input.eventType,
      targetType: input.targetType,
      targetId: input.targetId,
      correlationId: input.traceId
    });
    return result;
  }

  async writeLedgerEntry(input: LedgerWriteInput): Promise<LedgerEntryRecord> {
    await this.setTenantSession(input.tenantId);
    // Ledger writes stay in raw SQL so the immutable-table trigger and content hash
    // are applied without ORM-side field projection gaps.
    const rows = await this.prisma.$queryRaw<LedgerRow[]>(Prisma.sql`
      INSERT INTO falak.ledger_entries (
        tenant_id,
        category,
        event_id,
        reference_type,
        reference_id,
        amount,
        currency,
        hash,
        metadata
      )
      VALUES (
        ${input.tenantId}::uuid,
        ${input.category}::falak.falak_ledger_category,
        ${input.eventId}::uuid,
        ${input.referenceType},
        ${input.referenceId}::uuid,
        ${input.amount ?? null},
        ${input.currency ?? null},
        ${this.computeLedgerHash(input)},
        CAST(${stringifyJson(input.metadata)} AS jsonb)
      )
      RETURNING id, category, event_id, reference_type, reference_id, amount, currency, hash, metadata, recorded_at
    `);

    const entry = mapLedgerRow(rows[0]!);
    logFalak('falak.ledger_write', {
      traceId: input.metadata.traceId ?? null,
      tenantId: input.tenantId,
      ledgerEntryId: entry.id,
      ledgerCategory: entry.category,
      eventId: entry.eventId,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      amount: entry.amount,
      currency: entry.currency,
      correlationId: input.metadata.traceId ?? null
    });
    return entry;
  }

  async writeAuditLog(input: AuditWriteInput): Promise<void> {
    if (!input.tenantId) {
      return;
    }

    await this.setTenantSession(input.tenantId);
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO falak.audit_log (
        tenant_id,
        actor_id,
        plane,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        metadata
      )
      VALUES (
        ${input.tenantId}::uuid,
        ${input.actorId}::uuid,
        ${input.plane},
        ${input.action},
        ${input.resourceType},
        ${input.resourceId}::uuid,
        ${input.ipAddress}::inet,
        ${input.userAgent},
        CAST(${stringifyJson(input.metadata)} AS jsonb)
      )
    `);
  }

  private allowedVisibilities(context: RequestContext, requestedVisibility?: string): string[] {
    const allowed =
      context.plane === 'public' || !context.actor
        ? ['public']
        : hasRestrictedReadAccess(context.actor)
          ? ['public', 'tenant', 'restricted']
          : ['public', 'tenant'];

    if (requestedVisibility) {
      return allowed.includes(requestedVisibility) ? [requestedVisibility] : allowed;
    }

    return allowed;
  }

  private async setTenantSession(tenantId: string): Promise<void> {
    await this.setTenantSessionOn(this.prisma, tenantId);
  }

  private async setTenantSessionOn(db: PrismaExecutor, tenantId: string): Promise<void> {
    // Session tenant id prepares the codebase for RLS enforcement without relying on
    // RLS alone for correctness. Repository queries still scope tenant explicitly.
    await db.$executeRaw(Prisma.sql`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `);
  }

  private async hydrateActor(db: PrismaExecutor, row: ActorRow | null): Promise<ResolvedActor | null> {
    if (!row) {
      return null;
    }

    const roleRows = await db.$queryRaw<ActorRoleRow[]>(Prisma.sql`
      SELECT id, role_name, region_node_id
      FROM falak.actor_roles
      WHERE tenant_id = ${row.tenant_id}::uuid
        AND actor_id = ${row.id}::uuid
      ORDER BY created_at ASC
    `);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorType: row.actor_type,
      externalAuthId: row.external_auth_id,
      email: row.email,
      displayName: row.display_name,
      roles: roleRows.map((role) => ({
        id: role.id,
        roleName: role.role_name,
        regionNodeId: role.region_node_id
      }))
    };
  }

  private async fetchNodesForEdge(tenantId: string, fromNodeId: string, toNodeId: string): Promise<[NodeRow | null, NodeRow | null]> {
    const rows = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE n.tenant_id = ${tenantId}::uuid
        AND n.id IN (${Prisma.join([fromNodeId, toNodeId].map((value) => Prisma.sql`${value}::uuid`))})
    `);

    return [
      rows.find((row) => row.id === fromNodeId) ?? null,
      rows.find((row) => row.id === toNodeId) ?? null
    ];
  }

  private async fetchEdgesForNodeSet(tenantId: string, nodeIds: string[]): Promise<EdgeRow[]> {
    return this.withTenantSession(tenantId, (db) => db.$queryRaw<EdgeRow[]>(Prisma.sql`
      SELECT id, tenant_id, from_node, to_node, relation, status, weight, valid_from, valid_to, evidence, metadata, created_at
      FROM falak.edges
      WHERE tenant_id = ${tenantId}::uuid
        AND status = 'active'::falak.falak_edge_status
        AND (
          from_node IN (${Prisma.join(nodeIds.map((value) => Prisma.sql`${value}::uuid`))})
          OR to_node IN (${Prisma.join(nodeIds.map((value) => Prisma.sql`${value}::uuid`))})
        )
    `));
  }

  private async fetchVisibleNodesByIds(context: RequestContext, nodeIds: string[]): Promise<NodeRecord[]> {
    if (nodeIds.length === 0) {
      return [];
    }

    const rows = await this.withTenantSession(context.tenantId, (db) => db.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE n.tenant_id = ${context.tenantId}::uuid
        AND n.id IN (${Prisma.join(nodeIds.map((value) => Prisma.sql`${value}::uuid`))})
    `));

    return rows.map(mapNodeRow).filter((node) => canAccessNode(context, node));
  }

  private async fetchNodesByIdsForTenant(tenantId: string, nodeIds: string[]): Promise<NodeRow[]> {
    if (nodeIds.length === 0) {
      return [];
    }

    return this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE n.tenant_id = ${tenantId}::uuid
        AND n.id IN (${Prisma.join(nodeIds.map((value) => Prisma.sql`${value}::uuid`))})
    `);
  }

  private async createWorkflowNode(
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
  ): Promise<NodeRecord> {
    const actorId = context.actor?.id ?? null;
    const geometrySql = input.geometry
      ? Prisma.sql`falak.ST_SetSRID(falak.ST_GeomFromGeoJSON(${JSON.stringify(input.geometry)}), 4326)`
      : Prisma.sql`NULL`;

    const rows = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      INSERT INTO falak.nodes (
        tenant_id,
        type,
        status,
        visibility,
        sensitivity_class,
        slug,
        title,
        summary,
        metadata,
        geometry,
        time_start,
        time_end,
        created_by,
        updated_by
      )
      VALUES (
        ${context.tenantId}::uuid,
        ${input.type},
        ${input.status}::falak.falak_node_status,
        ${input.visibility}::falak.falak_visibility,
        ${input.sensitivityClass},
        ${input.slug},
        ${input.title},
        ${input.summary},
        CAST(${stringifyJson(input.metadata)} AS jsonb),
        ${geometrySql},
        ${input.timeStart ? new Date(input.timeStart) : null}::timestamptz,
        ${input.timeEnd ? new Date(input.timeEnd) : null}::timestamptz,
        ${actorId}::uuid,
        ${actorId}::uuid
      )
      RETURNING ${nodeSelectColumns('nodes')}
    `);

    return mapNodeRow(rows[0]!);
  }

  private async ensureEventPoolLink(tenantId: string, eventNodeId: string, poolNodeId: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM falak.edges
      WHERE tenant_id = ${tenantId}::uuid
        AND from_node = ${eventNodeId}::uuid
        AND to_node = ${poolNodeId}::uuid
        AND relation = 'tied_to_pool'
        AND status = 'active'::falak.falak_edge_status
      LIMIT 1
    `);

    if (rows.length === 0) {
      throw errors.badRequest('Event must be tied to the target liquidity pool', 'EVENT_POOL_LINK_REQUIRED');
    }
  }

  private aggregateCurrencyAmounts(
    proposals: ReadonlyArray<Pick<AllocationProposalRecord, 'currency' | 'amount'>>
  ): CurrencyAmount[] {
    const totals = new Map<string, number>();
    for (const proposal of proposals) {
      totals.set(proposal.currency, (totals.get(proposal.currency) ?? 0) + proposal.amount);
    }

    return [...totals.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((left, right) => left.currency.localeCompare(right.currency));
  }

  private async fetchFederationNodes(sourceTenantId: string, sourceNodeId: string, targetNodeId: string): Promise<[NodeRow | null, NodeRow | null]> {
    const rows = await this.prisma.$queryRaw<NodeRow[]>(Prisma.sql`
      SELECT ${nodeSelectColumns('n')}
      FROM falak.nodes n
      WHERE n.id IN (${Prisma.join([sourceNodeId, targetNodeId].map((value) => Prisma.sql`${value}::uuid`))})
        AND (
          (n.id = ${sourceNodeId}::uuid AND n.tenant_id = ${sourceTenantId}::uuid)
          OR n.id = ${targetNodeId}::uuid
        )
    `);

    return [
      rows.find((row) => row.id === sourceNodeId) ?? null,
      rows.find((row) => row.id === targetNodeId) ?? null
    ];
  }

  private computeLedgerHash(input: LedgerWriteInput): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: input.tenantId,
          category: input.category,
          eventId: input.eventId,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          amount: input.amount ?? null,
          currency: input.currency ?? null,
          metadata: input.metadata
        })
      )
      .digest('hex');
  }
}
