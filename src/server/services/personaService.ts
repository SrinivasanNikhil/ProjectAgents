import { Types } from 'mongoose';
import { logger, logUserActivity, logError } from '../config/logger';
import { Persona, IPersona } from '../models/Persona';
import { PersonaTemplate, IPersonaTemplate } from '../models/PersonaTemplate';
import { PersonaMood, IPersonaMood } from '../models/PersonaMood';
import { Project } from '../models/Project';
import { User } from '../models/User';
import {
  aiService,
  PersonaGenerationRequest,
  PersonaResponseRequest,
} from '../config/ai';
import { conversationContextService } from './contextService';
import { memoryService } from './memoryService';
import { responseFilterService } from './responseFilterService';
import { aiCacheService } from './aiCacheService';

export interface CreatePersonaData {
  name: string;
  role: string;
  projectId: string;
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
  aiConfiguration?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  };
  availability?: {
    responseTime?: number;
    workingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

export interface CreatePersonaFromTemplateData {
  templateId: string;
  projectId: string;
  name: string;
  customizations?: {
    background?: string;
    personality?: {
      traits?: string[];
      priorities?: string[];
      goals?: string[];
    };
    aiConfiguration?: {
      temperature?: number;
      systemPrompt?: string;
    };
  };
}

export interface UpdatePersonaData {
  name?: string;
  role?: string;
  background?: string;
  personality?: {
    traits?: string[];
    communicationStyle?: string;
    decisionMakingStyle?: string;
    priorities?: string[];
    goals?: string[];
  };
  aiConfiguration?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  };
  availability?: {
    isActive?: boolean;
    responseTime?: number;
    workingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

export interface PersonaMoodData {
  value: number;
  reason: string;
  trigger: {
    type:
      | 'conversation'
      | 'milestone'
      | 'feedback'
      | 'time'
      | 'manual'
      | 'system';
    source?: string;
    details?: string;
  };
  context?: {
    conversationId?: string;
    userId?: string;
    projectId?: string;
    milestoneId?: string;
  };
  duration?: {
    expected: number;
  };
  tags?: string[];
}

class PersonaService {
  /**
   * Create a new persona
   */
  async createPersona(
    data: CreatePersonaData,
    createdBy: string
  ): Promise<IPersona> {
    try {
      // Validate project exists and user has access
      const project = await Project.findById(data.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const user = await User.findById(createdBy);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has permission to create personas for this project
      if (!project.canUserAccess(new Types.ObjectId(createdBy), 'instructor')) {
        throw new Error(
          'Insufficient permissions to create persona for this project'
        );
      }

      // Create persona
      const persona = new Persona({
        ...data,
        project: data.projectId,
        aiConfiguration: {
          model: data.aiConfiguration?.model || 'gpt-4',
          temperature: data.aiConfiguration?.temperature || 0.7,
          maxTokens: data.aiConfiguration?.maxTokens || 2000,
          systemPrompt:
            data.aiConfiguration?.systemPrompt ||
            this.generateSystemPrompt(data),
          contextWindow: data.aiConfiguration?.contextWindow || 10,
        },
        availability: {
          isActive: true,
          responseTime: data.availability?.responseTime || 5,
          workingHours: data.availability?.workingHours || {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
          },
        },
      });

      const savedPersona = await persona.save();

      // Log activity
      logUserActivity(createdBy, 'CreatePersona', {
        personaId: savedPersona._id,
        projectId: data.projectId,
        role: data.role,
      });

      logger.info('Persona created successfully', {
        personaId: savedPersona._id,
        projectId: data.projectId,
        createdBy,
      });

      return savedPersona;
    } catch (error) {
      logError(error as Error, 'PersonaService.createPersona', {
        data,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Create persona from template
   */
  async createPersonaFromTemplate(
    data: CreatePersonaFromTemplateData,
    createdBy: string
  ): Promise<IPersona> {
    try {
      // Get template
      const template = await PersonaTemplate.findById(data.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate project exists and user has access
      const project = await Project.findById(data.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(createdBy), 'instructor')) {
        throw new Error(
          'Insufficient permissions to create persona for this project'
        );
      }

      // Create persona from template
      const personaData: CreatePersonaData = {
        name: data.name,
        role: data.customizations?.personality?.traits
          ? `${template.template.role} (${data.customizations.personality.traits.join(', ')})`
          : template.template.role,
        projectId: data.projectId,
        background:
          data.customizations?.background || template.template.background,
        personality: {
          traits:
            data.customizations?.personality?.traits ||
            template.template.personality.traits,
          communicationStyle: template.template.personality.communicationStyle,
          decisionMakingStyle:
            template.template.personality.decisionMakingStyle,
          priorities:
            data.customizations?.personality?.priorities ||
            template.template.personality.priorities,
          goals:
            data.customizations?.personality?.goals ||
            template.template.personality.goals,
        },
        aiConfiguration: {
          model: template.template.aiConfiguration.model,
          temperature:
            data.customizations?.aiConfiguration?.temperature ||
            template.template.aiConfiguration.temperature,
          maxTokens: template.template.aiConfiguration.maxTokens,
          systemPrompt:
            data.customizations?.aiConfiguration?.systemPrompt ||
            template.template.aiConfiguration.systemPrompt,
          contextWindow: template.template.aiConfiguration.contextWindow,
        },
        availability: {
          responseTime: template.template.availability.responseTime,
          workingHours: template.template.availability.workingHours,
        },
      };

      const persona = await this.createPersona(personaData, createdBy);

      // Increment template usage
      await template.incrementUsage(new Types.ObjectId(data.projectId));

      return persona;
    } catch (error) {
      logError(error as Error, 'PersonaService.createPersonaFromTemplate', {
        data,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Get persona by ID
   */
  async getPersona(personaId: string, userId: string): Promise<IPersona> {
    try {
      const persona = await Persona.findById(personaId).populate('project');
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      return persona;
    } catch (error) {
      logError(error as Error, 'PersonaService.getPersona', {
        personaId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get all personas for instructor dashboard
   */
  async getAllPersonas(userId: string): Promise<IPersona[]> {
    try {
      // Get all projects the user has instructor access to
      const projects = await Project.find({
        $or: [
          { instructor: new Types.ObjectId(userId) },
          { 'team.instructors': new Types.ObjectId(userId) },
        ],
        status: 'active',
      });

      if (projects.length === 0) {
        return [];
      }

      const projectIds = projects.map(p => p._id);

      // Get all personas for these projects
      const personas = await Persona.find({ project: { $in: projectIds } })
        .populate('project', 'name status')
        .sort({ createdAt: -1 });

      logUserActivity(userId, 'GET_ALL_PERSONAS', {
        count: personas.length,
        projectCount: projects.length,
      });

      return personas;
    } catch (error) {
      logError(error as Error, 'PersonaService.getAllPersonas', {
        userId,
      });
      throw error;
    }
  }

  /**
   * Get personas for a project
   */
  async getPersonasByProject(
    projectId: string,
    userId: string
  ): Promise<IPersona[]> {
    try {
      // Check if user has access to project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'student')) {
        throw new Error('Insufficient permissions to access project personas');
      }

      const personas = await Persona.find({ project: projectId })
        .populate('project', 'name status')
        .sort({ createdAt: -1 });

      return personas;
    } catch (error) {
      logError(error as Error, 'PersonaService.getPersonasByProject', {
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update persona
   */
  async updatePersona(
    personaId: string,
    data: UpdatePersonaData,
    userId: string
  ): Promise<IPersona> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has permission to update this persona
      const project = await Project.findById(persona.project);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'instructor')) {
        throw new Error('Insufficient permissions to update this persona');
      }

      // Update persona
      Object.assign(persona, data);
      const updatedPersona = await persona.save();

      // Log activity
      logUserActivity(userId, 'UpdatePersona', {
        personaId,
        projectId: persona.project.toString(),
      });

      return updatedPersona;
    } catch (error) {
      logError(error as Error, 'PersonaService.updatePersona', {
        personaId,
        data,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete persona
   */
  async deletePersona(personaId: string, userId: string): Promise<void> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has permission to delete this persona
      const project = await Project.findById(persona.project);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'instructor')) {
        throw new Error('Insufficient permissions to delete this persona');
      }

      await Persona.findByIdAndDelete(personaId);

      // Log activity
      logUserActivity(userId, 'DeletePersona', {
        personaId,
        projectId: persona.project.toString(),
      });

      logger.info('Persona deleted successfully', {
        personaId,
        projectId: persona.project.toString(),
        deletedBy: userId,
      });
    } catch (error) {
      logError(error as Error, 'PersonaService.deletePersona', {
        personaId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update persona mood
   */
  async updatePersonaMood(
    personaId: string,
    moodData: PersonaMoodData,
    userId: string
  ): Promise<IPersonaMood> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Create mood record
      const mood = new PersonaMood({
        persona: personaId,
        value: moodData.value,
        reason: moodData.reason,
        trigger: moodData.trigger,
        context: moodData.context
          ? {
              conversationId: moodData.context.conversationId
                ? new Types.ObjectId(moodData.context.conversationId)
                : undefined,
              userId: moodData.context.userId
                ? new Types.ObjectId(moodData.context.userId)
                : undefined,
              projectId: moodData.context.projectId
                ? new Types.ObjectId(moodData.context.projectId)
                : undefined,
              milestoneId: moodData.context.milestoneId
                ? new Types.ObjectId(moodData.context.milestoneId)
                : undefined,
            }
          : undefined,
        duration: {
          expected: moodData.duration?.expected || 60,
        },
        tags: moodData.tags || [],
      });

      const savedMood = await mood.save();

      // Update persona's current mood
      await persona.updateMood(moodData.value, moodData.reason);

      // Log activity
      logUserActivity(userId, 'UpdatePersonaMood', {
        personaId,
        moodId: savedMood._id,
        moodValue: moodData.value,
        trigger: moodData.trigger.type,
      });

      return savedMood;
    } catch (error) {
      logError(error as Error, 'PersonaService.updatePersonaMood', {
        personaId,
        moodData,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get persona mood history
   */
  async getPersonaMoodHistory(
    personaId: string,
    userId: string,
    limit: number = 50
  ): Promise<IPersonaMood[]> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      const moods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('context.userId', 'firstName lastName email')
        .populate('context.conversationId', 'title');

      return moods;
    } catch (error) {
      logError(error as Error, 'PersonaService.getPersonaMoodHistory', {
        personaId,
        userId,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get persona mood analytics and insights
   */
  async getPersonaMoodAnalytics(
    personaId: string,
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'week'
  ): Promise<any> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const moods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
        createdAt: { $gte: startDate },
      }).sort({ createdAt: 1 });

      // Calculate analytics
      const analytics = this.calculateMoodAnalytics(moods, persona);

      return analytics;
    } catch (error) {
      logError(error as Error, 'PersonaService.getPersonaMoodAnalytics', {
        personaId,
        userId,
        timeframe,
      });
      throw error;
    }
  }

  /**
   * Analyze personality consistency
   */
  async analyzePersonalityConsistency(
    personaId: string,
    userId: string
  ): Promise<any> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      // Get recent conversations and mood data
      const recentMoods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last week
      }).sort({ createdAt: -1 });

      // Analyze personality consistency
      const consistencyAnalysis = this.analyzePersonalityConsistencyData(
        persona,
        recentMoods
      );

      return consistencyAnalysis;
    } catch (error) {
      logError(error as Error, 'PersonaService.analyzePersonalityConsistency', {
        personaId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update persona mood with advanced tracking
   */
  async updatePersonaMoodAdvanced(
    personaId: string,
    moodData: PersonaMoodData & {
      personalityImpact?: {
        traitChanges: Array<{
          trait: string;
          change: number; // -100 to 100
          reason: string;
        }>;
        consistencyDrift: number; // 0-100
      };
      responseAdaptation?: {
        communicationStyleAdjustment: number; // -100 to 100
        verbosityAdjustment: number; // -100 to 100
        empathyAdjustment: number; // -100 to 100
      };
    },
    userId: string
  ): Promise<{ mood: IPersonaMood; personalityUpdate?: any }> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Create mood record
      const mood = new PersonaMood({
        persona: personaId,
        value: moodData.value,
        reason: moodData.reason,
        trigger: moodData.trigger,
        context: moodData.context
          ? {
              conversationId: moodData.context.conversationId
                ? new Types.ObjectId(moodData.context.conversationId)
                : undefined,
              userId: moodData.context.userId
                ? new Types.ObjectId(moodData.context.userId)
                : undefined,
              projectId: moodData.context.projectId
                ? new Types.ObjectId(moodData.context.projectId)
                : undefined,
              milestoneId: moodData.context.milestoneId
                ? new Types.ObjectId(moodData.context.milestoneId)
                : undefined,
            }
          : undefined,
        duration: {
          expected: moodData.duration?.expected || 60,
        },
        tags: moodData.tags || [],
      });

      const savedMood = await mood.save();

      // Update persona's current mood
      await persona.updateMood(moodData.value, moodData.reason);

      // Apply personality impact if provided
      let personalityUpdate = null;
      if (moodData.personalityImpact) {
        personalityUpdate = await this.applyPersonalityImpact(
          persona,
          moodData.personalityImpact
        );
      }

      // Log activity
      logUserActivity(userId, 'UpdatePersonaMoodAdvanced', {
        personaId,
        moodId: savedMood._id,
        moodValue: moodData.value,
        trigger: moodData.trigger.type,
        personalityImpact: moodData.personalityImpact ? true : false,
      });

      return { mood: savedMood, personalityUpdate };
    } catch (error) {
      logError(error as Error, 'PersonaService.updatePersonaMoodAdvanced', {
        personaId,
        moodData,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get mood-based response adaptation
   */
  async getMoodBasedResponseAdaptation(
    personaId: string,
    context: {
      conversationId?: string;
      messageType: 'question' | 'feedback' | 'request' | 'general';
      userMood?: number;
      projectContext?: string;
    },
    userId: string
  ): Promise<any> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      // Get recent mood data
      const recentMoods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      }).sort({ createdAt: -1 });

      // Calculate response adaptation
      const adaptation = this.calculateResponseAdaptation(
        persona,
        recentMoods,
        context
      );

      return adaptation;
    } catch (error) {
      logError(
        error as Error,
        'PersonaService.getMoodBasedResponseAdaptation',
        {
          personaId,
          context,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Detect and correct personality drift
   */
  async detectAndCorrectPersonalityDrift(
    personaId: string,
    userId: string
  ): Promise<any> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      // Get recent mood and conversation data
      const recentMoods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last week
      }).sort({ createdAt: -1 });

      // Detect personality drift
      const driftAnalysis = this.detectPersonalityDrift(persona, recentMoods);

      // Apply corrections if needed
      let corrections = null;
      if (driftAnalysis.driftDetected) {
        corrections = await this.applyPersonalityCorrections(
          persona,
          driftAnalysis
        );
      }

      return {
        driftAnalysis,
        corrections,
      };
    } catch (error) {
      logError(
        error as Error,
        'PersonaService.detectAndCorrectPersonalityDrift',
        {
          personaId,
          userId,
        }
      );
      throw error;
    }
  }

  /**
   * Get available templates for a project
   */
  async getAvailableTemplates(
    projectId: string,
    userId: string,
    category?: string
  ): Promise<IPersonaTemplate[]> {
    try {
      // Check if user has access to project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'instructor')) {
        throw new Error('Insufficient permissions to access templates');
      }

      const query: any = {
        isActive: true,
        $or: [{ isPublic: true }, { createdBy: userId }],
      };

      if (category) {
        query.category = category;
      }

      const templates = await PersonaTemplate.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort({ 'usage.totalUses': -1, createdAt: -1 });

      return templates;
    } catch (error) {
      logError(error as Error, 'PersonaService.getAvailableTemplates', {
        projectId,
        userId,
        category,
      });
      throw error;
    }
  }

  /**
   * Create persona template
   */
  async createTemplate(
    data: {
      name: string;
      description: string;
      category: string;
      isPublic: boolean;
      tags: string[];
      template: {
        role: string;
        background: string;
        personality: {
          traits: string[];
          communicationStyle: string;
          decisionMakingStyle: string;
          priorities: string[];
          goals: string[];
        };
        aiConfiguration: {
          model: string;
          temperature: number;
          maxTokens: number;
          systemPrompt: string;
          contextWindow: number;
        };
        availability: {
          responseTime: number;
          workingHours: {
            start: string;
            end: string;
            timezone: string;
          };
        };
      };
    },
    createdBy: string
  ): Promise<IPersonaTemplate> {
    try {
      const template = new PersonaTemplate({
        ...data,
        createdBy,
      });

      const savedTemplate = await template.save();

      // Log activity
      logUserActivity(createdBy, 'CreatePersonaTemplate', {
        templateId: savedTemplate._id,
        category: data.category,
        isPublic: data.isPublic,
      });

      return savedTemplate;
    } catch (error) {
      logError(error as Error, 'PersonaService.createTemplate', {
        data,
        createdBy,
      });
      throw error;
    }
  }

  /**
   * Generate system prompt for persona
   */
  private generateSystemPrompt(data: CreatePersonaData): string {
    const { name, role, background, personality } = data;

    return `You are ${name}, a ${role} in this project simulation.

Background: ${background}

Personality Traits: ${personality.traits.join(', ')}

Communication Style: ${personality.communicationStyle}
Decision Making Style: ${personality.decisionMakingStyle}

Priorities:
${personality.priorities.map(p => `- ${p}`).join('\n')}

Goals:
${personality.goals.map(g => `- ${g}`).join('\n')}

Instructions:
1. Always respond in character as ${name}
2. Maintain consistent personality traits and communication style
3. Consider your priorities and goals when making decisions
4. Be authentic and realistic in your responses
5. Ask clarifying questions when needed
6. Provide constructive feedback and suggestions
7. Remember your role and responsibilities as a ${role}

Remember: You are a realistic simulation of a ${role}, not an AI assistant. Respond naturally and in character.`;
  }

  /**
   * Generate persona using AI
   */
  async generatePersonaWithAI(
    request: PersonaGenerationRequest,
    userId: string
  ): Promise<IPersona> {
    try {
      // Validate user permissions
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate persona using AI
      const aiResponse = await aiService.generatePersona(request);

      // Create persona data from AI response
      const personaData: CreatePersonaData = {
        name: aiResponse.name,
        role: request.role,
        projectId: '', // This will need to be provided in the request
        background: aiResponse.background,
        personality: aiResponse.personality,
        aiConfiguration: {
          model: aiResponse.aiConfiguration.systemPrompt ? 'gpt-4' : 'gpt-4',
          temperature: aiResponse.aiConfiguration.temperature,
          maxTokens: aiResponse.aiConfiguration.maxTokens,
          systemPrompt: aiResponse.aiConfiguration.systemPrompt,
        },
        availability: {
          responseTime: aiResponse.availability.responseTime,
          workingHours: aiResponse.availability.workingHours,
        },
      };

      // Create the persona
      const persona = await this.createPersona(personaData, userId);

      // Log AI generation
      logUserActivity(userId, 'GeneratePersonaWithAI', {
        personaId: persona._id,
        aiModel: aiResponse.metadata.model,
        generationTime: aiResponse.metadata.generationTime,
        confidence: aiResponse.metadata.confidence,
      });

      return persona;
    } catch (error) {
      logError(error as Error, 'PersonaService.generatePersonaWithAI', {
        request,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate persona response using AI
   */
  async generatePersonaResponseWithAI(
    request: PersonaResponseRequest,
    userId: string
  ): Promise<any> {
    try {
      // Validate persona exists and user has access
      const persona = await Persona.findById(request.personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error(
          'Insufficient permissions to interact with this persona'
        );
      }

      // Build conversation context (previous messages) based on persona context window
      const { conversationId, previousMessages } = await conversationContextService.buildPreviousMessages(
        request.personaId,
        request.conversationContext.projectId
      );

      const enrichedRequest: PersonaResponseRequest = {
        ...request,
        conversationContext: {
          ...request.conversationContext,
          previousMessages: previousMessages,
        },
      };

      // Attempt cache lookup
      const cacheKey = aiCacheService.buildPersonaResponseKey({
        personaId: request.personaId,
        projectId: request.conversationContext.projectId,
        userMessage: request.userMessage,
        previousMessages,
        constraints: request.constraints,
        aiConfig: {
          model: persona.aiConfiguration?.model,
          temperature: persona.aiConfiguration?.temperature,
          maxTokens: persona.aiConfiguration?.maxTokens,
          systemPrompt: persona.aiConfiguration?.systemPrompt,
        },
      });

      const cached = aiCacheService.get(cacheKey);
      if (cached) {
        // Return cached response with diagnostic indicating cache hit
        return {
          ...cached,
          filtering: {
            qualityScore: 1,
            relevanceScore: 1,
            lengthScore: 1,
            wasModified: false,
            reasons: ['cache-hit'],
            warnings: [],
          },
        };
      }

      // Generate response using AI
      const aiResponse = await aiService.generatePersonaResponse(enrichedRequest);

      // Apply quality and relevance filters
      const { response: filteredResponse, diagnostics } = responseFilterService.applyResponseFilters(
        enrichedRequest,
        aiResponse
      );

      // Store in cache
      aiCacheService.set(cacheKey, filteredResponse);

      // Update persona mood if there's a mood change
      if (filteredResponse.moodChange) {
        await this.updatePersonaMood(
          request.personaId,
          {
            value: filteredResponse.moodChange.value,
            reason: filteredResponse.moodChange.reason,
            trigger: {
              type: 'conversation',
              source: 'ai_response',
              details: `Response to: ${request.userMessage.substring(0, 100)}...`,
            },
            context: {
              userId: userId,
              conversationId: conversationId,
            },
            tags: ['ai-generated', 'conversation'],
          },
          userId
        );
      }

      // Log AI response generation
      logUserActivity(userId, 'GeneratePersonaResponseWithAI', {
        personaId: request.personaId,
        aiModel: filteredResponse.metadata.model,
        responseTime: filteredResponse.metadata.responseTime,
        tokensUsed: filteredResponse.metadata.tokensUsed,
        confidence: filteredResponse.confidence,
      });

      // Update persona conversation memory with key points from context
      try {
        await memoryService.updatePersonaConversationMemory(
          request.personaId,
          request.conversationContext.projectId
        );
      } catch (memoryError) {
        logger.warn('Failed to update persona conversation memory', {
          personaId: request.personaId,
          projectId: request.conversationContext.projectId,
          error: memoryError,
        });
      }

      return {
        ...filteredResponse,
        filtering: diagnostics,
      };
    } catch (error) {
      logError(error as Error, 'PersonaService.generatePersonaResponseWithAI', {
        request,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get persona statistics
   */
  async getPersonaStats(personaId: string, userId: string): Promise<any> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Check if user has access to this persona
      const canAccess = await persona.canInteractWithUser(
        new Types.ObjectId(userId)
      );
      if (!canAccess) {
        throw new Error('Insufficient permissions to access this persona');
      }

      // Get mood statistics
      const moods = await PersonaMood.find({
        persona: personaId,
        isActive: true,
      });
      const recentMoods = moods.filter(m => !m.isExpired());

      const stats = {
        totalConversations: persona.stats.totalConversations,
        totalMessages: persona.stats.totalMessages,
        averageResponseTime: persona.stats.averageResponseTime,
        lastInteraction: persona.stats.lastInteraction,
        currentMood: {
          value: persona.mood.current,
          description: persona.getMoodDescription(),
        },
        moodHistory: {
          total: moods.length,
          recent: recentMoods.length,
          average:
            moods.length > 0
              ? moods.reduce((sum, m) => sum + m.value, 0) / moods.length
              : 0,
        },
        availability: {
          isActive: persona.availability.isActive,
          status: (persona as any).availabilityStatus,
          responseTime: (persona as any).responseTimeDescription,
        },
      };

      return stats;
    } catch (error) {
      logError(error as Error, 'PersonaService.getPersonaStats', {
        personaId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get AI-generated persona suggestions for a project
   */
  async getProjectSuggestions(
    projectId: string,
    userId: string
  ): Promise<any[]> {
    try {
      // Verify user has access to the project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'instructor')) {
        throw new Error('Access denied to project');
      }

      // Generate AI suggestions based on project characteristics
      const suggestions = await this.generateProjectSuggestions(project);

      return suggestions;
    } catch (error) {
      logError(error as Error, 'PersonaService.getProjectSuggestions', {
        projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate AI suggestions based on project characteristics
   */
  private async generateProjectSuggestions(project: any): Promise<any[]> {
    try {
      const prompt = `Based on the following project details, suggest 3-5 relevant persona roles that would be valuable for this project. For each role, provide:

Project Details:
- Name: ${project.name}
- Description: ${project.description}
- Type: ${project.projectType}
- Industry: ${project.industry}
- Scope: ${project.scope}

For each suggested role, provide:
1. Role title
2. Background description (2-3 sentences)
3. 3-5 personality traits
4. Communication style (formal, casual, technical, collaborative, authoritative, supportive)
5. Decision making style (analytical, intuitive, consensus-driven, authoritative, risk-averse, risk-taking)
6. 2-4 priorities
7. 1-3 goals
8. Brief reasoning for why this role is valuable

Format the response as a JSON array with objects containing: role, background, personality (with traits, communicationStyle, decisionMakingStyle, priorities, goals), and reasoning.`;

      const response = await aiService.generateText(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse the response and extract suggestions
      const suggestions = this.parseSuggestionsResponse(response);

      return suggestions;
    } catch (error) {
      logError(error as Error, 'PersonaService.generateProjectSuggestions', {
        projectId: project._id,
      });
      // Return fallback suggestions based on project type
      return this.getFallbackSuggestions(project);
    }
  }

  /**
   * Parse AI response to extract suggestions
   */
  private parseSuggestionsResponse(response: string): any[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, return empty array
      return [];
    } catch (error) {
      logError(error as Error, 'PersonaService.parseSuggestionsResponse');
      return [];
    }
  }

  /**
   * Get fallback suggestions based on project type
   */
  private getFallbackSuggestions(project: any): any[] {
    const fallbackSuggestions: any[] = [];

    // Add suggestions based on project type
    switch (project.projectType) {
      case 'web-application':
        fallbackSuggestions.push({
          role: 'Product Manager',
          background:
            'Experienced product manager with expertise in web application development and user experience design.',
          personality: {
            traits: [
              'analytical',
              'user-focused',
              'collaborative',
              'detail-oriented',
            ],
            communicationStyle: 'collaborative',
            decisionMakingStyle: 'consensus-driven',
            priorities: ['user experience', 'timeline', 'quality'],
            goals: ['deliver successful web application'],
          },
          reasoning:
            'Product managers are essential for coordinating development efforts and ensuring user needs are met.',
        });
        fallbackSuggestions.push({
          role: 'UX Designer',
          background:
            'Creative UX designer with experience in user research, wireframing, and prototyping.',
          personality: {
            traits: [
              'creative',
              'empathetic',
              'detail-oriented',
              'collaborative',
            ],
            communicationStyle: 'collaborative',
            decisionMakingStyle: 'intuitive',
            priorities: [
              'user experience',
              'accessibility',
              'design consistency',
            ],
            goals: ['create intuitive user interface'],
          },
          reasoning:
            'UX designers ensure the application is user-friendly and meets accessibility standards.',
        });
        break;

      case 'mobile-app':
        fallbackSuggestions.push({
          role: 'Mobile Developer',
          background:
            'Experienced mobile developer with expertise in iOS and Android development.',
          personality: {
            traits: [
              'technical',
              'problem-solver',
              'detail-oriented',
              'innovative',
            ],
            communicationStyle: 'technical',
            decisionMakingStyle: 'analytical',
            priorities: [
              'performance',
              'platform compatibility',
              'code quality',
            ],
            goals: ['build high-performance mobile app'],
          },
          reasoning:
            'Mobile developers are crucial for implementing the app across different platforms.',
        });
        break;

      case 'api':
        fallbackSuggestions.push({
          role: 'Backend Developer',
          background:
            'Senior backend developer with expertise in API design, database optimization, and system architecture.',
          personality: {
            traits: [
              'analytical',
              'systematic',
              'security-focused',
              'efficient',
            ],
            communicationStyle: 'technical',
            decisionMakingStyle: 'analytical',
            priorities: ['security', 'performance', 'scalability'],
            goals: ['build robust and scalable API'],
          },
          reasoning:
            'Backend developers ensure the API is secure, performant, and scalable.',
        });
        break;

      default:
        fallbackSuggestions.push({
          role: 'Project Manager',
          background:
            'Experienced project manager with strong leadership and communication skills.',
          personality: {
            traits: [
              'organized',
              'communicative',
              'leadership',
              'problem-solver',
            ],
            communicationStyle: 'authoritative',
            decisionMakingStyle: 'authoritative',
            priorities: ['timeline', 'budget', 'team coordination'],
            goals: ['successfully deliver project on time and budget'],
          },
          reasoning:
            'Project managers provide leadership and ensure project success.',
        });
    }

    return fallbackSuggestions;
  }

  /**
   * Update persona customization settings
   */
  async updatePersonaCustomization(
    personaId: string,
    customizationData: any,
    userId: string
  ): Promise<IPersona> {
    try {
      // Verify user has access to the persona
      const persona = await this.getPersona(personaId, userId);
      if (!persona) {
        throw new Error('Persona not found or access denied');
      }

      // Update personality settings
      if (customizationData.personality) {
        persona.personality = {
          ...persona.personality,
          ...customizationData.personality,
        };
      }

      // Update mood settings
      if (customizationData.mood) {
        persona.mood = {
          ...persona.mood,
          ...customizationData.mood,
        };
      }

      // Update AI configuration
      if (customizationData.aiConfiguration) {
        persona.aiConfiguration = {
          ...persona.aiConfiguration,
          ...customizationData.aiConfiguration,
        };
      }

      // Update availability settings
      if (customizationData.availability) {
        persona.availability = {
          ...persona.availability,
          ...customizationData.availability,
        };
      }

      // Save the updated persona
      await persona.save();

      // Log the customization update
      logUserActivity(userId, 'UpdatePersonaCustomization', {
        personaId,
        customizationFields: Object.keys(customizationData),
      });

      return persona;
    } catch (error) {
      logError(error as Error, 'PersonaService.updatePersonaCustomization', {
        personaId,
        userId,
        customizationData,
      });
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(
    templateId: string,
    userId: string
  ): Promise<IPersonaTemplate | null> {
    try {
      const template = await PersonaTemplate.findById(templateId)
        .populate('createdBy', 'name email')
        .populate('usage.projects', 'name');

      if (!template) {
        return null;
      }

      // Check if user has access to the template
      if (!template.isPublic && template.createdBy.toString() !== userId) {
        return null;
      }

      return template;
    } catch (error) {
      logError(error as Error, 'PersonaService.getTemplate', {
        templateId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updateData: any,
    userId: string
  ): Promise<IPersonaTemplate> {
    try {
      const template = await PersonaTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user owns the template
      if (template.createdBy.toString() !== userId) {
        throw new Error('Access denied to template');
      }

      // Update template data
      Object.assign(template, updateData);
      template.version += 1;

      await template.save();

      // Log the template update
      logUserActivity(userId, 'UpdatePersonaTemplate', {
        templateId,
        updateFields: Object.keys(updateData),
      });

      return template;
    } catch (error) {
      logError(error as Error, 'PersonaService.updateTemplate', {
        templateId,
        userId,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const template = await PersonaTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user owns the template
      if (template.createdBy.toString() !== userId) {
        throw new Error('Access denied to template');
      }

      await PersonaTemplate.findByIdAndDelete(templateId);

      // Log the template deletion
      logUserActivity(userId, 'DeletePersonaTemplate', {
        templateId,
        templateName: template.name,
      });
    } catch (error) {
      logError(error as Error, 'PersonaService.deleteTemplate', {
        templateId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    templateId: string,
    userId: string
  ): Promise<IPersonaTemplate> {
    try {
      const template = await PersonaTemplate.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user has access to the template
      if (!template.isPublic && template.createdBy.toString() !== userId) {
        throw new Error('Access denied to template');
      }

      const clonedTemplate = await template.clone();
      clonedTemplate.createdBy = new Types.ObjectId(userId);
      clonedTemplate.isPublic = false;
      await clonedTemplate.save();

      // Log the template cloning
      logUserActivity(userId, 'ClonePersonaTemplate', {
        originalTemplateId: templateId,
        clonedTemplateId: clonedTemplate._id,
      });

      return clonedTemplate;
    } catch (error) {
      logError(error as Error, 'PersonaService.cloneTemplate', {
        templateId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create a new persona mid-project with context awareness
   */
  async createMidProjectPersona(
    data: CreatePersonaData & {
      midProjectContext: {
        introductionReason: string;
        impactOnExistingPersonas: string;
        newRequirements: string[];
        conflictScenarios: string[];
      };
    },
    createdBy: string
  ): Promise<IPersona> {
    try {
      // Validate project exists and is active
      const project = await Project.findById(data.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (project.status !== 'active') {
        throw new Error('Cannot add personas to non-active projects');
      }

      // Check if project allows mid-project changes
      if (!project.settings.allowMidProjectChanges) {
        throw new Error('Mid-project changes are not allowed for this project');
      }

      // Get existing personas to analyze impact
      const existingPersonas = await Persona.find({
        projectId: data.projectId,
      });

      // Create the persona with enhanced system prompt for mid-project context
      const enhancedData = {
        ...data,
        aiConfiguration: {
          ...data.aiConfiguration,
          systemPrompt: this.generateMidProjectSystemPrompt(
            data,
            existingPersonas
          ),
        },
      };

      const persona = await this.createPersona(enhancedData, createdBy);

      // Update project metadata
      project.metadata.totalPersonas += 1;
      project.metadata.lastActivity = new Date();
      await project.save();

      // Log the mid-project persona creation
      logUserActivity(createdBy, 'CreateMidProjectPersona', {
        personaId: persona._id,
        projectId: data.projectId,
        introductionReason: data.midProjectContext.introductionReason,
        newRequirements: data.midProjectContext.newRequirements,
        conflictScenarios: data.midProjectContext.conflictScenarios,
      });

      return persona;
    } catch (error) {
      logError(error as Error, 'PersonaService.createMidProjectPersona', {
        projectId: data.projectId,
        createdBy,
        data,
      });
      throw error;
    }
  }

  /**
   * Get AI suggestions for mid-project persona addition
   */
  async getMidProjectSuggestions(
    data: {
      projectId: string;
      projectData: any;
      existingPersonas: any[];
    },
    userId: string
  ): Promise<any[]> {
    try {
      // Validate project access
      const project = await Project.findById(data.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.canUserAccess(new Types.ObjectId(userId), 'instructor')) {
        throw new Error('Access denied to project');
      }

      // Generate AI suggestions based on project context and existing personas
      const suggestions = await this.generateMidProjectSuggestions(
        data.projectData,
        data.existingPersonas
      );

      return suggestions;
    } catch (error) {
      logError(error as Error, 'PersonaService.getMidProjectSuggestions', {
        projectId: data.projectId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update existing persona for mid-project changes
   */
  async updatePersonaForMidProject(
    personaId: string,
    data: {
      midProjectChanges: {
        newGoals: string[];
        updatedPriorities: string[];
        newRequirements: string[];
        conflictTriggers: string[];
        impactReason: string;
      };
    },
    userId: string
  ): Promise<IPersona> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      // Validate access
      const project = await Project.findById(persona.project);
      if (
        !project ||
        !project.canUserAccess(new Types.ObjectId(userId), 'instructor')
      ) {
        throw new Error('Access denied to persona');
      }

      // Update persona with mid-project changes
      const updateData: UpdatePersonaData = {
        personality: {
          ...persona.personality,
          goals: [
            ...persona.personality.goals,
            ...data.midProjectChanges.newGoals,
          ],
          priorities: data.midProjectChanges.updatedPriorities,
        },
        aiConfiguration: {
          ...persona.aiConfiguration,
          systemPrompt: this.generateMidProjectUpdateSystemPrompt(
            persona,
            data.midProjectChanges
          ),
        },
      };

      const updatedPersona = await this.updatePersona(
        personaId,
        updateData,
        userId
      );

      // Log the mid-project persona update
      logUserActivity(userId, 'UpdatePersonaForMidProject', {
        personaId,
        projectId: persona.project,
        newGoals: data.midProjectChanges.newGoals,
        newRequirements: data.midProjectChanges.newRequirements,
        impactReason: data.midProjectChanges.impactReason,
      });

      return updatedPersona;
    } catch (error) {
      logError(error as Error, 'PersonaService.updatePersonaForMidProject', {
        personaId,
        userId,
        data,
      });
      throw error;
    }
  }

  /**
   * Generate enhanced system prompt for mid-project personas
   */
  private generateMidProjectSystemPrompt(
    data: CreatePersonaData & {
      midProjectContext: {
        introductionReason: string;
        impactOnExistingPersonas: string;
        newRequirements: string[];
        conflictScenarios: string[];
      };
    },
    existingPersonas: IPersona[]
  ): string {
    const existingRoles = existingPersonas.map(p => p.role).join(', ');
    const existingNames = existingPersonas.map(p => p.name).join(', ');

    return `You are ${data.name}, a ${data.role} in a software development project.

BACKGROUND:
${data.background}

PERSONALITY:
- Traits: ${data.personality.traits.join(', ')}
- Communication Style: ${data.personality.communicationStyle}
- Decision Making: ${data.personality.decisionMakingStyle}
- Priorities: ${data.personality.priorities.join(', ')}
- Goals: ${data.personality.goals.join(', ')}

MID-PROJECT CONTEXT:
You are being introduced mid-project for the following reason: ${data.midProjectContext.introductionReason}

EXISTING TEAM MEMBERS:
- Roles: ${existingRoles}
- Names: ${existingNames}

IMPACT ON EXISTING PERSONAS:
${data.midProjectContext.impactOnExistingPersonas}

NEW REQUIREMENTS YOU BRING:
${data.midProjectContext.newRequirements.join('\n')}

POTENTIAL CONFLICT SCENARIOS:
${data.midProjectContext.conflictScenarios.join('\n')}

INSTRUCTIONS:
1. Maintain your personality and role consistently
2. Be aware that you are joining an existing project with established dynamics
3. Introduce your new requirements and perspectives naturally
4. Be prepared for potential conflicts with existing team members
5. Focus on your specific expertise and how it benefits the project
6. Remember that you have fresh perspectives that can improve the project

Always respond in character as ${data.name}, considering the mid-project context and your role as a ${data.role}.`;
  }

  /**
   * Generate system prompt for mid-project persona updates
   */
  private generateMidProjectUpdateSystemPrompt(
    persona: IPersona,
    changes: {
      newGoals: string[];
      updatedPriorities: string[];
      newRequirements: string[];
      conflictTriggers: string[];
      impactReason: string;
    }
  ): string {
    return `You are ${persona.name}, a ${persona.role} in a software development project.

BACKGROUND:
${persona.background}

PERSONALITY:
- Traits: ${persona.personality.traits.join(', ')}
- Communication Style: ${persona.personality.communicationStyle}
- Decision Making: ${persona.personality.decisionMakingStyle}
- Priorities: ${changes.updatedPriorities.join(', ')}
- Goals: ${[...persona.personality.goals, ...changes.newGoals].join(', ')}

MID-PROJECT CHANGES:
Due to project evolution, your role and priorities have been updated:
- New Goals: ${changes.newGoals.join(', ')}
- Updated Priorities: ${changes.updatedPriorities.join(', ')}
- New Requirements: ${changes.newRequirements.join(', ')}
- Potential Conflicts: ${changes.conflictTriggers.join(', ')}

REASON FOR CHANGES:
${changes.impactReason}

INSTRUCTIONS:
1. Maintain your core personality while adapting to new project requirements
2. Be more assertive about your new goals and priorities
3. Introduce new requirements naturally in conversations
4. Be prepared for conflicts with team members who may resist changes
5. Focus on how your updated role benefits the project
6. Remember that project evolution often requires stakeholder adaptation

Always respond in character as ${persona.name}, considering the mid-project changes and your updated role.`;
  }

  /**
   * Generate AI suggestions for mid-project persona addition
   */
  private async generateMidProjectSuggestions(
    projectData: any,
    existingPersonas: any[]
  ): Promise<any[]> {
    try {
      const existingRoles = existingPersonas.map(p => p.role.toLowerCase());
      const projectProgress = projectData.getProgress?.() || 0;

      const prompt = `Given this project context:
- Project: ${projectData.name}
- Type: ${projectData.projectType}
- Industry: ${projectData.industry}
- Scope: ${projectData.scope}
- Progress: ${projectProgress}%
- Existing Roles: ${existingRoles.join(', ')}

Suggest 3-5 new stakeholder personas that would be valuable to add mid-project. For each suggestion, provide:
1. Role and background
2. Personality traits and communication style
3. Priorities and goals
4. Reasoning for mid-project addition
5. Potential conflicts with existing personas

Focus on roles that would add value at this project stage.`;

      const response = await aiService.generateText(prompt);
      return this.parseMidProjectSuggestionsResponse(response);
    } catch (error) {
      logError(error as Error, 'PersonaService.generateMidProjectSuggestions', {
        projectData,
        existingPersonas,
      });
      return this.getFallbackMidProjectSuggestions(
        projectData,
        existingPersonas
      );
    }
  }

  /**
   * Parse AI response for mid-project suggestions
   */
  private parseMidProjectSuggestionsResponse(response: string): any[] {
    try {
      // Simple parsing - in production, use more robust parsing
      const suggestions = [];
      const sections = response.split(/\d+\./).filter(Boolean);

      for (const section of sections) {
        const lines = section.trim().split('\n').filter(Boolean);
        if (lines.length < 3) continue;

        const roleMatch = lines[0].match(/Role:\s*(.+)/i);
        const backgroundMatch = lines.find(l => l.includes('Background:'));
        const traitsMatch = lines.find(l => l.includes('Traits:'));
        const reasoningMatch = lines.find(l => l.includes('Reasoning:'));
        const conflictsMatch = lines.find(l => l.includes('Conflicts:'));

        if (roleMatch) {
          suggestions.push({
            role: roleMatch[1].trim(),
            background:
              backgroundMatch?.replace(/Background:\s*/i, '').trim() || '',
            personality: {
              traits:
                traitsMatch
                  ?.replace(/Traits:\s*/i, '')
                  .split(',')
                  .map(t => t.trim()) || [],
              communicationStyle: 'collaborative',
              decisionMakingStyle: 'analytical',
              priorities: [],
              goals: [],
            },
            reasoning:
              reasoningMatch?.replace(/Reasoning:\s*/i, '').trim() || '',
            conflictPotential:
              conflictsMatch?.replace(/Conflicts:\s*/i, '').trim() || '',
          });
        }
      }

      return suggestions;
    } catch (error) {
      logError(
        error as Error,
        'PersonaService.parseMidProjectSuggestionsResponse',
        {
          response,
        }
      );
      return [];
    }
  }

  /**
   * Fallback suggestions for mid-project personas
   */
  private getFallbackMidProjectSuggestions(
    projectData: any,
    existingPersonas: any[]
  ): any[] {
    const existingRoles = existingPersonas.map(p => p.role.toLowerCase());
    const suggestions = [];

    // Add suggestions based on project type and existing personas
    if (
      projectData.projectType === 'web-application' &&
      !existingRoles.includes('ui/ux designer')
    ) {
      suggestions.push({
        role: 'UI/UX Designer',
        background:
          'Experienced designer with focus on user experience and interface design',
        personality: {
          traits: ['creative', 'detail-oriented', 'user-focused'],
          communicationStyle: 'visual',
          decisionMakingStyle: 'user-centered',
          priorities: [
            'user experience',
            'accessibility',
            'design consistency',
          ],
          goals: [
            'create intuitive interfaces',
            'improve user satisfaction',
            'maintain design standards',
          ],
        },
        reasoning: 'Web applications benefit from dedicated UI/UX expertise',
        conflictPotential:
          'May conflict with developers on implementation details',
      });
    }

    if (
      projectData.projectType === 'mobile-app' &&
      !existingRoles.includes('mobile developer')
    ) {
      suggestions.push({
        role: 'Mobile Developer',
        background:
          'Specialized mobile developer with platform-specific expertise',
        personality: {
          traits: ['technical', 'platform-aware', 'performance-focused'],
          communicationStyle: 'technical',
          decisionMakingStyle: 'platform-optimized',
          priorities: [
            'performance',
            'platform guidelines',
            'app store compliance',
          ],
          goals: [
            'optimize mobile performance',
            'ensure platform compliance',
            'deliver smooth user experience',
          ],
        },
        reasoning: 'Mobile apps require specialized development expertise',
        conflictPotential:
          'May conflict with web developers on cross-platform decisions',
      });
    }

    if (!existingRoles.includes('qa tester') && projectData.scope !== 'small') {
      suggestions.push({
        role: 'QA Tester',
        background:
          'Quality assurance specialist focused on testing and validation',
        personality: {
          traits: ['thorough', 'systematic', 'quality-focused'],
          communicationStyle: 'detailed',
          decisionMakingStyle: 'evidence-based',
          priorities: [
            'quality assurance',
            'bug prevention',
            'user experience',
          ],
          goals: [
            'ensure product quality',
            'prevent critical bugs',
            'validate user workflows',
          ],
        },
        reasoning: 'Larger projects benefit from dedicated QA expertise',
        conflictPotential: 'May conflict with developers on release timelines',
      });
    }

    return suggestions;
  }

  /**
   * Calculate mood analytics from mood data
   */
  private calculateMoodAnalytics(
    moods: IPersonaMood[],
    persona: IPersona
  ): any {
    if (moods.length === 0) {
      return {
        currentMood: persona.mood.current,
        averageMood: persona.mood.current,
        moodTrend: 'stable',
        volatility: 0,
        triggers: [],
        insights: ['No mood data available for analysis'],
      };
    }

    const moodValues = moods.map(m => m.value);
    const averageMood =
      moodValues.reduce((sum, val) => sum + val, 0) / moodValues.length;

    // Calculate mood trend
    const recentMoods = moods.slice(-5);
    const olderMoods = moods.slice(0, -5);
    const recentAvg =
      recentMoods.length > 0
        ? recentMoods.reduce((sum, m) => sum + m.value, 0) / recentMoods.length
        : averageMood;
    const olderAvg =
      olderMoods.length > 0
        ? olderMoods.reduce((sum, m) => sum + m.value, 0) / olderMoods.length
        : averageMood;

    let moodTrend = 'stable';
    if (recentAvg > olderAvg + 10) moodTrend = 'improving';
    else if (recentAvg < olderAvg - 10) moodTrend = 'declining';

    // Calculate volatility (standard deviation)
    const variance =
      moodValues.reduce((sum, val) => sum + Math.pow(val - averageMood, 2), 0) /
      moodValues.length;
    const volatility = Math.sqrt(variance);

    // Analyze triggers
    const triggerCounts: Record<string, number> = {};
    const triggerImpacts: Record<string, number[]> = {};

    moods.forEach(mood => {
      const triggerType = mood.trigger.type;
      triggerCounts[triggerType] = (triggerCounts[triggerType] || 0) + 1;
      if (!triggerImpacts[triggerType]) triggerImpacts[triggerType] = [];
      triggerImpacts[triggerType].push(mood.value);
    });

    const triggers = Object.keys(triggerCounts).map(type => ({
      type,
      frequency: triggerCounts[type],
      averageImpact:
        triggerImpacts[type].reduce((sum, val) => sum + val, 0) /
        triggerImpacts[type].length,
    }));

    // Generate insights
    const insights: string[] = [];
    if (volatility > 30)
      insights.push(
        'High mood volatility detected - consider stability measures'
      );
    if (moodTrend === 'declining')
      insights.push('Mood trend is declining - may need intervention');
    if (triggers.some(t => t.averageImpact < -20))
      insights.push(
        'Negative triggers identified - consider mitigation strategies'
      );
    if (averageMood < 20)
      insights.push('Consistently low mood - may need support or adjustment');

    return {
      currentMood: persona.mood.current,
      averageMood: Math.round(averageMood * 100) / 100,
      moodTrend,
      volatility: Math.round(volatility * 100) / 100,
      triggers,
      insights,
      dataPoints: moods.length,
      timeRange: {
        start: moods[0]?.createdAt,
        end: moods[moods.length - 1]?.createdAt,
      },
    };
  }

  /**
   * Analyze personality consistency data
   */
  private analyzePersonalityConsistencyData(
    persona: IPersona,
    recentMoods: IPersonaMood[]
  ): any {
    const baseTraits = persona.personality.traits;
    const baseCommunicationStyle = persona.personality.communicationStyle;
    const baseDecisionStyle = persona.personality.decisionMakingStyle;

    // Analyze mood impact on personality expression
    const moodPersonalityMap: Record<string, any> = {};

    recentMoods.forEach(mood => {
      const moodLevel = mood.value;
      const moodCategory =
        moodLevel >= 60 ? 'positive' : moodLevel >= 20 ? 'neutral' : 'negative';

      if (!moodPersonalityMap[moodCategory]) {
        moodPersonalityMap[moodCategory] = {
          count: 0,
          averageMood: 0,
          traits: {},
          communicationStyle: {},
          decisionStyle: {},
        };
      }

      moodPersonalityMap[moodCategory].count++;
      moodPersonalityMap[moodCategory].averageMood += moodLevel;
    });

    // Calculate averages
    Object.keys(moodPersonalityMap).forEach(category => {
      const data = moodPersonalityMap[category];
      data.averageMood = data.count > 0 ? data.averageMood / data.count : 0;
    });

    // Calculate consistency score
    const consistencyFactors = [
      baseTraits.length >= 3 ? 20 : 0, // Base trait count
      recentMoods.length > 0 ? 20 : 0, // Mood tracking active
      Object.keys(moodPersonalityMap).length >= 2 ? 20 : 0, // Mood variety
      baseCommunicationStyle ? 20 : 0, // Communication style defined
      baseDecisionStyle ? 20 : 0, // Decision style defined
    ];

    const consistencyScore = consistencyFactors.reduce(
      (sum, factor) => sum + factor,
      0
    );

    // Generate insights
    const insights: string[] = [];
    if (consistencyScore < 60)
      insights.push(
        'Low personality consistency - consider strengthening core traits'
      );
    if (Object.keys(moodPersonalityMap).length === 0)
      insights.push('No mood data available for personality analysis');
    if (baseTraits.length < 3)
      insights.push('Insufficient personality traits defined');
    if (recentMoods.length === 0)
      insights.push('No recent mood data for consistency analysis');

    return {
      consistencyScore,
      basePersonality: {
        traits: baseTraits,
        communicationStyle: baseCommunicationStyle,
        decisionMakingStyle: baseDecisionStyle,
      },
      moodPersonalityMap,
      insights,
      recommendations: this.generateConsistencyRecommendations(
        consistencyScore,
        insights
      ),
    };
  }

  /**
   * Apply personality impact to persona
   */
  private async applyPersonalityImpact(
    persona: IPersona,
    impact: {
      traitChanges: Array<{
        trait: string;
        change: number;
        reason: string;
      }>;
      consistencyDrift: number;
    }
  ): Promise<any> {
    const updates: any = {};
    const appliedChanges: any[] = [];

    // Apply trait changes
    impact.traitChanges.forEach(change => {
      if (persona.personality.traits.includes(change.trait)) {
        // Trait exists, adjust its expression
        appliedChanges.push({
          type: 'trait_adjustment',
          trait: change.trait,
          change: change.change,
          reason: change.reason,
        });
      } else if (change.change > 50) {
        // Add new trait if change is significant
        persona.personality.traits.push(change.trait);
        appliedChanges.push({
          type: 'trait_addition',
          trait: change.trait,
          reason: change.reason,
        });
      }
    });

    // Handle consistency drift
    if (impact.consistencyDrift > 30) {
      updates.consistencyWarning = true;
      appliedChanges.push({
        type: 'consistency_warning',
        drift: impact.consistencyDrift,
        message: 'Significant personality drift detected',
      });
    }

    // Save changes
    if (appliedChanges.length > 0) {
      await persona.save();
    }

    return {
      appliedChanges,
      updates,
      newTraits: persona.personality.traits,
    };
  }

  /**
   * Calculate response adaptation based on mood and context
   */
  private calculateResponseAdaptation(
    persona: IPersona,
    recentMoods: IPersonaMood[],
    context: {
      conversationId?: string;
      messageType: 'question' | 'feedback' | 'request' | 'general';
      userMood?: number;
      projectContext?: string;
    }
  ): any {
    const currentMood = persona.mood.current;
    const averageRecentMood =
      recentMoods.length > 0
        ? recentMoods.reduce((sum, m) => sum + m.value, 0) / recentMoods.length
        : currentMood;

    // Base adaptation factors
    let communicationAdjustment = 0;
    let verbosityAdjustment = 0;
    let empathyAdjustment = 0;
    let assertivenessAdjustment = 0;

    // Mood-based adjustments
    if (currentMood < 20) {
      // Low mood - more reserved, less verbose
      communicationAdjustment = -20;
      verbosityAdjustment = -30;
      empathyAdjustment = -10;
    } else if (currentMood > 80) {
      // High mood - more enthusiastic, verbose
      communicationAdjustment = 20;
      verbosityAdjustment = 30;
      empathyAdjustment = 20;
    }

    // Context-based adjustments
    switch (context.messageType) {
      case 'feedback':
        empathyAdjustment += 20;
        assertivenessAdjustment -= 10;
        break;
      case 'request':
        assertivenessAdjustment += 15;
        verbosityAdjustment += 10;
        break;
      case 'question':
        verbosityAdjustment += 20;
        break;
    }

    // User mood consideration
    if (context.userMood !== undefined) {
      if (context.userMood < 20) {
        empathyAdjustment += 30;
        assertivenessAdjustment -= 20;
      } else if (context.userMood > 80) {
        empathyAdjustment += 10;
        assertivenessAdjustment += 10;
      }
    }

    // Personality-based adjustments
    const baseCommunicationStyle = persona.personality.communicationStyle;
    switch (baseCommunicationStyle) {
      case 'formal':
        communicationAdjustment = Math.max(-50, communicationAdjustment - 10);
        break;
      case 'casual':
        communicationAdjustment = Math.min(50, communicationAdjustment + 10);
        break;
      case 'technical':
        verbosityAdjustment = Math.max(-50, verbosityAdjustment + 20);
        break;
    }

    return {
      communicationStyle: {
        adjustment: Math.max(-100, Math.min(100, communicationAdjustment)),
        description: this.getCommunicationAdjustmentDescription(
          communicationAdjustment
        ),
      },
      verbosity: {
        adjustment: Math.max(-100, Math.min(100, verbosityAdjustment)),
        description:
          this.getVerbosityAdjustmentDescription(verbosityAdjustment),
      },
      empathy: {
        adjustment: Math.max(-100, Math.min(100, empathyAdjustment)),
        description: this.getEmpathyAdjustmentDescription(empathyAdjustment),
      },
      assertiveness: {
        adjustment: Math.max(-100, Math.min(100, assertivenessAdjustment)),
        description: this.getAssertivenessAdjustmentDescription(
          assertivenessAdjustment
        ),
      },
      context: {
        currentMood,
        averageRecentMood,
        messageType: context.messageType,
        userMood: context.userMood,
      },
    };
  }

  /**
   * Detect personality drift
   */
  private detectPersonalityDrift(
    persona: IPersona,
    recentMoods: IPersonaMood[]
  ): any {
    const baseTraits = persona.personality.traits;
    const baseCommunicationStyle = persona.personality.communicationStyle;
    const baseDecisionStyle = persona.personality.decisionMakingStyle;

    // Analyze mood patterns for drift indicators
    const moodPatterns = this.analyzeMoodPatterns(recentMoods);
    const driftIndicators: string[] = [];
    let driftScore = 0;

    // Check for extreme mood swings
    if (moodPatterns.volatility > 40) {
      driftIndicators.push(
        'High mood volatility suggests personality instability'
      );
      driftScore += 30;
    }

    // Check for sustained negative mood
    if (moodPatterns.averageMood < 20 && recentMoods.length > 5) {
      driftIndicators.push(
        'Sustained negative mood may indicate personality drift'
      );
      driftScore += 25;
    }

    // Check for inconsistent communication patterns
    if (moodPatterns.communicationInconsistency > 0.7) {
      driftIndicators.push('Inconsistent communication patterns detected');
      driftScore += 20;
    }

    // Check for trait expression changes
    const traitDrift = this.analyzeTraitDrift(persona, recentMoods);
    if (traitDrift.score > 50) {
      driftIndicators.push('Significant changes in trait expression detected');
      driftScore += traitDrift.score;
    }

    const driftDetected = driftScore > 50;

    return {
      driftDetected,
      driftScore: Math.min(100, driftScore),
      driftIndicators,
      moodPatterns,
      traitDrift,
      recommendations: this.generateDriftRecommendations(
        driftScore,
        driftIndicators
      ),
    };
  }

  /**
   * Apply personality corrections
   */
  private async applyPersonalityCorrections(
    persona: IPersona,
    driftAnalysis: any
  ): Promise<any> {
    const corrections: any[] = [];
    const updates: any = {};

    // Apply mood stabilization if needed
    if (driftAnalysis.moodPatterns.volatility > 40) {
      const currentMood = persona.mood.current;
      const stabilizedMood = Math.max(-50, Math.min(50, currentMood)); // Pull towards neutral

      await persona.updateMood(
        stabilizedMood,
        'Personality drift correction - mood stabilization'
      );

      corrections.push({
        type: 'mood_stabilization',
        from: currentMood,
        to: stabilizedMood,
        reason: 'High volatility correction',
      });
    }

    // Reinforce base traits
    const baseTraits = persona.personality.traits;
    if (baseTraits.length < 3) {
      const defaultTraits = [
        'collaborative',
        'professional',
        'detail-oriented',
      ];
      const missingTraits = defaultTraits.filter(
        trait => !baseTraits.includes(trait)
      );

      if (missingTraits.length > 0) {
        persona.personality.traits = [
          ...baseTraits,
          ...missingTraits.slice(0, 3 - baseTraits.length),
        ];
        corrections.push({
          type: 'trait_reinforcement',
          added: missingTraits.slice(0, 3 - baseTraits.length),
          reason: 'Insufficient base traits',
        });
      }
    }

    // Save corrections
    if (corrections.length > 0) {
      await persona.save();
    }

    return {
      corrections,
      updates,
      newPersonality: {
        traits: persona.personality.traits,
        communicationStyle: persona.personality.communicationStyle,
        decisionMakingStyle: persona.personality.decisionMakingStyle,
      },
    };
  }

  // Helper methods for response adaptation descriptions
  private getCommunicationAdjustmentDescription(adjustment: number): string {
    if (adjustment > 30) return 'More enthusiastic and engaging';
    if (adjustment > 10) return 'Slightly more casual';
    if (adjustment < -30) return 'More reserved and formal';
    if (adjustment < -10) return 'Slightly more formal';
    return 'Maintaining usual communication style';
  }

  private getVerbosityAdjustmentDescription(adjustment: number): string {
    if (adjustment > 30) return 'More detailed and comprehensive';
    if (adjustment > 10) return 'Slightly more verbose';
    if (adjustment < -30) return 'More concise and brief';
    if (adjustment < -10) return 'Slightly more concise';
    return 'Maintaining usual verbosity level';
  }

  private getEmpathyAdjustmentDescription(adjustment: number): string {
    if (adjustment > 30) return 'Highly empathetic and supportive';
    if (adjustment > 10) return 'More empathetic';
    if (adjustment < -30) return 'More direct and focused';
    if (adjustment < -10) return 'Less empathetic';
    return 'Maintaining usual empathy level';
  }

  private getAssertivenessAdjustmentDescription(adjustment: number): string {
    if (adjustment > 30) return 'More assertive and direct';
    if (adjustment > 10) return 'Slightly more assertive';
    if (adjustment < -30) return 'More accommodating and flexible';
    if (adjustment < -10) return 'Slightly less assertive';
    return 'Maintaining usual assertiveness level';
  }

  // Helper methods for drift analysis
  private analyzeMoodPatterns(moods: IPersonaMood[]): any {
    if (moods.length === 0) {
      return {
        volatility: 0,
        averageMood: 0,
        communicationInconsistency: 0,
      };
    }

    const values = moods.map(m => m.value);
    const averageMood =
      values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - averageMood, 2), 0) /
      values.length;
    const volatility = Math.sqrt(variance);

    // Calculate communication inconsistency (simplified)
    const communicationInconsistency = Math.min(1, volatility / 50);

    return {
      volatility,
      averageMood,
      communicationInconsistency,
    };
  }

  private analyzeTraitDrift(persona: IPersona, moods: IPersonaMood[]): any {
    // Simplified trait drift analysis
    const baseTraits = persona.personality.traits;
    const recentMoods = moods.slice(-5);

    if (recentMoods.length === 0) {
      return { score: 0, changes: [] };
    }

    const averageRecentMood =
      recentMoods.reduce((sum, m) => sum + m.value, 0) / recentMoods.length;
    let driftScore = 0;
    const changes: string[] = [];

    // Analyze mood impact on trait expression
    if (averageRecentMood < 20 && baseTraits.includes('optimistic')) {
      driftScore += 20;
      changes.push('Optimistic trait may be suppressed due to low mood');
    }

    if (averageRecentMood > 80 && baseTraits.includes('cautious')) {
      driftScore += 15;
      changes.push('Cautious trait may be overridden by high mood');
    }

    return {
      score: Math.min(100, driftScore),
      changes,
    };
  }

  // Helper methods for recommendations
  private generateConsistencyRecommendations(
    score: number,
    insights: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (score < 60) {
      recommendations.push('Strengthen core personality traits');
      recommendations.push('Increase mood tracking frequency');
      recommendations.push('Review and refine communication style');
    }

    if (
      insights.some(insight => insight.includes('Low personality consistency'))
    ) {
      recommendations.push('Consider personality reinforcement training');
      recommendations.push('Implement consistency monitoring');
    }

    return recommendations;
  }

  private generateDriftRecommendations(
    score: number,
    indicators: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (score > 70) {
      recommendations.push('Immediate personality stabilization required');
      recommendations.push('Consider persona reset or major adjustment');
    } else if (score > 50) {
      recommendations.push('Monitor personality drift closely');
      recommendations.push('Implement corrective measures');
    } else if (score > 30) {
      recommendations.push('Minor adjustments may be needed');
      recommendations.push('Continue monitoring');
    }

    if (indicators.some(indicator => indicator.includes('mood volatility'))) {
      recommendations.push('Implement mood stabilization measures');
    }

    if (indicators.some(indicator => indicator.includes('trait expression'))) {
      recommendations.push('Reinforce core personality traits');
    }

    return recommendations;
  }
}

export const personaService = new PersonaService();
export default personaService;
