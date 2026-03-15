import { randomUUID } from 'crypto';
import { errors } from '../../utils/errors';
import {
  AllocationExecutionRecord,
  AllocationProposalRecord,
  AllocationProposalWorkflowRecord,
  ApprovalRecord,
  ApprovalVoteInput,
  ApprovalVoteWorkflowRecord,
  CreateAllocationProposalInput,
  FalakRepository,
  FanoutMessage,
  RequestContext
} from '../domain/types';
import { falakContextFields, logFalak } from '../observability/falakTelemetry';
import { FanoutPublisher } from './fanoutPublisher';
import { PolicyEngine } from './policyEngine';
import { assertPolicyAllows, publishFanoutMessages } from './workflowSupport';

function allocationPolicyContext(input: {
  eventNodeId: string | null;
  poolNodeId: string;
  targetNodeId: string;
  amount: number;
  currency: string;
}) {
  return {
    eventNodeId: input.eventNodeId,
    poolNodeId: input.poolNodeId,
    targetNodeId: input.targetNodeId,
    amount: input.amount,
    currency: input.currency
  };
}

export class AllocationWorkflowService {
  constructor(
    private readonly repository: FalakRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly fanoutPublisher: FanoutPublisher
  ) {}

  async proposeAllocation(context: RequestContext, input: CreateAllocationProposalInput): Promise<AllocationProposalWorkflowRecord> {
    const proposeDecision = await this.policyEngine.evaluate(context, {
      resourceType: 'allocation',
      action: 'propose',
      targetId: input.targetNodeId,
      targetTenantId: context.tenantId,
      context: allocationPolicyContext(input)
    });
    assertPolicyAllows(proposeDecision, {
      deniedMessage: 'Allocation proposal denied by Falak policy',
      approvalMessage: 'Approval-required allocation proposal is not supported by this workflow'
    });

    let fanoutMessages: FanoutMessage[] = [];
    const workflow = await this.repository.transaction(context.tenantId, async (tx) => {
      const createdProposal = await tx.createAllocationProposal(context, input);
      let proposal = createdProposal;
      let approval: ApprovalRecord | null = null;
      let ledgerEntries = [] as AllocationExecutionRecord['ledgerEntries'];

      const proposedEvent = await tx.writeEvent({
        tenantId: context.tenantId,
        eventType: 'allocation.proposed',
        actorId: context.actor?.id ?? null,
        targetType: 'allocation_proposal',
        targetId: proposal.id,
        policyResult: 'allowed',
        payload: {
          proposalId: proposal.id,
          proposalNodeId: proposal.nodeId,
          eventNodeId: proposal.eventNodeId,
          poolNodeId: proposal.poolNodeId,
          targetNodeId: proposal.targetNodeId,
          amount: proposal.amount,
          currency: proposal.currency
        },
        traceId: context.traceId
      });

      fanoutMessages.push({
        channel: 'falak.allocation',
        eventId: proposedEvent.id,
        tenantId: context.tenantId,
        traceId: context.traceId,
        eventType: 'allocation.proposed',
        payload: {
          proposalId: proposal.id,
          poolNodeId: proposal.poolNodeId,
          targetNodeId: proposal.targetNodeId,
          amount: proposal.amount,
          currency: proposal.currency
        }
      });

      const executeDecision = await this.policyEngine.evaluate(context, {
        resourceType: 'allocation',
        action: 'execute',
        targetId: proposal.id,
        targetTenantId: context.tenantId,
        context: allocationPolicyContext(proposal)
      });

      if (executeDecision.decision === 'requires_approval') {
        approval = await tx.createApproval(context, {
          requestType: 'allocation_execute',
          targetType: 'allocation_proposal',
          targetId: proposal.id,
          requiredApprovals: executeDecision.requiredApprovals ?? 1,
          context: {
            traceId: context.traceId,
            proposalId: proposal.id,
            proposalNodeId: proposal.nodeId,
            request: allocationPolicyContext(proposal),
            policy: {
              matchedPolicyIds: executeDecision.matchedPolicyIds,
              reasons: executeDecision.reasons,
              requiredApprovals: executeDecision.requiredApprovals
            }
          }
        });
        proposal = await tx.attachApprovalToAllocationProposal(context.tenantId, proposal.id, approval.id);

        const approvalRequiredEvent = await tx.writeEvent({
          tenantId: context.tenantId,
          eventType: 'allocation.approval_required',
          actorId: context.actor?.id ?? null,
          targetType: 'allocation_proposal',
          targetId: proposal.id,
          policyResult: 'pending',
          payload: {
            proposalId: proposal.id,
            approvalId: approval.id,
            requiredApprovals: approval.requiredApprovals,
            eventNodeId: proposal.eventNodeId,
            amount: proposal.amount,
            currency: proposal.currency
          },
          traceId: context.traceId
        });

        fanoutMessages.push({
          channel: 'falak.allocation',
          eventId: approvalRequiredEvent.id,
          tenantId: context.tenantId,
          traceId: context.traceId,
          eventType: 'allocation.approval_required',
          payload: {
            proposalId: proposal.id,
            approvalId: approval.id,
            requiredApprovals: approval.requiredApprovals
          }
        });
      } else {
        assertPolicyAllows(executeDecision, {
          deniedMessage: 'Allocation execution denied by Falak policy'
        });
        const execution = await this.executeProposalInsideTransaction(tx, context, proposal, null);
        proposal = execution.proposal;
        ledgerEntries = execution.ledgerEntries;
        fanoutMessages.push(...execution.fanoutMessages);
      }

      await tx.writeAuditLog({
        tenantId: context.tenantId,
        actorId: context.actor?.id ?? null,
        plane: context.plane,
        action: 'propose',
        resourceType: 'allocation',
        resourceId: proposal.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          eventId: proposedEvent.id,
          decision: proposeDecision.decision,
          approvalId: approval?.id ?? null,
          executed: proposal.status === 'executed'
        }
      });

      return {
        proposal,
        approval,
        ledgerEntries,
        executed: proposal.status === 'executed'
      };
    });

