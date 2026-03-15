import { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { errors } from '../../utils/errors';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';
import { FalakRepository, RequestContext } from '../domain/types';

interface JwtSubjectObject {
  external_auth_id?: string;
  username?: string;
  email?: string;
  role?: string;
}

function pushIdentity(candidates: string[], value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed || candidates.includes(trimmed)) {
    return;
  }

  candidates.push(trimmed);
}

function extractIdentityCandidates(token: string): string[] {
  const decoded = jwt.verify(token, config.JWT_SECRET_KEY) as Record<string, unknown>;
  const subject = decoded.sub;
  const identities: string[] = [];

  if (typeof subject === 'string') {
    pushIdentity(identities, subject);
  } else if (subject && typeof subject === 'object') {
    const typed = subject as JwtSubjectObject;
    pushIdentity(identities, typed.external_auth_id);
    pushIdentity(identities, typed.username);
    pushIdentity(identities, typed.email);
  }

  pushIdentity(identities, decoded.external_auth_id);
  pushIdentity(identities, decoded.preferred_username);
  pushIdentity(identities, decoded.email);

  return identities;
}

function requestedActorId(request: FastifyRequest): string | null {
  const actorIdHeader = request.headers['x-actor-id'];
  return typeof actorIdHeader === 'string' ? actorIdHeader : Array.isArray(actorIdHeader) ? actorIdHeader[0] : null;
}

export async function resolveActorIdentity(
  request: FastifyRequest,
  repository: FalakRepository,
  runtimeConfig: FalakRuntimeConfig,
  tenantId: string
): Promise<Pick<RequestContext, 'actor' | 'actorResolution'>> {
  const requestedActorOverride = requestedActorId(request);
  const authHeader = request.headers.authorization;

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw errors.unauthorized('Invalid authorization format', 'INVALID_AUTHORIZATION_HEADER');
    }

    let identities: string[];
    try {
      identities = extractIdentityCandidates(token);
    } catch (error) {
      const message =
        error instanceof jwt.TokenExpiredError
          ? 'Authentication token has expired'
          : 'Invalid authentication token';
      throw errors.unauthorized(message, 'INVALID_AUTH_TOKEN');
    }

    if (identities.length === 0) {
      throw errors.unauthorized('Unable to resolve actor identity from token', 'TOKEN_IDENTITY_MISSING');
    }

    for (const identity of identities) {
      const actor = await repository.findActorByIdentity(tenantId, identity);
      if (!actor) {
        continue;
      }

      return {
        actor,
        actorResolution: {
          source: 'verified_auth',
          isVerified: true,
          authenticatedIdentity: identity,
          requestedActorId: requestedActorOverride
        }
      };
    }

    throw errors.unauthorized('Actor not found in tenant', 'ACTOR_NOT_FOUND');
  }

  if (runtimeConfig.trustXActorId && requestedActorOverride) {
    const actor = await repository.findActorById(tenantId, requestedActorOverride);
    if (actor) {
      return {
        actor,
        actorResolution: {
          source: 'trusted_header_override',
          isVerified: false,
          authenticatedIdentity: null,
          requestedActorId: requestedActorOverride
        }
      };
    }
  }

  return {
    actor: null,
    actorResolution: {
      source: 'none',
      isVerified: false,
      authenticatedIdentity: null,
      requestedActorId: requestedActorOverride
    }
  };
}
