import { runCommand } from './common.mjs';

runCommand('node', ['scripts/falak-sandbox/docker-compose.mjs', 'up']);
runCommand('node', ['scripts/falak-sandbox/wait-for-db.mjs']);
runCommand('node', ['scripts/falak-sandbox/prisma-generate.mjs']);
runCommand('node', ['scripts/falak-sandbox/migrate.mjs']);
runCommand('node', ['scripts/falak-sandbox/seed.mjs']);
runCommand('node', ['scripts/falak-sandbox/integration-tests.mjs']);
