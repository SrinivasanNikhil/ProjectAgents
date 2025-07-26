import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/roleCheck';
import { uploadFileWithValidation } from '../middleware/fileUpload';
import { ChatService } from '../services/chatService';
import { FileService } from '../services/fileService';
import { initializeFileStorage } from '../config/fileStorage';
import { Project } from '../models/Project';

const router = express.Router();

// Initialize services
const chatService = new ChatService();
const fileStorage = initializeFileStorage();
const fileService = new FileService(
  fileStorage.config,
  fileStorage.s3Client,
  fileStorage.localStorage
);

/**
 * @route POST /api/chat/upload
 * @desc Upload a file for chat
 * @access Private
 */
router.post(
  '/upload',
  authenticateToken,
  requirePermission('artifact:write'),
  uploadFileWithValidation,
  async (req: any, res: Response) => {
    try {
      const { projectId, message } = req.body;
      const uploadedBy = req.user.id;

      // Validate project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      // Check if user has access to the project
      if (
        !project.students.includes(uploadedBy) &&
        project.instructor.toString() !== uploadedBy
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Upload file
      const uploadResult = await fileService.uploadFile(
        req.file,
        new Types.ObjectId(projectId),
        new Types.ObjectId(uploadedBy),
        {
          name: req.file.originalname,
          description: `Uploaded via chat${message ? `: ${message}` : ''}`,
          category: 'chat',
        }
      );

      if (!uploadResult.success) {
        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: uploadResult.error,
          code: 'UPLOAD_FAILED',
        });
      }

      // Send chat message with file
      const chatMessage = await chatService.sendMessage({
        projectId,
        userId: uploadedBy,
        userEmail: req.user.email,
        userRole: req.user.role,
        message: `📎 ${req.file.originalname}`,
        type: 'file',
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          artifactId: uploadResult.artifact?._id?.toString() || '',
        },
        // Threading defaults
        threadDepth: 0,
        threadPosition: 0,
        isThreadRoot: false,
        threadMessageCount: 0,
      });

      logger.info(
        `Chat file uploaded: ${req.file.originalname} by user ${uploadedBy}`
      );

      res.status(201).json({
        success: true,
        message: 'File uploaded and sent to chat',
        artifact: uploadResult.artifact,
        chatMessage,
      });
    } catch (error) {
      logger.error('Chat file upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/chat/history/:projectId
 * @desc Get chat history for a project
 * @access Private
 */
router.get(
  '/history/:projectId',
  authenticateToken,
  requirePermission('conversation:read'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(userId) &&
        project.instructor.toString() !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Get chat history
      const messages = await chatService.getConversationHistory(
        projectId,
        limit,
        offset
      );

      res.json({
        success: true,
        messages,
        pagination: {
          limit,
          offset,
          hasMore: messages.length === limit,
        },
      });
    } catch (error) {
      logger.error('Get chat history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/chat/search/:projectId
 * @desc Search messages in a project
 * @access Private
 */
router.get(
  '/search/:projectId',
  authenticateToken,
  requirePermission('conversation:read'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          code: 'MISSING_QUERY',
        });
      }

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(req.user.id) &&
        project.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Search messages
      const messages = await chatService.searchMessages(
        projectId,
        query.trim(),
        limit
      );

      res.json({
        success: true,
        messages,
        query: query.trim(),
        count: messages.length,
      });
    } catch (error) {
      logger.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/chat/threads/:projectId
 * @desc Create a new thread from a message
 * @access Private
 */
router.post(
  '/threads/:projectId',
  authenticateToken,
  requirePermission('conversation:write'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const { messageId, title } = req.body;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Validate message ID
      if (!Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message ID',
          code: 'INVALID_MESSAGE_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(req.user.id) &&
        project.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Create thread
      const threadMessage = await chatService.createThread(
        projectId,
        messageId,
        title
      );

      res.json({
        success: true,
        message: threadMessage,
      });
    } catch (error) {
      logger.error('Create thread error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/chat/threads/:projectId/:messageId/reply
 * @desc Reply to a message in a thread
 * @access Private
 */
router.post(
  '/threads/:projectId/:messageId/reply',
  authenticateToken,
  requirePermission('conversation:write'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const messageId = req.params.messageId;
      const { message, type = 'text', metadata } = req.body;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Validate message ID
      if (!Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message ID',
          code: 'INVALID_MESSAGE_ID',
        });
      }

      // Validate message content
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required',
          code: 'MISSING_MESSAGE',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(req.user.id) &&
        project.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Create reply message data
      const messageData: Omit<any, 'id' | 'timestamp' | 'projectId'> = {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        message: message.trim(),
        type,
        metadata,
        isPersonaMessage: false,
      };

      // Reply to message
      const replyMessage = await chatService.replyToMessage(
        projectId,
        messageId,
        messageData
      );

      res.json({
        success: true,
        message: replyMessage,
      });
    } catch (error) {
      logger.error('Reply to message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/chat/threads/:projectId
 * @desc Get thread list for a project
 * @access Private
 */
router.get(
  '/threads/:projectId',
  authenticateToken,
  requirePermission('conversation:read'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(req.user.id) &&
        project.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Get thread list
      const threads = await chatService.getThreadList(projectId, limit, offset);

      res.json({
        success: true,
        threads,
        pagination: {
          limit,
          offset,
          hasMore: threads.length === limit,
        },
      });
    } catch (error) {
      logger.error('Get thread list error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/chat/threads/:projectId/:threadId/messages
 * @desc Get messages in a specific thread
 * @access Private
 */
router.get(
  '/threads/:projectId/:threadId/messages',
  authenticateToken,
  requirePermission('conversation:read'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const threadId = req.params.threadId;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Validate thread ID
      if (!Types.ObjectId.isValid(threadId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid thread ID',
          code: 'INVALID_THREAD_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(req.user.id) &&
        project.instructor.toString() !== req.user.id
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Get thread messages
      const messages = await chatService.getThreadMessages(projectId, threadId);

      res.json({
        success: true,
        messages,
        threadId,
        count: messages.length,
      });
    } catch (error) {
      logger.error('Get thread messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route DELETE /api/chat/messages/:messageId
 * @desc Delete a chat message (admin/instructor only)
 * @access Private
 */
router.delete(
  '/messages/:messageId',
  authenticateToken,
  requirePermission('conversation:delete'),
  async (req: any, res: Response) => {
    try {
      const messageId = req.params.messageId;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Validate message ID
      if (!Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid message ID',
          code: 'INVALID_MESSAGE_ID',
        });
      }

      // Delete message
      const success = await chatService.deleteMessage(
        messageId,
        userId,
        userRole
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or permission denied',
          code: 'MESSAGE_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      logger.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/chat/statistics/:projectId
 * @desc Get chat statistics for a project
 * @access Private
 */
router.get(
  '/statistics/:projectId',
  authenticateToken,
  requirePermission('conversation:read'),
  async (req: any, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      // Validate project ID
      if (!Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
          code: 'INVALID_PROJECT_ID',
        });
      }

      // Check if user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
        });
      }

      if (
        !project.students.includes(userId) &&
        project.instructor.toString() !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to project',
          code: 'PROJECT_ACCESS_DENIED',
        });
      }

      // Get chat statistics
      const statistics = await chatService.getChatStatistics(
        projectId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      logger.error('Get chat statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
