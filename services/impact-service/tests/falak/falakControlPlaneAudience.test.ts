import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { createSeededFalakRepository } from '../../src/falak/testing/inMemoryFalakRepository';
import { readFalakRuntimeConfig } from '../../src/falak/config/falakRuntimeConfig';
import { registerFalakRoutes } from '../../src/falak/routes/registerFalakRoutes';
import { AppError } from '../../src/utils/errors';
import { FalakService } from '../../src/falak/services/falakService';
import { ContributionWorkflowService } from '../../src/falak/services/contributionWorkflowService';
import { AllocationWorkflowService } from '../../src/falak/services/allocationWorkflowService';
import { EventWorkflowService } from '../../src/falak/services/eventWorkflowService';
import { ImpactQueryService } from '../../src/falak/services/impactQueryService';

const guardEnvKeys = [
  'FALAK_ROUTE_GUARD_MODE',
  'FALAK_MAP_ROUTE_GUARD_MODE',
  'FALAK_ALLOWED_TENANT_SLUGS',
  'FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS',
  'FALAK_TRUST_X_ACTOR_ID',
  'FALAK_REQUIRE_VERIFIED_ACTOR',
] as const;

type GuardEnvKey = (typeof guardEnvKeys)[number];
type GuardEnv = Partial<Record<GuardEnvKey, string>>;

const defaultGuardEnv: Record<GuardEnvKey, string> = {
  FALAK_ROUTE_GUARD_MODE: 'enabled',
  FALAK_MAP_ROUTE_GUARD_MODE: 'inherit',
  FALAK_ALLOWED_TENANT_SLUGS: '',
  FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: '',
  FALAK_TRUST_X_ACTOR_ID: 'false',
  FALAK_REQUIRE_VERIFIED_ACTOR: 'true',
};

function signPublicToken(externalAuthId: string): string {
  return jwt.sign(
    {
      sub: externalAuthId,
      role: 'operator',
      aud: 'public',
      token_use: 'public',
    },
    process.env.PUBLIC_JWT_SECRET_KEY ?? 'falak-public-test-secret',
  );
}

function signControlToken(externalAuthId: string): string {
  return jwt.sign(
    {
      sub: {
        username: externalAuthId,
        role: 'operator',
      },
      aud: 'control',
      token_use: 'control',
    },
    process.env.JWT_SECRET_KEY ?? 'falak-test-secret',
  );
}

async function withGuardEnv<T>(overrides: GuardEnv, execute: () => Promise<T>): Promise<T> {
  const previous = new Map<GuardEnvKey, string | undefined>();
  for (const key of guardEnvKeys) {
    previous.set(key, process.env[key]);
    process.env[key] = overrides[key] ?? defaultGuardEnv[key];
  }

  try {
    return await execute();
  } finally {
    for (const key of guardEnvKeys) {
      const previousValue = previous.get(key);
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

async function buildFixture() {
  const fixture = createSeededFalakRepository();
  const runtimeConfig = readFalakRuntimeConfig(process.env);
  const app = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'FALAK_ERROR',
          message: error.message,
          trace_id: request.falakContext?.traceId,
        },
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        trace_id: request.falakContext?.traceId,
      },
    });
  });

  const service = {
    listEvents: async () => [],
  } as unknown as FalakService;

  await registerFalakRoutes(
    app,
    service,
    fixture.repository,
    {
      hasDatabase: true,
      hasRedis: false,
      runtimeConfig,
    },
    {
      eventWorkflowService: {} as unknown as EventWorkflowService,
      contributionWorkflowService: {} as unknown as ContributionWorkflowService,
      allocationWorkflowService: {} as unknown as AllocationWorkflowService,
      impactQueryService: {} as unknown as ImpactQueryService,
    },
  );

  return {
    app,
    adminContext: fixture.adminContext,
  };
}

async function withAudienceFixture<T>(
  overrides: GuardEnv,
  execute: (fixture: Awaited<ReturnType<typeof buildFixture>>) => Promise<T>,
): Promise<T> {
  return withGuardEnv(overrides, async () => {
    const fixture = await buildFixture();
    try {
      return await execute(fixture);
    } finally {
      await fixture.app.close();
    }
  });
}

describe('Falak privileged control audience enforcement', () => {
  test('rejects public-audience tokens on privileged Falak routes', async () => {
    await withAudienceFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: {
          'x-tenant-id': adminContext.tenantId,
          authorization: `Bearer ${signPublicToken('anu-admin')}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: {
          code: 'CONTROL_AUDIENCE_REQUIRED',
        },
      });
    });
  });

  test('accepts control-audience tokens on privileged Falak routes', async () => {
    await withAudienceFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: {
          'x-tenant-id': adminContext.tenantId,
          authorization: `Bearer ${signControlToken('anu-admin')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  test('keeps non-privileged Falak session behavior intact for public-audience tokens', async () => {
    await withAudienceFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/falak/session',
        headers: {
          'x-tenant-id': adminContext.tenantId,
          authorization: `Bearer ${signPublicToken('anu-admin')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'verified',
        actor_resolution: {
          source: 'verified_auth',
          token_audience: 'public',
          authenticated_identity: 'anu-admin',
        },
        map_access: {
          allowed: true,
        },
      });
    });
  });
});
