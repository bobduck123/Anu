import { assertSafeLocalDatabaseTarget, falakEnvFilePath, loadFalakLocalEnv, runCommand } from './common.mjs';

loadFalakLocalEnv();
process.env.FALAK_LOCAL_VERIFICATION = 'true';
process.env.FALAK_INTEGRATION_LOCAL = 'true';
process.env.FALAK_ENV_FILE = falakEnvFilePath;

assertSafeLocalDatabaseTarget('Falak local integration tests', ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL'], {
  requireResetPermission: true
});

runCommand('npx', ['jest', '--runInBand', 'tests/falak/falakDatabase.integration.test.ts']);
