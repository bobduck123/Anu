const LOCAL_DATABASE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const PRODUCTION_LIKE_PATTERN = /\bprod(uction)?\b/i;

export interface LocalVerificationGuardOptions {
  commandName: string;
  envVarNames?: string[];
  requireResetPermission?: boolean;
}

interface ParsedDatabaseTarget {
  envVarName: string;
  rawUrl: string;
  hostname: string;
  databaseName: string;
}

function blocked(commandName: string, detail: string): never {
  throw new Error(
    `[Falak Guard] ${commandName} was blocked to protect the live app database. ${detail}`
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

function assertSafeDatabaseTarget(commandName: string, target: ParsedDatabaseTarget): void {
  if (!LOCAL_DATABASE_HOSTNAMES.has(target.hostname)) {
    blocked(
      commandName,
      `${target.envVarName} points at host "${target.hostname}". Only localhost/127.0.0.1 is allowed for local Falak verification.`
    );
  }

  if (
    PRODUCTION_LIKE_PATTERN.test(target.rawUrl) ||
    PRODUCTION_LIKE_PATTERN.test(target.hostname) ||
    PRODUCTION_LIKE_PATTERN.test(target.databaseName)
  ) {
    blocked(
      commandName,
      `${target.envVarName} looks production-like ("${target.databaseName}" on "${target.hostname}").`
    );
  }
}

export function assertSafeLocalVerificationEnvironment(options: LocalVerificationGuardOptions): ParsedDatabaseTarget[] {
  const envVarNames = options.envVarNames ?? ['DATABASE_URL'];
  const targets = envVarNames
    .map((envVarName) => [envVarName, process.env[envVarName]] as const)
    .filter(([, value]) => Boolean(value))
    .map(([envVarName, value]) => parseDatabaseTarget(options.commandName, envVarName, value));

  if (targets.length === 0) {
    blocked(options.commandName, 'No database URL was provided.');
  }

  for (const target of targets) {
    assertSafeDatabaseTarget(options.commandName, target);
  }

  if (options.requireResetPermission && process.env.ALLOW_DB_RESET_FOR_TESTS !== 'true') {
    blocked(
      options.commandName,
      'ALLOW_DB_RESET_FOR_TESTS must be set to true for destructive local verification commands.'
    );
  }

  return targets;
}
