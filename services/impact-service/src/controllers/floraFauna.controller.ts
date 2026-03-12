import { NextFunction, Request, Response } from 'express';
import { ModerationCaseStatus, PrismaClient } from '@prisma/client';
import AllocationService from '../services/flora-fauna/AllocationService';
import ChannelService from '../services/flora-fauna/ChannelService';
import DomainEventService from '../services/flora-fauna/DomainEventService';
import GeologicalClassifier from '../services/flora-fauna/GeologicalClassifier';
import LineageService from '../services/flora-fauna/LineageService';
import MemeService from '../services/flora-fauna/MemeService';
import ModerationService from '../services/flora-fauna/ModerationService';
import NutrientEngine from '../services/flora-fauna/NutrientEngine';
import PoolLedgerService from '../services/flora-fauna/PoolLedgerService';
import RevenueService from '../services/flora-fauna/RevenueService';
import SubscriptionService from '../services/flora-fauna/SubscriptionService';
import {
  DomainActor,
  MODERATION_CASE_STATUSES,
  parseBoundedLimit,
} from '../services/flora-fauna/types';
import { errors } from '../utils/errors';

export class FloraFaunaController {
  private readonly domainEvents: DomainEventService;
  private readonly geologicalClassifier: GeologicalClassifier;
  private readonly nutrientEngine: NutrientEngine;
  private readonly channelService: ChannelService;
  private readonly lineageService: LineageService;
  private readonly memeService: MemeService;
  private readonly subscriptionService: SubscriptionService;
  private readonly poolLedgerService: PoolLedgerService;
  private readonly revenueService: RevenueService;
  private readonly allocationService: AllocationService;
  private readonly moderationService: ModerationService;

  constructor(private prisma: PrismaClient) {
    this.domainEvents = new DomainEventService(prisma);
    this.geologicalClassifier = new GeologicalClassifier();
    this.nutrientEngine = new NutrientEngine(prisma, this.domainEvents, this.geologicalClassifier);
    this.lineageService = new LineageService(prisma, this.domainEvents);
    this.channelService = new ChannelService(prisma, this.domainEvents, this.nutrientEngine);
    this.memeService = new MemeService(prisma, this.domainEvents, this.lineageService, this.nutrientEngine);
    this.subscriptionService = new SubscriptionService(prisma, this.domainEvents);
    this.poolLedgerService = new PoolLedgerService(prisma, this.domainEvents);
    this.revenueService = new RevenueService(
      prisma,
      this.domainEvents,
      this.subscriptionService,
      this.poolLedgerService,
    );
    this.allocationService = new AllocationService(prisma, this.domainEvents, this.poolLedgerService);
    this.moderationService = new ModerationService(prisma, this.domainEvents);
  }

  private actorFromRequest(req: Request): DomainActor {
    const requestIdHeader = req.headers['x-request-id'];
    const correlationIdHeader = req.headers['x-correlation-id'];

    return {
      id: req.user?.username || 'anonymous',
      role: req.user?.role || 'anonymous',
      ip: req.ip,
      requestId: Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader,
      correlationId: Array.isArray(correlationIdHeader) ? correlationIdHeader[0] : correlationIdHeader,
    };
  }

