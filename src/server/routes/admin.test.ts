import request from 'supertest';
import express from 'express';
import { Types } from 'mongoose';
import adminRoutes from './admin';
import { analyticsService } from '../services/analyticsService';
import { requireAuth, requireAdministrator } from '../middleware/auth';

// Mock the analytics service
jest.mock('../services/analyticsService');
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

// Mock middleware
jest.mock('../middleware/auth');
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockRequireAdministrator = requireAdministrator as jest.MockedFunction<typeof requireAdministrator>;

// Mock validation middleware
jest.mock('../middleware/validation', () => ({
  validateRequest: (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

// Mock admin user
const mockAdminUser = {
  _id: new Types.ObjectId(),
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'administrator',
  department: 'IT',
  isAdministrator: () => true,
};

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to pass
    mockRequireAuth.mockImplementation((req, res, next) => {
      req.user = mockAdminUser;
      next();
    });
    
    mockRequireAdministrator.mockImplementation((req, res, next) => {
      if (req.user && req.user.role === 'administrator') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Access denied' });
      }
    });
  });

  describe('GET /admin/analytics/department', () => {
    it('should return department analytics for administrators', async () => {
      const mockAnalytics = {
        totalProjects: 50,
        totalStudents: 200,
        totalInstructors: 15,
        totalPersonas: 100,
        averageProjectDuration: 30,
        systemUsage: {
          dailyActiveUsers: 45,
          weeklyActiveUsers: 150,
          monthlyActiveUsers: 180,
        },
        performanceDistribution: {
          excellent: 12,
          good: 18,
          average: 15,
          needsImprovement: 5,
        },
        technologyAdoption: {
          aiFeatureUsage: 85.5,
          fileUploadUsage: 65.2,
          linkSharingUsage: 45.8,
          threadingUsage: 55.3,
        },
      };

      mockAnalyticsService.getDepartmentAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/admin/analytics/department')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalytics,
      });
      expect(mockAnalyticsService.getDepartmentAnalytics).toHaveBeenCalledTimes(1);
    });

    it('should handle errors when getting department analytics', async () => {
      const errorMessage = 'Database connection failed';
      mockAnalyticsService.getDepartmentAnalytics.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/admin/analytics/department')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/analytics/department/detailed', () => {
    it('should return detailed department analytics for administrators', async () => {
      const mockDetailedAnalytics = {
        totalProjects: 50,
        totalStudents: 200,
        totalInstructors: 15,
        totalPersonas: 100,
        averageProjectDuration: 30,
        systemUsage: {
          dailyActiveUsers: 45,
          weeklyActiveUsers: 150,
          monthlyActiveUsers: 180,
        },
        performanceDistribution: {
          excellent: 12,
          good: 18,
          average: 15,
          needsImprovement: 5,
        },
        technologyAdoption: {
          aiFeatureUsage: 85.5,
          fileUploadUsage: 65.2,
          linkSharingUsage: 45.8,
          threadingUsage: 55.3,
        },
        departmentBreakdown: [
          {
            _id: 'Computer Science',
            totalUsers: 120,
            students: 100,
            instructors: 15,
            administrators: 5,
          },
          {
            _id: 'Engineering',
            totalUsers: 95,
            students: 80,
            instructors: 12,
            administrators: 3,
          },
        ],
        projectsByDepartment: [
          {
            _id: 'Computer Science',
            totalProjects: 30,
            activeProjects: 25,
            completedProjects: 5,
          },
        ],
        activityByDepartment: [
          {
            _id: 'Computer Science',
            totalMessages: 1500,
            activeUsers: 45,
          },
        ],
        generatedAt: new Date(),
      };

      mockAnalyticsService.getDetailedDepartmentAnalytics.mockResolvedValue(mockDetailedAnalytics);

      const response = await request(app)
        .get('/admin/analytics/department/detailed')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockDetailedAnalytics,
      });
      expect(mockAnalyticsService.getDetailedDepartmentAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /admin/analytics/department/trends', () => {
    it('should return department analytics trends with default parameters', async () => {
      const mockTrends = {
        period: 'month' as const,
        dateRange: {
          start: new Date('2023-11-01'),
          end: new Date('2023-12-01'),
        },
        userTrends: [
          {
            _id: { year: 2023, month: 11, day: 15 },
            newUsers: 5,
            newStudents: 4,
            newInstructors: 1,
          },
        ],
        projectTrends: [
          {
            _id: { year: 2023, month: 11, day: 15 },
            newProjects: 3,
          },
        ],
        activityTrends: [
          {
            _id: { year: 2023, month: 11, day: 15 },
            totalMessages: 125,
            activeUsers: 45,
          },
        ],
      };

      mockAnalyticsService.getDepartmentAnalyticsTrends.mockResolvedValue(mockTrends);

      const response = await request(app)
        .get('/admin/analytics/department/trends')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTrends,
      });
      expect(mockAnalyticsService.getDepartmentAnalyticsTrends).toHaveBeenCalledWith('month', undefined);
    });

    it('should return trends with custom period and date range', async () => {
      const startDate = '2023-10-01T00:00:00.000Z';
      const endDate = '2023-11-01T00:00:00.000Z';
      const period = 'week';

      const mockTrends = {
        period: 'week' as const,
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate),
        },
        userTrends: [],
        projectTrends: [],
        activityTrends: [],
      };

      mockAnalyticsService.getDepartmentAnalyticsTrends.mockResolvedValue(mockTrends);

      const response = await request(app)
        .get('/admin/analytics/department/trends')
        .query({ period, startDate, endDate })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTrends,
      });
      expect(mockAnalyticsService.getDepartmentAnalyticsTrends).toHaveBeenCalledWith(
        'week',
        { start: new Date(startDate), end: new Date(endDate) }
      );
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/admin/analytics/department/trends')
        .query({ period: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/analytics/system/health', () => {
    it('should return system health metrics', async () => {
      const mockHealthMetrics = {
        database: {
          totalSize: 1024000,
          totalCollections: 8,
          totalIndexes: 25,
          connectionStatus: 'connected' as const,
        },
        performance: {
          messagesLast24h: 450,
          messagesLastWeek: 2800,
          activeUsersLast24h: 45,
          errorRate: 2.1,
          avgResponseTime: 250,
        },
        system: {
          uptime: 86400,
          memoryUsage: {
            used: 52428800,
            total: 134217728,
            external: 2097152,
          },
          nodeVersion: 'v18.17.0',
        },
        lastUpdated: new Date(),
      };

      mockAnalyticsService.getSystemHealthMetrics.mockResolvedValue(mockHealthMetrics);

      const response = await request(app)
        .get('/admin/analytics/system/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHealthMetrics,
      });
      expect(mockAnalyticsService.getSystemHealthMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /admin/users/summary', () => {
    it('should return user summary for administrators', async () => {
      const mockUserSummary = {
        totalUsers: 215,
        usersByRole: {
          student: 180,
          instructor: 27,
          administrator: 8,
        },
        usersByDepartment: [
          { _id: 'Computer Science', count: 120 },
          { _id: 'Engineering', count: 95 },
        ],
        recentRegistrations: 12,
        activeUsersLast24h: 45,
        generatedAt: new Date(),
      };

      mockAnalyticsService.getUserSummaryForAdmin.mockResolvedValue(mockUserSummary);

      const response = await request(app)
        .get('/admin/users/summary')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUserSummary,
      });
      expect(mockAnalyticsService.getUserSummaryForAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /admin/projects/summary', () => {
    it('should return project summary for administrators', async () => {
      const mockProjectSummary = {
        totalProjects: 50,
        projectsByStatus: {
          active: 35,
          completed: 12,
          paused: 3,
        },
        recentProjectsLast7Days: 5,
        averageProjectDurationDays: 28.5,
        generatedAt: new Date(),
      };

      mockAnalyticsService.getProjectSummaryForAdmin.mockResolvedValue(mockProjectSummary);

      const response = await request(app)
        .get('/admin/projects/summary')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockProjectSummary,
      });
      expect(mockAnalyticsService.getProjectSummaryForAdmin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should deny access to non-administrators', async () => {
      // Mock non-admin user
      const nonAdminUser = {
        ...mockAdminUser,
        role: 'instructor',
        isAdministrator: () => false,
      };

      mockRequireAuth.mockImplementation((req, res, next) => {
        req.user = nonAdminUser;
        next();
      });

      mockRequireAdministrator.mockImplementation((req, res, next) => {
        if (req.user && req.user.role === 'administrator') {
          next();
        } else {
          res.status(403).json({ success: false, message: 'Access denied' });
        }
      });

      const response = await request(app)
        .get('/admin/analytics/department')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Access denied',
      });
    });

    it('should require authentication for all admin routes', async () => {
      mockRequireAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ success: false, message: 'Authentication required' });
      });

      const response = await request(app)
        .get('/admin/analytics/department')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const errorMessage = 'Service temporarily unavailable';
      mockAnalyticsService.getDepartmentAnalytics.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .get('/admin/analytics/department');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors for trends endpoint', async () => {
      const response = await request(app)
        .get('/admin/analytics/department/trends')
        .query({ period: 'invalid-period' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});