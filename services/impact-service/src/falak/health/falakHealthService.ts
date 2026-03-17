import { PrismaClient } from '@prisma/client';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';

export interface FalakHealthReport {
  status: 'ok' | 'degraded' | 'not_ready';
  checks: {
    database: 'ok' | 'error' | 'skipped';
    postgis: 'ok' | 'error' | 'skipped';
    prisma: 'ok' | 'error' | 'skipped';
    falakSchema: 'ok' | 'error' | 'skipped';
    migrations: 'ok' | 'error' | 'skipped';
  };
  runtime: {
    mode: FalakRuntimeConfig['mode'];
    sandbox: boolean;
    routeGuardMode: FalakRuntimeConfig['routeGuardMode'];
    darkLaunch: boolean;
    mapRouteGuardMode: FalakRuntimeConfig['mapRouteGuardMode'];
    mapDarkLaunch: boolean;
    requireVerifiedActor: boolean;
  };
  details: {
    databaseName: string | null;
    migrationFailures: number | null;
    postgisVersion: string | null;
  };
}

export class FalakHealthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly runtimeConfig: FalakRuntimeConfig
  ) {}

  async health(): Promise<FalakHealthReport> {
    return this.check({ readiness: false });
  }

  async readiness(): Promise<FalakHealthReport> {
    return this.check({ readiness: true });
  }

  private async check(options: { readiness: boolean }): Promise<FalakHealthReport> {
    try {
      const [databaseInfo] = await this.prisma.$queryRawUnsafe<Array<{
        database_name: string | null;
        postgis_version: string | null;
      }>>(`
        SELECT
          current_database() AS database_name,
          (
            SELECT extversion
            FROM pg_extension
            WHERE extname = 'postgis'
          ) AS postgis_version
      `);

      const [schemaInfo] = await this.prisma.$queryRawUnsafe<Array<{
        falak_schema: string | null;
        falak_migrations_table: string | null;
        public_migrations_table: string | null;
      }>>(`
        SELECT
          to_regnamespace('falak')::text AS falak_schema,
          to_regclass('falak._prisma_migrations')::text AS falak_migrations_table,
          to_regclass('public._prisma_migrations')::text AS public_migrations_table
      `);

      const migrationsTable =
        schemaInfo?.falak_migrations_table
          ? 'falak._prisma_migrations'
          : schemaInfo?.public_migrations_table
            ? 'public._prisma_migrations'
            : null;

      let migrationFailures = 0;
      if (migrationsTable) {
        const [migrationInfo] = await this.prisma.$queryRawUnsafe<Array<{
          failed_count: bigint | number;
        }>>(
          `
          SELECT COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed_count
          FROM ${migrationsTable}
        `
        );
        migrationFailures = Number(migrationInfo?.failed_count ?? 0);
      }

      const falakSchemaOk = schemaInfo?.falak_schema === 'falak';
      const postgisOk = Boolean(databaseInfo?.postgis_version);
      const migrationsOk = Boolean(migrationsTable) && migrationFailures === 0;
      const healthy = falakSchemaOk && postgisOk;
      const ready = healthy && migrationsOk;

      return {
        status: options.readiness ? (ready ? 'ok' : 'not_ready') : (healthy ? 'ok' : 'degraded'),
        checks: {
          database: 'ok',
          postgis: postgisOk ? 'ok' : 'error',
          prisma: 'ok',
          falakSchema: falakSchemaOk ? 'ok' : 'error',
          migrations: migrationsOk ? 'ok' : 'error'
        },
        runtime: {
          mode: this.runtimeConfig.mode,
          sandbox: this.runtimeConfig.isSandbox,
          routeGuardMode: this.runtimeConfig.routeGuardMode,
          darkLaunch: this.runtimeConfig.darkLaunch,
          mapRouteGuardMode: this.runtimeConfig.mapRouteGuardMode,
          mapDarkLaunch: this.runtimeConfig.mapDarkLaunch,
          requireVerifiedActor: this.runtimeConfig.requireVerifiedActor
        },
        details: {
          databaseName: databaseInfo?.database_name ?? null,
          migrationFailures,
          postgisVersion: databaseInfo?.postgis_version ?? null
        }
      };
    } catch {
      return {
        status: options.readiness ? 'not_ready' : 'degraded',
        checks: {
          database: 'error',
          postgis: 'skipped',
          prisma: 'error',
          falakSchema: 'skipped',
          migrations: 'skipped'
        },
        runtime: {
          mode: this.runtimeConfig.mode,
          sandbox: this.runtimeConfig.isSandbox,
          routeGuardMode: this.runtimeConfig.routeGuardMode,
          darkLaunch: this.runtimeConfig.darkLaunch,
          mapRouteGuardMode: this.runtimeConfig.mapRouteGuardMode,
          mapDarkLaunch: this.runtimeConfig.mapDarkLaunch,
          requireVerifiedActor: this.runtimeConfig.requireVerifiedActor
        },
        details: {
          databaseName: null,
          migrationFailures: null,
          postgisVersion: null
        }
      };
    }
  }
}
