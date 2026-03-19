import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const envPath = path.join(projectRoot, '.env.falak-sandbox.local');

if (fs.existsSync(envPath)) {
  const envContents = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of envContents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} else {
  console.warn(`[Falak Sandbox] ${envPath} not found. Falling back to existing environment variables.`);
}

process.env.NEXT_PUBLIC_FALAK_MODE = process.env.NEXT_PUBLIC_FALAK_MODE || 'map_sandbox';
process.env.NEXT_PUBLIC_IMPACT_API_BASE = process.env.NEXT_PUBLIC_IMPACT_API_BASE || 'http://localhost:5003';
process.env.NEXT_PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_IMPACT_API_BASE;
process.env.CORE_API_ORIGIN = process.env.CORE_API_ORIGIN || process.env.NEXT_PUBLIC_API_BASE;
process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID =
  process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID || '11111111-1111-4111-8111-111111111111';
process.env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR =
  process.env.NEXT_PUBLIC_FALAK_SANDBOX_DEFAULT_ACTOR || 'anu-admin';

const child = spawn(
  process.platform === 'win32' ? 'cmd.exe' : 'npx',
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npx.cmd', 'next', 'dev', '--webpack']
    : ['next', 'dev', '--webpack'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
