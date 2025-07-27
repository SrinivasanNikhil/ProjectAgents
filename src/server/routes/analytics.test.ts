import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import analyticsRoutes from './analytics';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

// Mock the middleware
vi.mock('../middleware/auth');
vi.mock('../middleware/roleCheck');

const mockAuthenticateToken = vi.mocked(authenticateToken);
const mockRequireRole = vi.mocked(requireRole);

describe('Analytics Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware to pass through
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      req.user = { id: 'user123', role: 'instructor' };
      next();
    });

    // Mock role middleware to pass through for instructor
    mockRequireRole.mockImplementation((roles) => (req, res, next) => {
      next();
    });

    app.use('/api/analytics', analyticsRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/analytics/summary/:userId', () => {
    it('should return analytics summary for instructor', async () => {
      const response = await request(app)
        .get('/api/analytics/summary/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        totalProjects: expect.any(Number),
        activeProjects: expect.any(Number),
        totalStudents: expect.any(Number),
        totalPersonas: expect.any(Number),
        totalConversations: expect.any(Number),
        averageEngagement: expect.any(Number),
        recentActivity: expect.any(Array)
      });

      expect(response.body.recentActivity).toHaveLength(2);
      expect(response.body.recentActivity[0]).toMatchObject({
        type: 'message',
        description: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('GET /api/analytics/conversations/summary/:userId', () => {
    it('should return conversation analytics summary', async () => {
      const response = await request(app)
        .get('/api/analytics/conversations/summary/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        conversations: expect.any(Array)
      });

      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.conversations[0]).toMatchObject({
        totalMessages: 50,
        messagesPerDay: 5.5,
        averageResponseTime: 12.5,
        activeParticipants: 4,
        messageTypes: {
          text: 40,
          file: 6,
          link: 3,
          milestone: 1,
          system: 0
        }
      });
    });
  });

  describe('GET /api/analytics/personas/summary/:userId', () => {
    it('should return persona analytics summary', async () => {
      const response = await request(app)
        .get('/api/analytics/personas/summary/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        personas: expect.any(Array)
      });

      expect(response.body.personas).toHaveLength(1);
      expect(response.body.personas[0]).toMatchObject({
        personaId: 'persona1',
        name: 'Dr. Smith',
        role: 'Project Manager',
        responseMetrics: {
          totalResponses: 25,
          averageResponseTime: 8.5,
          responseQuality: 8.2
        },
        engagementMetrics: {
          conversationsStarted: 5,
          conversationsParticipated: 8,
          uniqueStudentsInteracted: 12
        }
      });
    });
  });

  describe('GET /api/analytics/teams/performance/:userId', () => {
    it('should return team performance analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/teams/performance/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        teams: expect.any(Array)
      });

      expect(response.body.teams).toHaveLength(1);
      expect(response.body.teams[0]).toMatchObject({
        projectId: 'project1',
        projectName: 'AI Project',
        teamSize: 4,
        collaborationScore: 85.5,
        communicationFrequency: 12.3,
        milestoneProgress: {
          completed: 3,
          total: 5,
          onTime: 2,
          overdue: 1
        }
      });
    });
  });

  describe('GET /api/analytics/interactions/patterns/:userId', () => {
    it('should return interaction pattern analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/interactions/patterns/user123')
        .expect(200);

      expect(response.body).toMatchObject({
        timeOfDay: expect.any(Array),
        dayOfWeek: expect.any(Array),
        responseChains: expect.any(Object)
      });

      expect(response.body.timeOfDay).toHaveLength(4);
      expect(response.body.timeOfDay[0]).toMatchObject({
        hour: expect.any(Number),
        messageCount: expect.any(Number)
      });

      expect(response.body.dayOfWeek).toHaveLength(3);
      expect(response.body.dayOfWeek[0]).toMatchObject({
        day: expect.any(String),
        messageCount: expect.any(Number)
      });

      expect(response.body.responseChains).toMatchObject({
        averageChainLength: 3.5,
        longestChain: 8,
        quickResponses: 45,
        delayedResponses: 12
      });
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock authentication to fail
      mockAuthenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/analytics/summary/user123')
        .expect(401);
    });
  });
});