  async listChannels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 12, 50);
      const channels = await this.channelService.listChannels(limit);
      res.json({ channels });
    } catch (err) {
      next(err);
    }
  }

  async listPools(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 12, 50);
      const pools = await this.poolLedgerService.listPools(limit);
      res.json({ pools });
    } catch (err) {
      next(err);
    }
  }

  async listRevenueEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 50, 100);
      const events = await this.revenueService.listRevenueEvents(limit, {
        subscriptionId: req.query.subscriptionId as string | undefined,
        channelId: req.query.channelId as string | undefined,
        memeId: req.query.memeId as string | undefined,
      });
      res.json({ events });
    } catch (err) {
      next(err);
    }
  }

  async listAllocationRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 50, 100);
      const requests = await this.allocationService.listAllocationRequests(
        limit,
        req.query.poolId as string | undefined,
      );
      res.json({ requests });
    } catch (err) {
      next(err);
    }
  }

  async listModerationCases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 50, 100);
      const rawStatus = req.query.status;
      let status: ModerationCaseStatus | undefined;
      if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '') {
        const candidate = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
        if (typeof candidate !== 'string' || !MODERATION_CASE_STATUSES.includes(candidate as ModerationCaseStatus)) {
          return next(errors.badRequest(`status must be one of: ${MODERATION_CASE_STATUSES.join(', ')}`));
        }
        status = candidate as ModerationCaseStatus;
      }
      const cases = await this.moderationService.listCases(limit, status);
      res.json({ cases });
    } catch (err) {
      next(err);
    }
  }

  async getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseBoundedLimit(req.query.limit, 12, 24);
      const feed = await this.memeService.getFeed(limit);
      res.json({ feed });
    } catch (err) {
      next(err);
    }
  }

  async getChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const channel = await this.channelService.getChannel(req.params.channelId);
      res.json(channel);
    } catch (err) {
      next(err);
    }
  }

  async createChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }

      const channel = await this.channelService.createChannel(
        {
          slug: req.body.slug,
          title: req.body.title,
          creatorUserId: req.body.creatorUserId || req.user.username,
          description: req.body.description,
          manifesto: req.body.manifesto,
          initialNutrients: req.body.initialNutrients,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(channel);
    } catch (err) {
      next(err);
    }
  }

  async recordChannelNutrients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const result = await this.nutrientEngine.recordSnapshot(
        req.params.channelId,
        this.actorFromRequest(req),
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getChannelEcology(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ecology = await this.nutrientEngine.getLatestEcologySummary(req.params.channelId);
      if (!ecology) {
        return next(errors.notFound('No ecology snapshots found for channel'));
      }
      res.json(ecology);
    } catch (err) {
      next(err);
    }
  }

  async getMeme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meme = await this.memeService.getMeme(req.params.memeId);
      res.json(meme);
    } catch (err) {
      next(err);
    }
  }

  async createMeme(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }

      const meme = await this.memeService.createMeme(
        {
          channelId: req.body.channelId,
          slug: req.body.slug,
          title: req.body.title,
          body: req.body.body,
          summary: req.body.summary,
          mediaUrl: req.body.mediaUrl,
          parentMemeIds: req.body.parentMemeIds,
          lineageType: req.body.lineageType,
          nutrientSnapshot: req.body.nutrientSnapshot,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(meme);
    } catch (err) {
      next(err);
    }
  }

  async getPool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = await this.poolLedgerService.getPoolSnapshot(req.params.poolId);
      res.json(pool);
    } catch (err) {
      next(err);
    }
  }

  async createPool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const pool = await this.poolLedgerService.createPool(
        {
          slug: req.body.slug,
          name: req.body.name,
          description: req.body.description,
          policyJson: req.body.policyJson,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(pool);
    } catch (err) {
      next(err);
    }
  }

  async createAllocationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const request = await this.allocationService.requestAllocation(
        {
          poolId: req.params.poolId,
          beneficiaryId: req.body.beneficiaryId || req.user.username,
          amountCents: req.body.amountCents,
          purpose: req.body.purpose,
          rationale: req.body.rationale,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  }

  async approveAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const request = await this.allocationService.approveAllocation(
        req.params.requestId,
        this.actorFromRequest(req),
      );
      res.json(request);
    } catch (err) {
      next(err);
    }
  }

  async disburseAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const disbursement = await this.allocationService.disburse(
        req.params.requestId,
        req.body.destinationRef,
        this.actorFromRequest(req),
      );
      res.status(201).json(disbursement);
    } catch (err) {
      next(err);
    }
  }

  async recordRevenueEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const event = await this.revenueService.recordRevenueEvent(
        {
          subscriptionId: req.body.subscriptionId,
          channelId: req.body.channelId,
          memeId: req.body.memeId,
          sourceType: req.body.sourceType,
          grossAmountCents: req.body.grossAmountCents,
          netAmountCents: req.body.netAmountCents,
          currency: req.body.currency,
          memo: req.body.memo,
          splits: req.body.splits,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }

  async getSubscriptionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      if (req.user.role !== 'organizer' && req.user.username !== req.params.userId) {
        return next(errors.forbidden('You can only view your own subscription summary'));
      }

      const summary = await this.subscriptionService.getSubscriptionSummary(req.params.userId);
      if (!summary) {
        return next(errors.notFound('Subscription summary not found'));
      }

      res.json(summary);
    } catch (err) {
      next(err);
    }
  }

  async flagRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const result = await this.moderationService.flagRisk(
        {
          channelId: req.body.channelId,
          memeId: req.body.memeId,
          flagType: req.body.flagType,
          severity: req.body.severity,
          reason: req.body.reason,
        },
        this.actorFromRequest(req),
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordModerationAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }
      const result = await this.moderationService.recordAction(
        {
          caseId: req.params.caseId,
          actionType: req.body.actionType,
          notes: req.body.notes,
        },
        this.actorFromRequest(req),
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default FloraFaunaController;
