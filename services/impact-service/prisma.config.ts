import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

type PrismaEnv = {
  DATABASE_URL: string;
  DIRECT_URL?: string;
  SHADOW_DATABASE_URL?: string;
};

const FALLBACK_DATABASE_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

const migrationUrl = (process.env.DIRECT_URL ?? '').trim()
  ? env<PrismaEnv>('DIRECT_URL')
  : (process.env.DATABASE_URL ?? '').trim()
    ? env<PrismaEnv>('DATABASE_URL')
    : FALLBACK_DATABASE_URL;

const shadowDatabaseUrl = (process.env.SHADOW_DATABASE_URL ?? '').trim()
  ? env<PrismaEnv>('SHADOW_DATABASE_URL')
  : undefined;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: migrationUrl,
    shadowDatabaseUrl,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
});
