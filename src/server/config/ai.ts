import OpenAI from 'openai';
import { logger, logError } from './logger';

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  openai?: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  anthropic?: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  local?: {
    endpoint: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  metadata?: any;
}

export interface PersonaGenerationRequest {
  role: string;
  projectContext: string;
  industry: string;
  companySize: string;
  personalityTraits: string[];
  communicationStyle: string;
  decisionMakingStyle: string;
  priorities: string[];
  goals: string[];
  constraints?: string[];
  customInstructions?: string;
}

export interface PersonaGenerationResponse {
  name: string;
  background: string;
  personality: {
    traits: string[];
    communicationStyle: string;
    decisionMakingStyle: string;
    priorities: string[];
    goals: string[];
  };
  aiConfiguration: {
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
  };
  availability: {
    responseTime: number;
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  metadata: {
    generationTime: number;
    model: string;
    confidence: number;
  };
}

export interface PersonaResponseRequest {
  personaId: string;
  personaContext: {
    name: string;
    role: string;
    background: string;
    personality: any;
    currentMood: number;
    conversationHistory: any[];
    projectKnowledge: string[];
  };
  userMessage: string;
  conversationContext: {
    projectId: string;
    milestoneId?: string;
    previousMessages: any[];
  };
  constraints?: {
    maxResponseLength?: number;
    tone?: string;
    includeQuestions?: boolean;
  };
}

export interface PersonaResponseResponse {
  content: string;
  moodChange?: {
    value: number;
    reason: string;
  };
  suggestedActions?: string[];
  confidence: number;
  metadata: {
    responseTime: number;
    model: string;
    tokensUsed: number;
  };
}

class AIService {
  private config: AIConfig;
  private openai?: OpenAI;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load AI configuration from environment variables
   */
  private loadConfig(): AIConfig {
    const provider =
      (process.env.AI_PROVIDER as 'openai' | 'anthropic' | 'local') || 'openai';

    const config: AIConfig = {
      provider,
      retryConfig: {
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000'),
        backoffMultiplier: parseFloat(process.env.AI_BACKOFF_MULTIPLIER || '2'),
      },
      rateLimit: {
        requestsPerMinute: parseInt(process.env.AI_REQUESTS_PER_MINUTE || '60'),
        tokensPerMinute: parseInt(process.env.AI_TOKENS_PER_MINUTE || '100000'),
      },
    };

    if (provider === 'openai') {
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      };
    } else if (provider === 'anthropic') {
      config.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000'),
      };
    } else if (provider === 'local') {
      config.local = {
        endpoint: process.env.LOCAL_AI_ENDPOINT || 'http://localhost:11434',
        model: process.env.LOCAL_AI_MODEL || 'llama2',
        maxTokens: parseInt(process.env.LOCAL_AI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.LOCAL_AI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.LOCAL_AI_TIMEOUT || '30000'),
      };
    }

