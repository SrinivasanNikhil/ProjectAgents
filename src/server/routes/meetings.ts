import express from 'express';
import { meetingService } from '../services/meetingService';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';
import { logger } from '../config/logger';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/meetings
 * @desc Create a new meeting
 * @access Instructor, Administrator
 */
router.post(
  '/',
  requireRole(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const meetingData = {
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate),
      };

      const meeting = await meetingService.createMeeting(meetingData);

      res.status(201).json({
        success: true,
        data: meeting,
        message: 'Meeting created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating meeting:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create meeting',
      });
    }
  }
);

/**
 * @route GET /api/meetings/:id
 * @desc Get meeting by ID
 * @access All authenticated users
 */
router.get('/:id', async (req, res) => {
  try {
    const meeting = await meetingService.getMeeting(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    res.json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    logger.error('Error getting meeting:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get meeting',
    });
  }
});

/**
 * @route GET /api/meetings/project/:projectId
 * @desc Get meetings for a project
 * @access Project participants
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    const result = await meetingService.getProjectMeetings(
      projectId,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result.meetings,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    logger.error('Error getting project meetings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get project meetings',
    });
  }
});

/**
 * @route GET /api/meetings/user/:userId
 * @desc Get meetings for a user
 * @access User can only access their own meetings
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    // Check if user is accessing their own meetings
    if (
      req.user?.id !== userId &&
      !['instructor', 'administrator'].includes(req.user?.role || '')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await meetingService.getUserMeetings(
      userId,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result.meetings,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error: any) {
    logger.error('Error getting user meetings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user meetings',
    });
  }
});

/**
 * @route GET /api/meetings/project/:projectId/upcoming
 * @desc Get upcoming meetings for a project
 * @access Project participants
 */
router.get('/project/:projectId/upcoming', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    const meetings = await meetingService.getUpcomingMeetings(
      projectId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: meetings,
    });
  } catch (error: any) {
    logger.error('Error getting upcoming meetings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get upcoming meetings',
    });
  }
});

/**
 * @route GET /api/meetings/project/:projectId/statistics
 * @desc Get meeting statistics for a project
 * @access Project participants
 */
router.get('/project/:projectId/statistics', async (req, res) => {
  try {
    const { projectId } = req.params;

    const statistics = await meetingService.getMeetingStatistics(projectId);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    logger.error('Error getting meeting statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get meeting statistics',
    });
  }
});

/**
 * @route PUT /api/meetings/:id
 * @desc Update meeting
 * @access Instructor, Administrator
 */
router.put(
  '/:id',
  requireRole(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        scheduledDate: req.body.scheduledDate
          ? new Date(req.body.scheduledDate)
          : undefined,
      };

      const meeting = await meetingService.updateMeeting(
        req.params.id,
        updateData
      );

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating meeting:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update meeting',
      });
    }
  }
);

/**
 * @route POST /api/meetings/:id/participants
 * @desc Add participant to meeting
 * @access Instructor, Administrator
 */
router.post(
  '/:id/participants',
  roleCheckMiddleware(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const { type, id, name, email, role } = req.body;

      const meeting = await meetingService.addParticipant(
        req.params.id,
        type,
        id,
        name,
        email,
        role
      );

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Participant added successfully',
      });
    } catch (error: any) {
      logger.error('Error adding participant:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add participant',
      });
    }
  }
);

/**
 * @route PUT /api/meetings/:id/participants/:participantId/status
 * @desc Update participant status
 * @access Meeting participants
 */
router.put('/:id/participants/:participantId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id, participantId } = req.params;

    // Check if user is the participant or has admin access
    if (
      req.user?.id !== participantId &&
      !['instructor', 'administrator'].includes(req.user?.role || '')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const meeting = await meetingService.updateParticipantStatus(
      id,
      participantId,
      status
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Participant status updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating participant status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update participant status',
    });
  }
});

/**
 * @route POST /api/meetings/:id/start
 * @desc Start meeting
 * @access Instructor, Administrator
 */
router.post(
  '/:id/start',
  roleCheckMiddleware(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const meeting = await meetingService.startMeeting(req.params.id);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting started successfully',
      });
    } catch (error: any) {
      logger.error('Error starting meeting:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start meeting',
      });
    }
  }
);

/**
 * @route POST /api/meetings/:id/end
 * @desc End meeting
 * @access Instructor, Administrator
 */
router.post(
  '/:id/end',
  roleCheckMiddleware(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const meeting = await meetingService.endMeeting(req.params.id);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting ended successfully',
      });
    } catch (error: any) {
      logger.error('Error ending meeting:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to end meeting',
      });
    }
  }
);

/**
 * @route POST /api/meetings/:id/cancel
 * @desc Cancel meeting
 * @access Instructor, Administrator
 */
router.post(
  '/:id/cancel',
  roleCheckMiddleware(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const meeting = await meetingService.cancelMeeting(req.params.id, reason);

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Meeting cancelled successfully',
      });
    } catch (error: any) {
      logger.error('Error cancelling meeting:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel meeting',
      });
    }
  }
);

/**
 * @route POST /api/meetings/:id/action-items
 * @desc Add action item to meeting
 * @access Instructor, Administrator
 */
router.post(
  '/:id/action-items',
  roleCheckMiddleware(['instructor', 'administrator']),
  async (req, res) => {
    try {
      const { description, assignedTo, dueDate } = req.body;

      const meeting = await meetingService.addActionItem(
        req.params.id,
        description,
        assignedTo,
        dueDate ? new Date(dueDate) : undefined
      );

      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }

      res.json({
        success: true,
        data: meeting,
        message: 'Action item added successfully',
      });
    } catch (error: any) {
      logger.error('Error adding action item:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add action item',
      });
    }
  }
);

/**
 * @route POST /api/meetings/:id/feedback
 * @desc Add feedback to meeting
 * @access Meeting participants
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { from, to, rating, comments } = req.body;

    // Check if user is the feedback provider or has admin access
    if (
      req.user?.id !== from &&
      !['instructor', 'administrator'].includes(req.user?.role || '')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const meeting = await meetingService.addFeedback(
      req.params.id,
      from,
      to,
      rating,
      comments
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    res.json({
      success: true,
      data: meeting,
      message: 'Feedback added successfully',
    });
  } catch (error: any) {
    logger.error('Error adding feedback:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add feedback',
    });
  }
});

export default router;
