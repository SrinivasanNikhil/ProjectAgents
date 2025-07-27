import express from 'express';
import { Types } from 'mongoose';
import { analyticsService } from '../services/analyticsService';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = express.Router();

// Apply authentication to all analytics routes
router.use(authenticateToken);

/**
 * @route GET /api/analytics/conversation/:conversationId
 * @desc Get analytics for a specific conversation
 * @access Private (Student/Instructor)
 */
router.get('/conversation/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate conversation ID
    if (!Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }

      if (dateRange.start > dateRange.end) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date',
        });
      }
    }

    const analytics = await analyticsService.getConversationAnalytics(
      new Types.ObjectId(conversationId),
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/persona/:personaId
 * @desc Get analytics for a specific persona
 * @access Private (Instructor)
 */
router.get('/persona/:personaId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { personaId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate persona ID
    if (!Types.ObjectId.isValid(personaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid persona ID',
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }
    }

    const analytics = await analyticsService.getPersonaAnalytics(
      new Types.ObjectId(personaId),
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/team/:projectId
 * @desc Get team performance metrics for a project
 * @access Private (Instructor)
 */
router.get('/team/:projectId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate project ID
    if (!Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }
    }

    const analytics = await analyticsService.getTeamPerformanceMetrics(
      new Types.ObjectId(projectId),
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/interactions/:projectId
 * @desc Get interaction patterns for a project
 * @access Private (Instructor)
 */
router.get('/interactions/:projectId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate project ID
    if (!Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }
    }

    const analytics = await analyticsService.getInteractionPatterns(
      new Types.ObjectId(projectId),
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/department
 * @desc Get department-wide analytics
 * @access Private (Admin/Instructor)
 */
router.get('/department', requireRole(['admin', 'instructor']), async (req, res, next) => {
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
 * @route GET /api/analytics/export/:projectId
 * @desc Export conversation logs for a project
 * @access Private (Instructor)
 */
router.get('/export/:projectId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    // Validate project ID
    if (!Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Validate format
    const validFormats = ['json', 'csv', 'txt'];
    if (!validFormats.includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Supported formats: ${validFormats.join(', ')}`,
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }
    }

    const exportData = await analyticsService.exportConversationLogs(
      new Types.ObjectId(projectId),
      format as 'json' | 'csv' | 'txt',
      dateRange
    );

    // Set appropriate content type and headers
    let contentType: string;
    let fileExtension: string;
    
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'txt':
        contentType = 'text/plain';
        fileExtension = 'txt';
        break;
      default:
        contentType = 'application/json';
        fileExtension = 'json';
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `conversation-logs-${projectId}-${timestamp}.${fileExtension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/summary/:userId
 * @desc Get analytics summary for instructor dashboard
 * @access Private (Instructor)
 */
router.get('/summary/:userId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mock data for now - in real implementation, this would aggregate across all projects for the instructor
    const summaryData = {
      totalProjects: 5,
      activeProjects: 3,
      totalStudents: 25,
      totalPersonas: 15,
      totalConversations: 120,
      averageEngagement: 0.85,
      recentActivity: [
        {
          type: 'message',
          description: 'New message in Project Alpha',
          timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
        },
        {
          type: 'milestone',
          description: 'Milestone completed in Project Beta',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
        }
      ]
    };

    res.json(summaryData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/conversations/summary/:userId
 * @desc Get conversation analytics summary
 * @access Private (Instructor)
 */
router.get('/conversations/summary/:userId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mock data for now
    const conversationData = {
      conversations: [
        {
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
        }
      ]
    };

    res.json(conversationData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/personas/summary/:userId
 * @desc Get persona analytics summary
 * @access Private (Instructor)
 */
router.get('/personas/summary/:userId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mock data for now
    const personaData = {
      personas: [
        {
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
        }
      ]
    };

    res.json(personaData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/teams/performance/:userId
 * @desc Get team performance analytics
 * @access Private (Instructor)
 */
router.get('/teams/performance/:userId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mock data for now
    const teamData = {
      teams: [
        {
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
        }
      ]
    };

    res.json(teamData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/interactions/patterns/:userId
 * @desc Get interaction pattern analytics
 * @access Private (Instructor)
 */
router.get('/interactions/patterns/:userId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Mock data for now
    const patternData = {
      timeOfDay: [
        { hour: 9, messageCount: 5 },
        { hour: 10, messageCount: 8 },
        { hour: 11, messageCount: 12 },
        { hour: 14, messageCount: 15 }
      ],
      dayOfWeek: [
        { day: 'Monday', messageCount: 25 },
        { day: 'Tuesday', messageCount: 30 },
        { day: 'Wednesday', messageCount: 22 }
      ],
      responseChains: {
        averageChainLength: 3.5,
        longestChain: 8,
        quickResponses: 45,
        delayedResponses: 12
      }
    };

    res.json(patternData);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/analytics/overview/:projectId
 * @desc Get comprehensive analytics overview for a project
 * @access Private (Instructor)
 */
router.get('/overview/:projectId', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate project ID
    if (!Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Parse optional date range
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      };

      // Validate dates
      if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
        });
      }
    }

    const projectObjectId = new Types.ObjectId(projectId);

    // Get all analytics for the project
    const [teamMetrics, interactionPatterns] = await Promise.all([
      analyticsService.getTeamPerformanceMetrics(projectObjectId, dateRange),
      analyticsService.getInteractionPatterns(projectObjectId, dateRange),
    ]);

    res.json({
      success: true,
      data: {
        team: teamMetrics,
        interactions: interactionPatterns,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/analytics/batch
 * @desc Get analytics for multiple entities in batch
 * @access Private (Instructor)
 */
router.post('/batch', requireRole(['instructor']), async (req, res, next) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Requests array is required and must not be empty',
      });
    }

    if (requests.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 requests allowed per batch',
      });
    }

    const results = [];

    for (const request of requests) {
      try {
        const { type, id, dateRange } = request;

        if (!type || !id) {
          results.push({
            error: 'Type and ID are required for each request',
            request,
          });
          continue;
        }

        if (!Types.ObjectId.isValid(id)) {
          results.push({
            error: 'Invalid ObjectId',
            request,
          });
          continue;
        }

        let parsedDateRange;
        if (dateRange && dateRange.start && dateRange.end) {
          parsedDateRange = {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end),
          };

          if (isNaN(parsedDateRange.start.getTime()) || isNaN(parsedDateRange.end.getTime())) {
            results.push({
              error: 'Invalid date format in dateRange',
              request,
            });
            continue;
          }
        }

        const objectId = new Types.ObjectId(id);
        let data;

        switch (type) {
          case 'conversation':
            data = await analyticsService.getConversationAnalytics(objectId, parsedDateRange);
            break;
          case 'persona':
            data = await analyticsService.getPersonaAnalytics(objectId, parsedDateRange);
            break;
          case 'team':
            data = await analyticsService.getTeamPerformanceMetrics(objectId, parsedDateRange);
            break;
          case 'interactions':
            data = await analyticsService.getInteractionPatterns(objectId, parsedDateRange);
            break;
          default:
            results.push({
              error: `Unknown analytics type: ${type}`,
              request,
            });
            continue;
        }

        results.push({
          success: true,
          type,
          id,
          data,
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : 'Unknown error',
          request,
        });
      }
    }

    res.json({
      success: true,
      results,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;