import jwt from 'jsonwebtoken';
import config from '../config';

interface JwtSubjectObject {
  external_auth_id?: unknown;
  username?: unknown;
  email?: unknown;
  role?: unknown;
}

export type JwtClaims = Record<string, unknown>;

export interface JwtUserPrincipal {
  username: string | null;
  role: string | null;
}

function normalizeIdentity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('control::') ? trimmed.slice('control::'.length) : trimmed;
}

function pushIdentity(candidates: string[], value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = normalizeIdentity(value);
  if (!normalized || candidates.includes(normalized)) {
    return;
  }

  candidates.push(normalized);
}

function extractSubjectObject(claims: JwtClaims): JwtSubjectObject | null {
  const subject = claims.sub;
  if (!subject || typeof subject !== 'object' || Array.isArray(subject)) {
    return null;
  }

  return subject as JwtSubjectObject;
}

function tokenSecrets(): string[] {
  const candidates = [config.PUBLIC_JWT_SECRET_KEY, config.JWT_SECRET_KEY];
  return [...new Set(candidates.map((value) => value.trim()).filter(Boolean))];
}

export function verifyJwtClaims(token: string): JwtClaims {
  let expiredError: jwt.TokenExpiredError | null = null;
  let lastError: Error | null = null;

  for (const secret of tokenSecrets()) {
    try {
      const decoded = jwt.verify(token, secret);
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
        throw new jwt.JsonWebTokenError('Invalid token payload');
      }

      return decoded as JwtClaims;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        expiredError = expiredError ?? error;
      } else if (error instanceof Error) {
        lastError = error;
      }
    }
  }

  throw expiredError ?? lastError ?? new jwt.JsonWebTokenError('Invalid token');
}

export function extractUserPrincipal(claims: JwtClaims): JwtUserPrincipal {
  const subject = extractSubjectObject(claims);
  const usernames: string[] = [];

  if (typeof claims.sub === 'string') {
    pushIdentity(usernames, claims.sub);
  }

  pushIdentity(usernames, subject?.username);
  pushIdentity(usernames, claims.preferred_username);
  pushIdentity(usernames, claims.username);
  pushIdentity(usernames, subject?.external_auth_id);
  pushIdentity(usernames, claims.external_auth_id);
  pushIdentity(usernames, subject?.email);
  pushIdentity(usernames, claims.email);

  const role =
    typeof claims.role === 'string'
      ? claims.role
      : typeof subject?.role === 'string'
        ? subject.role
        : null;

  return {
    username: usernames[0] ?? null,
    role
  };
}

export function extractIdentityCandidates(claims: JwtClaims): string[] {
  const subject = extractSubjectObject(claims);
  const identities: string[] = [];

  if (typeof claims.sub === 'string') {
    pushIdentity(identities, claims.sub);
  }

  pushIdentity(identities, subject?.external_auth_id);
  pushIdentity(identities, subject?.username);
  pushIdentity(identities, subject?.email);
  pushIdentity(identities, claims.external_auth_id);
  pushIdentity(identities, claims.preferred_username);
  pushIdentity(identities, claims.username);
  pushIdentity(identities, claims.email);

  return identities;
}
