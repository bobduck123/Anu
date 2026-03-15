import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { errors } from '../../utils/errors';
import { resolveActorIdentity } from '../auth/actorIdentity';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';
import { FalakRepository, FalakRouteGuardMode, RequestContext } from '../domain/types';
import { falakContextFields, logFalak } from '../observability/falakTelemetry';
import { evaluateFalakRouteAccess } from '../security/routeGuard';

declare module 'fastify' {
  interface FastifyRequest {
    falakContext?: RequestContext;
  }
}

function getClientIp(request: FastifyRequest): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }

  return request.ip ?? null;
}

export function buildRequestContextHook(
  repository: FalakRepository,
  options: {
    privileged: boolean;
    routeGuardMode?: FalakRouteGuardMode | null;
    runtimeConfig: FalakRuntimeConfig;
    disabledErrorCode?: string;
    disabledErrorMessage?: string;
  }
) {
  return async function attachFalakContext(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const runtimeConfig = options.runtimeConfig;
    const traceId = request.headers['x-trace-id'] && typeof request.headers['x-trace-id'] === 'string'
      ? request.headers['x-trace-id']
      : randomUUID();
    const routeGuardMode = options.routeGuardMode ?? null;
    const routeGuardApplies = routeGuardMode !== null;

    if (routeGuardApplies && routeGuardMode === 'disabled') {
      logFalak('falak.route_guard', {
        traceId,
        tenantId: null,
        tenantSlug: null,
        plane: options.privileged ? 'privileged' : 'public',
        actorId: null,
        actorExternalAuthId: null,
        actorResolutionSource: 'none',
        actorVerified: false,
        routeGuardMode,
        access: options.privileged ? 'privileged' : 'public',
        allowed: false,
        code: options.disabledErrorCode ?? 'FALAK_DISABLED'
      }, 'warn');
      throw errors.notFound(
        options.disabledErrorMessage ?? 'Falak routes are disabled',
        options.disabledErrorCode ?? 'FALAK_DISABLED'
      );
    }

    const tenantHeader = request.headers['x-tenant-id'];
    const tenantId = typeof tenantHeader === 'string' ? tenantHeader : Array.isArray(tenantHeader) ? tenantHeader[0] : null;
    if (!tenantId) {
      throw errors.badRequest('Missing X-Tenant-Id header', 'TENANT_HEADER_REQUIRED');
    }

    const tenant = await repository.findTenantById(tenantId);
    if (!tenant) {
      throw errors.notFound('Tenant not found', 'TENANT_NOT_FOUND');
    }

    const { actor, actorResolution } = await resolveActorIdentity(request, repository, runtimeConfig, tenantId);

    request.falakContext = {
      traceId,
      tenantId,
      tenantSlug: tenant.slug,
      // Route scope defines the control plane. Authenticated callers on public routes
      // must remain on the public plane so restricted entities never leak.
      plane: options.privileged ? 'privileged' : 'public',
      actor,
      actorResolution,
      routeGuard: {
        applies: routeGuardApplies,
        mode: routeGuardMode ?? runtimeConfig.routeGuardMode,
        access: options.privileged ? 'privileged' : 'public'
      },
      ipAddress: getClientIp(request),
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null
    };

    logFalak('falak.actor_resolution', {
      ...falakContextFields(request.falakContext),
      requestedActorId: actorResolution.requestedActorId,
      authenticatedIdentity: actorResolution.authenticatedIdentity,
      trustXActorId: runtimeConfig.trustXActorId
    });

    if (request.falakContext.routeGuard.applies) {
      const accessDecision = evaluateFalakRouteAccess(runtimeConfig, {
        access: request.falakContext.routeGuard.access,
        tenantSlug: tenant.slug,
        actor,
        actorResolution: request.falakContext.actorResolution
      }, request.falakContext.routeGuard.mode);
      logFalak('falak.route_guard', {
        ...falakContextFields(request.falakContext),
        routeGuardMode: request.falakContext.routeGuard.mode,
        access: request.falakContext.routeGuard.access,
        allowed: accessDecision.allowed,
        code: accessDecision.code ?? null
      }, accessDecision.allowed ? 'info' : 'warn');
      if (!accessDecision.allowed) {
        if (accessDecision.statusCode === 404) {
          throw errors.notFound(accessDecision.message ?? 'Falak route is unavailable', accessDecision.code);
        }

        if (accessDecision.statusCode === 401) {
          throw errors.unauthorized(accessDecision.message ?? 'Verified actor required', accessDecision.code);
        }

        throw errors.forbidden(accessDecision.message ?? 'Falak route is forbidden', accessDecision.code);
      }
    }

    if (options.privileged) {
      if (runtimeConfig.requireVerifiedActor) {
        if (!actor || !request.falakContext.actorResolution.isVerified) {
          throw errors.unauthorized(
            'Verified actor identity is required for privileged routes',
            'VERIFIED_ACTOR_REQUIRED'
          );
        }
      } else if (!actor) {
        throw errors.forbidden('Falak privileged routes require an actor context', 'FALAK_FORBIDDEN');
      }
    }
  };
}

export function requireFalakContext(request: FastifyRequest): RequestContext {
  if (!request.falakContext) {
    throw errors.internal('Falak request context was not initialized', 'FALAK_CONTEXT_MISSING');
  }

  return request.falakContext;
}

export function bridgeFastifyErrors(error: unknown, _request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction): void {
  done(error as Error);
}
