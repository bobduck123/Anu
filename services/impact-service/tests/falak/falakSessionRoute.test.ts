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
  FALAK_MAP_ROUTE_GUARD_MODE: 'admin_only',
  FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta',
  FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: 'anu-admin',
  FALAK_TRUST_X_ACTOR_ID: 'false',
  FALAK_REQUIRE_VERIFIED_ACTOR: 'true',
};

function signFalakToken(externalAuthId: string): string {
  return jwt.sign(
    {
      sub: {
        username: externalAuthId,
        role: 'operator',
      },
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

async function buildSessionHttpFixture() {
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

  await registerFalakRoutes(
    app,
    {} as unknown as FalakService,
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

async function withSessionHttpFixture<T>(
  overrides: GuardEnv,
  execute: (fixture: Awaited<ReturnType<typeof buildSessionHttpFixture>>) => Promise<T>,
): Promise<T> {
  return withGuardEnv(overrides, async () => {
    const fixture = await buildSessionHttpFixture();
    try {
      return await execute(fixture);
    } finally {
      await fixture.app.close();
    }
  });
}

describe('Falak session route', () => {
  test('reports a verified hosted actor when the bearer token resolves to an allowlisted admin actor', async () => {
    await withSessionHttpFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/falak/session',
        headers: {
          'x-tenant-id': adminContext.tenantId,
          authorization: `Bearer ${signFalakToken('anu-admin')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'verified',
        tenant: {
          id: adminContext.tenantId,
          slug: 'anu-beta',
        },
        actor: {
          external_auth_id: 'anu-admin',
          display_name: 'ANU Admin',
        },
        actor_resolution: {
          source: 'verified_auth',
          verified: true,
          authenticated_identity: 'anu-admin',
        },
        map_access: {
          mode: 'admin_only',
          allowed: true,
          code: null,
        },
      });
    });
  });

  test('reports a blocked actor instead of throwing when the token is valid but not allowlisted', async () => {
    await withSessionHttpFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/falak/session',
        headers: {
          'x-tenant-id': adminContext.tenantId,
          authorization: `Bearer ${signFalakToken('anu-curator')}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'blocked',
        actor: {
          external_auth_id: 'anu-curator',
        },
        actor_resolution: {
          source: 'verified_auth',
          verified: true,
          authenticated_identity: 'anu-curator',
        },
        map_access: {
          mode: 'admin_only',
          allowed: false,
          code: 'ACTOR_NOT_ALLOWED',
        },
      });
    });
  });
});
