import mongoose, { Types } from 'mongoose';
import { Conflict, IConflict, ConflictSeverity } from '../models/Conflict';
import { Project } from '../models/Project';
import { Conversation, IMessage } from '../models/Conversation';
import { aiService } from '../config/ai';
import { logger, logError } from '../config/logger';
import { ChatService } from './chatService';

export class ConflictService {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  async generateConflictScenario(params: {
    projectId: string;
    conversationId?: string;
    participantIds?: string[]; // optional personas/student ids
    seedTopics?: string[];
    desiredSeverity?: ConflictSeverity;
  }): Promise<IConflict> {
    try {
      const project = await Project.findById(params.projectId);
      if (!project) throw new Error('Project not found');
      if (!project.settings.enableConflicts) {
        throw new Error('Conflicts are disabled for this project');
      }

      const conversation = params.conversationId
        ? await Conversation.findById(params.conversationId)
        : null;

      // Build AI prompt for conflict scenario
      const prompt = `You are generating a realistic conflict scenario within a student software project.
Project: ${project.name}
Type: ${project.projectType}
Industry: ${project.industry}
Scope: ${project.scope}
${params.seedTopics && params.seedTopics.length > 0 ? `Seed Topics: ${params.seedTopics.join(', ')}` : ''}
Severity: ${params.desiredSeverity || 'medium'}

Provide a concise conflict description (1-3 sentences) and list 3-5 specific triggers in bullet points prefixed with '-' that could lead to this conflict.`;

      const aiText = await aiService.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 400,
      });

      const { description, triggers } = this.parseConflictAIText(aiText);

      const conflict = new Conflict({
        project: new Types.ObjectId(params.projectId),
        conversation: params.conversationId
          ? new Types.ObjectId(params.conversationId)
          : undefined,
        participants: [],
        description,
        triggers,
        status: 'open',
        severity: params.desiredSeverity || 'medium',
        startTime: new Date(),
      });

      await conflict.save();

      // Optionally notify via system message
      if (conversation) {
        await this.chatService.sendSystemMessage(
          (project._id as any as string),
          `Conflict detected/created: ${description}\nTriggers:\n${triggers.map(t => `- ${t}`).join('\n')}`,
          { conflictId: (conflict._id as unknown as string), conflictSeverity: conflict.severity }
        );
      }

      logger.info('Conflict scenario generated', { conflictId: conflict._id });
      return conflict;
    } catch (error) {
      logError(error as Error, 'ConflictService.generateConflictScenario', params);
      throw error;
    }
  }

  async listProjectConflicts(projectId: string): Promise<IConflict[]> {
    return Conflict.find({ project: projectId }).sort({ createdAt: -1 });
  }

  async resolveConflict(conflictId: string, resolutionSummary: string): Promise<IConflict | null> {
    try {
      const conflict = await Conflict.findById(conflictId);
      if (!conflict) return null;
      conflict.status = 'resolved';
      conflict.resolvedTime = new Date();
      conflict.resolutionSummary = resolutionSummary;
      await conflict.save();
      return conflict;
    } catch (error) {
      logError(error as Error, 'ConflictService.resolveConflict', { conflictId });
      throw error;
    }
  }

  async detectConflictsFromMessages(projectId: string, lookbackHours: number = 48): Promise<IConflict[]> {
    try {
      const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
      const conversations = await Conversation.find({ project: projectId });
      const conversationIds = conversations.map(c => c._id);

      // Fetch recent messages across conversations
      const MessageModel = mongoose.model<IMessage>('Message');
      const messages = await MessageModel.find({
        conversation: { $in: conversationIds },
        createdAt: { $gte: since },
      }).sort({ createdAt: 1 });

      // Simple indicator patterns (mirrors analytics service)
      const conflictIndicators = [
        /\b(disagree|wrong|no way|that's not right|i don't think so|bad idea)\b/i,
        /\b(frustrated|annoyed|upset|concerned|worried)\b/i,
        /\b(conflict|issue|problem|disagreement|dispute)\b/i,
      ];
      const resolutionIndicators = [
        /\b(agree|resolved|compromise|solution|let's move forward|good point)\b/i,
        /\b(understand|makes sense|i see|got it|thank you)\b/i,
        /\b(apologize|sorry|my mistake|you're right)\b/i,
      ];

      const newConflicts: IConflict[] = [];
      let current: { startTime: Date; participants: string[]; conversation?: Types.ObjectId; startIndex: number } | null = null;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const text = msg.content?.toLowerCase() || '';
        const senderId = msg.sender.id.toString();

        if (conflictIndicators.some(p => p.test(text))) {
          if (!current) {
            current = {
              startTime: msg.createdAt,
              participants: [senderId],
              conversation: msg.conversation as Types.ObjectId,
              startIndex: i,
            };
          } else if (!current.participants.includes(senderId)) {
            current.participants.push(senderId);
          }
        }

        if (current && resolutionIndicators.some(p => p.test(text))) {
          // Check next few messages for conflict continuation
          let isResolved = true;
          for (let j = i + 1; j < Math.min(i + 5, messages.length); j++) {
            if (conflictIndicators.some(p => p.test(messages[j].content?.toLowerCase() || ''))) {
              isResolved = false;
              break;
            }
          }

          if (isResolved) {
            // Create a conflict record
            const description = `Conflict detected in conversation with ${current.participants.length} participant(s)`;
            const conflict = await Conflict.create({
              project: new Types.ObjectId(projectId),
              conversation: current.conversation,
              participants: [],
              description,
              triggers: ['detected-by-indicators'],
              status: 'open',
              severity: 'medium',
              startTime: current.startTime,
              resolvedTime: messages[i].createdAt,
            });
            newConflicts.push(conflict);
            current = null;
          }
        }
      }

      // If a conflict started but not resolved in window, persist as open
      if (current) {
        const conflict = await Conflict.create({
          project: new Types.ObjectId(projectId),
          conversation: current.conversation,
          participants: [],
          description: `Ongoing conflict detected with ${current.participants.length} participant(s)`,
          triggers: ['detected-by-indicators'],
          status: 'open',
          severity: 'medium',
          startTime: current.startTime,
        });
        newConflicts.push(conflict);
      }

      return newConflicts;
    } catch (error) {
      logError(error as Error, 'ConflictService.detectConflictsFromMessages', { projectId });
      throw error;
    }
  }

  private parseConflictAIText(content: string): { description: string; triggers: string[] } {
    // Heuristic parser: first non-empty line as description; lines starting with '-' as triggers
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    let description = '';
    const triggers: string[] = [];
    for (const line of lines) {
      if (!description && !line.startsWith('-')) {
        description = line;
        continue;
      }
      if (line.startsWith('-')) {
        triggers.push(line.replace(/^[-•]\s*/, ''));
      }
    }
    if (!description) description = 'Conflict scenario generated by AI';
    if (triggers.length === 0) triggers.push('general-misalignment');
    return { description, triggers };
  }
}

export const conflictService = new ConflictService();
export default conflictService;