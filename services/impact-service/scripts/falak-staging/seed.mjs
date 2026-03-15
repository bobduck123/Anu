import { assertSafeHostedStagingTarget, loadFalakStagingEnv, runCommand } from './common.mjs';

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak staging seed', { requireMutationAllowance: true });
runCommand('npm', ['run', 'prisma:seed:staging']);
