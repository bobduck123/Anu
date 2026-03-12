import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import StripeService from '../services/stripe.service';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

export class MembershipsController {
  constructor(private prisma: PrismaClient) {}

  /**
   * GET /api/memberships/plans
   * Get all active membership plans
   */
  async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await this.prisma.membershipPlan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          amountCents: true,
          creditGrantMonthly: true,
          poolAllocationPct: true,
          stripePriceId: true
        }
      });

      res.json(plans);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/memberships/status
   * Get current user's subscription status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(errors.unauthorized());
      }

      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: req.user.username },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              amountCents: true,
              creditGrantMonthly: true
            }
          }
        }
      });

      if (!subscription) {
        res.json({
          isSubscribed: false,
          subscription: null
        });
        return;
      }

      res.json({
        isSubscribed: subscription.status === 'active',
        subscription: {
          id: subscription.id,
          planId: subscription.planId,
          planName: subscription.plan.name,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          streakMonths: subscription.streakMonths,
          lastPaymentAt: subscription.lastPaymentAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/memberships/subscribe
   * Create a checkout session for membership subscription
   */
  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const { planId } = req.body;

      if (!planId) {
        next(errors.badRequest('planId is required'));
        return;
      }

      const plan = await this.prisma.membershipPlan.findUnique({
        where: { id: planId }
      });

      if (!plan || !plan.isActive) {
        next(errors.notFound('Plan not found'));
        return;
      }

      // Check if user already has an active subscription
      const existingSubscription = await this.prisma.subscription.findUnique({
        where: { userId: req.user.username }
      });

      if (existingSubscription && existingSubscription.status === 'active') {
        next(errors.conflict('User already has an active subscription'));
        return;
      }

      // For now, create a temporary customer ID (Stripe handles this in webhook)
      // In production, you'd create Stripe customer first
      const customerId = `cus_${req.user.username}_${Date.now()}`;

      const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership?success=true`;
      const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership?canceled=true`;

      const checkoutUrl = await StripeService.createCheckoutSession(
        customerId,
        plan.stripePriceId,
        successUrl,
        cancelUrl
      );

      res.json({
        checkoutUrl
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/memberships/portal
   * Create a billing portal session for subscription management
   */
  async createPortalSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: req.user.username }
      });

      if (!subscription) {
        next(errors.notFound('No subscription found'));
        return;
      }

      const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/membership`;

      const portalUrl = await StripeService.createBillingPortalSession(
        subscription.stripeCustomerId,
        returnUrl
      );

      res.json({
        portalUrl
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/memberships/cancel
   * Cancel user's subscription at period end
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(errors.unauthorized());
        return;
      }

      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: req.user.username }
      });

      if (!subscription) {
        next(errors.notFound('No subscription found'));
        return;
      }

      if (subscription.status !== 'active') {
        next(errors.conflict('Subscription is not active'));
        return;
      }

      // Cancel at period end via Stripe
      await StripeService.cancelSubscription(subscription.stripeSubscriptionId, false);

      // Update local record
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true }
      });

      res.json({ message: 'Subscription will be canceled at period end' });
    } catch (err) {
      next(err);
    }
  }
}

export default MembershipsController;
