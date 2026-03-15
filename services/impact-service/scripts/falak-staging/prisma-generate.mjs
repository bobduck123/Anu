import { assertSafeHostedStagingTarget, loadFalakStagingEnv, prismaSchemaPath, runCommand } from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging Prisma generate');
runCommand('npx', ['prisma', 'generate', '--schema', prismaSchemaPath]);
