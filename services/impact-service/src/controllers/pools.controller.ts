import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import LedgerService from '../services/ledger.service';
import AuditService from '../services/audit.service';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

export class PoolsController {
  private ledger: LedgerService;
  private audit: AuditService;

  constructor(private prisma: PrismaClient) {
    this.ledger = new LedgerService(prisma);
    this.audit = new AuditService(prisma);
  }

  /**
   * GET /api/pools
   * List all active pools with their balances
   */
  async listPools(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pools = await this.prisma.impactPool.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      // Compute balances for each pool
      const poolsWithBalance = await Promise.all(
        pools.map(async (pool) => {
          const balance = await this.ledger.getPoolBalance(pool.id);
          return {
            ...pool,
            currentBalanceCents: balance,
            percentToTarget: pool.targetAmountCents > 0 ? Math.round((balance / pool.targetAmountCents) * 100) : 0
          };
        })
      );

      res.json(poolsWithBalance);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pools/:id
   * Get pool details with balance
   */
  async getPool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const pool = await this.prisma.impactPool.findUnique({
        where: { id }
      });

      if (!pool) {
        next(errors.notFound('Pool not found'));
        return;
      }

      const balance = await this.ledger.getPoolBalance(pool.id);

      res.json({
        ...pool,
        currentBalanceCents: balance,
        percentToTarget: pool.targetAmountCents > 0 ? Math.round((balance / pool.targetAmountCents) * 100) : 0
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/pools/:id/ledger
   * Get paginated ledger entries for a pool
   */
  async getPoolLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Verify pool exists
      const pool = await this.prisma.impactPool.findUnique({
        where: { id }
      });

      if (!pool) {
        next(errors.notFound('Pool not found'));
        return;
      }

      const result = await this.ledger.getPoolLedger(id, page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pools
   * Create a new impact pool (organizer only)
   */
  async createPool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const { name, description, category, targetAmountCents } = req.body;

      if (!name || !description || !category) {
        next(errors.badRequest('Missing required fields: name, description, category'));
        return;
      }

      const pool = await this.prisma.impactPool.create({
        data: {
          name,
          description,
          category,
          targetAmountCents: targetAmountCents || 0,
          isActive: true,
          createdBy: req.user.username
        }
      });

      // Audit log
      await this.audit.logAction(
        req.user.username,
        req.user.role,
        'pool_created',
        'pool',
        pool.id,
        undefined,
        {
          name,
          category,
          targetAmountCents
        }
      );

      res.status(201).json(pool);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/pools/:id/credit
   * Manually credit a pool with funds (organizer only)
   */
  async creditPool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const { id } = req.params;
      const { amountCents, description } = req.body;

      if (!amountCents || amountCents <= 0) {
        next(errors.badRequest('amountCents must be a positive number'));
        return;
      }

      if (!description) {
        next(errors.badRequest('description is required'));
        return;
      }

      // Verify pool exists
      const pool = await this.prisma.impactPool.findUnique({
        where: { id }
      });

      if (!pool) {
        next(errors.notFound('Pool not found'));
        return;
      }

      // Credit the pool
      await this.ledger.creditPool(
        id,
        amountCents,
        description,
        undefined,
        'manual',
        req.user.username
      );

      // Audit log
      await this.audit.logAction(
        req.user.username,
        req.user.role,
        'pool_credited',
        'pool',
        id,
        undefined,
        {
          amountCents,
          description
        }
      );

      // Return updated pool with balance
      const balance = await this.ledger.getPoolBalance(id);
      res.json({
        ...pool,
        currentBalanceCents: balance,
        percentToTarget: pool.targetAmountCents > 0 ? Math.round((balance / pool.targetAmountCents) * 100) : 0
      });
    } catch (err) {
      next(err);
    }
  }
}

export default PoolsController;
