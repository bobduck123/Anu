import { spawnSync } from 'child_process';

const maxAttempts = 24;
const delayMs = 5_000;

function inspectHealth() {
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', 'falak-postgis'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const status = inspectHealth();
  if (status === 'healthy') {
    console.log('[Falak Local] falak-postgis is healthy.');
    process.exit(0);
  }

  console.log(`[Falak Local] Waiting for falak-postgis to become healthy (${attempt}/${maxAttempts})...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

throw new Error('falak-postgis did not become healthy in time.');
