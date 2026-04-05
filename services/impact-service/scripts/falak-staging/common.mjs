import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = path.resolve(scriptDirectory, '..', '..');
export const stagingEnvFilePath = path.join(projectRoot, '.env.falak-staging');
export const stagingEnvExamplePath = path.join(projectRoot, '.env.falak-staging.example');
export const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');

const productionLikePattern = /\b(prod|production|live)\b/i;
const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);

function resolveExecutable(command) {
  if (process.platform === 'win32' && !command.endsWith('.cmd')) {
    if (command === 'npx' || command === 'npm') {
      return `${command}.cmd`;
    }
  }

  return command;
}

export function loadFalakStagingEnv() {
  if (fs.existsSync(stagingEnvFilePath)) {
    dotenv.config({
      path: stagingEnvFilePath,
      override: true
    });
  }
}

export function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function parseUrl(value, message) {
  try {
    return new URL(value);
  } catch {
    throw new Error(message);
  }
}

export function normalizeBaseUrl(name, fallback = '') {
  const rawValue = (process.env[name] ?? fallback).trim();
  if (!rawValue) {
    return null;
  }

  const parsed = parseUrl(rawValue, `${name} must be a valid URL.`);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }

  return rawValue.replace(/\/+$/, '');
}

export function assertSafeHostedStagingTarget(commandName, options = {}) {
  const baseUrl = required('STAGING_BASE_URL');
  const parsedBaseUrl = parseUrl(baseUrl, `[Falak Staging Guard] ${commandName} requires STAGING_BASE_URL to be a valid URL.`);

  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw new Error(`[Falak Staging Guard] ${commandName} requires STAGING_BASE_URL to use http or https.`);
  }

  if (localHostnames.has(parsedBaseUrl.hostname.toLowerCase())) {
    throw new Error(`[Falak Staging Guard] ${commandName} was blocked because STAGING_BASE_URL points to localhost. Use the hosted staging URL.`);
  }

  const expectedHostFragment = (process.env.FALAK_STAGING_HOST_FRAGMENT ?? '').trim().toLowerCase();
  if (expectedHostFragment && !parsedBaseUrl.hostname.toLowerCase().includes(expectedHostFragment)) {
    throw new Error(
      `[Falak Staging Guard] ${commandName} was blocked because STAGING_BASE_URL host "${parsedBaseUrl.hostname}" does not include "${expectedHostFragment}".`
    );
  }

  const productionBaseUrl = (process.env.PRODUCTION_BASE_URL ?? '').trim();
  if (productionBaseUrl) {
    const parsedProductionUrl = parseUrl(
      productionBaseUrl,
      `[Falak Staging Guard] PRODUCTION_BASE_URL must be a valid URL when provided.`
    );
    if (parsedProductionUrl.origin === parsedBaseUrl.origin) {
      throw new Error(`[Falak Staging Guard] ${commandName} was blocked because STAGING_BASE_URL matches PRODUCTION_BASE_URL.`);
    }
  }

  const databaseUrl = required('DATABASE_URL');
  const parsedDatabaseUrl = parseUrl(
    databaseUrl,
    `[Falak Staging Guard] ${commandName} requires DATABASE_URL to be a valid PostgreSQL URL.`
  );
  const databaseName = parsedDatabaseUrl.pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';
  const expectedDatabaseName = (required('FALAK_STAGING_DATABASE_EXPECTED_NAME')).trim().toLowerCase();
  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      `[Falak Staging Guard] ${commandName} was blocked because DATABASE_URL points to "${databaseName}", not "${expectedDatabaseName}".`
    );
  }

  if (
    productionLikePattern.test(databaseUrl) ||
    productionLikePattern.test(parsedDatabaseUrl.hostname) ||
    productionLikePattern.test(databaseName)
  ) {
    throw new Error(
      `[Falak Staging Guard] ${commandName} was blocked because DATABASE_URL looks production-like ("${databaseName}" on "${parsedDatabaseUrl.hostname}").`
    );
  }

  if (options.requireMutationAllowance && process.env.FALAK_STAGING_ALLOW_MUTATIONS !== 'true') {
    throw new Error(
      `[Falak Staging Guard] ${commandName} requires FALAK_STAGING_ALLOW_MUTATIONS=true before any mutating staging command can run.`
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

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function stagePass(label, detail) {
  console.log(`[Falak Staging] PASS ${label}${detail ? `: ${detail}` : ''}`);
}

export function stageInfo(label, detail) {
  console.log(`[Falak Staging] ${label}${detail ? `: ${detail}` : ''}`);
}

function resolvePrismaConnectionString() {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  if (databaseUrl) {
    return databaseUrl;
  }

  const directUrl = (process.env.DIRECT_URL ?? '').trim();
  if (directUrl) {
    return directUrl;
  }

  throw new Error('Missing required environment variable: DATABASE_URL (or DIRECT_URL)');
}

export async function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: resolvePrismaConnectionString(),
  });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  return prisma;
}

