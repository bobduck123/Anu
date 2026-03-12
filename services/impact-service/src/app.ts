import express, { Express } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';
import { rawBodyMiddleware } from './middleware/rawBody';

function parseCorsOrigins(rawValue?: string): string[] {
  if (!rawValue?.trim()) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8090'];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCorsAllowedSuffixes(rawValue?: string): string[] {
  if (!rawValue?.trim()) {
    return process.env.VERCEL ? ['.vercel.app'] : [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const createApp = (prisma: PrismaClient): Express => {
  const app = express();

  // ============================================================================
  // STRIPE WEBHOOK: Raw body middleware BEFORE json parser
  // ============================================================================
  app.post('/api/stripe/webhooks', rawBodyMiddleware('application/json'));

  // ============================================================================
  // JSON PARSER (after raw body middleware)
  // ============================================================================
  app.use(express.json({ limit: '10mb' }));

  // ============================================================================
  // CORS
  // ============================================================================
  const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  const allowedOriginSuffixes = parseCorsAllowedSuffixes(process.env.CORS_ALLOWED_ORIGIN_SUFFIXES);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        try {
          const hostname = new URL(origin).hostname.toLowerCase();
          if (allowedOriginSuffixes.some((suffix) => {
            const normalized = suffix.startsWith('.') ? suffix.toLowerCase() : `.${suffix.toLowerCase()}`;
            const bareSuffix = normalized.slice(1);
            return hostname === bareSuffix || hostname.endsWith(normalized);
          })) {
            callback(null, true);
            return;
          }
        } catch {
          // Ignore parse failures and reject below.
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true
    })
  );

  // ============================================================================
  // PRISMA MIDDLEWARE: Append-only enforcement
  // ============================================================================
  prisma.$use(async (params, next) => {
    const appendOnlyModels = [
      'ImpactLedgerEntry',
      'AuditLog',
      'ImpactCreditTransaction',
      'LedgerEntry',
      'DomainEvent',
      'AuditEvent',
      'NutrientSnapshot',
      'GeologicalFormSnapshot',
      'ModerationAction',
      'RevenueEvent',
      'AttributionSplit'
    ];

    if (appendOnlyModels.includes(params.model ?? '')) {
      const forbiddenActions = ['update', 'updateMany', 'delete', 'deleteMany'];
      if (forbiddenActions.includes(params.action)) {
        throw new Error(`${params.action} is forbidden on ${params.model} (append-only table)`);
      }
    }

    return next(params);
  });

  // ============================================================================
  // REQUEST LOGGING
  // ============================================================================
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        },
        'HTTP request'
      );
    });
    next();
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'impact-service' });
  });

  // ============================================================================
  // ROUTES
  // ============================================================================
  // Mounted by server.ts

  return app;
};

export default createApp;
