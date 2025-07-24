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
      logError(error, 'PersonaService.updatePersonaMood', {
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
      logError(error, 'PersonaService.getPersonaMoodHistory', {
        personaId,
        userId,
        limit,
      });
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
      logError(error, 'PersonaService.getAvailableTemplates', {
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
      logError(error, 'PersonaService.createTemplate', {
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

      // Generate response using AI
      const aiResponse = await aiService.generatePersonaResponse(request);

      // Update persona mood if there's a mood change
      if (aiResponse.moodChange) {
        await this.updatePersonaMood(
          request.personaId,
          {
            value: aiResponse.moodChange.value,
            reason: aiResponse.moodChange.reason,
            trigger: {
              type: 'conversation',
              source: 'ai_response',
              details: `Response to: ${request.userMessage.substring(0, 100)}...`,
            },
            context: {
              userId: userId,
              conversationId: request.conversationContext.projectId, // This should be actual conversation ID
            },
            tags: ['ai-generated', 'conversation'],
          },
          userId
        );
      }

      // Log AI response generation
      logUserActivity(userId, 'GeneratePersonaResponseWithAI', {
        personaId: request.personaId,
        aiModel: aiResponse.metadata.model,
        responseTime: aiResponse.metadata.responseTime,
        tokensUsed: aiResponse.metadata.tokensUsed,
        confidence: aiResponse.confidence,
      });

      return aiResponse;
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
      logError(error, 'PersonaService.getPersonaStats', {
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
}

export const personaService = new PersonaService();
export default personaService;
