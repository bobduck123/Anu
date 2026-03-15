import { FalakRouteGuardMode } from '../domain/types';

const allowedRouteGuardModes = new Set<FalakRouteGuardMode>(['disabled', 'admin_only', 'tenant_allowlist', 'enabled']);
const allowedMapRouteGuardModes = new Set<FalakMapRouteGuardMode>(['inherit', 'disabled', 'admin_only', 'tenant_allowlist', 'enabled']);

export type FalakMapRouteGuardMode = FalakRouteGuardMode | 'inherit';

function normalizeValue(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function parseCsv(value: string | undefined): string[] {
  return normalizeValue(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseRouteGuardMode(value: string | undefined): FalakRouteGuardMode {
  const normalized = normalizeValue(value);
  return allowedRouteGuardModes.has(normalized as FalakRouteGuardMode)
    ? (normalized as FalakRouteGuardMode)
    : 'disabled';
}

function parseMapRouteGuardMode(value: string | undefined): FalakMapRouteGuardMode {
  const normalized = normalizeValue(value);
  return allowedMapRouteGuardModes.has(normalized as FalakMapRouteGuardMode)
    ? (normalized as FalakMapRouteGuardMode)
    : 'inherit';
}

export interface FalakRuntimeConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  isStagingLike: boolean;
  routeGuardMode: FalakRouteGuardMode;
  mapRouteGuardModeRequested: FalakMapRouteGuardMode;
  mapRouteGuardMode: FalakRouteGuardMode;
  allowedTenantSlugs: string[];
  allowedActorExternalAuthIds: string[];
  trustXActorIdRequested: boolean;
  trustXActorId: boolean;
  requireVerifiedActor: boolean;
  darkLaunch: boolean;
  mapDarkLaunch: boolean;
}

export function readFalakRuntimeConfig(env: NodeJS.ProcessEnv = process.env): FalakRuntimeConfig {
  const nodeEnv = normalizeValue(env.NODE_ENV || 'development') || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';
  const isTest = nodeEnv === 'test';
  const environmentName = normalizeValue(env.FALAK_STAGING_ENVIRONMENT_NAME);
  const isStagingLike =
    environmentName.includes('staging') ||
    normalizeValue(env.STAGING_BASE_URL).includes('staging') ||
    normalizeValue(env.FALAK_STAGING_HOST_FRAGMENT).length > 0;
  const routeGuardMode = parseRouteGuardMode(env.FALAK_ROUTE_GUARD_MODE);
  const mapRouteGuardModeRequested = parseMapRouteGuardMode(env.FALAK_MAP_ROUTE_GUARD_MODE);
  const mapRouteGuardMode = mapRouteGuardModeRequested === 'inherit'
    ? routeGuardMode
    : mapRouteGuardModeRequested;
  const trustXActorIdRequested = env.FALAK_TRUST_X_ACTOR_ID === 'true';
  const requireVerifiedActor = env.FALAK_REQUIRE_VERIFIED_ACTOR === undefined
    ? true
    : env.FALAK_REQUIRE_VERIFIED_ACTOR === 'true';

  return {
    nodeEnv,
    isProduction,
    isDevelopment,
    isTest,
    isStagingLike,
    routeGuardMode,
    mapRouteGuardModeRequested,
    mapRouteGuardMode,
    allowedTenantSlugs: parseCsv(env.FALAK_ALLOWED_TENANT_SLUGS),
    allowedActorExternalAuthIds: parseCsv(env.FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS),
    trustXActorIdRequested,
    trustXActorId: trustXActorIdRequested && !isProduction,
    requireVerifiedActor,
    darkLaunch: routeGuardMode === 'disabled',
    mapDarkLaunch: mapRouteGuardMode === 'disabled'
  };
}
