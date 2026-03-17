import { assertSafeHostedStagingTarget, loadFalakStagingEnv, runCommand } from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging seed', { requireMutationAllowance: true });

if (!process.env.DIRECT_URL) {
  throw new Error('Falak staging seed requires DIRECT_URL so Prisma can use a direct PostgreSQL connection.');
}

// The seed path uses PrismaClient transactions, which are more reliable on the
// direct connection than through the hosted transaction pooler.
process.env.DATABASE_URL = process.env.DIRECT_URL;
runCommand('npm', ['run', 'prisma:seed:staging']);
