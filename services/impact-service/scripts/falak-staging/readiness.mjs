import {
  assert,
  assertSafeHostedStagingTarget,
  closePrisma,
  createPrismaClient,
  loadFalakStagingEnv,
  requestJson,
  stagePass
} from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging readiness');

const prisma = await createPrismaClient();

try {
  const [databaseInfo] = await prisma.$queryRawUnsafe(`
    SELECT
      current_database() AS database_name,
      (
        SELECT extversion
        FROM pg_extension
        WHERE extname = 'postgis'
      ) AS postgis_version
  `);
  assert(databaseInfo?.database_name, 'Database connection check failed.');
  assert(databaseInfo?.postgis_version, 'PostGIS extension check failed.');
  stagePass('Stage A.1', `DB connected to ${databaseInfo.database_name}`);
  stagePass('Stage A.2', 'PostGIS is available');

  const [migrationsInfo] = await prisma.$queryRawUnsafe(`
    SELECT
      to_regclass('falak._prisma_migrations')::text AS falak_migrations_table,
      to_regclass('public._prisma_migrations')::text AS public_migrations_table
  `);
  const migrationsTable =
    migrationsInfo?.falak_migrations_table === 'falak._prisma_migrations'
      ? 'falak._prisma_migrations'
      : migrationsInfo?.public_migrations_table === 'public._prisma_migrations'
        ? 'public._prisma_migrations'
        : null;
  assert(migrationsTable, 'Prisma migrations table is missing.');
  stagePass('Stage A.3', `Prisma migrations table exists at ${migrationsTable}`);

  const tenant = await prisma.falakTenant.findUnique({
    where: {
      slug: process.env.FALAK_SMOKE_TENANT_SLUG ?? 'anu-beta'
    }
  });
  assert(tenant, 'Seed tenant not found. Hosted staging seed has not been applied.');
  stagePass('Stage A.4', 'Seed tenant exists');

  const health = await requestJson('GET', '/health', {
    expectedStatus: 200
  });
  const nonFalakHealthAcceptable =
    health.json?.status === 'ok' ||
    (
      health.json?.status === 'degraded' &&
      health.json?.betaPlaceholderInfra === false &&
      health.json?.dependencies?.database === 'configured' &&
      health.json?.dependencies?.stripe === 'todo'
    );
  assert(nonFalakHealthAcceptable, 'Health endpoint did not report an acceptable staging status.');
  stagePass('Stage A.5', `Non-Falak health endpoint is ${health.json?.status}`);

  const falakHealth = await requestJson('GET', '/v1/falak/health', {
    expectedStatus: 200
  });
  assert(falakHealth.json?.checks?.database === 'ok', 'Falak health database check is not ok.');
  assert(falakHealth.json?.checks?.postgis === 'ok', 'Falak health PostGIS check is not ok.');
  assert(falakHealth.json?.runtime?.map_route_guard_mode, 'Falak health runtime payload is missing map_route_guard_mode.');
  stagePass('Stage A.6', 'Falak health endpoint is healthy');

  const falakReadiness = await requestJson('GET', '/v1/falak/readiness', {
    expectedStatus: 200
  });
  assert(falakReadiness.json?.status === 'ok', 'Falak readiness endpoint did not report ok.');
  assert(falakReadiness.json?.checks?.migrations === 'ok', 'Falak readiness migration check is not ok.');
  assert(falakReadiness.json?.runtime?.map_route_guard_mode, 'Falak readiness runtime payload is missing map_route_guard_mode.');
  stagePass('Stage A.7', 'Falak readiness endpoint is ready');
} finally {
  await closePrisma(prisma);
}
