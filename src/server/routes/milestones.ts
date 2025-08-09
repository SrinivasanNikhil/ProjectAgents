import express, { Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, PERMISSIONS } from '../middleware/roleCheck';
import { asyncHandler } from '../middleware/errorHandler';
import { milestoneService, CreateMilestoneData, UpdateMilestoneData, PersonaSignOffData, SubmissionData } from '../services/milestoneService';
import { logger, logUserActivity } from '../config/logger';
import { validateObjectId, validateDateRange, validatePagination } from '../utils/validation';

const router = express.Router();

/**
 * @route GET /api/milestones
 * @desc Get milestones with filtering and pagination
 * @access Private
 */
router.get(
  '/',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const {
      project,
      status,
      type,
      startDate,
      endDate,
      overdue,
      page = 1,
      limit = 10,
      sort = 'dueDate',
      order = 'asc',
    } = req.query;

    // Validate pagination
    const paginationErrors = validatePagination({ page, limit });
    if (paginationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: paginationErrors,
      });
    }

    // Build filters
    const filters: any = {};
    
    if (project) {
      if (!validateObjectId(project)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }
      filters.project = project;
    }

    if (status) {
      filters.status = status;
    }

    if (type) {
      filters.type = type;
    }

    if (startDate || endDate) {
      const dateRange = validateDateRange(startDate, endDate);
      if (!dateRange.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
          errors: dateRange.errors,
        });
      }
      filters.dueDate = dateRange.range;
    }

    if (overdue === 'true') {
      filters.overdue = true;
    }

    // Build sort options
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: true,
    };

    const result = await milestoneService.getMilestones(filters, options);

    logUserActivity(req.user.id, 'ViewMilestones', {
      filters,
      page: options.page,
      limit: options.limit,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route GET /api/milestones/:id
 * @desc Get milestone by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone ID',
      });
    }

    const milestone = await milestoneService.getMilestoneById(id);
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    logUserActivity(req.user.id, 'ViewMilestone', {
      milestoneId: id,
    });

    res.json({
      success: true,
      data: milestone,
    });
  })
);

/**
 * @route POST /api/milestones
 * @desc Create new milestone
 * @access Private (Instructor only)
 */
router.post(
  '/',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const {
      project,
      name,
      description,
      dueDate,
      type,
      requirements,
      personaSignOffs,
      evaluation,
      settings,
    }: CreateMilestoneData = req.body;

    // Validate required fields
    if (!project || !name || !description || !dueDate || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: project, name, description, dueDate, type',
      });
    }

    // Validate project ID
    if (!validateObjectId(project)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Validate due date
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid due date',
      });
    }

    // Validate milestone type
    const validTypes = ['deliverable', 'review', 'presentation', 'feedback'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone type',
      });
    }

    // Validate persona sign-offs if provided
    if (personaSignOffs && personaSignOffs.length > 0) {
      const invalidIds = personaSignOffs.filter(id => !validateObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid persona IDs in personaSignOffs',
        });
      }
    }

    const milestoneData: CreateMilestoneData = {
      project,
      name: name.trim(),
      description: description.trim(),
      dueDate: dueDateObj,
      type,
      requirements: requirements || [],
      personaSignOffs: personaSignOffs || [],
      evaluation,
      settings,
    };

    const milestone = await milestoneService.createMilestone(milestoneData, req.user.id);

    logUserActivity(req.user.id, 'CreateMilestone', {
      milestoneId: milestone._id,
      projectId: project,
      type,
    });

    res.status(201).json({
      success: true,
      data: milestone,
      message: 'Milestone created successfully',
    });
  })
);

/**
 * @route PUT /api/milestones/:id
 * @desc Update milestone
 * @access Private (Instructor only)
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateMilestoneData = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone ID',
      });
    }

    // Validate due date if provided
    if (updateData.dueDate) {
      const dueDateObj = new Date(updateData.dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date',
        });
      }
      updateData.dueDate = dueDateObj;
    }

    // Validate milestone type if provided
    if (updateData.type) {
      const validTypes = ['deliverable', 'review', 'presentation', 'feedback'];
      if (!validTypes.includes(updateData.type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone type',
        });
      }
    }

    // Validate status if provided
    if (updateData.status) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'overdue'];
      if (!validStatuses.includes(updateData.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid milestone status',
        });
      }
    }

    // Trim string fields
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim();
    }

    const milestone = await milestoneService.updateMilestone(id, updateData, req.user.id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    logUserActivity(req.user.id, 'UpdateMilestone', {
      milestoneId: id,
      changes: Object.keys(updateData),
    });

    res.json({
      success: true,
      data: milestone,
      message: 'Milestone updated successfully',
    });
  })
);

/**
 * @route DELETE /api/milestones/:id
 * @desc Delete milestone
 * @access Private (Instructor only)
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.DELETE),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone ID',
      });
    }

    await milestoneService.deleteMilestone(id, req.user.id);

    logUserActivity(req.user.id, 'DeleteMilestone', {
      milestoneId: id,
    });

    res.json({
      success: true,
      message: 'Milestone deleted successfully',
    });
  })
);

/**
 * @route PUT /api/milestones/:id/sign-off
 * @desc Update persona sign-off status
 * @access Private
 */
