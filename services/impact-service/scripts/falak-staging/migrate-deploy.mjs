import { assertSafeHostedStagingTarget, loadFalakStagingEnv, prismaSchemaPath, runCommand } from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging migrate deploy', { requireMutationAllowance: true });
runCommand('npx', ['prisma', 'migrate', 'deploy', '--schema', prismaSchemaPath]);
