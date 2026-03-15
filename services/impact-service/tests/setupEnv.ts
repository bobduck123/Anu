import dotenv from 'dotenv';
import { assertSafeLocalVerificationEnvironment } from '../src/falak/utils/localVerificationGuard';

if (process.env.FALAK_ENV_FILE) {
  dotenv.config({
    path: process.env.FALAK_ENV_FILE,
    override: false
  });
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'falak-test-secret';
process.env.BETA_ALLOW_PLACEHOLDER_INFRA = 'true';

if (process.env.FALAK_INTEGRATION_LOCAL === 'true') {
  assertSafeLocalVerificationEnvironment({
    commandName: 'Falak integration test bootstrap',
    envVarNames: ['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL'],
    requireResetPermission: true
  });
}
