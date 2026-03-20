import { z } from 'zod';

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)])
);

export const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const visibilitySchema = z.enum(['public', 'tenant', 'restricted']);
export const nodeStatusSchema = z.enum(['draft', 'active', 'archived', 'deleted']);
export const edgeStatusSchema = z.enum(['active', 'deprecated']);
export const policyDecisionSchema = z.enum(['allow', 'deny', 'requires_approval']);
export const approvalStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export const approvalVoteSchema = z.enum(['approve', 'reject']);
export const ledgerCategorySchema = z.enum([
  'financial',
  'governance',
  'verification',
  'moderation',
  'security',
  'publication'
]);

export const geometrySchema = z.object({
  type: z.string(),
}).catchall(jsonValueSchema);

export const nodeSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  type: z.string(),
  status: nodeStatusSchema,
  visibility: visibilitySchema,
  sensitivity_class: z.string(),
  slug: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  metadata: jsonObjectSchema,
  geometry: geometrySchema.nullable(),
  time_start: isoDateTimeSchema.nullable(),
  time_end: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  version: z.number().int().nonnegative(),
  distance_meters: z.number().nonnegative().optional()
});

export const edgeSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  from_node: uuidSchema,
  to_node: uuidSchema,
  relation: z.string(),
  status: edgeStatusSchema,
  weight: z.number(),
  valid_from: isoDateTimeSchema.nullable(),
  valid_to: isoDateTimeSchema.nullable(),
  evidence: z.array(jsonValueSchema),
  metadata: jsonObjectSchema,
  created_at: isoDateTimeSchema
});

export const policyDecisionResponseSchema = z.object({
  decision: policyDecisionSchema,
  matched_policy_ids: z.array(uuidSchema),
  reasons: z.array(z.string()),
  required_approvals: z.number().int().positive().nullable(),
  approval_id: uuidSchema.nullable()
});

export const eventSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  event_type: z.string(),
  actor_id: uuidSchema.nullable(),
  target_type: z.string(),
  target_id: uuidSchema.nullable(),
  correlation_id: uuidSchema.nullable(),
  causation_id: uuidSchema.nullable(),
  trace_id: uuidSchema.nullable(),
  policy_result: z.enum(['allowed', 'denied', 'pending']),
  payload: jsonObjectSchema,
  occurred_at: isoDateTimeSchema,
  recorded_at: isoDateTimeSchema
});

export const approvalSchema = z.object({
  id: uuidSchema,
  request_type: z.string(),
  target_type: z.string(),
  target_id: uuidSchema,
  status: approvalStatusSchema,
  required_approvals: z.number().int().positive(),
  current_approvals: z.number().int().nonnegative(),
  context: jsonObjectSchema,
  created_at: isoDateTimeSchema,
  resolved_at: isoDateTimeSchema.nullable()
});

export const ledgerEntrySchema = z.object({
  id: uuidSchema,
  category: ledgerCategorySchema,
  event_id: uuidSchema.nullable(),
  reference_type: z.string(),
  reference_id: uuidSchema.nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  hash: z.string(),
  metadata: jsonObjectSchema,
  recorded_at: isoDateTimeSchema
});

export const currencyAmountSchema = z.object({
  currency: z.string().min(1),
  amount: z.number()
});

export const eventWorkflowResponseSchema = z.object({
  event: nodeSchema,
  linked_nodes: z.array(nodeSchema),
  links: z.array(edgeSchema)
});

export const contributionSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  node_id: uuidSchema,
  event_id: uuidSchema,
  pool_id: uuidSchema,
  contributor_actor_id: uuidSchema.nullable(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  note: z.string().nullable(),
  reference: z.string().nullable(),
  contributed_at: isoDateTimeSchema,
  created_at: isoDateTimeSchema
});

export const allocationProposalSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  node_id: uuidSchema,
  event_id: uuidSchema.nullable(),
  pool_id: uuidSchema,
  target_id: uuidSchema,
  requested_by_id: uuidSchema.nullable(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  rationale: z.string().nullable(),
  status: z.enum(['pending', 'executed', 'rejected']),
  approval_id: uuidSchema.nullable(),
  approved_at: isoDateTimeSchema.nullable(),
  executed_at: isoDateTimeSchema.nullable(),
  rejected_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
  target_node: nodeSchema.nullable().optional()
});

