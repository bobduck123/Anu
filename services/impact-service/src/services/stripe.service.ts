import Stripe from 'stripe';
import config from '../config';
import logger from '../utils/logger';

function getStripeClient(): Stripe {
  if (!config.hasStripe) {
    throw new Error('Stripe is not configured for this deployment');
  }

  return new Stripe(config.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  });
}

export class StripeService {
  /**
   * Create a Stripe checkout session for membership subscription
   */
  static async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl
      });

      logger.info({ sessionId: session.id, customerId }, 'Checkout session created');
      return session.url || '';
    } catch (err) {
      logger.error({ error: err, priceId, customerId }, 'Failed to create checkout session');
      throw err;
    }
  }

  /**
   * Create a Stripe billing portal session for subscription management
   */
  static async createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      logger.info({ sessionId: session.id, customerId }, 'Billing portal session created');
      return session.url;
    } catch (err) {
      logger.error({ error: err, customerId }, 'Failed to create billing portal session');
      throw err;
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediate,
        ...(immediate && { cancel_at: Math.floor(Date.now() / 1000) })
      });

      logger.info({ subscriptionId, immediate }, 'Subscription canceled');
    } catch (err) {
      logger.error({ error: err, subscriptionId }, 'Failed to cancel subscription');
      throw err;
    }
  }

  /**
   * Retrieve subscription details from Stripe
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (err) {
      logger.error({ error: err, subscriptionId }, 'Failed to retrieve subscription');
      throw err;
    }
  }

  /**
   * Retrieve invoice details from Stripe
   */
  static async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const stripe = getStripeClient();
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (err) {
      logger.error({ error: err, invoiceId }, 'Failed to retrieve invoice');
      throw err;
    }
  }

  /**
   * Construct and verify webhook event signature
   */
  static constructWebhookEvent(body: Buffer, signature: string): Stripe.Event {
    try {
      const stripe = getStripeClient();
      const event = stripe.webhooks.constructEvent(body, signature, config.STRIPE_WEBHOOK_SECRET);
      logger.debug({ eventId: event.id, type: event.type }, 'Webhook event verified');
      return event;
    } catch (err) {
      logger.error({ error: err }, 'Failed to verify webhook signature');
      throw err;
    }
  }
}

export default StripeService;
