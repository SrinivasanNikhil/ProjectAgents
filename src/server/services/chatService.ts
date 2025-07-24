import { webSocketManager } from '../config/websocket';
import { logger } from '../config/logger';
import { Conversation, Message } from '../models/Conversation';
import { User } from '../models/User';
import { Project } from '../models/Project';

export interface ChatMessage {
  id: string;
  projectId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  message: string;
  type: 'text' | 'file' | 'link' | 'system';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    url?: string;
    linkTitle?: string;
    milestoneId?: string;
    artifactId?: string;
    aiResponseTime?: number;
    sentiment?: number;
  };
  timestamp: string;
  isPersonaMessage?: boolean;
  personaId?: string;
}

export interface TypingIndicator {
  userId: string;
  userEmail: string;
  projectId: string;
  isTyping: boolean;
}

export interface UserPresence {
  userId: string;
  userEmail: string;
  projectId: string;
  status: 'online' | 'away' | 'offline';
  timestamp: string;
}

export class ChatService {
  private typingUsers: Map<string, Set<string>> = new Map(); // projectId -> Set of typing user IDs
  private userPresence: Map<string, Map<string, string>> = new Map(); // projectId -> userId -> status

  /**
   * Send a chat message to a project
   */
  public async sendMessage(
    messageData: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    try {
      const message: ChatMessage = {
        ...messageData,
        id: this.generateMessageId(),
        timestamp: new Date().toISOString(),
      };

      // Save message to database
      await this.saveMessageToDatabase(message);

      // Broadcast to project room
      webSocketManager.emitToProject(
        message.projectId,
        'chat-message',
        message
      );

      // Log the message
      logger.info(
        `Chat message sent: ${message.userEmail} in project ${message.projectId}`
      );

      return message;
    } catch (error) {
      logger.error('Error sending chat message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Send a system message to a project
   */
  public async sendSystemMessage(
    projectId: string,
    message: string,
    metadata?: any
  ): Promise<ChatMessage> {
    const systemMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      projectId,
      userId: 'system',
      userEmail: 'system',
      userRole: 'system',
      message,
      type: 'system',
      metadata,
    };

    return this.sendMessage(systemMessage);
  }

  /**
   * Send a persona message to a project
   */
  public async sendPersonaMessage(
    projectId: string,
    personaId: string,
    message: string,
    metadata?: any
  ): Promise<ChatMessage> {
    try {
      // Get persona details from database
      const persona = await this.getPersonaDetails(personaId);

      const personaMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        projectId,
        userId: personaId,
        userEmail: persona.email || 'persona@system.com',
        userRole: 'persona',
        message,
        type: 'text',
        metadata,
        isPersonaMessage: true,
        personaId,
      };

      return this.sendMessage(personaMessage);
    } catch (error) {
      logger.error('Error sending persona message:', error);
      throw new Error('Failed to send persona message');
    }
  }

  /**
   * Handle typing indicators
   */
  public handleTypingStart(
    projectId: string,
    userId: string,
    userEmail: string
  ): void {
    if (!this.typingUsers.has(projectId)) {
      this.typingUsers.set(projectId, new Set());
    }

    this.typingUsers.get(projectId)!.add(userId);

    const typingData: TypingIndicator = {
      userId,
      userEmail,
      projectId,
      isTyping: true,
    };

    webSocketManager.emitToProject(projectId, 'user-typing', typingData);
  }

  public handleTypingStop(
    projectId: string,
    userId: string,
    userEmail: string
  ): void {
    if (this.typingUsers.has(projectId)) {
      this.typingUsers.get(projectId)!.delete(userId);
    }

    const typingData: TypingIndicator = {
      userId,
      userEmail,
      projectId,
      isTyping: false,
    };

    webSocketManager.emitToProject(
      projectId,
      'user-stopped-typing',
      typingData
    );
  }

  /**
   * Handle user presence updates
   */
  public handlePresenceUpdate(
    projectId: string,
    userId: string,
    userEmail: string,
    status: 'online' | 'away' | 'offline'
  ): void {
    if (!this.userPresence.has(projectId)) {
      this.userPresence.set(projectId, new Map());
    }

    this.userPresence.get(projectId)!.set(userId, status);

    const presenceData: UserPresence = {
      userId,
      userEmail,
      projectId,
      status,
      timestamp: new Date().toISOString(),
    };

    webSocketManager.emitToProject(projectId, 'user-presence', presenceData);
  }

  /**
   * Get typing users for a project
   */
  public getTypingUsers(projectId: string): string[] {
    const typingSet = this.typingUsers.get(projectId);
    return typingSet ? Array.from(typingSet) : [];
  }

  /**
   * Get user presence for a project
   */
  public getUserPresence(projectId: string): Map<string, string> {
    return this.userPresence.get(projectId) || new Map();
  }

  /**
   * Get conversation history for a project
   */
  public async getConversationHistory(
    projectId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    try {
      const conversation = await Conversation.findOne({ project: projectId })
        .populate('participants.id', 'email role')
        .exec();

      if (!conversation) {
        return [];
      }

      // Get messages for this conversation
      const messages = await Message.find({ conversation: conversation._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('sender.id', 'email role')
        .exec();

      return messages.map(msg => ({
        id: (msg._id as any).toString(),
        projectId: projectId,
        userId: msg.sender.id.toString(),
        userEmail: msg.sender.name, // Using name as email for now
        userRole: msg.sender.type,
        message: msg.content,
        type: msg.messageType as 'text' | 'file' | 'link' | 'system',
        metadata: msg.metadata
          ? {
              ...msg.metadata,
              milestoneId: msg.metadata.milestoneId?.toString(),
              artifactId: msg.metadata.artifactId?.toString(),
            }
          : undefined,
        timestamp: msg.createdAt.toISOString(),
        isPersonaMessage: msg.sender.type === 'persona',
        personaId:
          msg.sender.type === 'persona' ? msg.sender.id.toString() : undefined,
      }));
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      throw new Error('Failed to get conversation history');
    }
  }

  /**
   * Get recent conversations for a user
   */
  public async getUserConversations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Find conversations where user is a participant
      const conversations = await Conversation.find({
        'participants.id': userId,
      })
        .populate('project', 'name description')
        .sort({ updatedAt: -1 })
        .limit(limit);

      return conversations.map(conv => ({
        projectId: (conv.project as any)._id.toString(),
        projectName: (conv.project as any).name,
        lastMessage: conv.lastMessage,
        messageCount: conv.messageCount,
        updatedAt: conv.updatedAt,
      }));
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw new Error('Failed to get user conversations');
    }
  }

  /**
   * Search messages in a project
   */
  public async searchMessages(
    projectId: string,
    query: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    try {
      const conversation = await Conversation.findOne({ project: projectId });

      if (!conversation) {
        return [];
      }

      const searchRegex = new RegExp(query, 'i');
      const matchingMessages = await Message.find({
        conversation: conversation._id,
        $or: [{ content: searchRegex }, { 'sender.name': searchRegex }],
      })
        .populate('sender.id', 'email role')
        .limit(limit)
        .exec();

      return matchingMessages.map(msg => ({
        id: (msg._id as any).toString(),
        projectId: projectId,
        userId: msg.sender.id.toString(),
        userEmail: msg.sender.name,
        userRole: msg.sender.type,
        message: msg.content,
        type: msg.messageType as 'text' | 'file' | 'link' | 'system',
        metadata: msg.metadata
          ? {
              ...msg.metadata,
              milestoneId: msg.metadata.milestoneId?.toString(),
              artifactId: msg.metadata.artifactId?.toString(),
            }
          : undefined,
        timestamp: msg.createdAt.toISOString(),
        isPersonaMessage: msg.sender.type === 'persona',
        personaId:
          msg.sender.type === 'persona' ? msg.sender.id.toString() : undefined,
      }));
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
    }
  }

  /**
   * Delete a message (admin/instructor only)
   */
  public async deleteMessage(
    messageId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      // Check permissions
      if (!['instructor', 'administrator'].includes(userRole)) {
        throw new Error('Insufficient permissions to delete messages');
      }

      const result = await Conversation.updateOne(
        { 'messages._id': messageId },
        { $pull: { messages: { _id: messageId } } }
      );

      if (result.modifiedCount > 0) {
        // Notify clients about message deletion
        webSocketManager.broadcastToAll('message-deleted', { messageId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Get chat statistics for analytics
   */
  public async getChatStatistics(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const conversation = await Conversation.findOne({ project: projectId });

      if (!conversation) {
        return {
          totalMessages: 0,
          uniqueUsers: 0,
          averageMessagesPerDay: 0,
          mostActiveUsers: [],
          messageTypes: {},
        };
      }

      // Build date filter
      const dateFilter: any = { conversation: conversation._id };
      if (startDate && endDate) {
        dateFilter.createdAt = { $gte: startDate, $lte: endDate };
      }

      const messages = await Message.find(dateFilter).exec();

      const uniqueUsers = new Set(messages.map(msg => msg.sender.id.toString()))
        .size;
      const messageTypes = messages.reduce(
        (acc: Record<string, number>, msg: any) => {
          acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
          return acc;
        },
        {}
      );

      const userMessageCounts = messages.reduce(
        (acc: Record<string, number>, msg: any) => {
          const userId = msg.sender.id.toString();
          acc[userId] = (acc[userId] || 0) + 1;
          return acc;
        },
        {}
      );

      const mostActiveUsers = Object.entries(userMessageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId, count]) => ({ userId, count }));

      const daysDiff =
        startDate && endDate
          ? Math.ceil(
              (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 30;

      return {
        totalMessages: messages.length,
        uniqueUsers,
        averageMessagesPerDay:
          Math.round((messages.length / daysDiff) * 100) / 100,
        mostActiveUsers,
        messageTypes,
      };
    } catch (error) {
      logger.error('Error getting chat statistics:', error);
      throw new Error('Failed to get chat statistics');
    }
  }

  private async saveMessageToDatabase(message: ChatMessage): Promise<void> {
    try {
      let conversation = await Conversation.findOne({
        project: message.projectId,
      });

      if (!conversation) {
        conversation = new Conversation({
          project: message.projectId,
          participants: [],
          title: `Project ${message.projectId} Chat`,
          conversationType: 'chat',
          status: 'active',
          messageCount: 0,
          unreadCount: new Map(),
          settings: {
            allowFileUploads: true,
            allowExternalLinks: true,
            requireModeration: false,
          },
        });
        await conversation.save();
      }

      const messageDoc = new Message({
        conversation: conversation._id,
        sender: {
          type: message.isPersonaMessage ? 'persona' : 'student',
          id: message.userId,
          name: message.userEmail,
        },
        content: message.message,
        messageType: message.type,
        metadata: message.metadata,
        isRead: false,
        readBy: [],
      });

      await messageDoc.save();

      // Update conversation
      await (conversation as any).updateLastMessage(
        message.message,
        message.userEmail
      );
      await (conversation as any).incrementUnreadCount();
    } catch (error) {
      logger.error('Error saving message to database:', error);
      throw new Error('Failed to save message');
    }
  }

  private async getPersonaDetails(personaId: string): Promise<any> {
    // This would typically fetch from a Persona model
    // For now, return a default structure
    return {
      id: personaId,
      email: `persona-${personaId}@system.com`,
      name: `Persona ${personaId}`,
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const chatService = new ChatService();
