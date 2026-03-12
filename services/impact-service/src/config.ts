import dotenv from 'dotenv';

dotenv.config();

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

export const config = {
  // Server
  PORT: parseInt(optional('PORT', '5003'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),

  // Database
  DATABASE_URL: required('DATABASE_URL'),
  TEST_DATABASE_URL: optional('TEST_DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/impact_test'),

  // JWT
  JWT_SECRET_KEY: required('JWT_SECRET_KEY'),

  // Stripe
  STRIPE_SECRET_KEY: required('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: required('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PUBLISHABLE_KEY: required('STRIPE_PUBLISHABLE_KEY'),

  // Logging
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),

  // Derived
  isDevelopment: optional('NODE_ENV', 'development') === 'development',
  isTest: optional('NODE_ENV', 'development') === 'test'
};

// Validate required vars on startup
try {
  required('DATABASE_URL');
  required('JWT_SECRET_KEY');
  required('STRIPE_SECRET_KEY');
  required('STRIPE_WEBHOOK_SECRET');
  required('STRIPE_PUBLISHABLE_KEY');
  console.log('[Config] All required environment variables loaded');
} catch (err) {
  console.error('[Config] Startup validation failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}

export default config;
