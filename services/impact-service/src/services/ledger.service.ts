import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { errors } from '../utils/errors';

export class LedgerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Credit a pool with impact funds
   * Append-only: creates a new ledger entry
   */
  async creditPool(
    poolId: string,
    amountCents: number,
    description: string,
    referenceId: string | undefined,
    referenceType: string | undefined,
    createdBy: string
  ): Promise<void> {
    try {
      // Verify pool exists
      const pool = await this.prisma.impactPool.findUnique({
        where: { id: poolId }
      });

      if (!pool) {
        throw errors.notFound(`Pool ${poolId} not found`);
      }

      // Create ledger entry
      await this.prisma.impactLedgerEntry.create({
        data: {
          poolId,
          entryType: 'manual_credit',
          amountCents,
          description,
          referenceId,
          referenceType,
          createdBy
        }
      });

      logger.info(
        { poolId, amountCents, description, createdBy },
        'Pool credited'
      );
    } catch (err) {
      logger.error({ error: err, poolId }, 'Failed to credit pool');
      throw err;
    }
  }

  /**
   * Get the current balance of a pool
   * Computed as SUM of all ledger entries
   */
  async getPoolBalance(poolId: string): Promise<number> {
    try {
      const result = await this.prisma.impactLedgerEntry.aggregate({
        where: { poolId },
        _sum: { amountCents: true }
      });

      const balance = result._sum.amountCents || 0;
      logger.debug({ poolId, balance }, 'Pool balance computed');
      return balance;
    } catch (err) {
      logger.error({ error: err, poolId }, 'Failed to get pool balance');
      throw err;
    }
  }

  /**
   * Reverse a ledger entry by creating a reversal entry
   * The reversal has the opposite amount and references the original
   */
  async reverseEntry(
    originalEntryId: string,
    reason: string,
    createdBy: string
  ): Promise<void> {
    try {
      // Find the original entry
      const original = await this.prisma.impactLedgerEntry.findUnique({
        where: { id: originalEntryId }
      });

      if (!original) {
        throw errors.notFound(`Ledger entry ${originalEntryId} not found`);
      }

      // Create reversal entry with opposite amount
      await this.prisma.impactLedgerEntry.create({
        data: {
          poolId: original.poolId,
          entryType: 'reversal',
          amountCents: -original.amountCents,
          description: `Reversal: ${reason}`,
          reversalOf: originalEntryId,
          createdBy
        }
      });

      logger.info(
        { originalEntryId, reason, createdBy },
        'Ledger entry reversed'
      );
    } catch (err) {
      logger.error({ error: err, originalEntryId }, 'Failed to reverse entry');
      throw err;
    }
  }

  /**
   * Allocate funds from a pool (Phase 2 guard)
   * Throws if insufficient balance
   * Must be called within a transaction for TOCTOU safety
   */
  async allocateFromPool(
    prisma: PrismaClient,
    poolId: string,
    amountCents: number,
    allocationId: string,
    approvedBy: string
  ): Promise<void> {
    try {
      // Get current balance within transaction
      const balance = await prisma.impactLedgerEntry.aggregate({
        where: { poolId },
        _sum: { amountCents: true }
      });

      const currentBalance = balance._sum.amountCents || 0;

      if (currentBalance < amountCents) {
        throw errors.unprocessable(
          `Insufficient pool balance. Required: ${amountCents}, Available: ${currentBalance}`
        );
      }

      // Create debit entry
      await prisma.impactLedgerEntry.create({
        data: {
          poolId,
          entryType: 'allocation_debit',
          amountCents: -amountCents,
          description: `Allocation to ${allocationId}`,
          referenceId: allocationId,
          referenceType: 'allocation',
          createdBy: approvedBy
        }
      });

      logger.info(
        { poolId, amountCents, allocationId },
        'Funds allocated from pool'
      );
    } catch (err) {
      logger.error({ error: err, poolId }, 'Failed to allocate from pool');
      throw err;
    }
  }

  /**
   * Get ledger entries for a pool (paginated)
   */
  async getPoolLedger(poolId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.prisma.impactLedgerEntry.findMany({
          where: { poolId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.impactLedgerEntry.count({
          where: { poolId }
        })
      ]);

      return {
        entries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error({ error: err, poolId }, 'Failed to get pool ledger');
      throw err;
    }
  }
}

export default LedgerService;
