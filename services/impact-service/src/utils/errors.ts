import { Request, Response, NextFunction } from 'express';
import logger from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Convenience constructors
export const errors = {
  badRequest: (message: string, code?: string) => new AppError(400, message, code),
  unauthorized: (message: string = 'Unauthorized', code?: string) => new AppError(401, message, code),
  forbidden: (message: string = 'Forbidden', code?: string) => new AppError(403, message, code),
  notFound: (message: string = 'Not found', code?: string) => new AppError(404, message, code),
  conflict: (message: string, code?: string) => new AppError(409, message, code),
  unprocessable: (message: string, code?: string) => new AppError(422, message, code),
  internal: (message: string = 'Internal server error', code?: string) => new AppError(500, message, code)
};

// Global error handler middleware
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof AppError) {
    logger.error(
      {
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method
      },
      'AppError'
    );
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'INTERNAL_ERROR'
      }
    });
    return;
  }

  // Unhandled errors
  logger.error(
    {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
};