export const allocationProposalWorkflowSchema = z.object({
  proposal: allocationProposalSchema,
  approval: approvalSchema.nullable(),
  ledger_entries: z.array(ledgerEntrySchema),
  executed: z.boolean()
});

export const approvalVoteWorkflowSchema = z.object({
  approval: approvalSchema,
  proposal: allocationProposalSchema.nullable(),
  ledger_entries: z.array(ledgerEntrySchema),
  executed: z.boolean()
});

export const poolBalanceSchema = z.object({
  pool_id: uuidSchema,
  balances: z.array(currencyAmountSchema),
  total_contributions: z.array(currencyAmountSchema),
  total_allocated: z.array(currencyAmountSchema)
});

export const eventImpactSchema = z.object({
  event: nodeSchema,
  venue: nodeSchema.nullable(),
  pool: nodeSchema.nullable(),
  graph: z.lazy(() => graphSchema),
  contribution_count: z.number().int().nonnegative(),
  total_contributions: z.array(currencyAmountSchema),
  proposed_allocations: z.array(allocationProposalSchema),
  approved_allocations: z.array(allocationProposalSchema),
  executed_totals: z.array(currencyAmountSchema),
  pool_balance: poolBalanceSchema.nullable(),
  event_stream: z.array(eventSchema),
  nearby_nodes: z.array(nodeSchema)
});

export const graphSchema = z.object({
  root_node_id: uuidSchema,
  depth: z.number().int().min(1).max(3),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema)
});

export const nodesListResponseSchema = z.object({
  items: z.array(nodeSchema),
  next_cursor: z.string().nullable()
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    trace_id: uuidSchema.optional()
  })
});

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.string(),
  protocol: z.string(),
  version: z.string(),
  dependencies: z.object({
    database: z.enum(['configured', 'todo']),
    redis: z.enum(['configured', 'todo'])
  })
});

const falakCheckStatusSchema = z.enum(['ok', 'error', 'skipped']);

export const falakOperationalHealthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'not_ready']),
  service: z.string(),
  protocol: z.string(),
  runtime: z.object({
    mode: z.enum(['default', 'map_sandbox']),
    sandbox: z.boolean(),
    route_guard_mode: z.enum(['disabled', 'admin_only', 'tenant_allowlist', 'enabled']),
    dark_launch: z.boolean(),
    map_route_guard_mode: z.enum(['disabled', 'admin_only', 'tenant_allowlist', 'enabled']),
    map_dark_launch: z.boolean(),
    require_verified_actor: z.boolean()
  }),
  checks: z.object({
    database: falakCheckStatusSchema,
    postgis: falakCheckStatusSchema,
    prisma: falakCheckStatusSchema,
    falak_schema: falakCheckStatusSchema,
    migrations: falakCheckStatusSchema
  }),
  details: z.object({
    database_name: z.string().nullable(),
    migration_failures: z.number().int().nonnegative().nullable(),
    postgis_version: z.string().nullable()
  })
});

export const falakSessionStatusSchema = z.object({
  status: z.enum(['guest', 'verified', 'blocked']),
  tenant: z.object({
    id: uuidSchema,
    slug: z.string().nullable()
  }),
  actor: z.object({
    id: uuidSchema,
    external_auth_id: z.string().nullable(),
    email: z.string().nullable(),
    display_name: z.string().nullable(),
    roles: z.array(z.object({
      id: uuidSchema,
      role_name: z.string(),
      region_node_id: uuidSchema.nullable()
    }))
  }).nullable(),
  actor_resolution: z.object({
    source: z.enum(['none', 'verified_auth', 'trusted_header_override']),
    verified: z.boolean(),
    authenticated_identity: z.string().nullable(),
    requested_actor_id: z.string().nullable()
  }),
  map_access: z.object({
    mode: z.enum(['disabled', 'admin_only', 'tenant_allowlist', 'enabled']),
    allowed: z.boolean(),
    code: z.string().nullable(),
    message: z.string().nullable()
  })
});

