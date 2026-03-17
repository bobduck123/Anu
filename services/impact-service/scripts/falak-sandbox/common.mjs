import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(scriptDirectory, '..', '..');
export const falakEnvFilePath = path.join(projectRoot, '.env.falak-sandbox');
export const falakEnvExamplePath = path.join(projectRoot, '.env.falak-sandbox.example');
export const composeFilePath = path.join(projectRoot, 'docker-compose.falak-sandbox.yml');
export const composeArgsPrefix = ['compose', '-f', composeFilePath];

const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
const productionLikePattern = /\bprod(uction)?\b/i;

function resolveExecutable(command) {
  if (process.platform === 'win32' && !command.endsWith('.cmd')) {
    if (command === 'npx' || command === 'npm') {
      return `${command}.cmd`;
    }
  }

  return command;
}

export function ensureFalakSandboxEnvFile() {
  if (!fs.existsSync(falakEnvFilePath)) {
    throw new Error(
      `Missing ${falakEnvFilePath}. Copy ${falakEnvExamplePath} to .env.falak-sandbox before running Falak sandbox commands.`
    );
  }
}

export function loadFalakSandboxEnv() {
  ensureFalakSandboxEnvFile();
  dotenv.config({
    path: falakEnvFilePath,
    override: true
  });
  process.env.FALAK_MODE = process.env.FALAK_MODE || 'map_sandbox';
  process.env.FALAK_SEED_MAPS = process.env.FALAK_SEED_MAPS || 'true';
}

export function assertSafeLocalDatabaseTarget(
  commandName,
  envVarNames = ['DATABASE_URL'],
  { requireResetPermission = false } = {}
) {
  const urls = envVarNames.map((envVarName) => [envVarName, process.env[envVarName]]);

  if (urls.every(([, rawUrl]) => !rawUrl)) {
    throw new Error(
      `[Falak Guard] ${commandName} was blocked to protect the live app database. No database URL was configured.`
    );
  }

  for (const [envVarName, rawUrl] of urls) {
    if (!rawUrl) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(
        `[Falak Guard] ${commandName} was blocked to protect the live app database. ${envVarName} is not a valid PostgreSQL URL.`
      );
    }

    if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
      throw new Error(
        `[Falak Guard] ${commandName} was blocked to protect the live app database. ${envVarName} must use a PostgreSQL connection string.`
      );
    }

    const hostname = parsed.hostname.toLowerCase();
    const databaseName = parsed.pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';

    if (!databaseName) {
      throw new Error(
        `[Falak Guard] ${commandName} was blocked to protect the live app database. ${envVarName} is missing a database name.`
      );
    }

    if (!localHostnames.has(hostname)) {
      throw new Error(
        `[Falak Guard] ${commandName} was blocked to protect the live app database. ${envVarName} points at "${hostname}", not localhost.`
      );
    }

    if (
      productionLikePattern.test(rawUrl) ||
      productionLikePattern.test(hostname) ||
      productionLikePattern.test(databaseName)
    ) {
      throw new Error(
        `[Falak Guard] ${commandName} was blocked to protect the live app database. ${envVarName} looks production-like ("${databaseName}" on "${hostname}").`
      );
    }
  }

  if (requireResetPermission && process.env.ALLOW_DB_RESET_FOR_TESTS !== 'true') {
    throw new Error(
      `[Falak Guard] ${commandName} was blocked to protect the live app database. ALLOW_DB_RESET_FOR_TESTS must be true for destructive local sandbox commands.`
    );
  }
}

export function runCommand(command, args, options = {}) {
  const executable = resolveExecutable(command);

  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', executable, ...args], {
          cwd: projectRoot,
          stdio: 'inherit',
          env: process.env,
          shell: false,
          ...options
        })
      : spawnSync(executable, args, {
          cwd: projectRoot,
          stdio: 'inherit',
          env: process.env,
          shell: false,
          ...options
        });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${process.platform === 'win32' ? 'cmd.exe /d /s /c ' : ''}${executable} ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`
    );
  }
}

export function runDockerCompose(args) {
  runCommand('docker', [...composeArgsPrefix, ...args]);
}
