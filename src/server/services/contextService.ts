import { Types } from 'mongoose';
import { Conversation, Message } from '../models/Conversation';
import { Persona } from '../models/Persona';
import { logger, logError } from '../config/logger';
import { aiService } from '../config/ai';

export interface AIMessageContextItem {
  sender: string;
  content: string;
}

export class ConversationContextService {
  private summaryCache: Map<string, { summary: string; conversationUpdatedAt: Date; cachedAt: number }>; // key: conversationId

  constructor() {
    this.summaryCache = new Map();
  }

  async buildPreviousMessages(
    personaId: string,
    projectId: string,
    opts: { windowOverride?: number } = {}
  ): Promise<{ previousMessages: AIMessageContextItem[]; conversationId?: string }> {
    try {
      const persona = await Persona.findById(personaId);
      if (!persona) {
        throw new Error('Persona not found');
      }

      const conversation = await Conversation.findOne({ project: new Types.ObjectId(projectId) }).exec();
      if (!conversation) {
        // No conversation yet, return empty context
        return { previousMessages: [], conversationId: undefined };
      }

      const conversationId = (conversation._id as any).toString();

      const contextWindow = opts.windowOverride ?? persona.aiConfiguration?.contextWindow ?? 10;

      // Fetch messages in chronological order for readability
      const messages = await Message.find({ conversation: conversation._id })
        .sort({ createdAt: 1 })
        .limit(500) // hard cap to keep bounds reasonable
        .exec();

      if (messages.length === 0) {
        return { previousMessages: [], conversationId };
      }

      let previousMessages: AIMessageContextItem[] = [];

      if (messages.length > contextWindow) {
        const numToSummarize = messages.length - contextWindow;
        const olderChunk = messages.slice(0, numToSummarize);
        const recentChunk = messages.slice(numToSummarize);

        const summary = await this.getOrBuildSummary(conversationId, conversation.updatedAt, olderChunk);

        if (summary) {
          previousMessages.push({ sender: 'system', content: `Conversation Summary: ${summary}` });
        }

        previousMessages.push(
          ...recentChunk.map(m => ({ sender: m.sender.name || m.sender.type, content: m.content }))
        );
      } else {
        previousMessages = messages.map(m => ({ sender: m.sender.name || m.sender.type, content: m.content }));
      }

      return { previousMessages, conversationId };
    } catch (error) {
      logError(error as Error, 'ConversationContextService.buildPreviousMessages', { personaId, projectId });
      // Fail soft with no previous messages so AI still can respond
      return { previousMessages: [], conversationId: undefined };
    }
  }

  private async getOrBuildSummary(
    conversationId: string,
    conversationUpdatedAt: Date,
    olderMessages: any[]
  ): Promise<string | null> {
    try {
      const cached = this.summaryCache.get(conversationId);
      if (cached && cached.conversationUpdatedAt.getTime() === conversationUpdatedAt.getTime()) {
        return cached.summary;
      }

      const textToSummarize = olderMessages
        .map(m => `${m.sender.name || m.sender.type}: ${m.content}`)
        .join('\n');

      if (!textToSummarize.trim()) return null;

      const prompt = `Summarize the following conversation so far in no more than 180 words, focusing on decisions, action items, outstanding questions, and key sentiments. Return plain text without lists if possible.\n\n${textToSummarize}`;

      const summary = await aiService.generateText(prompt, { maxTokens: 300, temperature: 0.3 });

      this.summaryCache.set(conversationId, {
        summary,
        conversationUpdatedAt,
        cachedAt: Date.now(),
      });

      return summary;
    } catch (error) {
      logger.warn('Failed to build conversation summary, proceeding without it', { conversationId, error });
      return null;
    }
  }
}

export const conversationContextService = new ConversationContextService();