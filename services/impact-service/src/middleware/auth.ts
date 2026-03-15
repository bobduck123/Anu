import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { extractUserPrincipal, verifyJwtClaims } from '../auth/jwt';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.debug({ path: req.path }, 'No authorization header');
    return next(errors.unauthorized('Missing authorization header'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.debug({ authHeader }, 'Invalid authorization format');
    return next(errors.unauthorized('Invalid authorization format'));
  }

  const token = parts[1];

  try {
    const payload = verifyJwtClaims(token);
    const principal = extractUserPrincipal(payload);

    if (!principal.username || !principal.role) {
      logger.debug({ payload }, 'Invalid JWT structure - missing compatible username or role');
      return next(errors.unauthorized('Invalid token structure'));
    }

    req.user = {
      username: principal.username,
      role: principal.role
    };

    logger.debug({ username: req.user.username, role: req.user.role }, 'JWT verified');
    next();
  } catch (err) {
    const errMsg = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    logger.debug({ error: errMsg, token: token.substring(0, 10) + '...' }, 'JWT verification failed');
    next(errors.unauthorized(errMsg));
  }
};

// Middleware that does NOT require auth - just extracts if present
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];

  try {
    const payload = verifyJwtClaims(token);
    const principal = extractUserPrincipal(payload);

    if (principal.username && principal.role) {
      req.user = {
        username: principal.username,
        role: principal.role
      };
    }
  } catch {
    // Ignore errors - auth is optional
  }

  next();
};
