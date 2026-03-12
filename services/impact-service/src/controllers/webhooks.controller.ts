import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import StripeService from '../services/stripe.service';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

export class WebhooksController {
  constructor(private prisma: PrismaClient) {}

  /**
   * POST /api/stripe/webhooks
   * Main webhook handler that routes to specific event handlers
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        next(errors.badRequest('Missing Stripe signature'));
        return;
      }

      // Construct and verify the event
      const event = StripeService.constructWebhookEvent(req.body as Buffer, signature);

      // Check for duplicate/replay
      const existingEvent = await this.prisma.stripeEvent.findUnique({
        where: { id: event.id }
      });

      if (existingEvent && existingEvent.status === 'processed') {
        logger.info({ eventId: event.id }, 'Webhook already processed - returning 200');
        res.json({ received: true });
        return;
      }

      // Record event as processing
      await this.prisma.stripeEvent.upsert({
        where: { id: event.id },
        update: { status: 'processing' },
        create: {
          id: event.id,
          type: event.type,
          status: 'processing'
        }
      });

      // Route to specific handler
      let result;
      switch (event.type) {
        case 'checkout.session.completed':
          result = await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.paid':
          result = await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          result = await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          result = await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          result = await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          logger.info({ eventType: event.type }, 'Unhandled webhook event type');
          result = { status: 'skipped' };
      }

      // Mark as processed
      await this.prisma.stripeEvent.update({
        where: { id: event.id },
        data: { status: 'processed' }
      });

      logger.info({ eventId: event.id, type: event.type, result }, 'Webhook processed successfully');
      res.json({ received: true });
    } catch (err) {
      // Update event as failed
      const signature = req.headers['stripe-signature'] as string;
      if (signature) {
        try {
          const event = StripeService.constructWebhookEvent(req.body as Buffer, signature);
          const errorMsg = err instanceof Error ? err.message : String(err);
          await this.prisma.stripeEvent.update({
            where: { id: event.id },
            data: { status: 'failed', errorMessage: errorMsg }
          });
        } catch {
          // Ignore failure to update event
        }
      }

      logger.error({ error: err }, 'Webhook processing failed');
      // Always return 200 to prevent Stripe retries
      res.json({ received: true, error: true });
    }
  }

  /**
   * Handle checkout.session.completed event
   * Create subscription record
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<{ status: string }> {
    logger.info({ sessionId: session.id, customerId: session.customer }, 'Processing checkout.session.completed');

    // Extract customer ID and lookup subscription (will be created by invoice.paid)
    // For now, we just log it
    return { status: 'processed' };
  }

  /**
   * Handle invoice.paid event
   * Create subscription record, grant credits, allocate to pools, increment streak
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<{ status: string }> {
    logger.info({ invoiceId: invoice.id, subscriptionId: invoice.subscription }, 'Processing invoice.paid');

    const subscriptionId = invoice.subscription as string;

    // Retrieve full subscription data
    const stripeSubscription = await StripeService.getSubscription(subscriptionId);

    // Extract user info from subscription metadata or customer email
    // For this MVP, we need to store user info in Stripe metadata during checkout
    // For now, use a lookup approach
    const customer = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    if (!customer) {
      logger.error({ subscriptionId }, 'No matching subscription record found');
      throw new Error(`No subscription found for ${subscriptionId}`);
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: customer.id },
      data: {
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        lastPaymentAt: new Date(),
        streakMonths: customer.streakMonths + 1
      }
    });

    // Calculate credits with streak bonus
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: customer.planId }
    });

    if (!plan) {
      throw new Error(`Plan not found: ${customer.planId}`);
    }

    const newStreak = customer.streakMonths + 1;
    const baseCredits = plan.creditGrantMonthly;
    const streakMultiplier = Math.min(1 + Math.floor(newStreak / 3) * 0.1, 1.5);
    const totalCredits = Math.floor(baseCredits * streakMultiplier);
    const bonusCredits = totalCredits - baseCredits;

    // Grant credits via transactions
    await this.prisma.impactCreditTransaction.create({
      data: {
        userId: customer.userId,
        subscriptionId: customer.id,
        transactionType: 'monthly_grant',
        amountCredits: baseCredits,
        description: `Monthly subscription grant - ${plan.name} plan`,
        referenceId: invoice.id
      }
    });

    if (bonusCredits > 0) {
      await this.prisma.impactCreditTransaction.create({
        data: {
          userId: customer.userId,
          subscriptionId: customer.id,
          transactionType: 'streak_bonus',
          amountCredits: bonusCredits,
          description: `Streak bonus (${newStreak} months)`,
          referenceId: invoice.id
        }
      });
    }

    // Allocate to pools
    const activePools = await this.prisma.impactPool.findMany({
      where: { isActive: true }
    });

    if (activePools.length > 0) {
      const invoiceAmount = invoice.amount_paid || 0;
      const allocationCentsPerPool = Math.floor((invoiceAmount * Number(plan.poolAllocationPct)) / activePools.length);

      for (const pool of activePools) {
        if (allocationCentsPerPool > 0) {
          await this.prisma.impactLedgerEntry.create({
            data: {
              poolId: pool.id,
              entryType: 'subscription_credit',
              amountCents: allocationCentsPerPool,
              description: `Allocation from ${customer.username} - ${plan.name} subscription`,
              referenceId: customer.id,
              referenceType: 'subscription',
              createdBy: customer.userId
            }
          });
        }
      }
    }

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: customer.userId,
        actorRole: 'participant',
        action: 'invoice_paid',
        targetType: 'subscription',
        targetId: customer.id,
        after: {
          streakMonths: newStreak,
          creditsAwarded: totalCredits,
          status: stripeSubscription.status
        }
      }
    });

    logger.info(
      { subscriptionId: customer.id, creditsAwarded: totalCredits, streakMonths: newStreak },
      'Invoice.paid processed successfully'
    );

    return { status: 'processed' };
  }

  /**
   * Handle invoice.payment_failed event
   * Set status to past_due, reset streak, log
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<{ status: string }> {
    logger.info({ invoiceId: invoice.id, subscriptionId: invoice.subscription }, 'Processing invoice.payment_failed');

    const subscriptionId = invoice.subscription as string;

    const customer = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    if (!customer) {
      logger.warn({ subscriptionId }, 'No subscription found for payment_failed event');
      return { status: 'skipped' };
    }

    // Update subscription status
    await this.prisma.subscription.update({
      where: { id: customer.id },
      data: {
        status: 'past_due',
        streakMonths: 0
      }
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: customer.userId,
        actorRole: 'participant',
        action: 'payment_failed',
        targetType: 'subscription',
        targetId: customer.id,
        after: {
          status: 'past_due',
          streakReset: true
        }
      }
    });

    logger.info({ subscriptionId: customer.id }, 'Payment failed - subscription past_due');

    return { status: 'processed' };
  }

  /**
   * Handle customer.subscription.updated event
   * Sync status, period dates, cancelAtPeriodEnd
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<{ status: string }> {
    logger.info({ subscriptionId: subscription.id }, 'Processing customer.subscription.updated');

    const customer = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!customer) {
      logger.warn({ subscriptionId: subscription.id }, 'No subscription found for update event');
      return { status: 'skipped' };
    }

    // Update subscription record
    await this.prisma.subscription.update({
      where: { id: customer.id },
      data: {
        status: subscription.status as any,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    logger.info({ subscriptionId: customer.id, status: subscription.status }, 'Subscription updated');

    return { status: 'processed' };
  }

  /**
   * Handle customer.subscription.deleted event
   * Set status to canceled, log
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<{ status: string }> {
    logger.info({ subscriptionId: subscription.id }, 'Processing customer.subscription.deleted');

    const customer = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id }
    });

    if (!customer) {
      logger.warn({ subscriptionId: subscription.id }, 'No subscription found for delete event');
      return { status: 'skipped' };
    }

    // Update subscription record
    await this.prisma.subscription.update({
      where: { id: customer.id },
      data: {
        status: 'canceled'
      }
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: customer.userId,
        actorRole: 'participant',
        action: 'subscription_canceled',
        targetType: 'subscription',
        targetId: customer.id,
        after: {
          status: 'canceled'
        }
      }
    });

    logger.info({ subscriptionId: customer.id }, 'Subscription canceled');

    return { status: 'processed' };
  }
}

export default WebhooksController;
