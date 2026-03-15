import logger from '../../utils/logger';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';

interface StartupMessage {
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
}

function pushMessage(messages: StartupMessage[], level: StartupMessage['level'], code: string, message: string) {
  messages.push({ level, code, message });
}

export function validateFalakStartup(config: FalakRuntimeConfig): StartupMessage[] {
  const messages: StartupMessage[] = [];

  if (config.isProduction && config.trustXActorIdRequested) {
    pushMessage(
      messages,
      'error',
      'FALAK_TRUST_X_ACTOR_ID_FORBIDDEN',
      'FALAK_TRUST_X_ACTOR_ID must remain false in production.'
    );
  }

  if (config.isStagingLike && config.trustXActorIdRequested) {
    pushMessage(
      messages,
      'warn',
      'FALAK_STAGING_HEADER_TRUST',
      'Hosted staging should not rely on x-actor-id. Prefer verified bearer-auth actor resolution.'
    );
  }

  if (config.isProduction && !config.requireVerifiedActor && config.routeGuardMode !== 'disabled') {
    pushMessage(
      messages,
      'error',
      'FALAK_VERIFIED_ACTOR_REQUIRED',
      'Production Falak routes must require verified actors unless routes are disabled.'
    );
  }

  if (config.isStagingLike && !config.requireVerifiedActor && config.routeGuardMode !== 'disabled') {
    pushMessage(
      messages,
      'warn',
      'FALAK_STAGING_VERIFIED_ACTOR_DISABLED',
      'Hosted staging should keep FALAK_REQUIRE_VERIFIED_ACTOR=true.'
    );
  }

  if (config.routeGuardMode === 'tenant_allowlist' && config.allowedTenantSlugs.length === 0) {
    pushMessage(
      messages,
      'warn',
      'FALAK_EMPTY_TENANT_ALLOWLIST',
      'Falak tenant_allowlist mode is enabled without any allowed tenants. All guarded Falak traffic will be denied.'
    );
  }

  if (config.routeGuardMode === 'admin_only') {
    if (config.allowedTenantSlugs.length === 0) {
      pushMessage(
        messages,
        'warn',
        'FALAK_EMPTY_TENANT_ALLOWLIST',
        'Falak admin_only mode is enabled without any allowed tenants. All guarded Falak traffic will be denied.'
      );
    }
    if (config.allowedActorExternalAuthIds.length === 0) {
      pushMessage(
        messages,
        'warn',
        'FALAK_EMPTY_ACTOR_ALLOWLIST',
        'Falak admin_only mode is enabled without any allowed actors. All guarded Falak traffic will be denied.'
      );
    }
  }

  if (
    config.mapRouteGuardModeRequested !== 'inherit' &&
    config.mapRouteGuardMode !== config.routeGuardMode
  ) {
    pushMessage(
      messages,
      config.isProduction ? 'warn' : 'info',
      'FALAK_MAP_ROUTE_GUARD_DIVERGES',
      `Falak-backed education maps are using "${config.mapRouteGuardMode}" while core Falak routes use "${config.routeGuardMode}".`
    );
  }

  if (config.mapRouteGuardMode === 'tenant_allowlist' && config.allowedTenantSlugs.length === 0) {
    pushMessage(
      messages,
      'warn',
      'FALAK_MAP_EMPTY_TENANT_ALLOWLIST',
      'Falak-backed education maps are in tenant_allowlist mode without any allowed tenants. All guarded map traffic will be denied.'
    );
  }

  if (config.mapRouteGuardMode === 'admin_only') {
    if (config.allowedTenantSlugs.length === 0) {
      pushMessage(
        messages,
        'warn',
        'FALAK_MAP_EMPTY_TENANT_ALLOWLIST',
        'Falak-backed education maps are in admin_only mode without any allowed tenants. All guarded map traffic will be denied.'
      );
    }
    if (config.allowedActorExternalAuthIds.length === 0) {
      pushMessage(
        messages,
        'warn',
        'FALAK_MAP_EMPTY_ACTOR_ALLOWLIST',
        'Falak-backed education maps are in admin_only mode without any allowed actors. All guarded map traffic will be denied.'
      );
    }
  }

  if (config.isProduction && config.routeGuardMode === 'enabled') {
    pushMessage(
      messages,
      'warn',
      'FALAK_PRODUCTION_ENABLED',
      'Falak routes are fully enabled in production. Confirm this is an explicit rollout decision.'
    );
  }

  if (config.isProduction && config.routeGuardMode !== 'disabled') {
    pushMessage(
      messages,
      'warn',
      'FALAK_PRODUCTION_EXPOSED',
      `Falak route guard mode is "${config.routeGuardMode}" in production.`
    );
  }

  if (config.isProduction && config.mapRouteGuardMode === 'enabled') {
    pushMessage(
      messages,
      'warn',
      'FALAK_MAP_PRODUCTION_ENABLED',
      'Falak-backed education maps are fully enabled in production. Confirm this is an explicit rollout decision.'
    );
  }

  if (config.isProduction && config.routeGuardMode === 'disabled' && config.mapRouteGuardMode !== 'disabled') {
    pushMessage(
      messages,
      'warn',
      'FALAK_MAPS_EXPOSED_WITH_CORE_DISABLED',
      'Core Falak routes are dark-launched while Falak-backed education maps remain reachable.'
    );
  }

  if (config.darkLaunch) {
    pushMessage(
      messages,
      'info',
      'FALAK_DARK_LAUNCH',
      'Falak is in dark-launch mode. Guarded routes are disabled and no Falak mutations can be triggered over HTTP.'
    );
  }

  if (config.mapDarkLaunch) {
    pushMessage(
      messages,
      'info',
      'FALAK_MAP_DARK_LAUNCH',
      'Falak-backed education maps are in dark-launch mode and guarded map routes are disabled.'
    );
  }

  return messages;
}

export function assertSafeFalakStartup(config: FalakRuntimeConfig): void {
  const messages = validateFalakStartup(config);

  for (const entry of messages) {
    const payload = {
      category: 'falak.startup_guard',
      code: entry.code,
      routeGuardMode: config.routeGuardMode,
      mapRouteGuardMode: config.mapRouteGuardMode,
      requireVerifiedActor: config.requireVerifiedActor,
      trustXActorId: config.trustXActorId,
      isProduction: config.isProduction,
      darkLaunch: config.darkLaunch,
      mapDarkLaunch: config.mapDarkLaunch
    };

    if (entry.level === 'info') {
      logger.info(payload, entry.message);
      continue;
    }

    if (entry.level === 'warn') {
      logger.warn(payload, entry.message);
      continue;
    }

    logger.error(payload, entry.message);
  }

  const fatal = messages.find((entry) => entry.level === 'error');
  if (fatal) {
    throw new Error(fatal.message);
  }
}
