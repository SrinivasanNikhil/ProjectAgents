import { Types } from 'mongoose';
import { Persona } from '../models/Persona';
import { conversationContextService } from './contextService';
import { aiService } from '../config/ai';
import { logError, logger } from '../config/logger';

export class MemoryService {
  /**
   * Update a persona's conversation memory for the given project.
   * Builds context, extracts key points, and persists via Persona.addConversationToMemory.
   */
  async updatePersonaConversationMemory(
    personaId: string,
    projectId: string,
    opts: { windowOverride?: number } = {}
  ): Promise<{ conversationId?: string; keyPoints: string[] }> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      const { previousMessages, conversationId } =
        await conversationContextService.buildPreviousMessages(personaId, projectId, opts);

      if (!conversationId) {
        // No conversation yet; nothing to store, but return gracefully
        return { conversationId: undefined, keyPoints: [] };
      }

      const keyPoints = await this.extractKeyPoints(previousMessages);

      await (persona as any).addConversationToMemory(new Types.ObjectId(conversationId), keyPoints);

      return { conversationId, keyPoints };
    } catch (error) {
      logError(error as Error, 'MemoryService.updatePersonaConversationMemory', {
        personaId,
        projectId,
      });
      return { conversationId: undefined, keyPoints: [] };
    }
  }

  /**
   * Extract concise key points (3-6) from previous messages using AI.
   * Falls back to heuristic if AI fails.
   */
  async extractKeyPoints(previousMessages: Array<{ sender: string; content: string }>): Promise<string[]> {
    try {
      if (!previousMessages || previousMessages.length === 0) return [];

      const text = previousMessages
        .slice(-20)
        .map(m => `${m.sender}: ${m.content}`)
        .join('\n');

      const prompt = `Extract 3-6 concise bullet key points capturing decisions, action items, open questions, and commitments from the following chat. Return each key point on a new line without numbering or bullets.\n\n${text}`;

      const response = await aiService.generateText(prompt, { maxTokens: 200, temperature: 0.2 });

      const lines = response
        .split('\n')
        .map(l => l.replace(/^[-*•\d+.\)\s]+/, '').trim())
        .filter(l => l.length >= 5 && l.length <= 200);

      // Deduplicate and cap to 6
      const unique = Array.from(new Set(lines)).slice(0, 6);
      return unique;
    } catch (error) {
      logger.warn('MemoryService.extractKeyPoints failed, using heuristic fallback');
      // Fallback: take last few user-authored messages (non-system)
      const lastUtterances = previousMessages
        .filter(m => m.sender && m.sender.toLowerCase() !== 'system')
        .slice(-5)
        .map(m => m.content.trim())
        .filter(c => c.length >= 5)
        .map(c => (c.length > 180 ? c.slice(0, 177) + '...' : c));
      return lastUtterances;
    }
  }
}

export const memoryService = new MemoryService();