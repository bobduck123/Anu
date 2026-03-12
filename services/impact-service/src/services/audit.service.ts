import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit entry (append-only)
   */
  async logAction(
    actorId: string,
    actorRole: string,
    action: string,
    targetType: string,
    targetId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
    ip?: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          actorRole,
          action,
          targetType,
          targetId,
          before: before ? JSON.parse(JSON.stringify(before)) : undefined,
          after: after ? JSON.parse(JSON.stringify(after)) : undefined,
          ip
        }
      });

      logger.info(
        { actorId, action, targetType, targetId },
        'Audit log created'
      );
    } catch (err) {
      logger.error({ error: err }, 'Failed to create audit log');
      throw err;
    }
  }

  /**
   * Get audit logs for a target (paginated)
   */
  async getTargetHistory(
    targetType: string,
    targetId: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { targetType, targetId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.auditLog.count({
          where: { targetType, targetId }
        })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error({ error: err }, 'Failed to get audit history');
      throw err;
    }
  }

  /**
   * Get audit logs for an actor (paginated)
   */
  async getActorHistory(
    actorId: string,
    page: number = 1,
    limit: number = 50
  ) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { actorId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.auditLog.count({
          where: { actorId }
        })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error({ error: err }, 'Failed to get actor audit history');
      throw err;
    }
  }
}

export default AuditService;
