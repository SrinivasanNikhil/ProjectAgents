import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, PERMISSIONS } from '../middleware/roleCheck';
import { uploadFileWithValidation } from '../middleware/fileUpload';
import { FileService } from '../services/fileService';
import { initializeFileStorage } from '../config/fileStorage';
import { Artifact } from '../models/Artifact';
import { Project } from '../models/Project';

const router = express.Router();

// Initialize file service
const fileStorage = initializeFileStorage();
const fileService = new FileService(
  fileStorage.config,
  fileStorage.s3Client,
  fileStorage.localStorage
);

/**
 * @route POST /api/artifacts/upload
 * @desc Upload a new artifact file
 * @access Private
 */
router.post(
  '/upload',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.WRITE),
  uploadFileWithValidation,
  async (req: any, res: Response) => {
    try {
      const { projectId, name, description, category, tags, externalLinks } =
        req.body;
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

      // Parse tags and external links if they're strings
      const parsedTags = tags
        ? typeof tags === 'string'
          ? JSON.parse(tags)
          : tags
        : [];
      const parsedExternalLinks = externalLinks
        ? typeof externalLinks === 'string'
          ? JSON.parse(externalLinks)
          : externalLinks
        : [];

      // Upload file
      const uploadResult = await fileService.uploadFile(
        req.file,
        new Types.ObjectId(projectId),
        new Types.ObjectId(uploadedBy),
        {
          name,
          description,
          category,
          tags: parsedTags,
          externalLinks: parsedExternalLinks,
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

      logger.info(
        `Artifact uploaded: ${uploadResult.artifact!.name} by user ${uploadedBy}`
      );

      res.status(201).json({
        success: true,
        message: 'Artifact uploaded successfully',
        artifact: uploadResult.artifact,
        fileInfo: uploadResult.fileInfo,
      });
    } catch (error) {
      logger.error('Artifact upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/artifacts/:id/download
 * @desc Download an artifact file
 * @access Private
 */
router.get(
  '/:id/download',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.READ),
  async (req: any, res) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Download file
      const downloadResult = await fileService.downloadFile(
        new Types.ObjectId(artifactId),
        new Types.ObjectId(userId)
      );

      if (!downloadResult.success) {
        return res.status(404).json({
          success: false,
          message: 'File not found or access denied',
          error: downloadResult.error,
          code: 'FILE_NOT_FOUND',
        });
      }

      // Set response headers
      res.setHeader('Content-Type', downloadResult.fileInfo!.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadResult.fileInfo!.filename}"`
      );
      res.setHeader('Content-Length', downloadResult.fileInfo!.size);

      // Stream the file
      downloadResult.stream!.pipe(res);
    } catch (error) {
      logger.error('Artifact download error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/artifacts/:id/preview
 * @desc Get preview URL for an artifact
 * @access Private
 */
router.get(
  '/:id/preview',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.READ),
  async (req: any, res) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Get preview URL
      const previewUrl = await fileService.getPreviewUrl(
        new Types.ObjectId(artifactId),
        new Types.ObjectId(userId)
      );

      if (!previewUrl) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found or access denied',
          code: 'ARTIFACT_NOT_FOUND',
        });
      }

      res.json({
        success: true,
        previewUrl,
      });
    } catch (error) {
      logger.error('Artifact preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/artifacts/project/:projectId
 * @desc Get all artifacts for a project
 * @access Private
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.READ),
  async (req: any, res) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        type,
        category,
        status = 'active',
      } = req.query;

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

      // Build query
      const query: any = {
        project: new Types.ObjectId(projectId),
        status,
      };

      if (type) query.type = type;
      if (category) query.category = category;

      // Add access control
      query.$or = [
        { 'permissions.owner': new Types.ObjectId(userId) },
        { 'permissions.isPublic': true },
        { 'permissions.sharedWith': new Types.ObjectId(userId) },
      ];

      // Execute query with pagination
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const artifacts = await Artifact.find(query)
        .populate('uploadedBy', 'name email')
        .populate('permissions.owner', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string));

      const total = await Artifact.countDocuments(query);

      res.json({
        success: true,
        artifacts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      logger.error('Get project artifacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/artifacts/:id
 * @desc Get artifact details
 * @access Private
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.READ),
  async (req: any, res: Response) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Get artifact with populated fields
      const artifact = await Artifact.findById(artifactId)
        .populate('uploadedBy', 'name email')
        .populate('permissions.owner', 'name email')
        .populate('permissions.sharedWith', 'name email')
        .populate('project', 'name description');

      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
          code: 'ARTIFACT_NOT_FOUND',
        });
      }

      // Check access permissions
      if (!artifact.hasAccess(new Types.ObjectId(userId))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      // Increment view count
      await artifact.incrementViewCount();

      res.json({
        success: true,
        artifact,
      });
    } catch (error) {
      logger.error('Get artifact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route PUT /api/artifacts/:id
 * @desc Update artifact metadata
 * @access Private
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.WRITE),
  async (req: any, res) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;
      const { name, description, category, tags, externalLinks, permissions } =
        req.body;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Get artifact
      const artifact = await Artifact.findById(artifactId);
      if (!artifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
          code: 'ARTIFACT_NOT_FOUND',
        });
      }

      // Check edit permissions
      if (!artifact.canEdit(new Types.ObjectId(userId))) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          code: 'PERMISSION_DENIED',
        });
      }

      // Update fields
      if (name !== undefined) artifact.name = name;
      if (description !== undefined) artifact.description = description;
      if (category !== undefined) artifact.category = category;
      if (tags !== undefined) artifact.metadata.tags = tags;
      if (externalLinks !== undefined)
        artifact.metadata.externalLinks = externalLinks;
      if (permissions !== undefined)
        artifact.permissions = { ...artifact.permissions, ...permissions };

      artifact.usage.lastModified = new Date();
      await artifact.save();

      logger.info(`Artifact updated: ${artifactId} by user ${userId}`);

      res.json({
        success: true,
        message: 'Artifact updated successfully',
        artifact,
      });
    } catch (error) {
      logger.error('Update artifact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route DELETE /api/artifacts/:id
 * @desc Delete an artifact
 * @access Private
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.DELETE),
  async (req: any, res) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Delete file
      const deleteResult = await fileService.deleteFile(
        new Types.ObjectId(artifactId),
        new Types.ObjectId(userId)
      );

      if (!deleteResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found or permission denied',
          error: deleteResult.error,
          code: 'DELETE_FAILED',
        });
      }

      logger.info(`Artifact deleted: ${artifactId} by user ${userId}`);

      res.json({
        success: true,
        message: 'Artifact deleted successfully',
      });
    } catch (error) {
      logger.error('Delete artifact error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route POST /api/artifacts/:id/version
 * @desc Create a new version of an artifact
 * @access Private
 */
router.post(
  '/:id/version',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.WRITE),
  uploadFileWithValidation,
  async (req: any, res: Response) => {
    try {
      const artifactId = req.params.id;
      const uploadedBy = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Create new version
      const versionResult = await fileService.createNewVersion(
        new Types.ObjectId(artifactId),
        req.file,
        new Types.ObjectId(uploadedBy)
      );

      if (!versionResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Version creation failed',
          error: versionResult.error,
          code: 'VERSION_CREATION_FAILED',
        });
      }

      logger.info(`New version created: ${artifactId} by user ${uploadedBy}`);

      res.status(201).json({
        success: true,
        message: 'New version created successfully',
        artifact: versionResult.artifact,
        fileInfo: versionResult.fileInfo,
      });
    } catch (error) {
      logger.error('Create version error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * @route GET /api/artifacts/:id/versions
 * @desc Get all versions of an artifact
 * @access Private
 */
router.get(
  '/:id/versions',
  authenticateToken,
  requirePermission(PERMISSIONS.ARTIFACT.READ),
  async (req: any, res) => {
    try {
      const artifactId = req.params.id;
      const userId = req.user.id;

      // Validate artifact ID
      if (!Types.ObjectId.isValid(artifactId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact ID',
          code: 'INVALID_ARTIFACT_ID',
        });
      }

      // Get original artifact
      const originalArtifact = await Artifact.findById(artifactId);
      if (!originalArtifact) {
        return res.status(404).json({
          success: false,
          message: 'Artifact not found',
          code: 'ARTIFACT_NOT_FOUND',
        });
      }

      // Check access permissions
      if (!originalArtifact.hasAccess(new Types.ObjectId(userId))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          code: 'ACCESS_DENIED',
        });
      }

      // Get all versions (including the original)
      const versions = await Artifact.find({
        $or: [
          { _id: new Types.ObjectId(artifactId) },
          { 'metadata.parentVersion': new Types.ObjectId(artifactId) },
        ],
      })
        .populate('uploadedBy', 'name email')
        .sort({ 'metadata.version': 1 });

      res.json({
        success: true,
        versions,
      });
    } catch (error) {
      logger.error('Get versions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