export const createNodeBodySchema = z.object({
  type: z.string().min(1),
  visibility: visibilitySchema.default('tenant'),
  sensitivity_class: z.string().default('normal'),
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  metadata: jsonObjectSchema.default({}),
  geometry: geometrySchema.optional(),
  time_start: isoDateTimeSchema.optional(),
  time_end: isoDateTimeSchema.optional()
});

export const updateNodeBodySchema = z.object({
  status: nodeStatusSchema.optional(),
  visibility: visibilitySchema.optional(),
  sensitivity_class: z.string().optional(),
  slug: z.string().min(1).nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).nullable().optional(),
  metadata: jsonObjectSchema.optional(),
  geometry: geometrySchema.nullable().optional(),
  time_start: isoDateTimeSchema.nullable().optional(),
  time_end: isoDateTimeSchema.nullable().optional(),
  expected_version: z.coerce.number().int().positive()
});

export const createEdgeBodySchema = z.object({
  from_node: uuidSchema,
  to_node: uuidSchema,
  relation: z.string().min(1),
  weight: z.coerce.number().default(1),
  valid_from: isoDateTimeSchema.optional(),
  valid_to: isoDateTimeSchema.optional(),
  evidence: z.array(jsonValueSchema).default([]),
  metadata: jsonObjectSchema.default({})
});

export const createApprovalBodySchema = z.object({
  request_type: z.string().min(1),
  target_type: z.string().min(1),
  target_id: uuidSchema,
  required_approvals: z.coerce.number().int().min(1).default(1),
  context: jsonObjectSchema.default({})
});

export const approvalVoteBodySchema = z.object({
  vote: approvalVoteSchema,
  note: z.string().min(1).optional()
});

export const policyEvaluateBodySchema = z.object({
  resource_type: z.string().min(1),
  action: z.string().min(1),
  target_id: uuidSchema.optional(),
  context: jsonObjectSchema.default({})
});

export const federationLinkBodySchema = z.object({
  source_node_id: uuidSchema,
  target_node_id: uuidSchema,
  relation: z.string().min(1),
  contract: jsonObjectSchema.default({})
});

export const createEventWorkflowBodySchema = z.object({
  visibility: visibilitySchema.default('public'),
  sensitivity_class: z.string().default('normal'),
  slug: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  summary: z.string().min(1).nullable().optional(),
  metadata: jsonObjectSchema.default({}),
  geometry: geometrySchema.nullable().optional(),
  time_start: isoDateTimeSchema.nullable().optional(),
  time_end: isoDateTimeSchema.nullable().optional(),
  venue_id: uuidSchema,
  community_id: uuidSchema.nullable().optional(),
  campaign_id: uuidSchema.nullable().optional(),
  pool_id: uuidSchema.nullable().optional()
});

export const recordContributionBodySchema = z.object({
  event_id: uuidSchema,
  pool_id: uuidSchema,
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).default('AUD'),
  note: z.string().min(1).nullable().optional(),
  reference: z.string().min(1).nullable().optional(),
  contributed_at: isoDateTimeSchema.nullable().optional()
});

export const createAllocationProposalBodySchema = z.object({
  event_id: uuidSchema.nullable().optional(),
  pool_id: uuidSchema,
  target_id: uuidSchema,
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).default('AUD'),
  rationale: z.string().min(1).nullable().optional()
});

export const poolPathParamsSchema = z.object({
  poolId: uuidSchema
});

export const nodePathParamsSchema = z.object({
  nodeId: uuidSchema
});

export const approvalPathParamsSchema = z.object({
  approvalId: uuidSchema
});

export const eventImpactPathParamsSchema = z.object({
  eventId: uuidSchema
});

export const listNodesQuerySchema = z.object({
  type: z.string().optional(),
  status: nodeStatusSchema.optional(),
  visibility: visibilitySchema.optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

export const graphQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(3).default(1)
});

export const deleteNodeQuerySchema = z.object({
  expected_version: z.coerce.number().int().positive()
});

export const listEventsQuerySchema = z.object({
  event_type: z.string().optional(),
  target_type: z.string().optional(),
  target_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export const listLedgerQuerySchema = z.object({
  category: ledgerCategorySchema.optional(),
  reference_type: z.string().optional(),
  reference_id: uuidSchema.optional()
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_meters: z.coerce.number().int().min(1),
  type: z.string().optional()
});
