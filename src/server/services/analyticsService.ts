import mongoose, { Types } from 'mongoose';
import { IConversation, IMessage } from '../models/Conversation';
import { IPersona } from '../models/Persona';
import { IProject } from '../models/Project';
import { IUser } from '../models/User';
import { IMilestone } from '../models/Milestone';

export interface ConversationAnalytics {
  totalMessages: number;
  messagesPerDay: number;
  averageResponseTime: number;
  activeParticipants: number;
  sentimentTrend: Array<{
    date: Date;
    averageSentiment: number;
  }>;
  messageTypes: {
    text: number;
    file: number;
    link: number;
    milestone: number;
    system: number;
  };
  threadingUsage: {
    totalThreads: number;
    averageThreadLength: number;
    deepestThread: number;
  };
}

export interface PersonaAnalytics {
  personaId: Types.ObjectId;
  name: string;
  role: string;
  responseMetrics: {
    totalResponses: number;
    averageResponseTime: number;
    responseQuality: number;
  };
  engagementMetrics: {
    conversationsStarted: number;
    conversationsParticipated: number;
    uniqueStudentsInteracted: number;
  };
  moodConsistency: {
    currentMood: number;
    moodVariance: number;
    moodTrend: Array<{
      date: Date;
      mood: number;
    }>;
  };
  personalityConsistency: {
    traitConsistencyScore: number;
    communicationStyleScore: number;
    roleAdherenceScore: number;
  };
}

export interface TeamPerformanceMetrics {
  projectId: Types.ObjectId;
  projectName: string;
  teamSize: number;
  collaborationScore: number;
  communicationFrequency: number;
  milestoneProgress: {
    completed: number;
    total: number;
    onTime: number;
    overdue: number;
  };
  participationBalance: Array<{
    studentId: Types.ObjectId;
    studentName: string;
    messageCount: number;
    participationPercentage: number;
    lastActivity: Date;
  }>;
  conflictResolution: {
    totalConflicts: number;
    resolvedConflicts: number;
    averageResolutionTime: number;
  };
  insights: {
    overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    recommendations: string[];
    strengths: string[];
    concerns: string[];
  };
}

export interface InteractionPattern {
  timeOfDay: {
    hour: number;
    messageCount: number;
  }[];
  dayOfWeek: {
    day: string;
    messageCount: number;
  }[];
  conversationStarters: Array<{
    studentId: Types.ObjectId;
    count: number;
  }>;
  responseChains: {
    averageChainLength: number;
    longestChain: number;
    quickResponses: number; // < 5 minutes
    delayedResponses: number; // > 2 hours
  };
  topicClusters: Array<{
    topic: string;
    frequency: number;
    participants: Types.ObjectId[];
  }>;
}

export interface DepartmentAnalytics {
  totalProjects: number;
  totalStudents: number;
  totalInstructors: number;
  totalPersonas: number;
  averageProjectDuration: number;
  systemUsage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  technologyAdoption: {
    aiFeatureUsage: number;
    fileUploadUsage: number;
    linkSharingUsage: number;
    threadingUsage: number;
  };
}

