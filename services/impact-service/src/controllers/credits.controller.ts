import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import CreditsService from '../services/credits.service';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

export class CreditsController {
  private credits: CreditsService;

  constructor(private prisma: PrismaClient) {
    this.credits = new CreditsService(prisma);
  }

  /**
   * GET /api/credits/balance
   * Get current user's impact credit balance
   */
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const balance = await this.credits.getUserBalance(req.user.username);

      res.json({
        balance,
        username: req.user.username
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/credits/history
   * Get current user's credit transaction history (paginated)
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.credits.getUserHistory(req.user.username, page, limit);

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default CreditsController;
