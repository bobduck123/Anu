import { assertSafeLocalDatabaseTarget, loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
assertSafeLocalDatabaseTarget('Falak sandbox migrate', ['DATABASE_URL', 'DIRECT_URL']);
runCommand('npx', ['prisma', 'migrate', 'deploy']);
