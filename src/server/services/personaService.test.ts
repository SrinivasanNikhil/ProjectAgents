import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { personaService } from './personaService';
import { Persona } from '../models/Persona';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { aiService } from '../config/ai';
import { aiCacheService } from './aiCacheService';
import { conversationContextService } from './contextService';

// Mock dependencies
vi.mock('../models/Persona');
vi.mock('../models/Project');
vi.mock('../models/User');
vi.mock('../config/ai');
vi.mock('./contextService', () => ({
  conversationContextService: {
    buildPreviousMessages: vi.fn().mockResolvedValue({ previousMessages: [], conversationId: 'c1' }),
  },
}));
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logUserActivity: vi.fn(),
  logError: vi.fn(),
}));

const mockedPersona = Persona as any;
const mockedProject = Project as any;
const mockedUser = User as any;
const mockedAiService = aiService as any;

describe('PersonaService - Mid-Project Functionality', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockProjectId = '507f1f77bcf86cd799439012';
  const mockPersonaId = '507f1f77bcf86cd799439013';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createMidProjectPersona', () => {
    const mockPersonaData = {
      name: 'Test Persona',
      role: 'QA Tester',
      projectId: mockProjectId,
      background: 'Experienced QA specialist',
      personality: {
        traits: ['thorough', 'systematic'],
        communicationStyle: 'detailed',
        decisionMakingStyle: 'evidence-based',
        priorities: ['quality assurance', 'bug prevention'],
        goals: ['ensure quality', 'prevent bugs'],
      },
      aiConfiguration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: '',
        contextWindow: 10,
      },
      availability: {
        responseTime: 5,
        workingHours: {
          start: '09:00',
          end: '17:00',
          timezone: 'UTC',
        },
      },
      midProjectContext: {
        introductionReason: 'Need for quality assurance',
        impactOnExistingPersonas: 'Will add testing perspective',
        newRequirements: ['Automated testing', 'Test coverage'],
        conflictScenarios: ['Release timeline conflicts'],
      },
    };

    const mockProject = {
      _id: mockProjectId,
      status: 'active',
      settings: {
        allowMidProjectChanges: true,
      },
      metadata: {
        totalPersonas: 2,
        lastActivity: new Date(),
      },
      save: vi.fn(),
    };

    const mockExistingPersonas = [
      {
        _id: 'persona-1',
        name: 'John Client',
        role: 'CEO',
      },
      {
        _id: 'persona-2',
        name: 'Sarah Designer',
        role: 'Product Manager',
      },
    ];

    const mockCreatedPersona = {
      _id: mockPersonaId,
      name: 'Test Persona',
      role: 'QA Tester',
      project: mockProjectId,
    };

    it('should create a mid-project persona successfully', async () => {
      // Mock project find
      mockedProject.findById.mockResolvedValue(mockProject);

      // Mock existing personas find
      mockedPersona.find.mockResolvedValue(mockExistingPersonas);

      // Mock persona creation
      vi.spyOn(personaService, 'createPersona').mockResolvedValue(
        mockCreatedPersona as any
      );

      const result = await personaService.createMidProjectPersona(
        mockPersonaData,
        mockUserId
      );

      expect(mockedProject.findById).toHaveBeenCalledWith(mockProjectId);
      expect(mockedPersona.find).toHaveBeenCalledWith({
        projectId: mockProjectId,
      });
      expect(personaService.createPersona).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockPersonaData,
          aiConfiguration: expect.objectContaining({
            systemPrompt: expect.stringContaining('MID-PROJECT CONTEXT'),
          }),
        }),
        mockUserId
      );
      expect(mockProject.metadata.totalPersonas).toBe(3);
      expect(mockProject.save).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedPersona);
    });

    it('should throw error if project not found', async () => {
      mockedProject.findById.mockResolvedValue(null);

      await expect(
        personaService.createMidProjectPersona(mockPersonaData, mockUserId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if project is not active', async () => {
      mockedProject.findById.mockResolvedValue({
        ...mockProject,
        status: 'completed',
      });

      await expect(
        personaService.createMidProjectPersona(mockPersonaData, mockUserId)
      ).rejects.toThrow('Cannot add personas to non-active projects');
    });

    it('should throw error if mid-project changes are not allowed', async () => {
      mockedProject.findById.mockResolvedValue({
        ...mockProject,
        settings: {
          allowMidProjectChanges: false,
        },
      });

      await expect(
        personaService.createMidProjectPersona(mockPersonaData, mockUserId)
      ).rejects.toThrow('Mid-project changes are not allowed for this project');
    });
  });

  describe('getMidProjectSuggestions', () => {
    const mockRequestData = {
      projectId: mockProjectId,
      projectData: {
        name: 'E-commerce Platform',
        projectType: 'web-application',
        industry: 'retail',
        scope: 'medium',
        getProgress: () => 45,
      },
      existingPersonas: [{ role: 'CEO' }, { role: 'Product Manager' }],
    };

    const mockProject = {
      _id: mockProjectId,
      canUserAccess: vi.fn().mockReturnValue(true),
    };

    const mockSuggestions = [
      {
        role: 'QA Tester',
        background: 'Quality assurance specialist',
        personality: {
          traits: ['thorough', 'systematic'],
          communicationStyle: 'detailed',
          decisionMakingStyle: 'evidence-based',
          priorities: ['quality assurance', 'bug prevention'],
          goals: ['ensure quality', 'prevent bugs'],
        },
        reasoning: 'Larger projects benefit from dedicated QA expertise',
        conflictPotential: 'May conflict with developers on release timelines',
      },
    ];

    it('should return AI suggestions for mid-project persona addition', async () => {
      const mockProjectWithAccess = {
        ...mockProject,
        canUserAccess: vi.fn().mockReturnValue(true),
      };
      mockedProject.findById.mockResolvedValue(mockProjectWithAccess);

      // Mock the private method
      const generateSuggestionsSpy = vi
        .spyOn(personaService as any, 'generateMidProjectSuggestions')
        .mockResolvedValue(mockSuggestions);

      const result = await personaService.getMidProjectSuggestions(
        mockRequestData,
        mockUserId
      );

      expect(mockedProject.findById).toHaveBeenCalledWith(mockProjectId);
      expect(mockProjectWithAccess.canUserAccess).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        'instructor'
      );
      expect(generateSuggestionsSpy).toHaveBeenCalledWith(
        mockRequestData.projectData,
        mockRequestData.existingPersonas
      );
      expect(result).toEqual(mockSuggestions);
    });

    it('should throw error if project not found', async () => {
      mockedProject.findById.mockResolvedValue(null);

      await expect(
        personaService.getMidProjectSuggestions(mockRequestData, mockUserId)
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if user does not have access', async () => {
      mockedProject.findById.mockResolvedValue({
        ...mockProject,
        canUserAccess: vi.fn().mockReturnValue(false),
      });

      await expect(
        personaService.getMidProjectSuggestions(mockRequestData, mockUserId)
      ).rejects.toThrow('Access denied to project');
    });
  });

  describe('updatePersonaForMidProject', () => {
    const mockUpdateData = {
      midProjectChanges: {
        newGoals: ['improve testing coverage', 'implement CI/CD'],
        updatedPriorities: [
          'quality assurance',
          'automation',
          'user experience',
        ],
        newRequirements: ['Automated testing', 'Test coverage reports'],
        conflictTriggers: ['Release timeline conflicts', 'Resource allocation'],
        impactReason: 'Project scope expanded to include comprehensive testing',
      },
    };

    const mockPersona = {
      _id: mockPersonaId,
      project: mockProjectId,
      personality: {
        traits: ['thorough', 'systematic'],
        communicationStyle: 'detailed',
        decisionMakingStyle: 'evidence-based',
        priorities: ['quality assurance', 'bug prevention'],
        goals: ['ensure quality', 'prevent bugs'],
      },
      aiConfiguration: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'Original prompt',
        contextWindow: 10,
      },
    };

    const mockProject = {
      _id: mockProjectId,
      canUserAccess: vi.fn().mockReturnValue(true),
    };

    const mockUpdatedPersona = {
      _id: mockPersonaId,
      name: 'Updated Persona',
      role: 'QA Tester',
    };

    it('should update persona for mid-project changes successfully', async () => {
      mockedPersona.findById.mockResolvedValue(mockPersona);
      const mockProjectWithAccess = {
        ...mockProject,
        canUserAccess: vi.fn().mockReturnValue(true),
      };
      mockedProject.findById.mockResolvedValue(mockProjectWithAccess);

      // Mock the updatePersona method
      vi.spyOn(personaService, 'updatePersona').mockResolvedValue(
        mockUpdatedPersona as any
      );

      const result = await personaService.updatePersonaForMidProject(
        mockPersonaId,
        mockUpdateData,
        mockUserId
      );

      expect(mockedPersona.findById).toHaveBeenCalledWith(mockPersonaId);
      expect(mockedProject.findById).toHaveBeenCalledWith(mockProjectId);
      expect(mockProjectWithAccess.canUserAccess).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        'instructor'
      );
      expect(personaService.updatePersona).toHaveBeenCalledWith(
        mockPersonaId,
        expect.objectContaining({
          personality: expect.objectContaining({
            goals: expect.arrayContaining([
              'ensure quality',
              'prevent bugs',
              'improve testing coverage',
              'implement CI/CD',
            ]),
            priorities: mockUpdateData.midProjectChanges.updatedPriorities,
          }),
          aiConfiguration: expect.objectContaining({
            systemPrompt: expect.stringContaining('MID-PROJECT CHANGES'),
          }),
        }),
        mockUserId
      );
      expect(result).toEqual(mockUpdatedPersona);
    });

    it('should throw error if persona not found', async () => {
      mockedPersona.findById.mockResolvedValue(null);

      await expect(
        personaService.updatePersonaForMidProject(
          mockPersonaId,
          mockUpdateData,
          mockUserId
        )
      ).rejects.toThrow('Persona not found');
    });

    it('should throw error if user does not have access to project', async () => {
      mockedPersona.findById.mockResolvedValue(mockPersona);
      mockedProject.findById.mockResolvedValue({
        ...mockProject,
        canUserAccess: vi.fn().mockReturnValue(false),
      });

      await expect(
        personaService.updatePersonaForMidProject(
          mockPersonaId,
          mockUpdateData,
          mockUserId
        )
      ).rejects.toThrow('Access denied to persona');
    });
  });

  describe('generateMidProjectSystemPrompt', () => {
    it('should generate enhanced system prompt for mid-project personas', () => {
      const mockData = {
        name: 'Test Persona',
        role: 'QA Tester',
        background: 'Experienced QA specialist',
        personality: {
          traits: ['thorough', 'systematic'],
          communicationStyle: 'detailed',
          decisionMakingStyle: 'evidence-based',
          priorities: ['quality assurance', 'bug prevention'],
          goals: ['ensure quality', 'prevent bugs'],
        },
        midProjectContext: {
          introductionReason: 'Need for quality assurance',
          impactOnExistingPersonas: 'Will add testing perspective',
          newRequirements: ['Automated testing', 'Test coverage'],
          conflictScenarios: ['Release timeline conflicts'],
        },
      };

      const mockExistingPersonas = [
        { name: 'John Client', role: 'CEO' },
        { name: 'Sarah Designer', role: 'Product Manager' },
      ];

      const result = (personaService as any).generateMidProjectSystemPrompt(
        mockData,
        mockExistingPersonas
      );

      expect(result).toContain('You are Test Persona, a QA Tester');
      expect(result).toContain('MID-PROJECT CONTEXT');
      expect(result).toContain('Need for quality assurance');
      expect(result).toContain('EXISTING TEAM MEMBERS');
      expect(result).toContain('CEO, Product Manager');
      expect(result).toContain('John Client, Sarah Designer');
      expect(result).toContain('Automated testing');
      expect(result).toContain('Release timeline conflicts');
    });
  });

  describe('generateMidProjectUpdateSystemPrompt', () => {
    it('should generate system prompt for mid-project persona updates', () => {
      const mockPersona = {
        name: 'Test Persona',
        role: 'QA Tester',
        background: 'Experienced QA specialist',
        personality: {
          traits: ['thorough', 'systematic'],
          communicationStyle: 'detailed',
          decisionMakingStyle: 'evidence-based',
          priorities: ['quality assurance', 'bug prevention'],
          goals: ['ensure quality', 'prevent bugs'],
        },
      };

      const mockChanges = {
        newGoals: ['improve testing coverage', 'implement CI/CD'],
        updatedPriorities: [
          'quality assurance',
          'automation',
          'user experience',
        ],
        newRequirements: ['Automated testing', 'Test coverage reports'],
        conflictTriggers: ['Release timeline conflicts', 'Resource allocation'],
        impactReason: 'Project scope expanded to include comprehensive testing',
      };

      const result = (
        personaService as any
      ).generateMidProjectUpdateSystemPrompt(mockPersona, mockChanges);

      expect(result).toContain('You are Test Persona, a QA Tester');
      expect(result).toContain('MID-PROJECT CHANGES');
      expect(result).toContain('improve testing coverage');
      expect(result).toContain('implement CI/CD');
      expect(result).toContain(
        'quality assurance, automation, user experience'
      );
      expect(result).toContain('Automated testing');
      expect(result).toContain('Release timeline conflicts');
      expect(result).toContain(
        'Project scope expanded to include comprehensive testing'
      );
    });
  });

  describe('generateMidProjectSuggestions', () => {
    it('should generate AI suggestions for mid-project persona addition', async () => {
      const mockProjectData = {
        name: 'E-commerce Platform',
        projectType: 'web-application',
        industry: 'retail',
        scope: 'medium',
        getProgress: () => 45,
      };

      const mockExistingPersonas = [
        { role: 'CEO' },
        { role: 'Product Manager' },
      ];

      const mockAiResponse = `
1. Role: QA Tester
Background: Quality assurance specialist
Traits: thorough, systematic, detail-oriented
Reasoning: Larger projects benefit from dedicated QA expertise
Conflicts: May conflict with developers on release timelines

2. Role: UI/UX Designer
Background: User experience designer
Traits: creative, user-focused, visual
Reasoning: Web applications need dedicated design expertise
Conflicts: May conflict with developers on implementation details
      `;

      mockedAiService.generateText.mockResolvedValue(mockAiResponse);

      const result = await (
        personaService as any
      ).generateMidProjectSuggestions(mockProjectData, mockExistingPersonas);

      expect(mockedAiService.generateText).toHaveBeenCalledWith(
        expect.stringContaining('E-commerce Platform')
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        role: 'QA Tester',
        background: 'Quality assurance specialist',
        personality: expect.objectContaining({
          traits: expect.arrayContaining([
            'thorough',
            'systematic',
            'detail-oriented',
          ]),
        }),
        reasoning: 'Larger projects benefit from dedicated QA expertise',
        conflictPotential: 'May conflict with developers on release timelines',
      });
    });

    it('should return fallback suggestions when AI fails', async () => {
      const mockProjectData = {
        name: 'E-commerce Platform',
        projectType: 'web-application',
        industry: 'retail',
        scope: 'medium',
        getProgress: () => 45,
      };

      const mockExistingPersonas = [
        { role: 'CEO' },
        { role: 'Product Manager' },
      ];

      mockedAiService.generateText.mockRejectedValue(
        new Error('AI Service Error')
      );

      const result = await (
        personaService as any
      ).generateMidProjectSuggestions(mockProjectData, mockExistingPersonas);

      expect(result).toHaveLength(2); // UI/UX Designer and QA Tester fallbacks
      expect(result[0].role).toBe('UI/UX Designer');
      expect(result[1].role).toBe('QA Tester');
    });
  });

  describe('getFallbackMidProjectSuggestions', () => {
    it('should return appropriate fallback suggestions for web application', () => {
      const mockProjectData = {
        projectType: 'web-application',
        scope: 'medium',
      };

      const mockExistingPersonas = [
        { role: 'CEO' },
        { role: 'Product Manager' },
      ];

      const result = (personaService as any).getFallbackMidProjectSuggestions(
        mockProjectData,
        mockExistingPersonas
      );

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('UI/UX Designer');
      expect(result[1].role).toBe('QA Tester');
    });

    it('should return appropriate fallback suggestions for mobile app', () => {
      const mockProjectData = {
        projectType: 'mobile-app',
        scope: 'medium',
      };

      const mockExistingPersonas = [
        { role: 'CEO' },
        { role: 'Product Manager' },
      ];

      const result = (personaService as any).getFallbackMidProjectSuggestions(
        mockProjectData,
        mockExistingPersonas
      );

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('Mobile Developer');
      expect(result[1].role).toBe('QA Tester');
    });

    it('should not suggest roles that already exist', () => {
      const mockProjectData = {
        projectType: 'web-application',
        scope: 'medium',
      };

      const mockExistingPersonas = [
        { role: 'UI/UX Designer' },
        { role: 'QA Tester' },
      ];

      const result = (personaService as any).getFallbackMidProjectSuggestions(
        mockProjectData,
        mockExistingPersonas
      );

      expect(result).toHaveLength(0);
    });

    it('should not suggest QA Tester for small projects', () => {
      const mockProjectData = {
        projectType: 'web-application',
        scope: 'small',
      };

      const mockExistingPersonas = [
        { role: 'CEO' },
        { role: 'Product Manager' },
      ];

      const result = (personaService as any).getFallbackMidProjectSuggestions(
        mockProjectData,
        mockExistingPersonas
      );

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('UI/UX Designer');
    });
  });

  describe('AI response caching', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockProjectId = '507f1f77bcf86cd799439012';
    const mockPersonaId = '507f1f77bcf86cd799439013';

    beforeEach(() => {
      vi.clearAllMocks();
      aiCacheService.clear();
    });

    it('returns cached response on repeated identical requests and avoids duplicate AI calls', async () => {
      // Arrange persona and permissions
      (Persona as any).findById = vi.fn().mockResolvedValue({
        _id: mockPersonaId,
        aiConfiguration: { model: 'gpt-4', temperature: 0.7, maxTokens: 1000, systemPrompt: 'sys' },
        canInteractWithUser: vi.fn().mockResolvedValue(true),
      });


      // Mock AI service to return deterministic response
      (aiService as any).generatePersonaResponse = vi.fn().mockResolvedValue({
        content: 'Hello, this is a response',
        confidence: 0.9,
        metadata: { responseTime: 50, model: 'gpt-4', tokensUsed: 42 },
      });

      const request = {
        personaId: mockPersonaId,
        personaContext: {
          name: 'Alex',
          role: 'Client',
          background: 'Background',
          personality: {
            traits: ['calm'],
            communicationStyle: 'formal',
            decisionMakingStyle: 'analytical',
            priorities: ['quality'],
            goals: ['success'],
          },
          currentMood: 60,
          conversationHistory: [],
          projectKnowledge: [],
        },
        userMessage: 'Can you review the proposal? ',
        conversationContext: { projectId: mockProjectId, previousMessages: [] },
        constraints: { maxResponseLength: 200 },
      } as any;

      // Act: first call triggers AI
      const first = await personaService.generatePersonaResponseWithAI(request, mockUserId);

      // Act: second call identical request should hit cache
      const second = await personaService.generatePersonaResponseWithAI(request, mockUserId);

      // Assert
      expect((aiService as any).generatePersonaResponse).toHaveBeenCalledTimes(1);
      expect(first.content).toBeDefined();
      expect(second.content).toBeDefined();
      expect(second.filtering.reasons).toContain('cache-hit');


    });
  });
});
