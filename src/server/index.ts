import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

// Import configurations
import { connectDatabase } from './config/database';
import { logger, stream } from './config/logger';
import { webSocketManager } from './config/websocket';
import { monitoringService } from './services/monitoringService';
import { aiService } from './config/ai';

// Import routes
import authRoutes from './routes/auth';
import artifactRoutes from './routes/artifacts';
import analyticsRoutes from './routes/analytics';
import monitoringRoutes from './routes/monitoring';
import personaRoutes from './routes/personas';
import chatRoutes from './routes/chat';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';

// Import middleware
import { authenticateToken, optionalAuth } from './middleware/auth';
import {
  requirePermission,
  requireRole,
  requireInstructor,
  requireAdministrator,
  PERMISSIONS,
} from './middleware/roleCheck';
import {
  addRequestId,
  performanceMonitor,
  errorHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
} from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
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

// Request tracking and monitoring middleware
app.use(addRequestId);
app.use(performanceMonitor);

// Logging middleware
app.use(morgan('combined', { stream }));

// Static file serving for local uploads
if (
  process.env.FILE_STORAGE_PROVIDER === 'local' ||
  !process.env.FILE_STORAGE_PROVIDER
) {
  const uploadsPath =
    process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));
}

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
app.use('/api/artifacts', artifactRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);

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
app.use('*', notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Set up process error handlers
    setupProcessErrorHandlers();

    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Initialize AI service
    await aiService.initialize();
    logger.info('AI service initialized successfully');

    // Initialize WebSocket server
    webSocketManager.initialize(server);
    logger.info('WebSocket server initialized');

    // Start monitoring service
    monitoringService.startMonitoring();
    logger.info('Monitoring service started');

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(
        `Health check: http://localhost:${PORT}/api/monitoring/health`
      );
      logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  monitoringService.stopMonitoring();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  monitoringService.stopMonitoring();
  process.exit(0);
});

// Start the server
startServer();

export default app;
