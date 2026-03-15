import { loadFalakLocalEnv, runCommand } from './common.mjs';

loadFalakLocalEnv();
runCommand('npx', ['prisma', 'generate']);
