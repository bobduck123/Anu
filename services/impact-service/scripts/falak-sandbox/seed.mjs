import { assertSafeLocalDatabaseTarget, loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
process.env.FALAK_MODE = 'map_sandbox';
process.env.FALAK_SEED_MAPS = 'true';

assertSafeLocalDatabaseTarget('Falak sandbox seed', ['DATABASE_URL']);
runCommand('npx', ['ts-node', 'prisma/seed.ts']);
