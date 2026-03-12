import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

export class CreditsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get current user's credit balance
   * Computed as SUM of all credit transactions
   */
  async getUserBalance(userId: string): Promise<number> {
    try {
      const result = await this.prisma.impactCreditTransaction.aggregate({
        where: { userId },
        _sum: { amountCredits: true }
      });

      const balance = result._sum.amountCredits || 0;
      logger.debug({ userId, balance }, 'User credit balance computed');
      return balance;
    } catch (err) {
      logger.error({ error: err, userId }, 'Failed to get user balance');
      throw err;
    }
  }

  /**
   * Get user's credit transaction history (paginated)
   */
  async getUserHistory(userId: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        this.prisma.impactCreditTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            transactionType: true,
            amountCredits: true,
            description: true,
            referenceId: true,
            createdAt: true
          }
        }),
        this.prisma.impactCreditTransaction.count({
          where: { userId }
        })
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      logger.error({ error: err, userId }, 'Failed to get user history');
      throw err;
    }
  }
}

export default CreditsService;
