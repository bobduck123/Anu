import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const FALLBACK_DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

function isPresent(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function firstPresent(envVarNames: readonly string[]): string {
  for (const envVarName of envVarNames) {
    const candidate = process.env[envVarName];
    if (isPresent(candidate)) {
      return candidate;
    }
  }
  return '';
}

const migrationUrl =
  firstPresent([
    'DIRECT_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL',
  ]) || FALLBACK_DATABASE_URL;

const shadowDatabaseUrl = firstPresent([
  'SHADOW_DATABASE_URL',
  'DIRECT_URL',
  'POSTGRES_URL_NON_POOLING',
]);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl: shadowDatabaseUrl || undefined,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
});
