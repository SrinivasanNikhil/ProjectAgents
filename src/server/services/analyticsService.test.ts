import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { analyticsService } from './analyticsService';
import { Types } from 'mongoose';

// Mock models
const mockConversation = {
  findById: jest.fn(),
  find: jest.fn(),
};

const mockMessage = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
};

const mockPersona = {
  findById: jest.fn(),
};

const mockProject = {
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockUser = {
  findById: jest.fn(),
  countDocuments: jest.fn(),
};

const mockMilestone = {
  find: jest.fn(),
};

// Mock mongoose.model
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  model: jest.fn((name: string) => {
    switch (name) {
      case 'Conversation':
        return mockConversation;
      case 'Message':
        return mockMessage;
      case 'Persona':
        return mockPersona;
      case 'Project':
        return mockProject;
      case 'User':
        return mockUser;
      case 'Milestone':
        return mockMilestone;
      default:
        return {};
    }
  }),
}));

describe('AnalyticsService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversationAnalytics', () => {
    const conversationId = new Types.ObjectId();
    const mockConversationData = {
      _id: conversationId,
      title: 'Test Conversation',
      project: new Types.ObjectId(),
    };

    const mockMessages = [
      {
        _id: new Types.ObjectId(),
        conversation: conversationId,
        sender: { type: 'student', id: new Types.ObjectId(), name: 'John' },
        content: 'Hello',
        messageType: 'text',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        metadata: { sentiment: 0.8 },
        isThreadRoot: false,
        threadId: null,
      },
      {
        _id: new Types.ObjectId(),
        conversation: conversationId,
        sender: { type: 'persona', id: new Types.ObjectId(), name: 'AI Assistant' },
        content: 'Hi there!',
        messageType: 'text',
        createdAt: new Date('2024-01-01T10:05:00Z'),
        metadata: { sentiment: 0.9, aiResponseTime: 2000 },
        isThreadRoot: false,
        threadId: null,
      },
      {
        _id: new Types.ObjectId(),
        conversation: conversationId,
        sender: { type: 'student', id: new Types.ObjectId(), name: 'Jane' },
        content: 'How are you?',
        messageType: 'text',
        createdAt: new Date('2024-01-01T10:10:00Z'),
        metadata: { sentiment: 0.7 },
        isThreadRoot: true,
        threadId: new Types.ObjectId(),
      },
    ];

    beforeEach(() => {
      mockConversation.findById.mockResolvedValue(mockConversationData);
      mockMessage.find.mockImplementation((query) => ({
        sort: jest.fn().mockResolvedValue(mockMessages),
      }));
      mockMessage.countDocuments.mockResolvedValue(1);
    });

    it('should calculate conversation analytics correctly', async () => {
      const result = await analyticsService.getConversationAnalytics(conversationId);

      expect(result).toEqual({
        totalMessages: 3,
        messagesPerDay: expect.any(Number),
        averageResponseTime: 5, // 5 minutes average
        activeParticipants: 3,
        sentimentTrend: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(Date),
            averageSentiment: expect.any(Number),
          }),
        ]),
        messageTypes: {
          text: 3,
          file: 0,
          link: 0,
          milestone: 0,
          system: 0,
        },
        threadingUsage: {
          totalThreads: 1,
          averageThreadLength: 1,
          deepestThread: 1,
        },
      });
    });

    it('should handle conversation not found', async () => {
      mockConversation.findById.mockResolvedValue(null);

      await expect(
        analyticsService.getConversationAnalytics(conversationId)
      ).rejects.toThrow('Conversation not found');
    });

    it('should apply date range filter', async () => {
      const dateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
      };

      await analyticsService.getConversationAnalytics(conversationId, dateRange);

      expect(mockMessage.find).toHaveBeenCalledWith({
        conversation: conversationId,
        createdAt: {
          $gte: dateRange.start,
          $lte: dateRange.end,
        },
      });
    });

    it('should handle empty message array', async () => {
      mockMessage.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue([]),
      }));

      const result = await analyticsService.getConversationAnalytics(conversationId);

      expect(result.totalMessages).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.activeParticipants).toBe(0);
    });
  });

  describe('getPersonaAnalytics', () => {
    const personaId = new Types.ObjectId();
    const mockPersonaData = {
      _id: personaId,
      name: 'Test Persona',
      role: 'Project Manager',
      mood: {
        current: 75,
        history: [
          { value: 70, timestamp: new Date('2024-01-01'), reason: 'Initial' },
          { value: 80, timestamp: new Date('2024-01-02'), reason: 'Good progress' },
        ],
      },
    };

    const mockPersonaMessages = [
      {
        _id: new Types.ObjectId(),
        conversation: new Types.ObjectId(),
        sender: { type: 'persona', id: personaId, name: 'Test Persona' },
        content: 'Hello team!',
        messageType: 'text',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        metadata: { aiResponseTime: 1500 },
      },
      {
        _id: new Types.ObjectId(),
        conversation: new Types.ObjectId(),
        sender: { type: 'persona', id: personaId, name: 'Test Persona' },
        content: 'Great work on the project!',
        messageType: 'text',
        createdAt: new Date('2024-01-01T11:00:00Z'),
        metadata: { aiResponseTime: 2000 },
        attachments: [{ type: 'file', filename: 'doc.pdf', url: '/files/doc.pdf', size: 1024, mimeType: 'application/pdf' }],
      },
    ];

    beforeEach(() => {
      mockPersona.findById.mockResolvedValue(mockPersonaData);
      mockMessage.find.mockImplementation((query) => {
        if (query['sender.type'] === 'persona') {
          return {
            sort: jest.fn().mockResolvedValue(mockPersonaMessages),
          };
        }
        return {
          sort: jest.fn().mockResolvedValue([]),
        };
      });
      mockConversation.find.mockResolvedValue([]);
    });

    it('should calculate persona analytics correctly', async () => {
      const result = await analyticsService.getPersonaAnalytics(personaId);

      expect(result).toEqual({
        personaId,
        name: 'Test Persona',
        role: 'Project Manager',
        responseMetrics: {
          totalResponses: 2,
          averageResponseTime: 1750, // (1500 + 2000) / 2
          responseQuality: expect.any(Number),
        },
        engagementMetrics: {
          conversationsStarted: 0,
          conversationsParticipated: 2,
          uniqueStudentsInteracted: 0,
        },
        moodConsistency: {
          currentMood: 75,
          moodVariance: expect.any(Number),
          moodTrend: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(Date),
              mood: expect.any(Number),
            }),
          ]),
        },
        personalityConsistency: {
          traitConsistencyScore: expect.any(Number),
          communicationStyleScore: expect.any(Number),
          roleAdherenceScore: expect.any(Number),
        },
      });
    });

    it('should handle persona not found', async () => {
      mockPersona.findById.mockResolvedValue(null);

      await expect(
        analyticsService.getPersonaAnalytics(personaId)
      ).rejects.toThrow('Persona not found');
    });

    it('should apply date range filter for persona messages', async () => {
      const dateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
      };

      await analyticsService.getPersonaAnalytics(personaId, dateRange);

      expect(mockMessage.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'sender.type': 'persona',
          'sender.id': personaId,
          createdAt: {
            $gte: dateRange.start,
            $lte: dateRange.end,
          },
        })
      );
    });
  });

  describe('getTeamPerformanceMetrics', () => {
    const projectId = new Types.ObjectId();
    const student1Id = new Types.ObjectId();
    const student2Id = new Types.ObjectId();

    const mockProjectData = {
      _id: projectId,
      name: 'Test Project',
      students: [student1Id, student2Id],
      createdAt: new Date('2024-01-01'),
    };

    const mockConversations = [
      { _id: new Types.ObjectId(), project: projectId },
      { _id: new Types.ObjectId(), project: projectId },
    ];

    const mockMessages = [
      {
        sender: { type: 'student', id: student1Id },
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        sender: { type: 'student', id: student2Id },
        createdAt: new Date('2024-01-01T10:05:00Z'),
      },
      {
        sender: { type: 'student', id: student1Id },
        createdAt: new Date('2024-01-01T10:10:00Z'),
      },
    ];

    const mockMilestones = [
      { _id: new Types.ObjectId(), project: projectId, status: 'completed', completedAt: new Date('2024-01-15'), dueDate: new Date('2024-01-20') },
      { _id: new Types.ObjectId(), project: projectId, status: 'in_progress', dueDate: new Date('2024-01-10') },
    ];

    const mockUsers = [
      { _id: student1Id, name: 'John Doe' },
      { _id: student2Id, name: 'Jane Smith' },
    ];

    beforeEach(() => {
      mockProject.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProjectData),
      }));
      mockConversation.find.mockResolvedValue(mockConversations);
      mockMessage.find.mockResolvedValue(mockMessages);
      mockMilestone.find.mockResolvedValue(mockMilestones);
      mockUser.findById.mockImplementation((id) => 
        Promise.resolve(mockUsers.find(u => u._id.equals(id)))
      );
    });

    it('should calculate team performance metrics correctly', async () => {
      const result = await analyticsService.getTeamPerformanceMetrics(projectId);

      expect(result).toEqual({
        projectId,
        projectName: 'Test Project',
        teamSize: 2,
        collaborationScore: expect.any(Number),
        communicationFrequency: expect.any(Number),
        milestoneProgress: {
          completed: 1,
          total: 2,
          onTime: 1,
          overdue: 1,
        },
        participationBalance: expect.arrayContaining([
          expect.objectContaining({
            studentId: student1Id,
            studentName: 'John Doe',
            messageCount: 2,
            participationPercentage: expect.any(Number),
            lastActivity: expect.any(Date),
          }),
          expect.objectContaining({
            studentId: student2Id,
            studentName: 'Jane Smith',
            messageCount: 1,
            participationPercentage: expect.any(Number),
            lastActivity: expect.any(Date),
          }),
        ]),
        conflictResolution: {
          totalConflicts: 0,
          resolvedConflicts: 0,
          averageResolutionTime: 0,
        },
      });
    });

    it('should handle project not found', async () => {
      mockProject.findById.mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await expect(
        analyticsService.getTeamPerformanceMetrics(projectId)
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getInteractionPatterns', () => {
    const projectId = new Types.ObjectId();
    const mockConversations = [
      { _id: new Types.ObjectId(), project: projectId },
    ];

    const mockMessages = [
      {
        createdAt: new Date('2024-01-01T09:00:00Z'), // Monday, 9 AM
        sender: { id: new Types.ObjectId() },
      },
      {
        createdAt: new Date('2024-01-01T14:00:00Z'), // Monday, 2 PM
        sender: { id: new Types.ObjectId() },
      },
      {
        createdAt: new Date('2024-01-02T10:00:00Z'), // Tuesday, 10 AM
        sender: { id: new Types.ObjectId() },
      },
    ];

    beforeEach(() => {
      mockConversation.find.mockResolvedValue(mockConversations);
      mockMessage.find.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(mockMessages),
      }));
      mockMessage.findOne.mockImplementation(() => ({
        sort: jest.fn().mockResolvedValue(null),
      }));
    });

    it('should calculate interaction patterns correctly', async () => {
      const result = await analyticsService.getInteractionPatterns(projectId);

      expect(result).toEqual({
        timeOfDay: expect.arrayContaining([
          expect.objectContaining({
            hour: expect.any(Number),
            messageCount: expect.any(Number),
          }),
        ]),
        dayOfWeek: expect.arrayContaining([
          expect.objectContaining({
            day: expect.any(String),
            messageCount: expect.any(Number),
          }),
        ]),
        conversationStarters: expect.any(Array),
        responseChains: {
          averageChainLength: expect.any(Number),
          longestChain: 0,
          quickResponses: 0,
          delayedResponses: 0,
        },
        topicClusters: expect.arrayContaining([
          expect.objectContaining({
            topic: expect.any(String),
            frequency: expect.any(Number),
            participants: expect.any(Array),
          }),
        ]),
      });
    });

    it('should have 24 time slots and 7 day slots', async () => {
      const result = await analyticsService.getInteractionPatterns(projectId);

      expect(result.timeOfDay).toHaveLength(24);
      expect(result.dayOfWeek).toHaveLength(7);
    });
  });

  describe('getDepartmentAnalytics', () => {
    beforeEach(() => {
      mockProject.countDocuments.mockResolvedValue(10);
      mockUser.countDocuments.mockImplementation((query) => {
        if (query.role === 'student') return Promise.resolve(100);
        if (query.role === 'instructor') return Promise.resolve(15);
        return Promise.resolve(0);
      });
      mockPersona.countDocuments.mockResolvedValue(50);
      mockProject.find.mockResolvedValue([
        {
          status: 'completed',
          timeline: {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
          },
        },
        {
          status: 'completed',
          timeline: {
            startDate: new Date('2024-02-01'),
            endDate: new Date('2024-02-28'),
          },
        },
      ]);
      mockMessage.find.mockResolvedValue([
        { messageType: 'text', sender: { type: 'persona' }, metadata: { aiResponseTime: 1000 } },
        { messageType: 'file', sender: { type: 'student' } },
        { messageType: 'link', sender: { type: 'student' } },
        { messageType: 'text', sender: { type: 'student' }, threadId: new Types.ObjectId() },
      ]);
    });

    it('should calculate department analytics correctly', async () => {
      const result = await analyticsService.getDepartmentAnalytics();

      expect(result).toEqual({
        totalProjects: 10,
        totalStudents: 100,
        totalInstructors: 15,
        totalPersonas: 50,
        averageProjectDuration: 29.5, // Average of 31 and 28 days
        systemUsage: {
          dailyActiveUsers: expect.any(Number),
          weeklyActiveUsers: expect.any(Number),
          monthlyActiveUsers: expect.any(Number),
        },
        performanceDistribution: {
          excellent: 3, // 25% of 10 rounded
          good: 4, // 35% of 10 rounded
          average: 3, // 30% of 10 rounded
          needsImprovement: 1, // 10% of 10 rounded
        },
        technologyAdoption: {
          aiFeatureUsage: 25, // 1 out of 4 messages
          fileUploadUsage: 25, // 1 out of 4 messages
          linkSharingUsage: 25, // 1 out of 4 messages
          threadingUsage: 25, // 1 out of 4 messages
        },
      });
    });

    it('should handle empty data correctly', async () => {
      mockProject.countDocuments.mockResolvedValue(0);
      mockUser.countDocuments.mockResolvedValue(0);
      mockPersona.countDocuments.mockResolvedValue(0);
      mockProject.find.mockResolvedValue([]);
      mockMessage.find.mockResolvedValue([]);

      const result = await analyticsService.getDepartmentAnalytics();

      expect(result.totalProjects).toBe(0);
      expect(result.totalStudents).toBe(0);
      expect(result.totalInstructors).toBe(0);
      expect(result.totalPersonas).toBe(0);
      expect(result.averageProjectDuration).toBe(0);
    });
  });

  describe('exportConversationLogs', () => {
    const projectId = new Types.ObjectId();
    const mockConversations = [
      { _id: new Types.ObjectId(), project: projectId, title: 'Test Conversation' },
    ];

    const mockMessages = [
      {
        createdAt: new Date('2024-01-01T10:00:00Z'),
        conversation: { title: 'Test Conversation' },
        sender: { type: 'student', name: 'John' },
        messageType: 'text',
        content: 'Hello world',
        threadId: null,
        metadata: { aiResponseTime: null },
      },
      {
        createdAt: new Date('2024-01-01T10:05:00Z'),
        conversation: { title: 'Test Conversation' },
        sender: { type: 'persona', name: 'AI Assistant' },
        messageType: 'text',
        content: 'Hi there!',
        threadId: null,
        metadata: { aiResponseTime: 1500 },
      },
    ];

    beforeEach(() => {
      mockConversation.find.mockResolvedValue(mockConversations);
      mockMessage.find.mockImplementation(() => ({
        sort: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockMessages),
        })),
      }));
    });

    it('should export logs in JSON format by default', async () => {
      const result = await analyticsService.exportConversationLogs(projectId);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
    });

    it('should export logs in CSV format', async () => {
      const result = await analyticsService.exportConversationLogs(projectId, 'csv');
      
      expect(result).toContain('Timestamp,Conversation,Sender Type');
      expect(result).toContain('John');
      expect(result).toContain('AI Assistant');
    });

    it('should export logs in TXT format', async () => {
      const result = await analyticsService.exportConversationLogs(projectId, 'txt');
      
      expect(result).toContain('John (student): Hello world');
      expect(result).toContain('AI Assistant (persona): Hi there!');
    });

    it('should apply date range filter for export', async () => {
      const dateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
      };

      await analyticsService.exportConversationLogs(projectId, 'json', dateRange);

      expect(mockMessage.find).toHaveBeenCalledWith({
        conversation: { $in: expect.any(Array) },
        createdAt: {
          $gte: dateRange.start,
          $lte: dateRange.end,
        },
      });
    });
  });
});