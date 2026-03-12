import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth';
import { errors } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Factory: returns middleware that requires authentication + specific role(s)
 * Usage: app.post('/api/admin', requireRole('organizer'), handler)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First verify auth
    authMiddleware(req, res, () => {
      if (!req.user) {
        return next(errors.unauthorized('Authentication required'));
      }

      // Then check role
      if (!roles.includes(req.user.role)) {
        logger.debug(
          { username: req.user.username, userRole: req.user.role, requiredRoles: roles },
          'Role check failed'
        );
        return next(errors.forbidden(`This action requires one of: ${roles.join(', ')}`));
      }

      next();
    });
  };
};
