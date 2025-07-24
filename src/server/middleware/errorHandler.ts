import { Request, Response, NextFunction } from 'express';
import { logger, logError, logAPI } from '../config/logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
  public errors?: any[];
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: any[];
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

// Generate request ID for tracking
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Add request ID to request object
export const addRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Performance monitoring middleware
export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    logAPI(method, originalUrl, statusCode, duration, {
      requestId: req.requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  });

  next();
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Main error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let errors: any[] | undefined;

  // Handle custom AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;

    if (error instanceof ValidationError) {
      errors = error.errors;
    }
  }
  // Handle Mongoose validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  }
  // Handle Mongoose duplicate key errors
  else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue)[0];
    message = `${field} already exists`;
    code = 'DUPLICATE_KEY';
  }
  // Handle Mongoose cast errors (invalid ObjectId)
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }
  // Handle multer errors
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large';
    code = 'FILE_TOO_LARGE';
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files';
    code = 'TOO_MANY_FILES';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    code = 'UNEXPECTED_FILE_FIELD';
  }
  // Handle rate limiting errors
  else if (error.status === 429) {
    statusCode = 429;
    message = 'Too many requests';
    code = 'RATE_LIMIT_EXCEEDED';
  }

  // Log the error with context
  logError(error, 'ErrorHandler', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: error.stack,
  });

  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
  };

  if (errors) {
    errorResponse.errors = errors;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError('Route');

  logError(error, 'NotFoundHandler', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
  });
};

// Security error handler
export const securityErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error.status === 403) {
    logError(error, 'SecurityError', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  }
  next(error);
};

// Database error handler
export const databaseErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (
    error.name &&
    ['MongoError', 'MongooseError', 'ValidationError', 'CastError'].includes(
      error.name
    )
  ) {
    logError(error, 'DatabaseError', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      operation: req.method,
      collection: error.collection,
      code: error.code,
    });
  }
  next(error);
};

// Graceful shutdown handler
export const gracefulShutdown = (server: any, signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Process error handlers
export const setupProcessErrorHandlers = () => {
  process.on('uncaughtException', error => {
    logError(error, 'UncaughtException', {
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logError(
      new Error(`Unhandled Rejection at: ${promise}, reason: ${reason}`),
      'UnhandledRejection',
      {
        reason,
        promise: promise.toString(),
      }
    );
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

// Export all error handling utilities
export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  addRequestId,
  performanceMonitor,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  securityErrorHandler,
  databaseErrorHandler,
  gracefulShutdown,
  setupProcessErrorHandlers,
};
