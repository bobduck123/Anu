import { assertSafeLocalDatabaseTarget, falakEnvFilePath, loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
process.env.FALAK_SANDBOX_LOCAL = 'true';
process.env.FALAK_MAP_SANDBOX_LOCAL = 'true';
process.env.FALAK_ENV_FILE = falakEnvFilePath;

assertSafeLocalDatabaseTarget('Falak map sandbox database tests', ['DATABASE_URL', 'DIRECT_URL'], {
  requireResetPermission: false
});

runCommand('npx', ['jest', '--runInBand', 'tests/maps/falakMapSandbox.database.test.ts']);