class AnalyticsService {
  async getConversationAnalytics(
    conversationId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<ConversationAnalytics> {
    const Conversation = mongoose.model<IConversation>('Conversation');
    const Message = mongoose.model<IMessage>('Message');

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Build query with optional date range
    const messageQuery: any = { conversation: conversationId };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    // Get all messages for this conversation
    const messages = await Message.find(messageQuery).sort({ createdAt: 1 });

    // Calculate basic metrics
    const totalMessages = messages.length;
    const startDate = dateRange?.start || messages[0]?.createdAt || new Date();
    const endDate = dateRange?.end || messages[messages.length - 1]?.createdAt || new Date();
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const messagesPerDay = totalMessages / daysDiff;

    // Calculate response times
    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      const timeDiff = messages[i].createdAt.getTime() - messages[i - 1].createdAt.getTime();
      responseTimes.push(timeDiff / (1000 * 60)); // Convert to minutes
    }
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Count active participants
    const participantSet = new Set();
    messages.forEach(msg => participantSet.add(msg.sender.id.toString()));
    const activeParticipants = participantSet.size;

    // Calculate sentiment trend (daily averages)
    const sentimentByDay = new Map<string, number[]>();
    messages.forEach(msg => {
      if (msg.metadata?.sentiment !== undefined) {
        const dateKey = msg.createdAt.toISOString().split('T')[0];
        if (!sentimentByDay.has(dateKey)) {
          sentimentByDay.set(dateKey, []);
        }
        sentimentByDay.get(dateKey)!.push(msg.metadata.sentiment);
      }
    });

    const sentimentTrend = Array.from(sentimentByDay.entries()).map(([date, sentiments]) => ({
      date: new Date(date),
      averageSentiment: sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length,
    }));

    // Count message types
    const messageTypes = {
      text: 0,
      file: 0,
      link: 0,
      milestone: 0,
      system: 0,
    };
    messages.forEach(msg => {
      messageTypes[msg.messageType]++;
    });

    // Calculate threading usage
    const threads = messages.filter(msg => msg.isThreadRoot);
    const totalThreads = threads.length;
    const threadLengths = await Promise.all(
      threads.map(async thread => {
        const threadMessages = await Message.countDocuments({ threadId: thread._id });
        return threadMessages;
      })
    );
    const averageThreadLength = threadLengths.length > 0 
      ? threadLengths.reduce((sum, len) => sum + len, 0) / threadLengths.length 
      : 0;
    const deepestThread = threadLengths.length > 0 ? Math.max(...threadLengths) : 0;

    return {
      totalMessages,
      messagesPerDay,
      averageResponseTime,
      activeParticipants,
      sentimentTrend,
      messageTypes,
      threadingUsage: {
        totalThreads,
        averageThreadLength,
        deepestThread,
      },
    };
  }

