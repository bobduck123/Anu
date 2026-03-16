import dotenv from 'dotenv';
import { resolveManaraFeedMode } from './manaraFeed';

dotenv.config();

function isPlaceholder(value: string | undefined): boolean {
  const raw = (value || '').trim();
  if (!raw) {
    return true;
  }

  const normalized = raw.toLowerCase();
  return (
    normalized.startsWith('todo') ||
    normalized.includes('replace_me') ||
    normalized.includes('required_') ||
    raw.includes('<')
  );
}

function required(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
  return value;
}

function optional(envVar: string, defaultValue: string): string {
  return process.env[envVar] || defaultValue;
}

const allowPlaceholderInfra = optional('BETA_ALLOW_PLACEHOLDER_INFRA', 'false') === 'true';
const nodeEnv = optional('NODE_ENV', 'development');
const hasDatabase = !isPlaceholder(process.env.DATABASE_URL);
const hasRedis = !isPlaceholder(process.env.REDIS_URL);
const hasStripe =
  !isPlaceholder(process.env.STRIPE_SECRET_KEY) &&
  !isPlaceholder(process.env.STRIPE_WEBHOOK_SECRET) &&
  !isPlaceholder(process.env.STRIPE_PUBLISHABLE_KEY);
const requireStripeInfra = optional('REQUIRE_STRIPE_INFRA', 'false') === 'true';
const manaraFeedMode = resolveManaraFeedMode(process.env.MANARA_FEED_MODE, nodeEnv);

export const config = {
  // Server
  PORT: parseInt(optional('PORT', '5003'), 10),
  NODE_ENV: nodeEnv,
  allowPlaceholderInfra,
  hasDatabase,
  hasRedis,
  hasStripe,
  requireStripeInfra,
  betaPlaceholderDatabase: allowPlaceholderInfra && !hasDatabase,
  betaPlaceholderStripe: allowPlaceholderInfra && !hasStripe,
  manaraFeedMode,

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  TEST_DATABASE_URL: optional('TEST_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/impact_test'),
  REDIS_URL: process.env.REDIS_URL || '',

  // JWT
  JWT_SECRET_KEY: required('JWT_SECRET_KEY'),
  PUBLIC_JWT_SECRET_KEY: process.env.PUBLIC_JWT_SECRET_KEY || '',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',

  // Logging
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Derived
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test'
};

// Validate required vars on startup
try {
  required('JWT_SECRET_KEY');
  if (!hasDatabase && !allowPlaceholderInfra) {
    required('DATABASE_URL');
  }
  if (requireStripeInfra && !hasStripe && !allowPlaceholderInfra) {
    required('STRIPE_SECRET_KEY');
    required('STRIPE_WEBHOOK_SECRET');
    required('STRIPE_PUBLISHABLE_KEY');
  }
  console.log('[Config] Startup configuration loaded', {
    allowPlaceholderInfra,
    hasDatabase,
    hasRedis,
    hasStripe,
    requireStripeInfra,
    manaraFeedMode,
  });
} catch (err) {
  console.error('[Config] Startup validation failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export default config;
