import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdministrator } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';
import { validateRequest } from '../middleware/validation';
import { query } from 'express-validator';

const router = Router();

// Apply authentication to all admin routes
router.use(requireAuth);

/**
 * @route GET /api/admin/analytics/department
 * @desc Get comprehensive department-wide analytics for administrators
 * @access Private (Administrator only)
 */
router.get('/analytics/department', requireAdministrator, async (req, res, next) => {
  try {
    const analytics = await analyticsService.getDepartmentAnalytics();
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/analytics/department/detailed
 * @desc Get detailed department analytics with breakdowns by department
 * @access Private (Administrator only)
 */
router.get('/analytics/department/detailed', requireAdministrator, async (req, res, next) => {
  try {
    const analytics = await analyticsService.getDetailedDepartmentAnalytics();
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/analytics/department/trends
 * @desc Get department analytics trends over time
 * @access Private (Administrator only)
 */
router.get(
  '/analytics/department/trends',
  requireAdministrator,
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Period must be week, month, quarter, or year'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { period = 'month', startDate, endDate } = req.query;
      
      const dateRange = startDate && endDate 
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined;
      
      const trends = await analyticsService.getDepartmentAnalyticsTrends(
        period as 'week' | 'month' | 'quarter' | 'year',
        dateRange
      );
      
      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/analytics/system/health
 * @desc Get system health and performance metrics
 * @access Private (Administrator only)
 */
router.get('/analytics/system/health', requireAdministrator, async (req, res, next) => {
  try {
    const healthMetrics = await analyticsService.getSystemHealthMetrics();
    
    res.json({
      success: true,
      data: healthMetrics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/users/summary
 * @desc Get user summary statistics for administrators
 * @access Private (Administrator only)
 */
router.get('/users/summary', requireAdministrator, async (req, res, next) => {
  try {
    const userSummary = await analyticsService.getUserSummaryForAdmin();
    
    res.json({
      success: true,
      data: userSummary,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/admin/projects/summary
 * @desc Get project summary statistics for administrators
 * @access Private (Administrator only)
 */
router.get('/projects/summary', requireAdministrator, async (req, res, next) => {
  try {
    const projectSummary = await analyticsService.getProjectSummaryForAdmin();
    
    res.json({
      success: true,
      data: projectSummary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;