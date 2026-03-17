import { assertSafeLocalDatabaseTarget, loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
assertSafeLocalDatabaseTarget('Falak sandbox reset', ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL'], {
  requireResetPermission: true
});
runCommand('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-generate', '--skip-seed']);