export async function closePrisma(prisma) {
  await prisma.$disconnect();
}

export async function resolveSeedFixture(prisma) {
  const tenant = await prisma.falakTenant.findUnique({
    where: {
      slug: process.env.FALAK_SMOKE_TENANT_SLUG ?? 'anu-beta'
    }
  });
  assert(tenant, 'Seed tenant was not found. Run the staging seed first.');

  const [admin, governor] = await Promise.all([
    prisma.falakActor.findUnique({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: process.env.FALAK_SMOKE_ADMIN_EXTERNAL_AUTH_ID ?? 'anu-admin'
        }
      }
    }),
    prisma.falakActor.findUnique({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: process.env.FALAK_SMOKE_GOVERNOR_EXTERNAL_AUTH_ID ?? 'anu-governor'
        }
      }
    })
  ]);
  assert(admin, 'Seed admin actor was not found. Run the staging seed first.');
  assert(governor, 'Seed governor actor was not found. Run the staging seed first.');
  assert(admin.externalAuthId, 'Seed admin actor is missing externalAuthId.');
  assert(governor.externalAuthId, 'Seed governor actor is missing externalAuthId.');

  const [venue, community, campaign, pool, restrictedStory] = await Promise.all([
    prisma.falakNode.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: process.env.FALAK_SMOKE_VENUE_SLUG ?? 'anu-school-of-music'
        }
      }
    }),
    prisma.falakNode.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: process.env.FALAK_SMOKE_COMMUNITY_SLUG ?? 'ngunnawal-arts-circle'
        }
      }
    }),
    prisma.falakNode.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: process.env.FALAK_SMOKE_CAMPAIGN_SLUG ?? 'first-nations-stage-fund'
        }
      }
    }),
    prisma.falakNode.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: process.env.FALAK_SMOKE_POOL_SLUG ?? 'weaving-futures-pool'
        }
      }
    }),
    prisma.falakNode.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: process.env.FALAK_SMOKE_RESTRICTED_STORY_SLUG ?? 'songlines-of-lake-burley'
        }
      }
    })
  ]);

  assert(venue, 'Seed venue node was not found.');
  assert(community, 'Seed community node was not found.');
  assert(campaign, 'Seed campaign node was not found.');
  assert(pool, 'Seed liquidity pool node was not found.');
  assert(restrictedStory, 'Seed restricted story node was not found.');

  return {
    tenant,
    admin,
    governor,
    nodes: {
      venue,
      community,
      campaign,
      pool,
      restrictedStory
    }
  };
}

export async function requestJson(method, routePath, options = {}) {
  const baseUrl = required('STAGING_BASE_URL').replace(/\/+$/, '');
  return requestAt(baseUrl, method, routePath, options);
}

export async function requestAt(baseUrl, method, routePath, options = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (options.expectedStatus !== undefined && response.status !== options.expectedStatus) {
    throw new Error(
      `Expected ${method} ${routePath} to return ${options.expectedStatus}, got ${response.status}: ${text}`
    );
  }

  return {
    status: response.status,
    json: parsed,
    text,
    contentType,
    headers: response.headers
  };
}

export function actorHeaders(tenantId, actorId) {
  return {
    'x-tenant-id': tenantId,
    ...(actorId ? { 'x-actor-id': actorId } : {})
  };
}

export function tenantHeaders(tenantId) {
  return {
    'x-tenant-id': tenantId
  };
}

export function verifiedActorHeaders(tenantId, externalAuthId) {
  return {
    'x-tenant-id': tenantId,
    authorization: `Bearer ${jwt.sign(
      {
        sub: {
          username: externalAuthId,
          role: 'operator'
        }
      },
      required('JWT_SECRET_KEY')
    )}`
  };
}
