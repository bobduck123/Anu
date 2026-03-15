import { errors } from '../../utils/errors';
import {
  EventImpactRecord,
  FalakRepository,
  PoolBalanceRecord,
  RequestContext
} from '../domain/types';

export class ImpactQueryService {
  constructor(private readonly repository: FalakRepository) {}

  async getEventImpact(context: RequestContext, eventId: string): Promise<EventImpactRecord> {
    const impact = await this.repository.getEventImpact(context, eventId);
    if (!impact) {
      throw errors.notFound('Event not found', 'EVENT_NOT_FOUND');
    }

    return impact;
  }

  async getPoolBalance(context: RequestContext, poolId: string): Promise<PoolBalanceRecord> {
    const pool = await this.repository.getNodeById(context, poolId);
    if (!pool || pool.type !== 'liquidity_pool') {
      throw errors.notFound('Liquidity pool not found', 'POOL_NOT_FOUND');
    }

    return this.repository.getPoolBalance(context, poolId);
  }
}
