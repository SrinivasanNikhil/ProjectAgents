import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission, PERMISSIONS } from '../middleware/roleCheck';
import { asyncHandler } from '../middleware/errorHandler';
import { personaService } from '../services/personaService';
import { logger, logUserActivity } from '../config/logger';

const router = express.Router();

/**
 * @route POST /api/personas
 * @desc Create a new persona
 * @access Private (Instructor only)
 */
router.post(
  '/',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.createPersona(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Persona created successfully',
      data: persona,
    });
  })
);

/**
 * @route POST /api/personas/from-template
 * @desc Create a persona from template
 * @access Private (Instructor only)
 */
router.post(
  '/from-template',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.createPersonaFromTemplate(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Persona created from template successfully',
      data: persona,
    });
  })
);

/**
 * @route GET /api/personas/:id
 * @desc Get persona by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.getPersona(req.params.id, req.user.id);

    res.json({
      success: true,
      data: persona,
    });
  })
);

/**
 * @route GET /api/personas/project/:projectId
 * @desc Get all personas for a project
 * @access Private
 */
router.get(
  '/project/:projectId',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const personas = await personaService.getPersonasByProject(
      req.params.projectId,
      req.user.id
    );

    res.json({
      success: true,
      data: personas,
      count: personas.length,
    });
  })
);

/**
 * @route PUT /api/personas/:id
 * @desc Update persona
 * @access Private (Instructor only)
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.updatePersona(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Persona updated successfully',
      data: persona,
    });
  })
);

/**
 * @route DELETE /api/personas/:id
 * @desc Delete persona
 * @access Private (Instructor only)
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.DELETE),
  asyncHandler(async (req: any, res: Response) => {
    await personaService.deletePersona(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Persona deleted successfully',
    });
  })
);

/**
 * @route POST /api/personas/:id/mood
 * @desc Update persona mood
 * @access Private
 */
router.post(
  '/:id/mood',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const mood = await personaService.updatePersonaMood(
      req.params.id,
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Persona mood updated successfully',
      data: mood,
    });
  })
);

/**
 * @route GET /api/personas/:id/mood
 * @desc Get persona mood history
 * @access Private
 */
router.get(
  '/:id/mood',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const moods = await personaService.getPersonaMoodHistory(
      req.params.id,
      req.user.id,
      limit
    );

    res.json({
      success: true,
      data: moods,
      count: moods.length,
    });
  })
);

/**
 * @route GET /api/personas/:id/stats
 * @desc Get persona statistics
 * @access Private
 */
router.get(
  '/:id/stats',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const stats = await personaService.getPersonaStats(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route GET /api/personas/templates
 * @desc Get available templates
 * @access Private (Instructor only)
 */
router.get(
  '/templates',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const { projectId, category } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      });
    }

    const templates = await personaService.getAvailableTemplates(
      projectId as string,
      req.user.id,
      category as string
    );

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  })
);

/**
 * @route POST /api/personas/templates
 * @desc Create persona template
 * @access Private (Instructor only)
 */
router.post(
  '/templates',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const template = await personaService.createTemplate(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  })
);

/**
 * @route GET /api/personas/templates/:id
 * @desc Get template by ID
 * @access Private (Instructor only)
 */
router.get(
  '/templates/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const template = await personaService.getTemplate(
      req.params.id,
      req.user.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * @route PUT /api/personas/templates/:id
 * @desc Update template
 * @access Private (Instructor only)
 */
router.put(
  '/templates/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const template = await personaService.updateTemplate(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  })
);

/**
 * @route DELETE /api/personas/templates/:id
 * @desc Delete template
 * @access Private (Instructor only)
 */
router.delete(
  '/templates/:id',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.DELETE),
  asyncHandler(async (req: any, res: Response) => {
    await personaService.deleteTemplate(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

/**
 * @route POST /api/personas/templates/:id/clone
 * @desc Clone template
 * @access Private (Instructor only)
 */
router.post(
  '/templates/:id/clone',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const clonedTemplate = await personaService.cloneTemplate(
      req.params.id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Template cloned successfully',
      data: clonedTemplate,
    });
  })
);

/**
 * @route POST /api/personas/generate
 * @desc Generate a persona using AI
 * @access Private (Instructor only)
 */
router.post(
  '/generate',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.generatePersonaWithAI(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Persona generated successfully using AI',
      data: persona,
    });
  })
);

/**
 * @route POST /api/personas/:id/respond
 * @desc Generate a persona response using AI
 * @access Private
 */
router.post(
  '/:id/respond',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const response = await personaService.generatePersonaResponseWithAI(
      {
        ...req.body,
        personaId: req.params.id,
      },
      req.user.id
    );

    res.json({
      success: true,
      message: 'Persona response generated successfully',
      data: response,
    });
  })
);

/**
 * @route GET /api/personas/suggestions/:projectId
 * @desc Get AI-generated persona suggestions for a project
 * @access Private (Instructor only)
 */
router.get(
  '/suggestions/:projectId',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.READ),
  asyncHandler(async (req: any, res: Response) => {
    const suggestions = await personaService.getProjectSuggestions(
      req.params.projectId,
      req.user.id
    );

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
    });
  })
);

/**
 * @route PUT /api/personas/:id/customize
 * @desc Update persona customization settings
 * @access Private (Instructor only)
 */
router.put(
  '/:id/customize',
  authenticateToken,
  requirePermission(PERMISSIONS.PERSONA.WRITE),
  asyncHandler(async (req: any, res: Response) => {
    const persona = await personaService.updatePersonaCustomization(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Persona customization updated successfully',
      data: persona,
    });
  })
);

export default router;
