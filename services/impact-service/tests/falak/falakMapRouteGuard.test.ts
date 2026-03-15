import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { createSeededFalakRepository } from '../../src/falak/testing/inMemoryFalakRepository';
import { readFalakRuntimeConfig } from '../../src/falak/config/falakRuntimeConfig';
import { registerMapRoutes } from '../../src/maps/routes/registerMapRoutes';
import { AppError } from '../../src/utils/errors';
import { FalakMapService } from '../../src/maps/services/falakMapService';

const guardEnvKeys = [
  'FALAK_ROUTE_GUARD_MODE',
  'FALAK_MAP_ROUTE_GUARD_MODE',
  'FALAK_ALLOWED_TENANT_SLUGS',
  'FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS',
  'FALAK_TRUST_X_ACTOR_ID',
  'FALAK_REQUIRE_VERIFIED_ACTOR'
] as const;

type GuardEnvKey = (typeof guardEnvKeys)[number];
type GuardEnv = Partial<Record<GuardEnvKey, string>>;

const defaultGuardEnv: Record<GuardEnvKey, string> = {
  FALAK_ROUTE_GUARD_MODE: 'disabled',
  FALAK_MAP_ROUTE_GUARD_MODE: 'inherit',
  FALAK_ALLOWED_TENANT_SLUGS: '',
  FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: '',
  FALAK_TRUST_X_ACTOR_ID: 'false',
  FALAK_REQUIRE_VERIFIED_ACTOR: 'true'
};

function signFalakToken(externalAuthId: string): string {
  return jwt.sign(
    {
      sub: {
        username: externalAuthId,
        role: 'operator'
      }
    },
    process.env.JWT_SECRET_KEY ?? 'falak-test-secret'
  );
}

function bearerHeaders(tenantId: string, externalAuthId: string): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    authorization: `Bearer ${signFalakToken(externalAuthId)}`
  };
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

async function buildMapHttpFixture() {
  const fixture = createSeededFalakRepository();
  const runtimeConfig = readFalakRuntimeConfig(process.env);
  const app = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'FALAK_ERROR',
          message: error.message,
          trace_id: request.falakContext?.traceId
        }
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        trace_id: request.falakContext?.traceId
      }
    });
  });

  const mapService = {
    listMaps: async () => [],
    resolveOrCompile: async (tenantId: string, body: { topic: string; mode: string }) => ({
      map: {
        definition: {
          id: 'map-1',
          tenantId,
          topicKey: body.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          title: body.topic,
          archetype: 'theory',
          entityType: 'topic',
          status: 'draft',
          sizeFormula: 'default',
          version: 1,
          currentSnapshotId: null,
          confidence: {
            coverage: 0.5,
            taxonomy: 0.5,
            positions: 0.5,
            dedupe: 0.5,
            relationships: 0.5
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        categories: [],
        axes: [],
        nodes: [],
        edges: [],
        aliases: [],
        snapshots: [],
        jobs: []
      },
      jobCreated: true
    }),
    getMap: async () => null,
    updateMapStatus: async () => null,
    updateNode: async () => null,
    updateEdge: async () => null,
    rerunLayout: async () => null,
    getCategoryView: async () => null,
    listEntities: async () => null
  } as unknown as FalakMapService;

  await registerMapRoutes(app, mapService, fixture.repository, runtimeConfig);

  return {
    app,
    runtimeConfig,
    adminContext: fixture.adminContext,
    otherTenantId: fixture.otherTenantId
  };
}

async function withMapHttpFixture<T>(overrides: GuardEnv, execute: (fixture: Awaited<ReturnType<typeof buildMapHttpFixture>>) => Promise<T>): Promise<T> {
  return withGuardEnv(overrides, async () => {
    const fixture = await buildMapHttpFixture();
    try {
      return await execute(fixture);
    } finally {
      await fixture.app.close();
    }
  });
}

describe('Falak-backed education map route guard', () => {
  test('inherits the disabled Falak core dark launch by default', async () => {
    await withMapHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled'
    }, async ({ app, runtimeConfig }) => {
      expect(runtimeConfig.mapRouteGuardMode).toBe('disabled');

      const response = await app.inject({
        method: 'GET',
        url: '/v1/education/maps'
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: {
          code: 'FALAK_MAPS_DISABLED'
        }
      });
    });
  });

  test('can explicitly keep maps reachable while Falak core routes stay dark-launched', async () => {
    await withMapHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled',
      FALAK_MAP_ROUTE_GUARD_MODE: 'enabled'
    }, async ({ app, adminContext, runtimeConfig }) => {
      expect(runtimeConfig.mapRouteGuardMode).toBe('enabled');

      const response = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  test('tenant_allowlist blocks disallowed tenants on map routes', async () => {
    await withMapHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled',
      FALAK_MAP_ROUTE_GUARD_MODE: 'tenant_allowlist',
      FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta'
    }, async ({ app, adminContext, otherTenantId }) => {
      const allowed = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });
      const denied = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: {
          'x-tenant-id': otherTenantId
        }
      });

      expect(allowed.statusCode).toBe(200);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({
        error: {
          code: 'TENANT_NOT_ALLOWED'
        }
      });
    });
  });

  test('admin_only requires an allowlisted verified actor even on public map routes', async () => {
    await withMapHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled',
      FALAK_MAP_ROUTE_GUARD_MODE: 'admin_only',
      FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta',
      FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: 'anu-admin'
    }, async ({ app, adminContext }) => {
      const anonymous = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });
      const allowed = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });
      const denied = await app.inject({
        method: 'GET',
        url: '/v1/education/maps',
        headers: bearerHeaders(adminContext.tenantId, 'anu-governor')
      });

      expect(anonymous.statusCode).toBe(401);
      expect(anonymous.json()).toMatchObject({
        error: {
          code: 'VERIFIED_ACTOR_REQUIRED'
        }
      });
      expect(allowed.statusCode).toBe(200);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({
        error: {
          code: 'ACTOR_NOT_ALLOWED'
        }
      });
    });
  });
});
