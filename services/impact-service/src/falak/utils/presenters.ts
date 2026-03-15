import {
  AllocationProposalRecord,
  AllocationProposalView,
  ApprovalRecord,
  ApprovalVoteWorkflowRecord,
  ContributionRecord,
  EdgeRecord,
  EventImpactRecord,
  EventRecord,
  EventWorkflowRecord,
  GraphRecord,
  LedgerEntryRecord,
  ListNodesResult,
  NodeRecord,
  PoolBalanceRecord,
  PolicyEvaluationResult
} from '../domain/types';

export function presentNode(node: NodeRecord) {
  return {
    id: node.id,
    tenant_id: node.tenantId,
    type: node.type,
    status: node.status,
    visibility: node.visibility,
    sensitivity_class: node.sensitivityClass,
    slug: node.slug,
    title: node.title,
    summary: node.summary,
    metadata: node.metadata,
    geometry: node.geometry,
    time_start: node.timeStart,
    time_end: node.timeEnd,
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    version: node.version,
    ...(typeof node.distanceMeters === 'number' ? { distance_meters: node.distanceMeters } : {})
  };
}

export function presentEdge(edge: EdgeRecord) {
  return {
    id: edge.id,
    tenant_id: edge.tenantId,
    from_node: edge.fromNode,
    to_node: edge.toNode,
    relation: edge.relation,
    status: edge.status,
    weight: edge.weight,
    valid_from: edge.validFrom,
    valid_to: edge.validTo,
    evidence: edge.evidence,
    metadata: edge.metadata,
    created_at: edge.createdAt
  };
}

export function presentApproval(approval: ApprovalRecord) {
  return {
    id: approval.id,
    request_type: approval.requestType,
    target_type: approval.targetType,
    target_id: approval.targetId,
    status: approval.status,
    required_approvals: approval.requiredApprovals,
    current_approvals: approval.currentApprovals,
    context: approval.context,
    created_at: approval.createdAt,
    resolved_at: approval.resolvedAt
  };
}

export function presentEvent(event: EventRecord) {
  return {
    id: event.id,
    tenant_id: event.tenantId,
    event_type: event.eventType,
    actor_id: event.actorId,
    target_type: event.targetType,
    target_id: event.targetId,
    correlation_id: event.correlationId,
    causation_id: event.causationId,
    trace_id: event.traceId,
    policy_result: event.policyResult,
    payload: event.payload,
    occurred_at: event.occurredAt,
    recorded_at: event.recordedAt
  };
}

export function presentLedgerEntry(entry: LedgerEntryRecord) {
  return {
    id: entry.id,
    category: entry.category,
    event_id: entry.eventId,
    reference_type: entry.referenceType,
    reference_id: entry.referenceId,
    amount: entry.amount,
    currency: entry.currency,
    hash: entry.hash,
    metadata: entry.metadata,
    recorded_at: entry.recordedAt
  };
}

export function presentContribution(contribution: ContributionRecord) {
  return {
    id: contribution.id,
    tenant_id: contribution.tenantId,
    node_id: contribution.nodeId,
    event_id: contribution.eventNodeId,
    pool_id: contribution.poolNodeId,
    contributor_actor_id: contribution.contributorActorId,
    amount: contribution.amount,
    currency: contribution.currency,
    note: contribution.note,
    reference: contribution.reference,
    contributed_at: contribution.contributedAt,
    created_at: contribution.createdAt
  };
}

export function presentAllocationProposal(proposal: AllocationProposalRecord | AllocationProposalView) {
  return {
    id: proposal.id,
    tenant_id: proposal.tenantId,
    node_id: proposal.nodeId,
    event_id: proposal.eventNodeId,
    pool_id: proposal.poolNodeId,
    target_id: proposal.targetNodeId,
    requested_by_id: proposal.requestedById,
    amount: proposal.amount,
    currency: proposal.currency,
    rationale: proposal.rationale,
    status: proposal.status,
    approval_id: proposal.approvalId,
    approved_at: proposal.approvedAt,
    executed_at: proposal.executedAt,
    rejected_at: proposal.rejectedAt,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
    ...('targetNode' in proposal ? { target_node: proposal.targetNode ? presentNode(proposal.targetNode) : null } : {})
  };
}

export function presentPoolBalance(balance: PoolBalanceRecord) {
  return {
    pool_id: balance.poolId,
    balances: balance.balances,
    total_contributions: balance.totalContributions,
    total_allocated: balance.totalAllocated
  };
}

export function presentEventWorkflow(record: EventWorkflowRecord) {
  return {
    event: presentNode(record.event),
    linked_nodes: record.linkedNodes.map(presentNode),
    links: record.links.map(presentEdge)
  };
}

export function presentAllocationProposalWorkflow(record: {
  proposal: AllocationProposalRecord;
  approval: ApprovalRecord | null;
  ledgerEntries: readonly LedgerEntryRecord[];
  executed: boolean;
}) {
  return {
    proposal: presentAllocationProposal(record.proposal),
    approval: record.approval ? presentApproval(record.approval) : null,
    ledger_entries: record.ledgerEntries.map(presentLedgerEntry),
    executed: record.executed
  };
}

export function presentApprovalVoteWorkflow(record: ApprovalVoteWorkflowRecord) {
  return {
    approval: presentApproval(record.approval),
    proposal: record.proposal ? presentAllocationProposal(record.proposal) : null,
    ledger_entries: record.ledgerEntries.map(presentLedgerEntry),
    executed: record.executed
  };
}

export function presentPolicyDecision(decision: PolicyEvaluationResult) {
  return {
    decision: decision.decision,
    matched_policy_ids: decision.matchedPolicyIds,
    reasons: decision.reasons,
    required_approvals: decision.requiredApprovals,
    approval_id: decision.approvalId
  };
}

export function presentNodesList(result: ListNodesResult) {
  return {
    items: result.items.map(presentNode),
    next_cursor: result.nextCursor
  };
}

export function presentGraph(graph: GraphRecord) {
  return {
    root_node_id: graph.rootNodeId,
    depth: graph.depth,
    nodes: graph.nodes.map(presentNode),
    edges: graph.edges.map(presentEdge)
  };
}

export function presentEventImpact(record: EventImpactRecord) {
  return {
    event: presentNode(record.event),
    venue: record.venue ? presentNode(record.venue) : null,
    pool: record.pool ? presentNode(record.pool) : null,
    graph: presentGraph(record.graph),
    contribution_count: record.contributionCount,
    total_contributions: record.totalContributions,
    proposed_allocations: record.proposedAllocations.map(presentAllocationProposal),
    approved_allocations: record.approvedAllocations.map(presentAllocationProposal),
    executed_totals: record.executedTotals,
    pool_balance: record.poolBalance ? presentPoolBalance(record.poolBalance) : null,
    event_stream: record.eventStream.map(presentEvent),
    nearby_nodes: record.nearbyNodes.map(presentNode)
  };
}
