import { assertSafeLocalDatabaseTarget, loadFalakLocalEnv, runCommand } from './common.mjs';

loadFalakLocalEnv();
process.env.FALAK_LOCAL_VERIFICATION = 'true';

assertSafeLocalDatabaseTarget('Falak local seed', ['DATABASE_URL']);
runCommand('npx', ['ts-node', 'prisma/seed.ts']);
