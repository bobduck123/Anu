import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';
import { FalakActorResolutionSource, FalakGuardedRouteAccess, ResolvedActor } from '../domain/types';

export interface FalakRouteAccessInput {
  access: FalakGuardedRouteAccess;
  tenantSlug: string;
  actor: ResolvedActor | null;
  actorResolution: {
    source: FalakActorResolutionSource;
    isVerified: boolean;
  };
}

export interface FalakRouteAccessDecision {
  allowed: boolean;
  statusCode?: number;
  code?: 'FALAK_DISABLED' | 'FALAK_FORBIDDEN' | 'VERIFIED_ACTOR_REQUIRED' | 'TENANT_NOT_ALLOWED' | 'ACTOR_NOT_ALLOWED';
  message?: string;
}

function normalizeListValue(value: string): string {
  return value.trim().toLowerCase();
}

function deny(
  statusCode: number,
  code: NonNullable<FalakRouteAccessDecision['code']>,
  message: string
): FalakRouteAccessDecision {
  return {
    allowed: false,
    statusCode,
    code,
    message
  };
}

function requirePrivilegedActor(config: FalakRuntimeConfig, input: FalakRouteAccessInput): FalakRouteAccessDecision {
  if (config.requireVerifiedActor) {
    if (!input.actor || !input.actorResolution.isVerified) {
      return deny(401, 'VERIFIED_ACTOR_REQUIRED', 'Verified actor identity is required for privileged Falak routes');
    }

    return { allowed: true };
  }

  if (!input.actor) {
    return deny(403, 'FALAK_FORBIDDEN', 'Falak privileged routes require an actor context');
  }

  return { allowed: true };
}

function actorExternalAuthId(actor: ResolvedActor | null): string | null {
  return actor?.externalAuthId ? normalizeListValue(actor.externalAuthId) : null;
}

export function evaluateFalakRouteAccess(
  config: FalakRuntimeConfig,
  input: FalakRouteAccessInput,
  routeGuardMode: FalakRuntimeConfig['routeGuardMode'] = config.routeGuardMode
): FalakRouteAccessDecision {
  switch (routeGuardMode) {
    case 'disabled':
      return deny(404, 'FALAK_DISABLED', 'Falak routes are disabled');
    case 'enabled':
      return input.access === 'privileged' ? requirePrivilegedActor(config, input) : { allowed: true };
    case 'tenant_allowlist': {
      if (
        config.allowedTenantSlugs.length === 0 ||
        !config.allowedTenantSlugs.includes(normalizeListValue(input.tenantSlug))
      ) {
        return deny(403, 'TENANT_NOT_ALLOWED', 'Tenant is not allowed to access Falak routes');
      }

      return input.access === 'privileged' ? requirePrivilegedActor(config, input) : { allowed: true };
    }
    case 'admin_only': {
      if (
        config.allowedTenantSlugs.length === 0 ||
        !config.allowedTenantSlugs.includes(normalizeListValue(input.tenantSlug))
      ) {
        return deny(403, 'TENANT_NOT_ALLOWED', 'Tenant is not allowed to access Falak routes');
      }

      const privilegedDecision = requirePrivilegedActor(config, input);
      if (!privilegedDecision.allowed) {
        return privilegedDecision;
      }

      const resolvedExternalAuthId = actorExternalAuthId(input.actor);
      if (
        !resolvedExternalAuthId ||
        config.allowedActorExternalAuthIds.length === 0 ||
        !config.allowedActorExternalAuthIds.includes(resolvedExternalAuthId)
      ) {
        return deny(403, 'ACTOR_NOT_ALLOWED', 'Actor is not allowed to access Falak routes');
      }

      return { allowed: true };
    }
  }
}
