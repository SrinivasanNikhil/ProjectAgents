import request from 'supertest';
import express from 'express';
import { Types } from 'mongoose';
import analyticsRouter from './analytics';
import { analyticsService } from '../services/analyticsService';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

// Mock the analytics service
jest.mock('../services/analyticsService');
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

// Mock the middleware
jest.mock('../middleware/auth');
jest.mock('../middleware/roleCheck');

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockCheckRole = checkRole as jest.MockedFunction<typeof checkRole>;

describe('Analytics Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRouter);

    // Mock authentication middleware to pass through
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', role: 'instructor' };
      next();
    });

    // Mock role check middleware to pass through
    mockCheckRole.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics/conversation/:conversationId', () => {
    const conversationId = new Types.ObjectId().toString();
    const mockAnalytics = {
      totalMessages: 10,
      messagesPerDay: 2.5,
      averageResponseTime: 15,
      activeParticipants: 3,
      sentimentTrend: [],
      messageTypes: { text: 8, file: 1, link: 1, milestone: 0, system: 0 },
      threadingUsage: { totalThreads: 2, averageThreadLength: 3, deepestThread: 5 },
    };

    it('should return conversation analytics successfully', async () => {
      mockAnalyticsService.getConversationAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAnalytics,
      });

      expect(mockAnalyticsService.getConversationAnalytics).toHaveBeenCalledWith(
        new Types.ObjectId(conversationId),
        undefined
      );
    });

    it('should handle date range parameters', async () => {
      mockAnalyticsService.getConversationAnalytics.mockResolvedValue(mockAnalytics);

      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .query({ startDate, endDate })
        .expect(200);

      expect(mockAnalyticsService.getConversationAnalytics).toHaveBeenCalledWith(
        new Types.ObjectId(conversationId),
        {
          start: new Date(startDate),
          end: new Date(endDate),
        }
      );
    });

    it('should return 400 for invalid conversation ID', async () => {
      const response = await request(app)
        .get('/api/analytics/conversation/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid conversation ID',
      });
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .query({ startDate: 'invalid-date', endDate: '2024-01-31' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
      });
    });

    it('should return 400 when start date is after end date', async () => {
      const response = await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .query({ startDate: '2024-01-31T00:00:00.000Z', endDate: '2024-01-01T00:00:00.000Z' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Start date must be before end date',
      });
    });

    it('should handle service errors', async () => {
      mockAnalyticsService.getConversationAnalytics.mockRejectedValue(
        new Error('Conversation not found')
      );

      const response = await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Conversation not found',
      });
    });
  });

  describe('GET /api/analytics/persona/:personaId', () => {
    const personaId = new Types.ObjectId().toString();
    const mockPersonaAnalytics = {
      personaId: new Types.ObjectId(personaId),
      name: 'Test Persona',
      role: 'Project Manager',
      responseMetrics: { totalResponses: 50, averageResponseTime: 2000, responseQuality: 4.2 },
      engagementMetrics: { conversationsStarted: 5, conversationsParticipated: 15, uniqueStudentsInteracted: 8 },
      moodConsistency: { currentMood: 75, moodVariance: 12, moodTrend: [] },
      personalityConsistency: { traitConsistencyScore: 85, communicationStyleScore: 88, roleAdherenceScore: 92 },
    };

    it('should return persona analytics successfully', async () => {
      mockAnalyticsService.getPersonaAnalytics.mockResolvedValue(mockPersonaAnalytics);

      const response = await request(app)
        .get(`/api/analytics/persona/${personaId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPersonaAnalytics,
      });
    });

    it('should return 400 for invalid persona ID', async () => {
      const response = await request(app)
        .get('/api/analytics/persona/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid persona ID',
      });
    });
  });

  describe('GET /api/analytics/team/:projectId', () => {
    const projectId = new Types.ObjectId().toString();
    const mockTeamMetrics = {
      projectId: new Types.ObjectId(projectId),
      projectName: 'Test Project',
      teamSize: 4,
      collaborationScore: 85,
      communicationFrequency: 12.5,
      milestoneProgress: { completed: 3, total: 5, onTime: 2, overdue: 1 },
      participationBalance: [],
      conflictResolution: { totalConflicts: 2, resolvedConflicts: 1, averageResolutionTime: 24 },
    };

    it('should return team performance metrics successfully', async () => {
      mockAnalyticsService.getTeamPerformanceMetrics.mockResolvedValue(mockTeamMetrics);

      const response = await request(app)
        .get(`/api/analytics/team/${projectId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTeamMetrics,
      });
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/analytics/team/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid project ID',
      });
    });
  });

  describe('GET /api/analytics/interactions/:projectId', () => {
    const projectId = new Types.ObjectId().toString();
    const mockInteractionPatterns = {
      timeOfDay: Array.from({ length: 24 }, (_, i) => ({ hour: i, messageCount: Math.floor(Math.random() * 10) })),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
        day,
        messageCount: Math.floor(Math.random() * 20),
      })),
      conversationStarters: [],
      responseChains: { averageChainLength: 3.2, longestChain: 12, quickResponses: 45, delayedResponses: 8 },
      topicClusters: [],
    };

    it('should return interaction patterns successfully', async () => {
      mockAnalyticsService.getInteractionPatterns.mockResolvedValue(mockInteractionPatterns);

      const response = await request(app)
        .get(`/api/analytics/interactions/${projectId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockInteractionPatterns,
      });
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/analytics/interactions/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid project ID',
      });
    });
  });

  describe('GET /api/analytics/department', () => {
    const mockDepartmentAnalytics = {
      totalProjects: 25,
      totalStudents: 150,
      totalInstructors: 12,
      totalPersonas: 75,
      averageProjectDuration: 45,
      systemUsage: { dailyActiveUsers: 89, weeklyActiveUsers: 142, monthlyActiveUsers: 150 },
      performanceDistribution: { excellent: 6, good: 9, average: 8, needsImprovement: 2 },
      technologyAdoption: { aiFeatureUsage: 85, fileUploadUsage: 72, linkSharingUsage: 58, threadingUsage: 34 },
    };

    it('should return department analytics successfully', async () => {
      mockAnalyticsService.getDepartmentAnalytics.mockResolvedValue(mockDepartmentAnalytics);

      const response = await request(app)
        .get('/api/analytics/department')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockDepartmentAnalytics,
      });
    });
  });

  describe('GET /api/analytics/export/:projectId', () => {
    const projectId = new Types.ObjectId().toString();
    const mockExportData = JSON.stringify([
      { id: 1, message: 'Hello', timestamp: '2024-01-01T10:00:00Z' },
      { id: 2, message: 'Hi there!', timestamp: '2024-01-01T10:05:00Z' },
    ]);

    it('should export conversation logs in JSON format by default', async () => {
      mockAnalyticsService.exportConversationLogs.mockResolvedValue(mockExportData);

      const response = await request(app)
        .get(`/api/analytics/export/${projectId}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="conversation-logs-/);
      expect(response.text).toBe(mockExportData);

      expect(mockAnalyticsService.exportConversationLogs).toHaveBeenCalledWith(
        new Types.ObjectId(projectId),
        'json',
        undefined
      );
    });

    it('should export conversation logs in CSV format', async () => {
      const csvData = 'timestamp,message\n2024-01-01T10:00:00Z,Hello\n2024-01-01T10:05:00Z,Hi there!';
      mockAnalyticsService.exportConversationLogs.mockResolvedValue(csvData);

      const response = await request(app)
        .get(`/api/analytics/export/${projectId}`)
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/\.csv"/);
      expect(response.text).toBe(csvData);
    });

    it('should export conversation logs in TXT format', async () => {
      const txtData = '[2024-01-01T10:00:00Z] User: Hello\n[2024-01-01T10:05:00Z] AI: Hi there!';
      mockAnalyticsService.exportConversationLogs.mockResolvedValue(txtData);

      const response = await request(app)
        .get(`/api/analytics/export/${projectId}`)
        .query({ format: 'txt' })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.headers['content-disposition']).toMatch(/\.txt"/);
      expect(response.text).toBe(txtData);
    });

    it('should return 400 for invalid format', async () => {
      const response = await request(app)
        .get(`/api/analytics/export/${projectId}`)
        .query({ format: 'xml' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid format. Supported formats: json, csv, txt',
      });
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/analytics/export/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid project ID',
      });
    });
  });

  describe('GET /api/analytics/overview/:projectId', () => {
    const projectId = new Types.ObjectId().toString();
    const mockTeamMetrics = {
      projectId: new Types.ObjectId(projectId),
      projectName: 'Test Project',
      teamSize: 4,
      collaborationScore: 85,
      communicationFrequency: 12.5,
      milestoneProgress: { completed: 3, total: 5, onTime: 2, overdue: 1 },
      participationBalance: [],
      conflictResolution: { totalConflicts: 2, resolvedConflicts: 1, averageResolutionTime: 24 },
    };
    const mockInteractionPatterns = {
      timeOfDay: [],
      dayOfWeek: [],
      conversationStarters: [],
      responseChains: { averageChainLength: 3.2, longestChain: 12, quickResponses: 45, delayedResponses: 8 },
      topicClusters: [],
    };

    it('should return comprehensive analytics overview', async () => {
      mockAnalyticsService.getTeamPerformanceMetrics.mockResolvedValue(mockTeamMetrics);
      mockAnalyticsService.getInteractionPatterns.mockResolvedValue(mockInteractionPatterns);

      const response = await request(app)
        .get(`/api/analytics/overview/${projectId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          team: mockTeamMetrics,
          interactions: mockInteractionPatterns,
          generatedAt: expect.any(String),
        },
      });

      expect(mockAnalyticsService.getTeamPerformanceMetrics).toHaveBeenCalledWith(
        new Types.ObjectId(projectId),
        undefined
      );
      expect(mockAnalyticsService.getInteractionPatterns).toHaveBeenCalledWith(
        new Types.ObjectId(projectId),
        undefined
      );
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/analytics/overview/invalid-id')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid project ID',
      });
    });
  });

  describe('POST /api/analytics/batch', () => {
    const projectId = new Types.ObjectId().toString();
    const personaId = new Types.ObjectId().toString();

    it('should process batch requests successfully', async () => {
      const mockTeamMetrics = { teamSize: 4, collaborationScore: 85 };
      const mockPersonaAnalytics = { name: 'Test Persona', role: 'Manager' };

      mockAnalyticsService.getTeamPerformanceMetrics.mockResolvedValue(mockTeamMetrics as any);
      mockAnalyticsService.getPersonaAnalytics.mockResolvedValue(mockPersonaAnalytics as any);

      const requests = [
        { type: 'team', id: projectId },
        { type: 'persona', id: personaId },
      ];

      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toEqual({
        success: true,
        type: 'team',
        id: projectId,
        data: mockTeamMetrics,
      });
      expect(response.body.results[1]).toEqual({
        success: true,
        type: 'persona',
        id: personaId,
        data: mockPersonaAnalytics,
      });
    });

    it('should return 400 for empty requests array', async () => {
      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests: [] })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Requests array is required and must not be empty',
      });
    });

    it('should return 400 for too many requests', async () => {
      const requests = Array.from({ length: 11 }, (_, i) => ({
        type: 'team',
        id: new Types.ObjectId().toString(),
      }));

      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Maximum 10 requests allowed per batch',
      });
    });

    it('should handle individual request errors gracefully', async () => {
      const requests = [
        { type: 'team', id: 'invalid-id' },
        { type: 'unknown-type', id: projectId },
        { type: 'team' }, // missing id
      ];

      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(3);
      expect(response.body.results[0].error).toBe('Invalid ObjectId');
      expect(response.body.results[1].error).toBe('Unknown analytics type: unknown-type');
      expect(response.body.results[2].error).toBe('Type and ID are required for each request');
    });

    it('should handle service errors in batch requests', async () => {
      mockAnalyticsService.getTeamPerformanceMetrics.mockRejectedValue(
        new Error('Project not found')
      );

      const requests = [{ type: 'team', id: projectId }];

      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].error).toBe('Project not found');
    });

    it('should handle date ranges in batch requests', async () => {
      const mockData = { teamSize: 4 };
      mockAnalyticsService.getTeamPerformanceMetrics.mockResolvedValue(mockData as any);

      const requests = [
        {
          type: 'team',
          id: projectId,
          dateRange: {
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-31T23:59:59.999Z',
          },
        },
      ];

      const response = await request(app)
        .post('/api/analytics/batch')
        .send({ requests })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results[0].success).toBe(true);

      expect(mockAnalyticsService.getTeamPerformanceMetrics).toHaveBeenCalledWith(
        new Types.ObjectId(projectId),
        {
          start: new Date('2024-01-01T00:00:00.000Z'),
          end: new Date('2024-01-31T23:59:59.999Z'),
        }
      );
    });
  });

  describe('Error handling', () => {
    it('should handle service errors with proper error response', async () => {
      const conversationId = new Types.ObjectId().toString();
      mockAnalyticsService.getConversationAnalytics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get(`/api/analytics/conversation/${conversationId}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Database connection failed',
      });
    });
  });
});