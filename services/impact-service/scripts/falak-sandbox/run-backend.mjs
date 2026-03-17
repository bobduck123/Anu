import { loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
runCommand('npx', ['ts-node-dev', '--respawn', '--transpile-only', 'src/server.ts']);
