import { DbClient, DomainActor, toDomainActorFallback } from './types';

interface EmitEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  actor?: Partial<DomainActor>;
}

interface AuditEventInput {
  entityType: string;
  entityId: string;
  action: string;
  actor?: Partial<DomainActor>;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export class DomainEventService {
  constructor(private prisma: DbClient) {}

  private get db(): any {
    return this.prisma as any;
  }

  async emit(input: EmitEventInput, db: DbClient = this.prisma) {
    const actor = toDomainActorFallback(input.actor);
    return (db as any).domainEvent.create({
      data: {
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
        actorId: actor.id,
        correlationId: actor.correlationId,
      },
    });
  }

  async audit(input: AuditEventInput, db: DbClient = this.prisma) {
    const actor = toDomainActorFallback(input.actor);
    return (db as any).auditEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorId: actor.id,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        ip: actor.ip,
        requestId: actor.requestId,
      },
    });
  }

  async emitAndAudit(
    eventInput: EmitEventInput,
    auditInput: AuditEventInput,
    db: DbClient = this.prisma,
  ) {
    return Promise.all([this.emit(eventInput, db), this.audit(auditInput, db)]);
  }

  async countByAggregate(aggregateType: string, aggregateId: string): Promise<number> {
    return this.db.domainEvent.count({
      where: {
        aggregateType,
        aggregateId,
      },
    });
  }
}

export default DomainEventService;
