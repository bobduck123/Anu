import { errors } from '../../utils/errors';
import {
  ApprovalRecord,
  ApprovalVoteInput,
  CreateApprovalInput,
  CreateEdgeInput,
  CreateFederationLinkInput,
  CreateNodeInput,
  EdgeRecord,
  EventRecord,
  GraphRecord,
  LedgerEntryRecord,
  ListEventsFilters,
  ListLedgerFilters,
  ListNodesFilters,
  ListNodesResult,
  MutationResult,
  NodeRecord,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  RequestContext,
  SpatialNearbyFilters,
  UpdateNodeInput
} from '../domain/types';
import { FalakRepository } from '../domain/types';
import { MutationExecution, MutationPipeline } from './mutationPipeline';
import { PolicyEngine } from './policyEngine';

function nodeLedgerCategory(node: Pick<NodeRecord, 'visibility' | 'sensitivityClass'>): 'governance' | 'security' | null {
  if (node.sensitivityClass !== 'normal') {
    return 'security';
  }

  if (node.visibility === 'restricted') {
    return 'governance';
  }

  return null;
}

export class FalakService {
  constructor(
    private readonly repository: FalakRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly mutationPipeline: MutationPipeline
  ) {}

  evaluatePolicy(context: RequestContext, input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
    return this.policyEngine.evaluate(context, input);
  }

  listNodes(context: RequestContext, filters: ListNodesFilters): Promise<ListNodesResult> {
    return this.repository.listNodes(context, filters);
  }

  async getNode(context: RequestContext, nodeId: string): Promise<NodeRecord> {
    const node = await this.repository.getNodeById(context, nodeId);
    if (!node) {
      throw errors.notFound('Node not found', 'NODE_NOT_FOUND');
    }

    return node;
  }

  getGraph(context: RequestContext, nodeId: string, depth: number): Promise<GraphRecord> {
    return this.repository.getGraph(context, nodeId, depth);
  }

  listEvents(context: RequestContext, filters: ListEventsFilters): Promise<EventRecord[]> {
    return this.repository.listEvents(context, filters);
  }

  listLedger(context: RequestContext, filters: ListLedgerFilters): Promise<readonly LedgerEntryRecord[]> {
    return this.repository.listLedger(context, filters);
  }

  nearbyNodes(context: RequestContext, filters: SpatialNearbyFilters): Promise<NodeRecord[]> {
    return this.repository.nearbyNodes(context, filters);
  }

