import {
  CreateEventWorkflowInput,
  EventWorkflowRecord,
  FalakRepository,
  FanoutMessage,
  RequestContext
} from '../domain/types';
import { FanoutPublisher } from './fanoutPublisher';
import { PolicyEngine } from './policyEngine';
import { assertPolicyAllows, publishFanoutMessages } from './workflowSupport';

export class EventWorkflowService {
  constructor(
    private readonly repository: FalakRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly fanoutPublisher: FanoutPublisher
  ) {}

  async createEvent(context: RequestContext, input: CreateEventWorkflowInput): Promise<EventWorkflowRecord> {
    const decision = await this.policyEngine.evaluate(context, {
      resourceType: 'event',
      action: 'create',
      resourceVisibility: input.visibility,
      sensitivityClass: input.sensitivityClass,
      nodeType: 'event',
      context: {
        venueNodeId: input.venueNodeId,
        communityNodeId: input.communityNodeId,
        campaignNodeId: input.campaignNodeId,
        poolNodeId: input.poolNodeId
      }
    });
    assertPolicyAllows(decision, {
      deniedMessage: 'Event creation denied by Falak policy',
      approvalMessage: 'Approval-required event creation is not supported by this workflow'
    });

    let fanoutMessages: FanoutMessage[] = [];
    const record = await this.repository.transaction(context.tenantId, async (tx) => {
      const created = await tx.createEventWithLinks(context, input);
      const eventWrite = await tx.writeEvent({
        tenantId: context.tenantId,
        eventType: 'event.created',
        actorId: context.actor?.id ?? null,
        targetType: 'event',
        targetId: created.event.id,
        policyResult: 'allowed',
        payload: {
          eventId: created.event.id,
          venueNodeId: input.venueNodeId,
          communityNodeId: input.communityNodeId,
          campaignNodeId: input.campaignNodeId,
          poolNodeId: input.poolNodeId,
          relationCount: created.links.length
        },
        traceId: context.traceId
      });

      await tx.writeAuditLog({
        tenantId: context.tenantId,
        actorId: context.actor?.id ?? null,
        plane: context.plane,
        action: 'create',
        resourceType: 'event',
        resourceId: created.event.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: {
          eventId: eventWrite.id,
          decision: decision.decision
        }
      });

      fanoutMessages = [
        {
          channel: 'falak.event',
          eventId: eventWrite.id,
          tenantId: context.tenantId,
          traceId: context.traceId,
          eventType: 'event.created',
          payload: {
            eventId: created.event.id,
            venueNodeId: input.venueNodeId,
            poolNodeId: input.poolNodeId
          }
        }
      ];

      return created;
    });

    await publishFanoutMessages(this.fanoutPublisher, fanoutMessages);
    return record;
  }
}
