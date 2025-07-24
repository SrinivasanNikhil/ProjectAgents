import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define format for console logs
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define format for file logs (structured JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level,
      message,
      ...meta,
    };

    if (stack) {
      logEntry.stack = stack;
    }

    return JSON.stringify(logEntry);
  })
);

// Define format for access logs
const accessFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      method,
      url,
      status,
      responseTime,
      ip,
      userAgent,
      userId,
    }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        method,
        url,
        status,
        responseTime,
        ip,
        userAgent,
        userId,
      });
    }
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Access log file
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    level: 'http',
    format: accessFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Application log file
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true,
});

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Enhanced logging functions with context and metadata
export const logError = (
  error: Error | string,
  context?: string,
  metadata?: any
) => {
  const logData: any = {
    message: error instanceof Error ? error.message : error,
    context,
    ...metadata,
  };

  if (error instanceof Error && error.stack) {
    logData.stack = error.stack;
  }

  logger.error(logData);
};

export const logInfo = (message: string, context?: string, metadata?: any) => {
  const logData: any = {
    message,
    context,
    ...metadata,
  };
  logger.info(logData);
};

export const logWarn = (message: string, context?: string, metadata?: any) => {
  const logData: any = {
    message,
    context,
    ...metadata,
  };
  logger.warn(logData);
};

export const logDebug = (message: string, context?: string, metadata?: any) => {
  const logData: any = {
    message,
    context,
    ...metadata,
  };
  logger.debug(logData);
};

export const logHttp = (message: string, metadata?: any) => {
  const logData: any = {
    message,
    ...metadata,
  };
  logger.http(logData);
};

// Performance logging
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: any
) => {
  const logData: any = {
    message: `Performance: ${operation}`,
    operation,
    duration,
    durationMs: duration,
    ...metadata,
  };

  if (duration > 1000) {
    logger.warn(logData);
  } else if (duration > 500) {
    logger.info(logData);
  } else {
    logger.debug(logData);
  }
};

// Security logging
export const logSecurity = (
  event: string,
  details: any,
  level: 'info' | 'warn' | 'error' = 'info'
) => {
  const logData = {
    message: `Security: ${event}`,
    event,
    ...details,
  };

  logger[level](logData);
};

// Database logging
export const logDatabase = (
  operation: string,
  details: any,
  level: 'info' | 'warn' | 'error' = 'info'
) => {
  const logData = {
    message: `Database: ${operation}`,
    operation,
    ...details,
  };

  logger[level](logData);
};

// API logging
export const logAPI = (
  method: string,
  url: string,
  status: number,
  responseTime: number,
  metadata?: any
) => {
  const logData: any = {
    message: `API: ${method} ${url}`,
    method,
    url,
    status,
    responseTime,
    ...metadata,
  };

  if (status >= 500) {
    logger.error(logData);
  } else if (status >= 400) {
    logger.warn(logData);
  } else {
    logger.http(logData);
  }
};

// User activity logging
export const logUserActivity = (
  userId: string,
  action: string,
  details?: any
) => {
  const logData: any = {
    message: `User Activity: ${action}`,
    userId,
    action,
    ...details,
  };
  logger.info(logData);
};

// System health logging
export const logSystemHealth = (
  component: string,
  status: 'healthy' | 'warning' | 'error',
  details?: any
) => {
  const logData: any = {
    message: `System Health: ${component} - ${status}`,
    component,
    status,
    ...details,
  };

  if (status === 'error') {
    logger.error(logData);
  } else if (status === 'warning') {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
};

// Export logger instance for direct use
export default logger;
