import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/roleCheck';
import { moderationService } from '../services/moderationService';
import { logger } from '../config/logger';
import { Types } from 'mongoose';

const router = express.Router();

/**
 * @route POST /api/moderation/analyze
 * @desc Analyze message content for inappropriate content
 * @access Private (instructor/admin)
 */
router.post(
  '/analyze',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Content is required and must be a string',
          code: 'INVALID_CONTENT',
        });
      }

      const analysis = await moderationService.analyzeContent(content);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      logger.error('Content analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/moderation/flag
 * @desc Flag a message for moderation review
 * @access Private
 */
router.post('/flag', authenticateToken, async (req: any, res: Response) => {
  try {
    const { messageId, reason, severity = 'medium' } = req.body;
    const flaggedBy = req.user.id;

    if (!messageId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and reason are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }

    if (!Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
        code: 'INVALID_MESSAGE_ID',
      });
    }

    const flaggedMessage = await moderationService.flagMessage(
      messageId,
      flaggedBy,
      reason,
      severity
    );

    res.status(201).json({
      success: true,
      message: 'Message flagged successfully',
      flaggedMessage,
    });
  } catch (error) {
    logger.error('Flag message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * @route GET /api/moderation/flagged
 * @desc Get flagged messages for moderation review
 * @access Private (instructor/admin)
 */
router.get(
  '/flagged',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const status =
        (req.query.status as 'pending' | 'reviewed' | 'resolved') || 'pending';
      const limit = parseInt(req.query.limit as string) || 50;

      const flaggedMessages = await moderationService.getFlaggedMessages(
        status,
        limit
      );

      res.json({
        success: true,
        flaggedMessages,
        count: flaggedMessages.length,
      });
    } catch (error) {
      logger.error('Get flagged messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/moderation/action
 * @desc Take moderation action on a message
 * @access Private (instructor/admin)
 */
router.post(
  '/action',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const { messageId, action, notes } = req.body;
      const moderatorId = req.user.id;

      if (!messageId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Message ID and action are required',
          code: 'MISSING_REQUIRED_FIELDS',
        });
      }

      if (!Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message ID',
          code: 'INVALID_MESSAGE_ID',
        });
      }

      if (!['warn', 'delete', 'timeout', 'none'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
          code: 'INVALID_ACTION',
        });
      }

      const success = await moderationService.takeModerationAction(
        messageId,
        action,
        moderatorId,
        notes
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
          code: 'MESSAGE_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Moderation action taken successfully',
      });
    } catch (error) {
      logger.error('Moderation action error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/moderation/filters
 * @desc Get all content filters
 * @access Private (instructor/admin)
 */
router.get(
  '/filters',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const filters = moderationService.getContentFilters();

      res.json({
        success: true,
        filters,
        count: filters.length,
      });
    } catch (error) {
      logger.error('Get content filters error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/moderation/filters
 * @desc Add a new content filter
 * @access Private (instructor/admin)
 */
router.post(
  '/filters',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const {
        type,
        pattern,
        action,
        replacement,
        severity,
        enabled = true,
      } = req.body;

      if (!type || !pattern || !action || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Type, pattern, action, and severity are required',
          code: 'MISSING_REQUIRED_FIELDS',
        });
      }

      if (!['keyword', 'regex', 'ai'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filter type',
          code: 'INVALID_FILTER_TYPE',
        });
      }

      if (!['flag', 'block', 'replace'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
          code: 'INVALID_ACTION',
        });
      }

      if (!['low', 'medium', 'high'].includes(severity)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid severity level',
          code: 'INVALID_SEVERITY',
        });
      }

      const filter = await moderationService.addContentFilter({
        type,
        pattern,
        action,
        replacement,
        severity,
        enabled,
      });

      res.status(201).json({
        success: true,
        message: 'Content filter added successfully',
        filter,
      });
    } catch (error) {
      logger.error('Add content filter error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route PUT /api/moderation/filters/:filterId
 * @desc Update a content filter
 * @access Private (instructor/admin)
 */
router.put(
  '/filters/:filterId',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const { filterId } = req.params;
      const updates = req.body;

      const filter = await moderationService.updateContentFilter(
        filterId,
        updates
      );

      if (!filter) {
        return res.status(404).json({
          success: false,
          message: 'Filter not found',
          code: 'FILTER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Content filter updated successfully',
        filter,
      });
    } catch (error) {
      logger.error('Update content filter error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route DELETE /api/moderation/filters/:filterId
 * @desc Delete a content filter
 * @access Private (instructor/admin)
 */
router.delete(
  '/filters/:filterId',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const { filterId } = req.params;

      const success = await moderationService.deleteContentFilter(filterId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Filter not found',
          code: 'FILTER_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Content filter deleted successfully',
      });
    } catch (error) {
      logger.error('Delete content filter error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/moderation/timeout/:userId
 * @desc Check if user is timed out
 * @access Private (instructor/admin)
 */
router.get(
  '/timeout/:userId',
  authenticateToken,
  requirePermission('conversation:moderate'),
  async (req: any, res: Response) => {
    try {
      const { userId } = req.params;

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          code: 'INVALID_USER_ID',
        });
      }

      const isTimedOut = await moderationService.isUserTimedOut(userId);

      res.json({
        success: true,
        isTimedOut,
      });
    } catch (error) {
      logger.error('Check user timeout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
