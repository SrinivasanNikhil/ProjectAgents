import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import configurations
import { connectDatabase } from './config/database';
import { logger, stream } from './config/logger';

// Import routes
import authRoutes from './routes/auth';

// Import middleware
import { authenticateToken, optionalAuth } from './middleware/auth';
import {
  requirePermission,
  requireRole,
  requireInstructor,
  requireAdministrator,
  PERMISSIONS,
} from './middleware/roleCheck';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Compression middleware
if (process.env.COMPRESSION_ENABLED === 'true') {
  app.use(compression());
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream }));

// Rate limiting for all routes
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await connectDatabase();
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth ? 'connected' : 'disconnected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Server health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

// Protected routes example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected route',
    user: req.user,
  });
});

// Optional auth route example
app.get('/api/public', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'This is a public route',
    user: req.user || null,
  });
});

// RBAC protected routes examples
app.get(
  '/api/admin/users',
  authenticateToken,
  requireAdministrator,
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin users endpoint - only administrators can access',
      user: req.user,
    });
  }
);

app.get(
  '/api/instructor/dashboard',
  authenticateToken,
  requireInstructor,
  (req, res) => {
    res.json({
      success: true,
      message:
        'Instructor dashboard - instructors and administrators can access',
      user: req.user,
    });
  }
);

app.get(
  '/api/projects',
  authenticateToken,
  requirePermission(PERMISSIONS.PROJECT.READ),
  (req, res) => {
    res.json({
      success: true,
      message: 'Projects endpoint - requires project:read permission',
      user: req.user,
    });
  }
);

app.post(
  '/api/projects',
  authenticateToken,
  requirePermission(PERMISSIONS.PROJECT.WRITE),
  (req, res) => {
    res.json({
      success: true,
      message: 'Create project endpoint - requires project:write permission',
      user: req.user,
    });
  }
);

app.delete(
  '/api/projects/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PROJECT.DELETE),
  (req, res) => {
    res.json({
      success: true,
      message: 'Delete project endpoint - requires project:delete permission',
      user: req.user,
      projectId: req.params.id,
    });
  }
);

app.get(
  '/api/analytics',
  authenticateToken,
  requirePermission(PERMISSIONS.ANALYTICS.READ),
  (req, res) => {
    res.json({
      success: true,
      message: 'Analytics endpoint - requires analytics:read permission',
      user: req.user,
    });
  }
);

app.get(
  '/api/system/config',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.CONFIG),
  (req, res) => {
    res.json({
      success: true,
      message: 'System config endpoint - requires system:config permission',
      user: req.user,
    });
  }
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
  });
});

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', error);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        code: 'VALIDATION_ERROR',
      });
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
        code: 'DUPLICATE_KEY',
      });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Default error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;
