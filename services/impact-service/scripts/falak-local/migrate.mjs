import { assertSafeLocalDatabaseTarget, loadFalakLocalEnv, runCommand } from './common.mjs';

loadFalakLocalEnv();
assertSafeLocalDatabaseTarget('Falak local migrate', ['DATABASE_URL', 'DIRECT_URL'], {
  requireResetPermission: false
});

// Deterministic replay is safer for verification than migrate dev because
// migrate dev is a schema-iteration workflow and uses a shadow database.
runCommand('npx', ['prisma', 'migrate', 'deploy']);
