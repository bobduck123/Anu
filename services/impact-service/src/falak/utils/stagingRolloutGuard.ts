const PRODUCTION_LIKE_PATTERN = /\b(prod|production|live)\b/i;

export interface HostedStagingGuardOptions {
  commandName: string;
  envVarNames?: string[];
}

interface ParsedDatabaseTarget {
  envVarName: string;
  rawUrl: string;
  hostname: string;
  databaseName: string;
}

function blocked(commandName: string, detail: string): never {
  throw new Error(
    `[Falak Guard] ${commandName} was blocked to protect non-local databases. ${detail}`
  );
}

function parseDatabaseTarget(commandName: string, envVarName: string, rawUrl: string | undefined): ParsedDatabaseTarget {
  if (!rawUrl) {
    blocked(commandName, `Missing ${envVarName}.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    blocked(commandName, `${envVarName} is not a valid PostgreSQL URL.`);
  }

  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    blocked(commandName, `${envVarName} must use a PostgreSQL connection string.`);
  }

  const databaseName = parsed.pathname.replace(/^\/+/, '').split('/')[0] ?? '';
  if (!databaseName) {
    blocked(commandName, `${envVarName} is missing a database name.`);
  }

  return {
    envVarName,
    rawUrl,
    hostname: parsed.hostname.toLowerCase(),
    databaseName: databaseName.toLowerCase()
  };
}

export function assertSafeHostedStagingEnvironment(options: HostedStagingGuardOptions): ParsedDatabaseTarget[] {
  if (process.env.FALAK_STAGING_ALLOW_MUTATIONS !== 'true') {
    blocked(
      options.commandName,
      'FALAK_STAGING_ALLOW_MUTATIONS must be set to true for hosted staging rollout commands.'
    );
  }

  const expectedDatabaseName = (process.env.FALAK_STAGING_DATABASE_EXPECTED_NAME ?? '').trim().toLowerCase();
  if (!expectedDatabaseName) {
    blocked(
      options.commandName,
      'FALAK_STAGING_DATABASE_EXPECTED_NAME must be set to the fresh staging database name.'
    );
  }

  const environmentName = (process.env.FALAK_STAGING_ENVIRONMENT_NAME ?? '').trim().toLowerCase();
  if (!environmentName.includes('staging')) {
    blocked(
      options.commandName,
      'FALAK_STAGING_ENVIRONMENT_NAME must contain "staging".'
    );
  }

  const targets = (options.envVarNames ?? ['DATABASE_URL'])
    .map((envVarName) => parseDatabaseTarget(options.commandName, envVarName, process.env[envVarName]));

  for (const target of targets) {
    if (target.databaseName !== expectedDatabaseName) {
      blocked(
        options.commandName,
        `${target.envVarName} points at "${target.databaseName}", but FALAK_STAGING_DATABASE_EXPECTED_NAME is "${expectedDatabaseName}".`
      );
    }

    if (
      PRODUCTION_LIKE_PATTERN.test(target.rawUrl) ||
      PRODUCTION_LIKE_PATTERN.test(target.hostname) ||
      PRODUCTION_LIKE_PATTERN.test(target.databaseName)
    ) {
      blocked(
        options.commandName,
        `${target.envVarName} looks production-like ("${target.databaseName}" on "${target.hostname}").`
      );
    }
  }

  return targets;
}
