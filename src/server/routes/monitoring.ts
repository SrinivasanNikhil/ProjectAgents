import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, PERMISSIONS } from '../middleware/roleCheck';
import { asyncHandler } from '../middleware/errorHandler';
import { monitoringService } from '../services/monitoringService';
import { logger, logUserActivity } from '../config/logger';

const router = express.Router();

/**
 * @route GET /api/monitoring/health
 * @desc Get system health status
 * @access Public
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const healthCheck = await monitoringService.performHealthCheck();

    const statusCode =
      healthCheck.status === 'healthy'
        ? 200
        : healthCheck.status === 'warning'
          ? 200
          : 503;

    res.status(statusCode).json({
      success: healthCheck.status === 'healthy',
      ...healthCheck,
    });
  })
);

/**
 * @route GET /api/monitoring/health/live
 * @desc Kubernetes liveness probe endpoint
 * @access Public
 */
router.get(
  '/health/live',
  asyncHandler(async (req: Request, res: Response) => {
    const healthCheck = await monitoringService.performHealthCheck();

    if (healthCheck.status === 'error') {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: healthCheck.timestamp,
      });
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: healthCheck.timestamp,
    });
  })
);

/**
 * @route GET /api/monitoring/health/ready
 * @desc Kubernetes readiness probe endpoint
 * @access Public
 */
router.get(
  '/health/ready',
  asyncHandler(async (req: Request, res: Response) => {
    const healthCheck = await monitoringService.performHealthCheck();

    if (healthCheck.status === 'error') {
      return res.status(503).json({
        status: 'not ready',
        timestamp: healthCheck.timestamp,
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: healthCheck.timestamp,
    });
  })
);

/**
 * @route GET /api/monitoring/metrics
 * @desc Get system metrics
 * @access Private (Admin only)
 */
router.get(
  '/metrics',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const metrics = monitoringService.getPerformanceMetrics();

    logUserActivity(req.user.id, 'ViewSystemMetrics', {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/monitoring/uptime
 * @desc Get system uptime information
 * @access Private (Admin only)
 */
router.get(
  '/uptime',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const uptime = monitoringService.getUptimeInfo();

    logUserActivity(req.user.id, 'ViewUptime', {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      uptime,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/monitoring/memory
 * @desc Get memory usage information
 * @access Private (Admin only)
 */
router.get(
  '/memory',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const memory = monitoringService.getMemoryInfo();

    logUserActivity(req.user.id, 'ViewMemoryUsage', {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      memory,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/monitoring/cpu
 * @desc Get CPU information
 * @access Private (Admin only)
 */
router.get(
  '/cpu',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const cpu = monitoringService.getCpuInfo();

    logUserActivity(req.user.id, 'ViewCpuInfo', {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      cpu,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/monitoring/process
 * @desc Get process information
 * @access Private (Admin only)
 */
router.get(
  '/process',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const process = monitoringService.getProcessInfo();

    logUserActivity(req.user.id, 'ViewProcessInfo', {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      process,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route GET /api/monitoring/logs
 * @desc Get recent log entries (simplified - in production you'd want a proper log aggregation system)
 * @access Private (Admin only)
 */
router.get(
  '/logs',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.MONITOR),
  asyncHandler(async (req: any, res: Response) => {
    const { level = 'error', limit = 100 } = req.query;

    // This is a simplified implementation
    // In production, you'd want to integrate with a proper log aggregation system
    // like ELK stack, Splunk, or cloud logging services

    logUserActivity(req.user.id, 'ViewLogs', {
      requestId: req.requestId,
      level,
      limit,
    });

    res.json({
      success: true,
      message:
        'Log viewing endpoint - integrate with log aggregation system in production',
      level,
      limit,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * @route POST /api/monitoring/restart
 * @desc Trigger application restart (admin only)
 * @access Private (Admin only)
 */
router.post(
  '/restart',
  authenticateToken,
  requirePermission(PERMISSIONS.SYSTEM.ADMIN),
  asyncHandler(async (req: any, res: Response) => {
    logUserActivity(req.user.id, 'TriggerRestart', {
      requestId: req.requestId,
      reason: req.body.reason || 'Manual restart',
    });

    logger.warn('Application restart triggered by admin', {
      userId: req.user.id,
      reason: req.body.reason,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: 'Restart initiated',
      timestamp: new Date().toISOString(),
    });

    // Graceful shutdown after response
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  })
);

export default router;
