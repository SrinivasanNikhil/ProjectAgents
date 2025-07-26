import { logger } from '../config/logger';
import { Message } from '../models/Conversation';
import { User } from '../models/User';
import { Types } from 'mongoose';

export interface ContentFilter {
  id: string;
  type: 'keyword' | 'regex' | 'ai';
  pattern: string;
  action: 'flag' | 'block' | 'replace';
  replacement?: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlaggedMessage {
  messageId: Types.ObjectId;
  flaggedBy: Types.ObjectId;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'resolved';
  moderatorNotes?: string;
  action?: 'warn' | 'delete' | 'timeout' | 'none';
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationSettings {
  enableAutoModeration: boolean;
  enableKeywordFiltering: boolean;
  enableAIContentAnalysis: boolean;
  enableUserReporting: boolean;
  requireModerationForNewUsers: boolean;
  maxWarningsBeforeTimeout: number;
  timeoutDuration: number; // in minutes
  autoDeleteInappropriateContent: boolean;
  notifyInstructorsOnFlag: boolean;
}

export interface ContentAnalysisResult {
  isInappropriate: boolean;
  confidence: number;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
  flaggedKeywords: string[];
  suggestions: string[];
}

export class ModerationService {
  private contentFilters: ContentFilter[] = [];
  private defaultFilters: ContentFilter[] = [
    {
      id: 'profanity-1',
      type: 'keyword',
      pattern: '\\b(bad|inappropriate|words)\\b',
      action: 'flag',
      severity: 'medium',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  constructor() {
    this.loadContentFilters();
  }

  /**
   * Analyze message content for inappropriate content
   */
  public async analyzeContent(content: string): Promise<ContentAnalysisResult> {
    try {
      const result: ContentAnalysisResult = {
        isInappropriate: false,
        confidence: 0,
        categories: [],
        severity: 'low',
        flaggedKeywords: [],
        suggestions: [],
      };

      // Check against content filters
      const filterResults = this.checkContentFilters(content);
      if (filterResults.length > 0) {
        result.isInappropriate = true;
        result.confidence = Math.max(...filterResults.map(f => f.confidence));
        result.flaggedKeywords = filterResults.map(f => f.keyword);
        result.severity = this.getHighestSeverity(
          filterResults.map(f => f.severity)
        );
        result.categories = ['inappropriate-language'];
      }

      // Basic sentiment analysis (negative sentiment might indicate issues)
      const sentiment = this.analyzeSentiment(content);
      if (sentiment < -0.5) {
        result.categories.push('negative-sentiment');
        result.confidence = Math.max(result.confidence, 0.3);
      }

      // Check for spam patterns
      if (this.isSpam(content)) {
        result.isInappropriate = true;
        result.categories.push('spam');
        result.confidence = Math.max(result.confidence, 0.8);
        result.severity = 'high';
      }

      // Check for excessive caps
      if (this.hasExcessiveCaps(content)) {
        result.categories.push('excessive-caps');
        result.suggestions.push('Consider using normal capitalization');
      }

      return result;
    } catch (error) {
      logger.error('Error analyzing content:', error);
      return {
        isInappropriate: false,
        confidence: 0,
        categories: [],
        severity: 'low',
        flaggedKeywords: [],
        suggestions: [],
      };
    }
  }

  /**
   * Flag a message for moderation review
   */
  public async flagMessage(
    messageId: string,
    flaggedBy: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<FlaggedMessage> {
    try {
      const flaggedMessage: FlaggedMessage = {
        messageId: new Types.ObjectId(messageId),
        flaggedBy: new Types.ObjectId(flaggedBy),
        reason,
        severity,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database (you'll need to create a FlaggedMessage model)
      // await flaggedMessage.save();

      logger.info(
        `Message flagged: ${messageId} by ${flaggedBy} for ${reason}`
      );

      return flaggedMessage;
    } catch (error) {
      logger.error('Error flagging message:', error);
      throw new Error('Failed to flag message');
    }
  }

  /**
   * Get flagged messages for moderation review
   */
  public async getFlaggedMessages(
    status: 'pending' | 'reviewed' | 'resolved' = 'pending',
    limit: number = 50
  ): Promise<FlaggedMessage[]> {
    try {
      // Query flagged messages from database
      // const flaggedMessages = await FlaggedMessage.find({ status })
      //   .populate('messageId')
      //   .populate('flaggedBy', 'email name')
      //   .sort({ createdAt: -1 })
      //   .limit(limit);

      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error getting flagged messages:', error);
      throw new Error('Failed to get flagged messages');
    }
  }

  /**
   * Take moderation action on a message
   */
  public async takeModerationAction(
    messageId: string,
    action: 'warn' | 'delete' | 'timeout' | 'none',
    moderatorId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      switch (action) {
        case 'delete':
          await this.deleteMessage(messageId, moderatorId);
          break;
        case 'warn':
          await this.warnUser(messageId, moderatorId, notes);
          break;
        case 'timeout':
          await this.timeoutUser(messageId, moderatorId, notes);
          break;
        case 'none':
          // Just mark as reviewed
          break;
      }

      // Update flagged message status
      // await FlaggedMessage.findOneAndUpdate(
      //   { messageId: new Types.ObjectId(messageId) },
      //   {
      //     status: 'resolved',
      //     action,
      //     moderatorNotes: notes,
      //     updatedAt: new Date(),
      //   }
      // );

      logger.info(
        `Moderation action taken: ${action} on message ${messageId} by ${moderatorId}`
      );

      return true;
    } catch (error) {
      logger.error('Error taking moderation action:', error);
      throw new Error('Failed to take moderation action');
    }
  }

  /**
   * Add a new content filter
   */
  public async addContentFilter(
    filter: Omit<ContentFilter, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentFilter> {
    try {
      const newFilter: ContentFilter = {
        ...filter,
        id: this.generateFilterId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.contentFilters.push(newFilter);
      await this.saveContentFilters();

      logger.info(`Content filter added: ${newFilter.id}`);

      return newFilter;
    } catch (error) {
      logger.error('Error adding content filter:', error);
      throw new Error('Failed to add content filter');
    }
  }

  /**
   * Update content filter
   */
  public async updateContentFilter(
    filterId: string,
    updates: Partial<Omit<ContentFilter, 'id' | 'createdAt'>>
  ): Promise<ContentFilter | null> {
    try {
      const filterIndex = this.contentFilters.findIndex(f => f.id === filterId);
      if (filterIndex === -1) {
        return null;
      }

      this.contentFilters[filterIndex] = {
        ...this.contentFilters[filterIndex],
        ...updates,
        updatedAt: new Date(),
      };

      await this.saveContentFilters();

      logger.info(`Content filter updated: ${filterId}`);

      return this.contentFilters[filterIndex];
    } catch (error) {
      logger.error('Error updating content filter:', error);
      throw new Error('Failed to update content filter');
    }
  }

  /**
   * Delete content filter
   */
  public async deleteContentFilter(filterId: string): Promise<boolean> {
    try {
      const filterIndex = this.contentFilters.findIndex(f => f.id === filterId);
      if (filterIndex === -1) {
        return false;
      }

      this.contentFilters.splice(filterIndex, 1);
      await this.saveContentFilters();

      logger.info(`Content filter deleted: ${filterId}`);

      return true;
    } catch (error) {
      logger.error('Error deleting content filter:', error);
      throw new Error('Failed to delete content filter');
    }
  }

  /**
   * Get all content filters
   */
  public getContentFilters(): ContentFilter[] {
    return [...this.contentFilters];
  }

  /**
   * Check if user is timed out
   */
  public async isUserTimedOut(userId: string): Promise<boolean> {
    try {
      // Check if user has an active timeout
      // const user = await User.findById(userId);
      // if (user && user.timeoutUntil && user.timeoutUntil > new Date()) {
      //   return true;
      // }
      return false;
    } catch (error) {
      logger.error('Error checking user timeout:', error);
      return false;
    }
  }

  // Private helper methods

  private checkContentFilters(content: string): Array<{
    keyword: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    const results: Array<{
      keyword: string;
      confidence: number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    for (const filter of this.contentFilters) {
      if (!filter.enabled) continue;

      let matches: RegExpMatchArray | null = null;

      if (filter.type === 'keyword') {
        const regex = new RegExp(filter.pattern, 'gi');
        matches = content.match(regex);
      } else if (filter.type === 'regex') {
        try {
          const regex = new RegExp(filter.pattern, 'gi');
          matches = content.match(regex);
        } catch (error) {
          logger.warn(`Invalid regex pattern: ${filter.pattern}`);
          continue;
        }
      }

      if (matches && matches.length > 0) {
        results.push({
          keyword: matches[0],
          confidence: Math.min(0.9, matches.length * 0.3),
          severity: filter.severity,
        });
      }
    }

    return results;
  }

  private analyzeSentiment(content: string): number {
    // Simple sentiment analysis based on positive/negative words
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'perfect',
      'love',
      'like',
      'happy',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'hate',
      'dislike',
      'angry',
      'sad',
      'frustrated',
    ];

    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return 0;

    return (positiveCount - negativeCount) / total;
  }

  private isSpam(content: string): boolean {
    // Check for spam patterns
    const spamPatterns = [
      /\b(buy|sell|discount|offer|limited|act now)\b/gi,
      /(.)\1{4,}/, // Repeated characters
      /\b[A-Z]{5,}\b/, // All caps words
      /(https?:\/\/[^\s]+){3,}/, // Multiple URLs
    ];

    return spamPatterns.some(pattern => pattern.test(content));
  }

  private hasExcessiveCaps(content: string): boolean {
    const words = content.split(/\s+/);
    const capsWords = words.filter(
      word => word === word.toUpperCase() && word.length > 2
    );
    return capsWords.length > words.length * 0.3;
  }

  private getHighestSeverity(
    severities: ('low' | 'medium' | 'high')[]
  ): 'low' | 'medium' | 'high' {
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private async deleteMessage(
    messageId: string,
    moderatorId: string
  ): Promise<void> {
    // Implementation for deleting message
    logger.info(`Message deleted by moderator: ${messageId}`);
  }

  private async warnUser(
    messageId: string,
    moderatorId: string,
    notes?: string
  ): Promise<void> {
    // Implementation for warning user
    logger.info(`User warned by moderator for message: ${messageId}`);
  }

  private async timeoutUser(
    messageId: string,
    moderatorId: string,
    notes?: string
  ): Promise<void> {
    // Implementation for timing out user
    logger.info(`User timed out by moderator for message: ${messageId}`);
  }

  private loadContentFilters(): void {
    // Load filters from database or configuration
    this.contentFilters = [...this.defaultFilters];
  }

  private async saveContentFilters(): Promise<void> {
    // Save filters to database or configuration
    logger.info('Content filters saved');
  }

  private generateFilterId(): string {
    return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const moderationService = new ModerationService();
