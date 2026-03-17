import { loadFalakSandboxEnv, runCommand } from './common.mjs';

loadFalakSandboxEnv();
runCommand('npx', ['prisma', 'generate']);
