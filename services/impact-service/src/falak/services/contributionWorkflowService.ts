import {
  FalakRepository,
  FanoutMessage,
  RecordContributionInput,
  RequestContext,
  ContributionRecord
} from '../domain/types';
import { FanoutPublisher } from './fanoutPublisher';
import { PolicyEngine } from './policyEngine';
import { assertPolicyAllows, publishFanoutMessages } from './workflowSupport';

export class ContributionWorkflowService {
  constructor(
    private readonly repository: FalakRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly fanoutPublisher: FanoutPublisher
  ) {}

  async recordContribution(context: RequestContext, input: RecordContributionInput): Promise<ContributionRecord> {
    const decision = await this.policyEngine.evaluate(context, {
      resourceType: 'contribution',
      action: 'record',
      targetId: input.poolNodeId,
      context: {
        eventNodeId: input.eventNodeId,
        poolNodeId: input.poolNodeId,
        amount: input.amount,
        currency: input.currency,
        anonymous: context.actor === null
      }
    });
    assertPolicyAllows(decision, {
      deniedMessage: 'Contribution recording denied by Falak policy',
      approvalMessage: 'Approval-required contributions are not supported by this workflow'
    });

    let fanoutMessages: FanoutMessage[] = [];
    const contribution = await this.repository.transaction(context.tenantId, async (tx) => {
      const recorded = await tx.recordContribution(context, input);
      const eventWrite = await tx.writeEvent({
        tenantId: context.tenantId,
        eventType: 'contribution.recorded',
        actorId: context.actor?.id ?? null,
        targetType: 'contribution',
        targetId: recorded.id,
        policyResult: 'allowed',
        payload: {
          contributionId: recorded.id,
          contributionNodeId: recorded.nodeId,
          eventNodeId: recorded.eventNodeId,
          poolNodeId: recorded.poolNodeId,
          amount: recorded.amount,
          currency: recorded.currency,
          anonymous: recorded.contributorActorId === null
        },
        traceId: context.traceId
      });

      await tx.writeLedgerEntry({
        tenantId: context.tenantId,
        category: 'financial',
        eventId: eventWrite.id,
        referenceType: 'pool',
        referenceId: recorded.poolNodeId,
        amount: recorded.amount,
        currency: recorded.currency,
        metadata: {
          traceId: context.traceId,
          kind: 'contribution',
          contributionId: recorded.id,
          contributionNodeId: recorded.nodeId,
          eventNodeId: recorded.eventNodeId
        }
      });

      await tx.writeAuditLog({
        tenantId: context.tenantId,
        actorId: context.actor?.id ?? null,
        plane: context.plane,
        action: 'record',
        resourceType: 'contribution',
        resourceId: recorded.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          eventId: eventWrite.id,
          decision: decision.decision,
          poolNodeId: recorded.poolNodeId
        }
      });

      fanoutMessages = [
        {
          channel: 'falak.contribution',
          eventId: eventWrite.id,
          tenantId: context.tenantId,
          traceId: context.traceId,
          eventType: 'contribution.recorded',
          payload: {
            contributionId: recorded.id,
            poolNodeId: recorded.poolNodeId,
            amount: recorded.amount,
            currency: recorded.currency
          }
        }
      ];

      return recorded;
    });

    await publishFanoutMessages(this.fanoutPublisher, fanoutMessages);
    return contribution;
  }
}