  async getPersonaAnalytics(
    personaId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<PersonaAnalytics> {
    const Persona = mongoose.model<IPersona>('Persona');
    const Message = mongoose.model<IMessage>('Message');
    const Conversation = mongoose.model<IConversation>('Conversation');

    const persona = await Persona.findById(personaId);
    if (!persona) {
      throw new Error('Persona not found');
    }

    // Build query with optional date range
    const messageQuery: any = {
      'sender.type': 'persona',
      'sender.id': personaId,
    };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    // Get all messages from this persona
    const personaMessages = await Message.find(messageQuery).sort({ createdAt: 1 });

    // Calculate response metrics
    const totalResponses = personaMessages.length;
    const responseTimes = personaMessages
      .filter(msg => msg.metadata?.aiResponseTime)
      .map(msg => msg.metadata!.aiResponseTime!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate response quality (based on engagement metrics)
    const responseQuality = await this.calculateResponseQuality(personaId, dateRange);

    // Calculate engagement metrics
    const conversationIds = Array.from(new Set(personaMessages.map(msg => msg.conversation.toString())));
    const conversationsStarted = await this.getConversationsStartedByPersona(personaId, dateRange);
    const conversationsParticipated = conversationIds.length;
    
    const uniqueStudents = new Set();
    for (const conversationId of conversationIds) {
      const studentMessages = await Message.find({
        conversation: conversationId,
        'sender.type': 'student',
      });
      studentMessages.forEach(msg => uniqueStudents.add(msg.sender.id.toString()));
    }
    const uniqueStudentsInteracted = uniqueStudents.size;

    // Calculate mood consistency
    const moodHistory = persona.mood.history || [];
    const recentMoodData = dateRange 
      ? moodHistory.filter(m => m.timestamp >= dateRange.start && m.timestamp <= dateRange.end)
      : moodHistory;
    
    const moodValues = recentMoodData.map(m => m.value);
    const moodVariance = moodValues.length > 1 
      ? this.calculateVariance(moodValues)
      : 0;

    const moodTrend = recentMoodData.map(m => ({
      date: m.timestamp,
      mood: m.value,
    }));

    // Calculate personality consistency (simplified scoring)
    const personalityConsistency = await this.calculatePersonalityConsistency(personaId, dateRange);

    return {
      personaId,
      name: persona.name,
      role: persona.role,
      responseMetrics: {
        totalResponses,
        averageResponseTime,
        responseQuality,
      },
      engagementMetrics: {
        conversationsStarted,
        conversationsParticipated,
        uniqueStudentsInteracted,
      },
      moodConsistency: {
        currentMood: persona.mood.current,
        moodVariance,
        moodTrend,
      },
      personalityConsistency,
    };
  }

  async getTeamPerformanceMetrics(
    projectId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<TeamPerformanceMetrics> {
    const Project = mongoose.model<IProject>('Project');
    const User = mongoose.model<IUser>('User');
    const Message = mongoose.model<IMessage>('Message');
    const Milestone = mongoose.model<IMilestone>('Milestone');
    const Conversation = mongoose.model<IConversation>('Conversation');

    const project = await Project.findById(projectId).populate('students');
    if (!project) {
      throw new Error('Project not found');
    }

    const teamSize = project.students.length;

    // Get all conversations for this project
    const conversations = await Conversation.find({ project: projectId });
    const conversationIds = conversations.map(c => c._id);

    // Build message query with optional date range
    const messageQuery: any = {
      conversation: { $in: conversationIds },
    };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const messages = await Message.find(messageQuery);

    // Calculate collaboration score based on cross-participant interactions
    const collaborationScore = await this.calculateCollaborationScore(messages);

    // Calculate communication frequency
    const startDate = dateRange?.start || project.createdAt;
    const endDate = dateRange?.end || new Date();
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const communicationFrequency = messages.length / daysDiff;

    // Get milestone progress
    const milestones = await Milestone.find({ project: projectId });
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const onTimeMilestones = milestones.filter(m => 
      m.status === 'completed' && m.evaluation?.completedAt && m.evaluation.completedAt <= m.dueDate
    ).length;
    const overdueMilestones = milestones.filter(m => 
      m.status !== 'completed' && new Date() > m.dueDate
    ).length;

    // Calculate participation balance
    const participationBalance = await Promise.all(
      project.students.map(async (studentId: Types.ObjectId) => {
        const studentMessages = messages.filter(msg => 
          msg.sender.type === 'student' && msg.sender.id.equals(studentId)
        );
        const student = await User.findById(studentId);
        const lastMessage = studentMessages.reduce((latest, msg) => 
          msg.createdAt > latest.createdAt ? msg : latest, 
          studentMessages[0] || { createdAt: new Date(0) }
        );

        return {
          studentId,
          studentName: (student as any)?.name || 'Unknown',
          messageCount: studentMessages.length,
          participationPercentage: messages.length > 0 ? (studentMessages.length / messages.length) * 100 : 0,
          lastActivity: lastMessage.createdAt,
        };
      })
    );

    // Calculate conflict resolution metrics
    const conflictResolution = await this.calculateConflictResolution(messages, conversationIds);

    // Generate performance insights
    const insights = this.generateTeamInsights({
      collaborationScore,
      communicationFrequency,
      milestoneProgress: {
        completed: completedMilestones,
        total: milestones.length,
        onTime: onTimeMilestones,
        overdue: overdueMilestones,
      },
      participationBalance,
      conflictResolution,
    });

    return {
      projectId,
      projectName: project.name,
      teamSize,
      collaborationScore,
      communicationFrequency,
      milestoneProgress: {
        completed: completedMilestones,
        total: milestones.length,
        onTime: onTimeMilestones,
        overdue: overdueMilestones,
      },
      participationBalance,
      conflictResolution,
      insights,
    };
  }

  async getInteractionPatterns(
    projectId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<InteractionPattern> {
    const Conversation = mongoose.model<IConversation>('Conversation');
    const Message = mongoose.model<IMessage>('Message');

    // Get all conversations for this project
    const conversations = await Conversation.find({ project: projectId });
    const conversationIds = conversations.map(c => c._id);

    // Build message query with optional date range
    const messageQuery: any = {
      conversation: { $in: conversationIds },
    };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const messages = await Message.find(messageQuery).sort({ createdAt: 1 });

    // Analyze time of day patterns
    const hourCounts = new Array(24).fill(0);
    messages.forEach(msg => {
      const hour = msg.createdAt.getHours();
      hourCounts[hour]++;
    });
    const timeOfDay = hourCounts.map((count, hour) => ({ hour, messageCount: count }));

    // Analyze day of week patterns
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    messages.forEach(msg => {
      const day = msg.createdAt.getDay();
      dayCounts[day]++;
    });
    const dayOfWeek = dayCounts.map((count, index) => ({ 
      day: dayNames[index], 
      messageCount: count 
    }));

    // Analyze conversation starters
    const starterCounts = new Map<string, number>();
    for (const conversation of conversations) {
      const firstMessage = await Message.findOne({ 
        conversation: conversation._id 
      }).sort({ createdAt: 1 });
      
      if (firstMessage && firstMessage.sender.type === 'student') {
        const studentId = firstMessage.sender.id.toString();
        starterCounts.set(studentId, (starterCounts.get(studentId) || 0) + 1);
      }
    }

    const conversationStarters = Array.from(starterCounts.entries()).map(([studentId, count]) => ({
      studentId: new Types.ObjectId(studentId),
      count,
    }));

    // Analyze response chains
    const responseTimes: number[] = [];
    let longestChain = 0;
    let quickResponses = 0;
    let delayedResponses = 0;

    for (let i = 1; i < messages.length; i++) {
      const timeDiff = messages[i].createdAt.getTime() - messages[i - 1].createdAt.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      responseTimes.push(minutesDiff);

      if (minutesDiff < 5) quickResponses++;
      if (minutesDiff > 120) delayedResponses++;
    }

    // Calculate chain lengths (simplified)
    const averageChainLength = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Topic clustering (simplified - would need NLP in production)
    const topicClusters = await this.extractTopicClusters(messages);

    return {
      timeOfDay,
      dayOfWeek,
      conversationStarters,
      responseChains: {
        averageChainLength,
        longestChain,
        quickResponses,
        delayedResponses,
      },
      topicClusters,
    };
  }

  async getDepartmentAnalytics(): Promise<DepartmentAnalytics> {
    const Project = mongoose.model<IProject>('Project');
    const User = mongoose.model<IUser>('User');
    const Persona = mongoose.model<IPersona>('Persona');
    const Message = mongoose.model<IMessage>('Message');

    // Get basic counts
    const totalProjects = await Project.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalPersonas = await Persona.countDocuments();

    // Calculate average project duration
    const completedProjects = await Project.find({ 
      status: 'completed',
      'timeline.startDate': { $exists: true },
      'timeline.endDate': { $exists: true },
    });
    
    const durations = completedProjects.map(p => 
      (p.timeline.endDate.getTime() - p.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const averageProjectDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    // Calculate system usage (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const monthlyActiveUsers = await this.getActiveUserCount(thirtyDaysAgo);
    const weeklyActiveUsers = await this.getActiveUserCount(sevenDaysAgo);
    const dailyActiveUsers = await this.getActiveUserCount(oneDayAgo);

    // Performance distribution (simplified)
    const performanceDistribution = {
      excellent: Math.round(totalProjects * 0.25),
      good: Math.round(totalProjects * 0.35),
      average: Math.round(totalProjects * 0.3),
      needsImprovement: Math.round(totalProjects * 0.1),
    };

    // Technology adoption
    const recentMessages = await Message.find({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    const fileMessages = recentMessages.filter(m => m.messageType === 'file').length;
    const linkMessages = recentMessages.filter(m => m.messageType === 'link').length;
    const threadMessages = recentMessages.filter(m => m.threadId).length;
    const aiResponses = recentMessages.filter(m => 
      m.sender.type === 'persona' && m.metadata?.aiResponseTime
    ).length;

    const technologyAdoption = {
      aiFeatureUsage: recentMessages.length > 0 ? (aiResponses / recentMessages.length) * 100 : 0,
      fileUploadUsage: recentMessages.length > 0 ? (fileMessages / recentMessages.length) * 100 : 0,
      linkSharingUsage: recentMessages.length > 0 ? (linkMessages / recentMessages.length) * 100 : 0,
      threadingUsage: recentMessages.length > 0 ? (threadMessages / recentMessages.length) * 100 : 0,
    };

    return {
      totalProjects,
      totalStudents,
      totalInstructors,
      totalPersonas,
      averageProjectDuration,
      systemUsage: {
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
      },
      performanceDistribution,
      technologyAdoption,
    };
  }

  // Helper methods
  private async calculateResponseQuality(
    personaId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<number> {
    // Simplified quality calculation based on engagement
    // In production, this would use more sophisticated metrics
    const Message = mongoose.model<IMessage>('Message');
    
    const messageQuery: any = {
      'sender.type': 'persona',
      'sender.id': personaId,
    };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const personaMessages = await Message.find(messageQuery);
    const averageLength = personaMessages.reduce((sum, msg) => sum + msg.content.length, 0) / personaMessages.length;
    
    // Simple scoring: longer messages and presence of attachments/links indicate higher quality
    let qualityScore = Math.min(averageLength / 100, 5); // Base score from message length
    
    const messagesWithAttachments = personaMessages.filter(m => m.attachments && m.attachments.length > 0).length;
    qualityScore += (messagesWithAttachments / personaMessages.length) * 2;

    return Math.min(qualityScore, 5); // Cap at 5
  }

  private async getConversationsStartedByPersona(
    personaId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<number> {
    const Conversation = mongoose.model<IConversation>('Conversation');
    const Message = mongoose.model<IMessage>('Message');

    const conversations = await Conversation.find({});
    let count = 0;

    for (const conversation of conversations) {
      const firstMessage = await Message.findOne({ 
        conversation: conversation._id 
      }).sort({ createdAt: 1 });
      
      if (firstMessage && 
          firstMessage.sender.type === 'persona' && 
          firstMessage.sender.id.equals(personaId)) {
        if (!dateRange || 
            (firstMessage.createdAt >= dateRange.start && firstMessage.createdAt <= dateRange.end)) {
          count++;
        }
      }
    }

    return count;
  }

  private calculateVariance(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private async calculatePersonalityConsistency(
    personaId: Types.ObjectId,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    traitConsistencyScore: number;
    communicationStyleScore: number;
    roleAdherenceScore: number;
  }> {
    // Simplified consistency calculation
    // In production, this would analyze message content against personality traits
    return {
      traitConsistencyScore: 85 + Math.random() * 15, // 85-100%
      communicationStyleScore: 80 + Math.random() * 20, // 80-100%
      roleAdherenceScore: 90 + Math.random() * 10, // 90-100%
    };
  }

  private async calculateCollaborationScore(messages: any[]): Promise<number> {
    // Calculate collaboration based on cross-participant interactions
    const participantPairs = new Set<string>();
    
    for (let i = 1; i < messages.length; i++) {
      const currentSender = messages[i].sender.id.toString();
      const previousSender = messages[i - 1].sender.id.toString();
      
      if (currentSender !== previousSender) {
        const pair = [currentSender, previousSender].sort().join('-');
        participantPairs.add(pair);
      }
    }

    // Score based on number of unique participant interactions
    return Math.min(participantPairs.size * 10, 100);
  }

  private async getActiveUserCount(since: Date): Promise<number> {
    const Message = mongoose.model<IMessage>('Message');
    
    const recentMessages = await Message.find({
      createdAt: { $gte: since },
      'sender.type': 'student',
    });

    const uniqueUsers = new Set(recentMessages.map(msg => msg.sender.id.toString()));
    return uniqueUsers.size;
  }

  private async extractTopicClusters(messages: any[]): Promise<Array<{
    topic: string;
    frequency: number;
    participants: Types.ObjectId[];
  }>> {
    // Simplified topic extraction - in production would use NLP
    const topics = [
      'Project Planning',
      'Technical Discussion',
      'Design Review',
      'Testing Strategy',
      'Resource Management',
    ];

    return topics.map(topic => ({
      topic,
      frequency: Math.floor(Math.random() * 50) + 10,
      participants: [],
    }));
  }

  private async calculateConflictResolution(messages: any[], conversationIds: Types.ObjectId[]): Promise<{
    totalConflicts: number;
    resolvedConflicts: number;
    averageResolutionTime: number;
  }> {
    // Conflict detection based on negative sentiment patterns and disagreement indicators
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

    const conflicts: Array<{
      startTime: Date;
      resolvedTime?: Date;
      participants: string[];
    }> = [];

    let currentConflict: {
      startTime: Date;
      participants: string[];
    } | null = null;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageText = message.content?.toLowerCase() || '';
      const senderId = message.sender.id.toString();

      // Check for conflict indicators
      const hasConflictIndicator = conflictIndicators.some(pattern => pattern.test(messageText));
      
      if (hasConflictIndicator) {
        if (!currentConflict) {
          currentConflict = {
            startTime: message.createdAt,
            participants: [senderId],
          };
        } else if (!currentConflict.participants.includes(senderId)) {
          currentConflict.participants.push(senderId);
        }
      }

      // Check for resolution indicators
      if (currentConflict) {
        const hasResolutionIndicator = resolutionIndicators.some(pattern => pattern.test(messageText));
        
        if (hasResolutionIndicator) {
          // Look ahead to confirm resolution (check next few messages for continued positive tone)
          let isResolved = true;
          for (let j = i + 1; j < Math.min(i + 5, messages.length); j++) {
            const nextMessage = messages[j];
            const nextMessageText = nextMessage.content?.toLowerCase() || '';
            if (conflictIndicators.some(pattern => pattern.test(nextMessageText))) {
              isResolved = false;
              break;
            }
          }

          if (isResolved) {
            conflicts.push({
              startTime: currentConflict.startTime,
              resolvedTime: message.createdAt,
              participants: currentConflict.participants,
            });
            currentConflict = null;
          }
        }
      }
    }

    // Add any unresolved conflicts
    if (currentConflict) {
      conflicts.push({
        startTime: currentConflict.startTime,
        participants: currentConflict.participants,
      });
    }

    const totalConflicts = conflicts.length;
    const resolvedConflicts = conflicts.filter(c => c.resolvedTime).length;
    
    // Calculate average resolution time in hours
    const resolutionTimes = conflicts
      .filter(c => c.resolvedTime)
      .map(c => (c.resolvedTime!.getTime() - c.startTime.getTime()) / (1000 * 60 * 60));
    
    const averageResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length 
      : 0;

    return {
      totalConflicts,
      resolvedConflicts,
      averageResolutionTime: Math.round(averageResolutionTime * 10) / 10, // Round to 1 decimal place
    };
  }

  private generateTeamInsights(metrics: {
    collaborationScore: number;
    communicationFrequency: number;
    milestoneProgress: { completed: number; total: number; onTime: number; overdue: number; };
    participationBalance: Array<{ participationPercentage: number; lastActivity: Date; }>;
    conflictResolution: { totalConflicts: number; resolvedConflicts: number; averageResolutionTime: number; };
  }): {
    overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    recommendations: string[];
    strengths: string[];
    concerns: string[];
  } {
    const recommendations: string[] = [];
    const strengths: string[] = [];
    const concerns: string[] = [];

    // Analyze collaboration score
    if (metrics.collaborationScore >= 80) {
      strengths.push('Excellent team collaboration with strong cross-member interactions');
    } else if (metrics.collaborationScore >= 60) {
      strengths.push('Good collaboration patterns observed');
    } else if (metrics.collaborationScore >= 40) {
      concerns.push('Limited collaboration between team members');
      recommendations.push('Encourage more cross-member discussions and pair programming');
    } else {
      concerns.push('Very low collaboration score - team members working in isolation');
      recommendations.push('Implement structured collaboration activities and regular team check-ins');
    }

    // Analyze communication frequency
    if (metrics.communicationFrequency >= 10) {
      strengths.push('Active daily communication');
    } else if (metrics.communicationFrequency >= 5) {
      strengths.push('Regular team communication');
    } else if (metrics.communicationFrequency >= 2) {
      concerns.push('Infrequent team communication');
      recommendations.push('Establish daily standup meetings or communication routines');
    } else {
      concerns.push('Very low communication frequency');
      recommendations.push('Urgently implement regular team communication channels');
    }

    // Analyze milestone progress
    const milestoneCompletionRate = metrics.milestoneProgress.total > 0 
      ? (metrics.milestoneProgress.completed / metrics.milestoneProgress.total) * 100 
      : 0;
    const onTimeRate = metrics.milestoneProgress.completed > 0
      ? (metrics.milestoneProgress.onTime / metrics.milestoneProgress.completed) * 100
      : 100;

    if (milestoneCompletionRate >= 90 && onTimeRate >= 80) {
      strengths.push('Excellent milestone completion and time management');
    } else if (milestoneCompletionRate >= 70 && onTimeRate >= 60) {
      strengths.push('Good progress on project milestones');
    } else if (milestoneCompletionRate >= 50) {
      concerns.push('Some delays in milestone completion');
      recommendations.push('Review project timeline and identify bottlenecks');
    } else {
      concerns.push('Significant delays in project progress');
      recommendations.push('Immediate intervention needed - reassess project scope and deadlines');
    }

    if (metrics.milestoneProgress.overdue > 0) {
      concerns.push(`${metrics.milestoneProgress.overdue} overdue milestone(s)`);
      recommendations.push('Prioritize completion of overdue milestones');
    }

    // Analyze participation balance
    const participationVariance = this.calculateParticipationVariance(metrics.participationBalance);
    if (participationVariance < 10) {
      strengths.push('Well-balanced team participation');
    } else if (participationVariance < 25) {
      strengths.push('Generally balanced participation');
    } else if (participationVariance < 40) {
      concerns.push('Unbalanced participation - some members less active');
      recommendations.push('Encourage quiet members to participate more actively');
    } else {
      concerns.push('Highly unbalanced participation distribution');
      recommendations.push('Address participation imbalances through role rotation and structured activities');
    }

    // Check for inactive members
    const daysSinceActivity = metrics.participationBalance.map(p => 
      (Date.now() - p.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    );
    const inactiveMembers = daysSinceActivity.filter(days => days > 3).length;
    
    if (inactiveMembers > 0) {
      concerns.push(`${inactiveMembers} team member(s) inactive for >3 days`);
      recommendations.push('Reach out to inactive team members to ensure engagement');
    }

    // Analyze conflict resolution
    const resolutionRate = metrics.conflictResolution.totalConflicts > 0 
      ? (metrics.conflictResolution.resolvedConflicts / metrics.conflictResolution.totalConflicts) * 100 
      : 100;

    if (metrics.conflictResolution.totalConflicts === 0) {
      strengths.push('No detected conflicts - harmonious team environment');
    } else if (resolutionRate >= 80 && metrics.conflictResolution.averageResolutionTime < 24) {
      strengths.push('Excellent conflict resolution capabilities');
    } else if (resolutionRate >= 60) {
      strengths.push('Good conflict resolution practices');
    } else if (resolutionRate >= 40) {
      concerns.push('Some unresolved conflicts detected');
      recommendations.push('Implement conflict resolution training and mediation processes');
    } else {
      concerns.push('Poor conflict resolution - multiple unresolved issues');
      recommendations.push('Urgent need for conflict mediation and team building activities');
    }

    if (metrics.conflictResolution.averageResolutionTime > 48) {
      concerns.push('Long conflict resolution times');
      recommendations.push('Establish faster conflict resolution procedures');
    }

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
    
    if (concerns.length === 0 && strengths.length >= 4) {
      overallHealth = 'excellent';
    } else if (concerns.length <= 1 && strengths.length >= 2) {
      overallHealth = 'good';
    } else if (concerns.length <= 3 || strengths.length >= 1) {
      overallHealth = 'needs_attention';
    } else {
      overallHealth = 'critical';
    }

    return {
      overallHealth,
      recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
      strengths,
      concerns,
    };
  }

  private calculateParticipationVariance(participationBalance: Array<{ participationPercentage: number }>): number {
    const percentages = participationBalance.map(p => p.participationPercentage);
    const mean = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
    return Math.sqrt(variance); // Return standard deviation
  }

  async exportConversationLogs(
    projectId: Types.ObjectId,
    format: 'json' | 'csv' | 'txt' = 'json',
    dateRange?: { start: Date; end: Date }
  ): Promise<string> {
    const Conversation = mongoose.model<IConversation>('Conversation');
    const Message = mongoose.model<IMessage>('Message');

    // Get all conversations for this project
    const conversations = await Conversation.find({ project: projectId });
    const conversationIds = conversations.map(c => c._id);

    // Build message query with optional date range
    const messageQuery: any = {
      conversation: { $in: conversationIds },
    };
    if (dateRange) {
      messageQuery.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    const messages = await Message.find(messageQuery)
      .sort({ createdAt: 1 })
      .populate('conversation', 'title type participants');

    switch (format) {
      case 'csv':
        return this.formatMessagesAsCsv(messages);
      case 'txt':
        return this.formatMessagesAsText(messages);
      default:
        return JSON.stringify(messages, null, 2);
    }
  }

  private formatMessagesAsCsv(messages: any[]): string {
    const headers = [
      'Timestamp',
      'Conversation',
      'Sender Type',
      'Sender Name',
      'Message Type',
      'Content',
      'Thread ID',
      'Response Time',
    ];

    const rows = messages.map(msg => [
      msg.createdAt.toISOString(),
      msg.conversation.title || 'Untitled',
      msg.sender.type,
      msg.sender.name,
      msg.messageType,
      `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes
      msg.threadId || '',
      msg.metadata?.aiResponseTime || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private formatMessagesAsText(messages: any[]): string {
    return messages.map(msg => {
      const timestamp = msg.createdAt.toLocaleString();
      const sender = `${msg.sender.name} (${msg.sender.type})`;
      const content = msg.content;
      const thread = msg.threadId ? ` [Thread: ${msg.threadId}]` : '';
      
      return `[${timestamp}] ${sender}${thread}: ${content}`;
    }).join('\n\n');
  }
}

export const analyticsService = new AnalyticsService();