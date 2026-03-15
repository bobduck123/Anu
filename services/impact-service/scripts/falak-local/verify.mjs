import { runCommand } from './common.mjs';

runCommand('node', ['scripts/falak-local/docker-compose.mjs', 'up']);
runCommand('node', ['scripts/falak-local/wait-for-db.mjs']);
runCommand('node', ['scripts/falak-local/prisma-generate.mjs']);
runCommand('node', ['scripts/falak-local/migrate.mjs']);
runCommand('node', ['scripts/falak-local/seed.mjs']);
runCommand('node', ['scripts/falak-local/integration-tests.mjs']);