router.put(
  '/:id/sign-off',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.EVALUATE),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { personaId, status, feedback, satisfactionScore }: PersonaSignOffData = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone ID',
      });
    }

    if (!personaId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personaId, status',
      });
    }

    if (!validateObjectId(personaId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid persona ID',
      });
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'requested-changes'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sign-off status',
      });
    }

    // Validate satisfaction score if provided
    if (satisfactionScore !== undefined) {
      if (typeof satisfactionScore !== 'number' || satisfactionScore < 1 || satisfactionScore > 10) {
        return res.status(400).json({
          success: false,
          message: 'Satisfaction score must be a number between 1 and 10',
        });
      }
    }

    const signOffData: PersonaSignOffData = {
      personaId,
      status,
      feedback: feedback?.trim(),
      satisfactionScore,
    };

    const milestone = await milestoneService.updatePersonaSignOff(id, signOffData, req.user.id);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    logUserActivity(req.user.id, 'UpdatePersonaSignOff', {
      milestoneId: id,
      personaId,
      status,
    });

    res.json({
      success: true,
      data: milestone,
      message: 'Persona sign-off updated successfully',
    });
  })
);

/**
 * @route POST /api/milestones/:id/submissions
 * @desc Add student submission to milestone
 * @access Private (Student/Instructor)
 */
router.post(
  '/:id/submissions',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    const { studentId, artifacts, description }: SubmissionData = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid milestone ID',
      });
    }

    if (!studentId || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, description',
      });
    }

    if (!validateObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID',
      });
    }

    // Validate artifact IDs if provided
    if (artifacts && artifacts.length > 0) {
      const invalidIds = artifacts.filter(artifactId => !validateObjectId(artifactId));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid artifact IDs',
        });
      }
    }

    const submissionData: SubmissionData = {
      studentId,
      artifacts: artifacts || [],
      description: description.trim(),
    };

    const milestone = await milestoneService.addSubmission(id, submissionData);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
    }

    logUserActivity(req.user.id, 'AddMilestoneSubmission', {
      milestoneId: id,
      studentId,
      artifactCount: submissionData.artifacts.length,
    });

    res.status(201).json({
      success: true,
      data: milestone,
      message: 'Submission added successfully',
    });
  })
);

/**
 * @route GET /api/milestones/project/:projectId/summary
 * @desc Get project milestones summary
 * @access Private
 */
router.get(
  '/project/:projectId/summary',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { projectId } = req.params;

    if (!validateObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    const summary = await milestoneService.getProjectMilestonesSummary(projectId);

    logUserActivity(req.user.id, 'ViewProjectMilestonesSummary', {
      projectId,
    });

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * @route GET /api/milestones/project/:projectId/analytics
 * @desc Get milestone analytics for a project
 * @access Private (Instructor only)
 */
router.get(
  '/project/:projectId/analytics',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    if (!validateObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    // Validate date range if provided
    let dateRange;
    if (startDate || endDate) {
      const validation = validateDateRange(startDate as string, endDate as string);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range',
          errors: validation.errors,
        });
      }
      dateRange = validation.range;
    }

    const analytics = await milestoneService.getMilestoneAnalytics(projectId, dateRange);

    logUserActivity(req.user.id, 'ViewMilestoneAnalytics', {
      projectId,
      dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : null,
    });

    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @route GET /api/milestones/overdue
 * @desc Get all overdue milestones (for system monitoring)
 * @access Private (Instructor/Admin only)
 */
router.get(
  '/overdue',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination
    const paginationErrors = validatePagination({ page, limit });
    if (paginationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: paginationErrors,
      });
    }

    const filters = { overdue: true };
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { dueDate: 1 },
      populate: true,
    };

    const result = await milestoneService.getMilestones(filters, options);

    logUserActivity(req.user.id, 'ViewOverdueMilestones', {
      page: options.page,
      limit: options.limit,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route GET /api/milestones/upcoming
 * @desc Get upcoming milestones (next 7 days)
 * @access Private
 */
router.get(
  '/upcoming',
  authenticateToken,
  requirePermission(PERMISSIONS.MILESTONE.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { projectId, days = 7 } = req.query;

    let filters: any = {};
    
    if (projectId) {
      if (!validateObjectId(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID',
        });
      }
      filters.project = projectId;
    }

    // Set date range for upcoming milestones
    const daysAhead = Math.min(parseInt(days as string) || 7, 30); // Max 30 days
    filters.dueDate = {
      start: new Date(),
      end: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
    };

    const options = {
      page: 1,
      limit: 50,
      sort: { dueDate: 1 },
      populate: true,
    };

    const result = await milestoneService.getMilestones(filters, options);

    logUserActivity(req.user.id, 'ViewUpcomingMilestones', {
      projectId: projectId || 'all',
      days: daysAhead,
    });

    res.json({
      success: true,
      data: result.milestones,
    });
  })
);

export default router;