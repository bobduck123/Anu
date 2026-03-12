import { AllocationRequestStatus, DisbursementStatus } from '@prisma/client';
import DomainEventService from './DomainEventService';
import PoolLedgerService from './PoolLedgerService';
import {
  CreateAllocationRequestInput,
  DbClient,
  DomainActor,
  assertPositiveCents,
  normalizeOptionalText,
  normalizeRequiredText,
  toDomainActorFallback,
} from './types';
import { errors } from '../../utils/errors';

export class AllocationService {
  constructor(
    private prisma: DbClient,
    private domainEvents: DomainEventService,
    private poolLedgerService: PoolLedgerService,
  ) {}

  private get db(): any {
    return this.prisma as any;
  }

  async listAllocationRequests(limit: number = 50, poolId?: string) {
    return this.db.allocationRequest.findMany({
      where: {
        poolId: poolId || undefined,
      },
      include: {
        pool: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        disbursements: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async requestAllocation(input: CreateAllocationRequestInput, actor: Partial<DomainActor>) {
    assertPositiveCents(input.amountCents, 'amountCents');
    const poolId = normalizeRequiredText(input.poolId, 'poolId');
    const beneficiaryId = normalizeRequiredText(input.beneficiaryId, 'beneficiaryId');
    const purpose = normalizeRequiredText(input.purpose, 'purpose');
    const rationale = normalizeOptionalText(input.rationale, 'rationale');
    const normalizedActor = toDomainActorFallback(actor);
    if (normalizedActor.role !== 'organizer' && beneficiaryId !== normalizedActor.id) {
      throw errors.forbidden('You can only create allocation requests for yourself');
    }

    return this.db.$transaction(async (tx: DbClient) => {
      const pool = await (tx as any).liquidityPool.findUnique({
        where: { id: poolId },
      });
      if (!pool) {
        throw errors.notFound(`Liquidity pool ${poolId} not found`);
      }
      if (!pool.isActive) {
        throw errors.conflict('Cannot request allocations from an inactive liquidity pool');
      }

      const request = await (tx as any).allocationRequest.create({
        data: {
          poolId,
          requestedBy: normalizedActor.id,
          beneficiaryId,
          purpose,
          amountCents: input.amountCents,
          rationale,
        },
      });

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'allocation_request',
          aggregateId: request.id,
          eventType: 'allocation.requested',
          payload: {
            poolId: request.poolId,
            amountCents: request.amountCents,
            beneficiaryId: request.beneficiaryId,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'allocation_request',
          entityId: request.id,
          action: 'allocation_requested',
          actor: normalizedActor,
          after: {
            poolId: request.poolId,
            amountCents: request.amountCents,
            status: request.status,
          },
        },
        tx,
      );

      return request;
    });
  }

  async approveAllocation(requestId: string, actor: Partial<DomainActor>) {
    const normalizedActor = toDomainActorFallback(actor);

    return this.db.$transaction(async (tx: DbClient) => {
      const request = await (tx as any).allocationRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw errors.notFound(`Allocation request ${requestId} not found`);
      }
      if (request.status !== AllocationRequestStatus.pending) {
        throw errors.conflict('Only pending allocation requests can be approved');
      }

      const updateResult = await (tx as any).allocationRequest.updateMany({
        where: {
          id: requestId,
          status: AllocationRequestStatus.pending,
        },
        data: { status: AllocationRequestStatus.approved },
      });
      if (updateResult.count !== 1) {
        throw errors.conflict('Allocation request is no longer pending');
      }

      const updated = await (tx as any).allocationRequest.findUnique({
        where: { id: requestId },
      });
      if (!updated) {
        throw errors.internal('Allocation request disappeared during approval');
      }

      const reservation = await this.poolLedgerService.reserveAllocation(
        request.poolId,
        request.amountCents,
        normalizedActor,
        request.id,
        tx,
      );

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'allocation_request',
          aggregateId: updated.id,
          eventType: 'allocation.approved',
          payload: {
            poolId: updated.poolId,
            amountCents: updated.amountCents,
            reservationJournalId: reservation.journalId,
            availableBalanceCents: reservation.availableBalanceCents,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'allocation_request',
          entityId: updated.id,
          action: 'allocation_approved',
          actor: normalizedActor,
          before: {
            status: request.status,
          },
          after: {
            status: updated.status,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async disburse(requestId: string, destinationRef: string, actor: Partial<DomainActor>) {
    const normalizedDestinationRef = normalizeRequiredText(destinationRef, 'destinationRef');
    const normalizedActor = toDomainActorFallback(actor);

    return this.db.$transaction(async (tx: DbClient) => {
      const request = await (tx as any).allocationRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw errors.notFound(`Allocation request ${requestId} not found`);
      }
      if (request.status !== AllocationRequestStatus.approved) {
        throw errors.conflict('Only approved allocation requests can be disbursed');
      }

      const updateResult = await (tx as any).allocationRequest.updateMany({
        where: {
          id: request.id,
          status: AllocationRequestStatus.approved,
        },
        data: {
          status: AllocationRequestStatus.disbursed,
        },
      });
      if (updateResult.count !== 1) {
        throw errors.conflict('Allocation request is no longer approved');
      }

      const disbursement = await (tx as any).disbursement.create({
        data: {
          allocationRequestId: request.id,
          poolId: request.poolId,
          amountCents: request.amountCents,
          status: DisbursementStatus.sent,
          destinationRef: normalizedDestinationRef,
          executedBy: normalizedActor.id,
          executedAt: new Date(),
        },
      });

      await this.poolLedgerService.recordDisbursement(
        request.poolId,
        request.amountCents,
        normalizedActor,
        disbursement.id,
        tx,
      );

      await this.domainEvents.emitAndAudit(
        {
          aggregateType: 'allocation_request',
          aggregateId: request.id,
          eventType: 'allocation.disbursed',
          payload: {
            poolId: request.poolId,
            amountCents: request.amountCents,
            disbursementId: disbursement.id,
            destinationRef: normalizedDestinationRef,
          },
          actor: normalizedActor,
        },
        {
          entityType: 'disbursement',
          entityId: disbursement.id,
          action: 'allocation_disbursed',
          actor: normalizedActor,
          before: {
            status: request.status,
          },
          after: {
            poolId: request.poolId,
            status: disbursement.status,
            amountCents: disbursement.amountCents,
          },
        },
        tx,
      );

      return disbursement;
    });
  }
}

export default AllocationService;
