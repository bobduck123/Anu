import { PrismaClient } from '@prisma/client';
import { readFalakRuntimeConfig } from '../../src/falak/config/falakRuntimeConfig';
import { FalakHealthService } from '../../src/falak/health/falakHealthService';

function createRuntimeConfig() {
  return readFalakRuntimeConfig({
    NODE_ENV: 'production',
    FALAK_ROUTE_GUARD_MODE: 'disabled',
    FALAK_MAP_ROUTE_GUARD_MODE: 'disabled',
    FALAK_REQUIRE_VERIFIED_ACTOR: 'true'
  });
}

describe('FalakHealthService', () => {
  test('reports healthy when the extension, schema, and migrations are present', async () => {
    const queryRawUnsafe = jest.fn()
      .mockResolvedValueOnce([{
        database_name: 'postgres',
        postgis_version: '3.4.2'
      }])
      .mockResolvedValueOnce([{
        falak_schema: 'falak',
        falak_migrations_table: null,
        public_migrations_table: 'public._prisma_migrations'
      }])
      .mockResolvedValueOnce([{
        failed_count: BigInt(0)
      }]);

    const prisma = {
      $queryRawUnsafe: queryRawUnsafe
    } as unknown as PrismaClient;

    const report = await new FalakHealthService(prisma, createRuntimeConfig()).health();

    expect(queryRawUnsafe.mock.calls[0][0]).toContain("FROM pg_extension");
    expect(report).toMatchObject({
      status: 'ok',
      runtime: {
        mode: 'default',
        sandbox: false,
      },
      checks: {
        database: 'ok',
        postgis: 'ok',
        prisma: 'ok',
        falakSchema: 'ok',
        migrations: 'ok'
      },
      details: {
        databaseName: 'postgres',
        migrationFailures: 0,
        postgisVersion: '3.4.2'
      }
    });
  });

  test('degrades cleanly when the database probe throws', async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('connect failed'))
    } as unknown as PrismaClient;

    const report = await new FalakHealthService(prisma, createRuntimeConfig()).readiness();

    expect(report).toMatchObject({
      status: 'not_ready',
      runtime: {
        mode: 'default',
        sandbox: false,
      },
      checks: {
        database: 'error',
        postgis: 'skipped',
        prisma: 'error',
        falakSchema: 'skipped',
        migrations: 'skipped'
      },
      details: {
        databaseName: null,
        migrationFailures: null,
        postgisVersion: null
      }
    });
  });
});