    await publishFanoutMessages(this.fanoutPublisher, fanoutMessages);
    return workflow;
  }

  async voteApproval(context: RequestContext, approvalId: string, input: ApprovalVoteInput): Promise<ApprovalVoteWorkflowRecord> {
    const decision = await this.policyEngine.evaluate(context, {
      resourceType: 'approval',
      action: 'vote',
      targetId: approvalId,
      context: {
        vote: input.vote
      }
    });
    assertPolicyAllows(decision, {
      deniedMessage: 'Approval vote denied by Falak policy',
      approvalMessage: 'Nested approval voting is not supported by this workflow'
    });

    let fanoutMessages: FanoutMessage[] = [];
    const record = await this.repository.transaction(context.tenantId, async (tx) => {
      const approval = await tx.recordApprovalVote(context, approvalId, input);
      let proposal: AllocationProposalRecord | null = null;
      let ledgerEntries = [] as AllocationExecutionRecord['ledgerEntries'];

      const voteEvent = await tx.writeEvent({
        tenantId: context.tenantId,
        eventType: 'approval.vote.recorded',
        actorId: context.actor?.id ?? null,
        targetType: 'approval',
        targetId: approval.id,
        policyResult: 'allowed',
        payload: {
          approvalId: approval.id,
          targetType: approval.targetType,
          targetId: approval.targetId,
          vote: input.vote,
          currentApprovals: approval.currentApprovals,
          status: approval.status
        },
        traceId: context.traceId
      });

      fanoutMessages.push({
        channel: 'falak.approval',
        eventId: voteEvent.id,
        tenantId: context.tenantId,
        traceId: context.traceId,
        eventType: 'approval.vote.recorded',
        payload: {
          approvalId: approval.id,
          status: approval.status,
          currentApprovals: approval.currentApprovals
        }
      });

      if (approval.targetType === 'allocation_proposal') {
        proposal = await tx.getAllocationProposalById(context.tenantId, approval.targetId);
        if (!proposal) {
          throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
        }

        if (approval.status === 'approved') {
          const execution = await this.executeProposalInsideTransaction(tx, context, proposal, approval.id);
          proposal = execution.proposal;
          ledgerEntries = execution.ledgerEntries;
          fanoutMessages.push(...execution.fanoutMessages);
        } else if (approval.status === 'rejected') {
          proposal = await tx.rejectAllocationProposal(
            context.tenantId,
            proposal.id,
            approval.resolvedAt ?? new Date().toISOString()
          );
        }
      }

      await tx.writeAuditLog({
        tenantId: context.tenantId,
        actorId: context.actor?.id ?? null,
        plane: context.plane,
        action: 'vote',
        resourceType: 'approval',
        resourceId: approval.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          eventId: voteEvent.id,
          decision: decision.decision,
          proposalId: proposal?.id ?? null,
          executed: proposal?.status === 'executed'
        }
      });

      return {
        approval,
        proposal,
        ledgerEntries,
        executed: proposal?.status === 'executed'
      };
    });

    await publishFanoutMessages(this.fanoutPublisher, fanoutMessages);
    return record;
  }

  async executeApprovedAllocation(context: RequestContext, proposalId: string): Promise<AllocationExecutionRecord> {
    let fanoutMessages: FanoutMessage[] = [];
    const execution = await this.repository.transaction(context.tenantId, async (tx) => {
      const proposal = await tx.getAllocationProposalById(context.tenantId, proposalId);
      if (!proposal) {
        throw errors.notFound('Allocation proposal not found', 'ALLOCATION_PROPOSAL_NOT_FOUND');
      }

      const approvalId = proposal.approvalId;
      const result = await this.executeProposalInsideTransaction(tx, context, proposal, approvalId);
      fanoutMessages = result.fanoutMessages;
      return {
        proposal: result.proposal,
        ledgerEntries: result.ledgerEntries,
        executed: result.executed
      };
    });

    await publishFanoutMessages(this.fanoutPublisher, fanoutMessages);
    return execution;
  }

  private async executeProposalInsideTransaction(
    tx: FalakRepository,
    context: RequestContext,
    proposal: AllocationProposalRecord,
    approvalId: string | null
  ): Promise<AllocationExecutionRecord & { fanoutMessages: FanoutMessage[] }> {
    if (proposal.status === 'executed') {
      logFalak('falak.allocation_execute', {
        ...falakContextFields(context),
        proposalId: proposal.id,
        approvalId,
        executed: false,
        reason: 'already_executed',
        correlationId: context.traceId
      }, 'warn');
      return {
        proposal,
        ledgerEntries: [],
        executed: false,
        fanoutMessages: []
      };
    }

    const approvedAt = new Date().toISOString();
    const approvedEvent = await tx.writeEvent({
      tenantId: context.tenantId,
      eventType: 'allocation.approved',
      actorId: context.actor?.id ?? null,
      targetType: 'allocation_proposal',
      targetId: proposal.id,
      policyResult: 'allowed',
      payload: {
        proposalId: proposal.id,
        approvalId,
        eventNodeId: proposal.eventNodeId,
        amount: proposal.amount,
        currency: proposal.currency
      },
      traceId: context.traceId
    });

    const executedEvent = await tx.writeEvent({
      tenantId: context.tenantId,
      eventType: 'allocation.executed',
      actorId: context.actor?.id ?? null,
      targetType: 'allocation_proposal',
      targetId: proposal.id,
      policyResult: 'allowed',
      payload: {
        proposalId: proposal.id,
        approvalId,
        eventNodeId: proposal.eventNodeId,
        poolNodeId: proposal.poolNodeId,
        targetNodeId: proposal.targetNodeId,
        amount: proposal.amount,
        currency: proposal.currency
      },
      traceId: context.traceId
    });

    const execution = await tx.executeAllocation(context.tenantId, proposal.id, approvedAt, executedEvent.id);
    logFalak('falak.allocation_execute', {
      ...falakContextFields(context),
      proposalId: proposal.id,
      approvalId,
      executed: execution.executed,
      ledgerEntryCount: execution.ledgerEntries.length,
      amount: proposal.amount,
      currency: proposal.currency,
      correlationId: context.traceId
    });
    const fanoutMessages: FanoutMessage[] = [
      {
        channel: 'falak.allocation',
        eventId: approvedEvent.id,
        tenantId: context.tenantId,
        traceId: context.traceId,
        eventType: 'allocation.approved',
        payload: {
          proposalId: proposal.id,
          approvalId
        }
      },
      {
        channel: 'falak.allocation',
        eventId: executedEvent.id,
        tenantId: context.tenantId,
        traceId: context.traceId,
        eventType: 'allocation.executed',
        payload: {
          proposalId: proposal.id,
          approvalId,
          ledgerEntryCount: execution.ledgerEntries.length
        }
      }
    ];

    return {
      ...execution,
      fanoutMessages
    };
  }
}