    return config;
  }

  /**
   * Initialize AI service
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.provider === 'openai') {
        if (!this.config.openai?.apiKey) {
          throw new Error('OpenAI API key is required');
        }

        this.openai = new OpenAI({
          apiKey: this.config.openai.apiKey,
          timeout: this.config.openai.timeout,
        });

        // Test the connection
        await this.openai.models.list();
        logger.info('OpenAI service initialized successfully');
      } else if (this.config.provider === 'anthropic') {
        if (!this.config.anthropic?.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        logger.info('Anthropic service initialized successfully');
      } else if (this.config.provider === 'local') {
        if (!this.config.local?.endpoint) {
          throw new Error('Local AI endpoint is required');
        }
        logger.info('Local AI service initialized successfully');
      }

      this.isInitialized = true;
    } catch (error) {
      logError(error as Error, 'AIService.initialize', {
        provider: this.config.provider,
      });
      throw error;
    }
  }

  /**
   * Generate a persona using AI
   */
  async generatePersona(
    request: PersonaGenerationRequest
  ): Promise<PersonaGenerationResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildPersonaGenerationPrompt(request);
      const response = await this.makeAIRequest(prompt, {
        maxTokens: this.config.openai?.maxTokens || 2000,
        temperature: 0.8, // Higher creativity for persona generation
      });

      const persona = this.parsePersonaGenerationResponse(response.content);

      return {
        ...persona,
        metadata: {
          generationTime: Date.now() - startTime,
          model: this.config.openai?.model || 'unknown',
          confidence: this.calculateConfidence(response.content),
        },
      };
    } catch (error) {
      logError(error as Error, 'AIService.generatePersona', { request });
      throw error;
    }
  }

  /**
   * Generate a persona response
   */
  async generatePersonaResponse(
    request: PersonaResponseRequest
  ): Promise<PersonaResponseResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const prompt = this.buildPersonaResponsePrompt(request);
      const response = await this.makeAIRequest(prompt, {
        maxTokens:
          request.constraints?.maxResponseLength ||
          this.config.openai?.maxTokens ||
          1000,
        temperature: 0.7,
      });

      const parsedResponse = this.parsePersonaResponse(response.content);

      return {
        content: parsedResponse.content,
        moodChange: parsedResponse.moodChange,
        suggestedActions: parsedResponse.suggestedActions,
        confidence: this.calculateConfidence(response.content),
        metadata: {
          responseTime: Date.now() - startTime,
          model: this.config.openai?.model || 'unknown',
          tokensUsed: response.usage.totalTokens,
        },
      };
    } catch (error) {
      logError(error as Error, 'AIService.generatePersonaResponse', {
        request,
      });
      throw error;
    }
  }

  async generateText(
    prompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.makeAIRequest(prompt, {
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      });

      return response.content;
    } catch (error) {
      logError(error as Error, 'AIService.generateText', { prompt, options });
      throw error;
    }
  }

  /**
   * Build prompt for persona generation
   */
  private buildPersonaGenerationPrompt(
    request: PersonaGenerationRequest
  ): string {
    return `Generate a realistic persona for a ${request.role} in the following context:

Project Context: ${request.projectContext}
Industry: ${request.industry}
Company Size: ${request.companySize}

Required Personality Traits: ${request.personalityTraits.join(', ')}
Communication Style: ${request.communicationStyle}
Decision Making Style: ${request.decisionMakingStyle}

Priorities: ${request.priorities.join(', ')}
Goals: ${request.goals.join(', ')}

${request.constraints ? `Constraints: ${request.constraints.join(', ')}` : ''}
${request.customInstructions ? `Custom Instructions: ${request.customInstructions}` : ''}

Please generate a complete persona with the following structure:

Name: [Realistic full name]
Background: [Detailed professional background, 200-300 words]
Personality:
  - Traits: [List of 3-5 personality traits]
  - Communication Style: [One of: formal, casual, technical, collaborative, authoritative, supportive]
  - Decision Making Style: [One of: analytical, intuitive, consensus-driven, authoritative, risk-averse, risk-taking]
  - Priorities: [List of 2-4 priorities]
  - Goals: [List of 1-3 goals]

AI Configuration:
  - System Prompt: [Detailed system prompt for AI responses]
  - Temperature: [0.1-1.0]
  - Max Tokens: [1000-3000]

Availability:
  - Response Time: [5-60 minutes]
  - Working Hours: [Start time, End time, Timezone]

Make the persona realistic, consistent, and suitable for a professional project simulation.`;
  }

  /**
   * Build prompt for persona response generation
   */
  private buildPersonaResponsePrompt(request: PersonaResponseRequest): string {
    const { personaContext, userMessage, conversationContext, constraints } =
      request;

    return `You are ${personaContext.name}, a ${personaContext.role}.

Background: ${personaContext.background}

Personality:
- Traits: ${personaContext.personality.traits.join(', ')}
- Communication Style: ${personaContext.personality.communicationStyle}
- Decision Making Style: ${personaContext.personality.decisionMakingStyle}
- Priorities: ${personaContext.personality.priorities.join(', ')}
- Goals: ${personaContext.personality.goals.join(', ')}

Current Mood: ${personaContext.currentMood}/100 (${this.getMoodDescription(personaContext.currentMood)})

Project Knowledge: ${personaContext.projectKnowledge.join('; ')}

Recent Conversation Context:
${conversationContext.previousMessages
  .slice(-5)
  .map(msg => `${msg.sender}: ${msg.content}`)
  .join('\n')}

User Message: ${userMessage}

${constraints?.tone ? `Tone Requirement: ${constraints.tone}` : ''}
${constraints?.includeQuestions ? 'Include relevant questions to gather more information.' : ''}

Respond naturally as ${personaContext.name}, maintaining your personality and considering your current mood. Be authentic and realistic.

Response:`;
  }

  /**
   * Make AI request with retry logic
   */
  private async makeAIRequest(
    prompt: string,
    options: { maxTokens: number; temperature: number }
  ): Promise<AIResponse> {
    let lastError: Error | null = null;

    for (
      let attempt = 1;
      attempt <= this.config.retryConfig.maxRetries;
      attempt++
    ) {
      try {
        if (this.config.provider === 'openai' && this.openai) {
          const completion = await this.openai.chat.completions.create({
            model: this.config.openai?.model || 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          });

          const choice = completion.choices[0];
          if (!choice) {
            throw new Error('No completion choice returned from AI service');
          }
          return {
            content: choice.message?.content || '',
            usage: {
              promptTokens: completion.usage?.prompt_tokens || 0,
              completionTokens: completion.usage?.completion_tokens || 0,
              totalTokens: completion.usage?.total_tokens || 0,
            },
            model: completion.model,
            finishReason: choice.finish_reason || 'unknown',
          };
        } else if (this.config.provider === 'anthropic') {
          // Implement Anthropic API call
          throw new Error('Anthropic API not implemented yet');
        } else if (this.config.provider === 'local') {
          // Implement local AI API call
          throw new Error('Local AI API not implemented yet');
        }

        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryConfig.maxRetries) {
          const delay =
            this.config.retryConfig.retryDelay *
            Math.pow(this.config.retryConfig.backoffMultiplier, attempt - 1);
          await this.sleep(delay);
          logger.warn(
            `AI request failed, retrying in ${delay}ms (attempt ${attempt}/${this.config.retryConfig.maxRetries})`
          );
        }
      }
    }

    throw lastError || new Error('AI request failed after all retries');
  }

  /**
   * Parse persona generation response
   */
  private parsePersonaGenerationResponse(
    content: string
  ): Omit<PersonaGenerationResponse, 'metadata'> {
    // Simple parsing - in production, you might want more robust parsing
    const lines = content.split('\n');
    let currentSection = '';
    const result: any = {
      personality: {},
      aiConfiguration: {},
      availability: { workingHours: {} },
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('Name:')) {
        result.name = trimmedLine.replace('Name:', '').trim();
      } else if (trimmedLine.startsWith('Background:')) {
        currentSection = 'background';
        result.background = trimmedLine.replace('Background:', '').trim();
      } else if (trimmedLine.startsWith('Personality:')) {
        currentSection = 'personality';
      } else if (trimmedLine.startsWith('AI Configuration:')) {
        currentSection = 'aiConfiguration';
      } else if (trimmedLine.startsWith('Availability:')) {
        currentSection = 'availability';
      } else if (trimmedLine.includes('Traits:')) {
        const traits = trimmedLine
          .replace(/.*Traits:\s*/, '')
          .split(',')
          .map(t => t.trim());
        result.personality.traits = traits;
      } else if (trimmedLine.includes('Communication Style:')) {
        result.personality.communicationStyle = trimmedLine
          .replace(/.*Communication Style:\s*/, '')
          .trim();
      } else if (trimmedLine.includes('Decision Making Style:')) {
        result.personality.decisionMakingStyle = trimmedLine
          .replace(/.*Decision Making Style:\s*/, '')
          .trim();
      } else if (trimmedLine.includes('Priorities:')) {
        const priorities = trimmedLine
          .replace(/.*Priorities:\s*/, '')
          .split(',')
          .map(p => p.trim());
        result.personality.priorities = priorities;
      } else if (trimmedLine.includes('Goals:')) {
        const goals = trimmedLine
          .replace(/.*Goals:\s*/, '')
          .split(',')
          .map(g => g.trim());
        result.personality.goals = goals;
      } else if (trimmedLine.includes('System Prompt:')) {
        result.aiConfiguration.systemPrompt = trimmedLine
          .replace(/.*System Prompt:\s*/, '')
          .trim();
      } else if (trimmedLine.includes('Temperature:')) {
        result.aiConfiguration.temperature = parseFloat(
          trimmedLine.replace(/.*Temperature:\s*/, '')
        );
      } else if (trimmedLine.includes('Max Tokens:')) {
        result.aiConfiguration.maxTokens = parseInt(
          trimmedLine.replace(/.*Max Tokens:\s*/, '')
        );
      } else if (trimmedLine.includes('Response Time:')) {
        result.availability.responseTime = parseInt(
          trimmedLine.replace(/.*Response Time:\s*/, '')
        );
      } else if (trimmedLine.includes('Working Hours:')) {
        const hours = trimmedLine
          .replace(/.*Working Hours:\s*/, '')
          .split(',')
          .map(h => h.trim());
        if (hours.length >= 3) {
          result.availability.workingHours.start = hours[0];
          result.availability.workingHours.end = hours[1];
          result.availability.workingHours.timezone = hours[2];
        }
      } else if (
        currentSection === 'background' &&
        !result.background.includes(trimmedLine)
      ) {
        result.background += ' ' + trimmedLine;
      }
    }

    return result;
  }

  /**
   * Parse persona response
   */
  private parsePersonaResponse(content: string): {
    content: string;
    moodChange?: { value: number; reason: string };
    suggestedActions?: string[];
  } {
    // Simple parsing - extract mood change if present
    const moodMatch = content.match(/\[MOOD_CHANGE:([^]]+)\]/);
    const moodChange = moodMatch
      ? {
          value: parseInt(moodMatch[1].split(',')[0]),
          reason: moodMatch[1].split(',')[1]?.trim() || 'Response generated',
        }
      : undefined;

    // Remove mood change markers from content
    const cleanContent = content.replace(/\[MOOD_CHANGE:[^]]+\]/g, '').trim();

    return {
      content: cleanContent,
      moodChange,
    };
  }

  /**
   * Calculate confidence score for AI response
   */
  private calculateConfidence(content: string): number {
    // Simple heuristic - in production, you might use more sophisticated methods
    const wordCount = content.split(' ').length;
    const hasQuestions = content.includes('?');
    const hasSpecificDetails = content.match(/\d+/g)?.length || 0;

    let confidence = 0.7; // Base confidence

    if (wordCount > 50) confidence += 0.1;
    if (hasQuestions) confidence += 0.1;
    if (hasSpecificDetails > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Get mood description
   */
  private getMoodDescription(mood: number): string {
    if (mood >= 80) return 'Very Positive';
    if (mood >= 60) return 'Positive';
    if (mood >= 40) return 'Neutral';
    if (mood >= 20) return 'Slightly Negative';
    if (mood >= 0) return 'Negative';
    return 'Very Negative';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus(): {
    isInitialized: boolean;
    provider: string;
    config: Partial<AIConfig>;
  } {
    return {
      isInitialized: this.isInitialized,
      provider: this.config.provider,
      config: {
        provider: this.config.provider,
        retryConfig: this.config.retryConfig,
        rateLimit: this.config.rateLimit,
      },
    };
  }
}

export const aiService = new AIService();
export default aiService;
