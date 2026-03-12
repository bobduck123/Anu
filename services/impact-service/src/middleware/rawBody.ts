import express from 'express';

/**
 * Middleware to capture raw body for Stripe webhook signature verification.
 * MUST be applied BEFORE express.json() middleware.
 *
 * Usage:
 *   app.post('/api/stripe/webhooks', rawBodyMiddleware('application/json'), stripeWebhookHandler)
 */
export const rawBodyMiddleware = (type: string) => {
  return express.raw({ type });
};
