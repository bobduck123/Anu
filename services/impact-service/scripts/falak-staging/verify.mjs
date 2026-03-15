import { runCommand } from './common.mjs';

runCommand('node', ['scripts/falak-staging/readiness.mjs']);
runCommand('node', ['scripts/falak-staging/smoke.mjs']);