  createNode(context: RequestContext, input: CreateNodeInput): Promise<MutationExecution<NodeRecord>> {
    return this.mutationPipeline.execute(context, {
      action: 'create',
      resourceType: 'node',
      targetType: 'node',
      targetId: (node) => node.id,
      policy: {
        resourceType: 'node',
        action: 'create',
        resourceVisibility: input.visibility,
        sensitivityClass: input.sensitivityClass,
        nodeType: input.type,
        context: {
          metadata: input.metadata
        }
      },
      materializeLedger: (node) => {
        const category = nodeLedgerCategory(node);
        if (!category) {
          return null;
        }

        return {
          category,
          referenceType: 'node',
          referenceId: node.id,
          metadata: {
            visibility: node.visibility,
            sensitivityClass: node.sensitivityClass
          }
        };
      },
      mutation: (repository) => repository.createNode(context, input),
      eventPayload: (node, decision) => ({
        nodeId: node.id,
        nodeType: node.type,
        visibility: node.visibility,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.node'
    });
  }

  async updateNode(context: RequestContext, nodeId: string, input: UpdateNodeInput): Promise<MutationExecution<NodeRecord>> {
    const current = await this.getNode({ ...context, plane: 'privileged' }, nodeId);
    const nextVisibility = input.visibility ?? current.visibility;
    const nextSensitivity = input.sensitivityClass ?? current.sensitivityClass;

    return this.mutationPipeline.execute(context, {
      action: 'update',
      resourceType: 'node',
      targetType: 'node',
      targetId: nodeId,
      policy: {
        resourceType: 'node',
        action: 'update',
        targetId: nodeId,
        targetTenantId: current.tenantId,
        resourceVisibility: nextVisibility,
        sensitivityClass: nextSensitivity,
        nodeType: current.type,
        context: {
          expectedVersion: input.expectedVersion
        }
      },
      materializeLedger: (node) => ({
        category: nodeLedgerCategory(node) ?? 'governance',
        referenceType: 'node',
        referenceId: node.id,
        metadata: {
          visibility: node.visibility,
          sensitivityClass: node.sensitivityClass,
          version: node.version
        }
      }),
      mutation: (repository) => repository.updateNode(context, nodeId, input),
      eventPayload: (node, decision) => ({
        nodeId: node.id,
        nodeType: node.type,
        version: node.version,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.node'
    });
  }

  async deleteNode(context: RequestContext, nodeId: string, expectedVersion: number): Promise<MutationExecution<{ id: string }>> {
    const current = await this.getNode({ ...context, plane: 'privileged' }, nodeId);

    return this.mutationPipeline.execute(context, {
      action: 'delete',
      resourceType: 'node',
      targetType: 'node',
      targetId: nodeId,
      policy: {
        resourceType: 'node',
        action: 'delete',
        targetId: nodeId,
        targetTenantId: current.tenantId,
        resourceVisibility: current.visibility,
        sensitivityClass: current.sensitivityClass,
        nodeType: current.type,
        context: {
          expectedVersion
        }
      },
      materializeLedger: (result) => ({
        category: 'governance',
        referenceType: 'node',
        referenceId: result.id,
        metadata: {
          deleted: true
        }
      }),
      mutation: async (repository) => {
        await repository.softDeleteNode(context, nodeId, expectedVersion);
        return { id: nodeId };
      },
      eventPayload: (result, decision) => ({
        nodeId: result.id,
        decision: decision.decision,
        deleted: true
      }),
      fanoutChannel: 'falak.node'
    });
  }

  createEdge(context: RequestContext, input: CreateEdgeInput): Promise<MutationExecution<EdgeRecord>> {
    return this.mutationPipeline.execute(context, {
      action: 'create',
      resourceType: 'edge',
      targetType: 'edge',
      targetId: (edge) => edge.id,
      policy: {
        resourceType: 'edge',
        action: 'create',
        targetId: input.toNode,
        context: {
          relation: input.relation,
          fromNode: input.fromNode,
          toNode: input.toNode
        }
      },
      materializeLedger: false,
      mutation: (repository) => repository.createEdge(context, input),
      eventPayload: (edge, decision) => ({
        edgeId: edge.id,
        relation: edge.relation,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.edge'
    });
  }

  createApproval(context: RequestContext, input: CreateApprovalInput): Promise<MutationExecution<ApprovalRecord>> {
    return this.mutationPipeline.execute(context, {
      action: 'create',
      resourceType: 'approval',
      targetType: input.targetType,
      targetId: (approval) => approval.id,
      policy: {
        resourceType: 'approval',
        action: 'create',
        targetId: input.targetId,
        context: {
          requestType: input.requestType,
          targetType: input.targetType
        }
      },
      materializeLedger: (approval) => ({
        category: 'governance',
        referenceType: 'approval',
        referenceId: approval.id,
        metadata: {
          status: approval.status,
          targetType: approval.targetType
        }
      }),
      mutation: (repository) => repository.createApproval(context, input),
      eventPayload: (approval, decision) => ({
        approvalId: approval.id,
        status: approval.status,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.approval'
    });
  }

  voteApproval(context: RequestContext, approvalId: string, input: ApprovalVoteInput): Promise<MutationExecution<Awaited<ReturnType<FalakRepository['recordApprovalVote']>>>> {
    return this.mutationPipeline.execute(context, {
      action: 'vote',
      resourceType: 'approval',
      targetType: 'approval',
      targetId: approvalId,
      policy: {
        resourceType: 'approval',
        action: 'vote',
        targetId: approvalId,
        context: {
          vote: input.vote
        }
      },
      materializeLedger: (approval) => ({
        category: 'governance',
        referenceType: 'approval',
        referenceId: approval.id,
        metadata: {
          status: approval.status,
          currentApprovals: approval.currentApprovals
        }
      }),
      mutation: (repository) => repository.recordApprovalVote(context, approvalId, input),
      eventPayload: (approval, decision) => ({
        approvalId: approval.id,
        status: approval.status,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.approval'
    });
  }

  createFederationLink(context: RequestContext, input: CreateFederationLinkInput): Promise<MutationExecution<EdgeRecord>> {
    return this.mutationPipeline.execute(context, {
      action: 'create',
      resourceType: 'federation_link',
      targetType: 'edge',
      targetId: (edge) => edge.id,
      policy: {
        resourceType: 'federation_link',
        action: 'create',
        targetId: input.targetNodeId,
        context: {
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
          relation: input.relation
        }
      },
      materializeLedger: (edge) => ({
        category: 'governance',
        referenceType: 'edge',
        referenceId: edge.id,
        metadata: {
          relation: edge.relation,
          federation: true
        }
      }),
      mutation: (repository) => repository.createFederationLink(context, input),
      eventPayload: (edge, decision) => ({
        edgeId: edge.id,
        relation: edge.relation,
        decision: decision.decision
      }),
      fanoutChannel: 'falak.federation'
    });
  }
}
