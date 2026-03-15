import { errors } from '../../utils/errors';
import { FanoutMessage, FalakRepository, MutationPlan, MutationResult, RequestContext } from '../domain/types';
import { falakContextFields, logFalak } from '../observability/falakTelemetry';
import { FanoutPublisher } from './fanoutPublisher';
import { PolicyEngine } from './policyEngine';

export type MutationExecution<T> =
  | { status: 'applied'; payload: MutationResult<T> }
  | { status: 'blocked'; decision: MutationResult<T>['decision'] };

export class MutationPipeline {
  constructor(
    private readonly repository: FalakRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly fanoutPublisher: FanoutPublisher
  ) {}

  async execute<T>(context: RequestContext, plan: MutationPlan<T>): Promise<MutationExecution<T>> {
    const decision = await this.policyEngine.evaluate(context, plan.policy);

    if (decision.decision !== 'allow') {
      const blockedTargetId =
        typeof plan.targetId === 'string'
          ? plan.targetId
          : typeof plan.policy.targetId === 'string'
            ? plan.policy.targetId
            : null;

      let blockedDecision = decision;
      await this.repository.transaction(context.tenantId, async (tx) => {
        let approvalId: string | null = null;
        if (decision.decision === 'requires_approval') {
          if (!blockedTargetId) {
            throw errors.internal('Approval-required mutation is missing a stable target id', 'APPROVAL_TARGET_REQUIRED');
          }

          const approval = await tx.createApproval(context, {
            requestType: `${plan.resourceType}_${plan.action}`,
            targetType: plan.targetType,
            targetId: blockedTargetId,
            requiredApprovals: decision.requiredApprovals ?? 1,
            context: {
              resourceType: plan.resourceType,
              action: plan.action,
              targetType: plan.targetType,
              traceId: context.traceId,
              policy: {
                matchedPolicyIds: decision.matchedPolicyIds,
                reasons: decision.reasons,
                requiredApprovals: decision.requiredApprovals
              },
              request: plan.policy.context ?? {}
            }
          });
          approvalId = approval.id;
          blockedDecision = {
            ...decision,
            approvalId
          };
        }

        const eventId = await tx.writeEvent({
          tenantId: context.tenantId,
          eventType: `${plan.resourceType}.${plan.action}.blocked`,
          actorId: context.actor?.id ?? null,
          targetType: plan.targetType,
          targetId: blockedTargetId,
          policyResult: decision.decision === 'deny' ? 'denied' : 'pending',
          payload: {
            reasons: blockedDecision.reasons,
            decision: blockedDecision.decision,
            requiredApprovals: blockedDecision.requiredApprovals,
            approvalId: blockedDecision.approvalId
          },
          traceId: context.traceId
        });

        await tx.writeAuditLog({
          tenantId: context.tenantId,
          actorId: context.actor?.id ?? null,
          plane: context.plane,
          action: `${plan.action}.blocked`,
          resourceType: plan.resourceType,
          resourceId: blockedTargetId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            eventId: eventId.id,
            decision: blockedDecision.decision,
            reasons: blockedDecision.reasons,
            approvalId: blockedDecision.approvalId
          }
        });
      });

      logFalak('falak.rejected_operation', {
        ...falakContextFields(context),
        resourceType: plan.resourceType,
        action: plan.action,
        targetType: plan.targetType,
        targetId: blockedTargetId,
        decision: blockedDecision.decision,
        approvalId: blockedDecision.approvalId,
        reasons: blockedDecision.reasons
      }, blockedDecision.decision === 'deny' ? 'warn' : 'info');

      return { status: 'blocked', decision: blockedDecision };
    }

    let fanoutMessage: FanoutMessage | null = null;
    const payload = await this.repository.transaction(context.tenantId, async (tx) => {
      const result = await plan.mutation(tx);
      const resolvedTargetId =
        typeof plan.targetId === 'function' ? plan.targetId(result) : (plan.targetId ?? null);
      const eventPayload = plan.eventPayload(result, decision);
      const eventId = await tx.writeEvent({
        tenantId: context.tenantId,
        eventType: `${plan.resourceType}.${plan.action}`,
        actorId: context.actor?.id ?? null,
        targetType: plan.targetType,
        targetId: resolvedTargetId,
        policyResult: 'allowed',
        payload: eventPayload,
        traceId: context.traceId
      });

      if (plan.materializeLedger) {
        const ledger = plan.materializeLedger(result, decision);
        if (ledger) {
          await tx.writeLedgerEntry({
            tenantId: context.tenantId,
            category: ledger.category,
            eventId: eventId.id,
            referenceType: ledger.referenceType,
            referenceId: ledger.referenceId ?? resolvedTargetId,
            amount: ledger.amount ?? null,
            currency: ledger.currency ?? null,
            metadata: {
              ...ledger.metadata,
              traceId: context.traceId
            }
          });
        }
      }

      await tx.writeAuditLog({
        tenantId: context.tenantId,
        actorId: context.actor?.id ?? null,
        plane: context.plane,
        action: plan.action,
        resourceType: plan.resourceType,
        resourceId: resolvedTargetId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          eventId: eventId.id,
          decision: decision.decision
        }
      });

      if (plan.fanoutChannel) {
        fanoutMessage = {
          channel: plan.fanoutChannel,
          eventId: eventId.id,
          tenantId: context.tenantId,
          traceId: context.traceId,
          eventType: `${plan.resourceType}.${plan.action}`,
          payload: eventPayload
        };
      }

      return {
        decision,
        result
      };
    });

    if (fanoutMessage) {
      try {
        await this.fanoutPublisher.publish(fanoutMessage);
      } catch (error) {
        // Fanout happens after the transactional mutation path completes. We surface
        // the partial failure explicitly instead of swallowing it so operators can
        // reconcile committed state with downstream propagation.
        throw errors.internal(
          error instanceof Error
            ? `Mutation committed but fanout publish failed: ${error.message}`
            : 'Mutation committed but fanout publish failed',
          'FANOUT_PUBLISH_FAILED'
        );
      }
    }

    return { status: 'applied', payload };
  }
}

export function assertMutationApplied<T>(execution: MutationExecution<T>): MutationResult<T> {
  if (execution.status === 'blocked') {
    if (execution.decision.decision === 'requires_approval') {
      throw errors.forbidden('Approval required before mutation', 'APPROVAL_REQUIRED');
    }
    throw errors.forbidden('Mutation denied by policy', 'POLICY_DENIED');
  }

  return execution.payload;
}
